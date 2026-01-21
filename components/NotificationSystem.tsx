/**
 * NotificationSystem - 通知系统组件
 * 
 * 功能：
 * - 显示成功、错误、警告和信息通知
 * - 自动消失或手动关闭
 * - 支持多个通知堆叠
 * - 紫色主题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // 毫秒，0表示不自动消失
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  lang?: 'zh' | 'en';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove,
  position = 'top-right',
  lang = 'zh'
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // 翻译
  const t = {
    zh: {
      close: '关闭'
    },
    en: {
      close: 'Close'
    }
  };

  // 处理通知显示和自动消失
  useEffect(() => {
    notifications.forEach(notification => {
      if (!visibleNotifications.includes(notification.id)) {
        setVisibleNotifications(prev => [...prev, notification.id]);

        // 设置自动消失
        if (notification.duration !== 0) {
          const duration = notification.duration || 5000;
          setTimeout(() => {
            handleRemove(notification.id);
          }, duration);
        }
      }
    });
  }, [notifications, visibleNotifications]);

  const handleRemove = useCallback((id: string) => {
    setVisibleNotifications(prev => prev.filter(nId => nId !== id));
    setTimeout(() => {
      onRemove(id);
    }, 300); // 等待动画完成
  }, [onRemove]);

  // 获取图标
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
    }
  };

  // 获取样式
  const getStyles = (type: Notification['type']) => {
    const baseStyles = "border-l-4 bg-white dark:bg-slate-800 shadow-lg rounded-lg";
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-green-500`;
      case 'error':
        return `${baseStyles} border-red-500`;
      case 'warning':
        return `${baseStyles} border-amber-500`;
      case 'info':
        return `${baseStyles} border-blue-500`;
    }
  };

  // 获取位置样式
  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-[10002]';
      case 'top-left':
        return 'fixed top-4 left-4 z-[10002]';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-[10002]';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-[10002]';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`${getPositionStyles()} space-y-2 max-w-sm w-full`}>
      {notifications.map(notification => {
        const isVisible = visibleNotifications.includes(notification.id);
        
        return (
          <div
            key={notification.id}
            className={`${getStyles(notification.type)} p-4 transition-all duration-300 transform ${
              isVisible 
                ? 'translate-x-0 opacity-100 scale-100' 
                : 'translate-x-full opacity-0 scale-95'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {notification.title}
                </h4>
                {notification.message && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {notification.message}
                  </p>
                )}
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 mt-2 font-medium"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => handleRemove(notification.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={t[lang].close}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationSystem;