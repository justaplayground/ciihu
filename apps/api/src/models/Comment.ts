import mongoose, { Document, Schema } from 'mongoose';
import { Comment } from '@repo/shared-types';

export interface CommentDocument extends Omit<Comment, '_id' | 'userId' | 'user' | 'replies'>, Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  replies: mongoose.Types.ObjectId[];
}

const commentSchema = new Schema<CommentDocument>({
  videoId: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
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

// Indexes for efficient queries
commentSchema.index({ videoId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentId: 1 });

export const CommentModel = mongoose.model<CommentDocument>('Comment', commentSchema);
