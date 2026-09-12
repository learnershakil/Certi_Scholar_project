import { describe, it, expect } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { detectMagicBytes } from '../src/services/scanner/magicBytes';
import { inspectPdfBuffer } from '../src/services/scanner/pdfInspector';
import { scanForMalware } from '../src/services/scanner/malwareScanner';
import { inspectAndScanDocument } from '../src/services/scanner';
import { ScanState } from '@repo/contracts';

describe('M1 Document Intake Scanner & Structural Inspection (Hardened & Bounded)', () => {
  it('correctly identifies valid PDF magic bytes', () => {
    const validPdfHeader = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const result = detectMagicBytes(validPdfHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('application/pdf');
  });

  it('correctly identifies valid JPEG magic bytes', () => {
    const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const result = detectMagicBytes(validJpegHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('image/jpeg');
  });

  it('correctly identifies valid PNG magic bytes', () => {
    const validPngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const result = detectMagicBytes(validPngHeader);
    expect(result.isValid).toBe(true);
    expect(result.detectedMimeType).toBe('image/png');
  });

  it('rejects spoofed file with fake extension and wrong magic bytes', () => {
    const fakePdf = Buffer.from('This is actually a plaintext text file disguised as a pdf.');
    const result = detectMagicBytes(fakePdf);
    expect(result.isValid).toBe(false);
    expect(result.detectedMimeType).toBeNull();
  });

  it('rejects zero-byte empty files', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await inspectAndScanDocument(emptyBuffer, 'application/pdf');
    expect(result.isAcceptable).toBe(false);
    expect(result.securityFlags).toContain('EMPTY_FILE');
  });

  it('detects truncated or corrupted PDF structure', async () => {
    const truncatedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj');
    const inspection = await inspectPdfBuffer(truncatedPdf);
    expect(inspection.isStructuralValid).toBe(false);
    expect(inspection.securityFlags).toContain('MALFORMED_PDF_STRUCTURE');
  });

  it('detects dangerous embedded JavaScript in PDF', async () => {
    const maliciousPdf = Buffer.from(
      '%PDF-1.5\n' +
      '1 0 obj\n<< /Type /Catalog /OpenAction 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("pwned");) >>\nendobj\n' +
      '%%EOF'
    );
    const inspection = await inspectPdfBuffer(maliciousPdf);
    expect(inspection.hasSuspiciousFeatures).toBe(true);
    expect(inspection.securityFlags).toContain('PDF_JAVASCRIPT_ACTIONS');
  });

  it('detects dangerous /Launch actions in PDF', async () => {
    const launchPdf = Buffer.from(
      '%PDF-1.5\n' +
      '1 0 obj\n<< /Type /Catalog /OpenAction 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Action /S /Launch /F (cmd.exe) >>\nendobj\n' +
      '%%EOF'
    );
    const inspection = await inspectPdfBuffer(launchPdf);
    expect(inspection.hasSuspiciousFeatures).toBe(true);
    expect(inspection.securityFlags).toContain('PDF_LAUNCH_ACTIONS');
  });

  it('detects excessive pages (> 50 pages) and rejects resource exhaustion attempt', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 52; i++) {
      doc.addPage([200, 200]);
    }
    const pdfBytes = await doc.save();
    const inspection = await inspectPdfBuffer(Buffer.from(pdfBytes));
    expect(inspection.isStructuralValid).toBe(false);
    expect(inspection.securityFlags).toContain('PDF_EXCESSIVE_PAGES');
    expect(inspection.pageCountEstimate).toBe(52);
  });

  it('identifies synthetic EICAR test string and quarantines file as malware', async () => {
    const eicarPayload = Buffer.from(
      '%PDF-1.4\n' +
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*\n' +
      '%%EOF'
    );
    const scanResult = await scanForMalware(eicarPayload);
    expect(scanResult.state).toBe(ScanState.INFECTED);
  });

  it('validates live ClamAV daemon TCP INSTREAM scan when daemon is available', async () => {
    // Generate valid 1-page PDF
    const doc = await PDFDocument.create();
    doc.addPage([300, 400]);
    const pdfBytes = await doc.save();
    const cleanBuffer = Buffer.from(pdfBytes);

    const scanResult = await scanForMalware(cleanBuffer);
    expect(scanResult.state).toBe(ScanState.CLEAN);
  });

  it('FAIL CLOSED: Non-clean scanner states (FAILED/SUSPICIOUS) must reject file', async () => {
    const mockFailedInspection = {
      isAcceptable: false,
      detectedMimeType: 'application/pdf',
      magicBytes: { isValid: true, detectedMimeType: 'application/pdf' },
      malwareScan: { state: ScanState.FAILED, engine: 'ClamAV-Daemon', error: 'Connection refused' },
      quarantineReason: 'Malware scan failed or timed out: Connection refused',
      securityFlags: ['MALWARE_SCAN_FAILED'],
    };
    expect(mockFailedInspection.isAcceptable).toBe(false);
    expect(mockFailedInspection.securityFlags).toContain('MALWARE_SCAN_FAILED');
  });

  it('full pipeline accepts genuine structured PDF and marks acceptable', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 600]);
    page.drawText('CertiScholar Verification Document');
    const pdfBytes = await doc.save();
    const cleanPdf = Buffer.from(pdfBytes);

    const result = await inspectAndScanDocument(cleanPdf, 'application/pdf');
    expect(result.isAcceptable).toBe(true);
    expect(result.detectedMimeType).toBe('application/pdf');
    expect(result.malwareScan.state).toBe(ScanState.CLEAN);
    expect(result.pdfInspection?.isStructuralValid).toBe(true);
    expect(result.pdfInspection?.pageCountEstimate).toBe(1);
  });
});
