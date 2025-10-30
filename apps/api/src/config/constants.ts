/**
 * Centralized configuration and environment variables
 * All environment variables should be accessed through this file
 */
import dotenv from "dotenv";

dotenv.config();
// Server Configuration
export const PORT = process.env.PORT || 5001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Database Configuration (REQUIRED - No local fallbacks)
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const REDIS_URL: string = process.env.REDIS_URL || '';

// JWT Configuration
export const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret';
export const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';
export const GOOGLE_REGISTER_CALLBACK_URL = process.env.GOOGLE_REGISTER_CALLBACK_URL || '/api/auth/google/register/callback';

// Cloudflare R2 Configuration
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// FFmpeg Configuration
export const FFMPEG_PATH = process.env.FFMPEG_PATH;
export const FFPROBE_PATH = process.env.FFPROBE_PATH;

/**
* Validate critical configuration at startup
*/
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Database Configuration validation
  if (!MONGODB_URI) {
    errors.push('MONGODB_URI is required - please configure remote MongoDB connection');
  }
  if (!REDIS_URL) {
    errors.push('REDIS_URL is required - please configure remote Redis connection');
  }

  // R2 Configuration validation
  if (!R2_ACCOUNT_ID) {
    errors.push('R2_ACCOUNT_ID is required');
  }
  if (!R2_ACCESS_KEY_ID) {
    errors.push('R2_ACCESS_KEY_ID is required');
  }
  if (!R2_SECRET_ACCESS_KEY) {
    errors.push('R2_SECRET_ACCESS_KEY is required');
  }
  if (!R2_BUCKET_NAME) {
    errors.push('R2_BUCKET_NAME is required');
  }
  if (!R2_PUBLIC_URL) {
    errors.push('R2_PUBLIC_URL is required');
  }

  // JWT Configuration validation
  if (JWT_SECRET === 'fallback-secret' && NODE_ENV === 'production') {
    errors.push('JWT_SECRET must be set in production');
  }
  if (JWT_REFRESH_SECRET === 'fallback-refresh-secret' && NODE_ENV === 'production') {
    errors.push('JWT_REFRESH_SECRET must be set in production');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

