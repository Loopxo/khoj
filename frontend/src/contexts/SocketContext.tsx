import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  subscriptions: Set<string>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  subscriptions: new Set(),
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: {
        token: token,
      },
      transports: ['websocket'],
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      toast.success('Connected to real-time updates');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      toast.error('Disconnected from real-time updates');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to real-time updates');
    });

    // Data events
    newSocket.on('scraper_updated', (data) => {
      toast.success(`Scraper "${data.name}" updated`);
    });

    newSocket.on('run_started', (data) => {
      toast(`Scraper run started: ${data.scraperId}`);
    });

    newSocket.on('run_completed', (data) => {
      const status = data.status === 'SUCCESS' ? 'completed' : 'failed';
      const type = data.status === 'SUCCESS' ? 'success' : 'error';
      toast[type](`Scraper run ${status}: ${data.scraperId}`);
    });

    newSocket.on('run_progress', (data) => {
      // Handle progress updates - you might want to use a different notification system
      // for progress updates to avoid spam
      console.log('Run progress:', data);
    });

    newSocket.on('broadcast', (data) => {
      console.log('Broadcast message:', data);
      // Handle broadcast messages based on data.type
      switch (data.data?.type) {
        case 'system_maintenance':
          toast('System maintenance scheduled', { icon: '🔧' });
          break;
        case 'rate_limit_warning':
          toast.error('Rate limit warning: Consider upgrading your plan');
          break;
        default:
          console.log('Unknown broadcast type:', data.data?.type);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocket(null);
      setIsConnected(false);
      setSubscriptions(new Set());
    };
  }, [user, token]);

  const subscribe = useCallback((channel: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('subscribe', { channel });
    setSubscriptions(prev => new Set(prev).add(channel));
    console.log(`Subscribed to channel: ${channel}`);
  }, [socket, isConnected]);

  const unsubscribe = useCallback((channel: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('unsubscribe', { channel });
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
    console.log(`Unsubscribed from channel: ${channel}`);
  }, [socket, isConnected]);

  const value: SocketContextType = {
    socket,
    isConnected,
    subscribe,
    unsubscribe,
    subscriptions,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};