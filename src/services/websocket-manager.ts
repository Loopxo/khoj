import { WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  scraperId?: string;
  subscriptions: Set<string>;
  lastPing: number;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  channel?: string;
  data?: any;
}

export class WebSocketManager extends EventEmitter {
  private clients: Map<string, WebSocketClient> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout;
  
  constructor() {
    super();
    
    // Ping clients every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
  }
  
  addClient(ws: WebSocket, clientId: string, userId?: string) {
    const client: WebSocketClient = {
      id: clientId,
      ws,
      userId,
      subscriptions: new Set(),
      lastPing: Date.now()
    };
    
    this.clients.set(clientId, client);
    
    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      this.removeClient(clientId);
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.removeClient(clientId);
    });
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: { clientId, timestamp: new Date().toISOString() }
    });
    
    logger.info(`WebSocket client connected: ${clientId}`);
  }
  
  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Remove from all channels
    client.subscriptions.forEach(channel => {
      this.unsubscribeFromChannel(clientId, channel);
    });
    
    this.clients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  }
  
  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          this.subscribeToChannel(clientId, message.channel);
        }
        break;
        
      case 'unsubscribe':
        if (message.channel) {
          this.unsubscribeFromChannel(clientId, message.channel);
        }
        break;
        
      case 'ping':
        client.lastPing = Date.now();
        this.sendToClient(clientId, { type: 'pong' });
        break;
        
      default:
        logger.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }
  
  private subscribeToChannel(clientId: string, channel: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Authorization check
    if (!this.isAuthorizedForChannel(client, channel)) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Not authorized for this channel' }
      });
      return;
    }
    
    client.subscriptions.add(channel);
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channel }
    });
    
    logger.debug(`Client ${clientId} subscribed to ${channel}`);
  }
  
  private unsubscribeFromChannel(clientId: string, channel: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.subscriptions.delete(channel);
    
    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(clientId);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }
    
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: { channel }
    });
  }
  
  private isAuthorizedForChannel(client: WebSocketClient, channel: string): boolean {
    // Channel format: scraper:{scraperId}, user:{userId}, global
    const [channelType, channelId] = channel.split(':');
    
    switch (channelType) {
      case 'user':
        return client.userId === channelId;
      case 'scraper':
        // Would need to check if user has access to this scraper
        return true; // Simplified for now
      case 'global':
        return true;
      default:
        return false;
    }
  }
  
  broadcast(channel: string, data: any) {
    const channelClients = this.channels.get(channel);
    if (!channelClients) return;
    
    const message = {
      type: 'broadcast',
      channel,
      data,
      timestamp: new Date().toISOString()
    };
    
    channelClients.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
    
    logger.debug(`Broadcasted to channel ${channel}: ${channelClients.size} clients`);
  }
  
  sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      client.ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }
  
  private pingClients() {
    const now = Date.now();
    const staleClients: string[] = [];
    
    this.clients.forEach((client, clientId) => {
      // Remove stale connections (no ping in 2 minutes)
      if (now - client.lastPing > 120000) {
        staleClients.push(clientId);
        return;
      }
      
      // Send ping
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        staleClients.push(clientId);
      }
    });
    
    staleClients.forEach(clientId => this.removeClient(clientId));
  }
  
  // Notify about scraper events
  notifyScraperUpdate(scraperId: string, data: any) {
    this.broadcast(`scraper:${scraperId}`, {
      type: 'scraper_updated',
      scraperId,
      data
    });
  }
  
  notifyRunStarted(scraperId: string, runId: string, data: any) {
    this.broadcast(`scraper:${scraperId}`, {
      type: 'run_started',
      scraperId,
      runId,
      data
    });
  }
  
  notifyRunCompleted(scraperId: string, runId: string, data: any) {
    this.broadcast(`scraper:${scraperId}`, {
      type: 'run_completed',
      scraperId,
      runId,
      data
    });
  }
  
  notifyRunProgress(scraperId: string, runId: string, progress: number) {
    this.broadcast(`scraper:${scraperId}`, {
      type: 'run_progress',
      scraperId,
      runId,
      progress
    });
  }
  
  getStats() {
    return {
      totalClients: this.clients.size,
      totalChannels: this.channels.size,
      channelSubscriptions: Object.fromEntries(
        Array.from(this.channels.entries()).map(([channel, clients]) => [
          channel,
          clients.size
        ])
      )
    };
  }
  
  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.clients.forEach((client, clientId) => {
      client.ws.close();
    });
    
    this.clients.clear();
    this.channels.clear();
  }
}

let wsManager: WebSocketManager;

export function initWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  return wsManager;
}