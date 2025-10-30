"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { useAuth } from "@/lib/auth-context";
import { 
  Upload,
  Play,
  Eye,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Settings,
  Video,
  FileText,
  Calendar,
  Download,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not logged in
  if (!user) {
    return null;
  }

  // Mock analytics data
  const analyticsData = {
    totalViews: 1547892,
    totalSubscribers: 125847,
    totalVideos: 89,
    totalWatchTime: 489756, // in hours
    monthlyGrowth: {
      views: 15.3,
      subscribers: 8.7,
      watchTime: 12.4,
    },
    recentVideos: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      title: `Video ${i + 1} - Tutorial about web development and modern frameworks`,
      thumbnail: `https://picsum.photos/160/90?random=${i}`,
      status: ['ready', 'processing', 'error'][Math.floor(Math.random() * 3)],
      views: Math.floor(Math.random() * 50000) + 1000,
      likes: Math.floor(Math.random() * 1000) + 50,
      comments: Math.floor(Math.random() * 200) + 10,
      publishedAt: `${Math.floor(Math.random() * 30) + 1} days ago`,
      duration: `${Math.floor(Math.random() * 20) + 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    })),
    topVideos: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Top Video ${i + 1} - Most popular content on the channel`,
      views: Math.floor(Math.random() * 100000) + 50000,
      engagement: Math.floor(Math.random() * 20) + 5, // percentage
    })),
    viewsOverTime: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      views: Math.floor(Math.random() * 5000) + 1000,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.name}! Manage your content and track your channel's performance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="monetization">Monetization</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.totalViews.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+{analyticsData.monthlyGrowth.views}%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.totalSubscribers.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+{analyticsData.monthlyGrowth.subscribers}%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.totalVideos}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active videos on your channel
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analyticsData.totalWatchTime / 1000).toFixed(1)}K
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+{analyticsData.monthlyGrowth.watchTime}%</span> hours this month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Top Videos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Videos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyticsData.recentVideos.slice(0, 4).map((video) => (
                    <div key={video.id} className="flex items-center space-x-3">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-16 h-9 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {video.views.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {video.likes}
                          </span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        video.status === 'ready' ? 'bg-green-100 text-green-800' :
                        video.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {video.status}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Videos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyticsData.topVideos.map((video, index) => (
                    <div key={video.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <span>{video.views.toLocaleString()} views</span>
                          <span>{video.engagement}% engagement</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 mt-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload New Video</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Drag and drop video files here</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Or click to browse your files (Max 500MB)
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Content Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Videos ({analyticsData.totalVideos})</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input placeholder="Search videos..." className="w-64" />
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.recentVideos.map((video) => (
                    <div key={video.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-20 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1">{video.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {video.views.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {video.likes}
                          </span>
                          <span className="flex items-center">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {video.comments}
                          </span>
                          <span>{video.publishedAt}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 text-sm rounded-full ${
                        video.status === 'ready' ? 'bg-green-100 text-green-800' :
                        video.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {video.status}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Chart placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Views Over Time (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Chart visualization would go here</p>
                    <p className="text-sm text-muted-foreground">
                      Integration with charting library like Chart.js or Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audience Demographics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Age 18-24</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-[35%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Age 25-34</span>
                      <span className="text-sm font-medium">42%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-[42%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Age 35-44</span>
                      <span className="text-sm font-medium">18%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-[18%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Age 45+</span>
                      <span className="text-sm font-medium">5%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-[5%]"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Direct/Bookmark</span>
                    <span className="text-sm font-medium">45.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">YouTube Search</span>
                    <span className="text-sm font-medium">28.7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Suggested Videos</span>
                    <span className="text-sm font-medium">15.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">External Website</span>
                    <span className="text-sm font-medium">6.9%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Social Media</span>
                    <span className="text-sm font-medium">3.4%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monetization" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monetization Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Monetization Features Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Track your revenue, manage sponsorships, and analyze your earning potential with our upcoming monetization dashboard.
                  </p>
                  <Button className="mt-4" variant="outline">
                    Join Waitlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

