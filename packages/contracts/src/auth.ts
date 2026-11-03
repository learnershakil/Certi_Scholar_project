import { z } from 'zod';

export enum UserRole {
  STUDENT = 'STUDENT',
  OFFICER = 'OFFICER',
  ADMIN = 'ADMIN',
  // Legacy aliases mapped internally for backwards compatibility if referenced:
  VERIFICATION_OFFICER = 'OFFICER',
  SCHOLARSHIP_OFFICER = 'OFFICER',
  INSTITUTE_ADMIN = 'ADMIN',
  PLATFORM_SUPER_ADMIN = 'ADMIN',
}

export const UserRoleSchema = z.nativeEnum(UserRole);

export enum OtpDeliveryChannel {
  EMAIL = 'EMAIL',
}

export const OtpDeliveryChannelSchema = z.nativeEnum(OtpDeliveryChannel);

export const RequestOtpSchema = z.object({
  email: z.string().email('Valid email address is required').optional(),
  identifier: z.string().optional(), // fallback alias if passed
  channel: z.string().optional(),
  instituteId: z.string().optional(),
});

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email('Valid email address is required').optional(),
  identifier: z.string().optional(),
  code: z.string().min(4).max(8),
  instituteId: z.string().optional(),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  instituteId?: string;
  isSuperAdmin?: boolean;
}
