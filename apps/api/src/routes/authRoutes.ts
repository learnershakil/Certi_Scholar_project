import { Router, Request, Response } from 'express';
import { UserRole } from '@repo/contracts';
import { authService } from '../services/authService';
import { authenticateUser, requireRole } from '../middleware/auth';

export const authRouter: Router = Router();

authRouter.post('/otp/request', async (req: Request, res: Response) => {
  try {
    const emailInput = req.body.email || req.body.identifier;
    if (!emailInput) {
      res.status(400).json({ success: false, error: { message: 'Email address is required.' } });
      return;
    }
    const result = await authService.requestOtp(emailInput);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to request OTP';
    res.status(400).json({ success: false, error: { message } });
  }
});

authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const emailInput = req.body.email || req.body.identifier;
    const code = req.body.code || req.body.otpCode;
    if (!emailInput || !code) {
      res.status(400).json({ success: false, error: { message: 'Email and 6-digit OTP code are required.' } });
      return;
    }
    const result = await authService.verifyOtp(emailInput, code);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid OTP';
    res.status(400).json({ success: false, error: { message } });
  }
});

authRouter.get('/me', authenticateUser, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

// Admin User Management Routes
authRouter.get('/users', authenticateUser, requireRole(UserRole.ADMIN), async (_req: Request, res: Response) => {
  try {
    const users = await authService.listUsers();
    res.json({ success: true, data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list organization users';
    res.status(500).json({ success: false, error: { message } });
  }
});

authRouter.post('/users', authenticateUser, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { email, name, role, isActive } = req.body;
    if (!email || !role) {
      res.status(400).json({ success: false, error: { message: 'Email and role are required.' } });
      return;
    }
    const user = await authService.createOrUpdateUser({ email, name, role, isActive });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create or update user';
    res.status(400).json({ success: false, error: { message } });
  }
});
