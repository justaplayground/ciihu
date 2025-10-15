// MongoDB initialization script
db = db.getSiblingDB('video-platform');

// Create collections with indexes
db.createCollection('users');
db.createCollection('videos');
db.createCollection('comments'); 
db.createCollection('likes');
db.createCollection('views');
db.createCollection('subscriptions');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "googleId": 1 }, { unique: true, sparse: true });

db.videos.createIndex({ "creator": 1, "createdAt": -1 });
db.videos.createIndex({ "status": 1, "visibility": 1 });
db.videos.createIndex({ "tags": 1 });
db.videos.createIndex({ "views": -1 });
db.videos.createIndex({ "createdAt": -1 });
db.videos.createIndex({ 
  "title": "text", 
  "description": "text", 
  "tags": "text" 
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  }
});

db.comments.createIndex({ "videoId": 1, "createdAt": -1 });
db.comments.createIndex({ "userId": 1 });
db.comments.createIndex({ "parentId": 1 });

db.likes.createIndex({ "userId": 1, "videoId": 1 }, { unique: true, sparse: true });
db.likes.createIndex({ "userId": 1, "commentId": 1 }, { unique: true, sparse: true });
db.likes.createIndex({ "videoId": 1, "type": 1 });
db.likes.createIndex({ "commentId": 1, "type": 1 });

db.views.createIndex({ "videoId": 1, "createdAt": -1 });
db.views.createIndex({ "userId": 1, "lastWatchedAt": -1 });
db.views.createIndex({ "userId": 1, "videoId": 1 });
db.views.createIndex({ "createdAt": 1 });

db.subscriptions.createIndex({ "subscriberId": 1, "creatorId": 1 }, { unique: true });
db.subscriptions.createIndex({ "creatorId": 1, "createdAt": -1 });

print('Database initialization completed successfully');
print('Created collections: users, videos, comments, likes, views, subscriptions');
print('Created performance indexes for all collections');
