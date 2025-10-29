'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokenManager } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');

      if (token && refreshToken) {
        // Save tokens
        tokenManager.setTokens({
          accessToken: token,
          refreshToken: refreshToken,
        });

        // Refresh user in context
        await refreshUser();

        toast.success('Login successful!');
        router.push('/');
      } else {
        toast.error('Authentication failed. Please try again.');
        router.push('/login');
      }
    };

    handleCallback();
  }, [searchParams, refreshUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-xl text-white">Completing authentication...</h2>
        <p className="text-gray-400 mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
}

