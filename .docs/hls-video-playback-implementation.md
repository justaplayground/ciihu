# HLS Video Playback Implementation

## Summary

Successfully integrated the existing HLS video player with the backend API, added real-time video processing status tracking via Server-Sent Events (SSE), and implemented a complete video viewing experience with comments, likes, and subscriptions.

## Implementation Overview

The HLS video player was already fully functional using `hls.js`. This implementation focuses on:
1. Backend API integration for fetching video data
2. Real-time processing status tracking with SSE
3. Dynamic UI that adapts based on video status (processing/ready/error)
4. User interactions (like, comment, subscribe)

## Files Created

### 1. API Service Layer
**File:** `apps/web/src/lib/api.ts`

Centralized API client with methods for:
- **Video API**: fetch, search, update, delete videos; like/dislike; comments
- **User API**: fetch profile, subscribe/unsubscribe
- **Processing API**: get processing status
- **Auth API**: login, register, logout, get current user

Uses axios with base configuration:
- Base URL: `${API_HOST}/api`
- Credentials: included (for cookies)
- Content-Type: JSON

### 2. Processing Status Hook
**File:** `apps/web/src/hooks/useProcessingStatus.ts`

Custom React hook for SSE connection to track video processing:

**Features:**
- Connects to `/api/processing/:videoId/stream` endpoint
- Automatic reconnection with exponential backoff (max 5 attempts)
- Proper cleanup on unmount
- Returns current status, connection state, and error information

**Return Value:**
```typescript
{
  status: ProcessingStatus | null,
  isProcessing: boolean,
  isCompleted: boolean,
  isError: boolean,
  isConnected: boolean,
  error: string | null
}
```

**SSE Connection Management:**
- Auto-closes when processing completes or errors
- Exponential backoff: 2^attempt * 1000ms (max 30s)
- Handles connection errors gracefully

### 3. Processing Status Component
**File:** `apps/web/src/components/processing-status.tsx`

Visual component displaying video processing progress:

**Features:**
- Animated progress bar with percentage
- Stage indicators (Analyze → Transcode → Upload)
- Real-time status messages
- Error display with details
- Connection status indicator
- Completion callback support

**Visual States:**
- **Connecting**: Spinner with "Connecting to processing server..."
- **Processing**: Progress bar with stage-specific icons and messages
- **Completed**: Green checkmark with success message
- **Error**: Red X with error details

**Stage Progress Mapping:**
- Analyzing: 10-20%
- Transcoding: 20-78%
- Uploading: 78-100%

### 4. Updated Video Page
**File:** `apps/web/src/app/video/[id]/page.tsx`

Fully integrated video viewing experience:

**Features:**
- Fetches real video data from backend on mount
- Dynamic rendering based on video status:
  - **Ready**: Shows HLS video player with full controls
  - **Processing**: Shows ProcessingStatus component with live updates
  - **Error**: Shows error message
- Comments section with add/reply functionality
- Like/dislike with optimistic updates
- Subscribe to creator
- Creator information display
- Video metadata (views, date, description, tags)
- Loading and error states

**Video Status Handling:**
```typescript
isVideoReady → Show VideoPlayer with HLS stream
isProcessing → Show ProcessingStatus with SSE updates
isError → Show error message
```

**User Interactions:**
- Like/dislike videos (optimistic UI updates)
- Add comments (instant local state update)
- Subscribe to creators
- Share, download, report options (UI ready, functionality TBD)

## Data Flow

### Video Loading Flow
1. Page loads with videoId from URL params
2. Fetch video data from `/api/videos/:videoId`
3. Check video status:
   - If `ready`: Render VideoPlayer with `videoUrl` (master.m3u8)
   - If processing: Render ProcessingStatus component
   - If error: Show error message
4. Fetch comments if video is ready
5. Display all video metadata

### Processing Status Flow
1. ProcessingStatus component receives videoId
2. useProcessingStatus hook establishes SSE connection
3. Backend streams progress updates every 500ms
4. UI updates in real-time with progress, stage, and messages
5. When processing completes:
   - SSE connection closes
   - onComplete callback triggers
   - Video data is refetched
   - VideoPlayer renders with the completed video

### User Interaction Flow
1. **Like/Dislike**:
   - POST to `/api/videos/:videoId/like`
   - Optimistic UI update (instant feedback)
   - Server confirms and returns updated counts

2. **Comment**:
   - POST to `/api/videos/:videoId/comments`
   - Add to local state immediately
   - Server confirms and returns comment with ID

3. **Subscribe**:
   - POST to `/api/users/:creatorId/subscribe`
   - Update local state
   - Server confirms subscription

## HLS Streaming Details

### Video Player Features
The existing VideoPlayer component (`apps/web/src/components/video-player.tsx`) provides:

- **HLS.js Integration**: 
  - Supports adaptive bitrate streaming
  - Automatic quality switching based on bandwidth
  - Manual quality selection
  - Error recovery (network errors, media errors)

- **Player Controls**:
  - Play/pause
  - Seek bar with buffer visualization
  - Volume control with mute
  - Fullscreen mode
  - Quality selector dropdown
  - Time display (current/total)

- **Browser Compatibility**:
  - Uses HLS.js for modern browsers
  - Falls back to native HLS for Safari
  - Standard video tag fallback for non-HLS content

### Quality Levels
The backend transcodes videos to multiple resolutions:
- 360p (500k bitrate)
- 480p (1000k bitrate)
- 720p (2500k bitrate)
- 1080p (4000k bitrate) - if source quality allows

The player detects all available quality levels from the master playlist and displays them in the settings menu.

## API Endpoints Used

### Video Endpoints
- `GET /api/videos/:videoId` - Fetch video details
- `GET /api/videos/:videoId/comments` - Fetch comments (paginated)
- `POST /api/videos/:videoId/like` - Like or dislike video
- `POST /api/videos/:videoId/comments` - Add comment
- `GET /api/videos` - Search/browse videos

### Processing Endpoint
- `GET /api/processing/:videoId/stream` - SSE stream for progress updates
- `GET /api/processing/:videoId/status` - One-time status check

### User Endpoints
- `POST /api/users/:creatorId/subscribe` - Subscribe to creator
- `DELETE /api/users/:creatorId/subscribe` - Unsubscribe
- `GET /api/users/:userId` - Fetch user profile

## Testing Instructions

### 1. Upload a Video
Use the upload endpoint to upload a new video:
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "video=@test-video.mp4" \
  -F "title=Test Video" \
  -F "description=Testing HLS playback"
```

### 2. Navigate to Video Page
Immediately navigate to the video page while it's still processing:
```
http://localhost:3000/video/{videoId}
```

### 3. Observe Processing
You should see:
- Processing status component with animated spinner
- Progress bar updating in real-time
- Stage transitions (Analyzing → Transcoding → Uploading)
- Progress percentage increasing

### 4. Video Completion
When processing completes:
- Processing component disappears
- Video player appears automatically
- HLS video starts loading
- Quality selector shows available resolutions

### 5. Test Playback
- Click play button
- Test quality switching (Settings icon)
- Test fullscreen mode
- Test seeking and volume controls

### 6. Test Interactions
- Like/dislike the video
- Add a comment
- Try subscribing to the creator

## Environment Setup

Ensure these environment variables are set in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_HOST=http://localhost:3001
```

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: Full HLS.js support with all features
- **Firefox**: Full HLS.js support with all features
- **Safari**: Native HLS support (no HLS.js needed)
- **Mobile browsers**: Full support on iOS Safari and Chrome Android

### Required Browser Features
- EventSource API (for SSE)
- Modern JavaScript (ES6+)
- Fetch API
- CSS Grid and Flexbox

## Performance Considerations

### SSE Connection
- Polls Redis every 500ms for updates
- Automatically closes when processing completes
- Reconnects with exponential backoff on connection loss
- Maximum 5 reconnection attempts

### API Calls
- Video data fetched once on page load
- Comments fetched once (pagination can be added)
- Optimistic UI updates for likes and comments
- No unnecessary refetching

### HLS Streaming
- Adaptive bitrate based on network conditions
- Segments buffered for smooth playback
- Quality changes without interrupting playback

## Future Enhancements

### Short Term
- [ ] Add suggested/related videos sidebar
- [ ] Implement comment replies
- [ ] Add comment like/dislike
- [ ] Show subscriber count for creators
- [ ] Add video sharing functionality
- [ ] Implement download feature

### Medium Term
- [ ] Add video chapters/timestamps
- [ ] Implement playlist support
- [ ] Add theater mode
- [ ] Picture-in-picture support
- [ ] Keyboard shortcuts
- [ ] Watch history tracking

### Long Term
- [ ] Video recommendations algorithm
- [ ] Live streaming support
- [ ] Multi-language subtitles
- [ ] Content moderation tools
- [ ] Analytics dashboard for creators

## Troubleshooting

### Video Won't Play
1. Check browser console for errors
2. Verify video status is 'ready' in database
3. Ensure R2 bucket is publicly accessible
4. Check master.m3u8 URL is accessible
5. Verify CORS headers on R2

### Processing Status Not Updating
1. Check Redis connection in backend logs
2. Verify SSE endpoint is responding: `/api/processing/:videoId/stream`
3. Check browser Network tab for EventSource connection
4. Ensure video processing service is running

### API Errors
1. Verify backend is running on correct port
2. Check NEXT_PUBLIC_API_HOST environment variable
3. Verify CORS is configured correctly on backend
4. Check backend logs for detailed error messages

## Conclusion

The HLS video playback integration is now complete with:
- ✅ Real-time processing status tracking via SSE
- ✅ Adaptive bitrate HLS streaming
- ✅ Full video player controls with quality selection
- ✅ Comments and interactions
- ✅ Error handling and loading states
- ✅ Responsive design for all screen sizes

Users can now upload videos, watch them process in real-time, and enjoy a professional video viewing experience with HLS adaptive streaming.

