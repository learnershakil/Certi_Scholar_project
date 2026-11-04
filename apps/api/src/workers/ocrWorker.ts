import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { OcrJobData } from '../services/queueService';
import { ocrClient } from '../services/ocrClient';
import { createStorageService } from '../services/storage';
import { OCRResultModel } from '../models/OCRResult';
import { DocumentModel } from '../models/Document';
import { timelineService } from '../services/timelineService';
import { classificationService } from '../services/classification';
import { fieldExtractionService } from '../services/extraction';
import { consistencyService } from '../services/calculation/consistencyService';
import { DocumentProcessingState, TimelineEventType, DocumentTypeCategory, UserRole } from '@repo/contracts';

export function createOcrWorker(): Worker<OcrJobData> {
  const worker = new Worker<OcrJobData>(
    'ocr-processing',
    async (job: Job<OcrJobData>) => {
      const { documentId, instituteId, cleanStorageKey, mimeType } = job.data;

      // 1. Mark in-progress
      await OCRResultModel.findOneAndUpdate(
        { documentId: new mongoose.Types.ObjectId(documentId) },
        {
          $set: {
            status: 'PROCESSING',
            instituteId: new mongoose.Types.ObjectId(instituteId),
            attempts: job.attemptsMade + 1,
          },
        },
        { upsert: true, new: true }
      );

      await DocumentModel.findByIdAndUpdate(documentId, {
        $set: { status: DocumentProcessingState.OCR_IN_PROGRESS },
      });

      // 2. Retrieve clean file buffer from storage
      const storage = createStorageService();
      const fileBuffer = await storage.getFileBuffer(cleanStorageKey);

      // 3. Process via OCR microservice
      const ocrResult = await ocrClient.processDocumentBuffer(
        documentId,
        fileBuffer,
        mimeType
      );

      // 4. Save normalized OCR result
      await OCRResultModel.findOneAndUpdate(
        { documentId: new mongoose.Types.ObjectId(documentId) },
        {
          $set: {
            instituteId: new mongoose.Types.ObjectId(instituteId),
            provider: ocrResult.provider,
            providerVersion: ocrResult.providerVersion,
            fullText: ocrResult.fullText,
            pages: ocrResult.pages,
            pageCount: ocrResult.pageCount,
            latencyMs: ocrResult.latencyMs,
            status: 'COMPLETED',
            attempts: job.attemptsMade + 1,
          },
        },
        { upsert: true, new: true }
      );

      // 5. Record page count only. The document is not COMPLETED here:
      // classification and extraction below set CLASSIFIED, then
      // EXTRACTED or PENDING_REVIEW. Setting COMPLETED at OCR time
      // would hide a later downstream failure.
      const updatedDoc = await DocumentModel.findByIdAndUpdate(
        documentId,
        {
          $set: {
            pageCount: ocrResult.pageCount,
          },
        },
        { new: true }
      );

      // 6. Record timeline event
      if (updatedDoc) {
        await timelineService.recordEvent({
          applicationId: updatedDoc.applicationId,
          documentId,
          instituteId,
          type: TimelineEventType.OCR_COMPLETED,
          title: 'OCR Text & Geometry Extracted',
          description: `OCR processed via ${ocrResult.provider} (${ocrResult.pageCount} pages, ${ocrResult.latencyMs}ms)`,
          metadata: {
            provider: ocrResult.provider,
            pageCount: ocrResult.pageCount,
            latencyMs: ocrResult.latencyMs,
          },
        });
      }

      // 7. Auto-chain M3 Document Classification & M4 Field Extraction
      try {
        if (ocrResult.fullText && ocrResult.fullText.trim().length > 0) {
          const classificationOutcome = await classificationService.classifyDocument(
            documentId,
            ocrResult.fullText,
            instituteId
          );
          console.log(`[OCR PIPELINE] Document ${documentId} classified as: ${classificationOutcome.classification.category}`);

          // Extract structured fields
          const extraction = await fieldExtractionService.extractDocumentFields(
            documentId,
            instituteId
          );
          console.log(`[OCR PIPELINE] Document ${documentId} fields extracted (needsReview: ${extraction.needsReview})`);

          // If academic marksheet, perform initial consistency check
          if (
            classificationOutcome.classification.category === DocumentTypeCategory.ACADEMIC_MARKSHEET
          ) {
            try {
              await consistencyService.performConsistencyCheck(
                documentId,
                {
                  userId: 'system-pipeline-worker',
                  email: 'system@certischolar.local',
                  name: 'System Worker',
                  role: UserRole.ADMIN,
                  roles: [UserRole.ADMIN],
                  instituteId,
                  isSuperAdmin: true,
                }
              );
              console.log(`[OCR PIPELINE] Document ${documentId} academic consistency check completed.`);
            } catch (calcErr) {
              console.warn(`[OCR PIPELINE] Consistency check notice for ${documentId}:`, (calcErr as Error).message);
            }
          }
        }
      } catch (pipelineErr) {
        const message = (pipelineErr as Error).message;
        console.error(`[OCR PIPELINE] Downstream processing failed for ${documentId}:`, message);
        await DocumentModel.findByIdAndUpdate(documentId, {
          $set: { status: DocumentProcessingState.FAILED },
        });
        if (updatedDoc) {
          await timelineService.recordEvent({
            applicationId: updatedDoc.applicationId,
            documentId,
            instituteId,
            type: TimelineEventType.PROCESSING_FAILED,
            title: 'Processing failed after OCR',
            description: `Classification or extraction failed: ${message}. The document is marked FAILED, not complete.`,
            metadata: { error: message },
          });
        }
        throw pipelineErr;
      }

      return ocrResult;
    },
    {
      connection: {
        host: config.redisHost,
        port: config.redisPort,
      },
      concurrency: 3,
    }
  );

  worker.on('failed', async (job, err) => {
    if (job) {
      await OCRResultModel.findOneAndUpdate(
        { documentId: new mongoose.Types.ObjectId(job.data.documentId) },
        {
          $set: {
            status: 'FAILED',
            error: err.message,
            attempts: job.attemptsMade,
          },
        }
      );
      await DocumentModel.findByIdAndUpdate(job.data.documentId, {
        $set: { status: DocumentProcessingState.FAILED },
      });
    }
  });

  return worker;
}
