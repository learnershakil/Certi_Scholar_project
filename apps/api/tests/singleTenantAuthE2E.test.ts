import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { mailerService } from '../src/services/mailerService';
import { UserRole } from '@repo/contracts';

describe('Single-Tenant Architecture & Local Nodemailer OTP E2E', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
  });

  afterAll(async () => {
    // Keep connection for other suites
  });

  it('Step 1: Dispatches 6-digit OTP via Nodemailer for Student', async () => {
    const email = 'student@certischolar.edu';
    const reqRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .set('x-http-key', config.httpKey)
      .send({ identifier: email });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);

    // Retrieve recorded dispatched OTP
    const dispatchedOtp = mailerService.getLastDispatchedOtp(email);
    expect(dispatchedOtp).toBeDefined();
    expect(dispatchedOtp).toMatch(/^\d{6}$/);

    // Verify OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .set('x-http-key', config.httpKey)
      .send({ identifier: email, otpCode: dispatchedOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.token).toBeDefined();
    expect(verifyRes.body.data.user.role).toBe(UserRole.STUDENT);
  });

  it('Step 2: Role-based isolation denies Student access to Officer review queue (403)', async () => {
    const email = 'student@certischolar.edu';
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .set('x-http-key', config.httpKey)
      .send({ identifier: email, otpCode: '123456' });

    const token = verifyRes.body.data.token;

    const queueRes = await request(app)
      .get('/api/v1/review/queue')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${token}`);

    expect(queueRes.status).toBe(403);
    expect(queueRes.body.success).toBe(false);
  });

  it('Step 3: Verification Officer logs in and successfully accesses review queue (200)', async () => {
    const email = 'officer@certischolar.edu';
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .set('x-http-key', config.httpKey)
      .send({ identifier: email, otpCode: '123456' });

    const token = verifyRes.body.data.token;
    expect(verifyRes.body.data.user.role).toBe(UserRole.OFFICER);

    const queueRes = await request(app)
      .get('/api/v1/review/queue')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${token}`);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.success).toBe(true);
  });

  it('Step 4: Admin logs in and can manage organization users via /api/v1/auth/users', async () => {
    const email = 'admin@certischolar.edu';
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .set('x-http-key', config.httpKey)
      .send({ identifier: email, otpCode: '123456' });

    const token = verifyRes.body.data.token;
    expect(verifyRes.body.data.user.role).toBe(UserRole.ADMIN);

    // List users
    const listRes = await request(app)
      .get('/api/v1/auth/users')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    // Create / invite new officer
    const newOfficerRes = await request(app)
      .post('/api/v1/auth/users')
      .set('x-http-key', config.httpKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'evaluator.new@certischolar.edu',
        name: 'New Evaluator',
        role: UserRole.OFFICER,
      });

    expect(newOfficerRes.status).toBe(200);
    expect(newOfficerRes.body.success).toBe(true);
    expect(newOfficerRes.body.data.email).toBe('evaluator.new@certischolar.edu');
    expect(newOfficerRes.body.data.role).toBe(UserRole.OFFICER);
  });
});
