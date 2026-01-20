/**
 * 曹操AI对话界面 - 纯语音/手势交互专用界面
 * 集中管理语音和手势控制，提供实时反馈和人机交互
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Hand, 
  Bot, CheckCircle, AlertCircle, Brain, 
  Activity, Loader2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'caocao';
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | 'gesture' | 'voice';
  commandType?: string;
  status?: 'executing' | 'completed' | 'failed';
}

interface CaocaoAIChatProps {
  isVoiceActive: boolean;
  isGestureActive: boolean;
  onVoiceToggle: (active: boolean) => void;
  onGestureToggle: (active: boolean) => void;
  onCommand: (command: string) => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const CaocaoAIChat: React.FC<CaocaoAIChatProps> = ({
  isVoiceActive,
  isGestureActive,
  onVoiceToggle,
  onGestureToggle,
  onCommand,
  theme = 'dark',
  lang = 'zh'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `caocao-init-${Date.now()}`,
      role: 'caocao',
      content: '主人好！我是曹操，您的专属画布助手。请开启语音或手势控制，我将为您提供最佳的交互体验！',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [systemStatus, setSystemStatus] = useState<'ready' | 'listening' | 'processing'>('ready');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      title: '曹操AI助手',
      voiceControl: '语音控制',
      gestureControl: '手势控制',
      systemStatus: '系统状态',
      ready: '就绪',
      listening: '聆听中',
      processing: '处理中',
      wakeWord: '说"曹操"唤醒',
      gestureHint: '做出手势指令',
      caocaoResponses: {
        greeting: '主人好！曹操为您效劳！',
        voiceActivated: '语音控制已激活！请说"曹操"唤醒我，然后说出您的指令。',
        voiceDeactivated: '语音控制已关闭。',
        gestureActivated: '手势控制已激活！请在摄像头前做出手势指令。',
        gestureDeactivated: '手势控制已关闭。',
        commandReceived: '收到指令，正在执行...',
        commandCompleted: '指令执行完毕！主人还有什么吩咐？',
        commandFailed: '抱歉主人，指令执行遇到问题，请重试。',
        gestureDetected: '检测到手势：',
        voiceDetected: '听到指令：',
        bothActive: '语音和手势控制都已激活，我将全力为您服务！',
        systemReady: '系统已就绪，随时为主人效劳！'
      }
    },
    en: {
      title: 'Caocao AI Assistant',
      voiceControl: 'Voice Control',
      gestureControl: 'Gesture Control',
      systemStatus: 'System Status',
      ready: 'Ready',
      listening: 'Listening',
      processing: 'Processing',
      wakeWord: 'Say "Caocao" to wake',
      gestureHint: 'Make gesture commands',
      caocaoResponses: {
        greeting: 'Greetings, Master! Caocao at your service!',
        voiceActivated: 'Voice control activated! Say "Caocao" to wake me, then speak your command.',
        voiceDeactivated: 'Voice control deactivated.',
        gestureActivated: 'Gesture control activated! Make gesture commands in front of the camera.',
        gestureDeactivated: 'Gesture control deactivated.',
        commandReceived: 'Command received, executing...',
        commandCompleted: 'Command completed! What else can I do for you, Master?',
        commandFailed: 'Sorry Master, command execution failed. Please try again.',
        gestureDetected: 'Gesture detected: ',
        voiceDetected: 'Voice command: ',
        bothActive: 'Both voice and gesture controls are active. I am at your full service!',
        systemReady: 'System ready to serve you, Master!'
      }
    }
  };

  const currentLang = t[lang];

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听语音和手势状态变化
  useEffect(() => {
    if (isVoiceActive && isGestureActive) {
      addCaocaoMessage(currentLang.caocaoResponses.bothActive, 'system');
      setSystemStatus('ready');
    } else if (isVoiceActive) {
      addCaocaoMessage(currentLang.caocaoResponses.voiceActivated, 'system');
      setSystemStatus('listening');
    } else if (isGestureActive) {
      addCaocaoMessage(currentLang.caocaoResponses.gestureActivated, 'system');
      setSystemStatus('ready');
    } else {
      addCaocaoMessage(currentLang.caocaoResponses.systemReady, 'system');
      setSystemStatus('ready');
    }
  }, [isVoiceActive, isGestureActive]);

  // 添加曹操回复
  const addCaocaoMessage = (content: string, type: 'text' | 'system' = 'text') => {
    const newMessage: ChatMessage = {
      id: `caocao-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'caocao',
      content,
      timestamp: new Date(),
      type
    };
    setMessages((prev: ChatMessage[]) => [...prev, newMessage]);
  };

  // 添加用户消息
  const addUserMessage = (content: string, type: 'voice' | 'gesture', commandType?: string) => {
    const newMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: new Date(),
      type,
      commandType,
      status: 'executing'
    };
    setMessages((prev: ChatMessage[]) => [...prev, newMessage]);
    return newMessage.id;
  };

  // 更新消息状态
  const updateMessageStatus = (messageId: string, status: 'completed' | 'failed') => {
    setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  // 处理语音控制切换
  const handleVoiceToggle = () => {
    const newState = !isVoiceActive;
    onVoiceToggle(newState);
  };

  // 处理手势控制切换
  const handleGestureToggle = () => {
    const newState = !isGestureActive;
    onGestureToggle(newState);
  };

  // 获取消息图标
  const getMessageIcon = (message: ChatMessage) => {
    if (message.role === 'caocao') {
      return <Bot className="w-4 h-4 text-purple-500" />;
    } else {
      if (message.type === 'voice') {
        return <Mic className="w-4 h-4 text-blue-500" />;
      } else if (message.type === 'gesture') {
        return <Hand className="w-4 h-4 text-green-500" />;
      }
      return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (systemStatus) {
      case 'listening': return 'text-blue-500';
      case 'processing': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* 标题栏和控制面板 */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">{currentLang.title}</h3>
          </div>
          
          {/* 系统状态指示器 */}
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            {systemStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
            {systemStatus === 'listening' && <Activity className="w-4 h-4 animate-pulse" />}
            {systemStatus === 'ready' && <CheckCircle className="w-4 h-4" />}
            <span className="capitalize">{currentLang[systemStatus]}</span>
          </div>
        </div>
        
        {/* 控制按钮组 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleVoiceToggle}
            className={`p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              isVoiceActive 
                ? 'bg-blue-500 text-white shadow-lg' 
                : theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {isVoiceActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-sm font-medium">{currentLang.voiceControl}</span>
          </button>
          
          <button
            onClick={handleGestureToggle}
            className={`p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              isGestureActive 
                ? 'bg-green-500 text-white shadow-lg' 
                : theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <Hand className="w-5 h-5" />
            <span className="text-sm font-medium">{currentLang.gestureControl}</span>
          </button>
        </div>

        {/* 交互提示 */}
        <div className="mt-3 text-xs opacity-75 text-center">
          {isVoiceActive && (
            <div className="flex items-center justify-center gap-1 text-blue-400">
              <Mic className="w-3 h-3" />
              {currentLang.wakeWord}
            </div>
          )}
          {isGestureActive && (
            <div className="flex items-center justify-center gap-1 text-green-400 mt-1">
              <Hand className="w-3 h-3" />
              {currentLang.gestureHint}
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* 头像 */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'caocao' 
                ? 'bg-purple-500' 
                : message.type === 'voice'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
            }`}>
              {getMessageIcon(message)}
            </div>
            
            {/* 消息内容 */}
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.role === 'caocao'
                  ? theme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-900'
                  : message.type === 'voice'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.status && (
                  <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                    {message.status === 'executing' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        执行中...
                      </>
                    )}
                    {message.status === 'completed' && (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        已完成
                      </>
                    )}
                    {message.status === 'failed' && (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        失败
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs opacity-50 mt-1">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部状态栏 */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 ${isVoiceActive ? 'text-blue-500' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
              语音
            </div>
            <div className={`flex items-center gap-1 ${isGestureActive ? 'text-green-500' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isGestureActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              手势
            </div>
          </div>
          <div className="text-purple-400 font-medium">
            曹操AI • {currentLang[systemStatus]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaocaoAIChat;