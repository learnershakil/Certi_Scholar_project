import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserRole, OtpDeliveryChannel, AuthSessionPayload } from '@repo/contracts';
import { User, IUser } from '../models/User';
import { Institute } from '../models/Institute';
import { InstituteMembership, IInstituteMembership } from '../models/InstituteMembership';
import { config } from '../config/env';

export class AuthService {
  /**
   * Generates a cryptographically secure 6-digit OTP using crypto.randomInt.
   */
  async requestOtp(
    identifier: string,
    channel: OtpDeliveryChannel,
    _requestedInstituteId?: string
  ): Promise<{ message: string; cooldownSeconds: number }> {
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    let user = await User.findOne(query);
    if (!user) {
      user = new User({
        ...(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }),
        isActive: true,
      });
    }

    // Cooldown check (prevent spamming)
    if (user.otpCooldownUntil && user.otpCooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((user.otpCooldownUntil.getTime() - Date.now()) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    }

    // Cryptographically secure 6-digit numeric OTP [100000, 999999]
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHmac('sha256', config.otpSecret).update(rawOtp).digest('hex');

    user.otpHash = hash;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    user.otpAttempts = 0;
    user.otpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
    await user.save();

    // Isolated test sink logging - NEVER in production
    if (config.env === 'test') {
      console.log(`[MOCK/TEST-SINK] OTP for ${identifier} via ${channel}: ${rawOtp}`);
    }

    return {
      message: `OTP dispatched to your ${channel.toLowerCase()} address.`,
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies OTP using constant-time hash comparison and atomic attempt counters.
   */
  async verifyOtp(
    identifier: string,
    code: string,
    requestedInstituteId?: string
  ): Promise<{ token: string; user: AuthSessionPayload }> {
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const user = await User.findOne(query);
    if (!user || !user.otpHash || !user.otpExpiresAt) {
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

    // Safe constant-time hash verification
    const computedHash = crypto.createHmac('sha256', config.otpSecret).update(code).digest('hex');
    const computedBuf = Buffer.from(computedHash);
    const storedBuf = Buffer.from(user.otpHash);

    if (computedBuf.length !== storedBuf.length || !crypto.timingSafeEqual(computedBuf, storedBuf)) {
      // Atomic increment on failed attempt
      await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
      throw new Error('Invalid OTP code. Please try again.');
    }

    // Successful verification - clear OTP credentials
    await User.updateOne(
      { _id: user._id },
      { $unset: { otpHash: 1, otpExpiresAt: 1 }, $set: { otpAttempts: 0 } }
    );

    // Look up verified memberships
    let memberships = await InstituteMembership.find({ userId: user._id, isActive: true });

    // Select active institute
    let activeMembership = memberships[0];
    if (requestedInstituteId) {
      const found = memberships.find(
        (m: IInstituteMembership) => m.instituteId.toString() === requestedInstituteId
      );
      if (found) activeMembership = found;
    }

    const roles = user.isSuperAdmin
      ? [UserRole.PLATFORM_SUPER_ADMIN]
      : activeMembership
      ? activeMembership.roles
      : [UserRole.STUDENT];

    const sessionPayload: AuthSessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.name || (user.email ? user.email.split('@')[0] : 'CertiScholar User'),
      roles,
      instituteId: activeMembership ? activeMembership.instituteId.toString() : undefined,
      isSuperAdmin: user.isSuperAdmin,
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
   * Helper to seed an initial demo user or institute admin for local testing.
   */
  async createSeedUser(params: {
    email: string;
    name: string;
    roles: UserRole[];
    instituteCode?: string;
    isSuperAdmin?: boolean;
  }) {
    let institute;
    if (params.instituteCode) {
      institute = await Institute.findOne({ code: params.instituteCode });
      if (!institute) {
        institute = await Institute.create({
          code: params.instituteCode,
          name: `${params.instituteCode} Demo Institute of Technology`,
        });
      }
    }

    let user = await User.findOne({ email: params.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: params.email.toLowerCase(),
        name: params.name,
        isSuperAdmin: !!params.isSuperAdmin,
      });
    }

    if (institute) {
      await InstituteMembership.findOneAndUpdate(
        { instituteId: institute._id, userId: user._id },
        { roles: params.roles, isActive: true },
        { upsert: true, new: true }
      );
    }

    return { user, institute };
  }
}

export const authService = new AuthService();
