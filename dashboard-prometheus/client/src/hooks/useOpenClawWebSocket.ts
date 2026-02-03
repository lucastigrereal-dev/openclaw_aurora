import { useEffect, useState, useCallback } from 'react';
import { getOpenClawWebSocket, OpenClawEvent } from '@/services/openclawWebSocket';
import { ActivityItem } from '@/components/ActivityFeed';

interface UseOpenClawWebSocketOptions {
  autoConnect?: boolean;
  onEvent?: (event: OpenClawEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useOpenClawWebSocket({
  autoConnect = true,
  onEvent,
  onConnectionChange,
}: UseOpenClawWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ws = getOpenClawWebSocket();

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      await ws.connect();
      setIsConnected(true);
      onConnectionChange?.(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Erro ao conectar WebSocket:', error);
      onConnectionChange?.(false);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, ws, onConnectionChange]);

  const disconnect = useCallback(() => {
    ws.disconnect();
    setIsConnected(false);
    onConnectionChange?.(false);
  }, [ws, onConnectionChange]);

  const send = useCallback(
    (message: any) => {
      ws.send(message);
    },
    [ws]
  );

  useEffect(() => {
    // Registrar handlers
    const unsubscribeMessage = ws.onMessage((event) => {
      onEvent?.(event);
    });

    const unsubscribeConnection = ws.onConnectionChange((connected) => {
      setIsConnected(connected);
      onConnectionChange?.(connected);
    });

    // Auto-connect se solicitado
    if (autoConnect && !isConnected && !isConnecting) {
      connect();
    }

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
    };
  }, [autoConnect, isConnected, isConnecting, connect, ws, onEvent, onConnectionChange]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
  };
}
