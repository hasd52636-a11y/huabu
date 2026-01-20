/**
 * Canvas Confirm Dialog - 画布确认对话框
 * 在画布中央显示需要用户确认的操作对话框
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  theme?: 'light' | 'dark';
}

const CanvasConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'warning',
  onConfirm,
  onCancel,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info':
      default:
        return <AlertTriangle className="w-6 h-6 text-blue-500" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* 对话框 */}
      <div className={`
        relative w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl border
        transform transition-all duration-200 scale-100
        ${theme === 'dark' 
          ? 'bg-gray-800 border-gray-700 text-white' 
          : 'bg-white border-gray-200 text-gray-900'
        }
      `}>
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className={`
            absolute top-4 right-4 p-1 rounded-lg transition-colors
            ${theme === 'dark' 
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }
          `}
        >
          <X className="w-4 h-4" />
        </button>

        {/* 图标和标题 */}
        <div className="flex items-center gap-3 mb-4">
          {getIcon()}
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
        </div>

        {/* 消息内容 */}
        <div className={`mb-6 text-sm leading-relaxed ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {message}
        </div>

        {/* 按钮组 */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }
            `}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${getConfirmButtonStyle()}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasConfirmDialog;