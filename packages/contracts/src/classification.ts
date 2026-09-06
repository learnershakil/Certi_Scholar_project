import { z } from 'zod';
import { DocumentTypeCategory, DocumentTypeCategorySchema } from './document';

export const ClassificationResponseSchema = z.object({
  category: DocumentTypeCategorySchema,
  modelConfidence: z.number().min(0).max(1),
  candidateProfileKey: z.string().nullable().optional(),
  evidencePhrases: z.array(z.string()).default([]),
  explanation: z.string().optional(),
});

export type ClassificationResponseDto = z.infer<typeof ClassificationResponseSchema>;

export interface ClassificationRecord {
  id: string;
  documentId: string;
  provider: 'GEMINI' | 'DETERMINISTIC_HEURISTIC' | 'MOCK';
  modelVersion?: string;
  category: DocumentTypeCategory;
  modelConfidence: number;
  candidateProfileKey?: string | null;
  evidencePhrases: string[];
  classifiedAt: string;
}

