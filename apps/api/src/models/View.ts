import mongoose, { Document, Schema } from 'mongoose';
import { View } from '@repo/shared-types';

export interface ViewDocument extends Omit<View, '_id' | 'userId'>, Document {
  _id: string;
  userId?: mongoose.Types.ObjectId;
}

const viewSchema = new Schema<ViewDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for anonymous views
  },
  videoId: {
    type: String,
    required: true,
  },
  watchTime: {
    type: Number,
    required: true,
    min: 0,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes for efficient queries
viewSchema.index({ videoId: 1, createdAt: -1 });
viewSchema.index({ userId: 1, lastWatchedAt: -1 });
viewSchema.index({ userId: 1, videoId: 1 });
viewSchema.index({ createdAt: 1 }); // For cleanup of old anonymous views

export const ViewModel = mongoose.model<ViewDocument>('View', viewSchema);
