import Fastify from 'fastify';
import cors from '@fastify/cors';
import rate from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import helmet from 'helmet';
import compression from 'compression';

import { apiKeyPlugin } from './middleware/apiKey.js';
import { authPlugin } from './middleware/auth.js';
import { registerScraperRoutes } from './routes/scrapers.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerExportRoutes } from './routes/exports.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerWebSocketRoutes } from './routes/websockets.js';
import { initQueues } from './services/scheduler.js';
import { initWebSocketManager } from './services/websocket-manager.js';
import { logger } from './utils/logger.js';
import { initCronJobs } from './services/cron.js';

const app = Fastify({ 
  logger: true,
  trustProxy: true,
  maxParamLength: 200,
  bodyLimit: 10 * 1024 * 1024 // 10MB
});

// Security & Performance
await app.register(cors, { 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://khoj-dashboard.com', 'chrome-extension://'] 
    : true 
});

await app.register(rate, { 
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, 
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

await app.register(websocket);

// Middleware
await app.register(authPlugin);
await app.register(apiKeyPlugin);

// Routes
registerScraperRoutes(app);
registerWebhookRoutes(app);
registerExportRoutes(app);
registerAnalyticsRoutes(app);
registerWebSocketRoutes(app);

// Root route
app.get('/', async () => ({
  message: 'Welcome to Khoj Advanced API',
  version: process.env.npm_package_version || '2.0.0',
  endpoints: {
    health: '/health',
    metrics: '/metrics',
    scrapers: '/v1/scrapers',
    webhooks: '/v1/webhooks',
    exports: '/v1/exports',
    analytics: '/v1/analytics',
    websocket: '/ws'
  }
}));

// Health & Monitoring
app.get('/health', async () => ({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '2.0.0'
}));

app.get('/metrics', async () => {
  // Expose metrics for monitoring tools
  return {
    scrapers: await app.prisma.scraper.count(),
    runs_today: await app.prisma.run.count({
      where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } }
    }),
    active_schedules: await app.prisma.schedule.count({ where: { active: true } })
  };
});

// Initialize background services
await initQueues();
await initWebSocketManager();
await initCronJobs();

// Error handling
app.setErrorHandler(async (error, request, reply) => {
  logger.error('Unhandled error:', error);
  reply.code(500).send({ error: 'Internal server error' });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

await app.listen({ port, host });
logger.info(`🚀 Khoj Advanced API running on http://${host}:${port}`);