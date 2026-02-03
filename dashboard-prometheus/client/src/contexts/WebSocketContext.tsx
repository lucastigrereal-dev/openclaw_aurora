import React, { createContext, useContext, useEffect, useState } from 'react';
import { getOpenClawWebSocket } from '@/services/openclawWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ws = getOpenClawWebSocket();

  const connect = async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      await ws.connect();
      setIsConnected(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Erro ao conectar WebSocket:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    ws.disconnect();
    setIsConnected(false);
  };

  useEffect(() => {
    const unsubscribe = ws.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Auto-connect
    if (!isConnected && !isConnecting) {
      connect();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext deve ser usado dentro de WebSocketProvider');
  }
  return context;
}
