import mongoose from 'mongoose';
import { AuthSessionPayload, UserRole } from '@repo/contracts';
import { RecommendationModel } from '../../models/Recommendation';
import { DocumentModel } from '../../models/Document';
import { AcademicConsistencyModel } from '../../models/AcademicConsistency';

export class ExportService {
  /**
   * OWASP CSV Injection Sanitizer:
   * Neutralizes formula injection vulnerabilities by escaping cells starting with =, +, -, @, tab, or carriage return.
   */
  sanitizeCsvCell(val: unknown): string {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();

    // Prevent CSV formula injection (DDE attacks)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape internal double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }

  async exportApplicationsToCsv(
    instituteId: string,
    actor: AuthSessionPayload
  ): Promise<string> {
    if (!actor.isSuperAdmin && instituteId !== actor.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant export request');
    }

    const isAuthorized =
      actor.roles.includes(UserRole.INSTITUTE_ADMIN) ||
      actor.roles.includes(UserRole.SCHOLARSHIP_OFFICER) ||
      actor.isSuperAdmin;

    if (!isAuthorized) {
      throw new Error('Forbidden: Export requires Institute Admin or Scholarship Officer role');
    }

    const instObjectId = new mongoose.Types.ObjectId(instituteId);

    // Fetch recommendations for this institute
    const recommendations = await RecommendationModel.find({ instituteId: instObjectId })
      .populate('scholarshipId', 'code name awardAmount')
      .sort({ createdAt: -1 });

    const headers = [
      'Application ID',
      'Scholarship Code',
      'Scholarship Name',
      'Award Amount (INR)',
      'Recommendation Status',
      'Issuer Authenticity Verified',
      'Generated Date',
      'Student Summary',
    ];

    const rows: string[] = [headers.map((h) => this.sanitizeCsvCell(h)).join(',')];

    for (const rec of recommendations) {
      const scholarship = rec.scholarshipId as any;
      const row = [
        rec.applicationId,
        scholarship?.code || 'N/A',
        scholarship?.name || 'N/A',
        scholarship?.awardAmount || 0,
        rec.status,
        rec.isAuthenticityVerified ? 'YES' : 'NO',
        rec.generatedAt.toISOString(),
        rec.summaryStudentText,
      ];
      rows.push(row.map((val) => this.sanitizeCsvCell(val)).join(','));
    }

    return rows.join('\n');
  }
}

export const exportService = new ExportService();
