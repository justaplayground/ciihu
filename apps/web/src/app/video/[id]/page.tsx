import { VideoPlayer } from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Download, 
  Flag,
  User,
  Play,
  MessageCircle,
  Heart
} from "lucide-react";

interface VideoPageProps {
  params: {
    id: string;
  };
}

export default function VideoPage({ params }: VideoPageProps) {
  // In a real app, this would fetch data based on params.id
  const mockVideo = {
    id: params.id,
    title: "Sample Video Title - A longer title that shows how titles wrap in the video page layout",
    description: "This is a detailed description of the video content. It can be quite long and should provide viewers with information about what they can expect from this video. The description supports multiple paragraphs and can include links, timestamps, and other relevant information.\n\nThis is a second paragraph showing how longer descriptions are handled in the video player interface.",
    creator: {
      id: "creator1",
      name: "John Creator",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      subscribers: 125000,
      isSubscribed: false,
    },
    stats: {
      views: 1234567,
      likes: 45678,
      dislikes: 1234,
      comments: 892,
    },
    publishedAt: "2024-01-15",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tags: ["tutorial", "web development", "react", "typescript"],
  };

  const mockComments = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    user: {
      name: `User ${i + 1}`,
      avatar: `https://images.unsplash.com/photo-${1500000000 + i * 100000}?w=32&h=32&fit=crop&crop=face`,
    },
    content: `This is a sample comment ${i + 1}. It shows how comments are displayed in the video page. Comments can be of varying lengths and may include replies and reactions.`,
    likes: Math.floor(Math.random() * 100),
    publishedAt: `${Math.floor(Math.random() * 7) + 1} days ago`,
    replies: Math.floor(Math.random() * 5),
  }));

  const suggestedVideos = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Suggested Video ${i + 1} - Related content that users might find interesting`,
    creator: `Creator ${i + 1}`,
    views: Math.floor(Math.random() * 1000000) + 10000,
    publishedAt: `${Math.floor(Math.random() * 30) + 1} days ago`,
    duration: `${Math.floor(Math.random() * 20) + 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    thumbnail: `https://picsum.photos/168/94?random=${i + 10}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main video content - 3/4 width on large screens */}
          <div className="lg:col-span-3 space-y-4">
            {/* Video Player */}
            <div className="aspect-video">
              <VideoPlayer
                src={mockVideo.videoUrl}
                title={mockVideo.title}
                className="w-full h-full"
              />
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold leading-tight mb-2">
                  {mockVideo.title}
                </h1>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {mockVideo.stats.views.toLocaleString()} views • {mockVideo.publishedAt}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {mockVideo.stats.likes.toLocaleString()}
                    </Button>
                    <Button variant="outline" size="sm">
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {mockVideo.stats.dislikes.toLocaleString()}
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
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={mockVideo.creator.avatar}
                        alt={mockVideo.creator.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-medium">{mockVideo.creator.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {mockVideo.creator.subscribers.toLocaleString()} subscribers
                        </p>
                      </div>
                    </div>
                    <Button variant={mockVideo.creator.isSubscribed ? "outline" : "default"}>
                      {mockVideo.creator.isSubscribed ? "Subscribed" : "Subscribe"}
                    </Button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm whitespace-pre-line">
                      {mockVideo.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {mockVideo.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {mockVideo.stats.comments.toLocaleString()} Comments
                    </h3>
                    <Button variant="ghost" size="sm">
                      Sort by
                    </Button>
                  </div>

                  {/* Add Comment */}
                  <div className="flex space-x-3 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground">
                      U
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Add a comment..."
                        className="border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <Button variant="ghost" size="sm">Cancel</Button>
                        <Button size="sm">Comment</Button>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {mockComments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <img
                          src={comment.user.avatar}
                          alt={comment.user.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.publishedAt}
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
                            {comment.replies > 0 && (
                              <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary">
                                View {comment.replies} replies
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar - 1/4 width on large screens */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Up next</h3>
              <div className="space-y-3">
                {suggestedVideos.map((video) => (
                  <Card key={video.id} className="group cursor-pointer hover:bg-accent transition-colors">
                    <CardContent className="p-3">
                      <div className="flex space-x-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-20 h-12 object-cover rounded"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {video.duration}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {video.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">{video.creator}</p>
                          <p className="text-xs text-muted-foreground">
                            {video.views.toLocaleString()} views • {video.publishedAt}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
