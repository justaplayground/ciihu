import jwt from 'jsonwebtoken';
import { JWTPayload, AuthTokens } from '@repo/shared-types';
import { 
  JWT_SECRET, 
  JWT_REFRESH_SECRET, 
  JWT_EXPIRES_IN, 
  JWT_REFRESH_EXPIRES_IN 
} from '../config/constants';

export const generateTokens = (userId: string, email: string, role: 'admin' | 'user'): AuthTokens => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    email,
    role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
