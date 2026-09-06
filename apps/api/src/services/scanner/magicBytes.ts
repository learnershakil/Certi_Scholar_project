export interface MagicByteResult {
  isValid: boolean;
  detectedMimeType: string | null;
  error?: string;
}

export function detectMagicBytes(buffer: Buffer): MagicByteResult {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, detectedMimeType: null, error: 'File buffer too small' };
  }

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { isValid: true, detectedMimeType: 'application/pdf' };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMimeType: 'image/jpeg' };
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMimeType: 'image/png' };
  }

  return { isValid: false, detectedMimeType: null, error: 'Unknown file signature / magic bytes' };
}

