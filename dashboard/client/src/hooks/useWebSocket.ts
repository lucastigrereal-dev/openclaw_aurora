import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectAttempts = 5,
  reconnectDelay = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        const error = new Error('WebSocket error');
        console.error('❌ WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('⚠️ WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          setIsReconnecting(true);
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Reconnecting... (attempt ${reconnectCountRef.current}/${reconnectAttempts})`);
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to create WebSocket:', err);
      onError?.(err);
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnectAttempts, reconnectDelay]);

  const send = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        })
      );
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isReconnecting,
    send,
    disconnect,
    reconnectAttempts: reconnectCountRef.current,
  };
}
