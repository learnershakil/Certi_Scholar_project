import mongoose from 'mongoose';
import { TimelineEventType } from '@repo/contracts';
import { TimelineEvent } from '../models/TimelineEvent';

export interface RecordTimelineEventParams {
  applicationId: string;
  documentId?: string;
  instituteId: string;
  type: TimelineEventType;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export class TimelineService {
  async recordEvent(params: RecordTimelineEventParams): Promise<void> {
    try {
      await TimelineEvent.create({
        applicationId: params.applicationId,
        documentId: params.documentId,
        instituteId: new mongoose.Types.ObjectId(params.instituteId),
        type: params.type,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorName: params.actorName,
        title: params.title,
        description: params.description,
        metadata: params.metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Failed to record timeline event:', err);
    }
  }

  async getTimeline(applicationId: string, instituteId: string) {
    return TimelineEvent.find({
      applicationId,
      instituteId: new mongoose.Types.ObjectId(instituteId),
    }).sort({ timestamp: 1 });
  }
}

export const timelineService = new TimelineService();

