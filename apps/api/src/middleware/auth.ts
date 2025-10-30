import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { UserDocument } from '../models';
import { ApiResponse } from '@repo/shared-types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
}

// JWT Authentication middleware
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: UserDocument | false) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
      } as ApiResponse);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized access',
      } as ApiResponse);
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Optional JWT Authentication (allows both authenticated and anonymous access)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return next(); // Continue without authentication
  }
  
  passport.authenticate('jwt', { session: false }, (err: any, user: UserDocument | false) => {
    if (err || !user) {
      return next(); // Continue without authentication on error
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based authorization middleware
export const requireRole = (roles: ('admin' | 'user')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ApiResponse);
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      } as ApiResponse);
    }
    
    next();
  };
};

// Creator authorization (user must be a creator to access)
export const requireCreator = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    } as ApiResponse);
  }
  
  if (!req.user.isCreator && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Creator access required',
    } as ApiResponse);
  }
  
  next();
};

// Resource ownership middleware (user can only access their own resources)
export const requireOwnership = (resourceUserIdPath: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ApiResponse);
    }
    
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Extract resource user ID from request (params, body, etc.)
    const resourceUserId = resourceUserIdPath.split('.').reduce((obj, key) => obj?.[key], req as any);
    
    if (!resourceUserId || resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions',
      } as ApiResponse);
    }
    
    next();
  };
};
