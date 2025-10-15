import { json, urlencoded } from "body-parser";
import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { logger } from "@repo/logger";
import passport from "./config/passport";
import routes from "./routes";

// Load environment variables
dotenv.config();

export const createServer = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  app
    .disable("x-powered-by")
    .use(morgan("dev", {
      stream: { write: message => logger.info(message.trim()) }
    }))
    .use(urlencoded({ extended: true, limit: '10mb' }))
    .use(json({ limit: '10mb' }))
    .use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    }));

  // Initialize Passport
  app.use(passport.initialize());

  // API Routes
  app.use('/api', routes);

  // Basic endpoints
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Video Streaming Platform API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/status", (_, res) => {
    return res.json({ 
      success: true,
      message: "API is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // Legacy endpoint for compatibility
  app.get("/message/:name", (req, res) => {
    return res.json({ message: `hello ${req.params.name}` });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    
    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
};