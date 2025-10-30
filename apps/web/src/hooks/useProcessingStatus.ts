"use client";

import { useState, useEffect, useRef } from 'react';
import { API_HOST } from '@/constants';

export interface ProcessingStatus {
  videoId: string;
  stage: 'analyzing' | 'transcoding' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
  updatedAt: number;
}

export interface UseProcessingStatusReturn {
  status: ProcessingStatus | null;
  isProcessing: boolean;
  isCompleted: boolean;
  isError: boolean;
  isConnected: boolean;
  error: string | null;
}

/**
 * Custom hook for tracking video processing status via Server-Sent Events (SSE)
 */
export function useProcessingStatus(
  videoId: string | null,
  enabled: boolean = true
): UseProcessingStatusReturn {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Don't connect if disabled or no videoId
    if (!enabled || !videoId) {
      return;
    }

    const connect = () => {
      try {
        // Clean up existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const eventSource = new EventSource(
          `${API_HOST}/api/processing/${videoId}/stream`
        );

        eventSource.onopen = () => {
          console.log('SSE connection established for video:', videoId);
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle connection acknowledgment
            if (data.connected) {
              console.log('SSE connection confirmed');
              return;
            }

            // Handle completion signal
            if (data.done) {
              console.log('Processing complete, closing SSE connection');
              eventSource.close();
              setIsConnected(false);
              return;
            }

            // Handle progress update
            if (data.videoId) {
              setStatus(data as ProcessingStatus);
              
              // Auto-close on completion or error
              if (data.stage === 'completed' || data.stage === 'error') {
                setTimeout(() => {
                  eventSource.close();
                  setIsConnected(false);
                }, 1000);
              }
            }
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          setIsConnected(false);
          eventSource.close();

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            
            console.log(
              `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Failed to connect to processing stream. Max reconnection attempts reached.');
          }
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error('Failed to create SSE connection:', err);
        setError('Failed to establish connection');
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount or when videoId/enabled changes
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [videoId, enabled]);

  const isProcessing = status ? 
    status.stage !== 'completed' && status.stage !== 'error' : 
    false;
  
  const isCompleted = status?.stage === 'completed';
  const isError = status?.stage === 'error';

  return {
    status,
    isProcessing,
    isCompleted,
    isError,
    isConnected,
    error: error || status?.error || null,
  };
}

