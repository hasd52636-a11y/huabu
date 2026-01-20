/**
 * 语音交互水印覆盖层
 * 在画布上显示语音对话内容，提供简洁的交互反馈
 */

import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Loader2 } from 'lucide-react';

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type: 'voice' | 'system';
}

interface VoiceInteractionOverlayProps {
  isActive: boolean;
  isListening: boolean;
  messages: VoiceMessage[];
  theme?: 'light' | 'dark';
}

const VoiceInteractionOverlay: React.FC<VoiceInteractionOverlayProps> = ({
  isActive,
  isListening,
  messages,
  theme = 'dark'
}) => {
  const [visibleMessages, setVisibleMessages] = useState<VoiceMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<VoiceMessage | null>(null);

  // 管理消息显示逻辑
  useEffect(() => {
    if (messages.length === 0) {
      setVisibleMessages([]);
      setCurrentMessage(null);
      return;
    }

    // 只显示最近的2条消息
    const recentMessages = messages.slice(-2);
    setVisibleMessages(recentMessages);
    setCurrentMessage(recentMessages[recentMessages.length - 1]);

    // 5秒后自动隐藏消息
    const timer = setTimeout(() => {
      setVisibleMessages([]);
      setCurrentMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [messages]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* 状态指示器 - 右上角 */}
      <div className="absolute top-4 right-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
          theme === 'dark' 
            ? 'bg-black bg-opacity-60 text-white' 
            : 'bg-white bg-opacity-80 text-gray-900'
        }`}>
          {isListening ? (
            <>
              <Mic className="w-4 h-4 text-green-400 animate-pulse" />
              <span className="text-sm font-medium">语音监听中</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-gray-400" />
              <span className="text-sm">语音已暂停</span>
            </>
          )}
        </div>
      </div>

      {/* 消息显示区域 - 屏幕中央偏下 */}
      {visibleMessages.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-2xl w-full px-4">
          <div className="space-y-3">
            {visibleMessages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* 头像 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-purple-500'
                }`}>
                  {message.role === 'user' ? (
                    <Mic className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* 消息气泡 */}
                <div className={`max-w-md ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2 rounded-2xl backdrop-blur-sm ${
                    message.role === 'user'
                      ? theme === 'dark'
                        ? 'bg-blue-500 bg-opacity-90 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-800 bg-opacity-90 text-white'
                        : 'bg-white bg-opacity-90 text-gray-900'
                  } shadow-lg`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  
                  {/* 时间戳 */}
                  <div className={`text-xs mt-1 opacity-60 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  } ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}>
                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 处理中指示器 */}
      {currentMessage && currentMessage.content.includes('正在处理') && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-purple-600 bg-opacity-80 text-white' 
              : 'bg-purple-500 text-white'
          }`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">AI正在思考...</span>
          </div>
        </div>
      )}

      {/* 使用提示 - 首次激活时显示 */}
      {isActive && visibleMessages.length === 0 && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2">
          <div className={`px-6 py-3 rounded-lg backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-black bg-opacity-50 text-white' 
              : 'bg-white bg-opacity-80 text-gray-900'
          } text-center animate-pulse`}>
            <p className="text-sm">
              🎤 语音控制已激活，直接说话即可
            </p>
            <p className="text-xs opacity-75 mt-1">
              试试说："曹操，生成一张猫的图片"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInteractionOverlay;