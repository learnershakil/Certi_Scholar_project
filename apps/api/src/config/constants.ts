import mongoose from 'mongoose';

/**
 * Single-Tenant Organization Constant
 * In single-tenant mode, all documents, cases, rules, and records are bound
 * to this organization ID internally so schemas and compound indexes remain clean.
 */
export const SINGLE_ORG_ID_STR = '660000000000000000000001';
export const SINGLE_ORG_ID = new mongoose.Types.ObjectId(SINGLE_ORG_ID_STR);
export const SINGLE_ORG_NAME = 'CertiScholar Institutional Organization';
export const SINGLE_ORG_CODE = 'CERTISCHOLAR';
