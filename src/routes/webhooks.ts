import { FastifyInstance } from 'fastify';

export function registerWebhookRoutes(app: FastifyInstance) {
  // Get all webhooks
  app.get('/v1/webhooks', async (request, reply) => {
    return { webhooks: [] };
  });

  // Create webhook
  app.post('/v1/webhooks', async (request, reply) => {
    return { message: 'Webhook created' };
  });

  // Update webhook
  app.put('/v1/webhooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Webhook ${id} updated` };
  });

  // Delete webhook
  app.delete('/v1/webhooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Webhook ${id} deleted` };
  });

  // Test webhook
  app.post('/v1/webhooks/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Webhook ${id} test sent` };
  });
}
