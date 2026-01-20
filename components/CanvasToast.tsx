/**
 * Canvas Toast - 画布静默提示组件
 * 在画布左上角显示非侵入式的操作反馈
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  position?: { x: number; y: number };
}

interface CanvasToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
  theme?: 'light' | 'dark';
}

const CanvasToast: React.FC<CanvasToastProps> = ({
  messages,
  onRemove,
  theme = 'dark'
}) => {
  useEffect(() => {
    messages.forEach(message => {
      if (message.duration !== 0) { // 0表示不自动消失
        const timer = setTimeout(() => {
          onRemove(message.id);
        }, message.duration || 3000);

        return () => clearTimeout(timer);
      }
    });
  }, [messages, onRemove]);

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: ToastMessage['type']) => {
    if (theme === 'dark') {
      switch (type) {
        case 'success':
          return 'bg-green-900/90 border-green-700';
        case 'error':
          return 'bg-red-900/90 border-red-700';
        case 'info':
        default:
          return 'bg-blue-900/90 border-blue-700';
      }
    } else {
      switch (type) {
        case 'success':
          return 'bg-green-50/95 border-green-200';
        case 'error':
          return 'bg-red-50/95 border-red-200';
        case 'info':
        default:
          return 'bg-blue-50/95 border-blue-200';
      }
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 pointer-events-none">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`
            flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm
            transform transition-all duration-300 ease-out pointer-events-auto
            ${getBackgroundColor(message.type)}
            ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
          `}
          style={{
            maxWidth: '320px'
          }}
        >
          {getIcon(message.type)}
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {message.title}
            </div>
            {message.message && (
              <div className="text-xs opacity-80 mt-1">
                {message.message}
              </div>
            )}
          </div>

          <button
            onClick={() => onRemove(message.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default CanvasToast;