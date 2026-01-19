import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  event_id: number;
  qr_code: string;
  registration_date: string;
  status: 'active' | 'used' | 'cancelled';
  checked_in_at?: Date;
  checked_in_by?: string;
  created_at: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    user_id: {
      type: String,
      required: true,
    },
    event_id: {
      type: Number,
      required: true,
    },
    qr_code: {
      type: String,
      required: true,
      unique: true,
    },
    registration_date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'cancelled'],
      default: 'active',
    },
    checked_in_at: {
      type: Date,
    },
    checked_in_by: {
      type: String,
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
TicketSchema.index({ user_id: 1 });
TicketSchema.index({ event_id: 1 });
TicketSchema.index({ qr_code: 1 });
TicketSchema.index({ user_id: 1, event_id: 1 });

// Virtual for id
TicketSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are included in JSON
TicketSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    obj.id = (obj._id as mongoose.Types.ObjectId).toHexString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

const Ticket: Model<ITicket> = mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
