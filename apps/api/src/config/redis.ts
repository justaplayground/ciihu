import { createClient, RedisClientType } from 'redis';
import { log } from '@repo/logger';
import { REDIS_URL } from './constants';

const redisClient: RedisClientType = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        log('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 50, 2000);
      log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    connectTimeout: 10000,
  },
});

redisClient.on('error', (err) => {
  log('Redis Client Error:' + err);
});

redisClient.on('connect', () => {
  log('Redis connected');
});

redisClient.on('ready', () => {
  log('Redis client ready');
});

redisClient.on('end', () => {
  log('Redis connection closed');
});

const connectRedis = async (): Promise<void> => {
  try {
    log('Attempting to connect to Redis...');
    await redisClient.connect();
    log('Redis connection established successfully');
  } catch (error) {
    log('Error connecting to Redis:' + error);
    log('Application will continue without Redis caching');
    // Continue without Redis for non-critical caching
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await redisClient.quit();
    log('Redis connection closed through app termination');
  } catch (err) {
    log('Error during Redis disconnection:' + err);
  }
});

export { redisClient, connectRedis };
