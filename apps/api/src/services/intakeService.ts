import crypto from 'crypto';
import path from 'path';
import mongoose from 'mongoose';
import {
  DocumentProcessingState,
  ScanState,
  DocumentTypeCategory,
  TimelineEventType,
  AuthSessionPayload,
  UserRole,
} from '@repo/contracts';
import { DocumentModel, IDocumentRecord } from '../models/Document';
import { storageService } from './storage';
import { inspectAndScanDocument } from './scanner';
import { auditService } from './auditService';
import { timelineService } from './timelineService';
import { config } from '../config/env';

export interface InitiateUploadParams {
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  applicationId: string;
  instituteId: string;
  studentId: string;
  categoryHint?: DocumentTypeCategory;
}

export class IntakeService {
  /**
   * Step 1: Pre-validates metadata, reserves DB record, and produces storage keys.
   */
  async initiateUpload(params: InitiateUploadParams): Promise<{
    document: IDocumentRecord;
    uploadUrl: string;
    objectKey: string;
  }> {
    // 1. Extension validation against allowlist
    const ext = path.extname(params.filename).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error(`File extension '${ext}' is not permitted. Allowed: ${config.allowedExtensions.join(', ')}`);
    }

    // 2. MIME type validation
    if (!config.allowedMimeTypes.includes(params.mimeType)) {
      throw new Error(`MIME type '${params.mimeType}' is not permitted. Allowed: ${config.allowedMimeTypes.join(', ')}`);
    }

    // 3. File size validation
    if (params.fileSizeBytes > config.maxFileSizeBytes) {
      throw new Error(`File size ${params.fileSizeBytes} bytes exceeds limit of ${config.maxFileSizeBytes} bytes.`);
    }

    // Generate unique storage keys
    const uniqueId = crypto.randomUUID();
    const safeFilename = `${uniqueId}${ext}`;
    const quarantineKey = `quarantine/${params.instituteId}/${safeFilename}`;
    const cleanKey = `clean/${params.instituteId}/${safeFilename}`;

    const doc = await DocumentModel.create({
      instituteId: new mongoose.Types.ObjectId(params.instituteId),
      studentId: new mongoose.Types.ObjectId(params.studentId),
      applicationId: params.applicationId,
      filename: safeFilename,
      originalName: params.filename,
      mimeType: params.mimeType,
      fileSizeBytes: params.fileSizeBytes,
      checksumSha256: 'PENDING_UPLOAD',
      storageDriver: config.storageDriver,
      storageKey: cleanKey,
      quarantineKey,
      status: DocumentProcessingState.RECEIVED,
      scanState: ScanState.PENDING,
      category: params.categoryHint || DocumentTypeCategory.UNKNOWN,
    });

    // Generate presigned upload URL
    const uploadUrl = await storageService.generatePresignedUploadUrl(
      `${params.instituteId}/${safeFilename}`,
      params.mimeType,
      900 // 15 mins
    );

    await timelineService.recordEvent({
      applicationId: params.applicationId,
      documentId: doc._id.toString(),
      instituteId: params.instituteId,
      type: TimelineEventType.DOCUMENT_UPLOADED,
      title: 'Document Upload Initiated',
      description: `Registered upload for ${params.filename} (${(params.fileSizeBytes / 1024).toFixed(1)} KB)`,
    });

    return {
      document: doc,
      uploadUrl,
      objectKey: quarantineKey,
    };
  }

  /**
   * Step 2: Ingests buffer, verifies signature, scans for malware, and promotes if clean.
   */
  async processUploadedBuffer(
    documentId: string,
    buffer: Buffer,
    actor?: AuthSessionPayload
  ): Promise<IDocumentRecord> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found.`);
    }

    // 1. Calculate SHA-256 Checksum
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    doc.checksumSha256 = checksumSha256;
    doc.fileSizeBytes = buffer.length;

    // 2. Put file into quarantine storage initially
    const subKey = path.basename(doc.quarantineKey || doc.filename);
    await storageService.saveQuarantined(
      `${doc.instituteId}/${subKey}`,
      buffer,
      doc.mimeType
    );

    doc.status = DocumentProcessingState.VALIDATING;
    doc.scanState = ScanState.SCANNING;
    await doc.save();

    // 3. Run Static Heuristics & Malware Inspection
    const inspection = await inspectAndScanDocument(buffer, doc.mimeType);

    doc.scanDetails = {
      scannedAt: new Date(),
      engine: inspection.malwareScan.engine,
      signatureFound: inspection.malwareScan.signature,
      pdfSecurityFlags: inspection.securityFlags,
    };

    if (inspection.pdfInspection?.pageCountEstimate) {
      doc.pageCount = inspection.pdfInspection.pageCountEstimate;
    }

    if (!inspection.isAcceptable) {
      // Flag and quarantine - NEVER promote to clean storage
      if (inspection.malwareScan.state === ScanState.INFECTED) {
        doc.status = DocumentProcessingState.QUARANTINED_MALWARE;
        doc.scanState = ScanState.INFECTED;
      } else if (inspection.securityFlags.includes('MIME_SIGNATURE_MISMATCH')) {
        doc.status = DocumentProcessingState.REJECTED_INVALID_TYPE;
        doc.scanState = ScanState.FAILED;
      } else {
        doc.status = DocumentProcessingState.REJECTED_CORRUPT;
        doc.scanState = ScanState.SUSPICIOUS;
      }

      await doc.save();

      await timelineService.recordEvent({
        applicationId: doc.applicationId,
        documentId: doc._id.toString(),
        instituteId: doc.instituteId.toString(),
        type: TimelineEventType.MALWARE_SCAN_QUARANTINED,
        actorId: actor?.userId,
        actorRole: actor?.roles[0],
        title: 'Document Intake Rejected / Quarantined',
        description: `Security rejection: ${inspection.quarantineReason}`,
        metadata: {
          securityFlags: inspection.securityFlags,
          checksum: checksumSha256,
        },
      });

      return doc;
    }

    // 4. File is CLEAN - Promote from quarantine to clean processing storage
    const cleanSubKey = `${doc.instituteId}/${path.basename(doc.storageKey)}`;
    const quarantineSubKey = `${doc.instituteId}/${subKey}`;
    
    await storageService.promoteToClean(
      `quarantine/${quarantineSubKey}`,
      cleanSubKey
    );

    doc.status = DocumentProcessingState.PROCESSING_QUEUED;
    doc.scanState = ScanState.CLEAN;
    await doc.save();

    await timelineService.recordEvent({
      applicationId: doc.applicationId,
      documentId: doc._id.toString(),
      instituteId: doc.instituteId.toString(),
      type: TimelineEventType.MALWARE_SCAN_CLEAN,
      actorId: actor?.userId,
      actorRole: actor?.roles[0],
      title: 'Security Scan & Intake Cleared',
      description: `Document passed all structural and malware checks. Promoted to secure processing storage.`,
      metadata: {
        checksum: checksumSha256,
        engine: inspection.malwareScan.engine,
      },
    });

    return doc;
  }

  /**
   * Step 3: Returns authorized, short-lived presigned view URL and logs document view audit.
   */
  async getAuthorizedViewUrl(
    documentId: string,
    actor: AuthSessionPayload,
    ipAddress?: string,
    userAgent?: string,
    viewReason?: string
  ): Promise<{ viewUrl: string; expiresInSeconds: number }> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Tenancy Check: User must belong to document's institute
    if (!actor.isSuperAdmin && actor.instituteId !== doc.instituteId.toString()) {
      throw new Error('Forbidden: Unauthorized cross-institute document access.');
    }

    // Role-specific case ownership: Student can only access their own documents
    if (
      actor.roles.includes(UserRole.STUDENT) &&
      !actor.roles.includes(UserRole.VERIFICATION_OFFICER) &&
      !actor.roles.includes(UserRole.INSTITUTE_ADMIN) &&
      !actor.isSuperAdmin
    ) {
      if (doc.studentId.toString() !== actor.userId) {
        throw new Error('Forbidden: You can only view documents from your own application.');
      }
    }

    // If quarantined or infected, prohibit non-admin view
    if (
      doc.status === DocumentProcessingState.QUARANTINED_MALWARE &&
      !actor.isSuperAdmin &&
      !actor.roles.includes(UserRole.INSTITUTE_ADMIN)
    ) {
      throw new Error('Access denied: File is quarantined due to detected security threats.');
    }

    const expiresInSeconds = 900; // 15 mins
    const viewUrl = await storageService.generatePresignedViewUrl(doc.storageKey, expiresInSeconds);

    // Record document view in immutable audit trail (M10 requirement)
    await auditService.recordDocumentView({
      instituteId: doc.instituteId.toString(),
      actorId: actor.userId,
      actorRole: actor.roles[0] || 'USER',
      documentId: doc._id.toString(),
      ipAddress,
      userAgent,
      viewReason: viewReason || 'Authorized document view via Presigned URL',
    });

    return {
      viewUrl,
      expiresInSeconds,
    };
  }
}

export const intakeService = new IntakeService();

