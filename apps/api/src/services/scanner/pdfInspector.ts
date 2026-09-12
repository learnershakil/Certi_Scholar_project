import { PDFDocument } from 'pdf-lib';

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

export const MAX_PAGE_COUNT_LIMIT = 50; // Bound resources to prevent resource exhaustion
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Robust, bounded PDF structural inspector.
 * Uses pdf-lib parser for structural validation, page count, and encryption detection,
 * combined with raw binary scanning for active content (JavaScript, Launch, Embedded files)
 * as defense-in-depth.
 */
export async function inspectPdfBuffer(buffer: Buffer): Promise<PdfInspectionResult> {
  // 1. Strict byte-size boundary
  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['PDF_OVERSIZED'],
      error: `PDF exceeds maximum allowable size of ${MAX_PDF_SIZE_BYTES} bytes (10MB)`,
    };
  }

  // 2. Reject zero-byte or empty buffer
  if (buffer.length === 0) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['EMPTY_FILE'],
      error: 'PDF file is empty (0 bytes)',
    };
  }

  // 3. Fast-fail header check
  const headerCheck = buffer.subarray(0, 5).toString('binary');
  if (!headerCheck.startsWith('%PDF-')) {
    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: ['CORRUPTED_PDF_HEADER'],
      error: 'Invalid PDF header: Missing %PDF- prefix',
    };
  }

  // 4. Raw byte defense-in-depth inspection for active content
  const content = buffer.toString('binary');
  const securityFlags: string[] = [];

  for (const { flag, regex } of DANGEROUS_PDF_PATTERNS) {
    if (regex.test(content)) {
      securityFlags.push(flag);
    }
  }

  // 5. Bounded structural PDF parsing using pdf-lib
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    // Check if the PDF is encrypted / password protected
    if (pdfDoc.isEncrypted) {
      securityFlags.push('PDF_ENCRYPTED');
      return {
        isStructuralValid: false,
        hasSuspiciousFeatures: true,
        securityFlags,
        error: 'Encrypted or password-protected PDFs are rejected for automated verification',
      };
    }

    pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return {
        isStructuralValid: false,
        hasSuspiciousFeatures: true,
        securityFlags: [...securityFlags, 'PDF_ZERO_PAGES'],
        error: 'PDF contains no renderable pages',
      };
    }

    if (pageCount > MAX_PAGE_COUNT_LIMIT) {
      securityFlags.push('PDF_EXCESSIVE_PAGES');
      return {
        isStructuralValid: false,
        hasSuspiciousFeatures: true,
        securityFlags,
        pageCountEstimate: pageCount,
        error: `PDF page count (${pageCount}) exceeds platform limit of ${MAX_PAGE_COUNT_LIMIT} pages.`,
      };
    }
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    const isEncrypted = errMessage.toLowerCase().includes('encrypt');
    if (isEncrypted) {
      securityFlags.push('PDF_ENCRYPTED');
      return {
        isStructuralValid: false,
        hasSuspiciousFeatures: true,
        securityFlags,
        error: 'Encrypted or password-protected PDF cannot be inspected',
      };
    }

    return {
      isStructuralValid: false,
      hasSuspiciousFeatures: true,
      securityFlags: [...securityFlags, 'MALFORMED_PDF_STRUCTURE'],
      error: `PDF structural validation failed: ${errMessage}`,
    };
  }

  const hasSuspiciousFeatures = securityFlags.length > 0;

  return {
    isStructuralValid: true,
    hasSuspiciousFeatures,
    securityFlags,
    pageCountEstimate: pageCount,
  };
}
