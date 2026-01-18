/**
 * Voice Session Manager
 * 
 * Handles voice session state management including:
 * - Session creation, monitoring, and cleanup
 * - Automatic reconnection with exponential backoff
 * - Connection error handling and status updates
 * - Audio stream management and resource cleanup
 * 
 * Requirements: 1.4 (Voice session state management)
 */

import { ShenmaService, VoiceSessionConfig, VoiceSessionResponse, VoiceSessionStatus } from './shenmaService';

export interface VoiceSession {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  audioLevel: number;
  connectionUrl: string;
  reconnectAttempts: number;
  websocket?: WebSocket;
  createdAt: number;
  lastActivity: number;
  config: VoiceSessionConfig;
}

export interface VoiceSessionManagerConfig {
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;
  maxReconnectDelay: number;
  sessionTimeout: number;
  statusPollingInterval: number;
}

export type VoiceSessionEventType = 
  | 'session-created'
  | 'session-connected'
  | 'session-disconnected'
  | 'session-error'
  | 'session-expired'
  | 'audio-level-changed'
  | 'reconnect-attempt';

export interface VoiceSessionEvent {
  type: VoiceSessionEventType;
  sessionId: string;
  data?: any;
  timestamp: number;
}

export class VoiceSessionManager {
  private shenmaService: ShenmaService;
  private sessions: Map<string, VoiceSession> = new Map();
  private eventListeners: Map<VoiceSessionEventType, Set<(event: VoiceSessionEvent) => void>> = new Map();
  private statusPollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: VoiceSessionManagerConfig;

  constructor(
    shenmaService: ShenmaService,
    config: Partial<VoiceSessionManagerConfig> = {}
  ) {
    this.shenmaService = shenmaService;
    this.config = {
      maxReconnectAttempts: 5,
      reconnectBaseDelay: 1000,
      maxReconnectDelay: 30000,
      sessionTimeout: 3600000, // 1 hour
      statusPollingInterval: 5000, // 5 seconds
      ...config
    };

    // Initialize event listener maps
    const eventTypes: VoiceSessionEventType[] = [
      'session-created', 'session-connected', 'session-disconnected',
      'session-error', 'session-expired', 'audio-level-changed', 'reconnect-attempt'
    ];
    eventTypes.forEach(type => {
      this.eventListeners.set(type, new Set());
    });
  }

  /**
   * Create a new voice session
   * Requirements: 1.4
   */
  async createSession(config: VoiceSessionConfig): Promise<VoiceSession> {
    console.log('[VoiceSessionManager] Creating new voice session');

    try {
      // Create session through ShenmaService
      const sessionResponse = await this.shenmaService.generateVoiceChatLink(config);
      
      const session: VoiceSession = {
        id: sessionResponse.sessionId,
        status: 'connecting',
        audioLevel: 0,
        connectionUrl: sessionResponse.websocketUrl,
        reconnectAttempts: 0,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        config
      };

      // Store session
      this.sessions.set(session.id, session);

      // Emit session created event
      this.emitEvent('session-created', session.id, { session });

      // Start status monitoring
      this.startStatusPolling(session.id);

      // Set up session timeout
      this.setupSessionTimeout(session.id);

      console.log('[VoiceSessionManager] Voice session created:', session.id);
      return session;
    } catch (error) {
      console.error('[VoiceSessionManager] Failed to create voice session:', error);
      throw error;
    }
  }

  /**
   * Destroy a voice session and clean up resources
   * Requirements: 1.4
   */
  async destroySession(sessionId: string): Promise<void> {
    console.log('[VoiceSessionManager] Destroying voice session:', sessionId);

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn('[VoiceSessionManager] Session not found for destruction:', sessionId);
      return;
    }

    try {
      // Terminate session on server
      await this.shenmaService.terminateVoiceSession(sessionId);
    } catch (error) {
      console.error('[VoiceSessionManager] Failed to terminate session on server:', error);
    }

    // Close WebSocket connection
    if (session.websocket) {
      session.websocket.close(1000, 'Session destroyed');
    }

    // Clean up timers and intervals
    this.stopStatusPolling(sessionId);
    this.clearReconnectTimeout(sessionId);

    // Update session status
    session.status = 'disconnected';
    this.emitEvent('session-disconnected', sessionId, { reason: 'destroyed' });

    // Remove session from storage
    this.sessions.delete(sessionId);

    console.log('[VoiceSessionManager] Voice session destroyed:', sessionId);
  }

  /**
   * Connect to a voice session via WebSocket
   * Requirements: 1.4
   */
  async connectToSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
      console.log('[VoiceSessionManager] Session already connected:', sessionId);
      return;
    }

    console.log('[VoiceSessionManager] Connecting to voice session:', sessionId);

    try {
      const websocket = new WebSocket(session.connectionUrl);
      session.websocket = websocket;
      session.status = 'connecting';

      websocket.onopen = () => {
        console.log('[VoiceSessionManager] WebSocket connected for session:', sessionId);
        session.status = 'connected';
        session.reconnectAttempts = 0;
        session.lastActivity = Date.now();
        this.emitEvent('session-connected', sessionId);
      };

      websocket.onmessage = (event) => {
        this.handleWebSocketMessage(sessionId, event);
      };

      websocket.onclose = (event) => {
        console.log('[VoiceSessionManager] WebSocket closed for session:', sessionId, event.code, event.reason);
        
        if (session.status !== 'disconnected') {
          session.status = 'disconnected';
          this.emitEvent('session-disconnected', sessionId, { 
            code: event.code, 
            reason: event.reason 
          });

          // Attempt reconnection if not intentionally closed
          if (event.code !== 1000 && session.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect(sessionId);
          }
        }
      };

      websocket.onerror = (error) => {
        console.error('[VoiceSessionManager] WebSocket error for session:', sessionId, error);
        session.status = 'error';
        this.emitEvent('session-error', sessionId, { error });
      };

    } catch (error) {
      console.error('[VoiceSessionManager] Failed to connect to session:', sessionId, error);
      session.status = 'error';
      this.emitEvent('session-error', sessionId, { error });
      throw error;
    }
  }

  /**
   * Get current session status
   * Requirements: 1.4
   */
  getSessionStatus(sessionId: string): VoiceSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   * Requirements: 1.4
   */
  getAllSessions(): VoiceSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Add event listener for session events
   * Requirements: 1.4
   */
  addEventListener(
    eventType: VoiceSessionEventType,
    listener: (event: VoiceSessionEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   * Requirements: 1.4
   */
  removeEventListener(
    eventType: VoiceSessionEventType,
    listener: (event: VoiceSessionEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Clean up all sessions and resources
   * Requirements: 1.4
   */
  async cleanup(): Promise<void> {
    console.log('[VoiceSessionManager] Cleaning up all sessions');

    const sessionIds = Array.from(this.sessions.keys());
    
    // Destroy all sessions
    await Promise.all(
      sessionIds.map(sessionId => this.destroySession(sessionId))
    );

    // Clear all event listeners
    this.eventListeners.forEach(listeners => listeners.clear());

    console.log('[VoiceSessionManager] Cleanup completed');
  }

  // Private methods

  private emitEvent(
    type: VoiceSessionEventType,
    sessionId: string,
    data?: any
  ): void {
    const event: VoiceSessionEvent = {
      type,
      sessionId,
      data,
      timestamp: Date.now()
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[VoiceSessionManager] Error in event listener:', error);
        }
      });
    }
  }

  private startStatusPolling(sessionId: string): void {
    if (this.statusPollingIntervals.has(sessionId)) {
      return; // Already polling
    }

    const interval = setInterval(async () => {
      try {
        const session = this.sessions.get(sessionId);
        if (!session) {
          this.stopStatusPolling(sessionId);
          return;
        }

        // Get status from server
        const serverStatus = await this.shenmaService.getVoiceSessionStatus(sessionId);
        
        // Update local session with server status
        const oldAudioLevel = session.audioLevel;
        session.audioLevel = serverStatus.audioLevel / 100;
        session.lastActivity = serverStatus.lastActivity;

        // Emit audio level change if significant
        if (Math.abs(session.audioLevel - oldAudioLevel) > 0.05) {
          this.emitEvent('audio-level-changed', sessionId, { 
            audioLevel: session.audioLevel 
          });
        }

        // Handle session expiration
        if (serverStatus.status === 'expired') {
          session.status = 'error';
          this.emitEvent('session-expired', sessionId);
          this.stopStatusPolling(sessionId);
        }

      } catch (error) {
        console.error('[VoiceSessionManager] Status polling error for session:', sessionId, error);
        // Continue polling despite errors
      }
    }, this.config.statusPollingInterval);

    this.statusPollingIntervals.set(sessionId, interval);
  }

  private stopStatusPolling(sessionId: string): void {
    const interval = this.statusPollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.statusPollingIntervals.delete(sessionId);
    }
  }

  private scheduleReconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Clear any existing reconnect timeout
    this.clearReconnectTimeout(sessionId);

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, session.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    console.log(`[VoiceSessionManager] Scheduling reconnect for session ${sessionId} in ${delay}ms (attempt ${session.reconnectAttempts + 1})`);

    const timeout = setTimeout(async () => {
      session.reconnectAttempts++;
      this.emitEvent('reconnect-attempt', sessionId, { 
        attempt: session.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts
      });

      try {
        await this.connectToSession(sessionId);
      } catch (error) {
        console.error('[VoiceSessionManager] Reconnect failed for session:', sessionId, error);
        
        if (session.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect(sessionId);
        } else {
          session.status = 'error';
          this.emitEvent('session-error', sessionId, { 
            error: 'Max reconnect attempts exceeded' 
          });
        }
      }
    }, delay);

    this.reconnectTimeouts.set(sessionId, timeout);
  }

  private clearReconnectTimeout(sessionId: string): void {
    const timeout = this.reconnectTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(sessionId);
    }
  }

  private setupSessionTimeout(sessionId: string): void {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.status !== 'disconnected') {
        console.log('[VoiceSessionManager] Session timeout reached:', sessionId);
        this.emitEvent('session-expired', sessionId);
        this.destroySession(sessionId);
      }
    }, this.config.sessionTimeout);
  }

  private handleWebSocketMessage(sessionId: string, event: MessageEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const data = JSON.parse(event.data);
      session.lastActivity = Date.now();

      switch (data.type) {
        case 'session.created':
          console.log('[VoiceSessionManager] Session created on server:', sessionId);
          break;

        case 'input_audio_buffer.speech_started':
          // User started speaking
          break;

        case 'input_audio_buffer.speech_stopped':
          // User stopped speaking
          break;

        case 'response.audio.delta':
          // AI is speaking - audio data received
          if (data.audio_level !== undefined) {
            const oldLevel = session.audioLevel;
            session.audioLevel = data.audio_level / 100;
            
            if (Math.abs(session.audioLevel - oldLevel) > 0.05) {
              this.emitEvent('audio-level-changed', sessionId, { 
                audioLevel: session.audioLevel 
              });
            }
          }
          break;

        case 'response.audio.done':
          // AI finished speaking
          break;

        case 'error':
          console.error('[VoiceSessionManager] Session error:', sessionId, data.error);
          session.status = 'error';
          this.emitEvent('session-error', sessionId, { error: data.error });
          break;

        default:
          console.log('[VoiceSessionManager] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[VoiceSessionManager] Failed to parse WebSocket message:', error);
    }
  }
}

export default VoiceSessionManager;