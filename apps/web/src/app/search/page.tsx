"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Calendar,
  TrendingUp,
  User
} from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views' | 'rating'>('relevance');
  const [duration, setDuration] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [uploadDate, setUploadDate] = useState<'any' | 'hour' | 'today' | 'week' | 'month' | 'year'>('any');

  // Mock search results
  const mockResults = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    type: i % 8 === 0 ? 'channel' : 'video', // Some results are channels
    title: i % 8 === 0 
      ? `Channel Result ${i + 1}` 
      : `Search Result Video ${i + 1} - ${searchQuery ? `Related to "${searchQuery}"` : 'Sample content'} with detailed title`,
    creator: i % 8 === 0 ? null : {
      name: `Creator ${i + 1}`,
      avatar: `https://images.unsplash.com/photo-${1500000000 + i * 100000}?w=32&h=32&fit=crop&crop=face`,
    },
    // For channels
    subscribers: i % 8 === 0 ? Math.floor(Math.random() * 1000000) + 10000 : null,
    videoCount: i % 8 === 0 ? Math.floor(Math.random() * 500) + 50 : null,
    channelAvatar: i % 8 === 0 ? `https://images.unsplash.com/photo-${1400000000 + i * 100000}?w=88&h=88&fit=crop&crop=face` : null,
    // For videos
    views: i % 8 !== 0 ? Math.floor(Math.random() * 1000000) + 1000 : null,
    publishedAt: i % 8 !== 0 ? `${Math.floor(Math.random() * 365) + 1} days ago` : null,
    duration: i % 8 !== 0 ? `${Math.floor(Math.random() * 20) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` : null,
    thumbnail: i % 8 !== 0 ? `https://picsum.photos/320/180?random=${i + 20}` : null,
    description: i % 8 !== 0 ? `This is a description for video ${i + 1}. It provides context about the video content and helps users understand what they can expect from watching this video.` : `Channel description for channel ${i + 1}. This channel creates amazing content about various topics and has been active for several years.`,
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would trigger a search API call
    console.log('Searching for:', searchQuery);
  };

  const filterOptions = [
    { label: 'Upload date', value: uploadDate, options: [
      { label: 'Any time', value: 'any' },
      { label: 'Last hour', value: 'hour' },
      { label: 'Today', value: 'today' },
      { label: 'This week', value: 'week' },
      { label: 'This month', value: 'month' },
      { label: 'This year', value: 'year' },
    ]},
    { label: 'Duration', value: duration, options: [
      { label: 'Any duration', value: 'any' },
      { label: 'Under 4 minutes', value: 'short' },
      { label: '4-20 minutes', value: 'medium' },
      { label: 'Over 20 minutes', value: 'long' },
    ]},
    { label: 'Sort by', value: sortBy, options: [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Upload date', value: 'date' },
      { label: 'View count', value: 'views' },
      { label: 'Rating', value: 'rating' },
    ]},
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex items-center space-x-4 max-w-4xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <div className="flex items-center mb-4">
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="font-medium">Filters</span>
                </div>
                
                <div className="space-y-4">
                  {filterOptions.map((filter) => (
                    <div key={filter.label}>
                      <h4 className="font-medium text-sm mb-2">{filter.label}</h4>
                      <div className="space-y-1">
                        {filter.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              if (filter.label === 'Upload date') setUploadDate(option.value as any);
                              if (filter.label === 'Duration') setDuration(option.value as any);
                              if (filter.label === 'Sort by') setSortBy(option.value as any);
                            }}
                            className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-accent transition-colors ${
                              filter.value === option.value ? 'bg-accent font-medium' : ''
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Results */}
          <div className="flex-1">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                About {mockResults.length} results {searchQuery && `for "${searchQuery}"`}
              </p>
            </div>

            <div className="space-y-4">
              {mockResults.map((result) => (
                <Card key={result.id} className="group cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {result.type === 'channel' ? (
                      // Channel Result
                      <div className="flex items-center space-x-4">
                        <img
                          src={result.channelAvatar!}
                          alt={result.title}
                          className="w-22 h-22 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-lg mb-1 group-hover:text-primary transition-colors">
                            {result.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                            <span>{result.subscribers!.toLocaleString()} subscribers</span>
                            <span>{result.videoCount} videos</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                          <div className="mt-3">
                            <Button size="sm">
                              <User className="h-4 w-4 mr-1" />
                              Subscribe
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Video Result
                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={result.thumbnail!}
                            alt={result.title}
                            className="w-full sm:w-60 aspect-video object-cover rounded"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {result.duration}
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {result.title}
                          </h3>
                          <div className="flex items-center space-x-2 mb-2">
                            <img
                              src={result.creator!.avatar}
                              alt={result.creator!.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm text-muted-foreground">
                              {result.creator!.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                            <span>{result.views!.toLocaleString()} views</span>
                            <span>{result.publishedAt}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            <div className="flex justify-center mt-8">
              <Button variant="outline">
                Load More Results
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading search...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
