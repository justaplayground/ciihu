import axios from 'axios';
import { API_HOST } from '@/constants';
import type { Video, ApiResponse, PaginatedResponse, Comment } from '@repo/shared-types';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_HOST}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Video API
export const videoApi = {
  /**
   * Fetch video details by ID
   */
  fetchVideo: async (videoId: string): Promise<Video> => {
    const response = await apiClient.get<ApiResponse<Video>>(`/videos/${videoId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch video');
    }
    return response.data.data;
  },

  /**
   * Fetch comments for a video
   */
  fetchComments: async (
    videoId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Comment>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Comment>>>(
      `/videos/${videoId}/comments`,
      { params: { page, limit } }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch comments');
    }
    return response.data.data;
  },

  /**
   * Like or dislike a video
   */
  likeVideo: async (videoId: string, type: 'like' | 'dislike'): Promise<void> => {
    const response = await apiClient.post<ApiResponse>(
      `/videos/${videoId}/like`,
      { type }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to like video');
    }
  },

  /**
   * Add a comment to a video
   */
  addComment: async (
    videoId: string,
    content: string,
    parentId?: string
  ): Promise<Comment> => {
    const response = await apiClient.post<ApiResponse<Comment>>(
      `/videos/${videoId}/comments`,
      { content, parentId }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to add comment');
    }
    return response.data.data;
  },

  /**
   * Search videos
   */
  searchVideos: async (params: {
    query?: string;
    tags?: string[];
    creatorId?: string;
    duration?: 'short' | 'medium' | 'long';
    sortBy?: 'relevance' | 'date' | 'views' | 'likes';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Video>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Video>>>(
      '/videos',
      { params }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to search videos');
    }
    return response.data.data;
  },

  /**
   * Update video metadata
   */
  updateVideo: async (
    videoId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      visibility?: 'public' | 'unlisted' | 'private';
    }
  ): Promise<Video> => {
    const response = await apiClient.put<ApiResponse<Video>>(
      `/videos/${videoId}`,
      updates
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update video');
    }
    return response.data.data;
  },

  /**
   * Delete a video
   */
  deleteVideo: async (videoId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse>(`/videos/${videoId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete video');
    }
  },
};

// User API
export const userApi = {
  /**
   * Get user profile
   */
  fetchUserProfile: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user profile');
    }
    return response.data.data;
  },

  /**
   * Subscribe to a creator
   */
  subscribe: async (creatorId: string): Promise<void> => {
    const response = await apiClient.post<ApiResponse>(
      `/users/${creatorId}/subscribe`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to subscribe');
    }
  },

  /**
   * Unsubscribe from a creator
   */
  unsubscribe: async (creatorId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse>(
      `/users/${creatorId}/subscribe`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unsubscribe');
    }
  },
};

// Processing API
export const processingApi = {
  /**
   * Get current processing status
   */
  getStatus: async (videoId: string) => {
    const response = await apiClient.get(`/processing/${videoId}/status`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch processing status');
    }
    return response.data.data;
  },
};

// Auth API
export const authApi = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to login');
    }
    return response.data.data;
  },

  /**
   * Register new user
   */
  register: async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/auth/register', { email, password, name });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to register');
    }
    return response.data.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to logout');
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    if (!response.data.success) {
      return null;
    }
    return response.data.data;
  },
};

export default apiClient;

