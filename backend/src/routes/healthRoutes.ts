import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET /api/health - Health check
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

export default router;
