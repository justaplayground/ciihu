import { Router, Request, Response } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { authenticateJWT } from '../middleware/auth';
import { validate, userValidationSchemas } from '../middleware/validation';
import { ApiResponse, AuthTokens } from '@repo/shared-types';

const router = Router();

// Register new user
router.post('/register', validate(userValidationSchemas.register), async (req: Request, res: Response) => {
  try {
    const { email, password, name, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email',
      } as ApiResponse);
    }
    
    // Create new user
    const user = new UserModel({
      email: email.toLowerCase(),
      password,
      name,
      bio,
    });
    
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user._id, user.email, user.role);
    
    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        tokens,
      },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    } as ApiResponse);
  }
});

// Login user
router.post('/login', validate(userValidationSchemas.login), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Find user and include password for comparison
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse);
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse);
    }
    
    // Generate tokens
    const tokens = generateTokens(user._id, user.email, user.role);
    
    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        tokens,
      },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
    } as ApiResponse);
  }
});

// Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      }
      
      // Generate tokens
      const tokens = generateTokens(req.user._id, req.user.email, req.user.role);
      
      // Redirect to frontend with tokens (in production, use httpOnly cookies)
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      } as ApiResponse);
    }
    
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      } as ApiResponse);
    }
    
    // Check if user still exists
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    // Generate new tokens
    const tokens = generateTokens(user._id, user.email, user.role);
    
    res.json({
      success: true,
      data: { tokens },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    } as ApiResponse);
  }
});

// Get current user profile
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      data: user.toJSON(),
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    } as ApiResponse);
  }
});

// Update user profile
router.put('/profile', authenticateJWT, validate(userValidationSchemas.updateProfile), async (req: Request, res: Response) => {
  try {
    const { name, bio, isCreator } = req.body;
    const userId = req.user!._id;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (isCreator !== undefined) updateData.isCreator = isCreator;
    
    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      data: user.toJSON(),
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    } as ApiResponse);
  }
});

// Change password
router.put('/password', authenticateJWT, validate(userValidationSchemas.changePassword), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!._id;
    
    // Get user with password
    const user = await UserModel.findById(userId).select('+password');
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      } as ApiResponse);
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    } as ApiResponse);
  }
});

// Logout (client-side token deletion, but we can blacklist tokens in Redis if needed)
router.post('/logout', authenticateJWT, (req: Request, res: Response) => {
  // In a production app, you might want to blacklist the token in Redis
  res.json({
    success: true,
    message: 'Logged out successfully',
  } as ApiResponse);
});

export default router;
