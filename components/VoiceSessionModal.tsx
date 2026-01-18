/**
 * Voice Session Modal Component
 * 
 * Features:
 * - Real-time voice conversation interface
 * - Connection status indicators
 * - Audio level visualization
 * - WebSocket connection management
 * - Automatic reconnection with exponential backoff
 * - Integration with ShenmaService priority features
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, 
  Wifi, WifiOff, Settings, X, AlertCircle 
} from 'lucide-react';
import { ShenmaService, VoiceSessionConfig, VoiceSessionResponse, VoiceSessionStatus } from '../services/shenmaService';

interface VoiceSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shenmaService: ShenmaService;
  lang?: 'zh' | 'en';
}

interface VoiceConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  language: string;
  instructions?: string;
}

interface LocalSessionStatus {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  audioLevel: number;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  errorMessage?: string;
}

const VoiceSessionModal: React.FC<VoiceSessionModalProps> = ({
  isOpen,
  onClose,
  shenmaService,
  lang = 'zh'
}) => {
  const [sessionStatus, setSessionStatus] = useState<LocalSessionStatus>({
    status: 'idle',
    audioLevel: 0,
    connectionQuality: 'good'
  });
  const [config, setConfig] = useState<VoiceConfig>({
    voice: 'alloy',
    language: 'zh-CN',
    instructions: '你是一个友好的AI助手，可以进行实时语音对话。'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [currentSession, setCurrentSession] = useState<VoiceSessionResponse | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    zh: {
      title: '语音对话',
      connecting: '连接中...',
      connected: '已连接',
      disconnected: '已断开',
      speaking: '正在说话',
      listening: '正在听取',
      error: '连接错误',
      connect: '开始对话',
      disconnect: '结束对话',
      reconnect: '重新连接',
      settings: '设置',
      voice: '语音',
      language: '语言',
      instructions: '指令',
      audioLevel: '音频级别',
      connectionQuality: '连接质量',
      poor: '差',
      fair: '一般',
      good: '良好',
      excellent: '优秀',
      microphoneAccess: '需要麦克风权限',
      grantPermission: '授予权限',
      close: '关闭',
      sessionExpired: '会话已过期',
      providerNotSupported: '当前AI服务商不支持语音功能'
    },
    en: {
      title: 'Voice Conversation',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      speaking: 'Speaking',
      listening: 'Listening',
      error: 'Connection Error',
      connect: 'Start Conversation',
      disconnect: 'End Conversation',
      reconnect: 'Reconnect',
      settings: 'Settings',
      voice: 'Voice',
      language: 'Language',
      instructions: 'Instructions',
      audioLevel: 'Audio Level',
      connectionQuality: 'Connection Quality',
      poor: 'Poor',
      fair: 'Fair',
      good: 'Good',
      excellent: 'Excellent',
      microphoneAccess: 'Microphone access required',
      grantPermission: 'Grant Permission',
      close: 'Close',
      sessionExpired: 'Session expired',
      providerNotSupported: 'Voice features not supported by current AI provider'
    }
  };

  // Initialize audio context
  useEffect(() => {
    if (isOpen) {
      initializeAudioContext();
    }
    
    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Status polling for active sessions
  useEffect(() => {
    if (currentSession && sessionStatus.status === 'connected') {
      startStatusPolling();
    } else {
      stopStatusPolling();
    }

    return () => stopStatusPolling();
  }, [currentSession, sessionStatus.status]);

  const initializeAudioContext = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('[VoiceSession] Failed to initialize audio:', error);
      setSessionStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Microphone access denied'
      }));
    }
  };

  const startStatusPolling = () => {
    if (!currentSession || statusPollingRef.current) return;

    statusPollingRef.current = setInterval(async () => {
      try {
        const status = await shenmaService.getVoiceSessionStatus(currentSession.sessionId);
        updateSessionStatus(status);
      } catch (error) {
        console.error('[VoiceSession] Status polling failed:', error);
        // Don't immediately error out, just log and continue
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopStatusPolling = () => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
  };

  const updateSessionStatus = (status: VoiceSessionStatus) => {
    setSessionStatus(prev => ({
      ...prev,
      audioLevel: status.audioLevel / 100,
      connectionQuality: status.connectionQuality,
      errorMessage: status.error
    }));

    // Handle session expiration or errors
    if (status.status === 'expired' || status.status === 'error') {
      setSessionStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: status.status === 'expired' ? t[lang].sessionExpired : status.error
      }));
      
      if (status.reconnectAttempts < 3) {
        scheduleReconnect();
      }
    }
  };

  const createVoiceSession = async (): Promise<VoiceSessionResponse> => {
    const sessionConfig: VoiceSessionConfig = {
      model: 'voice-chat-1',
      language: config.language,
      voiceId: config.voice,
      autoReconnect: true,
      maxDuration: 3600, // 1 hour
      audioFormat: 'webm',
      sampleRate: 16000,
      enableVAD: true,
      silenceTimeout: 30000
    };

    return await shenmaService.generateVoiceChatLink(sessionConfig);
  };

  const connectToSession = async (session: VoiceSessionResponse) => {
    if (sessionStatus.status === 'connecting' || sessionStatus.status === 'connected') {
      return;
    }

    setIsConnecting(true);
    setSessionStatus(prev => ({ ...prev, status: 'connecting' }));

    try {
      // Create WebSocket connection
      const ws = new WebSocket(session.websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VoiceSession] WebSocket connected');
        setSessionStatus(prev => ({
          ...prev,
          status: 'connected',
          connectionQuality: 'good'
        }));
        setIsConnecting(false);
        setReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event);
      };

      ws.onclose = (event) => {
        console.log('[VoiceSession] WebSocket closed:', event.code, event.reason);
        setSessionStatus(prev => ({ ...prev, status: 'disconnected' }));
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts < 5) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('[VoiceSession] WebSocket error:', error);
        setSessionStatus(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'Connection failed'
        }));
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('[VoiceSession] Connection failed:', error);
      setSessionStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to connect'
      }));
      setIsConnecting(false);
    }
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'session.created':
          console.log('[VoiceSession] Session created');
          break;
          
        case 'input_audio_buffer.speech_started':
          setSessionStatus(prev => ({ ...prev, status: 'listening' }));
          break;
          
        case 'input_audio_buffer.speech_stopped':
          setSessionStatus(prev => ({ ...prev, status: 'connected' }));
          break;
          
        case 'response.audio.delta':
          setSessionStatus(prev => ({ ...prev, status: 'speaking' }));
          // Handle audio playback
          if (data.delta) {
            playAudioDelta(data.delta);
          }
          break;
          
        case 'response.audio.done':
          setSessionStatus(prev => ({ ...prev, status: 'connected' }));
          break;
          
        case 'error':
          console.error('[VoiceSession] Session error:', data.error);
          setSessionStatus(prev => ({
            ...prev,
            status: 'error',
            errorMessage: data.error.message
          }));
          break;
      }
    } catch (error) {
      console.error('[VoiceSession] Failed to parse message:', error);
    }
  };

  const playAudioDelta = async (delta: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 audio data
      const audioData = atob(delta);
      const audioBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(audioBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      // Decode and play audio
      const decodedBuffer = await audioContextRef.current.decodeAudioData(audioBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('[VoiceSession] Audio playback failed:', error);
    }
  };

  const scheduleReconnect = () => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      setReconnectAttempts(prev => prev + 1);
      if (currentSession) {
        await connectToSession(currentSession);
      }
    }, delay);
  };

  const handleConnect = async () => {
    try {
      // Check if ShenmaService supports voice features
      if (!shenmaService.config.baseUrl.includes('shenma')) {
        setSessionStatus(prev => ({
          ...prev,
          status: 'error',
          errorMessage: t[lang].providerNotSupported
        }));
        return;
      }

      const session = await createVoiceSession();
      setCurrentSession(session);
      await connectToSession(session);
    } catch (error) {
      console.error('[VoiceSession] Failed to create session:', error);
      setSessionStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to create session'
      }));
    }
  };

  const handleDisconnect = async () => {
    // Terminate session on server
    if (currentSession) {
      try {
        await shenmaService.terminateVoiceSession(currentSession.sessionId);
      } catch (error) {
        console.error('[VoiceSession] Failed to terminate session:', error);
      }
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopStatusPolling();
    setCurrentSession(null);
    setSessionStatus(prev => ({ ...prev, status: 'idle' }));
    setReconnectAttempts(0);
  };

  const cleanup = () => {
    handleDisconnect();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const getStatusColor = () => {
    switch (sessionStatus.status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'speaking': return 'text-blue-500';
      case 'listening': return 'text-purple-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionIcon = () => {
    switch (sessionStatus.status) {
      case 'connected':
      case 'speaking':
      case 'listening':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t[lang].title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t[lang].settings}
            >
              <Settings size={20} className="text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {getConnectionIcon()}
              <div>
                <p className={`font-medium ${getStatusColor()}`}>
                  {t[lang][sessionStatus.status] || sessionStatus.status}
                </p>
                {sessionStatus.errorMessage && (
                  <p className="text-sm text-red-500 mt-1">
                    {sessionStatus.errorMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {t[lang].connectionQuality}
              </p>
              <p className="text-sm font-medium">
                {t[lang][sessionStatus.connectionQuality]}
              </p>
            </div>
          </div>

          {/* Audio Level Indicator */}
          {(sessionStatus.status === 'connected' || sessionStatus.status === 'listening' || sessionStatus.status === 'speaking') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t[lang].audioLevel}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(sessionStatus.audioLevel * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${sessionStatus.audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[lang].voice}
                </label>
                <select
                  value={config.voice}
                  onChange={(e) => setConfig(prev => ({ ...prev, voice: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={sessionStatus.status !== 'idle'}
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[lang].language}
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={sessionStatus.status !== 'idle'}
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[lang].instructions}
                </label>
                <textarea
                  value={config.instructions}
                  onChange={(e) => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  disabled={sessionStatus.status !== 'idle'}
                />
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {sessionStatus.status === 'idle' || sessionStatus.status === 'error' ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Phone size={20} />
                {isConnecting ? t[lang].connecting : t[lang].connect}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <PhoneOff size={20} />
                {t[lang].disconnect}
              </button>
            )}

            {sessionStatus.status === 'error' && reconnectAttempts < 5 && (
              <button
                onClick={() => currentSession && connectToSession(currentSession)}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Wifi size={20} />
                {t[lang].reconnect}
              </button>
            )}
          </div>

          {/* Microphone Permission Warning */}
          {sessionStatus.errorMessage === 'Microphone access denied' && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t[lang].microphoneAccess}
                </p>
                <button
                  onClick={initializeAudioContext}
                  className="text-sm text-yellow-600 hover:text-yellow-800 underline mt-1"
                >
                  {t[lang].grantPermission}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceSessionModal;