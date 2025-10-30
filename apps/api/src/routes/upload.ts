import { Router, Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoModel } from '../models';
import { authenticateJWT, requireCreator } from '../middleware/auth';
import { validate, videoValidationSchemas } from '../middleware/validation';
import { ApiResponse, R2UploadResponse } from '@repo/shared-types';
import { log } from '@repo/logger';
import { 
  R2_ACCOUNT_ID, 
  R2_ACCESS_KEY_ID, 
  R2_SECRET_ACCESS_KEY, 
  R2_BUCKET_NAME, 
  R2_PUBLIC_URL 
} from '../config/constants';

const router: Router = Router();

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
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
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
    
    // Validate content type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Only video files are allowed.',
      } as ApiResponse);
    }
    
    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate unique key
    const key = `uploads/${req.user!._id}/${Date.now()}-${sanitizedFilename}`;
    
    log(`Generating pre-signed URL for key: ${key}`);
    
    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    
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
    log(`Error generating pre-signed URL: ${error}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate upload URL',
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
    const { videoProcessingService } = await import('../services/videoProcessingService.js');
    await videoProcessingService.queueVideoProcessing({
      videoId: video._id.toString(),
      inputUrl: originalUrl,
      outputPrefix: `processed/${userId}/${video._id}`,
    });
    
    log(`Video processing queued for video ${video._id}`);
    
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
    
    // Sanitize filename
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate unique key for R2
    const key = `uploads/${userId}/${Date.now()}-${sanitizedFilename}`;
    
    log(`Uploading video to R2: ${key} (${req.file.size} bytes)`);
    
    // Upload to R2
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ContentLength: req.file.size,
      });
      
      await r2Client.send(command);
      log(`Successfully uploaded to R2: ${key}`);
    } catch (r2Error) {
      log(`R2 upload failed: ${r2Error}`);
      throw new Error(`Failed to upload video to storage: ${r2Error instanceof Error ? r2Error.message : 'Unknown error'}`);
    }
    
    const videoUrl = `${R2_PUBLIC_URL}/${key}`;
    
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
    try {
      const { videoProcessingService } = await import('../services/videoProcessingService.js');
      await videoProcessingService.queueVideoProcessing({
        videoId: video._id.toString(),
        inputUrl: videoUrl,
        outputPrefix: `processed/${userId}/${video._id}`,
      });
      
      log(`Video processing queued for video ${video._id}`);
    } catch (processingError) {
      log(`Failed to queue video processing: ${processingError}`);
      // Update video status to error
      await VideoModel.findByIdAndUpdate(video._id, { status: 'error' });
      throw new Error('Failed to queue video processing');
    }
    
    res.status(201).json({
      success: true,
      data: video,
      message: 'Video uploaded successfully. Processing will begin shortly.',
    } as ApiResponse);
  } catch (error) {
    log(`Error in direct upload: ${error}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload video',
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
