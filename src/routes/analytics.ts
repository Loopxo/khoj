import { FastifyInstance } from 'fastify';

export function registerAnalyticsRoutes(app: FastifyInstance) {
  // Dashboard stats
  app.get('/v1/analytics/dashboard', async (request, reply) => {
    return {
      totalScrapers: 0,
      totalRuns: 0,
      successRate: 0,
      averageExecutionTime: 0
    };
  });

  // Scraper performance
  app.get('/v1/analytics/scrapers', async (request, reply) => {
    return { scrapers: [] };
  });

  // Run statistics
  app.get('/v1/analytics/runs', async (request, reply) => {
    return { runs: [] };
  });

  // Time-series data
  app.get('/v1/analytics/trends', async (request, reply) => {
    return { trends: [] };
  });
}
