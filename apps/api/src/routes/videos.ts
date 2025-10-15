import { Router, Request, Response } from 'express';
import { VideoModel, UserModel, ViewModel, LikeModel, CommentModel } from '../models';
import { authenticateJWT, optionalAuth, requireCreator, requireOwnership } from '../middleware/auth';
import { validate, videoValidationSchemas, commentValidationSchemas, likeValidationSchema, paginationValidationSchema } from '../middleware/validation';
import { ApiResponse, PaginatedResponse, SearchFilters } from '@repo/shared-types';

const router = Router();

// Get video by ID
router.get('/:videoId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;
    
    const video = await VideoModel.findById(videoId).populate('creator', 'name avatar bio');
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      } as ApiResponse);
    }
    
    // Check if user can view this video
    if (video.visibility === 'private' && (!userId || (userId.toString() !== video.creator._id.toString() && req.user?.role !== 'admin'))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      } as ApiResponse);
    }
    
    // Record view (only for ready videos)
    if (video.status === 'ready') {
      // Update view count
      await VideoModel.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
      
      // Record individual view
      if (userId) {
        await ViewModel.findOneAndUpdate(
          { userId, videoId },
          { 
            lastWatchedAt: new Date(),
            $inc: { watchTime: 1 } // This would be updated by the player
          },
          { upsert: true, new: true }
        );
      } else {
        // Record anonymous view
        await ViewModel.create({ videoId, watchTime: 1 });
      }
    }
    
    res.json({
      success: true,
      data: video,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video',
    } as ApiResponse);
  }
});

// Update video
router.put('/:videoId', authenticateJWT, validate(videoValidationSchemas.update), async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { title, description, tags, visibility } = req.body;
    const userId = req.user!._id;
    
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      } as ApiResponse);
    }
    
    // Check ownership
    if (video.creator.toString() !== userId.toString() && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      } as ApiResponse);
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (visibility !== undefined) updateData.visibility = visibility;
    
    const updatedVideo = await VideoModel.findByIdAndUpdate(
      videoId,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'name avatar');
    
    res.json({
      success: true,
      data: updatedVideo,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update video',
    } as ApiResponse);
  }
});

// Delete video
router.delete('/:videoId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!._id;
    
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      } as ApiResponse);
    }
    
    // Check ownership
    if (video.creator.toString() !== userId.toString() && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      } as ApiResponse);
    }
    
    // Delete related data
    await Promise.all([
      VideoModel.findByIdAndDelete(videoId),
      CommentModel.deleteMany({ videoId }),
      LikeModel.deleteMany({ videoId }),
      ViewModel.deleteMany({ videoId }),
    ]);
    
    // TODO: Delete video files from R2 storage
    
    res.json({
      success: true,
      message: 'Video deleted successfully',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete video',
    } as ApiResponse);
  }
});

// Search videos
router.get('/', validate(videoValidationSchemas.search, 'query'), async (req: Request, res: Response) => {
  try {
    const filters = req.query as SearchFilters;
    const { query, tags, creatorId, duration, sortBy, page = 1, limit = 20 } = filters;
    
    // Build search query
    const searchQuery: any = { status: 'ready', visibility: 'public' };
    
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }
    
    if (creatorId) {
      searchQuery.creator = creatorId;
    }
    
    if (duration) {
      switch (duration) {
        case 'short':
          searchQuery.duration = { $lt: 240 }; // < 4 minutes
          break;
        case 'medium':
          searchQuery.duration = { $gte: 240, $lte: 1200 }; // 4-20 minutes
          break;
        case 'long':
          searchQuery.duration = { $gt: 1200 }; // > 20 minutes
          break;
      }
    }
    
    // Build sort query
    let sortQuery: any = {};
    switch (sortBy) {
      case 'date':
        sortQuery.createdAt = -1;
        break;
      case 'views':
        sortQuery.views = -1;
        break;
      case 'likes':
        sortQuery.likes = -1;
        break;
      case 'relevance':
      default:
        if (query) {
          sortQuery = { score: { $meta: 'textScore' } };
        } else {
          sortQuery.createdAt = -1;
        }
        break;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [videos, totalCount] = await Promise.all([
      VideoModel
        .find(searchQuery)
        .populate('creator', 'name avatar')
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit)),
      VideoModel.countDocuments(searchQuery),
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
      error: 'Failed to search videos',
    } as ApiResponse);
  }
});

// Like/Dislike video
router.post('/:videoId/like', authenticateJWT, validate(likeValidationSchema), async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { type } = req.body;
    const userId = req.user!._id;
    
    // Check if video exists
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      } as ApiResponse);
    }
    
    // Check if user already liked/disliked
    const existingLike = await LikeModel.findOne({ userId, videoId });
    
    if (existingLike) {
      if (existingLike.type === type) {
        // Remove like/dislike
        await LikeModel.findByIdAndDelete(existingLike._id);
        
        // Update video counters
        const updateField = type === 'like' ? 'likes' : 'dislikes';
        await VideoModel.findByIdAndUpdate(videoId, { $inc: { [updateField]: -1 } });
        
        return res.json({
          success: true,
          message: `${type} removed`,
        } as ApiResponse);
      } else {
        // Change like to dislike or vice versa
        existingLike.type = type;
        await existingLike.save();
        
        // Update video counters
        if (type === 'like') {
          await VideoModel.findByIdAndUpdate(videoId, { 
            $inc: { likes: 1, dislikes: -1 } 
          });
        } else {
          await VideoModel.findByIdAndUpdate(videoId, { 
            $inc: { likes: -1, dislikes: 1 } 
          });
        }
        
        return res.json({
          success: true,
          message: `Changed to ${type}`,
        } as ApiResponse);
      }
    }
    
    // Create new like/dislike
    await LikeModel.create({ userId, videoId, type });
    
    // Update video counters
    const updateField = type === 'like' ? 'likes' : 'dislikes';
    await VideoModel.findByIdAndUpdate(videoId, { $inc: { [updateField]: 1 } });
    
    res.status(201).json({
      success: true,
      message: `Video ${type}d`,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to like/dislike video',
    } as ApiResponse);
  }
});

// Get video comments
router.get('/:videoId/comments', optionalAuth, validate(paginationValidationSchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [comments, totalCount] = await Promise.all([
      CommentModel
        .find({ videoId, parentId: null })
        .populate('userId', 'name avatar')
        .populate({
          path: 'replies',
          populate: { path: 'userId', select: 'name avatar' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CommentModel.countDocuments({ videoId, parentId: null }),
    ]);
    
    const totalPages = Math.ceil(totalCount / Number(limit));
    
    const response: PaginatedResponse<typeof comments[0]> = {
      items: comments,
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
      error: 'Failed to fetch comments',
    } as ApiResponse);
  }
});

// Add comment
router.post('/:videoId/comments', authenticateJWT, validate(commentValidationSchemas.create), async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!._id;
    
    // Check if video exists
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      } as ApiResponse);
    }
    
    // If replying to a comment, check if parent comment exists
    if (parentId) {
      const parentComment = await CommentModel.findById(parentId);
      if (!parentComment || parentComment.videoId !== videoId) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found',
        } as ApiResponse);
      }
    }
    
    // Create comment
    const comment = await CommentModel.create({
      videoId,
      userId,
      content,
      parentId: parentId || null,
    });
    
    // If this is a reply, add it to parent's replies array
    if (parentId) {
      await CommentModel.findByIdAndUpdate(parentId, {
        $push: { replies: comment._id }
      });
    }
    
    // Populate user data
    await comment.populate('userId', 'name avatar');
    
    res.status(201).json({
      success: true,
      data: comment,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
    } as ApiResponse);
  }
});

export default router;
