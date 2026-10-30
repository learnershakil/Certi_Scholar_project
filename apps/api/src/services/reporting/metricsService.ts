import mongoose from 'mongoose';
import { AuthSessionPayload, UserRole } from '@repo/contracts';
import { DocumentModel } from '../../models/Document';
import { DocumentExtractionModel } from '../../models/DocumentExtraction';
import { AcademicConsistencyModel } from '../../models/AcademicConsistency';
import { VerificationResultModel } from '../../models/VerificationResult';
import { RecommendationModel } from '../../models/Recommendation';
import { CorrectionModel } from '../../models/Correction';

export interface DashboardMetrics {
  totalApplications: number;
  totalDocuments: number;
  documentsByStatus: Record<string, number>;
  extractionAccuracyRate: number; // percentage of fields accepted without human correction
  humanCorrectionCount: number;
  arithmeticDiscrepancyCount: number;
  verificationBreakdown: Record<string, number>;
  recommendationDistribution: Record<string, number>;
  generatedAt: string;
}

export class MetricsService {
  async getInstituteMetrics(
    instituteId: string,
    actor: AuthSessionPayload
  ): Promise<DashboardMetrics> {
    if (!actor.isSuperAdmin && instituteId !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant metrics access');
    }

    const isStaff =
      actor.roles.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.roles.includes(UserRole.SCHOLARSHIP_OFFICER) ||
      actor.roles.includes(UserRole.VERIFICATION_OFFICER) ||
      actor.isSuperAdmin;

    if (!isStaff) {
      throw new Error('Forbidden: Dashboard metrics require staff or admin privileges');
    }

    const instObjectId = new mongoose.Types.ObjectId(instituteId);

    // 1. Total distinct applications and documents
    const [applications, documents, corrections, consistencies, verifications, recommendations] =
      await Promise.all([
        DocumentModel.distinct('applicationId', { instituteId: instObjectId }),
        DocumentModel.find({ instituteId: instObjectId }),
        CorrectionModel.find({ instituteId: instObjectId }),
        AcademicConsistencyModel.find({ instituteId: instObjectId }),
        VerificationResultModel.find({ instituteId: instObjectId }),
        RecommendationModel.find({ instituteId: instObjectId }),
      ]);

    // 2. Documents by processing state
    const documentsByStatus: Record<string, number> = {};
    for (const doc of documents) {
      documentsByStatus[doc.status] = (documentsByStatus[doc.status] || 0) + 1;
    }

    // 3. Verification breakdown
    const verificationBreakdown: Record<string, number> = {};
    for (const verif of verifications) {
      verificationBreakdown[verif.provider] = (verificationBreakdown[verif.provider] || 0) + 1;
    }

    // 4. Recommendation distribution
    const recommendationDistribution: Record<string, number> = {};
    for (const rec of recommendations) {
      recommendationDistribution[rec.status] = (recommendationDistribution[rec.status] || 0) + 1;
    }

    // 5. Arithmetic discrepancy count
    const arithmeticDiscrepancyCount = consistencies.filter((c) => c.discrepancyFlagged).length;

    // 6. Extraction accuracy rate
    const extractions = await DocumentExtractionModel.find({ instituteId: instObjectId });
    let totalExtractedFields = 0;
    for (const ext of extractions) {
      totalExtractedFields += ext.fields.length;
    }

    const humanCorrectionCount = corrections.filter((c) => c.action === 'CORRECT').length;
    const accuracyRate =
      totalExtractedFields > 0
        ? Math.round(((totalExtractedFields - humanCorrectionCount) / totalExtractedFields) * 10000) / 100
        : 100.0;

    return {
      totalApplications: applications.length,
      totalDocuments: documents.length,
      documentsByStatus,
      extractionAccuracyRate: Math.max(0, accuracyRate),
      humanCorrectionCount,
      arithmeticDiscrepancyCount,
      verificationBreakdown,
      recommendationDistribution,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();
