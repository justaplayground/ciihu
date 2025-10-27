// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  role: 'admin' | 'user';
  isCreator: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  subscriberCount: number;
  videoCount: number;
  isSubscribed?: boolean;
}

// Video Types
export interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string; // HLS master playlist URL
  originalUrl: string; // Original uploaded file URL
  duration: number; // in seconds
  creator: User | string;
  tags: string[];
  views: number;
  likes: number;
  dislikes: number;
  status: 'analyzing' | 'transcoding' | 'uploading' | 'processing' | 'ready' | 'error';
  visibility: 'public' | 'unlisted' | 'private';
  processingProgress?: number; // 0-100
  processingMessage?: string; // Current processing stage message
  resolutions: VideoResolution[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoResolution {
  resolution: string; // e.g., '720p', '1080p'
  bitrate: number;
  url: string; // HLS playlist URL for this resolution
  fileSize: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
  codec: string;
  fileSize: number;
}

// Comment Types
export interface Comment {
  _id: string;
  videoId: string;
  userId: string;
  user: UserProfile;
  content: string;
  likes: number;
  replies: Comment[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Like Types
export interface Like {
  _id: string;
  userId: string;
  videoId?: string;
  commentId?: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

// View Types
export interface View {
  _id: string;
  userId?: string; // undefined for anonymous views
  videoId: string;
  watchTime: number; // seconds watched
  completed: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
}

// Subscription Types
export interface Subscription {
  _id: string;
  subscriberId: string;
  creatorId: string;
  createdAt: Date;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Upload Types
export interface UploadProgress {
  videoId: string;
  stage: 'uploading' | 'processing' | 'transcoding' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface VideoUploadData {
  title: string;
  description?: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  thumbnail?: File;
}

// Search Types
export interface SearchFilters {
  query?: string;
  tags?: string[];
  creatorId?: string;
  duration?: 'short' | 'medium' | 'long'; // <4min, 4-20min, >20min
  sortBy?: 'relevance' | 'date' | 'views' | 'likes';
  page?: number;
  limit?: number;
}

// Analytics Types
export interface VideoAnalytics {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  watchTime: number; // total watch time in seconds
  averageWatchTime: number;
  retentionRate: number; // percentage
  viewsOverTime: { date: string; views: number }[];
  demographicData?: {
    ageGroups: { range: string; percentage: number }[];
    countries: { name: string; percentage: number }[];
  };
}

export interface ChannelAnalytics {
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  totalWatchTime: number;
  averageViewDuration: number;
  subscribersOverTime: { date: string; count: number }[];
  topVideos: VideoAnalytics[];
}

// Cloudflare R2 Types
export interface R2UploadResponse {
  success: boolean;
  uploadUrl?: string;
  key: string;
  url: string;
}

// FFmpeg Processing Types
export interface TranscodeJob {
  videoId: string;
  inputUrl: string;
  outputPath: string;
  resolutions: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
