import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventStaff extends Document {
  _id: mongoose.Types.ObjectId;
  event_id: number;
  user_id: string;
  role: 'checker' | 'coordinator' | 'usher' | 'other';
  added_at: Date;
  added_by: string;
}

const EventStaffSchema = new Schema<IEventStaff>({
  event_id: {
    type: Number,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['checker', 'coordinator', 'usher', 'other'],
    default: 'checker',
  },
  added_at: {
    type: Date,
    default: Date.now,
  },
  added_by: {
    type: String,
    required: true,
  },
});

// Indexes
EventStaffSchema.index({ event_id: 1 });
EventStaffSchema.index({ user_id: 1 });
EventStaffSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

// Virtual for id
EventStaffSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
EventStaffSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = (obj._id as mongoose.Types.ObjectId).toHexString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const EventStaff: Model<IEventStaff> = mongoose.models.EventStaff || mongoose.model<IEventStaff>('EventStaff', EventStaffSchema);

export default EventStaff;
