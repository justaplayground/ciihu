import { createServer } from "./server";
import connectDatabase from "./config/database";
import { connectRedis } from "./config/redis";
import { logger } from "@repo/logger";

const port = process.env.PORT || 3001;

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Create and start server
    const app = createServer();
    
    app.listen(port, () => {
      logger.info(`🚀 Video Streaming Platform API running on port ${port}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📝 Health check: http://localhost:${port}/status`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();