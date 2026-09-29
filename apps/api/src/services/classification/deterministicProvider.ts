import { DocumentTypeCategory, ClassificationResponseDto } from '@repo/contracts';

interface CategoryRule {
  category: DocumentTypeCategory;
  candidateProfileKey: string;
  strongKeywords: RegExp[];
  evidenceExtractor: (text: string) => string[];
  minMatches: number;
}

const CLASSIFICATION_RULES: CategoryRule[] = [
  {
    category: DocumentTypeCategory.ACADEMIC_MARKSHEET,
    candidateProfileKey: 'CBSE_XII_MARKSHEET_2024',
    minMatches: 2,
    strongKeywords: [
      /\b(CENTRAL\s+BOARD\s+OF\s+SECONDARY\s+EDUCATION|CBSE|ICSE|STATE\s+BOARD|BOARD\s+OF\s+INTERMEDIATE)\b/i,
      /\b(MARKSHEET|STATEMENT\s+OF\s+MARKS|SENIOR\s+SCHOOL\s+CERTIFICATE|INTERMEDIATE\s+EXAMINATION)\b/i,
      /\b(ROLL\s+NO|MAX\s+MARKS|MARKS\s+OBTAINED|THEORY|PRACTICAL|SUBJECT\s+CODE)\b/i,
      /\b(TOTAL\s+MARKS|PERCENTAGE|GRADE\s+POINT|CGPA|DIVISION)\b/i,
    ],
    evidenceExtractor: (text) => {
      const matches: string[] = [];
      if (/CBSE|CENTRAL BOARD OF SECONDARY EDUCATION/i.test(text)) matches.push('Board identifier detected');
      if (/STATEMENT OF MARKS|MARKSHEET/i.test(text)) matches.push('Academic mark transcript phrase found');
      if (/ROLL\s*NO/i.test(text)) matches.push('Student examination roll number found');
      if (/MARKS\s*OBTAINED|MAX\s*MARKS/i.test(text)) matches.push('Subject marks score grid found');
      return matches;
    },
  },
  {
    category: DocumentTypeCategory.INCOME_CERTIFICATE,
    candidateProfileKey: 'STATE_INCOME_CERT_V1',
    minMatches: 2,
    strongKeywords: [
      /\b(INCOME\s+CERTIFICATE|AAY\s+PRAMAN\s+PATRA|ANNUAL\s+INCOME)\b/i,
      /\b(REVENUE\s+DEPARTMENT|TAHSILDAR|TEHSILDAR|TALUK|COLLECTORATE)\b/i,
      /\b(GOVERNMENT\s+OF|STATE\s+GOVERNMENT|SUB-DIVISIONAL\s+MAGISTRATE)\b/i,
      /\b(RUPEES|RS\.?|LAKHS|PER\s+ANNUM|FAMILY\s+INCOME)\b/i,
    ],
    evidenceExtractor: (text) => {
      const matches: string[] = [];
      if (/INCOME CERTIFICATE|AAY PRAMAN/i.test(text)) matches.push('Income certificate heading found');
      if (/TAHSILDAR|REVENUE DEPARTMENT/i.test(text)) matches.push('Revenue issuance authority detected');
      if (/PER ANNUM|ANNUAL INCOME/i.test(text)) matches.push('Annual financial threshold statement found');
      return matches;
    },
  },
  {
    category: DocumentTypeCategory.AADHAAR_DOCUMENT,
    candidateProfileKey: 'GOV_ID_CARD_V1',
    minMatches: 2,
    strongKeywords: [
      /\b(UNIQUE\s+IDENTIFICATION\s+AUTHORITY\s+OF\s+INDIA|UIDAI)\b/i,
      /\b(GOVERNMENT\s+OF\s+INDIA|BHARAT\s+SARKAR)\b/i,
      /\b(MERA\s+AADHAAR|AADHAAR|HELP@UIDAI\.GOV\.IN)\b/i,
      /\b(\d{4}\s+\d{4}\s+\d{4})\b/,
    ],
    evidenceExtractor: (text) => {
      const matches: string[] = [];
      if (/UIDAI|UNIQUE IDENTIFICATION/i.test(text)) matches.push('UIDAI government authority found');
      if (/AADHAAR/i.test(text)) matches.push('National identity moniker found');
      if (/\d{4}\s+\d{4}\s+\d{4}/.test(text)) matches.push('12-digit masked/formatted UID pattern found');
      return matches;
    },
  },
  {
    category: DocumentTypeCategory.PAN_CARD,
    candidateProfileKey: 'GOV_ID_CARD_V1',
    minMatches: 2,
    strongKeywords: [
      /\b(INCOME\s+TAX\s+DEPARTMENT|GOVT\.\s+OF\s+INDIA)\b/i,
      /\b(PERMANENT\s+ACCOUNT\s+NUMBER|PAN\s+CARD)\b/i,
      /\b([A-Z]{5}[0-9]{4}[A-Z])\b/,
    ],
    evidenceExtractor: (text) => {
      const matches: string[] = [];
      if (/INCOME TAX DEPARTMENT/i.test(text)) matches.push('Income Tax Department header found');
      if (/PERMANENT ACCOUNT NUMBER/i.test(text)) matches.push('PAN header found');
      if (/[A-Z]{5}[0-9]{4}[A-Z]/.test(text)) matches.push('Alphanumeric 10-char PAN structure matched');
      return matches;
    },
  },
  {
    category: DocumentTypeCategory.CASTE_CERTIFICATE,
    candidateProfileKey: 'COMMUNITY_CERT_V1',
    minMatches: 2,
    strongKeywords: [
      /\b(CASTE\s+CERTIFICATE|COMMUNITY\s+CERTIFICATE|JAATI\s+PRAMAN)\b/i,
      /\b(SCHEDULED\s+CASTE|SCHEDULED\s+TRIBE|OTHER\s+BACKWARD\s+CLASS|OBC|SC|ST)\b/i,
    ],
    evidenceExtractor: (text) => {
      const matches: string[] = [];
      if (/CASTE CERTIFICATE|COMMUNITY CERTIFICATE/i.test(text)) matches.push('Caste certificate title found');
      if (/SCHEDULED CASTE|SCHEDULED TRIBE|OBC|SC|ST/i.test(text)) matches.push('Recognized affirmative community category detected');
      return matches;
    },
  },
];

export class DeterministicClassifierProvider {
  classify(sanitizedText: string): ClassificationResponseDto {
    for (const rule of CLASSIFICATION_RULES) {
      let matchCount = 0;
      for (const regex of rule.strongKeywords) {
        if (regex.test(sanitizedText)) {
          matchCount++;
        }
      }

      if (matchCount >= rule.minMatches) {
        const evidence = rule.evidenceExtractor(sanitizedText);
        const confidence = Math.min(0.99, 0.70 + matchCount * 0.08);
        return {
          category: rule.category,
          modelConfidence: Math.round(confidence * 100) / 100,
          candidateProfileKey: rule.candidateProfileKey,
          evidencePhrases: evidence.length > 0 ? evidence : ['Standard category phrase match'],
          explanation: `Document matches ${matchCount} criteria for ${rule.category}`,
        };
      }
    }

    // Default unknown
    return {
      category: DocumentTypeCategory.UNKNOWN,
      modelConfidence: 0.15,
      candidateProfileKey: null,
      evidencePhrases: ['No standard verification patterns recognized'],
      explanation: 'Document structure ambiguous or unsupported; human officer review required.',
    };
  }
}
