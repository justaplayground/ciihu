"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "@/components/video-player";
import { ProcessingStatus } from "@/components/processing-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { videoApi, userApi } from "@/lib/api";
import type { Video, Comment, PaginatedResponse } from "@repo/shared-types";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Download, 
  Flag,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface VideoPageProps {
  params: {
    id: string;
  };
}

export default function VideoPage({ params }: VideoPageProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<PaginatedResponse<Comment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [userLikeStatus, setUserLikeStatus] = useState<'like' | 'dislike' | null>(null);

  // Fetch video data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const videoData = await videoApi.fetchVideo(params.id);
        setVideo(videoData);

        // Fetch comments if video is ready
        if (videoData.status === 'ready') {
          try {
            const commentsData = await videoApi.fetchComments(params.id, 1, 20);
            setComments(commentsData);
          } catch (err) {
            console.error('Failed to fetch comments:', err);
            // Don't fail the whole page if comments fail
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch video:', err);
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // Handle video processing completion
  const handleProcessingComplete = async () => {
    // Refetch video data to get the final status
    try {
      const videoData = await videoApi.fetchVideo(params.id);
      setVideo(videoData);
      
      // Fetch comments now that video is ready
      const commentsData = await videoApi.fetchComments(params.id, 1, 20);
      setComments(commentsData);
    } catch (err) {
      console.error('Failed to refresh video:', err);
    }
  };

  // Handle like/dislike
  const handleLike = async (type: 'like' | 'dislike') => {
    if (!video || isLiking) return;

    try {
      setIsLiking(true);
      await videoApi.likeVideo(video._id, type);
      
      // Update local state optimistically
      setVideo(prev => {
        if (!prev) return prev;
        
        const newVideo = { ...prev };
        
        // Handle toggling same type
        if (userLikeStatus === type) {
          if (type === 'like') newVideo.likes -= 1;
          else newVideo.dislikes -= 1;
          setUserLikeStatus(null);
        }
        // Handle switching types
        else if (userLikeStatus) {
          if (type === 'like') {
            newVideo.likes += 1;
            newVideo.dislikes -= 1;
          } else {
            newVideo.dislikes += 1;
            newVideo.likes -= 1;
          }
          setUserLikeStatus(type);
        }
        // Handle new like/dislike
        else {
          if (type === 'like') newVideo.likes += 1;
          else newVideo.dislikes += 1;
          setUserLikeStatus(type);
        }
        
        return newVideo;
      });
    } catch (err) {
      console.error('Failed to like video:', err);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    if (!video || isSubscribing) return;
    
    const creatorId = typeof video.creator === 'string' ? video.creator : video.creator._id;

    try {
      setIsSubscribing(true);
      await userApi.subscribe(creatorId);
      
      // Update local state
      setVideo(prev => {
        if (!prev || typeof prev.creator === 'string') return prev;
        return {
          ...prev,
          creator: {
            ...prev.creator,
            // Note: isSubscribed might not be in the creator object initially
          }
        };
      });
    } catch (err) {
      console.error('Failed to subscribe:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Handle add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video || !commentText.trim()) return;

    try {
      const newComment = await videoApi.addComment(video._id, commentText);
      
      // Add comment to local state
      setComments(prev => {
        if (!prev) return {
          items: [newComment],
          totalCount: 1,
          currentPage: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };
        
        return {
          ...prev,
          items: [newComment, ...prev.items],
          totalCount: prev.totalCount + 1,
        };
      });
      
      setCommentText("");
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1">Failed to Load Video</h3>
                <p className="text-sm text-muted-foreground">
                  {error || 'Video not found'}
                </p>
              </div>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const creator = typeof video.creator === 'string' ? null : video.creator;
  const isVideoReady = video.status === 'ready';
  const isProcessing = ['analyzing', 'transcoding', 'uploading', 'processing'].includes(video.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main video content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Video Player or Processing Status */}
            <div className="aspect-video">
              {isVideoReady && video.videoUrl ? (
                <VideoPlayer
                  src={video.videoUrl}
                  poster={video.thumbnail || undefined}
                  title={video.title}
                  className="w-full h-full"
                />
              ) : isProcessing ? (
                <ProcessingStatus 
                  videoId={video._id} 
                  onComplete={handleProcessingComplete}
                  className="h-full flex items-center justify-center"
                />
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-8">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Video Not Available</h3>
                    <p className="text-sm text-muted-foreground">
                      {video.status === 'error' 
                        ? 'An error occurred while processing this video.'
                        : 'This video is not yet available.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold leading-tight mb-2">
                  {video.title}
                </h1>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-muted-foreground">
                    {video.views.toLocaleString()} views • {new Date(video.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleLike('like')}
                      disabled={isLiking || !isVideoReady}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {video.likes.toLocaleString()}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleLike('dislike')}
                      disabled={isLiking || !isVideoReady}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {video.dislikes.toLocaleString()}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              {creator && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {creator.avatar ? (
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                            {creator.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{creator.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Subscribers
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleSubscribe}
                        disabled={isSubscribing}
                      >
                        {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                      </Button>
                    </div>
                    {video.description && (
                      <div className="mt-4">
                        <p className="text-sm whitespace-pre-line">
                          {video.description}
                        </p>
                      </div>
                    )}
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {video.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              {isVideoReady && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {comments?.totalCount.toLocaleString() || 0} Comments
                      </h3>
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={handleAddComment} className="flex space-x-3 mb-6">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground">
                        U
                      </div>
                      <div className="flex-1">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            type="button"
                            onClick={() => setCommentText("")}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" type="submit" disabled={!commentText.trim()}>
                            Comment
                          </Button>
                        </div>
                      </div>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments?.items.map((comment) => {
                        return (
                          <div key={comment._id} className="flex space-x-3">
                            {comment.user?.avatar ? (
                              <img
                                src={comment.user.avatar}
                                alt={comment.user.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs">
                                {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.user?.name || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm mb-2">{comment.content}</p>
                              <div className="flex items-center space-x-4">
                                <Button variant="ghost" size="sm" className="h-auto p-1">
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  <span className="text-xs">{comment.likes}</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-auto p-1">
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar - Suggested videos would go here */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Related Videos</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
