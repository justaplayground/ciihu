/**
 * Centralized configuration and environment variables
 * All environment variables should be accessed through this file
 */

// Server Configuration
export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Database Configuration
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-platform';
export const REDIS_URL = process.env.REDIS_URL;

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

// Cloudflare R2 Configuration
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// FFmpeg Configuration
export const FFMPEG_PATH = process.env.FFMPEG_PATH;
export const FFPROBE_PATH = process.env.FFPROBE_PATH;

