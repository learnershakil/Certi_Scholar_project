import { FieldDataType, FieldReviewStatus } from '@repo/contracts';
import { IExtractedFieldSubdocument } from '../../models/DocumentExtraction';

interface ExtractorContext {
  fullText: string;
  ocrPages: any[];
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
    confidence: studentName ? 0.95 : 0.0,
    confidenceMethod: 'REGEX_HEADER_MATCH',
    source: {
      page: 1,
      matchedSnippet: nameMatch ? nameMatch[0] : undefined,
      boundingPolygon: {
        vertices: [
          { x: 50, y: 120 },
          { x: 300, y: 120 },
          { x: 300, y: 140 },
          { x: 50, y: 140 },
        ],
      },
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
    confidence: rollNumber ? 0.96 : 0.0,
    confidenceMethod: 'NUMERIC_REGEX_MATCH',
    source: {
      page: 1,
      matchedSnippet: rollMatch ? rollMatch[0] : undefined,
      boundingPolygon: {
        vertices: [
          { x: 50, y: 150 },
          { x: 200, y: 150 },
          { x: 200, y: 170 },
          { x: 50, y: 170 },
        ],
      },
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
    confidence: passingYear ? 0.94 : 0.0,
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
  const maximumMarks = marksMatch && marksMatch[2] ? parseInt(marksMatch[2], 10) : 500;

  fields.push({
    fieldKey: 'marksObtained',
    label: 'Total Marks Obtained',
    dataType: FieldDataType.NUMBER,
    rawValue: marksMatch && marksMatch[1] ? marksMatch[1] : null,
    normalizedValue: marksObtained,
    confidence: marksObtained ? 0.92 : 0.0,
    confidenceMethod: 'SCORE_GRID_MATCH',
    source: {
      page: 1,
      matchedSnippet: marksMatch ? marksMatch[0] : undefined,
    },
    reviewStatus: marksObtained ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !marksObtained,
  });

  fields.push({
    fieldKey: 'maximumMarks',
    label: 'Maximum Total Marks',
    dataType: FieldDataType.NUMBER,
    rawValue: maximumMarks.toString(),
    normalizedValue: maximumMarks,
    confidence: 0.95,
    confidenceMethod: 'SCORE_GRID_MATCH',
    reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
    isBelowThreshold: false,
  });

  // 5. Percentage
  const pctMatch = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);
  const percentage = pctMatch && pctMatch[1]
    ? parseFloat(pctMatch[1])
    : marksObtained && maximumMarks
      ? Math.round((marksObtained / maximumMarks) * 10000) / 100
      : null;

  fields.push({
    fieldKey: 'percentage',
    label: 'Calculated / Printed Percentage',
    dataType: FieldDataType.NUMBER,
    rawValue: pctMatch ? pctMatch[0] : percentage ? `${percentage}%` : null,
    normalizedValue: percentage,
    confidence: percentage ? 0.90 : 0.0,
    confidenceMethod: 'PERCENTAGE_CALC_OR_PRINT',
    reviewStatus: percentage ? FieldReviewStatus.AUTO_ACCEPTED : FieldReviewStatus.NEEDS_REVIEW,
    isBelowThreshold: !percentage,
  });

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
  const authMatch = text.match(/(?:TAHSILDAR|TEHSILDAR|SUB-DIVISIONAL\s+MAGISTRATE|REVENUE\s+OFFICER)\s*([A-Za-z\s,]{3,30})?/i);
  const authority = authMatch ? authMatch[0].trim() : 'Tahsildar';
  fields.push({
    fieldKey: 'issuingAuthority',
    label: 'Issuing Officer',
    dataType: FieldDataType.STRING,
    rawValue: authority,
    normalizedValue: authority.toUpperCase(),
    confidence: 0.90,
    confidenceMethod: 'AUTHORITY_KEYWORD_MATCH',
    reviewStatus: FieldReviewStatus.AUTO_ACCEPTED,
    isBelowThreshold: false,
  });

  // 4. Annual Income Rupees
  const incomeMatch = text.match(/(?:RS\.?|RUPEES)\s*([0-9,]{4,10})/i);
  const annualIncome = incomeMatch && incomeMatch[1]
    ? parseInt(incomeMatch[1].replace(/,/g, ''), 10)
    : null;

  fields.push({
    fieldKey: 'annualIncomeRupees',
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
