/**
 * 曹操AI对话界面 - 右侧侧边栏AI助手
 * 提供语音唤醒、指令执行反馈和智能对话功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Mic, MicOff, Volume2, VolumeX, 
  Send, User, Bot, Zap, CheckCircle, AlertCircle,
  Hand, Eye, Brain, Settings
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'caocao';
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system';
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
      id: '1',
      role: 'caocao',
      content: '主人，我是曹操画布工具，随时为您服务！您可以说"曹操"唤醒我，或使用手势控制画布。',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      title: '曹操AI助手',
      placeholder: '输入指令或说话...',
      send: '发送',
      voiceOn: '语音已开启',
      voiceOff: '语音已关闭',
      gestureOn: '手势已开启',
      gestureOff: '手势已关闭',
      listening: '正在聆听...',
      executing: '执行中...',
      completed: '完成',
      failed: '失败',
      wakeWord: '说"曹操"唤醒',
      caocaoResponses: {
        greeting: '主人好！曹操为您效劳！',
        commandReceived: '收到指令，正在执行...',
        commandCompleted: '指令执行完毕，主人还有什么吩咐？',
        commandFailed: '抱歉主人，指令执行失败，请重试。',
        voiceActivated: '语音控制已激活，请说出您的指令。',
        gestureActivated: '手势控制已激活，请做出手势指令。',
        ready: '曹操已就绪，随时为主人服务！'
      }
    },
    en: {
      title: 'Caocao AI Assistant',
      placeholder: 'Type command or speak...',
      send: 'Send',
      voiceOn: 'Voice On',
      voiceOff: 'Voice Off',
      gestureOn: 'Gesture On',
      gestureOff: 'Gesture Off',
      listening: 'Listening...',
      executing: 'Executing...',
      completed: 'Completed',
      failed: 'Failed',
      wakeWord: 'Say "Caocao" to wake',
      caocaoResponses: {
        greeting: 'Greetings, Master! Caocao at your service!',
        commandReceived: 'Command received, executing...',
        commandCompleted: 'Command completed. What else can I do for you, Master?',
        commandFailed: 'Sorry Master, command failed. Please try again.',
        voiceActivated: 'Voice control activated. Please speak your command.',
        gestureActivated: 'Gesture control activated. Please make gesture commands.',
        ready: 'Caocao is ready to serve you, Master!'
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

  // 添加曹操回复
  const addCaocaoMessage = (content: string, type: 'text' | 'system' = 'text') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'caocao',
      content,
      timestamp: new Date(),
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 添加用户消息
  const addUserMessage = (content: string, commandType?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      type: commandType ? 'command' : 'text',
      commandType,
      status: commandType ? 'executing' : undefined
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  // 更新消息状态
  const updateMessageStatus = (messageId: string, status: 'completed' | 'failed') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  // 处理语音控制切换
  const handleVoiceToggle = () => {
    const newState = !isVoiceActive;
    onVoiceToggle(newState);
    
    if (newState) {
      addCaocaoMessage(currentLang.caocaoResponses.voiceActivated, 'system');
    } else {
      addCaocaoMessage('语音控制已关闭。', 'system');
    }
  };

  // 处理手势控制切换
  const handleGestureToggle = () => {
    const newState = !isGestureActive;
    onGestureToggle(newState);
    
    if (newState) {
      addCaocaoMessage(currentLang.caocaoResponses.gestureActivated, 'system');
    } else {
      addCaocaoMessage('手势控制已关闭。', 'system');
    }
  };

  // 处理指令发送
  const handleSendCommand = () => {
    if (!inputText.trim()) return;

    const messageId = addUserMessage(inputText, 'command');
    addCaocaoMessage(currentLang.caocaoResponses.commandReceived);
    
    // 执行指令
    onCommand(inputText);
    setLastCommand(inputText);
    setInputText('');

    // 模拟指令执行完成
    setTimeout(() => {
      updateMessageStatus(messageId, 'completed');
      addCaocaoMessage(currentLang.caocaoResponses.commandCompleted);
    }, 1000);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  // 获取消息图标
  const getMessageIcon = (message: ChatMessage) => {
    if (message.role === 'caocao') {
      return <Bot className="w-4 h-4 text-purple-500" />;
    } else {
      if (message.type === 'command') {
        switch (message.status) {
          case 'executing':
            return <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />;
          case 'completed':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
          case 'failed':
            return <AlertCircle className="w-4 h-4 text-red-500" />;
          default:
            return <User className="w-4 h-4 text-blue-500" />;
        }
      }
      return <User className="w-4 h-4 text-blue-500" />;
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
      {/* 标题栏 */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">{currentLang.title}</h3>
        </div>
        
        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceToggle}
            className={`p-2 rounded-lg transition-colors ${
              isVoiceActive 
                ? 'bg-green-500 text-white' 
                : theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title={isVoiceActive ? currentLang.voiceOn : currentLang.voiceOff}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleGestureToggle}
            className={`p-2 rounded-lg transition-colors ${
              isGestureActive 
                ? 'bg-blue-500 text-white' 
                : theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title={isGestureActive ? currentLang.gestureOn : currentLang.gestureOff}
          >
            <Hand className="w-4 h-4" />
          </button>
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
                : 'bg-blue-500'
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
                  : 'bg-blue-500 text-white'
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.type === 'command' && message.status && (
                  <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                    {message.status === 'executing' && (
                      <>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        {currentLang.executing}
                      </>
                    )}
                    {message.status === 'completed' && (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        {currentLang.completed}
                      </>
                    )}
                    {message.status === 'failed' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        {currentLang.failed}
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

      {/* 输入区域 */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentLang.placeholder}
            className={`flex-1 px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            onClick={handleSendCommand}
            disabled={!inputText.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={currentLang.send}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* 状态指示 */}
        <div className="flex items-center justify-between mt-2 text-xs opacity-75">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 ${isVoiceActive ? 'text-green-500' : ''}`}>
              <Mic className="w-3 h-3" />
              {isVoiceActive ? currentLang.voiceOn : currentLang.voiceOff}
            </div>
            <div className={`flex items-center gap-1 ${isGestureActive ? 'text-blue-500' : ''}`}>
              <Hand className="w-3 h-3" />
              {isGestureActive ? currentLang.gestureOn : currentLang.gestureOff}
            </div>
          </div>
          <div className="text-purple-400">
            {currentLang.wakeWord}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaocaoAIChat;