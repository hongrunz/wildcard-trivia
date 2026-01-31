'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(roomId: string | null, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const shouldReconnect = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (!roomId || typeof window === 'undefined') return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Connect to WebSocket
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const protocol = apiUrl.startsWith('https://') ? 'wss:' : 'ws:';
      // Remove http:// or https:// prefix and construct WebSocket URL
      const host = apiUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${protocol}//${host}/ws/${roomId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessageRef.current?.(message);
        } catch {
          // Ignore unparseable WebSocket messages
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        onCloseRef.current?.();

        // Attempt to reconnect only for abnormal closures with exponential backoff
        if (reconnect && shouldReconnect.current && !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s
          const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        }
      };

      ws.onerror = (error) => {
        // WebSocket errors don't provide detailed information in browsers
        onErrorRef.current?.(error);
      };
    } catch (error) {
      // Failed to create WebSocket connection
    }
  }, [roomId, reconnect, reconnectInterval]);

  // Connect on mount and when roomId changes
  useEffect(() => {
    if (roomId) {
      shouldReconnect.current = true;
      reconnectAttemptsRef.current = 0; // Reset attempts on room change
      connect();
    }

    // Cleanup on unmount
    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    sendMessage,
  };
}
