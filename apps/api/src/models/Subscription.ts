import mongoose, { Document, Schema } from 'mongoose';
import { Subscription } from '@repo/shared-types';

export interface SubscriptionDocument extends Omit<Subscription, '_id' | 'subscriberId' | 'creatorId'>, Document {
  _id: string;
  subscriberId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
}

const subscriptionSchema = new Schema<SubscriptionDocument>({
  subscriberId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
});

// Compound index to ensure unique subscriptions and efficient queries
subscriptionSchema.index({ subscriberId: 1, creatorId: 1 }, { unique: true });
subscriptionSchema.index({ creatorId: 1, createdAt: -1 });

// Prevent self-subscription
subscriptionSchema.pre('save', function (next) {
  if (this.subscriberId.equals(this.creatorId)) {
    return next(new Error('Users cannot subscribe to themselves'));
  }
  next();
});

export const SubscriptionModel = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
