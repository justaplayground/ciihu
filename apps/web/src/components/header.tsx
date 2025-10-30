'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary">CiiHu</span>
        </Link>

        <nav className="flex items-center space-x-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Dashboard
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  Search
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-white hidden md:inline">{user.name}</span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-700 text-red-700 hover:text-white hover:bg-red-700"
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/register">
                <Button variant="ghost" className="text-gray-400 hover:text-white">
                  Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="default" className="text-white">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
