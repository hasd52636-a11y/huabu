/**
 * useNotifications - 通知管理 Hook
 * 
 * 功能：
 * - 添加、移除通知
 * - 自动生成通知ID
 * - 提供便捷的成功、错误、警告、信息通知方法
 */

import { useState, useCallback } from 'react';
import { Notification } from '../components/NotificationSystem';

interface NotificationOptions {
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 添加通知
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id
    };
    
    setNotifications(prev => [...prev, newNotification]);
    return id;
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 清除所有通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便捷方法
  const showSuccess = useCallback((options: NotificationOptions) => {
    return addNotification({
      type: 'success',
      duration: 4000,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((options: NotificationOptions) => {
    return addNotification({
      type: 'error',
      duration: 6000,
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((options: NotificationOptions) => {
    return addNotification({
      type: 'warning',
      duration: 5000,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((options: NotificationOptions) => {
    return addNotification({
      type: 'info',
      duration: 4000,
      ...options
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};