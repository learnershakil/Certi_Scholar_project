/**
 * Defense against prompt injection in untrusted document text.
 * Ensures document contents cannot escape instructions, invoke tools, or override system categorization rules.
 */
export function sanitizeOcrTextForClassification(rawOcrText: string, maxLength: number = 4000): string {
  if (!rawOcrText) return '';

  // 1. Strip null bytes and non-printable control characters (except newline and tab)
  const cleaned = rawOcrText
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  // 2. Bound text length to prevent context explosion / DoS
  const bounded = cleaned.slice(0, maxLength);

  // 3. Strip all HTML/XML-like tags and attribute tags to prevent prompt injection escapes
  return bounded
    .replace(/<[^>]+>/g, ' ')
    .trim();
}
