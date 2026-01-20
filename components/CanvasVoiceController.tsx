/**
 * Canvas Voice Controller - 画布语音控制组件
 * 在画布左上角显示语音唤醒控制，对话以交互方式展示在画布上
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, MessageCircle, X, Send, ArrowUpRight } from 'lucide-react';

// 简单音效播放函数
const playCommandSound = () => {
  try {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 确保音频上下文处于运行状态
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 类似微信发送消息的音效 - 双音调
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
  contentType?: 'text' | 'image' | 'video'; // 添加内容类型用于投射按钮
}

interface CanvasVoiceControllerProps {
  onCommand: (command: VoiceCommand) => void;
  onProjectToCanvas?: (content: string, type: 'text' | 'image' | 'video') => void; // 添加投射到画布的回调
  lang?: 'zh' | 'en';
  wakeWord?: string;
  position?: { x: number; y: number };
  theme?: 'light' | 'dark';
}

const CanvasVoiceController: React.FC<CanvasVoiceControllerProps> = ({
  onCommand,
  onProjectToCanvas,
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

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('语音识别结果:', transcript);
        
        // 检查是否包含唤醒词
        if (transcript.includes(wakeWord)) {
          console.log(`检测到唤醒词: ${wakeWord}`);
          
          // 播放指令提交音效
          playCommandSound();
          
          // 显示聊天界面
          setShowChat(true);
          
          // 提取唤醒词后的内容
          const commandText = transcript.split(wakeWord)[1]?.trim();
          if (commandText && commandText.length > 0) {
            // 如果唤醒词后面有指令，直接处理
            handleVoiceCommand(commandText);
          } else {
            // 只有唤醒词，添加欢迎消息
            addChatMessage('assistant', `你好！我是${wakeWord}，有什么可以帮你的吗？`);
          }
          
          // 自动重启语音识别，保持连续监听
          setTimeout(() => {
            if (recognitionRef.current && !isProcessing) {
              try {
                recognitionRef.current.start();
                console.log('语音识别自动重启 - 等待下一个指令');
              } catch (e) {
                console.log('自动重启语音识别失败:', e);
              }
            }
          }, 1000);
          
        } else if (showChat) {
          // 如果聊天界面已打开，直接处理语音输入
          // 播放指令提交音效
          playCommandSound();
          handleVoiceCommand(transcript);
          
          // 处理完指令后自动重启语音识别
          setTimeout(() => {
            if (recognitionRef.current && !isProcessing) {
              try {
                recognitionRef.current.start();
                console.log('语音识别自动重启 - 继续对话');
              } catch (e) {
                console.log('自动重启语音识别失败:', e);
              }
            }
          }, 1000);
        } else {
          // 没有检测到唤醒词且聊天界面未打开，继续监听
          setTimeout(() => {
            if (recognitionRef.current && !isProcessing) {
              try {
                recognitionRef.current.start();
                console.log('语音识别自动重启 - 继续等待唤醒词');
              } catch (e) {
                console.log('自动重启语音识别失败:', e);
              }
            }
          }, 500);
        }
        
        setIsListening(false);
      };

      recognition.onerror = (event) => {
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
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
      isProcessing
    };
    setChatMessages(prev => [...prev, message]);
    return message.id;
  };

  const updateChatMessage = (id: string, content: string, isProcessing = false) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content, isProcessing } : msg
    ));
  };

  const handleVoiceCommand = async (transcript: string) => {
    try {
      setIsProcessing(true);
      
      // 添加用户消息
      addChatMessage('user', transcript);
      
      // 添加处理中的助手消息
      const assistantMsgId = addChatMessage('assistant', '正在思考...', true);
      
      // 解析语音指令
      const command = await parseVoiceCommand(transcript);
      
      // 根据指令类型生成内容并显示在聊天中
      if (command.command === 'generate_text' || command.command === 'generate_image' || command.command === 'generate_video') {
        // 更新助手消息为处理状态
        updateChatMessage(assistantMsgId, `正在生成${command.command === 'generate_text' ? '文本' : command.command === 'generate_image' ? '图片' : '视频'}内容...`, true);
        
        // 调用AI服务生成内容
        try {
          let generatedContent = '';
          
          if (command.command === 'generate_text') {
            // 生成文本内容
            const aiService = new (await import('../adapters/AIServiceAdapter')).MultiProviderAIService();
            generatedContent = await aiService.generateText(
              { parts: [{ text: command.content }] },
              { provider: 'google', modelId: 'gemini-3-flash-preview', apiKey: '' }
            );
          } else if (command.command === 'generate_image') {
            // 生成图片内容
            const aiService = new (await import('../adapters/AIServiceAdapter')).MultiProviderAIService();
            generatedContent = await aiService.generateImage(
              { parts: [{ text: command.content }], aspectRatio: command.params?.aspectRatio || '1:1' },
              { provider: 'google', modelId: 'gemini-3-pro-image-preview', apiKey: '' }
            );
          } else if (command.command === 'generate_video') {
            // 生成视频内容
            const aiService = new (await import('../adapters/AIServiceAdapter')).MultiProviderAIService();
            generatedContent = await aiService.generateVideo(
              { parts: [{ text: command.content }] },
              { provider: 'google', modelId: 'veo-3.1-fast-generate-preview', apiKey: '' }
            );
          }
          
          // 更新聊天消息显示生成的内容
          updateChatMessage(assistantMsgId, generatedContent, false);
          
          // 添加生成内容的类型标记，用于投射按钮
          setChatMessages(prev => prev.map(msg => 
            msg.id === assistantMsgId ? { 
              ...msg, 
              content: generatedContent, 
              isProcessing: false,
              contentType: command.command.replace('generate_', '') as 'text' | 'image' | 'video'
            } : msg
          ));
          
        } catch (error) {
          console.error('内容生成失败:', error);
          updateChatMessage(assistantMsgId, '抱歉，内容生成失败，请重试', false);
        }
      } else {
        // 其他指令直接执行
        let responseText = '';
        switch (command.command) {
          case 'add_to_canvas':
            responseText = `好的，我来将内容添加到画布上`;
            break;
          default:
            responseText = `我理解了你的需求："${command.content}"，让我来处理一下`;
        }
        
        updateChatMessage(assistantMsgId, responseText, false);
        // 执行非生成类指令
        onCommand(command);
      }
      
    } catch (error) {
      console.error('语音指令处理失败:', error);
      addChatMessage('assistant', '抱歉，我没有理解你的指令，请再试一次');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseVoiceCommand = async (transcript: string): Promise<VoiceCommand> => {
    // 简单的关键词匹配
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
      }
    }
    
    return { 
      command: 'unknown', 
      text: transcript,
      content: transcript
    };
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setError('启动语音识别失败');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSendMessage = () => {
    if (currentInput.trim()) {
      // 播放指令提交音效
      playCommandSound();
      handleVoiceCommand(currentInput);
      setCurrentInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 添加停止连续监听的功能
  const toggleContinuousListening = () => {
    if (isListening) {
      stopListening();
      console.log('用户主动停止语音识别');
    } else {
      startListening();
    }
  };

  return (
    <>
      {/* 语音唤醒按钮 - 固定在画布左上角 */}
      <div 
        className="fixed z-50 flex items-center gap-2"
        style={{ left: position.x, top: position.y }}
      >
        <button
          onClick={toggleContinuousListening}
          disabled={isProcessing || !!error}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shadow-lg
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-purple-500 hover:bg-purple-600 text-white'
            }
            ${(isProcessing || error) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={isListening ? '点击停止连续监听' : currentLang.wakeUp}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          
          <span className="text-sm font-medium">
            {isProcessing ? currentLang.processing :
             isListening ? '连续监听中...' :
             wakeWord}
          </span>
        </button>

        {/* 聊天按钮 */}
        {chatMessages.length > 0 && (
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
            title={currentLang.chatTitle}
          >
            <MessageCircle className="w-4 h-4" />
            {chatMessages.filter(m => m.role === 'user').length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                {chatMessages.filter(m => m.role === 'user').length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div 
          className="fixed z-50 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-3 py-2 rounded-lg shadow-lg"
          style={{ left: position.x, top: position.y + 60 }}
        >
          <span className="text-sm">{currentLang.error}: {error}</span>
        </div>
      )}

      {/* 聊天界面 - 浮动在画布上 */}
      {showChat && (
        <div 
          className="fixed z-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700"
          style={{ 
            left: position.x + 200, 
            top: position.y,
            width: '400px',
            height: '500px'
          }}
        >
          {/* 聊天头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentLang.chatTitle}
              </h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 聊天消息区域 */}
          <div 
            ref={chatScrollRef}
            className="flex-1 p-4 overflow-y-auto"
            style={{ height: '360px' }}
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">说"{wakeWord}"开始对话</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[80%] px-3 py-2 rounded-lg text-sm
                        ${message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }
                        ${message.isProcessing ? 'animate-pulse' : ''}
                      `}
                    >
                      {message.content}
                      {message.isProcessing && (
                        <Loader2 className="w-3 h-3 animate-spin inline ml-2" />
                      )}
                      
                      {/* 投射到画布按钮 - 只对助手生成的内容显示 */}
                      {message.role === 'assistant' && 
                       !message.isProcessing && 
                       message.contentType && 
                       message.content && 
                       onProjectToCanvas && (
                        <div className="mt-2">
                          <button
                            onClick={() => onProjectToCanvas(message.content, message.contentType!)}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            投射到画布
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentLang.inputPlaceholder}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isProcessing}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasVoiceController;