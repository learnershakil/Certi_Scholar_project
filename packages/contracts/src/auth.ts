import { z } from 'zod';

export enum UserRole {
  STUDENT = 'STUDENT',
  OFFICER = 'OFFICER',
  ADMIN = 'ADMIN',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  SCHOLARSHIP_OFFICER = 'SCHOLARSHIP_OFFICER',
  INSTITUTE_ADMIN = 'INSTITUTE_ADMIN',
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
}

// Legacy OFFICER records predate the split and were verification work, so
// they expand to VERIFICATION_OFFICER only, never to SCHOLARSHIP_OFFICER.
// INSTITUTE_ADMIN / PLATFORM_SUPER_ADMIN expand to ADMIN for the admin
// bypass, matching the old alias behaviour without merging the values.
export function expandRoles(roles: UserRole[]): UserRole[] {
  const out = new Set<UserRole>(roles);
  if (out.has(UserRole.OFFICER)) out.add(UserRole.VERIFICATION_OFFICER);
  if (out.has(UserRole.INSTITUTE_ADMIN) || out.has(UserRole.PLATFORM_SUPER_ADMIN)) {
    out.add(UserRole.ADMIN);
  }
  return [...out];
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
