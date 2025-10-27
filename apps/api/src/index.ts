import { createServer } from "./server";
import connectDatabase from "./config/database";
import { connectRedis } from "./config/redis";
import { log } from "@repo/logger";
import { PORT, NODE_ENV } from "./config/constants";

const port = PORT;

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Create and start server
    const app = createServer();
    
    app.listen(port, () => {
      log(`🚀 Video Streaming Platform API running on port ${port}`);
      log(`🌐 Environment: ${NODE_ENV}`);
      log(`📝 Health check: http://localhost:${port}/status`);
    });
  } catch (error) {
    log('Failed to start server:' + error);
    process.exit(1);
  }
};

startServer();