import { FastifyInstance } from 'fastify';

export function registerScraperRoutes(app: FastifyInstance) {
  // Get all scrapers
  app.get('/v1/scrapers', async (request, reply) => {
    return { scrapers: [] };
  });

  // Create scraper
  app.post('/v1/scrapers', async (request, reply) => {
    return { message: 'Scraper created' };
  });

  // Get scraper by ID
  app.get('/v1/scrapers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { scraper: { id, name: 'Test Scraper' } };
  });

  // Update scraper
  app.put('/v1/scrapers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Scraper ${id} updated` };
  });

  // Delete scraper
  app.delete('/v1/scrapers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Scraper ${id} deleted` };
  });

  // Run scraper
  app.post('/v1/scrapers/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Scraper ${id} started`, runId: 'run-123' };
  });

  // Get scraper runs
  app.get('/v1/scrapers/:id/runs', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { runs: [] };
  });
}
