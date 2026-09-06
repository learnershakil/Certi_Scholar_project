import { z } from 'zod';
import { BoundingPolygon } from './ocr';
import { DocumentTypeCategory } from './document';

export enum FieldDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
}

export interface FieldDefinition {
  fieldKey: string;
  label: string;
  dataType: FieldDataType;
  required: boolean;
  confidenceThreshold: number; // e.g. 0.85
  regexPattern?: string;
  description?: string;
}

export interface ExtractionProfile {
  id: string;
  key: string; // e.g. "CBSE_XII_MARKSHEET_2024", "STATE_INCOME_CERT_V1"
  name: string;
  category: DocumentTypeCategory;
  version: string;
  fields: FieldDefinition[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum FieldReviewStatus {
  AUTO_ACCEPTED = 'AUTO_ACCEPTED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  APPROVED = 'APPROVED',
  CORRECTED = 'CORRECTED',
  REJECTED = 'REJECTED',
  UNREADABLE = 'UNREADABLE',
}

export interface ExtractedFieldRecord {
  fieldKey: string;
  label: string;
  dataType: FieldDataType;
  rawValue: unknown;
  normalizedValue: unknown;
  confidence: number;
  confidenceMethod: string;
  source?: {
    page: number;
    boundingPolygon?: BoundingPolygon;
    matchedSnippet?: string;
  };
  reviewStatus: FieldReviewStatus;
  isBelowThreshold: boolean;
  missingReason?: string;
}

export interface ExtractionResult {
  documentId: string;
  profileKey: string;
  profileVersion: string;
  fields: ExtractedFieldRecord[];
  allRequiredPresent: boolean;
  needsReview: boolean;
  extractedAt: string;
}

