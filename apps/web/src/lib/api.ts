import axios from 'axios';
import { API_HOST } from '@/constants';
import type { Video, ApiResponse, PaginatedResponse, Comment, User, AuthTokens } from '@repo/shared-types';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_HOST}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getAccessToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },
  getRefreshToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },
  setTokens: (tokens: AuthTokens) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  },
  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
          tokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post<ApiResponse<{ tokens: AuthTokens }>>(
          `${API_HOST}/api/auth/refresh`,
          { refreshToken }
        );

        if (response.data.success && response.data.data?.tokens) {
          tokenManager.setTokens(response.data.data.tokens);
          originalRequest.headers.Authorization = `Bearer ${response.data.data.tokens.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

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
  login: async (email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', { email, password });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to login');
    }
    // Save tokens
    tokenManager.setTokens(response.data.data.tokens);
    return response.data.data;
  },

  /**
   * Register new user
   */
  register: async (email: string, password: string, name: string): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', { email, password, name });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to register');
    }
    // Save tokens
    tokenManager.setTokens(response.data.data.tokens);
    return response.data.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Always clear tokens
      tokenManager.clearTokens();
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (!response.data.success || !response.data.data) {
        return null;
      }
      return response.data.data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get Google OAuth login URL
   */
  getGoogleLoginUrl: (): string => {
    return `${API_HOST}/api/auth/google/login`;
  },

  /**
   * Get Google OAuth register URL
   */
  getGoogleRegisterUrl: (): string => {
    return `${API_HOST}/api/auth/google/register`;
  },
};

export default apiClient;

