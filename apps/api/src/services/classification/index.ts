import mongoose from 'mongoose';
import {
  DocumentTypeCategory,
  DocumentProcessingState,
  TimelineEventType,
  ClassificationResponseDto,
  FieldDataType,
} from '@repo/contracts';
import { DocumentModel } from '../../models/Document';
import { ExtractionProfileModel, IExtractionProfile } from '../../models/ExtractionProfile';
import { ClassificationRecordModel } from '../../models/ClassificationRecord';
import { sanitizeOcrTextForClassification } from './sanitizer';
import { DeterministicClassifierProvider } from './deterministicProvider';
import { timelineService } from '../timelineService';

const SEED_PROFILES = [
  {
    key: 'CBSE_XII_MARKSHEET_2024',
    name: 'CBSE Class XII Marksheet Profile',
    category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
    version: '1.0.0',
    isActive: true,
    fields: [
      { fieldKey: 'studentName', label: 'Candidate Name', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'rollNumber', label: 'Roll Number', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.90 },
      { fieldKey: 'schoolName', label: 'School / Institution', dataType: FieldDataType.STRING, required: false, confidenceThreshold: 0.80 },
      { fieldKey: 'passingYear', label: 'Year of Passing', dataType: FieldDataType.NUMBER, required: true, confidenceThreshold: 0.90 },
      { fieldKey: 'totalMarks', label: 'Total Marks Obtained', dataType: FieldDataType.NUMBER, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'maxMarks', label: 'Maximum Total Marks', dataType: FieldDataType.NUMBER, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'printedPercentage', label: 'Printed Percentage', dataType: FieldDataType.NUMBER, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'subjectMarks', label: 'Subject Marks Breakdown', dataType: FieldDataType.ARRAY, required: false, confidenceThreshold: 0.85 },
    ],
  },
  {
    key: 'STATE_INCOME_CERT_V1',
    name: 'State Revenue Department Income Certificate',
    category: DocumentTypeCategory.INCOME_CERTIFICATE,
    version: '1.0.0',
    isActive: true,
    fields: [
      { fieldKey: 'applicantName', label: 'Applicant / Beneficiary Name', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'certificateNumber', label: 'Certificate / Praman Patra Number', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.90 },
      { fieldKey: 'issuingAuthority', label: 'Issuing Officer (Tehsildar / SDM)', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.80 },
      { fieldKey: 'annualFamilyIncome', label: 'Annual Family Income (INR)', dataType: FieldDataType.NUMBER, required: true, confidenceThreshold: 0.90 },
      { fieldKey: 'issueDate', label: 'Certificate Issue Date', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.85 },
    ],
  },
  {
    key: 'GOV_ID_CARD_V1',
    name: 'Government National Identity Document (Aadhaar / PAN)',
    category: DocumentTypeCategory.AADHAAR_DOCUMENT,
    version: '1.0.0',
    isActive: true,
    fields: [
      { fieldKey: 'holderName', label: 'Cardholder Name', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.85 },
      { fieldKey: 'idNumber', label: 'Identification Number (Aadhaar / PAN)', dataType: FieldDataType.STRING, required: true, confidenceThreshold: 0.90 },
      { fieldKey: 'dateOfBirth', label: 'Date of Birth (DOB)', dataType: FieldDataType.STRING, required: false, confidenceThreshold: 0.85 },
      { fieldKey: 'gender', label: 'Gender', dataType: FieldDataType.STRING, required: false, confidenceThreshold: 0.80 },
    ],
  },
];

export async function ensureDefaultExtractionProfiles(): Promise<void> {
  for (const prof of SEED_PROFILES) {
    await ExtractionProfileModel.findOneAndUpdate(
      { key: prof.key },
      { $setOnInsert: prof },
      { upsert: true }
    );
  }
}

export class ClassificationService {
  private provider: DeterministicClassifierProvider;

  constructor() {
    this.provider = new DeterministicClassifierProvider();
  }

  async classifyDocument(
    documentId: string,
    rawOcrText: string,
    actorInstituteId: string
  ): Promise<{
    classification: ClassificationResponseDto;
    resolvedProfile: IExtractionProfile | null;
  }> {
    await ensureDefaultExtractionProfiles();

    // 1. Sanitize OCR text to neutralize prompt injection
    const sanitizedText = sanitizeOcrTextForClassification(rawOcrText);

    // 2. Classify via Provider
    const result = this.provider.classify(sanitizedText);
    const provider = 'DETERMINISTIC_HEURISTIC';

    // 3. Resolve active profile from database (Gemini CANNOT invent profiles)
    let resolvedProfile: IExtractionProfile | null = null;
    if (result.candidateProfileKey) {
      resolvedProfile = await ExtractionProfileModel.findOne({
        key: result.candidateProfileKey,
        isActive: true,
      });
    }

    if (!resolvedProfile && result.category !== DocumentTypeCategory.UNKNOWN) {
      // Fallback: search profile by category
      resolvedProfile = await ExtractionProfileModel.findOne({
        category: result.category,
        isActive: true,
      });
    }

    // 4. Update Document Record
    await DocumentModel.findByIdAndUpdate(documentId, {
      $set: {
        category: result.category,
        categoryConfidence: result.modelConfidence,
        extractionProfileId: resolvedProfile?._id ? resolvedProfile._id.toString() : null,
        status: DocumentProcessingState.CLASSIFIED,
      },
    });

    // 5. Store Classification Audit Record
    await ClassificationRecordModel.create({
      documentId: new mongoose.Types.ObjectId(documentId),
      instituteId: new mongoose.Types.ObjectId(actorInstituteId),
      provider,
      category: result.category,
      modelConfidence: result.modelConfidence,
      candidateProfileKey: resolvedProfile ? resolvedProfile.key : null,
      evidencePhrases: result.evidencePhrases,
      explanation: result.explanation,
      classifiedAt: new Date(),
    });

    // 6. Record Timeline Event
    const doc = await DocumentModel.findById(documentId);
    if (doc) {
      await timelineService.recordEvent({
        applicationId: doc.applicationId,
        documentId,
        instituteId: actorInstituteId,
        type: TimelineEventType.DOCUMENT_CLASSIFIED,
        title: `Document Classified: ${result.category}`,
        description: `Classified as ${result.category} (Confidence: ${Math.round(result.modelConfidence * 100)}%). Assigned profile: ${resolvedProfile ? resolvedProfile.name : 'None (Needs Review)'}`,
        metadata: {
          category: result.category,
          confidence: result.modelConfidence,
          profileKey: resolvedProfile?.key || null,
          evidence: result.evidencePhrases,
        },
      });
    }

    return {
      classification: result,
      resolvedProfile,
    };
  }
}

export const classificationService = new ClassificationService();

