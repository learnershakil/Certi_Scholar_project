import { ScanState } from '@repo/contracts';
import { detectMagicBytes, MagicByteResult } from './magicBytes';
import { inspectPdfBuffer, PdfInspectionResult } from './pdfInspector';
import { scanForMalware, MalwareScanResult } from './malwareScanner';

export interface FullInspectionResult {
  isAcceptable: boolean;
  detectedMimeType: string | null;
  magicBytes: MagicByteResult;
  pdfInspection?: PdfInspectionResult;
  malwareScan: MalwareScanResult;
  quarantineReason?: string;
  securityFlags: string[];
}

export async function inspectAndScanDocument(
  buffer: Buffer,
  declaredMimeType: string
): Promise<FullInspectionResult> {
  const securityFlags: string[] = [];

  // Zero-byte check
  if (!buffer || buffer.length === 0) {
    return {
      isAcceptable: false,
      detectedMimeType: null,
      magicBytes: { isValid: false, detectedMimeType: null, error: 'File buffer is empty (0 bytes)' },
      malwareScan: { state: ScanState.FAILED, engine: 'Pre-check' },
      quarantineReason: 'Zero-byte empty file rejected',
      securityFlags: ['EMPTY_FILE'],
    };
  }

  // 1. Magic bytes check
  const magicBytes = detectMagicBytes(buffer);
  if (!magicBytes.isValid || magicBytes.detectedMimeType !== declaredMimeType) {
    return {
      isAcceptable: false,
      detectedMimeType: magicBytes.detectedMimeType,
      magicBytes,
      malwareScan: { state: ScanState.FAILED, engine: 'Pre-check' },
      quarantineReason: `MIME type mismatch: declared '${declaredMimeType}' but magic bytes indicate '${magicBytes.detectedMimeType || 'UNKNOWN'}'`,
      securityFlags: ['MIME_SIGNATURE_MISMATCH'],
    };
  }

  // 2. Malware scan - Antivirus check runs BEFORE parser to protect parser from malicious exploits
  const malwareScan = await scanForMalware(buffer);
  if (malwareScan.state !== ScanState.CLEAN) {
    let reason = `Scanner returned non-clean state: ${malwareScan.state}`;
    if (malwareScan.state === ScanState.INFECTED) {
      securityFlags.push('MALWARE_POSITIVE');
      reason = `Malware detected (${malwareScan.signature || 'Threat detected'}) by ${malwareScan.engine}`;
    } else if (malwareScan.state === ScanState.FAILED) {
      securityFlags.push('MALWARE_SCAN_FAILED');
      reason = `Malware scan failed or timed out: ${malwareScan.error || 'Scanner daemon unavailable'}`;
    } else if (malwareScan.state === ScanState.SUSPICIOUS) {
      securityFlags.push('MALWARE_SUSPICIOUS');
      reason = `Suspicious file content flagged by ${malwareScan.engine}`;
    }

    return {
      isAcceptable: false,
      detectedMimeType: magicBytes.detectedMimeType,
      magicBytes,
      malwareScan,
      quarantineReason: reason,
      securityFlags,
    };
  }

  // 3. Structural checks if PDF (only for clean files)
  let pdfInspection: PdfInspectionResult | undefined;
  if (magicBytes.detectedMimeType === 'application/pdf') {
    pdfInspection = await inspectPdfBuffer(buffer);
    if (!pdfInspection.isStructuralValid) {
      return {
        isAcceptable: false,
        detectedMimeType: magicBytes.detectedMimeType,
        magicBytes,
        pdfInspection,
        malwareScan,
        quarantineReason: `Corrupt, encrypted or unparseable PDF: ${pdfInspection.error}`,
        securityFlags: pdfInspection.securityFlags,
      };
    }

    if (pdfInspection.hasSuspiciousFeatures) {
      securityFlags.push(...pdfInspection.securityFlags);
      // Risky actions like JavaScript, Launch, or EmbeddedFiles will quarantine the document
      const criticalRisks = pdfInspection.securityFlags.filter((f) =>
        ['PDF_JAVASCRIPT_ACTIONS', 'PDF_LAUNCH_ACTIONS', 'PDF_EMBEDDED_FILES'].includes(f)
      );
      if (criticalRisks.length > 0) {
        return {
          isAcceptable: false,
          detectedMimeType: magicBytes.detectedMimeType,
          magicBytes,
          pdfInspection,
          malwareScan: { state: ScanState.SUSPICIOUS, engine: 'PDF-Behavioral-Inspector' },
          quarantineReason: `Dangerous active PDF actions detected: ${criticalRisks.join(', ')}`,
          securityFlags,
        };
      }
    }
  }

  return {
    isAcceptable: true,
    detectedMimeType: magicBytes.detectedMimeType,
    magicBytes,
    pdfInspection,
    malwareScan,
    securityFlags,
  };
}
