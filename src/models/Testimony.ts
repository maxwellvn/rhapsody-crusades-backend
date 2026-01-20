import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITestimony extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  title: string;
  text: string;
  event_id?: number;
  category_id?: number;
  image?: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: string[];
  created_at: Date;
  updated_at: Date;
}

const TestimonySchema = new Schema<ITestimony>(
  {
    user_id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
    },
    event_id: {
      type: Number,
    },
    category_id: {
      type: Number,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    likes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Indexes
TestimonySchema.index({ user_id: 1 });
TestimonySchema.index({ event_id: 1 });
TestimonySchema.index({ category_id: 1 });
TestimonySchema.index({ status: 1 });
TestimonySchema.index({ created_at: -1 });

// Virtual for id
TestimonySchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Virtual for content (alias for text to match frontend)
TestimonySchema.virtual('content').get(function () {
  return this.text;
});

// Ensure virtuals are included in JSON
TestimonySchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = (obj._id as mongoose.Types.ObjectId).toHexString();
    // Map text to content for frontend compatibility
    obj.content = obj.text;
    delete obj.text;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const Testimony: Model<ITestimony> = mongoose.models.Testimony || mongoose.model<ITestimony>('Testimony', TestimonySchema);

export default Testimony;
