import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserRole, AuthSessionPayload } from '@repo/contracts';
import { User, IUser } from '../models/User';
import { mailerService } from './mailerService';
import { config } from '../config/env';
import { SINGLE_ORG_ID_STR } from '../config/constants';

export class AuthService {
  /**
   * Idempotently seeds the 3 standard organization accounts:
   * - admin@certischolar.edu (ADMIN)
   * - officer@certischolar.edu (OFFICER)
   * - student@certischolar.edu (STUDENT)
   */
  async ensureSeededUsers(): Promise<void> {
    const seedDefinitions = [
      {
        email: 'admin@certischolar.edu',
        name: 'Organization Admin',
        role: UserRole.ADMIN,
        isSuperAdmin: true,
      },
      {
        email: 'officer@certischolar.edu',
        name: 'Verification & Scholarship Officer',
        role: UserRole.OFFICER,
        isSuperAdmin: false,
      },
      {
        email: 'student@certischolar.edu',
        name: 'Rahul Sharma',
        role: UserRole.STUDENT,
        isSuperAdmin: false,
      },
      // Backward-compatible demo accounts
      {
        email: 'student.demo@inst-a.edu',
        name: 'Student Demo User',
        role: UserRole.STUDENT,
        isSuperAdmin: false,
      },
      {
        email: 'officer.demo@inst-a.edu',
        name: 'Verification Officer Demo',
        role: UserRole.OFFICER,
        isSuperAdmin: false,
      },
      {
        email: 'admin.demo@inst-a.edu',
        name: 'Institute Admin Demo',
        role: UserRole.ADMIN,
        isSuperAdmin: true,
      },
      {
        email: 'scholarship.demo@inst-a.edu',
        name: 'Scholarship Officer Demo',
        role: UserRole.OFFICER,
        isSuperAdmin: false,
      },
    ];

    for (const def of seedDefinitions) {
      await User.findOneAndUpdate(
        { email: def.email.toLowerCase() },
        {
          $setOnInsert: {
            email: def.email.toLowerCase(),
            name: def.name,
            role: def.role,
            isSuperAdmin: def.isSuperAdmin,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Generates a cryptographically secure 6-digit numeric OTP [100000, 999999],
   * persists its HMAC-SHA256 hash, and dispatches it via local Nodemailer SMTP.
   */
  async requestOtp(emailInput: string): Promise<{ message: string; cooldownSeconds: number }> {
    await this.ensureSeededUsers();

    const normalizedEmail = emailInput.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Valid email address is required for authentication.');
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        role: UserRole.STUDENT,
        isActive: true,
      });
    }

    // Cooldown check (prevent spamming, disabled in tests)
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest && user.otpCooldownUntil && user.otpCooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((user.otpCooldownUntil.getTime() - Date.now()) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    }

    // Generate cryptographically secure 6-digit numeric OTP [100000, 999999]
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHmac('sha256', config.otpSecret).update(rawOtp).digest('hex');

    user.otpHash = hash;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    user.otpAttempts = 0;
    user.otpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
    await user.save();

    // Dispatch via local Nodemailer service
    await mailerService.sendOtpEmail(normalizedEmail, rawOtp, user.name);

    if (config.env !== 'production') {
      console.log(`[AUTH DEV] OTP for ${normalizedEmail}: ${rawOtp} (Demo code: 123456)`);
    }

    return {
      message: 'OTP verification code dispatched to your email address.',
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies OTP using constant-time hash comparison and issues role-scoped JWT.
   */
  async verifyOtp(
    emailInput: string,
    code: string
  ): Promise<{ token: string; user: AuthSessionPayload }> {
    await this.ensureSeededUsers();

    const normalizedEmail = emailInput.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new Error('No account found for this email address.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact your organization administrator.');
    }

    // Safe constant-time hash verification
    const isDev = config.env !== 'production';
    const isDevBypass = isDev && code === '123456';

    if (!isDevBypass) {
      if (!user.otpHash || !user.otpExpiresAt) {
        throw new Error('No active OTP request found. Please request an OTP first.');
      }

      // Check expiry
      if (user.otpExpiresAt < new Date()) {
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check max attempts
      if (user.otpAttempts && user.otpAttempts >= 5) {
        await User.updateOne({ _id: user._id }, { $unset: { otpHash: 1, otpExpiresAt: 1 } });
        throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
      }

      const computedHash = crypto.createHmac('sha256', config.otpSecret).update(code.trim()).digest('hex');
      const computedBuf = Buffer.from(computedHash);
      const storedBuf = Buffer.from(user.otpHash);

      if (computedBuf.length !== storedBuf.length || !crypto.timingSafeEqual(computedBuf, storedBuf)) {
        await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
        throw new Error('Invalid OTP code. Please check your email and try again.');
      }
    }

    // Successful verification - clear OTP credentials
    await User.updateOne(
      { _id: user._id },
      { $unset: { otpHash: 1, otpExpiresAt: 1 }, $set: { otpAttempts: 0 } }
    );

    const role = (user.role as UserRole) || UserRole.STUDENT;

    const userName = user.name || (user.email ? user.email.split('@')[0] : 'User') || 'CertiScholar User';

    const sessionPayload: AuthSessionPayload = {
      userId: user._id.toString(),
      email: user.email || '',
      name: userName,
      role,
      roles: [role],
      instituteId: SINGLE_ORG_ID_STR,
      isSuperAdmin: role === UserRole.ADMIN,
    };

    const token = jwt.sign(sessionPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    return {
      token,
      user: sessionPayload,
    };
  }

  /**
   * Admin User Management: List all organization users
   */
  async listUsers(): Promise<IUser[]> {
    return User.find().sort({ createdAt: -1 });
  }

  /**
   * Admin User Management: Create or update organization user
   */
  async createOrUpdateUser(params: {
    email: string;
    name?: string;
    role: UserRole;
    isActive?: boolean;
  }): Promise<IUser> {
    const normalizedEmail = params.email.toLowerCase().trim();
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          name: params.name || normalizedEmail.split('@')[0],
          role: params.role,
          isActive: params.isActive !== undefined ? params.isActive : true,
          isSuperAdmin: params.role === UserRole.ADMIN,
        },
      },
      { upsert: true, new: true }
    );
    return user;
  }
}

export const authService = new AuthService();
