import { FastifyInstance } from 'fastify';

export function registerExportRoutes(app: FastifyInstance) {
  // Get all exports
  app.get('/v1/exports', async (request, reply) => {
    return { exports: [] };
  });

  // Create export
  app.post('/v1/exports', async (request, reply) => {
    return { message: 'Export created', exportId: 'export-123' };
  });

  // Get export by ID
  app.get('/v1/exports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { export: { id, status: 'completed' } };
  });

  // Download export
  app.get('/v1/exports/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Downloading export ${id}` };
  });

  // Delete export
  app.delete('/v1/exports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Export ${id} deleted` };
  });
}
