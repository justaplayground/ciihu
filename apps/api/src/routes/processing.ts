import { Router, Request, Response } from 'express';
import { videoProcessingService } from '../services/videoProcessingService';
import { optionalAuth } from '../middleware/auth';
import { log } from '@repo/logger';

const router: Router = Router();

/**
 * Server-Sent Events endpoint for real-time video processing progress
 * GET /api/processing/:videoId/stream
 */
router.get('/:videoId/stream', optionalAuth, async (req: Request, res: Response) => {
  const { videoId } = req.params;
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ connected: true, videoId })}\n\n`);
  
  log(`SSE connection established for video ${videoId}`);
  
  // Poll Redis for updates every 500ms
  const pollInterval = setInterval(async () => {
    try {
      const progress = await videoProcessingService.getProcessingStatus(videoId);
      
      if (progress) {
        // Send progress update
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
        
        // Close connection when processing is completed or errored
        if (progress.stage === 'completed' || progress.stage === 'error') {
          clearInterval(pollInterval);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          log(`SSE connection closed for video ${videoId} (stage: ${progress.stage})`);
        }
      }
    } catch (error) {
      log(`Error polling progress for video ${videoId}: ${error}`);
      clearInterval(pollInterval);
      res.write(`data: ${JSON.stringify({ error: 'Failed to get progress' })}\n\n`);
      res.end();
    }
  }, 500);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    log(`SSE connection closed by client for video ${videoId}`);
  });
  
  // Handle errors
  res.on('error', (error) => {
    clearInterval(pollInterval);
    log(`SSE connection error for video ${videoId}: ${error}`);
  });
});

/**
 * REST endpoint to get current processing status
 * GET /api/processing/:videoId/status
 */
router.get('/:videoId/status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const progress = await videoProcessingService.getProcessingStatus(videoId);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Processing status not found',
      });
    }
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing status',
    });
  }
});

export default router;

