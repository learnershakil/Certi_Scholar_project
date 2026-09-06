import mongoose, { Schema, Document, Model } from 'mongoose';
import { TimelineEventType } from '@repo/contracts';

export interface ITimelineEvent extends Document {
  applicationId: string;
  documentId?: string;
  instituteId: mongoose.Types.ObjectId;
  type: TimelineEventType;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    applicationId: { type: String, required: true, index: true },
    documentId: { type: String, index: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    type: { type: String, enum: Object.values(TimelineEventType), required: true },
    actorId: { type: String },
    actorRole: { type: String },
    actorName: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

TimelineEventSchema.index({ instituteId: 1, applicationId: 1, timestamp: 1 });

export const TimelineEvent: Model<ITimelineEvent> =
  (mongoose.models.TimelineEvent as Model<ITimelineEvent>) ||
  mongoose.model<ITimelineEvent>('TimelineEvent', TimelineEventSchema);
