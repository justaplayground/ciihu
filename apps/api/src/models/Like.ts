import mongoose, { Document, Schema } from 'mongoose';
import { Like } from '@repo/shared-types';

export interface LikeDocument extends Omit<Like, '_id' | 'userId'>, Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
}

const likeSchema = new Schema<LikeDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  videoId: {
    type: String,
    default: null,
  },
  commentId: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    enum: ['like', 'dislike'],
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
});

// Compound indexes to ensure unique likes per user per content
likeSchema.index({ userId: 1, videoId: 1 }, { unique: true, sparse: true });
likeSchema.index({ userId: 1, commentId: 1 }, { unique: true, sparse: true });

// Additional indexes for efficient queries
likeSchema.index({ videoId: 1, type: 1 });
likeSchema.index({ commentId: 1, type: 1 });

// Ensure either videoId or commentId is provided, but not both
likeSchema.pre('save', function (next) {
  if ((!this.videoId && !this.commentId) || (this.videoId && this.commentId)) {
    return next(new Error('Either videoId or commentId must be provided, but not both'));
  }
  next();
});

export const LikeModel = mongoose.model<LikeDocument>('Like', likeSchema);
