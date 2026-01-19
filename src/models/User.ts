import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  country: string;
  city?: string;
  zone?: string;
  church?: string;
  group?: string;
  kingschat_username?: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    zone: {
      type: String,
      trim: true,
    },
    church: {
      type: String,
      trim: true,
    },
    group: {
      type: String,
      trim: true,
    },
    kingschat_username: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Index for faster lookups
UserSchema.index({ email: 1 });
UserSchema.index({ kingschat_username: 1 });

// Virtual for id (returns string)
UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = (obj._id as mongoose.Types.ObjectId).toHexString();
    delete obj._id;
    delete obj.__v;
    delete obj.password;
    return obj;
  },
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
