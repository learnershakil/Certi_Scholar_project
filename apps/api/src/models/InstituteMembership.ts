import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@repo/contracts';

export interface IInstituteMembership extends Document {
  instituteId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roles: UserRole[];
  assignedCategories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteMembershipSchema = new Schema<IInstituteMembership>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roles: [
      {
        type: String,
        enum: Object.values(UserRole),
        required: true,
      },
    ],
    assignedCategories: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InstituteMembershipSchema.index({ instituteId: 1, userId: 1 }, { unique: true });

export const InstituteMembership: Model<IInstituteMembership> =
  (mongoose.models.InstituteMembership as Model<IInstituteMembership>) ||
  mongoose.model<IInstituteMembership>('InstituteMembership', InstituteMembershipSchema);
