import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check and public endpoints
    if (request.url === '/health' || request.url === '/metrics') {
      return;
    }

    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      request.user = decoded;
    } catch (error) {
      reply.code(401).send({ error: 'Invalid token' });
      return;
    }
  });
};
