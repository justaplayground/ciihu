import { Router, type Router as RouterType } from 'express';
import authRoutes from './auth';
import videoRoutes from './videos';
import userRoutes from './users';
import uploadRoutes from './upload';
import processingRoutes from './processing';

const router: RouterType = Router();

// API route handlers
router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/processing', processingRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
