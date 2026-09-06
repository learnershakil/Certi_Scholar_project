import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import { app } from '../src/app';
import { config } from '../src/config/env';

describe('Next.js BFF -> Node.js API x-http-key Security Gate', () => {
  it('rejects API request when x-http-key header is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_HTTP_KEY');
  });

  it('rejects API request when x-http-key header is incorrect', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-http-key', 'tampered-wrong-secret-key');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_HTTP_KEY');
  });

  it('allows health check endpoint without x-http-key', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('certischolar-node-api');
  });

  it('passes service gate with correct x-http-key but still requires user authentication', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-http-key', config.httpKey);
    // Service key matches, but user session is missing -> 401 UNAUTHORIZED
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

