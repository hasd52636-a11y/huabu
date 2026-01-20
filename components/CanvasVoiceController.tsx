/**
 * Canvas Voice Controller - 画布语音控制组件
 * 使用神马API的Realtime语音对话功能，无需连接谷歌服务
 * 支持实时语音识别和AI对话
 * 注意：此组件仅负责语音技术实现，UI交互由CaocaoAIChat统一管理
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Block } from '../types';
import { voiceCanvasReporter, VoiceModuleCommand } from '../services/VoiceCanvasReporter';

// 神马API Realtime WebSocket接口 - 基于完整文档规范
interface RealtimeSession {
  ws: WebSocket | null;
  sessionId: string;
  isConnected: boolean;
}

interface RealtimeEvent {
  type: string;
  event_id?: string;
  // Session events
  session?: {
    id?: string;
    object?: string;
    model?: string;
    modalities?: string[];
    instructions?: string;
    voice?: string;
    input_audio_format?: string;
    output_audio_format?: string;
    input_audio_transcription?: {
      enabled?: boolean;
      model?: string;
    };
    turn_detection?: {
      type?: string;
      threshold?: number;
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
    };
    tools?: any[];
    tool_choice?: string;
    temperature?: number;
    max_output_tokens?: number | string;
  };
  // Response events
  response?: {
    id?: string;
    object?: string;
    status?: string;
    status_details?: any;
    output?: any[];
    usage?: any;
  };
  response_id?: string;
  output_index?: number;
  // Item events
  item?: {
    id?: string;
    object?: string;
    type?: string;
    status?: string;
    role?: string;
    content?: any[];
    call_id?: string;
    name?: string;
    arguments?: string;
    output?: string;
  };
  item_id?: string;
  content_index?: number;
  // Audio events
  audio?: string;
  audio_start_ms?: number;
  audio_end_ms?: number;
  // Text events
  transcript?: string;
  text?: string;
  delta?: string;
  // Function call events
  call_id?: string;
  arguments?: string;
  // Error events
  error?: {
    type?: string;
    code?: string;
    message?: string;
    param?: string;
    event_id?: string;
  };
  // Content part events
  part?: {
    type?: string;
    text?: string;
    audio?: string;
    transcript?: string;
  };
  // Conversation events
  conversation?: {
    id?: string;
    object?: string;
  };
  previous_item_id?: string;
  // Rate limits
  rate_limits?: Array<{
    name?: string;
    limit?: number;
    remaining?: number;
    reset_seconds?: number;
  }>;
}

// TypeScript declarations for Web Speech API (备用方案)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface VoiceCommand {
  command: 'generate_text' | 'generate_image' | 'generate_video' | 'add_to_canvas' | 'unknown';
  text: string;
  content: string;
  params?: {
    aspectRatio?: string;
    style?: string;
    duration?: number;
  };
}

interface CanvasVoiceControllerProps {
  onCommand: (command: VoiceCommand) => void;
  lang?: 'zh' | 'en';
  wakeWord?: string;
  position?: { x: number; y: number };
  theme?: 'light' | 'dark';
  isActive?: boolean;
  apiSettings?: {
    provider: string;
    apiKey: string;
    baseUrl: string;
  };
  // 新增：消息回调，用于与CaocaoAIChat通信
  onMessage?: (role: 'user' | 'assistant', content: string, type?: 'voice' | 'system') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
  // 新增：画布状态和模块操作
  blocks?: Block[];
  onModuleAction?: (action: string, moduleId?: string, params?: any) => void;
  // 新增：外部消息更新函数
  onDisplayMessageUpdate?: (addMessage: (role: 'user' | 'assistant', content: string) => void) => void;
}

const CanvasVoiceController: React.FC<CanvasVoiceControllerProps> = ({
  onCommand,
  lang = 'zh',
  wakeWord = '曹操',
  position = { x: 20, y: 20 },
  theme = 'light',
  isActive = false,
  apiSettings,
  onMessage,
  onStatusChange,
  blocks = [],
  onModuleAction,
  onDisplayMessageUpdate
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [realtimeSession, setRealtimeSession] = useState<RealtimeSession>({
    ws: null,
    sessionId: '',
    isConnected: false
  });
  const [useRealtimeAPI, setUseRealtimeAPI] = useState<boolean>(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0); // 错误计数器
  const [lastErrorTime, setLastErrorTime] = useState<number>(0); // 最后错误时间
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = {
    zh: {
      wakeUp: `点击开始语音对话`,
      listening: '语音对话中...',
      processing: '正在处理...',
      error: '错误',
      noSupport: '浏览器不支持语音识别',
      micPermission: '需要麦克风权限',
      chatTitle: '语音对话',
      inputPlaceholder: '输入消息或点击语音对话...',
      send: '发送',
      openRealtimeChat: '打开语音对话',
      realtimeMode: '实时语音模式',
      fallbackMode: '浏览器语音模式',
      apiKeyRequired: 'API密钥未配置'
    },
    en: {
      wakeUp: `Click to start voice chat`,
      listening: 'Voice chatting...',
      processing: 'Processing...',
      error: 'Error',
      noSupport: 'Speech recognition not supported',
      micPermission: 'Microphone permission required',
      chatTitle: 'Voice Chat',
      inputPlaceholder: 'Type message or click voice chat...',
      send: 'Send',
      openRealtimeChat: 'Open Voice Chat',
      realtimeMode: 'Realtime Voice Mode',
      fallbackMode: 'Browser Voice Mode',
      apiKeyRequired: 'API Key Required'
    }
  };

  const currentLang = t[lang];

  // 监听激活状态变化，自动开始/停止监听
  useEffect(() => {
    if (isActive && !isListening && !isProcessing) {
      console.log('[CanvasVoiceController] 语音控制激活，自动开始监听');
      if (useRealtimeAPI && apiSettings?.apiKey && apiSettings.apiKey !== 'PLACEHOLDER_API_KEY') {
        // 使用神马API Realtime模式
        initializeRealtimeChat();
      } else {
        // 降级到浏览器语音识别
        setUseRealtimeAPI(false);
        initializeBrowserSpeech();
      }
    } else if (!isActive && (isListening || realtimeSession.isConnected)) {
      console.log('[CanvasVoiceController] 语音控制关闭，停止监听');
      stopListening();
    }
  }, [isActive]);

  // 初始化神马API Realtime WebSocket连接
  const initializeRealtimeChat = async () => {
    if (!apiSettings?.apiKey || apiSettings.apiKey === 'PLACEHOLDER_API_KEY') {
      setError(currentLang.apiKeyRequired);
      onStatusChange?.('error', currentLang.apiKeyRequired);
      handleMessageUpdate('assistant', `❌ ${currentLang.apiKeyRequired}！

🔑 请先配置神马API密钥：
1. 点击右侧边栏的"设置"⚙️按钮
2. 在"API提供商配置"中输入神马API密钥
3. 点击"保存配置"

💡 配置完成后即可使用实时语音对话功能！`, 'system');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      onStatusChange?.('connecting', '正在连接神马API Realtime...');
      
      console.log('[CanvasVoiceController] 初始化神马API Realtime WebSocket连接');
      
      // 构建WebSocket URL - 将HTTP URL转换为WebSocket URL
      const wsUrl = apiSettings.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/v1/realtime';
      
      console.log('[CanvasVoiceController] 连接到:', wsUrl);
      
      // 创建WebSocket连接
      const ws = new WebSocket(wsUrl);
      
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      ws.onopen = () => {
        console.log('[CanvasVoiceController] ✅ WebSocket连接已建立');
        
        setRealtimeSession({
          ws,
          sessionId,
          isConnected: true
        });
        
        // 发送session.update事件配置会话 - 使用完整的神马API规范
        const sessionUpdateEvent = {
          event_id: `event_${Date.now()}`,
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `你是曹操，一个专业的AI画布助手。用户可以通过语音与你对话，你需要：
1. 理解用户的创作需求
2. 帮助用户生成文本、图片、视频内容
3. 将内容添加到画布上
4. 用简洁友好的语言回复

当用户要求生成内容时，请明确说明你将执行的操作。`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            temperature: 0.8,
            max_output_tokens: 'inf'
          }
        };
        
        ws.send(JSON.stringify(sessionUpdateEvent));
        console.log('[CanvasVoiceController] 已发送session.update配置');
        
        setIsListening(true);
        onStatusChange?.('connected', '实时语音对话已连接');
        
        handleMessageUpdate('assistant', `✅ 实时语音对话已连接！

🎤 现在你可以：
1. 直接对着麦克风说话
2. 我会实时听取并回复
3. 说出创作需求，我会生成内容到画布

💡 试试说："曹操，帮我生成一张猫的图片"`, 'system');
        
        // 开始录音
        startAudioRecording();
      };
      
      ws.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (error) {
          console.error('[CanvasVoiceController] 解析WebSocket消息失败:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[CanvasVoiceController] WebSocket错误:', error);
        setError('WebSocket连接错误');
        onStatusChange?.('error', 'WebSocket连接错误');
        
        onMessage?.('assistant', `❌ 实时语音连接出现问题

🔄 正在尝试降级到浏览器语音模式...`, 'system');
        
        // 降级到浏览器语音识别
        setUseRealtimeAPI(false);
        setTimeout(() => initializeBrowserSpeech(), 1000);
      };
      
      ws.onclose = (event) => {
        console.log('[CanvasVoiceController] WebSocket连接已关闭:', event.code, event.reason);
        
        setRealtimeSession({
          ws: null,
          sessionId: '',
          isConnected: false
        });
        
        setIsListening(false);
        onStatusChange?.('disconnected', '语音连接已断开');
        
        if (event.code !== 1000) { // 非正常关闭
          onMessage?.('assistant', '🔌 语音连接已断开，点击重新连接或使用文字输入。', 'system');
        }
      };
      
    } catch (error) {
      console.error('[CanvasVoiceController] Realtime WebSocket初始化失败:', error);
      setError('Realtime连接初始化失败');
      onStatusChange?.('error', 'Realtime连接初始化失败');
      
      // 降级到浏览器语音识别
      onMessage?.('assistant', `⚠️ 实时语音连接失败，已切换到浏览器语音模式。

🔄 错误信息：${error instanceof Error ? error.message : '未知错误'}

💡 你仍然可以使用浏览器的语音识别功能。`, 'system');
      
      setUseRealtimeAPI(false);
      setTimeout(() => initializeBrowserSpeech(), 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理Realtime事件 - 基于完整的神马API文档
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    console.log('[CanvasVoiceController] 收到Realtime事件:', event.type, event);
    
    switch (event.type) {
      // Session events
      case 'session.created':
        console.log('[CanvasVoiceController] 会话已创建:', event.session?.id);
        break;
        
      case 'session.updated':
        console.log('[CanvasVoiceController] 会话配置已更新');
        break;
        
      // Conversation events
      case 'conversation.created':
        console.log('[CanvasVoiceController] 对话已创建:', event.conversation?.id);
        break;
        
      case 'conversation.item.created':
        console.log('[CanvasVoiceController] 对话项已创建:', event.item?.id);
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && event.transcript.trim().length > 0) {
          handleTranscriptionComplete(event.transcript.trim());
        } else {
          console.log('[CanvasVoiceController] 收到空的转录结果，跳过处理');
        }
        break;
        
      case 'conversation.item.input_audio_transcription.failed':
        console.error('[CanvasVoiceController] 语音转录失败:', event.error);
        onMessage?.('assistant', '❌ 语音转录失败，请重试', 'system');
        break;
        
      case 'conversation.item.truncated':
        console.log('[CanvasVoiceController] 对话项已截断:', event.item_id);
        break;
        
      case 'conversation.item.deleted':
        console.log('[CanvasVoiceController] 对话项已删除:', event.item_id);
        break;
        
      // Input audio buffer events
      case 'input_audio_buffer.committed':
        console.log('[CanvasVoiceController] 音频缓冲区已提交:', event.item_id);
        break;
        
      case 'input_audio_buffer.cleared':
        console.log('[CanvasVoiceController] 音频缓冲区已清空');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('[CanvasVoiceController] 检测到语音开始:', event.audio_start_ms);
        onMessage?.('user', '🎤 正在说话...', 'voice');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('[CanvasVoiceController] 语音结束:', event.audio_start_ms);
        break;
        
      // Response events
      case 'response.created':
        console.log('[CanvasVoiceController] AI开始响应:', event.response?.id);
        onMessage?.('assistant', '🤔 正在思考...', 'voice');
        break;
        
      case 'response.done':
        console.log('[CanvasVoiceController] AI响应完成:', event.response?.status);
        break;
        
      // Output item events
      case 'response.output_item.added':
        console.log('[CanvasVoiceController] 输出项已添加:', event.item?.type);
        break;
        
      case 'response.output_item.done':
        console.log('[CanvasVoiceController] 输出项完成:', event.item?.status);
        break;
        
      // Content part events
      case 'response.content_part.added':
        console.log('[CanvasVoiceController] 内容部分已添加:', event.part?.type);
        break;
        
      case 'response.content_part.done':
        if (event.part?.type === 'text' && event.part.text) {
          handleAssistantResponse(event.part.text);
        }
        break;
        
      // Text streaming events
      case 'response.text.delta':
        if (event.delta) {
          console.log('[CanvasVoiceController] 文本增量:', event.delta);
          // 可以实现实时文本流显示
        }
        break;
        
      case 'response.text.done':
        if (event.delta) {
          handleAssistantResponse(event.delta);
        }
        break;
        
      // Audio streaming events
      case 'response.audio.delta':
        if (event.delta) {
          console.log('[CanvasVoiceController] 音频增量接收');
          playAudioDelta(event.delta);
        }
        break;
        
      case 'response.audio.done':
        console.log('[CanvasVoiceController] 音频播放完成');
        break;
        
      // Audio transcript events
      case 'response.audio_transcript.delta':
        if (event.delta) {
          console.log('[CanvasVoiceController] 音频转录增量:', event.delta);
        }
        break;
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          console.log('[CanvasVoiceController] 音频转录完成:', event.transcript);
        }
        break;
        
      // Function call events
      case 'response.function_call_arguments.delta':
        if (event.delta) {
          console.log('[CanvasVoiceController] 函数调用参数增量:', event.delta);
        }
        break;
        
      case 'response.function_call_arguments.done':
        if (event.arguments) {
          console.log('[CanvasVoiceController] 函数调用参数完成:', event.arguments);
        }
        break;
        
      // Rate limits
      case 'rate_limits.updated':
        console.log('[CanvasVoiceController] 速率限制已更新:', event.rate_limits);
        break;
        
      // Error handling
      case 'error':
        console.error('[CanvasVoiceController] Realtime API错误:', event.error);
        const errorMsg = event.error?.message || 'Unknown error';
        onMessage?.('assistant', `❌ 发生错误：${errorMsg}`, 'system');
        break;
        
      default:
        console.log('[CanvasVoiceController] 未处理的事件类型:', event.type);
    }
  };

  // 初始化浏览器语音识别（备用方案）
  const initializeBrowserSpeech = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true; // 启用连续监听
      recognition.interimResults = false; // 禁用中间结果，避免处理不完整的语音
      recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        setErrorCount(0); // 重置错误计数
        console.log('[CanvasVoiceController] 浏览器语音识别启动');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // 只处理最终结果，避免处理空的或不完整的transcript
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          
          // 检查transcript是否有效
          if (transcript && transcript.length > 0) {
            console.log('[CanvasVoiceController] 语音识别结果:', transcript);
            
            // 防抖处理，避免重复处理相同的指令
            setTimeout(() => {
              handleVoiceCommand(transcript);
            }, 100);
          } else {
            console.log('[CanvasVoiceController] 收到空的语音识别结果，跳过处理');
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[CanvasVoiceController] 语音识别错误:', event.error);
        
        // 更新错误计数和时间
        const now = Date.now();
        if (now - lastErrorTime < 5000) { // 5秒内
          setErrorCount(prev => prev + 1);
        } else {
          setErrorCount(1); // 重置为1
        }
        setLastErrorTime(now);
        
        if (event.error === 'not-allowed') {
          setError(currentLang.micPermission);
          onMessage?.('assistant', `❌ 麦克风权限被拒绝！

请按以下步骤操作：
1. 点击地址栏左侧的🔒或🛡️图标
2. 将"麦克风"设置为"允许"
3. 刷新页面后重试`, 'system');
          setIsListening(false);
          setIsProcessing(false);
        } else if (event.error === 'no-speech') {
          console.log('[CanvasVoiceController] 未检测到语音，继续监听...');
          // 不显示错误，不设置isListening为false，让onend处理重启
        } else if (event.error === 'network') {
          console.log('[CanvasVoiceController] 网络错误，尝试重启...');
          // 网络错误时不显示错误消息，不设置isListening为false，让onend处理重启
        } else if (event.error === 'aborted') {
          console.log('[CanvasVoiceController] 语音识别被中止，停止重启循环');
          // aborted错误通常是用户主动停止或浏览器中止，不应该自动重启
          setIsListening(false);
          setIsProcessing(false);
          return; // 直接返回，不执行后续代码
        } else if (event.error === 'audio-capture') {
          console.log('[CanvasVoiceController] 音频捕获错误，停止监听');
          setError('音频设备访问失败');
          setIsListening(false);
          setIsProcessing(false);
        } else {
          console.log('[CanvasVoiceController] 其他语音识别错误:', event.error);
          // 对于其他错误，也停止自动重启，避免无限循环
          setIsListening(false);
          setIsProcessing(false);
        }
      };

      recognition.onend = () => {
        console.log('[CanvasVoiceController] 语音识别结束');
        
        // 检查错误频率，防止无限重启
        const now = Date.now();
        if (now - lastErrorTime < 5000) { // 5秒内
          setErrorCount(prev => prev + 1);
        } else {
          setErrorCount(0); // 重置错误计数
        }
        setLastErrorTime(now);
        
        // 如果错误次数过多，停止自动重启
        if (errorCount >= 3) {
          console.log('[CanvasVoiceController] 错误次数过多，停止自动重启');
          setIsListening(false);
          setIsProcessing(false);
          onMessage?.('assistant', '语音识别出现多次错误，已停止自动重启。请手动重新激活语音控制。', 'system');
          return;
        }
        
        // 如果仍然处于激活状态且没有处理中，自动重启监听
        if (isActive && !isProcessing) {
          console.log('[CanvasVoiceController] 自动重启语音监听...');
          setTimeout(() => {
            if (isActive && recognitionRef.current && !isProcessing) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('[CanvasVoiceController] 重启语音识别失败:', error);
                setIsListening(false);
                setIsProcessing(false);
              }
            }
          }, 500); // 减少延迟到500ms
        } else {
          setIsListening(false);
        }
      };
      
      // 自动开始监听
      startBrowserListening();
    } else {
      setError(currentLang.noSupport);
      onMessage?.('assistant', `❌ ${currentLang.noSupport}

💡 建议使用Chrome或Edge浏览器以获得最佳语音体验。`, 'system');
    }
  };

  // 移除了聊天相关的函数，改为使用回调通信

  const startBrowserListening = async () => {
    if (!recognitionRef.current) {
      setError(currentLang.noSupport);
      return;
    }

    try {
      // 首先请求麦克风权限
      console.log('[CanvasVoiceController] 请求麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 权限获取成功，关闭流（我们只需要权限）
      stream.getTracks().forEach(track => track.stop());
      console.log('[CanvasVoiceController] ✅ 麦克风权限已获得');

      setIsListening(true);
      setError('');
      recognitionRef.current.start();
      
      handleMessageUpdate('assistant', `你好！我是${wakeWord}，现在可以直接说话，我会听取你的指令。`, 'system');
      
      console.log('[CanvasVoiceController] 浏览器语音识别已启动');
    } catch (error) {
      console.error('[CanvasVoiceController] 启动语音识别失败:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        setError('未找到麦克风设备');
      } else {
        setError('启动语音识别失败');
      }
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('[CanvasVoiceController] 语音识别已停止');
    }
    
    // 停止音频录制
    stopAudioRecording();
    
    // 停止所有语音合成播放
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('[CanvasVoiceController] 语音合成已停止');
    }
    
    // 关闭WebSocket连接
    if (realtimeSession.ws && realtimeSession.isConnected) {
      realtimeSession.ws.close(1000, 'User stopped listening');
      setRealtimeSession({
        ws: null,
        sessionId: '',
        isConnected: false
      });
    }
  };

  // 语音转录完成时，通过回调通知CaocaoAIChat
  const handleTranscriptionComplete = (transcript: string) => {
    console.log('[CanvasVoiceController] 语音转录完成:', transcript);
    
    // 检查转录结果是否有效
    if (!transcript || transcript.trim().length === 0) {
      console.log('[CanvasVoiceController] 转录结果为空，跳过处理');
      return;
    }
    
    const trimmedTranscript = transcript.trim();
    handleMessageUpdate('user', trimmedTranscript, 'voice');
    
    // 处理语音指令，添加防抖
    setTimeout(() => {
      handleVoiceCommand(trimmedTranscript);
    }, 100);
  };

  // AI响应完成时，通过回调通知CaocaoAIChat
  const handleAssistantResponse = (content: string) => {
    console.log('[CanvasVoiceController] AI响应完成:', content);
    handleMessageUpdate('assistant', content, 'voice');
    parseAndExecuteCommand(content);
    
    // 播放语音回复（如果不是实时语音模式，使用TTS）
    if (!useRealtimeAPI || !realtimeSession.isConnected) {
      playTextToSpeech(content);
    }
  };

  // 解析AI响应中的指令并执行
  const parseAndExecuteCommand = (aiResponse: string) => {
    console.log('[CanvasVoiceController] 解析AI响应:', aiResponse);
    
    // 检测生成指令的关键词
    const lowerResponse = aiResponse.toLowerCase();
    
    let command: VoiceCommand | null = null;
    
    if (lowerResponse.includes('生成图片') || lowerResponse.includes('画') || lowerResponse.includes('图像')) {
      // 提取图片描述
      const imageMatch = aiResponse.match(/(?:生成|画|制作).*?(?:图片|图像|画面).*?[:：]?\s*(.+?)(?:[。！？\n]|$)/);
      const content = imageMatch ? imageMatch[1].trim() : aiResponse;
      
      command = {
        command: 'generate_image',
        text: aiResponse,
        content: content,
        params: { aspectRatio: '1:1' }
      };
    } else if (lowerResponse.includes('生成视频') || lowerResponse.includes('制作视频') || lowerResponse.includes('视频')) {
      // 提取视频描述
      const videoMatch = aiResponse.match(/(?:生成|制作).*?视频.*?[:：]?\s*(.+?)(?:[。！？\n]|$)/);
      const content = videoMatch ? videoMatch[1].trim() : aiResponse;
      
      command = {
        command: 'generate_video',
        text: aiResponse,
        content: content,
        params: { duration: 10, aspectRatio: '16:9' }
      };
    } else if (lowerResponse.includes('写') || lowerResponse.includes('文本') || lowerResponse.includes('文字')) {
      // 提取文本内容
      const textMatch = aiResponse.match(/(?:写|生成|创建).*?(?:文本|文字|内容).*?[:：]?\s*(.+?)(?:[。！？\n]|$)/);
      const content = textMatch ? textMatch[1].trim() : aiResponse;
      
      command = {
        command: 'generate_text',
        text: aiResponse,
        content: content
      };
    }
    
    // 执行指令
    if (command) {
      console.log('[CanvasVoiceController] 执行语音指令:', command);
      onCommand(command);
    }
  };

  // 开始音频录制
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // 创建AudioContext用于音频处理
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      setAudioContext(audioCtx);
      
      // 创建MediaRecorder录制音频
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // 将音频数据转换为PCM16格式并发送到WebSocket
          convertAndSendAudio(event.data);
        }
      };
      
      recorder.start(100); // 每100ms收集一次数据
      setMediaRecorder(recorder);
      
      console.log('[CanvasVoiceController] ✅ 音频录制已开始');
      
    } catch (error) {
      console.error('[CanvasVoiceController] 音频录制启动失败:', error);
      onMessage?.('assistant', '❌ 无法访问麦克风，请检查权限设置', 'system');
    }
  };

  // 转换音频格式并发送到WebSocket
  const convertAndSendAudio = async (audioBlob: Blob) => {
    if (!realtimeSession.ws || !realtimeSession.isConnected) return;
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 转换为PCM16格式
      const pcm16Data = convertToPCM16(audioBuffer);
      const base64Audio = btoa(String.fromCharCode(...pcm16Data));
      
      // 发送音频数据到Realtime API
      const audioEvent = {
        event_id: `audio_${Date.now()}`,
        type: 'input_audio_buffer.append',
        audio: base64Audio
      };
      
      realtimeSession.ws.send(JSON.stringify(audioEvent));
      
    } catch (error) {
      console.error('[CanvasVoiceController] 音频转换失败:', error);
    }
  };

  // 转换AudioBuffer到PCM16格式
  const convertToPCM16 = (audioBuffer: AudioBuffer): Uint8Array => {
    const samples = audioBuffer.getChannelData(0);
    const pcm16 = new Int16Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return new Uint8Array(pcm16.buffer);
  };

  // 播放AI语音回复
  const playAudioDelta = async (base64Audio: string) => {
    if (!audioContext) return;
    
    try {
      // 解码base64音频数据
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 转换PCM16数据为AudioBuffer
      const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 16000);
      const channelData = audioBuffer.getChannelData(0);
      
      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 0x8000;
      }
      
      // 播放音频
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      console.log('[CanvasVoiceController] ✅ 音频播放成功');
      
    } catch (error) {
      console.error('[CanvasVoiceController] 音频播放失败:', error);
    }
  };

  // 播放文本转语音（备用方案）
  const playTextToSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      // 停止当前播放的语音
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        console.log('[CanvasVoiceController] 开始播放TTS语音:', text.substring(0, 50));
      };
      
      utterance.onend = () => {
        console.log('[CanvasVoiceController] TTS语音播放完成');
      };
      
      utterance.onerror = (event) => {
        console.error('[CanvasVoiceController] TTS播放失败:', event.error);
      };
      
      // 确保语音合成器处于正确状态
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      window.speechSynthesis.speak(utterance);
      console.log('[CanvasVoiceController] TTS语音已加入播放队列');
    } else {
      console.warn('[CanvasVoiceController] 浏览器不支持语音合成');
    }
  };

  // 停止音频录制
  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      setAudioContext(null);
    }
    
    audioChunksRef.current = [];
    console.log('[CanvasVoiceController] 音频录制已停止');
  };

  const handleVoiceCommand = async (transcript: string) => {
    try {
      setIsProcessing(true);
      
      // 检查空字符串或无效输入，避免无限循环
      if (!transcript || transcript.trim().length === 0) {
        console.log('[CanvasVoiceController] 收到空字符串，跳过处理');
        return; // 不设置setIsProcessing(false)，让finally处理
      }
      
      // 检查是否是重复的错误消息，避免无限循环
      const trimmedTranscript = transcript.trim().toLowerCase();
      if (trimmedTranscript.includes('抱歉，我没有理解您的指令') || 
          trimmedTranscript.includes('sorry, i didn\'t understand')) {
        console.log('[CanvasVoiceController] 检测到重复错误消息，跳过处理');
        return; // 不设置setIsProcessing(false)，让finally处理
      }
      
      // 显示用户输入
      handleMessageUpdate('user', transcript, 'voice');
      handleMessageUpdate('assistant', '正在处理您的指令...', 'voice');
      
      console.log('[CanvasVoiceController] 处理语音指令:', transcript);
      
      // 🔥 优先检查模块操作指令（最高优先级）
      const moduleCommand = voiceCanvasReporter.parseModuleCommand(transcript, lang as 'zh' | 'en');
      
      if (moduleCommand) {
        console.log('[CanvasVoiceController] 识别到模块操作指令:', moduleCommand);
        
        // 执行模块操作
        const result = await handleModuleCommand(moduleCommand);
        
        if (result.success) {
          handleMessageUpdate('assistant', result.message, 'voice');
          playTextToSpeech(result.message);
        } else {
          handleMessageUpdate('assistant', result.message, 'voice');
          playTextToSpeech(result.message);
        }
        
        return;
      }
      
      // 检查是否是画布状态查询
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes('画布状态') || lowerTranscript.includes('播报') || 
          lowerTranscript.includes('canvas status') || lowerTranscript.includes('report')) {
        
        const report = voiceCanvasReporter.generateDetailedReport(blocks, lang as 'zh' | 'en');
        handleMessageUpdate('assistant', report, 'voice');
        
        // 播放简化版本的语音
        const summary = voiceCanvasReporter.generateCanvasReport(blocks, lang as 'zh' | 'en').summary;
        const voiceReport = lang === 'zh' 
          ? `画布状态：${summary}。详细信息请查看聊天界面。`
          : `Canvas status: ${summary}. Check chat for details.`;
        
        playTextToSpeech(voiceReport);
        return;
      }
      
      // 如果不是模块操作，按原来的方式处理内容生成指令
      const command = await parseVoiceCommand(transcript);
      
      console.log('[CanvasVoiceController] 解析的语音指令:', command);
      
      // 直接执行指令，不等待AI回复
      if (command.command !== 'unknown') {
        // 立即执行指令
        onCommand(command);
        
        // 生成回复文本，不预测编号，等创建完成后再播报
        let responseText = '';
        
        switch (command.command) {
          case 'generate_text':
            responseText = lang === 'zh' 
              ? `好的，我正在为您生成文本模块："${command.content}"`
              : `Alright, I'm generating text module for you: "${command.content}"`;
            break;
          case 'generate_image':
            responseText = lang === 'zh'
              ? `好的，我正在为您生成图片模块："${command.content}"`
              : `Alright, I'm generating image module for you: "${command.content}"`;
            break;
          case 'generate_video':
            responseText = lang === 'zh'
              ? `好的，我正在为您生成视频模块："${command.content}"`
              : `Alright, I'm generating video module for you: "${command.content}"`;
            break;
          case 'add_to_canvas':
            responseText = lang === 'zh'
              ? `好的，我正在将内容添加到画布上`
              : `Alright, I'm adding the content to the canvas`;
            break;
          default:
            responseText = lang === 'zh'
              ? `我理解了您的需求："${command.content}"，正在处理中...`
              : `I understand your request: "${command.content}", processing...`;
        }
        
        // 显示AI回复
        handleMessageUpdate('assistant', responseText, 'voice');
        
        // 播放语音回复
        playTextToSpeech(responseText);
        
      } else {
        // 未识别的指令 - 限制错误消息频率，避免无限循环
        console.log('[CanvasVoiceController] 未识别的指令，但不播放错误消息以避免循环');
        
        const errorText = lang === 'zh'
          ? `请说出明确的指令，比如"生成图片"、"写文字"或"制作视频"`
          : `Please speak clear commands like "generate image", "write text", or "create video"`;
        
        handleMessageUpdate('assistant', errorText, 'voice');
        // 不播放TTS，避免无限循环
        // playTextToSpeech(errorText);
      }
      
    } catch (error) {
      console.error('语音指令处理失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 检查是否是API密钥问题
      if (errorMessage.includes('PLACEHOLDER_API_KEY') || 
          errorMessage.includes('API密钥未配置') ||
          errorMessage.includes('network') ||
          errorMessage.includes('401') ||
          errorMessage.includes('unauthorized')) {
        onMessage?.('assistant', `❌ API密钥未配置！

🔑 快速配置方法：
1. 点击右侧边栏的"设置"⚙️按钮
2. 在"API提供商配置"中输入你的Gemini API密钥
3. 点击"保存配置"

📝 获取API密钥：
• 访问：https://aistudio.google.com/app/apikey
• 登录Google账号并创建API密钥
• 复制密钥到设置中

💡 配置完成后，语音控制将能正常工作！`, 'system');
      } else {
        onMessage?.('assistant', `抱歉，处理指令时出现错误：${errorMessage}

🔧 可能的解决方案：
• 检查网络连接是否正常
• 确认API密钥是否正确配置
• 稍后重试语音指令

如需帮助，请点击右侧边栏的"设置"按钮检查配置。`, 'system');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 处理模块操作指令
   */
  const handleModuleCommand = async (command: VoiceModuleCommand): Promise<{success: boolean, message: string}> => {
    console.log('[CanvasVoiceController] 执行模块操作:', command);
    
    // 检查目标模块是否存在
    if (command.targetModule) {
      const targetBlock = blocks.find(b => b.number === command.targetModule);
      if (!targetBlock && command.action !== 'generate') {
        const message = lang === 'zh' 
          ? `模块${command.targetModule}不存在。当前画布有：${blocks.map(b => b.number).join('、') || '无模块'}`
          : `Module ${command.targetModule} does not exist. Current canvas has: ${blocks.map(b => b.number).join(', ') || 'no modules'}`;
        return { success: false, message };
      }
    }
    
    // 执行相应的操作
    switch (command.action) {
      case 'select':
        onModuleAction?.('select', command.targetModule);
        return {
          success: true,
          message: lang === 'zh' 
            ? `已选择模块${command.targetModule}`
            : `Selected module ${command.targetModule}`
        };
        
      case 'delete':
        onModuleAction?.('delete', command.targetModule);
        return {
          success: true,
          message: lang === 'zh' 
            ? `已删除模块${command.targetModule}`
            : `Deleted module ${command.targetModule}`
        };
        
      case 'generate':
        onModuleAction?.('generate', command.targetModule, { content: command.content });
        return {
          success: true,
          message: lang === 'zh' 
            ? `正在为模块${command.targetModule}生成内容："${command.content}"`
            : `Generating content for module ${command.targetModule}: "${command.content}"`
        };

      case 'edit':
        onModuleAction?.('edit', command.targetModule, { content: command.content });
        return {
          success: true,
          message: lang === 'zh' 
            ? `已为模块${command.targetModule}输入内容："${command.content}"`
            : `Input content for module ${command.targetModule}: "${command.content}"`
        };

      case 'regenerate':
        onModuleAction?.('regenerate', command.targetModule);
        return {
          success: true,
          message: lang === 'zh' 
            ? `正在重新生成模块${command.targetModule}的内容`
            : `Regenerating content for module ${command.targetModule}`
        };

      case 'modify_prompt':
        onModuleAction?.('modify_prompt', command.targetModule, { 
          promptModification: command.promptModification 
        });
        return {
          success: true,
          message: lang === 'zh' 
            ? `正在为模块${command.targetModule}的提示词添加："${command.promptModification}"`
            : `Adding to module ${command.targetModule} prompt: "${command.promptModification}"`
        };
        
      case 'move':
        onModuleAction?.('move', command.targetModule, { direction: command.direction });
        return {
          success: true,
          message: lang === 'zh' 
            ? `已将模块${command.targetModule}向${getDirectionText(command.direction!, lang)}移动`
            : `Moved module ${command.targetModule} ${command.direction}`
        };
        
      case 'connect':
        onModuleAction?.('connect', command.targetModule, { connectTo: command.connectTo });
        return {
          success: true,
          message: lang === 'zh' 
            ? `已将模块${command.targetModule}连接到${command.connectTo}`
            : `Connected module ${command.targetModule} to ${command.connectTo}`
        };
        
      case 'copy':
        onModuleAction?.('copy', command.targetModule);
        return {
          success: true,
          message: lang === 'zh' 
            ? `已复制模块${command.targetModule}`
            : `Copied module ${command.targetModule}`
        };
        
      default:
        return {
          success: false,
          message: lang === 'zh' 
            ? `不支持的操作：${command.action}`
            : `Unsupported action: ${command.action}`
        };
    }
  };

  /**
   * 获取下一个模块编号
   */
  const getNextModuleNumber = (type: string): string => {
    const prefix = type === 'generate_text' ? 'A' : type === 'generate_image' ? 'B' : 'V';
    const blockType = type === 'generate_text' ? 'text' : type === 'generate_image' ? 'image' : 'video';
    
    // 简化编号生成：只找最大编号+1，不填补空缺
    const sameTypeBlocks = blocks.filter(b => b.type === blockType);
    
    // 找到当前最大的编号
    let maxNumber = 0;
    sameTypeBlocks.forEach(b => {
      const match = b.number.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    // 下一个编号就是最大编号+1
    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(2, '0')}`;
  };

  /**
   * 获取方向文本
   */
  const getDirectionText = (direction: string, lang: 'zh' | 'en'): string => {
    if (lang === 'zh') {
      switch (direction) {
        case 'up': return '上';
        case 'down': return '下';
        case 'left': return '左';
        case 'right': return '右';
        default: return direction;
      }
    }
    return direction;
  };

  const parseVoiceCommand = async (transcript: string): Promise<VoiceCommand> => {
    const text = transcript.toLowerCase();
    
    console.log('[CanvasVoiceController] 解析语音指令:', { transcript, text });
    
    if (lang === 'zh') {
      // 中文指令识别 - 更宽松的匹配
      if (text.includes('写') || text.includes('文字') || text.includes('文本') || text.includes('文章') || text.includes('内容')) {
        const content = transcript.replace(/曹操|帮我|请|写|文字|文本|文章|内容|生成|制作/g, '').trim();
        return { 
          command: 'generate_text', 
          text: transcript,
          content: content || '请写一段文字'
        };
      } else if (text.includes('视频') || text.includes('录像') || text.includes('动画') || text.includes('影片')) {
        const duration = text.includes('短') ? 15 : text.includes('长') ? 60 : 30;
        const content = transcript.replace(/曹操|帮我|请|视频|录像|动画|影片|生成|制作/g, '').trim();
        return { 
          command: 'generate_video', 
          text: transcript,
          content: content || '制作一个视频',
          params: { duration }
        };
      } else if (text.includes('图片') || text.includes('画') || text.includes('图像') || text.includes('图') || text.includes('照片')) {
        const aspectRatio = text.includes('9:16') || text.includes('竖屏') ? '9:16' : 
                           text.includes('16:9') || text.includes('横屏') ? '16:9' : '1:1';
        const content = transcript.replace(/曹操|帮我|请|图片|画|图像|图|照片|生成|制作/g, '').trim();
        return { 
          command: 'generate_image', 
          text: transcript,
          content: content || '生成一张图片',
          params: { aspectRatio }
        };
      } else if (text.includes('添加') || text.includes('放到') || text.includes('画布')) {
        const content = transcript.replace(/曹操|帮我|请|添加|放到|画布/g, '').trim();
        return { 
          command: 'add_to_canvas', 
          text: transcript,
          content: content
        };
      }
    } else {
      // English commands - 更宽松的匹配
      if (text.includes('write') || text.includes('text') || text.includes('create text') || text.includes('article')) {
        const content = transcript.replace(/caocao|please|help me|write|text|create text|article|generate|make/gi, '').trim();
        return { 
          command: 'generate_text', 
          text: transcript,
          content: content || 'write some text'
        };
      } else if (text.includes('video') || text.includes('movie') || text.includes('animation') || text.includes('film')) {
        const duration = text.includes('short') ? 15 : text.includes('long') ? 60 : 30;
        const content = transcript.replace(/caocao|please|help me|video|movie|animation|film|create|generate|make/gi, '').trim();
        return { 
          command: 'generate_video', 
          text: transcript,
          content: content || 'create a video',
          params: { duration }
        };
      } else if (text.includes('image') || text.includes('picture') || text.includes('photo') || text.includes('draw')) {
        const aspectRatio = text.includes('portrait') || text.includes('vertical') ? '9:16' : 
                           text.includes('landscape') || text.includes('horizontal') ? '16:9' : '1:1';
        const content = transcript.replace(/caocao|please|help me|image|picture|photo|draw|create|generate|make/gi, '').trim();
        return { 
          command: 'generate_image', 
          text: transcript,
          content: content || 'generate an image',
          params: { aspectRatio }
        };
      } else if (text.includes('add') || text.includes('put') || text.includes('canvas')) {
        const content = transcript.replace(/caocao|please|help me|add|put|canvas/gi, '').trim();
        return { 
          command: 'add_to_canvas', 
          text: transcript,
          content: content
        };
      }
    }
    
    console.log('[CanvasVoiceController] 未识别的指令:', transcript);
    return { 
      command: 'unknown', 
      text: transcript,
      content: transcript
    };
  };

  // 移除了handleSendMessage和handleKeyPress函数，因为不再需要独立的输入框

  // 新增：管理显示的对话消息
  const [displayMessages, setDisplayMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>>([]);

  // 添加消息到显示列表（最多保留最近2轮对话）
  const addDisplayMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    // 过滤掉系统消息和包含特殊符号的消息
    if (content.includes('❌') || content.includes('✅') || content.includes('🔑') || 
        content.includes('请按以下步骤') || content.includes('🔧') || content.includes('💡')) {
      return;
    }

    const newMessage = {
      id: `display_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now()
    };

    setDisplayMessages(prev => {
      const updated = [...prev, newMessage];
      // 保留最近2轮对话（4条消息：用户-助手-用户-助手）
      return updated.slice(-4);
    });
  }, []);

  // 将addDisplayMessage函数传递给外部组件
  useEffect(() => {
    if (onDisplayMessageUpdate) {
      onDisplayMessageUpdate(addDisplayMessage);
    }
  }, [onDisplayMessageUpdate, addDisplayMessage]);

  // 重写消息处理，同时更新显示消息
  const handleMessageUpdate = useCallback((role: 'user' | 'assistant', content: string, type?: 'voice' | 'system') => {
    // 调用原始的onMessage回调
    onMessage?.(role, content, type);
    
    // 更新显示消息（过滤系统消息）
    if (type !== 'system') {
      addDisplayMessage(role, content);
    }
  }, [onMessage, addDisplayMessage]);

  return (
    <>
      {/* 语音对话显示 - 垂直排版，机器人和用户各占一行 */}
      {isActive && (
        <div className="fixed top-6 left-96 z-[350] pointer-events-none">
          <div className="flex flex-col gap-1 max-w-2xl">
            {/* 状态指示 - 固定在顶部 */}
            <div className="flex-shrink-0">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 drop-shadow-lg">
                {isListening ? '🎤 语音监听中' : '⏸️ 语音已暂停'}
              </span>
            </div>

            {/* 对话内容 - 垂直排列，机器人和用户各占一行 */}
            <div className="flex flex-col gap-1">
              {displayMessages.length === 0 ? (
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400 drop-shadow-lg">
                  💡 试试说："曹操，生成一张猫的图片"
                </div>
              ) : (
                <>
                  {/* 用户消息行 */}
                  {(() => {
                    const userMessage = displayMessages.filter(m => m.role === 'user').slice(-1)[0];
                    return userMessage ? (
                      <div key={`user-${userMessage.id}`} className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 drop-shadow-lg">
                          👤
                        </span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300 drop-shadow-lg">
                          {userMessage.content.length > 40 
                            ? userMessage.content.substring(0, 40) + '...' 
                            : userMessage.content
                          }
                        </span>
                      </div>
                    ) : null;
                  })()}

                  {/* 机器人消息行 */}
                  {(() => {
                    const assistantMessage = displayMessages.filter(m => m.role === 'assistant').slice(-1)[0];
                    return assistantMessage ? (
                      <div key={`assistant-${assistantMessage.id}`} className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400 drop-shadow-lg">
                          🤖
                        </span>
                        <span className="text-lg font-bold text-purple-700 dark:text-purple-300 drop-shadow-lg">
                          {assistantMessage.content.length > 40 
                            ? assistantMessage.content.substring(0, 40) + '...' 
                            : assistantMessage.content
                          }
                        </span>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div 
          className="fixed z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
          style={{ left: position.x, top: position.y + 200 }}
        >
          ❌ {error}
        </div>
      )}
    </>
  );
};

export default CanvasVoiceController;