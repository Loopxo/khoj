import { FastifyInstance } from 'fastify';

export function registerWebSocketRoutes(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message) => {
      // Handle WebSocket messages
      connection.socket.send(JSON.stringify({ 
        type: 'message', 
        data: 'WebSocket connected' 
      }));
    });

    connection.socket.on('close', () => {
      // Handle WebSocket close
    });
  });
}
