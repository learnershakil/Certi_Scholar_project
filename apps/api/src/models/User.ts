import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  name?: string;
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
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    name: { type: String, trim: true },
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
