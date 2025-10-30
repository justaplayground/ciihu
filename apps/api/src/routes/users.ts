import { Router, Request, Response } from 'express';
import { UserModel, SubscriptionModel, VideoModel } from '../models';
import { authenticateJWT, optionalAuth } from '../middleware/auth';
import { validate, paginationValidationSchema } from '../middleware/validation';
import { ApiResponse, PaginatedResponse, UserProfile } from '@repo/shared-types';

const router: Router = Router();

// Get user profile by ID
router.get('/:userId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    // Get subscriber count
    const subscriberCount = await SubscriptionModel.countDocuments({ creatorId: userId });
    
    // Get video count
    const videoCount = await VideoModel.countDocuments({ 
      creator: userId, 
      status: 'ready',
      visibility: 'public' 
    });
    
    // Check if current user is subscribed (if authenticated)
    let isSubscribed = false;
    if (currentUserId) {
      const subscription = await SubscriptionModel.findOne({
        subscriberId: currentUserId,
        creatorId: userId,
      });
      isSubscribed = !!subscription;
    }
    
    const userProfile: UserProfile = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      subscriberCount,
      videoCount,
      isSubscribed,
    };
    
    res.json({
      success: true,
      data: userProfile,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    } as ApiResponse);
  }
});

// Get user's videos
router.get('/:userId/videos', optionalAuth, validate(paginationValidationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?._id;
    const isOwner = currentUserId?.toString() === userId;
    
    // Build query based on ownership
    const query: any = { creator: userId, status: 'ready' };
    
    if (!isOwner) {
      query.visibility = 'public';
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [videos, totalCount] = await Promise.all([
      VideoModel
        .find(query)
        .populate('creator', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      VideoModel.countDocuments(query),
    ]);
    
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    const response: PaginatedResponse<typeof videos[0]> = {
      items: videos,
      totalCount,
      currentPage: Number(page),
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
    };
    
    res.json({
      success: true,
      data: response,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user videos',
    } as ApiResponse);
  }
});

// Subscribe to a creator
router.post('/:userId/subscribe', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const subscriberId = req.user!._id;
    
    if (subscriberId.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot subscribe to yourself',
      } as ApiResponse);
    }
    
    // Check if creator exists
    const creator = await UserModel.findById(userId);
    if (!creator) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
    }
    
    // Check if already subscribed
    const existingSubscription = await SubscriptionModel.findOne({
      subscriberId,
      creatorId: userId,
    });
    
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this creator',
      } as ApiResponse);
    }
    
    // Create subscription
    await SubscriptionModel.create({
      subscriberId,
      creatorId: userId,
    });
    
    res.status(201).json({
      success: true,
      message: 'Successfully subscribed',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
    } as ApiResponse);
  }
});

// Unsubscribe from a creator
router.delete('/:userId/subscribe', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const subscriberId = req.user!._id;
    
    const result = await SubscriptionModel.findOneAndDelete({
      subscriberId,
      creatorId: userId,
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      } as ApiResponse);
    }
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe',
    } as ApiResponse);
  }
});

// Get user's subscriptions
router.get('/:userId/subscriptions', authenticateJWT, validate(paginationValidationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user!._id;
    
    // Only allow users to see their own subscriptions
    if (currentUserId.toString() !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      } as ApiResponse);
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [subscriptions, totalCount] = await Promise.all([
      SubscriptionModel
        .find({ subscriberId: userId })
        .populate('creatorId', 'name avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SubscriptionModel.countDocuments({ subscriberId: userId }),
    ]);
    
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    const response: PaginatedResponse<typeof subscriptions[0]> = {
      items: subscriptions,
      totalCount,
      currentPage: Number(page),
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
    };
    
    res.json({
      success: true,
      data: response,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    } as ApiResponse);
  }
});

// Get user's subscribers
router.get('/:userId/subscribers', optionalAuth, validate(paginationValidationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?._id;
    
    // Only show subscribers to the creator themselves or admins
    if (currentUserId?.toString() !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      } as ApiResponse);
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [subscribers, totalCount] = await Promise.all([
      SubscriptionModel
        .find({ creatorId: userId })
        .populate('subscriberId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SubscriptionModel.countDocuments({ creatorId: userId }),
    ]);
    
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    const response: PaginatedResponse<typeof subscribers[0]> = {
      items: subscribers,
      totalCount,
      currentPage: Number(page),
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
    };
    
    res.json({
      success: true,
      data: response,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscribers',
    } as ApiResponse);
  }
});

export default router;
