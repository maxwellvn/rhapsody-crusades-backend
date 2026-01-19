import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  type: 'system' | 'event' | 'registration' | 'testimony' | 'ticket';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_by: string[];
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['system', 'event', 'registration', 'testimony', 'ticket'],
      default: 'system',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    read_by: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  }
);

// Indexes
NotificationSchema.index({ user_id: 1 });
NotificationSchema.index({ created_at: -1 });

// Virtual for id
NotificationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = (obj._id as mongoose.Types.ObjectId).toHexString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
