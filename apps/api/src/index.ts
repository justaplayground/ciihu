import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import { createServer } from "./server";
import connectDatabase from "./config/database";
import { connectRedis } from "./config/redis";
import { log } from "@repo/logger";
import { PORT, NODE_ENV, validateConfig } from "./config/constants";

const port = PORT;

// Initialize database and start server
const startServer = async () => {
  try {
    // Validate configuration first
    log('🔍 Validating configuration...');
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      log('❌ Configuration validation failed:');
      configValidation.errors.forEach(error => log(`  - ${error}`));
      throw new Error('Invalid configuration. Please check your environment variables.');
    }
    log('✅ Configuration validated successfully');
    
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