import { VideoPlayer } from "@/components/video-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Search, Menu, User, Upload } from "lucide-react";

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">CiiHu</h1>
          </div>
          
          {/* Search */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search videos..."
                className="w-full pl-10 pr-4 rounded-full"
              />
            </div>
          </div>

          {/* User actions */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Upload className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Featured/Hero Section */}
        <section className="mb-12">
          <div className="aspect-video max-w-4xl mx-auto">
            <VideoPlayer
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
              title="Big Buck Bunny - Sample Video"
              className="w-full h-full"
            />
          </div>
        </section>

        {/* Video Grid */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Latest Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Card key={i} className="group overflow-hidden border-0 shadow-sm">
                <CardContent className="p-0 space-y-3">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative cursor-pointer">
                    <img
                      src={`https://picsum.photos/320/180?random=${i}`}
                      alt={`Video ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm hover:bg-white/30"
                      >
                        <Play className="h-5 w-5 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(Math.random() * 10) + 1}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium leading-tight line-clamp-2">
                      Sample Video Title {i + 1} - This is a longer title that might wrap to multiple lines
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-medium text-primary-foreground">
                        {String.fromCharCode(65 + (i % 26))}
                      </div>
                      <span>Creator {i + 1}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.floor(Math.random() * 1000) + 1}K views • {Math.floor(Math.random() * 7) + 1} days ago
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}