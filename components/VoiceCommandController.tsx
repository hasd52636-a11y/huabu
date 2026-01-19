/**
 * Voice Command Controller
 * 简单的语音指令控制系统，用于控制画布操作
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

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

interface VoiceCommandControllerProps {
  onCommand: (command: VoiceCommand) => void;
  lang?: 'zh' | 'en';
  className?: string;
  wakeWord?: string; // 唤醒词，默认为"曹操"
}

interface VoiceCommand {
  command: 'generate_text' | 'generate_image' | 'generate_video' | 'add_to_canvas' | 'unknown';
  text: string;
  content: string; // 提取的核心内容
  params?: {
    aspectRatio?: string;
    style?: string;
    duration?: number; // 视频时长
  };
}

const VoiceCommandController: React.FC<VoiceCommandControllerProps> = ({
  onCommand,
  lang = 'zh',
  className = '',
  wakeWord = '曹操'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isWakeWordMode, setIsWakeWordMode] = useState(true); // 是否处于唤醒词监听模式
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    zh: {
      startListening: '开始语音指令',
      stopListening: '停止语音指令',
      listening: '正在听取...',
      processing: '正在处理...',
      waitingWakeWord: `等待唤醒词"${wakeWord}"...`,
      wakeWordDetected: `检测到"${wakeWord}"，请说出指令`,
      lastCommand: '上次指令',
      error: '错误',
      noSupport: '浏览器不支持语音识别',
      micPermission: '需要麦克风权限',
      wakeWordMode: '唤醒词模式',
      directMode: '直接模式'
    },
    en: {
      startListening: 'Start Voice Command',
      stopListening: 'Stop Voice Command',
      listening: 'Listening...',
      processing: 'Processing...',
      waitingWakeWord: `Waiting for wake word "${wakeWord}"...`,
      wakeWordDetected: `"${wakeWord}" detected, please speak command`,
      lastCommand: 'Last Command',
      error: 'Error',
      noSupport: 'Speech recognition not supported',
      micPermission: 'Microphone permission required',
      wakeWordMode: 'Wake Word Mode',
      directMode: 'Direct Mode'
    }
  };

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
        
        if (isWakeWordMode) {
          // 唤醒词模式：检查是否包含唤醒词
          if (transcript.includes(wakeWord)) {
            console.log(`检测到唤醒词: ${wakeWord}`);
            setLastCommand(`${wakeWord} (唤醒)`);
            
            // 提取唤醒词后的内容
            const commandText = transcript.split(wakeWord)[1]?.trim();
            if (commandText && commandText.length > 0) {
              // 如果唤醒词后面有指令，直接处理
              setIsListening(false);
              setIsProcessing(true);
              parseVoiceCommand(commandText);
            } else {
              // 只有唤醒词，等待用户继续说指令
              setLastCommand(`${wakeWord} - 请继续说出指令`);
              // 继续监听指令
              setTimeout(() => {
                if (recognitionRef.current && !isProcessing) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.log('重新启动识别失败:', e);
                  }
                }
              }, 500);
            }
          } else {
            // 没有检测到唤醒词，继续监听
            console.log('未检测到唤醒词，继续监听...');
            setTimeout(() => {
              if (recognitionRef.current && !isProcessing) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('重新启动识别失败:', e);
                }
              }
            }, 1000);
          }
        } else {
          // 直接模式：直接处理指令
          setLastCommand(transcript);
          setIsListening(false);
          setIsProcessing(true);
          parseVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setIsProcessing(false);
        setError(event.error === 'not-allowed' ? t[lang].micPermission : event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setError(t[lang].noSupport);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lang]);

  // 使用AI解析语音指令
  const parseVoiceCommand = async (transcript: string) => {
    try {
      setIsProcessing(true);
      
      // 使用AI理解用户意图
      const aiService = new (await import('../adapters/AIServiceAdapter')).MultiProviderAIService();
      
      const systemPrompt = lang === 'zh' ? 
        `你是一个语音指令解析器。分析用户语音并返回JSON格式指令。

可用指令类型：
1. generate_text - 生成文字内容
2. generate_image - 生成图片
3. generate_video - 生成视频
4. add_to_canvas - 添加到画布
5. unknown - 无法识别

用户语音："${transcript}"

返回格式：
{
  "command": "指令类型",
  "content": "提取的核心内容描述",
  "params": {
    "aspectRatio": "9:16|16:9|1:1",
    "style": "风格描述",
    "duration": 视频时长秒数
  }
}

只返回JSON。` :
        `You are a voice command parser. Analyze user speech and return JSON instructions.

Available commands:
1. generate_text - Generate text content
2. generate_image - Generate image
3. generate_video - Generate video
4. add_to_canvas - Add to canvas
5. unknown - Unrecognized

User speech: "${transcript}"

Return format:
{
  "command": "command type",
  "content": "extracted core content description",
  "params": {
    "aspectRatio": "9:16|16:9|1:1",
    "style": "style description",
    "duration": video_duration_seconds
  }
}

Return only JSON.`;

      const response = await aiService.generateText(systemPrompt, {
        provider: 'gemini' as any,
        modelId: 'gemini-1.5-flash',
        apiKey: process.env.REACT_APP_GEMINI_API_KEY || ''
      });

      // 解析AI返回的JSON
      let parsedCommand: VoiceCommand;
      try {
        const aiResult = JSON.parse(response);
        parsedCommand = {
          command: aiResult.command,
          text: transcript,
          content: aiResult.content || transcript,
          params: aiResult.params
        };
      } catch (parseError) {
        console.error('AI返回格式错误:', parseError);
        // 回退到简单匹配
        parsedCommand = simpleParse(transcript);
      }

      // 执行指令
      onCommand(parsedCommand);
      
    } catch (error) {
      console.error('AI解析失败:', error);
      // 回退到简单匹配
      const fallbackCommand = simpleParse(transcript);
      onCommand(fallbackCommand);
    } finally {
      setIsProcessing(false);
    }
  };

  // 简单的关键词匹配作为回退方案
  const simpleParse = (transcript: string): VoiceCommand => {
    const text = transcript.toLowerCase();
    
    if (lang === 'zh') {
      if (text.includes('写') || text.includes('描述') || text.includes('文字') || text.includes('文本')) {
        return { 
          command: 'generate_text', 
          text: transcript,
          content: transcript.replace(/写|描述|文字|文本|帮我|请/g, '').trim()
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
        const aspectRatio = text.includes('9:16') || text.includes('九比十六') || text.includes('竖屏') ? '9:16' : 
                           text.includes('16:9') || text.includes('十六比九') || text.includes('横屏') ? '16:9' : '1:1';
        const style = text.includes('赛博朋克') ? '赛博朋克' :
                     text.includes('写实') ? '写实' :
                     text.includes('卡通') ? '卡通' :
                     text.includes('动漫') ? '动漫' : '';
        return { 
          command: 'generate_image', 
          text: transcript,
          content: transcript.replace(/图片|画|图像|图|帮我|请|生成|制作/g, '').trim(),
          params: { aspectRatio, style }
        };
      } else if (text.includes('放到画布') || text.includes('添加到画布') || text.includes('加到画布')) {
        return { 
          command: 'add_to_canvas', 
          text: transcript,
          content: transcript
        };
      }
    } else {
      if (text.includes('write') || text.includes('describe') || text.includes('text')) {
        return { 
          command: 'generate_text', 
          text: transcript,
          content: transcript.replace(/write|describe|text|help me|please/g, '').trim()
        };
      } else if (text.includes('video') || text.includes('animation') || text.includes('movie')) {
        const duration = text.includes('short') ? 15 : text.includes('long') ? 60 : 30;
        return { 
          command: 'generate_video', 
          text: transcript,
          content: transcript.replace(/video|animation|movie|help me|please|generate|create/g, '').trim(),
          params: { duration }
        };
      } else if (text.includes('image') || text.includes('picture') || text.includes('draw')) {
        const aspectRatio = text.includes('9:16') || text.includes('portrait') ? '9:16' : 
                           text.includes('16:9') || text.includes('landscape') ? '16:9' : '1:1';
        const style = text.includes('cyberpunk') ? 'cyberpunk' :
                     text.includes('realistic') ? 'realistic' :
                     text.includes('cartoon') ? 'cartoon' :
                     text.includes('anime') ? 'anime' : '';
        return { 
          command: 'generate_image', 
          text: transcript,
          content: transcript.replace(/image|picture|draw|help me|please|generate|create/g, '').trim(),
          params: { aspectRatio, style }
        };
      } else if (text.includes('add to canvas') || text.includes('put on canvas')) {
        return { 
          command: 'add_to_canvas', 
          text: transcript,
          content: transcript
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
        
        // 根据模式设置不同的超时时间
        const timeout = isWakeWordMode ? 30000 : 10000; // 唤醒词模式30秒，直接模式10秒
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
          }
        }, timeout);
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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleMode = () => {
    if (isListening) {
      stopListening();
    }
    setIsWakeWordMode(!isWakeWordMode);
    setLastCommand('');
    setError('');
  };

  return (
    <div className={`voice-command-controller ${className}`}>
      {/* 模式切换按钮 */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={toggleMode}
          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
            isWakeWordMode
              ? 'bg-purple-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
          title={isWakeWordMode ? t[lang].wakeWordMode : t[lang].directMode}
        >
          {isWakeWordMode ? `${wakeWord}模式` : '直接模式'}
        </button>
      </div>

      {/* 主控制按钮 */}
      <button
        onClick={toggleListening}
        disabled={isProcessing || !!error}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : isWakeWordMode
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${(isProcessing || error) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isListening ? t[lang].stopListening : t[lang].startListening}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        
        <span className="text-sm font-medium">
          {isProcessing ? t[lang].processing :
           isListening ? (isWakeWordMode ? t[lang].waitingWakeWord : t[lang].listening) :
           (isWakeWordMode ? `${wakeWord}唤醒` : t[lang].startListening)}
        </span>
      </button>

      {/* 状态显示 */}
      {lastCommand && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t[lang].lastCommand}: </span>
          <span className="text-gray-900 dark:text-white">{lastCommand}</span>
        </div>
      )}

      {/* 使用提示 */}
      {isWakeWordMode && !isListening && !lastCommand && (
        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm">
          <p className="text-purple-700 dark:text-purple-300 text-xs">
            💡 说"{wakeWord}，帮我写段文字"或"{wakeWord}，画一张图片"
          </p>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
          {t[lang].error}: {error}
        </div>
      )}
    </div>
  );
};

export default VoiceCommandController;