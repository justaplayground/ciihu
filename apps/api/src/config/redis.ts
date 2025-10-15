import { createClient } from 'redis';
import { logger } from '@repo/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('end', () => {
  logger.info('Redis connection closed');
});

const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    // Continue without Redis for non-critical caching
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed through app termination');
  } catch (err) {
    logger.error('Error during Redis disconnection:', err);
  }
});

export { redisClient, connectRedis };
