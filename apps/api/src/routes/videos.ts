import { Router, Request, Response } from 'express';
import { VideoModel, UserModel, ViewModel, LikeModel, CommentModel } from '../models';
import { authenticateJWT, optionalAuth, requireCreator, requireOwnership } from '../middleware/auth';
import { validate, videoValidationSchemas, commentValidationSchemas, likeValidationSchema, paginationValidationSchema } from '../middleware/validation';
import { ApiResponse, PaginatedResponse, SearchFilters } from '@repo/shared-types';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } from '../config/constants';
import { log } from '@repo/logger';

const router: Router = Router();

// Configure Cloudflare R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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
    
    // Delete video files from R2 storage
    try {
      await deleteVideoFromR2(video);
    } catch (r2Error) {
      log(`Failed to delete R2 files for video ${videoId}: ${r2Error}`);
      // Continue with database deletion even if R2 deletion fails
    }
    
    // Delete related data
    await Promise.all([
      VideoModel.findByIdAndDelete(videoId),
      CommentModel.deleteMany({ videoId }),
      LikeModel.deleteMany({ videoId }),
      ViewModel.deleteMany({ videoId }),
    ]);
    
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

/**
 * Helper function to delete all video files from R2 storage
 */
async function deleteVideoFromR2(video: any): Promise<void> {
  try {
    const keysToDelete: string[] = [];
    
    // Extract key from original URL
    if (video.originalUrl) {
      const originalKey = extractR2KeyFromUrl(video.originalUrl);
      if (originalKey) keysToDelete.push(originalKey);
    }
    
    // Extract key from video URL (master playlist)
    if (video.videoUrl) {
      const videoKey = extractR2KeyFromUrl(video.videoUrl);
      if (videoKey) keysToDelete.push(videoKey);
    }
    
    // Extract key from thumbnail
    if (video.thumbnail) {
      const thumbnailKey = extractR2KeyFromUrl(video.thumbnail);
      if (thumbnailKey) keysToDelete.push(thumbnailKey);
    }
    
    // Get the base prefix for this video (e.g., processed/userId/videoId/)
    const videoIdStr = video._id.toString();
    const creatorId = typeof video.creator === 'string' ? video.creator : video.creator._id.toString();
    const processedPrefix = `processed/${creatorId}/${videoIdStr}/`;
    const uploadPrefix = `uploads/${creatorId}/`;
    
    // List all objects with the processed prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: processedPrefix,
    });
    
    const listedObjects = await r2Client.send(listCommand);
    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      listedObjects.Contents.forEach(obj => {
        if (obj.Key) keysToDelete.push(obj.Key);
      });
    }
    
    // Delete all collected keys
    if (keysToDelete.length > 0) {
      log(`Deleting ${keysToDelete.length} objects from R2 for video ${videoIdStr}`);
      
      // R2/S3 supports batch deletion up to 1000 objects
      const chunks = chunkArray(keysToDelete, 1000);
      
      for (const chunk of chunks) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: chunk.map(key => ({ Key: key })),
            Quiet: true,
          },
        });
        
        await r2Client.send(deleteCommand);
      }
      
      log(`Successfully deleted ${keysToDelete.length} objects from R2`);
    }
  } catch (error) {
    log(`Error deleting video files from R2: ${error}`);
    throw error;
  }
}

/**
 * Extract R2 key from URL
 */
function extractR2KeyFromUrl(url: string): string | null {
  try {
    if (!url) return null;
    if (!url.includes('r2.cloudflarestorage.com') && !url.includes('.r2.dev')) {
      return null;
    }
    
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (error) {
    log(`Failed to extract R2 key from URL ${url}: ${error}`);
    return null;
  }
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default router;
