export interface PdfInspectionResult {
  isStructuralValid: boolean;
  hasSuspiciousFeatures: boolean;
  securityFlags: string[];
  pageCountEstimate?: number;
  error?: string;
}

const DANGEROUS_PDF_PATTERNS = [
  { flag: 'PDF_JAVASCRIPT_ACTIONS', regex: /\/(JavaScript|JS)\b/i },
  { flag: 'PDF_LAUNCH_ACTIONS', regex: /\/Launch\b/i },
  { flag: 'PDF_EMBEDDED_FILES', regex: /\/EmbeddedFiles\b/i },
  { flag: 'PDF_RICH_MEDIA', regex: /\/RichMedia\b/i },
  { flag: 'PDF_AUTOMATIC_ACTIONS', regex: /\/(OpenAction|AA)\b/i },
  { flag: 'PDF_URI_ACTIONS', regex: /\/URI\b/i },
];

const MAX_PAGE_COUNT_LIMIT = 50; // Bound resources to prevent resource exhaustion

export function inspectPdfBuffer(buffer: Buffer): PdfInspectionResult {
  if (buffer.length > 10 * 1024 * 1024) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['PDF_OVERSIZED'],
      error: 'PDF exceeds maximum allowable size of 10MB',
    };
  }

  const content = buffer.toString('binary');
  const securityFlags: string[] = [];

  // Check header
  if (!content.startsWith('%PDF-')) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['CORRUPTED_PDF_HEADER'],
      error: 'Invalid PDF header: Missing %PDF- prefix',
    };
  }

  // Check EOF marker
  if (!content.includes('%%EOF')) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['MISSING_PDF_EOF'],
      error: 'Truncated or corrupted PDF: Missing %%EOF marker',
    };
  }

  // Check for dangerous actions and embedded content
  for (const { flag, regex } of DANGEROUS_PDF_PATTERNS) {
    if (regex.test(content)) {
      securityFlags.push(flag);
    }
  }

  // Count /Page objects roughly with resource bound
  const pageMatches = content.match(/\/Type\s*\/Page\b/g);
  const pageCountEstimate = pageMatches ? pageMatches.length : 1;

  if (pageCountEstimate > MAX_PAGE_COUNT_LIMIT) {
    securityFlags.push('PDF_EXCESSIVE_PAGES');
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags,
      pageCountEstimate,
      error: `PDF page count (${pageCountEstimate}) exceeds platform limit of ${MAX_PAGE_COUNT_LIMIT} pages.`,
    };
  }

  const hasSuspiciousFeatures = securityFlags.length > 0;

  return {
    isStructuralValid: true,
    hasSuspiciousFeatures,
    securityFlags,
    pageCountEstimate,
  };
}
