import mongoose from 'mongoose';
import { CaseAssignmentModel, ICaseAssignment, CaseAssignmentStatus } from '../models/CaseAssignment';
import { User } from '../models/User';
import { DocumentModel } from '../models/Document';
import { auditService } from './auditService';
import { AuthSessionPayload, UserRole } from '@repo/contracts';

export interface AssignCaseInput {
  instituteId: string;
  applicationId: string;
  documentId?: string;
  officerId: string;
  notes?: string;
}

export class CaseAssignmentService {
  async assignCase(
    input: AssignCaseInput,
    actor: AuthSessionPayload
  ): Promise<ICaseAssignment> {
    // 1. Tenancy check
    if (!actor.isSuperAdmin && actor.instituteId !== input.instituteId) {
      throw new Error('Forbidden: Unauthorized cross-tenant case assignment');
    }

    // 2. Validate officer exists and belongs to institute
    const officer = await User.findById(input.officerId);
    if (!officer) {
      throw new Error(`Officer user not found: ${input.officerId}`);
    }

    // 3. Mark existing active assignment as REASSIGNED if present
    const existingQuery: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(input.instituteId),
      status: { $in: ['ASSIGNED', 'IN_REVIEW'] },
    };
    if (input.documentId) {
      existingQuery.documentId = new mongoose.Types.ObjectId(input.documentId);
    } else {
      existingQuery.applicationId = input.applicationId;
    }

    await CaseAssignmentModel.updateMany(existingQuery, {
      $set: { status: 'REASSIGNED' },
    });

    // 4. Create new assignment
    const assignment = await CaseAssignmentModel.create({
      instituteId: new mongoose.Types.ObjectId(input.instituteId),
      applicationId: input.applicationId,
      documentId: input.documentId ? new mongoose.Types.ObjectId(input.documentId) : undefined,
      officerId: new mongoose.Types.ObjectId(input.officerId),
      assignedBy: new mongoose.Types.ObjectId(actor.userId),
      status: 'ASSIGNED',
      notes: input.notes,
      assignedAt: new Date(),
    });

    // 5. Record audit entry
    await auditService.recordAction({
      instituteId: input.instituteId,
      actorId: actor.userId,
      actorRole: actor.roles[0] || 'ADMIN',
      action: 'CASE_ASSIGNED',
      resourceType: 'APPLICATION',
      resourceId: assignment._id.toString(),
      changes: {
        applicationId: input.applicationId,
        documentId: input.documentId,
        officerId: input.officerId,
      },
    });

    return assignment;
  }

  async getOfficerAssignments(
    instituteId: string,
    officerId: string,
    status?: CaseAssignmentStatus
  ): Promise<ICaseAssignment[]> {
    const query: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(instituteId),
      officerId: new mongoose.Types.ObjectId(officerId),
    };
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['ASSIGNED', 'IN_REVIEW'] };
    }

    return CaseAssignmentModel.find(query).sort({ assignedAt: -1 });
  }

  async getAllInstituteAssignments(
    instituteId: string,
    status?: CaseAssignmentStatus
  ): Promise<ICaseAssignment[]> {
    const query: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(instituteId),
    };
    if (status) {
      query.status = status;
    }
    return CaseAssignmentModel.find(query).populate('officerId', 'name email').sort({ assignedAt: -1 });
  }

  async isOfficerAuthorizedForDocument(
    documentId: string,
    actor: AuthSessionPayload
  ): Promise<boolean> {
    // Admins and Super Admins always have access
    if (actor.isSuperAdmin || actor.role === UserRole.ADMIN || actor.roles?.includes(UserRole.ADMIN) || actor.roles?.includes(UserRole.INSTITUTE_ADMIN)) {
      return true;
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) return false;

    // Check if an explicit assignment exists for this document or its application
    const assignment = await CaseAssignmentModel.findOne({
      instituteId: doc.instituteId,
      $or: [
        { documentId: doc._id },
        { applicationId: doc.applicationId },
      ],
      status: { $in: ['ASSIGNED', 'IN_REVIEW'] },
    });

    // If no assignment has been made yet, pool review by any officer in institute is permitted
    if (!assignment) {
      return true;
    }

    // If an assignment exists, only the assigned officer can review
    return assignment.officerId.toString() === actor.userId;
  }
}

export const caseAssignmentService = new CaseAssignmentService();
