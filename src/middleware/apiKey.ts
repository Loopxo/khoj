import { FastifyPluginAsync } from 'fastify';

export const apiKeyPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip API key check for health check and metrics
    if (request.url === '/health' || request.url === '/metrics') {
      return;
    }

    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      reply.code(401).send({ error: 'API key required' });
      return;
    }

    // TODO: Validate API key against database
    // For now, just check if it exists
    if (!apiKey || apiKey.length < 10) {
      reply.code(401).send({ error: 'Invalid API key' });
      return;
    }
  });
};
