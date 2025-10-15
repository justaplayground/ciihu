import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell,
  Share2,
  Play,
  Users,
  Video,
  Calendar,
  ExternalLink
} from "lucide-react";

interface ChannelPageProps {
  params: {
    id: string;
  };
}

export default function ChannelPage({ params }: ChannelPageProps) {
  // Mock channel data
  const mockChannel = {
    id: params.id,
    name: "TechCreator Studios",
    handle: "@techcreator",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&h=160&fit=crop&crop=face",
    banner: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1280&h=320&fit=crop",
    description: "Welcome to TechCreator Studios! We create in-depth tutorials, reviews, and insights about the latest in web development, software engineering, and technology trends. Join our community of 125K+ developers and tech enthusiasts.\n\nNew videos every Tuesday and Friday!\n\n📧 Business inquiries: business@techcreator.com\n🐦 Twitter: @techcreator\n💼 LinkedIn: /in/techcreator",
    subscribers: 125000,
    totalVideos: 342,
    totalViews: 15600000,
    joinedDate: "2019-03-15",
    isSubscribed: false,
    isVerified: true,
    links: [
      { title: "Website", url: "https://techcreator.com" },
      { title: "Twitter", url: "https://twitter.com/techcreator" },
      { title: "GitHub", url: "https://github.com/techcreator" },
    ],
  };

  // Mock videos for different tabs
  const generateMockVideos = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-${i + 1}`,
      title: `${prefix} Video ${i + 1} - Comprehensive tutorial covering advanced concepts and practical examples`,
      thumbnail: `https://picsum.photos/320/180?random=${prefix}-${i}`,
      views: Math.floor(Math.random() * 500000) + 10000,
      publishedAt: `${Math.floor(Math.random() * 365) + 1} days ago`,
      duration: `${Math.floor(Math.random() * 20) + 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    }));

  const latestVideos = generateMockVideos(12, "Latest");
  const popularVideos = generateMockVideos(12, "Popular");
  const playlistVideos = generateMockVideos(8, "Playlist");

  const mockPlaylists = [
    { id: 1, title: "React Masterclass Series", videoCount: 24, thumbnail: "https://picsum.photos/320/180?random=p1" },
    { id: 2, title: "JavaScript Fundamentals", videoCount: 16, thumbnail: "https://picsum.photos/320/180?random=p2" },
    { id: 3, title: "Web Development Tools", videoCount: 12, thumbnail: "https://picsum.photos/320/180?random=p3" },
    { id: 4, title: "Career in Tech", videoCount: 8, thumbnail: "https://picsum.photos/320/180?random=p4" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Channel Banner */}
      <div className="relative">
        <img
          src={mockChannel.banner}
          alt="Channel banner"
          className="w-full h-32 sm:h-48 lg:h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Channel Info */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-16 sm:-mt-20 lg:-mt-24 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            <img
              src={mockChannel.avatar}
              alt={mockChannel.name}
              className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full border-4 border-background shadow-lg"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  {mockChannel.name}
                </h1>
                {mockChannel.isVerified && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{mockChannel.handle}</p>
              <div className="flex items-center justify-center sm:justify-start space-x-4 text-sm text-muted-foreground mb-4">
                <span>{mockChannel.subscribers.toLocaleString()} subscribers</span>
                <span>{mockChannel.totalVideos} videos</span>
                <span>{mockChannel.totalViews.toLocaleString()} views</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant={mockChannel.isSubscribed ? "outline" : "default"} className="min-w-[120px]">
                <Bell className="h-4 w-4 mr-2" />
                {mockChannel.isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* About Section - Collapsible */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="whitespace-pre-line text-sm mb-4">
              {mockChannel.description.split('\n').slice(0, 2).join('\n')}
              <Button variant="ghost" size="sm" className="ml-2 h-auto p-0 text-primary">
                Show more
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {mockChannel.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>{link.title}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-8">
            <div className="space-y-8">
              {/* Latest Videos */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Latest Videos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {latestVideos.slice(0, 4).map((video) => (
                    <Card key={video.id} className="group cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative aspect-video">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {video.duration}
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          <div className="text-xs text-muted-foreground">
                            <div>{video.views.toLocaleString()} views</div>
                            <div>{video.publishedAt}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-6">
                  <Button variant="outline">View All Latest Videos</Button>
                </div>
              </section>

              {/* Popular Videos */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Popular Videos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {popularVideos.slice(0, 4).map((video) => (
                    <Card key={video.id} className="group cursor-pointer overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative aspect-video">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {video.duration}
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          <div className="text-xs text-muted-foreground">
                            <div>{video.views.toLocaleString()} views</div>
                            <div>{video.publishedAt}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Videos ({mockChannel.totalVideos})</h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">Latest</Button>
                <Button variant="outline" size="sm">Popular</Button>
                <Button variant="outline" size="sm">Oldest</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...latestVideos, ...popularVideos].map((video) => (
                <Card key={video.id} className="group cursor-pointer overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2">
                        {video.title}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        <div>{video.views.toLocaleString()} views</div>
                        <div>{video.publishedAt}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockPlaylists.map((playlist) => (
                <Card key={playlist.id} className="group cursor-pointer overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video">
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Video className="h-8 w-8 mx-auto mb-2" />
                          <div className="text-sm font-medium">{playlist.videoCount} videos</div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        Playlist
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium mb-2">{playlist.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {playlist.videoCount} videos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Description</h3>
                  <div className="whitespace-pre-line text-sm">
                    {mockChannel.description}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Channel Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span>{new Date(mockChannel.joinedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total views</span>
                      <span>{mockChannel.totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscribers</span>
                      <span>{mockChannel.subscribers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Videos</span>
                      <span>{mockChannel.totalVideos}</span>
                    </div>
                  </div>
                  
                  <h4 className="text-md font-semibold mt-6 mb-3">Links</h4>
                  <div className="space-y-2">
                    {mockChannel.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>{link.title}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
