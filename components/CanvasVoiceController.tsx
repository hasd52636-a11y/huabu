/**
 * Canvas Voice Controller - 画布语音控制组件
 * 在画布左上角显示语音唤醒控制，对话以交互方式展示在画布上
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, MessageCircle, X, Send } from 'lucide-react';

// 简单音效播放函数
const playCommandSound = () => {
  try {
    // 检查浏览器支持
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('浏览器不支持Web Audio API');
      return;
    }

    const audioContext = new AudioContext();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('音效播放失败:', error);
  }
};

// TypeScript declarations for Web Speech API
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
}

const CanvasVoiceController: React.FC<CanvasVoiceControllerProps> = ({
  onCommand,
  lang = 'zh',
  wakeWord = '曹操',
  position = { x: 20, y: 20 },
  theme = 'light'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [error, setError] = useState<string>('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      wakeUp: `说"${wakeWord}"唤醒`,
      listening: '正在听取...',
      processing: '正在处理...',
      error: '错误',
      noSupport: '浏览器不支持语音识别',
      micPermission: '需要麦克风权限',
      chatTitle: '语音对话',
      inputPlaceholder: '输入消息或说话...',
      send: '发送'
    },
    en: {
      wakeUp: `Say "${wakeWord}" to wake up`,
      listening: 'Listening...',
      processing: 'Processing...',
      error: 'Error',
      noSupport: 'Speech recognition not supported',
      micPermission: 'Microphone permission required',
      chatTitle: 'Voice Chat',
      inputPlaceholder: 'Type message or speak...',
      send: 'Send'
    }
  };

  const currentLang = t[lang];

  // 初始化语音识别
  useEffect(() => {
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
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('语音识别结果:', transcript);
        
        if (transcript.includes(wakeWord)) {
          console.log(`检测到唤醒词: ${wakeWord}`);
          playCommandSound();
          setShowChat(true);
          
          const commandText = transcript.split(wakeWord)[1]?.trim();
          if (commandText && commandText.length > 0) {
            handleVoiceCommand(commandText);
          } else {
            addChatMessage('assistant', `你好！我是${wakeWord}，有什么可以帮你的吗？`);
          }
          
          restartListening();
        } else if (showChat) {
          playCommandSound();
          handleVoiceCommand(transcript);
          restartListening();
        } else {
          restartListening();
        }
        
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setIsProcessing(false);
        setError(event.error === 'not-allowed' ? currentLang.micPermission : event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setError(currentLang.noSupport);
    }
  }, [lang, wakeWord, showChat]);

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

  const startListening = () => {
    if (!recognitionRef.current) {
      setError(currentLang.noSupport);
      return;
    }

    try {
      setIsListening(true);
      setError('');
      recognitionRef.current.start();
      console.log('[CanvasVoiceController] 语音识别已启动');
    } catch (error) {
      console.error('[CanvasVoiceController] 启动语音识别失败:', error);
      setError('启动语音识别失败');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('[CanvasVoiceController] 语音识别已停止');
    }
  };

  const restartListening = () => {
    if (!isProcessing) {
      setTimeout(() => {
        startListening();
      }, 1000);
    }
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
        addChatMessage('assistant', '❌ API密钥未配置！\n\n请按以下步骤配置：\n1. 访问 https://aistudio.google.com/app/apikey\n2. 获取Gemini API密钥\n3. 在.env.local文件中替换PLACEHOLDER_API_KEY\n4. 重启服务器');
      } else {
        addChatMessage('assistant', `抱歉，处理指令时出现错误：${errorMessage}\n\n请检查网络连接或稍后重试`);
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
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`
            p-3 rounded-full shadow-lg transition-all duration-300 border-2
            ${isListening 
              ? 'bg-red-500 text-white border-red-600 animate-pulse' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          `}
          title={isListening ? currentLang.listening : currentLang.wakeUp}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

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