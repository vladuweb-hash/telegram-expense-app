import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import routes, { webhookRoutes } from './routes/index.js';
import { db } from './db/index.js';
import { initScheduler } from './jobs/scheduler.js';

const app = express();

// За Railway/прокси: доверять одному прокси (1), чтобы rate-limit не ругался на trust proxy
app.set('trust proxy', 1);

// CORS — самым первым, до Helmet (чтобы preflight всегда получал заголовки)
const allowedOrigins = new Set(config.corsAllowedOrigins);
const isLocalhost = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && (allowedOrigins.has(origin) || isLocalhost(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : config.corsOrigin,
  credentials: true,
}));

// Rate limiting (не для webhook)
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/webhook'),
  validate: { xForwardedForHeader: false }, // уже учтено через trust proxy
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes (без /api префикса)
app.use('/webhook', webhookRoutes);

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Start server
async function start() {
  try {
    // В production DATABASE_URL обязателен и не должен быть localhost (на Railway своей БД там нет)
    const dbUrl = process.env.DATABASE_URL || '';
    if (config.isProduction) {
      if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        logger.error(
          'DATABASE_URL is missing or points to localhost. ' +
          'On Railway: add Variable Reference from your Postgres service (Variables → Add Reference → Postgres → DATABASE_URL).'
        );
        process.exit(1);
      }
    }

    // Test database connection
    await db.query('SELECT NOW()');
    logger.info('Database connected');

    // Initialize cron scheduler
    initScheduler();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.end();
  process.exit(0);
});

start();
