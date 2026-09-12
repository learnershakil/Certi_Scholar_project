import { Router, Request, Response } from 'express';
import { RequestOtpSchema, VerifyOtpSchema } from '@repo/contracts';
import { authService } from '../services/authService';
import { authenticateUser } from '../middleware/auth';

export const authRouter: Router = Router();

authRouter.post('/otp/request', async (req: Request, res: Response) => {
  try {
    const parsed = RequestOtpSchema.parse(req.body);
    const result = await authService.requestOtp(parsed.identifier, parsed.channel, parsed.instituteId);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to request OTP';
    res.status(400).json({ success: false, error: { message } });
  }
});

authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const parsed = VerifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(parsed.identifier, parsed.code, parsed.instituteId);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid OTP';
    res.status(400).json({ success: false, error: { message } });
  }
});

authRouter.get('/me', authenticateUser, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});
