import { z } from 'zod';

export enum UserRole {
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  INSTITUTE_ADMIN = 'INSTITUTE_ADMIN',
  VERIFICATION_OFFICER = 'VERIFICATION_OFFICER',
  SCHOLARSHIP_OFFICER = 'SCHOLARSHIP_OFFICER',
  STUDENT = 'STUDENT',
}

export const UserRoleSchema = z.nativeEnum(UserRole);

export enum OtpDeliveryChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export const OtpDeliveryChannelSchema = z.nativeEnum(OtpDeliveryChannel);

export const RequestOtpSchema = z.object({
  identifier: z.string().min(3).max(100), // email or phone
  channel: OtpDeliveryChannelSchema,
  instituteId: z.string().optional(),
});

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  identifier: z.string().min(3).max(100),
  code: z.string().min(4).max(8),
  instituteId: z.string().optional(),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export interface AuthSessionPayload {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  roles: UserRole[];
  instituteId?: string;
  isSuperAdmin: boolean;
}

