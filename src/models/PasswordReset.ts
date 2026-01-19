import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPasswordReset extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expires_at: {
    type: Date,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
PasswordResetSchema.index({ email: 1 });
PasswordResetSchema.index({ token: 1 });
PasswordResetSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Ensure virtuals are included in JSON
PasswordResetSchema.set('toJSON', {
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const PasswordReset: Model<IPasswordReset> =
  mongoose.models.PasswordReset || mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);

export default PasswordReset;
