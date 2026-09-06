import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditEntry extends Document {
  instituteId: mongoose.Types.ObjectId;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: 'DOCUMENT' | 'APPLICATION' | 'CORRECTION' | 'SCHOLARSHIP' | 'CONSENT' | 'AUTH';
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  viewReason?: string;
  changes?: Record<string, unknown>;
  timestamp: Date;
}

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    viewReason: { type: String },
    changes: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AuditEntrySchema.index({ instituteId: 1, resourceId: 1, timestamp: -1 });

export const AuditEntry: Model<IAuditEntry> =
  (mongoose.models.AuditEntry as Model<IAuditEntry>) ||
  mongoose.model<IAuditEntry>('AuditEntry', AuditEntrySchema);
