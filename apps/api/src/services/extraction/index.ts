import mongoose from 'mongoose';
import {
  DocumentProcessingState,
  TimelineEventType,
  FieldReviewStatus,
  DocumentTypeCategory,
} from '@repo/contracts';
import { DocumentModel } from '../../models/Document';
import { ExtractionProfileModel } from '../../models/ExtractionProfile';
import { OCRResultModel } from '../../models/OCRResult';
import {
  DocumentExtractionModel,
  IDocumentExtraction,
  IExtractedFieldSubdocument,
} from '../../models/DocumentExtraction';
import {
  extractCbseMarksheetFields,
  extractIncomeCertFields,
  extractIdCardFields,
} from './profileExtractors';
import { timelineService } from '../timelineService';

export class FieldExtractionService {
  async extractDocumentFields(
    documentId: string,
    instituteId: string
  ): Promise<IDocumentExtraction> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // 1. Resolve extraction profile
    let profile = null;
    if (doc.extractionProfileId) {
      profile = await ExtractionProfileModel.findById(doc.extractionProfileId);
    }
    if (!profile) {
      profile = await ExtractionProfileModel.findOne({
        category: doc.category,
        isActive: true,
      });
    }

    if (!profile) {
      throw new Error(`No active extraction profile found for category ${doc.category}`);
    }

    // 2. Fetch OCR text and geometry
    const ocrRecord = await OCRResultModel.findOne({ documentId: doc._id });
    const fullText = ocrRecord ? ocrRecord.fullText : '';
    const ocrPages = ocrRecord ? ocrRecord.pages : [];

    // 3. Execute profile-specific extraction
    let extractedFields: IExtractedFieldSubdocument[] = [];
    const ctx = { fullText, ocrPages };

    if (profile.key.includes('CBSE') || profile.category === DocumentTypeCategory.ACADEMIC_MARKSHEET) {
      extractedFields = extractCbseMarksheetFields(ctx);
    } else if (profile.key.includes('INCOME') || profile.category === DocumentTypeCategory.INCOME_CERTIFICATE) {
      extractedFields = extractIncomeCertFields(ctx);
    } else {
      extractedFields = extractIdCardFields(ctx);
    }

    // 4. Verify against profile definitions & thresholds
    let allRequiredPresent = true;
    let needsReview = false;

    for (const field of extractedFields) {
      const def = profile.fields.find((f: any) => f.fieldKey === field.fieldKey);
      const threshold = def ? def.confidenceThreshold : 0.85;
      const isRequired = def ? def.required : false;

      if (field.confidence < threshold) {
        field.isBelowThreshold = true;
        field.reviewStatus = FieldReviewStatus.NEEDS_REVIEW;
        needsReview = true;
      }

      if (isRequired && (field.rawValue === null || field.rawValue === undefined)) {
        allRequiredPresent = false;
        needsReview = true;
        field.reviewStatus = FieldReviewStatus.NEEDS_REVIEW;
      }
    }

    // 5. Version increment & store
    const previous = await DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 });
    const nextVersion = previous ? previous.version + 1 : 1;

    const extractionRecord = await DocumentExtractionModel.create({
      documentId: doc._id,
      instituteId: new mongoose.Types.ObjectId(instituteId),
      profileId: profile._id,
      profileKey: profile.key,
      profileVersion: profile.version,
      fields: extractedFields,
      allRequiredPresent,
      needsReview,
      version: nextVersion,
    });

    // 6. Update document state
    const newDocStatus = needsReview
      ? DocumentProcessingState.PENDING_REVIEW
      : DocumentProcessingState.EXTRACTED;

    await DocumentModel.findByIdAndUpdate(doc._id, {
      $set: { status: newDocStatus },
    });

    // 7. Timeline event
    await timelineService.recordEvent({
      applicationId: doc.applicationId,
      documentId: doc._id.toString(),
      instituteId,
      type: needsReview ? TimelineEventType.REVIEW_REQUIRED : TimelineEventType.FIELDS_EXTRACTED,
      title: needsReview ? 'Human Review Required' : 'Fields Extracted Successfully',
      description: needsReview
        ? `Field extraction flagged ${extractedFields.filter((f) => f.reviewStatus === FieldReviewStatus.NEEDS_REVIEW).length} uncertain fields for Verification Officer review.`
        : `Extracted ${extractedFields.length} structured fields using profile ${profile.name} (v${profile.version}).`,
      metadata: {
        profileKey: profile.key,
        fieldsCount: extractedFields.length,
        needsReview,
        version: nextVersion,
      },
    });

    return extractionRecord;
  }
}

export const fieldExtractionService = new FieldExtractionService();

