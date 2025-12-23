import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface SuggestionData {
  id: string;
  title: string;
  content: string;
  relevance_score: number;
  source_document: string;
  page_number: number;
  paragraph_number?: number;
  citations: any[];
  context_match: any;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  error?: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  suggestions: SuggestionData[];
  sendCaseContext: (context: any) => void;
  clearSuggestions: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const clientId = React.useMemo(() => {
    return `client_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }, []);

  const connectWebSocket = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Initialize native WebSocket connection
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8002';
    const fullWsUrl = `${wsUrl}/ws/${clientId}`;
    
    console.log(`Attempting WebSocket connection to: ${fullWsUrl} (Attempt ${reconnectAttempts + 1})`);
    setConnectionStatus('connecting');
    
    let newSocket: WebSocket;
    
    try {
      newSocket = new WebSocket(fullWsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      
      // Attempt to reconnect
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      } else {
        toast.error('Failed to connect to knowledge system. Please refresh the page.');
      }
      return;
    }

    // Connection event handlers
    newSocket.onopen = () => {
      console.log('✓ WebSocket connected successfully:', clientId);
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0); // Reset reconnect counter on success
      toast.success('Connected to knowledge system', { duration: 2000 });
    };

    newSocket.onclose = (event) => {
      console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect if it wasn't a normal closure
      if (event.code !== 1000 && reconnectAttempts < 5) {
        const delay = Math.min(2000 * (reconnectAttempts + 1), 10000);
        console.log(`Connection lost. Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, delay);
      }
    };

    newSocket.onerror = (error: Event) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
      
      // Only show error toast on first attempt
      if (reconnectAttempts === 0) {
        toast.error('Connection to knowledge system failed. Retrying...');
      }
    };

    // Message handlers
    newSocket.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        if (data.type === 'suggestions' && Array.isArray(data.data)) {
          setSuggestions(data.data);
          toast.success(`${data.data.length} new suggestions received`);
        } else if (data.error) {
          console.error('WebSocket error:', data);
          toast.error(data.error || 'An error occurred');
        } else {
          console.log('Status update:', data);
          // Handle other message types
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    setSocket(newSocket);
  }, [clientId, reconnectAttempts]);

  useEffect(() => {
    // Initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Component unmounting');
      }
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [connectWebSocket]);

  const sendCaseContext = useCallback((context: any) => {
    if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
      console.log('Sending case context:', context);
      const message = JSON.stringify({
        ...context,
        client_id: clientId,
        timestamp: Date.now(),
      });
      socket.send(message);
    } else {
      console.warn('Cannot send case context: WebSocket not connected');
      toast.error('Not connected to knowledge system');
    }
  }, [socket, isConnected, clientId]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    suggestions,
    sendCaseContext,
    clearSuggestions,
    connectionStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}