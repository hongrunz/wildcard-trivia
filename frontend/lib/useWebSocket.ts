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
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', { 
          code: event.code, 
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean 
        });
        setIsConnected(false);
        wsRef.current = null;
        onClose?.();

        // Attempt to reconnect only for abnormal closures with exponential backoff
        if (reconnect && shouldReconnect.current && !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s
          const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
          console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${backoffDelay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('Max reconnection attempts reached. WebSocket will not reconnect.');
        }
      };

      ws.onerror = (error) => {
        // WebSocket errors don't provide detailed information in browsers
        // Only log if we're not connected (actual connection error)
        if (!isConnected) {
          console.warn('WebSocket connection error - will retry if reconnect is enabled');
        }
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [roomId, onMessage, onOpen, onClose, onError, reconnect, reconnectInterval]);

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
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    isConnected,
    sendMessage,
  };
}
