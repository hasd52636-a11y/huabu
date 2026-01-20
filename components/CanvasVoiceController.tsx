/**
 * Canvas Voice Controller - 画布语音控制组件
 * 使用神马API的Realtime语音对话功能，无需连接谷歌服务
 * 支持实时语音识别和AI对话
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, MessageCircle, X, Send, ExternalLink } from 'lucide-react';

// 神马API Realtime WebSocket接口
interface RealtimeSession {
  ws: WebSocket | null;
  sessionId: string;
  isConnected: boolean;
}

interface RealtimeEvent {
  type: string;
  event_id?: string;
  session?: any;
  response?: any;
  item?: any;
  audio?: string;
  transcript?: string;
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isProcessing?: boolean;
  contentType?: 'text' | 'image' | 'video';
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
}

const CanvasVoiceController: React.FC<CanvasVoiceControllerProps> = ({
  onCommand,
  lang = 'zh',
  wakeWord = '曹操',
  position = { x: 20, y: 20 },
  theme = 'light',
  isActive = false,
  apiSettings
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [error, setError] = useState<string>('');
  const [realtimeSession, setRealtimeSession] = useState<RealtimeSession>({
    ws: null,
    sessionId: '',
    isConnected: false
  });
  const [useRealtimeAPI, setUseRealtimeAPI] = useState<boolean>(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
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
      console.log('[CanvasVoiceController] 语音控制激活');
      if (useRealtimeAPI && apiSettings?.apiKey && apiSettings.apiKey !== 'PLACEHOLDER_API_KEY') {
        // 使用神马API Realtime模式
        initializeRealtimeChat();
      } else {
        // 降级到浏览器语音识别
        setUseRealtimeAPI(false);
        initializeBrowserSpeech();
      }
    } else if (!isActive && isListening) {
      console.log('[CanvasVoiceController] 语音控制关闭，停止监听');
      stopListening();
    }
  }, [isActive, isListening, isProcessing, useRealtimeAPI, apiSettings]);

  // 初始化神马API Realtime WebSocket连接
  const initializeRealtimeChat = async () => {
    if (!apiSettings?.apiKey || apiSettings.apiKey === 'PLACEHOLDER_API_KEY') {
      setError(currentLang.apiKeyRequired);
      addChatMessage('assistant', `❌ ${currentLang.apiKeyRequired}！

🔑 请先配置神马API密钥：
1. 点击右侧边栏的"设置"⚙️按钮
2. 在"API提供商配置"中输入神马API密钥
3. 点击"保存配置"

💡 配置完成后即可使用实时语音对话功能！`);
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      
      console.log('[CanvasVoiceController] 初始化神马API Realtime WebSocket连接');
      
      // 构建WebSocket URL - 将HTTP URL转换为WebSocket URL
      const wsUrl = apiSettings.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/v1/realtime';
      
      console.log('[CanvasVoiceController] 连接到:', wsUrl);
      
      // 创建WebSocket连接
      const ws = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${apiSettings.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any);
      
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      ws.onopen = () => {
        console.log('[CanvasVoiceController] ✅ WebSocket连接已建立');
        
        setRealtimeSession({
          ws,
          sessionId,
          isConnected: true
        });
        
        // 发送session.update事件配置会话
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
        setShowChat(true);
        
        addChatMessage('assistant', `✅ 实时语音对话已连接！

🎤 现在你可以：
1. 直接对着麦克风说话
2. 我会实时听取并回复
3. 说出创作需求，我会生成内容到画布

💡 试试说："曹操，帮我生成一张猫的图片"`);
        
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
        
        addChatMessage('assistant', `❌ 实时语音连接出现问题

🔄 正在尝试降级到浏览器语音模式...`);
        
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
        
        if (event.code !== 1000) { // 非正常关闭
          addChatMessage('assistant', '🔌 语音连接已断开，点击重新连接或使用文字输入。');
        }
      };
      
    } catch (error) {
      console.error('[CanvasVoiceController] Realtime WebSocket初始化失败:', error);
      setError('Realtime连接初始化失败');
      
      // 降级到浏览器语音识别
      addChatMessage('assistant', `⚠️ 实时语音连接失败，已切换到浏览器语音模式。

🔄 错误信息：${error instanceof Error ? error.message : '未知错误'}

💡 你仍然可以使用浏览器的语音识别功能。`);
      
      setUseRealtimeAPI(false);
      setTimeout(() => initializeBrowserSpeech(), 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理Realtime事件
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    console.log('[CanvasVoiceController] 收到Realtime事件:', event.type, event);
    
    switch (event.type) {
      case 'session.created':
        console.log('[CanvasVoiceController] 会话已创建');
        break;
        
      case 'session.updated':
        console.log('[CanvasVoiceController] 会话配置已更新');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('[CanvasVoiceController] 检测到语音开始');
        addChatMessage('user', '🎤 正在说话...', false, 'voice');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('[CanvasVoiceController] 语音结束');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('[CanvasVoiceController] 语音转录完成:', event.transcript);
          // 更新用户消息显示转录文本
          updateLastUserMessage(event.transcript);
        }
        break;
        
      case 'response.created':
        console.log('[CanvasVoiceController] AI开始响应');
        addChatMessage('assistant', '🤔 正在思考...', true);
        break;
        
      case 'response.output_item.added':
        if (event.item?.type === 'message') {
          console.log('[CanvasVoiceController] AI消息响应');
        }
        break;
        
      case 'response.content_part.added':
        if (event.item?.type === 'text') {
          console.log('[CanvasVoiceController] AI文本内容');
        }
        break;
        
      case 'response.content_part.done':
        if (event.item?.type === 'text' && event.item.text) {
          console.log('[CanvasVoiceController] AI文本响应完成:', event.item.text);
          updateLastAssistantMessage(event.item.text);
          
          // 解析AI响应中的指令
          parseAndExecuteCommand(event.item.text);
        }
        break;
        
      case 'response.audio.delta':
        if (event.audio) {
          // 播放音频片段
          playAudioDelta(event.audio);
        }
        break;
        
      case 'response.done':
        console.log('[CanvasVoiceController] AI响应完成');
        break;
        
      case 'error':
        console.error('[CanvasVoiceController] Realtime API错误:', event);
        addChatMessage('assistant', `❌ 发生错误：${JSON.stringify(event)}`);
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
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        console.log('[CanvasVoiceController] 浏览器语音识别启动');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('语音识别结果:', transcript);
        
        addChatMessage('user', transcript);
        handleVoiceCommand(transcript);
        
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setIsProcessing(false);
        setError(event.error === 'not-allowed' ? currentLang.micPermission : event.error);
        console.error('[CanvasVoiceController] 语音识别错误:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('[CanvasVoiceController] 语音识别结束');
      };
      
      // 自动开始监听
      startBrowserListening();
    } else {
      setError(currentLang.noSupport);
      addChatMessage('assistant', `❌ ${currentLang.noSupport}

💡 建议使用Chrome或Edge浏览器以获得最佳语音体验。`);
    }
  };

  // 自动滚动到聊天底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const addChatMessage = (role: 'user' | 'assistant', content: string, isProcessing = false) => {
    const message: ChatMessage = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      isProcessing
    };
    setChatMessages((prev: ChatMessage[]) => [...prev, message]);
    return message.id;
  };

  const updateChatMessage = (id: string, content: string, isProcessing = false) => {
    setChatMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
      msg.id === id ? { ...msg, content, isProcessing } : msg
    ));
  };

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
      setShowChat(true);
      
      addChatMessage('assistant', `你好！我是${wakeWord}，现在可以直接说话，我会听取你的指令。`);
      
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

  // 更新最后一条用户消息
  const updateLastUserMessage = (transcript: string) => {
    setChatMessages((prev: ChatMessage[]) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'user' && updated[i].content.includes('🎤')) {
          updated[i] = {
            ...updated[i],
            content: transcript,
            isProcessing: false
          };
          break;
        }
      }
      return updated;
    });
  };

  // 更新最后一条助手消息
  const updateLastAssistantMessage = (content: string) => {
    setChatMessages((prev: ChatMessage[]) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'assistant' && updated[i].isProcessing) {
          updated[i] = {
            ...updated[i],
            content,
            isProcessing: false
          };
          break;
        }
      }
      return updated;
    });
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
      addChatMessage('assistant', '❌ 无法访问麦克风，请检查权限设置');
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
      
    } catch (error) {
      console.error('[CanvasVoiceController] 音频播放失败:', error);
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
      
      addChatMessage('user', transcript);
      const assistantMsgId = addChatMessage('assistant', '正在思考...', true);
      
      const command = await parseVoiceCommand(transcript);
      
      let responseText = '';
      switch (command.command) {
        case 'generate_text':
          responseText = `好的，我来为您生成文本内容："${command.content}"`;
          break;
        case 'generate_image':
          responseText = `好的，我来为您生成图片："${command.content}"`;
          break;
        case 'generate_video':
          responseText = `好的，我来为您生成视频："${command.content}"`;
          break;
        case 'add_to_canvas':
          responseText = `好的，我来将内容添加到画布上`;
          break;
        default:
          responseText = `我理解了你的需求："${command.content}"，让我来处理一下`;
      }
      
      updateChatMessage(assistantMsgId, responseText, false);
      onCommand(command);
      
    } catch (error) {
      console.error('语音指令处理失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 检查是否是API密钥问题
      if (errorMessage.includes('PLACEHOLDER_API_KEY') || 
          errorMessage.includes('API密钥未配置') ||
          errorMessage.includes('network') ||
          errorMessage.includes('401') ||
          errorMessage.includes('unauthorized')) {
        addChatMessage('assistant', `❌ API密钥未配置！

🔑 快速配置方法：
1. 点击右侧边栏的"设置"⚙️按钮
2. 在"API提供商配置"中输入你的Gemini API密钥
3. 点击"保存配置"

📝 获取API密钥：
• 访问：https://aistudio.google.com/app/apikey
• 登录Google账号并创建API密钥
• 复制密钥到设置中

💡 配置完成后，语音控制将能正常工作！`);
      } else {
        addChatMessage('assistant', `抱歉，处理指令时出现错误：${errorMessage}

🔧 可能的解决方案：
• 检查网络连接是否正常
• 确认API密钥是否正确配置
• 稍后重试语音指令

如需帮助，请点击右侧边栏的"设置"按钮检查配置。`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const parseVoiceCommand = async (transcript: string): Promise<VoiceCommand> => {
    const text = transcript.toLowerCase();
    
    if (lang === 'zh') {
      if (text.includes('写') || text.includes('文字') || text.includes('文本')) {
        return { 
          command: 'generate_text', 
          text: transcript,
          content: transcript.replace(/写|文字|文本|帮我|请/g, '').trim()
        };
      } else if (text.includes('视频') || text.includes('录像') || text.includes('动画')) {
        const duration = text.includes('短') ? 15 : text.includes('长') ? 60 : 30;
        return { 
          command: 'generate_video', 
          text: transcript,
          content: transcript.replace(/视频|录像|动画|帮我|请|生成|制作/g, '').trim(),
          params: { duration }
        };
      } else if (text.includes('图片') || text.includes('画') || text.includes('图像') || text.includes('图')) {
        const aspectRatio = text.includes('9:16') || text.includes('竖屏') ? '9:16' : 
                           text.includes('16:9') || text.includes('横屏') ? '16:9' : '1:1';
        return { 
          command: 'generate_image', 
          text: transcript,
          content: transcript.replace(/图片|画|图像|图|帮我|请|生成|制作/g, '').trim(),
          params: { aspectRatio }
        };
      } else if (text.includes('添加') || text.includes('放到') || text.includes('画布')) {
        return { 
          command: 'add_to_canvas', 
          text: transcript,
          content: transcript.replace(/添加|放到|画布|帮我|请/g, '').trim()
        };
      }
    }
    
    return { 
      command: 'unknown', 
      text: transcript,
      content: transcript
    };
  };

  const handleSendMessage = () => {
    if (!currentInput.trim()) return;
    
    handleVoiceCommand(currentInput);
    setCurrentInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 语音控制按钮 */}
      <div 
        className="fixed z-50 flex items-center gap-2"
        style={{ left: position.x, top: position.y }}
      >
        <button
          onClick={isActive ? stopListening : (useRealtimeAPI ? initializeRealtimeChat : startBrowserListening)}
          disabled={isProcessing}
          className={`
            p-3 rounded-full shadow-lg transition-all duration-300 border-2
            ${isActive && isListening
              ? 'bg-red-500 text-white border-red-600 animate-pulse' 
              : isActive
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          `}
          title={
            isActive 
              ? (isListening ? (useRealtimeAPI ? '实时语音对话中 - 点击停止' : '连续监听中 - 点击停止') : '语音控制已激活 - 点击停止')
              : (useRealtimeAPI ? '点击开始实时语音对话' : '点击开始语音控制')
          }
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isActive && isListening ? (
            <Mic className="w-5 h-5" />
          ) : isActive ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        {/* 状态指示器 */}
        {isActive && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${
            useRealtimeAPI ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            {useRealtimeAPI ? (
              realtimeSession.isConnected ? '实时对话' : '连接中...'
            ) : (
              isListening ? '监听中' : '已激活'
            )}
          </div>
        )}

        {/* 模式切换按钮 */}
        {isActive && (
          <button
            onClick={() => {
              setUseRealtimeAPI(!useRealtimeAPI);
              addChatMessage('assistant', `已切换到${!useRealtimeAPI ? '实时语音' : '浏览器语音'}模式，请重新激活语音控制。`);
              stopListening();
            }}
            className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors text-xs"
            title={useRealtimeAPI ? '切换到浏览器语音模式' : '切换到实时语音模式'}
          >
            {useRealtimeAPI ? '实时' : '浏览器'}
          </button>
        )}

        {showChat && (
          <button
            onClick={() => setShowChat(false)}
            className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
            title="关闭对话"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div 
          className="fixed z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
          style={{ left: position.x, top: position.y + 60 }}
        >
          {error}
        </div>
      )}

      {/* 聊天界面 */}
      {showChat && (
        <div 
          className={`
            fixed z-40 w-80 h-96 rounded-lg shadow-xl border
            ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}
          `}
          style={{ left: position.x + 80, top: position.y }}
        >
          {/* 聊天标题 */}
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {currentLang.chatTitle}
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 h-64"
          >
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] p-2 rounded-lg text-sm
                    ${message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {message.isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {message.content}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 输入区域 */}
          <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentLang.inputPlaceholder}
                className={`
                  flex-1 px-3 py-2 rounded border text-sm
                  ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasVoiceController;