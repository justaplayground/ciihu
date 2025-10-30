import { VideoModel } from '../models';
import { log } from '@repo/logger';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { redisClient } from '../config/redis';
import { 
  FFMPEG_PATH, 
  FFPROBE_PATH, 
  R2_ACCOUNT_ID, 
  R2_ACCESS_KEY_ID, 
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL
} from '../config/constants';
import { getLimitedResolutionsByOriginalHeight } from '../utils/media';

// Configure FFmpeg paths
if (FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
}
if (FFPROBE_PATH) {
  ffmpeg.setFfprobePath(FFPROBE_PATH);
}

// Cloudflare R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface VideoProcessingJob {
  videoId: string;
  inputUrl: string;
  outputPrefix: string; // S3/R2 key prefix for output files
}

export interface ProcessingProgress {
  videoId: string;
  stage: 'analyzing' | 'transcoding' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
  updatedAt: number; // timestamp
}

export class VideoProcessingService {
  private static instance: VideoProcessingService;
  private processingQueue: VideoProcessingJob[] = [];
  private activeJobs = new Map<string, boolean>();

  public static getInstance(): VideoProcessingService {
    if (!VideoProcessingService.instance) {
      VideoProcessingService.instance = new VideoProcessingService();
    }
    return VideoProcessingService.instance;
  }

  /**
   * Add a video to the processing queue
   */
  public async queueVideoProcessing(job: VideoProcessingJob): Promise<void> {
    if (this.activeJobs.has(job.videoId)) {
      throw new Error('Video is already being processed');
    }

    this.processingQueue.push(job);
    this.processNextJob();
  }

  /**
   * Process videos in the queue
   */
  private async processNextJob(): Promise<void> {
    if (this.processingQueue.length === 0) {
      return;
    }

    const job = this.processingQueue.shift();
    if (!job) return;

    if (this.activeJobs.has(job.videoId)) {
      return this.processNextJob(); // Skip if already processing
    }

    this.activeJobs.set(job.videoId, true);
    
    try {
      await this.processVideo(job);
    } catch (error) {
      log(`Failed to process video ${job.videoId}: ${error}`);
      await this.updateVideoStatus(job.videoId, 'error', 0, 'Processing failed', String(error));
    } finally {
      this.activeJobs.delete(job.videoId);
      // Process next job after a short delay
      setTimeout(() => this.processNextJob(), 1000);
    }
  }

  /**
   * Process a single video
   */
  private async processVideo(job: VideoProcessingJob): Promise<void> {
    const { videoId, inputUrl, outputPrefix } = job;
    const tempDir = `/tmp/video-processing/${videoId}`;
    
    try {
      // Update status to processing
      await this.updateVideoStatus(videoId, 'analyzing', 10, 'Analyzing video file');

      // Download and analyze the video
      await fs.mkdir(tempDir, { recursive: true });
      log(`Created temp directory: ${tempDir}`);
      
      const inputPath = path.join(tempDir, 'input.mp4');
      await this.downloadFile(inputUrl, inputPath);

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Update video record with metadata
      await VideoModel.findByIdAndUpdate(videoId, {
        duration: metadata.duration,
        status: 'processing',
        processingProgress: 20,
      });

      await this.updateVideoStatus(videoId, 'transcoding', 20, 'Starting transcoding');

      // Generate different quality versions
      const resolutions = getLimitedResolutionsByOriginalHeight(metadata.height);

      const hlsPlaylistUrls: any[] = [];
      let progressStep = 30; // Start from 30%, each resolution adds ~12-16%
      const proceedPercentage = 48 / resolutions.length; // 48% of the total progress is for transcoding

      for (const resolution of resolutions) {
        await this.updateVideoStatus(
          videoId,
          'transcoding',
          progressStep,
          `Transcoding ${resolution.name}`
        );

        const outputDir = path.join(tempDir, resolution.name);
        await fs.mkdir(outputDir, { recursive: true });

        const playlistPath = await this.transcodeToHLS(
          inputPath,
          outputDir,
          resolution,
          (progress: number) => {
            const currentProgress = progressStep + (progress * proceedPercentage); // ~12-16% per resolution
            this.updateVideoStatus(videoId, 'transcoding', currentProgress);
          }
        );

        // Upload HLS files to R2
        await this.updateVideoStatus(
          videoId,
          'uploading',
          progressStep + proceedPercentage,
          `Uploading ${resolution.name} files`
        );

        const publicUrl = await this.uploadHLSFiles(
          outputDir,
          `${outputPrefix}/${resolution.name}`,
          resolution.name
        );

        hlsPlaylistUrls.push({
          resolution: resolution.name,
          height: resolution.height,
          bitrate: parseInt(resolution.bitrate.replace('k', '')) * 1000,
          url: publicUrl,
          fileSize: await this.getDirectorySize(outputDir),
        });

        progressStep += proceedPercentage;
      } // ends with progressStep = 78%

      // Create master playlist
      await this.updateVideoStatus(videoId, 'uploading', 85, 'Creating master playlist');
      const masterPlaylistUrl = await this.createMasterPlaylist(
        hlsPlaylistUrls,
        outputPrefix
      );

      // Generate thumbnail
      await this.updateVideoStatus(videoId, 'uploading', 90, 'Generating thumbnail');
      const thumbnailUrl = await this.generateThumbnail(
        inputPath,
        `${outputPrefix}/thumbnail.jpg`
      );

      // Update video record with final URLs
      await VideoModel.findByIdAndUpdate(videoId, {
        videoUrl: masterPlaylistUrl,
        thumbnail: thumbnailUrl,
        resolutions: hlsPlaylistUrls,
        status: 'ready',
        processingProgress: 100,
      });

      await this.updateVideoStatus(videoId, 'completed', 100, 'Video processing completed');

      log(`Video ${videoId} processed successfully`);
    } catch (error) {
      log(`Error processing video ${videoId}: ${error}`);
      await this.updateVideoStatus(videoId, 'error', 0, 'Processing failed', String(error));
      throw error;
    } finally {
      // Always cleanup temporary files, even on error
      try {
        await this.cleanupTempDirectory(tempDir);
      } catch (cleanupError) {
        log(`Failed to cleanup temp directory ${tempDir}: ${cleanupError}`);
        // Don't throw here, just log - cleanup failures shouldn't affect the main process result
      }
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    try {
      if (url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) {
        // Download from R2
        // Extract the key from the URL (everything after the domain and bucket path)
        const urlObj = new URL(url);
        const key = urlObj.pathname.substring(1); // Remove leading slash
        
        log(`Downloading from R2: ${key}`);
        
        const command = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        });
        
        const response = await r2Client.send(command);
        if (response.Body) {
          const stream = response.Body as Readable;
          const writeStream = require('fs').createWriteStream(outputPath);
          stream.pipe(writeStream);
          
          return new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
        } else {
          throw new Error('Empty response body from R2');
        }
      } else {
        // Download from external URL
        log(`Downloading from external URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
      }
    } catch (error) {
      log(`Error downloading file from ${url}: ${error}`);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          resolve({
            duration: metadata.format.duration || 0,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            bitrate: metadata.format.bit_rate || 0,
            fps: videoStream?.r_frame_rate || '30/1',
            codec: videoStream?.codec_name || 'unknown',
            fileSize: metadata.format.size || 0,
          });
        }
      });
    });
  }

  /**
   * Transcode video to HLS format
   */
  private async transcodeToHLS(
    inputPath: string,
    outputDir: string,
    resolution: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const outputPath = path.join(outputDir, 'playlist.m3u8');
    const segmentPath = path.join(outputDir, 'segment_%03d.ts');

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          `-b:v ${resolution.bitrate}`,
          `-maxrate ${resolution.maxrate}`,
          `-bufsize ${resolution.bufsize}`,
          `-vf scale=-2:${resolution.height}`,
          '-preset medium',
          '-profile:v main',
          '-level 3.1',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_flags independent_segments',
          `-hls_segment_filename ${segmentPath}`,
        ])
        .output(outputPath);

      if (onProgress) {
        command.on('progress', (progress) => {
          const percent = Math.min(100, Math.max(0, progress.percent || 0));
          onProgress(percent);
        });
      }

      command
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Upload HLS files to R2
   */
  private async uploadHLSFiles(
    localDir: string,
    r2Prefix: string,
    resolution: string
  ): Promise<string> {
    try {
      const files = await fs.readdir(localDir);
      log(`Uploading ${files.length} files to R2 for ${resolution}`);
      
      for (const file of files) {
        const filePath = path.join(localDir, file);
        const key = `${r2Prefix}/${file}`;
        
        try {
          const fileBuffer = await fs.readFile(filePath);
          const fileStats = await fs.stat(filePath);
          
          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T',
            ContentLength: fileStats.size,
          }));
          
          log(`Uploaded: ${key} (${fileStats.size} bytes)`);
        } catch (uploadError) {
          log(`Failed to upload ${key}: ${uploadError}`);
          throw new Error(`Failed to upload file ${file}: ${uploadError}`);
        }
      }
      
      return `${R2_PUBLIC_URL}/${r2Prefix}/playlist.m3u8`;
    } catch (error) {
      log(`Error uploading HLS files: ${error}`);
      throw error;
    }
  }

  /**
   * Create master HLS playlist
   */
  private async createMasterPlaylist(
    resolutions: any[],
    outputPrefix: string
  ): Promise<string> {
    try {
      let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
      
      for (const resolution of resolutions) {
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${resolution.bitrate},RESOLUTION=1280x${resolution.height},CODECS="avc1.4d401f,mp4a.40.2"\n`;
        masterPlaylist += `${resolution.resolution}/playlist.m3u8\n\n`;
      }
      
      const key = `${outputPrefix}/master.m3u8`;
      
      log(`Creating master playlist: ${key}`);
      
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: masterPlaylist,
        ContentType: 'application/x-mpegURL',
        ContentLength: Buffer.byteLength(masterPlaylist),
      }));
      
      return `${R2_PUBLIC_URL}/${key}`;
    } catch (error) {
      log(`Error creating master playlist: ${error}`);
      throw new Error(`Failed to create master playlist: ${error}`);
    }
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(inputPath: string, r2Key: string): Promise<string> {
    const tempThumbnail = `/tmp/thumbnail_${Date.now()}.jpg`;
    
    return new Promise(async (resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(tempThumbnail),
          folder: path.dirname(tempThumbnail),
          size: '1280x720'
        })
        .on('end', async () => {
          try {
            log(`Thumbnail generated: ${tempThumbnail}`);
            const thumbnailBuffer = await fs.readFile(tempThumbnail);
            const thumbnailStats = await fs.stat(tempThumbnail);
            
            log(`Uploading thumbnail to R2: ${r2Key} (${thumbnailStats.size} bytes)`);
            
            await r2Client.send(new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: r2Key,
              Body: thumbnailBuffer,
              ContentType: 'image/jpeg',
              ContentLength: thumbnailStats.size,
            }));
            
            log(`Thumbnail uploaded successfully: ${r2Key}`);
            
            await fs.unlink(tempThumbnail).catch(() => {}); // Clean up
            resolve(`${R2_PUBLIC_URL}/${r2Key}`);
          } catch (error) {
            log(`Error uploading thumbnail: ${error}`);
            await fs.unlink(tempThumbnail).catch(() => {}); // Clean up even on error
            reject(new Error(`Failed to upload thumbnail: ${error}`));
          }
        })
        .on('error', (error) => {
          log(`Error generating thumbnail: ${error}`);
          reject(new Error(`Failed to generate thumbnail: ${error}`));
        });
    });
  }

  /**
   * Get directory size
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
    
    return totalSize;
  }

  /**
   * Update video processing status
   */
  private async updateVideoStatus(
    videoId: string,
    stage: 'analyzing' | 'transcoding' | 'uploading' | 'completed' | 'error',
    progress: number,
    message?: string,
    error?: string
  ): Promise<void> {
    try {
      const normalizedProgress = Math.min(100, Math.max(0, progress));
      const dbStatus = stage === 'completed' ? 'ready' : stage === 'error' ? 'error' : stage;
      
      // Update database
      await VideoModel.findByIdAndUpdate(videoId, {
        status: dbStatus,
        processingProgress: normalizedProgress,
        ...(message && { processingMessage: message }),
      });
      
      // Update Redis for real-time tracking
      await this.setProcessingProgress({
        videoId,
        stage,
        progress: normalizedProgress,
        message,
        error,
        updatedAt: Date.now(),
      });
      
      log(`Video ${videoId} - ${stage}: ${normalizedProgress}% ${message || ''}`);
    } catch (error) {
      log(`Failed to update video status for ${videoId}: ${error}`);
    }
  }

  /**
   * Set processing progress in Redis
   */
  private async setProcessingProgress(progress: ProcessingProgress): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        log('Redis client not connected, skipping progress update');
        return;
      }
      
      const key = `video:processing:${progress.videoId}`;
      const data = JSON.stringify({
        ...progress,
        updatedAt: Date.now(),
      });
      
      // Store with 24 hour TTL
      await redisClient.setEx(key, 86400, data);
    } catch (error) {
      log(`Failed to set processing progress in Redis: ${error}`);
    }
  }

  /**
   * Get processing status from Redis
   */
  public async getProcessingStatus(videoId: string): Promise<ProcessingProgress | null> {
    try {
      if (!redisClient.isOpen) {
        log('Redis client not connected');
        return null;
      }
      
      const key = `video:processing:${videoId}`;
      const data = await redisClient.get(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as ProcessingProgress;
    } catch (error) {
      log(`Failed to get processing status from Redis: ${error}`);
      return null;
    }
  }

  /**
   * Cleanup temporary directory
   */
  private async cleanupTempDirectory(dirPath: string): Promise<void> {
    try {
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      if (exists) {
        log(`Cleaning up temp directory: ${dirPath}`);
        await fs.rm(dirPath, { recursive: true, force: true });
        log(`Successfully cleaned up: ${dirPath}`);
      }
    } catch (error) {
      log(`Error cleaning up temp directory ${dirPath}: ${error}`);
      throw error;
    }
  }
}

export const videoProcessingService = VideoProcessingService.getInstance();
