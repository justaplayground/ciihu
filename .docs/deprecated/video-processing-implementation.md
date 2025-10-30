# Video Processing Progress Implementation

## Summary

Successfully implemented Redis-based real-time progress tracking for video processing with detailed stages, Server-Sent Events (SSE) for frontend updates, and fixed all incomplete features in the video processing service.

## Changes Made

### 1. Updated Video Schema and Shared Types

**Files Modified:**
- `packages/shared-types/src/index.ts`
- `apps/api/src/models/Video.ts`

**Changes:**
- Expanded `status` enum to include detailed processing stages:
  - `'analyzing'` - Analyzing video metadata
  - `'transcoding'` - Converting video to different resolutions
  - `'uploading'` - Uploading processed files to R2
  - `'processing'` - General processing state (default)
  - `'ready'` - Video is ready for playback
  - `'error'` - Processing failed
  
- Added `processingMessage` field to store human-readable status messages

### 2. Implemented Redis Progress Store

**File Modified:** `apps/api/src/services/videoProcessingService.ts`

**New Methods:**
- `setProcessingProgress(progress: ProcessingProgress)` - Stores progress in Redis with 24-hour TTL
- `getProcessingStatus(videoId: string)` - Retrieves current processing status from Redis

**Redis Key Format:** `video:processing:{videoId}`

**Data Structure:**
```typescript
interface ProcessingProgress {
  videoId: string;
  stage: 'analyzing' | 'transcoding' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
  updatedAt: number; // timestamp
}
```

### 3. Fixed VideoProcessingService Issues

**File Modified:** `apps/api/src/services/videoProcessingService.ts`

**Fixed:**
- `updateVideoStatus()` now properly saves the `stage` parameter to the database `status` field
- `processingMessage` is now correctly saved to the database
- Both database and Redis are updated on every status change
- Error messages are properly captured and stored

**Behavior:**
- When stage is `'completed'`, database status is set to `'ready'`
- When stage is `'error'`, database status is set to `'error'`
- Other stages (`'analyzing'`, `'transcoding'`, `'uploading'`) are saved as-is

### 4. Created Real-Time SSE Endpoint

**New File:** `apps/api/src/routes/processing.ts`

**Endpoints:**

1. **GET `/api/processing/:videoId/stream`** (SSE)
   - Real-time streaming of video processing progress
   - Polls Redis every 500ms for updates
   - Automatically closes connection when processing completes or errors
   - Uses Server-Sent Events (SSE) protocol
   - No authentication required (can be accessed by video owner)

2. **GET `/api/processing/:videoId/status`** (REST)
   - One-time fetch of current processing status
   - Returns current progress from Redis
   - Returns 404 if no processing status found

**SSE Response Format:**
```
data: {"videoId":"123","stage":"transcoding","progress":45,"message":"Transcoding 720p","updatedAt":1234567890}

data: {"videoId":"123","stage":"completed","progress":100,"message":"Video processing completed","updatedAt":1234567891}

data: {"done":true}

```

### 5. Registered Processing Routes

**File Modified:** `apps/api/src/routes/index.ts`

- Added import for `processingRoutes`
- Registered routes at `/api/processing`
- Fixed TypeScript linter error with explicit Router type annotation

### 6. Updated Environment Documentation

**File Modified:** `apps/api/env.example`

- Added comment noting Redis is required for real-time video processing progress tracking

## How to Use

### Backend - Monitoring Processing Status

The video processing service automatically updates both the database and Redis whenever the status changes. No additional code changes needed in the processing logic.

### Frontend - Real-Time Progress Tracking

#### Using SSE (Recommended for Real-Time Updates)

```typescript
const videoId = 'your-video-id';
const eventSource = new EventSource(`http://localhost:5001/api/processing/${videoId}/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.done) {
    console.log('Processing complete');
    eventSource.close();
    return;
  }
  
  if (data.connected) {
    console.log('Connected to processing stream');
    return;
  }
  
  // Update UI with progress
  console.log(`Stage: ${data.stage}`);
  console.log(`Progress: ${data.progress}%`);
  console.log(`Message: ${data.message}`);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

#### Using REST API (Polling)

```typescript
const checkProgress = async (videoId: string) => {
  try {
    const response = await fetch(`http://localhost:5001/api/processing/${videoId}/status`);
    const result = await response.json();
    
    if (result.success) {
      console.log('Progress:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('Failed to fetch progress:', error);
  }
};

// Poll every 2 seconds
const interval = setInterval(async () => {
  const progress = await checkProgress(videoId);
  
  if (progress && (progress.stage === 'completed' || progress.stage === 'error')) {
    clearInterval(interval);
  }
}, 2000);
```

## Benefits

1. **Real-Time Updates**: Frontend can track processing progress in real-time via SSE
2. **No Database Polling**: Redis stores temporary progress data, reducing database load
3. **Automatic Cleanup**: Redis keys expire after 24 hours
4. **Better UX**: Users can see exactly what stage their video is in
5. **Error Tracking**: Detailed error messages stored and accessible
6. **Graceful Degradation**: If Redis is unavailable, database updates still work

## Testing

### Start Redis
```bash
docker-compose up -d redis
# or
redis-server
```

### Test SSE Endpoint
```bash
curl -N http://localhost:5001/api/processing/{videoId}/stream
```

### Test REST Endpoint
```bash
curl http://localhost:5001/api/processing/{videoId}/status
```

## Processing Stages Flow

1. **analyzing** (10-20%) - Downloading and analyzing video metadata
2. **transcoding** (20-78%) - Converting video to different quality levels
   - 360p, 480p, 720p, 1080p (if source allows)
   - Each resolution shows sub-progress
3. **uploading** (78-95%) - Uploading files to Cloudflare R2
4. **uploading** (95-100%) - Creating master playlist and thumbnail
5. **completed** (100%) - Processing finished successfully
6. **error** (any stage) - Processing failed with error details

## Notes

- Redis connection is checked before operations to ensure graceful degradation
- All progress updates are logged for debugging
- SSE connections auto-close on completion or error
- Database status field uses simplified values for queries ('ready', 'error', or stage name)
- Progress values are normalized to 0-100 range

