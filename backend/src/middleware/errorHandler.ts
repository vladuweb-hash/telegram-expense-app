import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: config.isDevelopment ? err.stack : undefined,
  });
  
  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { errors: err.details }),
    });
  }
  
  // Handle database errors
  if (err.message.includes('duplicate key')) {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.message,
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: config.isProduction ? 'Internal server error' : err.message,
  });
}
