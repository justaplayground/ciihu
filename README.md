# VidStream - Video Streaming Platform

A self-hosted video distribution and streaming platform similar to YouTube, built with modern web technologies and designed for creators and viewers to upload, manage, and stream videos using HLS (HTTP Live Streaming).

## 🚀 Features

- **🎥 Video Upload & Processing**: Upload videos with automatic transcoding to HLS format
- **📱 Adaptive Streaming**: HLS.js powered video player with quality selection
- **🔐 Authentication**: JWT + Google OAuth2 login system
- **👥 User Management**: Creator and viewer roles with subscriptions
- **🔍 Video Catalog**: Search, browse, and discover videos
- **💬 Interactive Features**: Comments, likes, and view tracking
- **📊 Analytics Dashboard**: Creator analytics and insights
- **🐳 Containerized**: Full Docker setup for easy deployment

## 🛠 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless UI components
- **HLS.js** - HTML5 video streaming
- **Sonner** - Toast notifications

### Backend  
- **Express.js** - Node.js web framework
- **MongoDB** - Document database with Mongoose ODM
- **Redis** - Caching and session storage
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **Multer** - File upload handling

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **NGINX** - Reverse proxy and media serving
- **FFmpeg** - Video transcoding and processing
- **Cloudflare R2** - Object storage (S3-compatible)

### Development
- **Turborepo** - Monorepo build system
- **pnpm** - Fast package manager
- **ESLint & Prettier** - Code quality and formatting
- **Jest** - Testing framework

## 📦 Project Structure

```
ciihu/
├── apps/
│   ├── api/              # Express.js backend
│   └── web/              # Next.js frontend
├── packages/
│   ├── shared-types/     # TypeScript type definitions
│   ├── ui/               # Shared UI components
│   ├── logger/           # Logging utilities
│   └── eslint-config/    # ESLint configurations
├── docker/
│   ├── mongodb/          # Database initialization
│   ├── nginx/            # Reverse proxy config
│   └── ffmpeg/           # Video processing scripts
└── docker-compose.yml    # Container orchestration
```

## 🚦 Getting Started

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **Docker** and **Docker Compose**
- **FFmpeg** (for video processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ciihu
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Start the development environment**
   ```bash
   # Start all services with Docker
   docker-compose up -d
   
   # Or for development without Docker
   pnpm dev
   ```

5. **Access the application**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:3001
   - **MongoDB**: localhost:27017
   - **Redis**: localhost:6379

### Environment Configuration

#### API Environment Variables (.env)
```env
# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/video-platform?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_ACCOUNT_ID=your-account-id
R2_PUBLIC_URL=https://your-public-url.com

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

#### Web Environment Variables (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📱 Usage

### For Creators
1. **Sign up** and enable creator mode in your profile
2. **Upload videos** through the upload interface
3. **Manage content** via the creator dashboard
4. **View analytics** and engagement metrics

### For Viewers
1. **Browse videos** on the homepage
2. **Search and filter** content
3. **Subscribe to creators** you like
4. **Interact** with likes and comments

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/refresh` - Refresh access token

#### Videos
- `GET /api/videos` - Search and browse videos
- `GET /api/videos/:id` - Get video details
- `POST /api/videos/:id/like` - Like/dislike video
- `GET /api/videos/:id/comments` - Get video comments

#### Upload
- `POST /api/upload/presigned-url` - Get upload URL
- `POST /api/upload/video` - Create video record

#### Users
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/subscribe` - Subscribe to user

## 🐳 Docker Deployment

The application includes a complete Docker setup for production deployment:

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale api=2
```

### Services Included
- **MongoDB** - Primary database
- **Redis** - Caching and sessions  
- **NGINX** - Reverse proxy and media server
- **API** - Express.js backend
- **Web** - Next.js frontend
- **FFmpeg Worker** - Video processing

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps for production
pnpm test         # Run tests across all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier

# Package management
pnpm add <package> --filter=web    # Add dependency to web app
pnpm add <package> --filter=api    # Add dependency to API
```

### Adding New Features

1. **Shared types**: Add to `packages/shared-types`
2. **UI components**: Add to `packages/ui`
3. **API routes**: Add to `apps/api/src/routes`
4. **Frontend pages**: Add to `apps/web/src/app`

### Database Migrations

MongoDB indexes are automatically created on startup. For schema changes:

1. Update models in `apps/api/src/models`
2. Update types in `packages/shared-types`
3. Add migration script if needed

## 🚀 Production Deployment

### Performance Optimizations
- **NGINX caching** for static assets and HLS segments
- **Redis caching** for frequently accessed data
- **CDN integration** ready (Cloudflare)
- **Database indexing** for optimal query performance

### Security Features
- **Rate limiting** on API endpoints
- **CORS protection**
- **Helmet.js** security headers
- **JWT token rotation**
- **Input validation** with Joi

### Monitoring & Logging
- **Structured logging** with Winston
- **Health check endpoints**
- **Error tracking** ready for Sentry integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

---

Built with ❤️ using modern web technologies for the creator economy.