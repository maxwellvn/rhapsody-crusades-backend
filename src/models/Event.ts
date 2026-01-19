import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  country?: string;
  city?: string;
  category: string;
  image?: string;
  capacity?: number;
  featured: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      default: 'Crusade',
    },
    image: {
      type: String,
    },
    capacity: {
      type: Number,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: String,
      required: true,
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
EventSchema.index({ id: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ created_by: 1 });
EventSchema.index({ country: 1, city: 1 });

// Ensure virtuals are included in JSON
EventSchema.set('toJSON', {
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
