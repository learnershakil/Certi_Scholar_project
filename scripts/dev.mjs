#!/usr/bin/env bun
import { spawn, execSync } from 'child_process';
import net from 'net';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to test if a TCP port is open and listening
function checkPort(port, host = '127.0.0.1', timeout = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function waitForPort(port, serviceName, maxAttempts = 30, intervalMs = 1000) {
  process.stdout.write(`[DEV ORCHESTRATOR] Waiting for ${serviceName} on port ${port}...`);
  for (let i = 0; i < maxAttempts; i++) {
    const isUp = await checkPort(port);
    if (isUp) {
      console.log(` Ready!`);
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(` FAILED!`);
  return false;
}

async function ensureDockerServices() {
  console.log('[DEV ORCHESTRATOR] Checking infrastructure dependencies...');

  const mongoUp = await checkPort(27017);
  const redisUp = await checkPort(6379);

  if (!mongoUp || !redisUp) {
    console.log('[DEV ORCHESTRATOR] Starting Docker Compose infrastructure (MongoDB, Redis, ClamAV)...');
    try {
      execSync('docker compose up -d', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (err) {
      console.error('[DEV ORCHESTRATOR ERROR] Failed to run `docker compose up -d`:', err.message);
      console.warn('[DEV ORCHESTRATOR WARNING] Continuing with startup attempt; ensure MongoDB & Redis are reachable.');
    }
  } else {
    console.log('[DEV ORCHESTRATOR] MongoDB (27017) and Redis (6379) are already running.');
  }

  // Ensure mongo & redis are listening
  const mongoReady = await waitForPort(27017, 'MongoDB', 15);
  const redisReady = await waitForPort(6379, 'Redis', 15);

  if (!mongoReady || !redisReady) {
    console.error('[DEV ORCHESTRATOR FATAL] Required database/queue dependencies are unreachable.');
    console.error('Please verify that Docker daemon is running and execute: `docker compose up -d`');
    process.exit(1);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 CertiScholar Local Development Orchestrator   ');
  console.log('======================================================\n');

  await ensureDockerServices();

  const children = [];

  // 1. Check/Start Python OCR microservice if available
  const ocrPortUp = await checkPort(8000);
  if (!ocrPortUp) {
    const venvUvicorn = path.join(ROOT_DIR, 'services/ocr/.venv/bin/uvicorn');
    console.log('[DEV ORCHESTRATOR] Starting FastAPI OCR microservice on port 8000...');
    const ocrProc = spawn(
      venvUvicorn,
      ['app.main:app', '--app-dir', 'services/ocr', '--port', '8000', '--host', '127.0.0.1'],
      { cwd: ROOT_DIR, stdio: 'inherit' }
    );
    children.push(ocrProc);
  } else {
    console.log('[DEV ORCHESTRATOR] OCR service already active on port 8000.');
  }

  // 2. Start Background Worker
  console.log('[DEV ORCHESTRATOR] Starting background OCR BullMQ worker...');
  const workerProc = spawn('bun', ['apps/api/src/worker.ts'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  children.push(workerProc);

  // 3. Start Turbo Dev (Web on 3000, API on 4000)
  console.log('[DEV ORCHESTRATOR] Starting Next.js Web (port 3000) and Node API (port 4000)...');
  const turboProc = spawn('bun', ['x', 'turbo', 'run', 'dev'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  children.push(turboProc);

  // Clean shutdown handler
  const shutdown = (signal) => {
    console.log(`\n[DEV ORCHESTRATOR] Received ${signal}. Stopping dev processes...`);
    for (const child of children) {
      if (child && !child.killed) {
        try {
          child.kill(signal);
        } catch (_) {}
      }
    }
    console.log('[DEV ORCHESTRATOR] All development processes terminated.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[DEV ORCHESTRATOR FATAL]', err);
  process.exit(1);
});

