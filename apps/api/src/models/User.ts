import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@repo/contracts';

export interface IUser extends Document {
  email: string;
  name?: string;
  role: UserRole;
  roles?: UserRole[]; // legacy/compat
  isSuperAdmin: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  otpCooldownUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true },
    role: {
      type: String,
      enum: [UserRole.STUDENT, UserRole.OFFICER, UserRole.ADMIN, UserRole.VERIFICATION_OFFICER, UserRole.SCHOLARSHIP_OFFICER, UserRole.INSTITUTE_ADMIN, UserRole.PLATFORM_SUPER_ADMIN],
      default: UserRole.STUDENT,
      index: true,
    },
    isSuperAdmin: { type: Boolean, default: false },
    otpHash: { type: String },
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpCooldownUntil: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
