# Authentication Implementation Guide

This document describes the authentication system implemented in the CiiHu video streaming platform.

## Overview

The authentication system supports two methods:
1. **Manual Authentication**: Email and password-based registration and login
2. **Google OAuth**: Login and registration using Google accounts

## Key Features

- ✅ Separate login and register flows for both manual and Google OAuth
- ✅ Google OAuth login requires prior registration (doesn't auto-create users)
- ✅ JWT-based authentication with access and refresh tokens
- ✅ Automatic token refresh on expiration
- ✅ Protected routes with authentication checks
- ✅ Client-side auth state management with React Context
- ✅ Token storage in localStorage
- ✅ Password hashing with bcrypt (12 rounds)

## Architecture

### Backend (API)

#### Files Modified/Created:
- `apps/api/src/config/passport.ts` - Passport strategies for JWT and Google OAuth
- `apps/api/src/config/constants.ts` - Configuration constants
- `apps/api/src/routes/auth.ts` - Authentication routes
- `apps/api/src/models/User.ts` - User model with password hashing
- `apps/api/src/middleware/auth.ts` - JWT authentication middleware
- `apps/api/src/utils/jwt.ts` - JWT token generation and verification

#### Authentication Flow:

##### Manual Registration (`POST /api/auth/register`)
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

##### Manual Login (`POST /api/auth/login`)
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
Response: Same as registration

##### Google OAuth Login
1. Redirect to: `GET /api/auth/google/login`
2. User authenticates with Google
3. Callback: `GET /api/auth/google/callback`
4. If user exists: Redirect to `/auth/callback?token=...&refresh=...`
5. If user doesn't exist: Redirect to `/login?error=no_account`

##### Google OAuth Register
1. Redirect to: `GET /api/auth/google/register`
2. User authenticates with Google
3. Callback: `GET /api/auth/google/register/callback`
4. If user doesn't exist: Create account and redirect to `/auth/callback?token=...&refresh=...`
5. If user exists: Redirect to `/register?error=already_exists`

##### Token Refresh (`POST /api/auth/refresh`)
```json
{
  "refreshToken": "..."
}
```

##### Get Current User (`GET /api/auth/me`)
Requires: `Authorization: Bearer <accessToken>`

### Frontend (Web)

#### Files Created:
- `apps/web/src/lib/auth-context.tsx` - Auth context provider
- `apps/web/src/lib/api.ts` - API client with token management
- `apps/web/src/app/login/page.tsx` - Login page
- `apps/web/src/app/register/page.tsx` - Registration page
- `apps/web/src/app/auth/callback/page.tsx` - OAuth callback handler
- `apps/web/src/components/header.tsx` - Header with auth UI

#### Authentication State Management

The `AuthProvider` component wraps the entire application and provides:
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

#### Token Management

Tokens are stored in localStorage:
- `accessToken` - Short-lived token (7 days default)
- `refreshToken` - Long-lived token (30 days default)

The API client automatically:
- Adds tokens to request headers
- Refreshes expired access tokens
- Redirects to login on authentication failure

#### Protected Routes

Example of a protected route:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <div>Protected content for {user.name}</div>;
}
```

## Environment Variables

### Backend (`apps/api/.env`)
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=/api/auth/google/callback
GOOGLE_REGISTER_CALLBACK_URL=/api/auth/google/register/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (`apps/web/.env`)
```env
NEXT_PUBLIC_API_HOST=http://localhost:3001
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3001/api/auth/google/callback`
     - `http://localhost:3001/api/auth/google/register/callback`
     - Add production URLs when deploying
5. Copy Client ID and Client Secret to `.env`

## User Model

```typescript
interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  role: 'admin' | 'user';
  isCreator: boolean;
  googleId?: string; // Set when user registers via Google
  password?: string; // Only for manual registration
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Token Expiration**: Access tokens expire after 7 days, refresh tokens after 30 days
4. **CORS Protection**: Configured CORS origin
5. **Password Requirements**: Minimum 6 characters
6. **Email Validation**: Email format validation on both client and server
7. **Password Hiding**: Passwords are never returned in API responses (via Mongoose transform)

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google/login` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth login callback
- `GET /api/auth/google/register` - Initiate Google OAuth registration
- `GET /api/auth/google/register/callback` - Google OAuth registration callback
- `POST /api/auth/refresh` - Refresh access token

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout (optional, client handles token deletion)

## Usage Examples

### Manual Login
```typescript
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
    // User is now authenticated
  };
}
```

### Google OAuth Login
```typescript
import { authApi } from '@/lib/api';

function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return <button onClick={handleGoogleLogin}>Login with Google</button>;
}
```

### Logout
```typescript
import { useAuth } from '@/lib/auth-context';

function LogoutButton() {
  const { logout } = useAuth();

  return <button onClick={logout}>Logout</button>;
}
```

### Access Current User
```typescript
import { useAuth } from '@/lib/auth-context';

function UserProfile() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## Testing

### Manual Testing Checklist

#### Registration
- [ ] Register with valid email and password
- [ ] Try to register with existing email (should fail)
- [ ] Try to register with invalid email format (should fail)
- [ ] Try to register with password < 6 characters (should fail)

#### Login
- [ ] Login with valid credentials
- [ ] Try to login with invalid email (should fail)
- [ ] Try to login with invalid password (should fail)
- [ ] Login persists after page refresh

#### Google OAuth
- [ ] Register with Google account
- [ ] Try to register again with same Google account (should fail)
- [ ] Login with registered Google account
- [ ] Try to login with unregistered Google account (should fail)
- [ ] Google account links to existing email if matches

#### Protected Routes
- [ ] Access dashboard without login (should redirect to login)
- [ ] Access dashboard after login (should work)
- [ ] Logout and try to access dashboard (should redirect)

#### Token Management
- [ ] Access token is added to API requests
- [ ] Token refresh works when access token expires
- [ ] Logout clears tokens

## Troubleshooting

### "No account found" error on Google login
- User needs to register first using the "Sign up with Google" button

### "Account already exists" error on Google registration
- User already registered, should use "Login with Google" instead

### Token refresh loop
- Check that JWT secrets are configured correctly
- Verify token expiration times are reasonable

### CORS errors
- Ensure CORS_ORIGIN and FRONTEND_URL are set correctly in backend .env

## Future Enhancements

- [ ] Add email verification
- [ ] Add password reset functionality
- [ ] Add remember me functionality
- [ ] Add 2FA (Two-Factor Authentication)
- [ ] Add social login (Facebook, Twitter, etc.)
- [ ] Add session management (view/revoke active sessions)
- [ ] Add account deletion
- [ ] Add OAuth account unlinking
- [ ] Move to httpOnly cookies for better security (instead of localStorage)
- [ ] Add rate limiting for auth endpoints
- [ ] Add account lockout after failed login attempts

## License

This implementation is part of the CiiHu video streaming platform.

