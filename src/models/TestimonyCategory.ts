import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITestimonyCategory extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const TestimonyCategorySchema = new Schema<ITestimonyCategory>(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
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
TestimonyCategorySchema.index({ id: 1 });
TestimonyCategorySchema.index({ slug: 1 });
TestimonyCategorySchema.index({ order: 1 });

// Ensure virtuals are included in JSON
TestimonyCategorySchema.set('toJSON', {
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const TestimonyCategory: Model<ITestimonyCategory> =
  mongoose.models.TestimonyCategory || mongoose.model<ITestimonyCategory>('TestimonyCategory', TestimonyCategorySchema);

export default TestimonyCategory;
