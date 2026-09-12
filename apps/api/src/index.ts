import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config/env';

async function bootstrap() {
  try {
    console.log(`[BOOT] Connecting to MongoDB: ${config.mongoUri.replace(/\/\/.*@/, '//***@')}...`);
    await mongoose.connect(config.mongoUri);
    console.log('[BOOT] MongoDB connected successfully.');

    app.listen(config.port, () => {
      console.log(`[BOOT] CertiScholar Node API running on http://localhost:${config.port}`);
      console.log(`[BOOT] Environment: ${config.env} | Storage Driver: ${config.storageDriver}`);
    });
  } catch (err) {
    console.error('[BOOT FATAL] Failed to start Node API:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

