import { Router, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { CreateDocumentUploadSchema, CorrectionActionSchema, UserRole, VerificationProviderType } from '@repo/contracts';
import { authenticateUser, requireRole } from '../middleware/auth';
import { intakeService } from '../services/intakeService';
import { DocumentModel } from '../models/Document';
import { OCRResultModel } from '../models/OCRResult';
import { ClassificationRecordModel } from '../models/ClassificationRecord';
import { DocumentExtractionModel } from '../models/DocumentExtraction';
import { classificationService } from '../services/classification';
import { fieldExtractionService } from '../services/extraction';
import { reviewService } from '../services/reviewService';
import { consistencyService } from '../services/calculation/consistencyService';
import { verificationService } from '../services/verification/verificationService';
import { timelineService } from '../services/timelineService';
import { config } from '../config/env';

// Enforce single source of truth for upload size limit (10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeBytes },
});

export const documentRouter: Router = Router();

// Protect all document routes with user authentication
documentRouter.use(authenticateUser);

/**
 * Step 1: Initiate / register document upload.
 */
documentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateDocumentUploadSchema.parse(req.body);
    const user = req.user!;

    // Security fix: Students cannot upload on behalf of another student
    const isPrivilegedStaff =
      user.role === UserRole.ADMIN ||
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;
    const studentId = isPrivilegedStaff ? req.body.studentId || user.userId : user.userId;

    const instituteId = user.instituteId || parsed.instituteId || '660000000000000000000001';

    if (user.instituteId && parsed.instituteId && user.instituteId !== parsed.instituteId && !user.isSuperAdmin) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Cannot create document for another institute.' },
      });
      return;
    }

    const result = await intakeService.initiateUpload({
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      fileSizeBytes: parsed.fileSize,
      applicationId: parsed.applicationId,
      instituteId,
      studentId,
      categoryHint: parsed.categoryHint,
    });

    res.status(201).json({
      success: true,
      data: {
        document: result.document,
        uploadUrl: result.uploadUrl,
        objectKey: result.objectKey,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register upload';
    res.status(400).json({ success: false, error: { message } });
  }
});

/**
 * Step 2: Upload file buffer directly for processing (supports multipart form).
 */
documentRouter.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const documentId = req.params.id;
    if (!documentId) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required.' } });
      return;
    }
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, error: { message: 'File buffer is required.' } });
      return;
    }

    // Byte-level validation
    if (req.file.buffer.length === 0) {
      res.status(400).json({ success: false, error: { message: 'Zero-byte empty files are rejected.' } });
      return;
    }
    if (req.file.buffer.length > config.maxFileSizeBytes) {
      res.status(400).json({
        success: false,
        error: { message: `File size exceeds limit of ${config.maxFileSizeBytes} bytes.` },
      });
      return;
    }

    // Ownership & tenancy check before processing
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found.' } });
      return;
    }

    const user = req.user!;
    if (!user.isSuperAdmin && user.instituteId !== doc.instituteId.toString()) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cross-institute upload prohibited.' } });
      return;
    }

    if (
      user.roles.includes(UserRole.STUDENT) &&
      !user.roles.includes(UserRole.INSTITUTE_ADMIN) &&
      !user.isSuperAdmin
    ) {
      if (doc.studentId.toString() !== user.userId) {
        res.status(403).json({ success: false, error: { message: 'Forbidden: You cannot upload to another student document.' } });
        return;
      }
    }

    const processedDoc = await intakeService.processUploadedBuffer(
      documentId,
      req.file.buffer,
      req.user
    );

    res.json({
      success: true,
      data: processedDoc,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload processing failed';
    res.status(400).json({ success: false, error: { message } });
  }
});

/**
 * Step 3: Get document details (tenant-scoped & student-scoped).
 */
documentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    const user = req.user!;
    // Tenancy check
    if (!user.isSuperAdmin && user.instituteId !== doc.instituteId.toString()) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Cross-institute document access.' } });
      return;
    }

    // Student ownership check
    const isOfficerOrAdmin =
      user.role === UserRole.OFFICER ||
      user.role === UserRole.ADMIN ||
      user.roles?.includes(UserRole.OFFICER) ||
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      user.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;

    if (!isOfficerOrAdmin && doc.studentId.toString() !== user.userId) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You can only view documents from your own application.' },
      });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve document';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 4: Get short-lived authorized Presigned View URL (audited!).
 */
documentRouter.get('/:id/view-url', async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const viewReason = typeof req.query.reason === 'string' ? req.query.reason : undefined;

    const documentId = req.params.id;
    if (!documentId) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required.' } });
      return;
    }

    const result = await intakeService.getAuthorizedViewUrl(
      documentId,
      req.user!,
      ipAddress,
      userAgent,
      viewReason
    );

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate view URL';
    res.status(403).json({ success: false, error: { message } });
  }
});

/**
 * Step 5: Get document processing timeline.
 */
documentRouter.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    const user = req.user!;
    if (!user.isSuperAdmin && user.instituteId !== doc.instituteId.toString()) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const isOfficerOrAdmin =
      user.role === UserRole.OFFICER ||
      user.role === UserRole.ADMIN ||
      user.roles?.includes(UserRole.OFFICER) ||
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      user.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;

    if (!isOfficerOrAdmin && doc.studentId.toString() !== user.userId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const events = await timelineService.getTimeline(doc.applicationId, doc.instituteId.toString());
    res.json({ success: true, data: events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch timeline';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5b: Get normalized OCR result for document (tenant and case authorized).
 */
documentRouter.get('/:id/ocr', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    // Tenancy Check
    if (!user.isSuperAdmin && doc.instituteId.toString() !== user.instituteId) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Access denied to documents belonging to another institute.' },
      });
      return;
    }

    // Student ownership check
    if (
      user.roles.includes(UserRole.STUDENT) &&
      !user.roles.includes(UserRole.VERIFICATION_OFFICER) &&
      !user.roles.includes(UserRole.INSTITUTE_ADMIN) &&
      !user.isSuperAdmin
    ) {
      if (doc.studentId.toString() !== user.userId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You can only access OCR results for your own documents.' },
        });
        return;
      }
    }

    const ocrResult = await OCRResultModel.findOne({ documentId: doc._id });
    if (!ocrResult) {
      res.status(404).json({
        success: false,
        error: { message: 'OCR extraction pending or not found for this document.' },
      });
      return;
    }

    res.json({ success: true, data: ocrResult });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve OCR result';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5c: Classify document based on OCR text (M3).
 */
documentRouter.post('/:id/classify', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    // Tenancy Check
    if (!user.isSuperAdmin && doc.instituteId.toString() !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    // Retrieve OCR full text
    const ocrRecord = await OCRResultModel.findOne({ documentId: doc._id });
    const rawOcrText = ocrRecord ? ocrRecord.fullText : (req.body.textOverride || '');

    const outcome = await classificationService.classifyDocument(
      doc._id.toString(),
      rawOcrText,
      doc.instituteId.toString()
    );

    res.json({
      success: true,
      data: {
        category: outcome.classification.category,
        confidence: outcome.classification.modelConfidence,
        profile: outcome.resolvedProfile,
        evidencePhrases: outcome.classification.evidencePhrases,
        explanation: outcome.classification.explanation,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Classification failed';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5d: Get classification record for document (M3).
 */
documentRouter.get('/:id/classification', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    if (!user.isSuperAdmin && doc.instituteId.toString() !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const record = await ClassificationRecordModel.findOne({ documentId: doc._id }).sort({ createdAt: -1 });
    if (!record) {
      res.status(404).json({ success: false, error: { message: 'Classification not found' } });
      return;
    }

    res.json({ success: true, data: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch classification';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5e: Extract structured fields from document using active profile (M4).
 */
documentRouter.post('/:id/extract', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    if (!user.isSuperAdmin && doc.instituteId.toString() !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const extraction = await fieldExtractionService.extractDocumentFields(
      doc._id.toString(),
      doc.instituteId.toString()
    );

    res.json({ success: true, data: extraction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Field extraction failed';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5f: Get extracted fields for document (M4).
 */
documentRouter.get('/:id/fields', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }

    if (!user.isSuperAdmin && doc.instituteId.toString() !== user.instituteId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const isOfficerOrAdmin =
      user.role === UserRole.OFFICER ||
      user.role === UserRole.ADMIN ||
      user.roles?.includes(UserRole.OFFICER) ||
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      user.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;

    if (!isOfficerOrAdmin && doc.studentId.toString() !== user.userId) {
      res.status(403).json({ success: false, error: { message: 'Forbidden' } });
      return;
    }

    const extraction = await DocumentExtractionModel.findOne({ documentId: doc._id }).sort({ version: -1 });
    if (!extraction) {
      res.status(404).json({ success: false, error: { message: 'No fields extracted for this document yet' } });
      return;
    }

    res.json({ success: true, data: extraction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve fields';
    res.status(500).json({ success: false, error: { message } });
  }
});

/**
 * Step 5b: Apply human review action to extracted fields.
 */
documentRouter.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const parsed = CorrectionActionSchema.parse(req.body);
    const expectedVersion =
      parsed.expectedVersion ??
      (req.headers['if-match'] ? parseInt(req.headers['if-match'] as string, 10) : undefined);

    const result = await reviewService.applyReviewAction(
      id,
      parsed,
      user,
      expectedVersion
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply review action';
    let status = 400;
    if (message.startsWith('Forbidden')) status = 403;
    else if (message.includes('not found')) status = 404;
    else if (message.includes('Optimistic lock conflict')) status = 409;

    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * Step 5c: Perform academic consistency check and compare with printed values.
 */
documentRouter.post('/:id/consistency', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const { profileKey, customSubjects } = req.body || {};
    const result = await consistencyService.performConsistencyCheck(id, user, {
      profileKey,
      customSubjects,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to perform consistency check';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * Step 5d: Retrieve academic consistency result.
 */
documentRouter.get('/:id/consistency', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const result = await consistencyService.getConsistencyResult(id, user);
    if (!result) {
      res.status(404).json({ success: false, error: { message: 'No consistency check record found' } });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve consistency result';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * Step 5e: Verify document against issuer/locker provider.
 */
documentRouter.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const { provider, consentGrantId, manualEvidence, simulatedScenario } = req.body || {};
    if (!provider || !Object.values(VerificationProviderType).includes(provider)) {
      res.status(400).json({
        success: false,
        error: { message: `Valid provider is required (${Object.values(VerificationProviderType).join(', ')})` },
      });
      return;
    }

    const result = await verificationService.verifyDocument(id, provider, user, {
      consentGrantId,
      manualEvidence,
      simulatedScenario,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify document';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * Step 5f: Get verification results for document.
 */
documentRouter.get('/:id/verification', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Document ID is required' } });
      return;
    }

    const results = await verificationService.getVerificationResults(id, user);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve verification results';
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: { message } });
  }
});

/**
 * Step 6: List documents (scoped strictly by tenant & role).
 */
documentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const filter: Record<string, unknown> = {};

    // Tenancy scope
    if (!user.isSuperAdmin) {
      filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
    } else if (req.query.instituteId) {
      filter.instituteId = new mongoose.Types.ObjectId(String(req.query.instituteId));
    }

    // Role scope
    const isOfficerOrAdmin =
      user.role === UserRole.OFFICER ||
      user.role === UserRole.ADMIN ||
      user.roles?.includes(UserRole.OFFICER) ||
      user.roles?.includes(UserRole.ADMIN) ||
      user.roles?.includes(UserRole.VERIFICATION_OFFICER) ||
      user.roles?.includes(UserRole.INSTITUTE_ADMIN) ||
      user.isSuperAdmin;

    if (!isOfficerOrAdmin) {
      filter.studentId = new mongoose.Types.ObjectId(user.userId);
    }

    if (req.query.applicationId) {
      filter.applicationId = String(req.query.applicationId);
    }

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const documents = await DocumentModel.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: documents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list documents';
    res.status(500).json({ success: false, error: { message } });
  }
});
