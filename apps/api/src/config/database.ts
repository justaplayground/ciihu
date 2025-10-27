import mongoose from 'mongoose';
import { log } from '@repo/logger';
import { MONGODB_URI } from './constants';

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoURI = MONGODB_URI;
    
    const conn = await mongoose.connect(mongoURI, {
      // Connection options for production
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      log('MongoDB connection error:' + err);
    });

    mongoose.connection.on('disconnected', () => {
      log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        log('Error during database disconnection:' + err);
        process.exit(1);
      }
    });

  } catch (error) {
    log('Error connecting to MongoDB:' + error);
    process.exit(1);
  }
};

export default connectDatabase;
