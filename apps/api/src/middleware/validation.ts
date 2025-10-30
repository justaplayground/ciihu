import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '@repo/shared-types';

// Generic validation middleware factory
export const validate = (schema: Joi.Schema, property: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      } as ApiResponse);
    }
    
    next();
  };
};

// User validation schemas
export const userValidationSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().trim().min(2).max(50).required(),
    bio: Joi.string().max(500).optional(),
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    bio: Joi.string().max(500).allow('').optional(),
    isCreator: Joi.boolean().optional(),
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
};

// Video validation schemas
export const videoValidationSchemas = {
  upload: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    visibility: Joi.string().valid('public', 'unlisted', 'private').default('public'),
  }),
  
  update: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().max(2000).allow('').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    visibility: Joi.string().valid('public', 'unlisted', 'private').optional(),
  }),
  
  search: Joi.object({
    query: Joi.string().trim().max(200).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    creatorId: Joi.string().optional(),
    duration: Joi.string().valid('short', 'medium', 'long').optional(),
    sortBy: Joi.string().valid('relevance', 'date', 'views', 'likes').default('relevance'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

// Comment validation schemas
export const commentValidationSchemas = {
  create: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
    parentId: Joi.string().optional(),
  }),
  
  update: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
  }),
};

// Like validation schema
export const likeValidationSchema = Joi.object({
  type: Joi.string().valid('like', 'dislike').required(),
});

// Pagination validation
export const paginationValidationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
