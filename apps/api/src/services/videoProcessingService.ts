import { VideoModel } from '../models';
import { logger } from '@repo/logger';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Configure FFmpeg paths
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

// Cloudflare R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export interface VideoProcessingJob {
  videoId: string;
  inputUrl: string;
  outputPrefix: string; // S3/R2 key prefix for output files
}

export interface ProcessingProgress {
  videoId: string;
  stage: 'downloading' | 'analyzing' | 'transcoding' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
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
      logger.error(`Failed to process video ${job.videoId}:`, error);
      await this.updateVideoStatus(job.videoId, 'error', 0, 'Processing failed');
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
    
    try {
      // Update status to processing
      await this.updateVideoStatus(videoId, 'analyzing', 10, 'Analyzing video file');

      // Download and analyze the video
      const tempDir = `/tmp/video-processing/${videoId}`;
      await fs.mkdir(tempDir, { recursive: true });
      
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
      const resolutions = [
        { name: '360p', height: 360, bitrate: '500k', maxrate: '550k', bufsize: '750k' },
        { name: '480p', height: 480, bitrate: '1000k', maxrate: '1100k', bufsize: '1500k' },
        { name: '720p', height: 720, bitrate: '2500k', maxrate: '2675k', bufsize: '3750k' },
      ];

      const hlsPlaylistUrls: any[] = [];
      let progressStep = 30; // Start from 30%, each resolution adds ~20%

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
            const currentProgress = progressStep + (progress * 0.15); // 15% per resolution
            this.updateVideoStatus(videoId, 'transcoding', currentProgress);
          }
        );

        // Upload HLS files to R2
        await this.updateVideoStatus(
          videoId,
          'uploading',
          progressStep + 15,
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

        progressStep += 20;
      }

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

      // Cleanup temporary files
      await fs.rm(tempDir, { recursive: true, force: true });

      logger.info(`Video ${videoId} processed successfully`);
    } catch (error) {
      logger.error(`Error processing video ${videoId}:`, error);
      await this.updateVideoStatus(videoId, 'error', 0, `Processing failed: ${error}`);
      throw error;
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    if (url.includes('r2.cloudflarestorage.com')) {
      // Download from R2
      const key = url.split('/').pop() || '';
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
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
      }
    } else {
      // Download from external URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
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
    const files = await fs.readdir(localDir);
    
    for (const file of files) {
      const filePath = path.join(localDir, file);
      const key = `${r2Prefix}/${file}`;
      
      const fileBuffer = await fs.readFile(filePath);
      
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T',
      }));
    }
    
    return `${process.env.R2_PUBLIC_URL}/${r2Prefix}/playlist.m3u8`;
  }

  /**
   * Create master HLS playlist
   */
  private async createMasterPlaylist(
    resolutions: any[],
    outputPrefix: string
  ): Promise<string> {
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    for (const resolution of resolutions) {
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${resolution.bitrate},RESOLUTION=1280x${resolution.height},CODECS="avc1.4d401f,mp4a.40.2"\n`;
      masterPlaylist += `${resolution.resolution}/playlist.m3u8\n\n`;
    }
    
    const key = `${outputPrefix}/master.m3u8`;
    
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: masterPlaylist,
      ContentType: 'application/x-mpegURL',
    }));
    
    return `${process.env.R2_PUBLIC_URL}/${key}`;
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
            const thumbnailBuffer = await fs.readFile(tempThumbnail);
            
            await r2Client.send(new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: r2Key,
              Body: thumbnailBuffer,
              ContentType: 'image/jpeg',
            }));
            
            await fs.unlink(tempThumbnail).catch(() => {}); // Clean up
            resolve(`${process.env.R2_PUBLIC_URL}/${r2Key}`);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
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
    stage: string,
    progress: number,
    message?: string
  ): Promise<void> {
    try {
      await VideoModel.findByIdAndUpdate(videoId, {
        processingProgress: Math.min(100, Math.max(0, progress)),
        ...(message && { processingMessage: message }),
      });
      
      logger.info(`Video ${videoId} - ${stage}: ${progress}% ${message || ''}`);
    } catch (error) {
      logger.error(`Failed to update video status for ${videoId}:`, error);
    }
  }

  /**
   * Get processing status
   */
  public getProcessingStatus(videoId: string): ProcessingProgress | null {
    // This would typically be stored in Redis for real-time updates
    // For now, return basic status from database
    return null;
  }
}

export const videoProcessingService = VideoProcessingService.getInstance();
