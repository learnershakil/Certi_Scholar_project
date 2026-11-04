import { z } from 'zod';

export interface BoundingPoint {
  x: number;
  y: number;
}

export interface BoundingPolygon {
  vertices: BoundingPoint[];
}

export interface NormalizedWord {
  text: string;
  confidence?: number;
  boundingPolygon?: BoundingPolygon;
}

export interface NormalizedParagraph {
  text: string;
  confidence?: number;
  boundingPolygon?: BoundingPolygon;
  words: NormalizedWord[];
}

export interface NormalizedBlock {
  blockType: 'TEXT' | 'TABLE' | 'PICTURE' | 'RULER' | 'UNKNOWN';
  text: string;
  confidence?: number;
  boundingPolygon?: BoundingPolygon;
  paragraphs: NormalizedParagraph[];
}

export interface NormalizedPage {
  pageNumber: number;
  width: number;
  height: number;
  unit: 'PIXEL' | 'POINT';
  confidence?: number;
  text: string;
  blocks: NormalizedBlock[];
}

export interface NormalizedOcrResult {
  provider: 'DOCUMENT_AI' | 'GOOGLE_CLOUD_VISION' | 'TESSERACT' | 'MOCK';
  providerVersion?: string;
  documentId: string;
  fullText: string;
  pages: NormalizedPage[];
  pageCount: number;
  processedAt: string;
  latencyMs: number;
}

export const OcrServiceRequestSchema = z.object({
  documentId: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().positive(),
});

export type OcrServiceRequestDto = z.infer<typeof OcrServiceRequestSchema>;

