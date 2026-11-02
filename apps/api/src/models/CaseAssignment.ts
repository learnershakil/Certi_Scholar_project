import mongoose, { Schema, Document, Model } from 'mongoose';

export type CaseAssignmentStatus = 'ASSIGNED' | 'IN_REVIEW' | 'COMPLETED' | 'REASSIGNED';

export interface ICaseAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  instituteId: mongoose.Types.ObjectId;
  applicationId: string;
  documentId?: mongoose.Types.ObjectId;
  officerId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  status: CaseAssignmentStatus;
  notes?: string;
  assignedAt: Date;
  updatedAt: Date;
}

const CaseAssignmentSchema = new Schema<ICaseAssignment>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      index: true,
    },
    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'IN_REVIEW', 'COMPLETED', 'REASSIGNED'],
      default: 'ASSIGNED',
      index: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

CaseAssignmentSchema.index({ instituteId: 1, officerId: 1, status: 1 });
CaseAssignmentSchema.index({ instituteId: 1, applicationId: 1 });
CaseAssignmentSchema.index({ instituteId: 1, documentId: 1 });

export const CaseAssignmentModel: Model<ICaseAssignment> =
  (mongoose.models.CaseAssignment as Model<ICaseAssignment>) ||
  mongoose.model<ICaseAssignment>('CaseAssignment', CaseAssignmentSchema);
