import { FieldDataType, FieldReviewStatus } from '@repo/contracts';
import { IExtractedFieldSubdocument } from '../../models/DocumentExtraction';

interface ExtractorContext {
  fullText: string;
  ocrPages: any[];
}


// OCR evidence for a value: average confidence of the matching OCR words,
// and a polygon spanning those words. Falls back to the regex confidence
// when the OCR result carries no word geometry (e.g. legacy test fixtures).
// No polygon is returned in that case, rather than a fabricated box.
function ocrEvidence(ctx: ExtractorContext, value: string | null, fallback: number) {
  if (!value) return { confidence: 0, polygon: undefined as any };
  const words: any[] = [];
  for (const page of ctx.ocrPages || []) {
    for (const block of page.blocks || []) {
      for (const par of block.paragraphs || []) {
        for (const w of par.words || []) words.push(w);
      }
    }
  }
  const tokens = String(value).split(/\s+/).filter(Boolean);
  const matched = words.filter((w) => tokens.some((t) => String(w.text || '').toUpperCase() === t.toUpperCase()));
  if (!matched.length) return { confidence: fallback, polygon: undefined as any };
  const confs = matched.map((w) => w.confidence).filter((c) => typeof c === 'number');
  const confidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : fallback;
  const vertices = matched.flatMap((w) => w.boundingPolygon?.vertices || []);
  let polygon = undefined as any;
  if (vertices.length) {
    const xs = vertices.map((v: any) => v.x);
    const ys = vertices.map((v: any) => v.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    polygon = { vertices: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] };
  }
  return { confidence: Math.round(confidence * 100) / 100, polygon };
}

export function extractCbseMarksheetFields(ctx: ExtractorContext): IExtractedFieldSubdocument[] {
  const text = ctx.fullText;
  const fields: IExtractedFieldSubdocument[] = [];

  // 1. Student Name
  const nameMatch = text.match(/(?:CANDIDATE\s+NAME|NAME(?:\s+OF\s+CANDIDATE)?|STUDENT\s+NAME)\s*[:\-]?\s*([A-Za-z ]{3,35})/i);
  const studentName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : null;
  fields.push({
    fieldKey: 'studentName',
    label: 'Candidate Name',
    dataType: FieldDataType.STRING,
    rawValue: studentName,
    normalizedValue: studentName ? studentName.toUpperCase() : null,
    confidence: studentName ? ocrEvidence(ctx, studentName, 0.95).confidence : 0.0,
    confidenceMethod: 'OCR_WORD_CONFIDENCE_OR_REGEX_MATCH',
    source: {
      page: 1,
      matchedSnippet: nameMatch ? nameMatch[0] : undefined,
      boundingPolygon: studentName ? ocrEvidence(ctx, studentName, 0.95).polygon : undefined,
    },
    reviewStatus: studentName ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !studentName,
    missingReason: studentName ? undefined : 'Candidate name not found in marksheet',
  });

  // 2. Roll Number
  const rollMatch = text.match(/(?:ROLL\s+NO|ROLL\s+NUMBER)\s*[:\-]?\s*(\d{6,10})/i);
  const rollNumber = rollMatch && rollMatch[1] ? rollMatch[1].trim() : null;
  fields.push({
    fieldKey: 'rollNumber',
    label: 'Roll Number',
    dataType: FieldDataType.STRING,
    rawValue: rollNumber,
    normalizedValue: rollNumber,
    confidence: rollNumber ? ocrEvidence(ctx, rollNumber, 0.96).confidence : 0.0,
    confidenceMethod: 'NUMERIC_REGEX_MATCH',
    source: {
      page: 1,
      matchedSnippet: rollMatch ? rollMatch[0] : undefined,
      boundingPolygon: rollNumber ? ocrEvidence(ctx, rollNumber, 0.96).polygon : undefined,
    },
    reviewStatus: rollNumber ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !rollNumber,
    missingReason: rollNumber ? undefined : 'Roll number not detected',
  });

  // 3. Passing Year
  const yearMatch = text.match(/(?:YEAR|EXAMINATION|EXAM)\s*[:\-]?\s*(20\d{2})/i);
  const passingYear = yearMatch && yearMatch[1] ? parseInt(yearMatch[1], 10) : null;
  fields.push({
    fieldKey: 'passingYear',
    label: 'Year of Passing',
    dataType: FieldDataType.NUMBER,
    rawValue: yearMatch && yearMatch[1] ? yearMatch[1] : null,
    normalizedValue: passingYear,
    confidence: passingYear ? ocrEvidence(ctx, String(passingYear), 0.94).confidence : 0.0,
    confidenceMethod: 'FOUR_DIGIT_YEAR_MATCH',
    source: {
      page: 1,
      matchedSnippet: yearMatch ? yearMatch[0] : undefined,
    },
    reviewStatus: passingYear ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !passingYear,
  });

  // 4. Marks Obtained & Max Marks
  const marksMatch = text.match(/(?:MARKS\s+OBTAINED|TOTAL(?:\s+MARKS)?)\s*[:\-]?\s*(\d{2,3})(?:\s*\/\s*(\d{2,3}))?/i);
  const marksObtained = marksMatch && marksMatch[1] ? parseInt(marksMatch[1], 10) : null;
  const maximumMarks = marksMatch && marksMatch[2] ? parseInt(marksMatch[2], 10) : null;

  fields.push({
    fieldKey: 'totalMarks',
    label: 'Total Marks Obtained',
    dataType: FieldDataType.NUMBER,
    rawValue: marksMatch && marksMatch[1] ? marksMatch[1] : null,
    normalizedValue: marksObtained,
    confidence: marksObtained ? ocrEvidence(ctx, String(marksObtained), 0.92).confidence : 0.0,
    confidenceMethod: 'SCORE_GRID_MATCH',
    source: {
      page: 1,
      matchedSnippet: marksMatch ? marksMatch[0] : undefined,
    },
    reviewStatus: marksObtained ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !marksObtained,
  });

  fields.push({
    fieldKey: 'maxMarks',
    label: 'Maximum Total Marks',
    dataType: FieldDataType.NUMBER,
    rawValue: maximumMarks ? maximumMarks.toString() : null,
    normalizedValue: maximumMarks,
    confidence: maximumMarks ? ocrEvidence(ctx, String(maximumMarks), 0.95).confidence : 0.0,
    confidenceMethod: 'SCORE_GRID_MATCH',
    reviewStatus: maximumMarks ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !maximumMarks,
  });

  // 5. Printed percentage only. The recomputed percentage belongs to M6
  // and must not be merged into this field, or M6 can no longer compare
  // printed against recomputed values.
  const pctMatch = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);
  const percentage = pctMatch && pctMatch[1] ? parseFloat(pctMatch[1]) : null;

  fields.push({
    fieldKey: 'printedPercentage',
    label: 'Printed Percentage',
    dataType: FieldDataType.NUMBER,
    rawValue: pctMatch ? pctMatch[0] : percentage ? `${percentage}%` : null,
    normalizedValue: percentage,
    confidence: percentage ? ocrEvidence(ctx, String(percentage), 0.90).confidence : 0.0,
    confidenceMethod: 'PERCENTAGE_PRINT_MATCH',
    reviewStatus: percentage ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !percentage,
  });

  // 6. Subject-level marks. One subject per line: name followed by obtained
  // marks, optionally over max marks. Header/total/percentage lines are
  // excluded, so a total line cannot be mistaken for a subject.
  const subjectMarks: { subjectName: string; obtainedMarks: number; maxMarks: number }[] = [];
  const subjectConfidences: number[] = [];
  const excluded = /TOTAL|PERCENTAGE|ROLL|CANDIDATE|EXAMINATION|STATEMENT|BOARD|MARKS\s+OBTAINED/i;
  for (const line of text.split(/\r?\n/)) {
    if (excluded.test(line)) continue;
    const m = line.match(/^\s*([A-Za-z][A-Za-z .&\/-]{2,40}?)\s+(\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*$/);
    if (!m || !m[1] || !m[2]) continue;
    const obtained = parseInt(m[2], 10);
    const max = m[3] ? parseInt(m[3], 10) : 100;
    if (obtained > max) continue;
    subjectMarks.push({ subjectName: m[1].trim(), obtainedMarks: obtained, maxMarks: max });
    subjectConfidences.push(ocrEvidence(ctx, m[2], 0.88).confidence);
  }
  if (subjectMarks.length > 0) {
    const avgConf = subjectConfidences.reduce((a, b) => a + b, 0) / subjectConfidences.length;
    fields.push({
      fieldKey: 'subjectMarks',
      label: 'Subject Marks Breakdown',
      dataType: FieldDataType.ARRAY,
      rawValue: JSON.stringify(subjectMarks),
      normalizedValue: subjectMarks as any,
      confidence: Math.round(avgConf * 100) / 100,
      confidenceMethod: 'SUBJECT_ROW_MATCH',
      source: { page: 1 },
      reviewStatus: avgConf >= 0.85 ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
      isBelowThreshold: avgConf < 0.85,
    });
  }

  return fields;
}

export function extractIncomeCertFields(ctx: ExtractorContext): IExtractedFieldSubdocument[] {
  const text = ctx.fullText;
  const fields: IExtractedFieldSubdocument[] = [];

  // 1. Applicant Name
  const nameMatch = text.match(/(?:NAME\s+OF\s+APPLICANT|BENEFICIARY\s+NAME|SHRI\/SMT)\s*[:\-]?\s*([A-Za-z ]{3,35})/i);
  const applicantName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : null;
  fields.push({
    fieldKey: 'applicantName',
    label: 'Applicant Name',
    dataType: FieldDataType.STRING,
    rawValue: applicantName,
    normalizedValue: applicantName ? applicantName.toUpperCase() : null,
    confidence: applicantName ? 0.93 : 0.0,
    confidenceMethod: 'REGEX_HEADER_MATCH',
    source: { page: 1, matchedSnippet: nameMatch ? nameMatch[0] : undefined },
    reviewStatus: applicantName ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !applicantName,
  });

  // 2. Certificate Number
  const certMatch = text.match(/(?:CERTIFICATE\s+NO|PRAMAN\s+PATRA\s+KRAMANK|APPLICATION\s+NO)\s*[:\-]?\s*([A-Z0-9\-\/]{6,25})/i);
  const certificateNumber = certMatch && certMatch[1] ? certMatch[1].trim() : null;
  fields.push({
    fieldKey: 'certificateNumber',
    label: 'Certificate Number',
    dataType: FieldDataType.STRING,
    rawValue: certificateNumber,
    normalizedValue: certificateNumber,
    confidence: certificateNumber ? 0.95 : 0.0,
    confidenceMethod: 'CERTIFICATE_NUMBER_REGEX',
    source: { page: 1, matchedSnippet: certMatch ? certMatch[0] : undefined },
    reviewStatus: certificateNumber ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !certificateNumber,
  });

  // 3. Issuing Authority
  const authMatch = text.match(/(TAHSILDAR|TEHSILDAR|SUB-DIVISIONAL\s+MAGISTRATE|REVENUE\s+OFFICER)/i);
  const authority = authMatch && authMatch[1] ? authMatch[1].trim() : null;
  fields.push({
    fieldKey: 'issuingAuthority',
    label: 'Issuing Officer',
    dataType: FieldDataType.STRING,
    rawValue: authority,
    normalizedValue: authority ? authority.toUpperCase() : null,
    confidence: authority ? 0.90 : 0.0,
    confidenceMethod: 'AUTHORITY_KEYWORD_MATCH',
    reviewStatus: authority ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !authority,
  });

  // 4. Annual Income Rupees
  const incomeMatch = text.match(/(?:RS\.?|RUPEES)\s*([0-9,]{4,10})/i);
  const annualIncome = incomeMatch && incomeMatch[1]
    ? parseInt(incomeMatch[1].replace(/,/g, ''), 10)
    : null;

  fields.push({
    fieldKey: 'annualFamilyIncome',
    label: 'Annual Family Income (INR)',
    dataType: FieldDataType.NUMBER,
    rawValue: incomeMatch ? incomeMatch[0] : null,
    normalizedValue: annualIncome,
    confidence: annualIncome ? 0.92 : 0.0,
    confidenceMethod: 'CURRENCY_AMOUNT_MATCH',
    source: { page: 1, matchedSnippet: incomeMatch ? incomeMatch[0] : undefined },
    reviewStatus: annualIncome ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !annualIncome,
  });

  return fields;
}

export function extractIdCardFields(ctx: ExtractorContext): IExtractedFieldSubdocument[] {
  const text = ctx.fullText;
  const fields: IExtractedFieldSubdocument[] = [];

  // 1. Holder Name
  const nameMatch = text.match(/(?:NAME|HOLDER\s+NAME)\s*[:\-]?\s*([A-Za-z ]{3,35})/i);
  const holderName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : null;
  fields.push({
    fieldKey: 'holderName',
    label: 'Cardholder Name',
    dataType: FieldDataType.STRING,
    rawValue: holderName,
    normalizedValue: holderName ? holderName.toUpperCase() : null,
    confidence: holderName ? 0.92 : 0.0,
    confidenceMethod: 'REGEX_HEADER_MATCH',
    reviewStatus: holderName ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !holderName,
  });

  // 2. ID Number (Aadhaar or PAN)
  const panMatch = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  const aadhaarMatch = text.match(/\b(\d{4}\s+\d{4}\s+\d{4})\b/);
  const idNumber = panMatch ? panMatch[1] : aadhaarMatch ? aadhaarMatch[1] : null;

  fields.push({
    fieldKey: 'idNumber',
    label: 'Identification Number',
    dataType: FieldDataType.STRING,
    rawValue: idNumber,
    normalizedValue: idNumber,
    confidence: idNumber ? 0.98 : 0.0,
    confidenceMethod: panMatch ? 'PAN_FORMAT_CHECK' : 'AADHAAR_FORMAT_CHECK',
    reviewStatus: idNumber ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !idNumber,
  });

  return fields;
}
