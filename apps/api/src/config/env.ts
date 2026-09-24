import dotenv from 'dotenv';
import path from 'path';

// Load from project root .env or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

// Strict validation helper for production security
function getRequiredSecret(key: string, devFallback: string): string {
  const val = process.env[key];
  if (!val) {
    if (isProd) {
      throw new Error(`[FATAL SECURITY CONFIG] Environment variable '${key}' is required in production.`);
    }
    return devFallback;
  }
  if (isProd && (val.includes('REPLACE_WITH') || val.includes('dev-') || val.length < 32)) {
    throw new Error(`[FATAL SECURITY CONFIG] '${key}' contains an insecure placeholder or is too short in production.`);
  }
  return val;
}

const httpKey = getRequiredSecret('NODE_API_HTTP_KEY', 'dev-secret-key-certischolar-bff-proxy-secure-token-2026');
const jwtSecret = getRequiredSecret('JWT_SECRET', 'dev-jwt-super-secret-key-change-in-production-min-32-chars');
const otpSecret = getRequiredSecret('OTP_SECRET', 'dev-otp-salt-secret-change-in-production');
const ocrServiceKey = getRequiredSecret('OCR_SERVICE_KEY', 'dev-internal-ocr-service-secret-token-32-chars');

const scannerType = (process.env.SCANNER_TYPE || (isProd ? 'clamav' : 'mock')) as 'clamav' | 'mock';
if (isProd && scannerType === 'mock') {
  throw new Error('[FATAL SECURITY CONFIG] Mock malware scanner is strictly prohibited in production.');
}

const storageDriver = (process.env.STORAGE_DRIVER || 'local') as 'r2' | 'local';
if (isProd && storageDriver === 'local') {
  throw new Error('[FATAL SECURITY CONFIG] Local storage driver is not permitted in production. Cloudflare R2 must be configured.');
}

export const config = {
  env,
  isProd,
  port: parseInt(process.env.PORT || '4000', 10),
  
  // Mandatory x-http-key for Next.js BFF -> Node.js API
  httpKey,
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certischolar',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  
  // Auth
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  otpSecret,
  
  // Storage
  storageDriver,
  localStorageDir: process.env.LOCAL_STORAGE_DIR || path.resolve(__dirname, '../../storage/documents'),
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'certischolar-documents',
    endpoint: process.env.R2_ENDPOINT || '',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || '',
  },
  
  // Intake & Scanning (M1) - Exactly 10MB policy
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10), // 10MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/jpeg,image/png').split(','),
  allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.pdf,.jpg,.jpeg,.png').split(','),
  scannerType,
  clamavHost: process.env.CLAMAV_HOST || '127.0.0.1',
  clamavPort: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  
  // OCR Service (M2)
  ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000',
  ocrServiceKey,
  
  // Classification (M3)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  
  // Verification (M7)
  enableSimulatedProvider: process.env.ENABLE_SIMULATED_PROVIDER !== 'false',
  
  // Web Application
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
