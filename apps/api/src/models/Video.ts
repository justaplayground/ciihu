import mongoose, { Document, Schema } from 'mongoose';
import { Video, VideoResolution } from '@repo/shared-types';

export interface VideoDocument extends Omit<Video, '_id' | 'creator'>, Document {
  _id: string;
  creator: mongoose.Types.ObjectId;
}

const videoResolutionSchema = new Schema<VideoResolution>({
  resolution: {
    type: String,
    required: true,
  },
  bitrate: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
}, { _id: false });

const videoSchema = new Schema<VideoDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 2000,
    default: null,
  },
  thumbnail: {
    type: String,
    default: null,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 0,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['analyzing', 'transcoding', 'uploading', 'processing', 'ready', 'error'],
    default: 'processing',
  },
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public',
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  processingMessage: {
    type: String,
    default: null,
  },
  resolutions: [videoResolutionSchema],
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
videoSchema.index({ creator: 1, createdAt: -1 });
videoSchema.index({ status: 1, visibility: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1,
  },
});

export const VideoModel = mongoose.model<VideoDocument>('Video', videoSchema);
