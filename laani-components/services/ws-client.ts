import type { WebSocketMessage } from '../types/laani-types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

export type WebSocketEventHandler = (data: any) => void;

export class ReflectorWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private authToken: string | null = null;
  private userId: string | null = null;
  private connectionId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private baseURL: string = WS_BASE_URL) {}

  // Connection Management
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;
      
      try {
        this.ws = new WebSocket(this.baseURL);
        
        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected to Reflector Codex');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate if token provided
          if (token) {
            this.authenticate(token);
          }
          
          // Start heartbeat
          this.startHeartbeat();
          
          this.emit('connected', { connectionId: this.connectionId });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
          
          this.emit('disconnected', { code: event.code, reason: event.reason });
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', { error });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    
    this.userId = null;
    this.connectionId = null;
    this.authToken = null;
  }

  // Authentication
  authenticate(token: string) {
    this.authToken = token;
    this.send({
      type: 'auth',
      token
    });
  }

  // Message Handling
  private handleMessage(message: WebSocketMessage) {
    console.log('📨 WebSocket message received:', message.type);

    switch (message.type) {
      case 'welcome':
        this.connectionId = message.connectionId || null;
        this.emit('welcome', message);
        break;

      case 'auth_success':
        this.userId = message.userId || null;
        console.log(`🔐 WebSocket authenticated for user: ${this.userId}`);
        this.emit('authenticated', { userId: this.userId });
        break;

      case 'auth_error':
        console.error('WebSocket authentication failed:', message.message);
        this.emit('authError', message);
        break;

      case 'pong':
        // Heartbeat response - no action needed
        break;

      case 'reflection_complete':
        this.emit('reflectionComplete', message.data);
        break;

      case 'memory_surfaced':
        this.emit('memorySurfaced', message.data);
        break;

      case 'glyph_evolved':
        this.emit('glyphEvolved', message.data);
        break;

      case 'ambient_shift':
        this.emit('ambientShift', message.data);
        break;

      case 'error':
        console.error('WebSocket server error:', message.message);
        this.emit('serverError', message);
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
        this.emit('unknownMessage', message);
    }
  }

  // Event System
  on(event: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Message Sending
  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  // Heartbeat
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Reconnection
  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Scheduling WebSocket reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.authToken) {
        this.connect(this.authToken);
      } else {
        this.connect();
      }
    }, delay);
  }

  // Getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  get userInfo() {
    return {
      userId: this.userId,
      connectionId: this.connectionId,
      isAuthenticated: !!this.userId
    };
  }
}

// Create singleton instance
export const reflectorWS = new ReflectorWebSocketClient();

// React Hook for WebSocket (requires React to be imported in consuming component)
export function useReflectorWebSocket(token?: string, useState?: any, useEffect?: any) {
  if (!useState || !useEffect) {
    throw new Error('useReflectorWebSocket requires useState and useEffect from React');
  }
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [userInfo, setUserInfo] = useState(reflectorWS.userInfo);

  useEffect(() => {
    // Update connection status
    const updateStatus = () => {
      setConnectionStatus(reflectorWS.connectionStatus);
      setUserInfo(reflectorWS.userInfo);
    };

    // Set up event listeners
    reflectorWS.on('connected', updateStatus);
    reflectorWS.on('disconnected', updateStatus);
    reflectorWS.on('authenticated', updateStatus);
    reflectorWS.on('error', updateStatus);

    // Connect if token provided and not already connected
    if (token && !reflectorWS.isConnected) {
      reflectorWS.connect(token);
    }

    // Initial status update
    updateStatus();

    // Cleanup
    return () => {
      reflectorWS.off('connected', updateStatus);
      reflectorWS.off('disconnected', updateStatus);
      reflectorWS.off('authenticated', updateStatus);
      reflectorWS.off('error', updateStatus);
    };
  }, [token]);

  return {
    connectionStatus,
    userInfo,
    connect: (authToken?: string) => reflectorWS.connect(authToken),
    disconnect: () => reflectorWS.disconnect(),
    send: (message: WebSocketMessage) => reflectorWS.send(message),
    on: (event: string, handler: WebSocketEventHandler) => reflectorWS.on(event, handler),
    off: (event: string, handler: WebSocketEventHandler) => reflectorWS.off(event, handler)
  };
}

// Convenience hooks for specific events
export function useReflectionUpdates(useState?: any, useEffect?: any) {
  if (!useState || !useEffect) {
    throw new Error('useReflectionUpdates requires useState and useEffect from React');
  }
  
  const [reflections, setReflections] = useState([]);

  useEffect(() => {
    const handleReflection = (data: any) => {
      setReflections(prev => [...prev, data]);
    };

    reflectorWS.on('reflectionComplete', handleReflection);

    return () => {
      reflectorWS.off('reflectionComplete', handleReflection);
    };
  }, []);

  return reflections;
}

export function useMemorySurfacing(useState?: any, useEffect?: any) {
  if (!useState || !useEffect) {
    throw new Error('useMemorySurfacing requires useState and useEffect from React');
  }
  
  const [surfacedMemories, setSurfacedMemories] = useState([]);

  useEffect(() => {
    const handleMemory = (data: any) => {
      setSurfacedMemories(prev => [...prev, data]);
    };

    reflectorWS.on('memorySurfaced', handleMemory);

    return () => {
      reflectorWS.off('memorySurfaced', handleMemory);
    };
  }, []);

  return surfacedMemories;
}

export function useGlyphEvolution(useState?: any, useEffect?: any) {
  if (!useState || !useEffect) {
    throw new Error('useGlyphEvolution requires useState and useEffect from React');
  }
  
  const [glyphUpdates, setGlyphUpdates] = useState([]);

  useEffect(() => {
    const handleGlyph = (data: any) => {
      setGlyphUpdates(prev => [...prev, data]);
    };

    reflectorWS.on('glyphEvolved', handleGlyph);

    return () => {
      reflectorWS.off('glyphEvolved', handleGlyph);
    };
  }, []);

  return glyphUpdates;
}

export function useAmbientState(useState?: any, useEffect?: any) {
  if (!useState || !useEffect) {
    throw new Error('useAmbientState requires useState and useEffect from React');
  }
  
  const [ambientState, setAmbientState] = useState('idle');

  useEffect(() => {
    const handleAmbient = (data: any) => {
      setAmbientState(data.state || 'idle');
    };

    reflectorWS.on('ambientShift', handleAmbient);

    return () => {
      reflectorWS.off('ambientShift', handleAmbient);
    };
  }, []);

  return ambientState;
}

// Note: React hooks are passed as parameters to avoid direct React dependency
// In your component, import React and pass useState and useEffect:
// import React, { useState, useEffect } from 'react';
// const wsHook = useReflectorWebSocket(token, useState, useEffect);
