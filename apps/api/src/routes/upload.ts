import { Router, Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoModel } from '../models';
import { authenticateJWT, requireCreator } from '../middleware/auth';
import { validate, videoValidationSchemas } from '../middleware/validation';
import { ApiResponse, R2UploadResponse } from '@repo/shared-types';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Configure Cloudflare R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Generate pre-signed URL for direct upload
router.post('/presigned-url', authenticateJWT, requireCreator, async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Filename and content type are required',
      } as ApiResponse);
    }
    
    // Generate unique key
    const key = `uploads/${req.user!._id}/${Date.now()}-${filename}`;
    
    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    const response: R2UploadResponse = {
      success: true,
      uploadUrl,
      key,
      url: publicUrl,
    };
    
    res.json({
      success: true,
      data: response,
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL',
    } as ApiResponse);
  }
});

// Create video record after upload
router.post('/video', authenticateJWT, requireCreator, validate(videoValidationSchemas.upload), async (req: Request, res: Response) => {
  try {
    const { title, description, tags, visibility, originalUrl, duration } = req.body;
    const userId = req.user!._id;
    
    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        error: 'Original video URL is required',
      } as ApiResponse);
    }
    
    // Create video record
    const video = await VideoModel.create({
      title,
      description: description || '',
      tags: tags || [],
      visibility: visibility || 'public',
      creator: userId,
      originalUrl,
      videoUrl: originalUrl, // Will be updated after transcoding
      duration: duration || 0, // Will be updated after processing
      status: 'processing',
    });
    
    // Trigger video processing
    const { videoProcessingService } = await import('../services/videoProcessingService');
    await videoProcessingService.queueVideoProcessing({
      videoId: video._id.toString(),
      inputUrl: originalUrl,
      outputPrefix: `processed/${userId}/${video._id}`,
    });
    
    logger.info(`Video processing queued for video ${video._id}`);
    
    res.status(201).json({
      success: true,
      data: video,
      message: 'Video upload initiated. Processing will begin shortly.',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create video record',
    } as ApiResponse);
  }
});

// Upload video directly to server (alternative method)
router.post('/direct', authenticateJWT, requireCreator, upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded',
      } as ApiResponse);
    }
    
    const { title, description, tags, visibility } = req.body;
    const userId = req.user!._id;
    
    // Generate unique key for R2
    const key = `uploads/${userId}/${Date.now()}-${req.file.originalname}`;
    
    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });
    
    await r2Client.send(command);
    
    const videoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    // Create video record
    const video = await VideoModel.create({
      title,
      description: description || '',
      tags: tags ? JSON.parse(tags) : [],
      visibility: visibility || 'public',
      creator: userId,
      originalUrl: videoUrl,
      videoUrl, // Will be updated after transcoding
      duration: 0, // Will be updated after processing
      status: 'processing',
    });
    
    // Trigger video processing
    const { videoProcessingService } = await import('../services/videoProcessingService');
    await videoProcessingService.queueVideoProcessing({
      videoId: video._id.toString(),
      inputUrl: videoUrl,
      outputPrefix: `processed/${userId}/${video._id}`,
    });
    
    logger.info(`Video processing queued for video ${video._id}`);
    
    res.status(201).json({
      success: true,
      data: video,
      message: 'Video uploaded successfully. Processing will begin shortly.',
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload video',
    } as ApiResponse);
  }
});

// Get upload progress (placeholder for WebSocket or polling)
router.get('/progress/:videoId', authenticateJWT, async (req: Request, res: Response) => {
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
    
    res.json({
      success: true,
      data: {
        videoId: video._id,
        status: video.status,
        progress: video.processingProgress || 0,
        stage: video.status,
      },
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get upload progress',
    } as ApiResponse);
  }
});

export default router;
