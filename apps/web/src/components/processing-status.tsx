"use client";

import { Card, CardContent } from '@/components/ui/card';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  videoId: string;
  onComplete?: () => void;
  className?: string;
}

const stageLabels = {
  analyzing: 'Analyzing video',
  transcoding: 'Transcoding video',
  uploading: 'Uploading files',
  completed: 'Processing complete',
  error: 'Processing failed',
};

const stageDescriptions = {
  analyzing: 'Extracting video metadata and preparing for processing...',
  transcoding: 'Converting video to multiple quality levels...',
  uploading: 'Uploading processed files to storage...',
  completed: 'Your video is ready to watch!',
  error: 'An error occurred while processing your video.',
};

export function ProcessingStatus({ videoId, onComplete, className }: ProcessingStatusProps) {
  const { status, isProcessing, isCompleted, isError, isConnected, error } = useProcessingStatus(videoId, true);

  // Call onComplete callback when processing finishes
  if (isCompleted && onComplete) {
    setTimeout(() => onComplete(), 1000);
  }

  if (!status && !error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">Connecting to processing server...</h3>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card className={cn('w-full border-destructive', className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">Connection Error</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const stageIcon = () => {
    if (isError) {
      return <XCircle className="h-12 w-12 text-destructive" />;
    }
    if (isCompleted) {
      return <CheckCircle className="h-12 w-12 text-green-500" />;
    }
    return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
  };

  return (
    <Card className={cn('w-full', isError && 'border-destructive', className)}>
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center space-y-3">
            {stageIcon()}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">
                {stageLabels[status.stage]}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status.message || stageDescriptions[status.stage]}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(status.progress)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Details */}
          {isError && status.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">Error Details:</p>
              <p className="text-sm text-destructive/80 mt-1">{status.error}</p>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              )}
            />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Stage Details */}
          {isProcessing && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div
                  className={cn(
                    'text-sm font-medium mb-1',
                    status.stage === 'analyzing' ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  1. Analyze
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.progress >= 20 ? '✓' : '...'}
                </div>
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    'text-sm font-medium mb-1',
                    status.stage === 'transcoding' ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  2. Transcode
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.progress >= 78 ? '✓' : status.progress >= 20 ? '...' : '-'}
                </div>
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    'text-sm font-medium mb-1',
                    status.stage === 'uploading' ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  3. Upload
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.progress >= 100 ? '✓' : status.progress >= 78 ? '...' : '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

