/**
 * useToast Hook - Toast消息管理
 */

import { useState, useCallback } from 'react';
import { ToastMessage } from '../components/CanvasToast';

export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    type: ToastMessage['type'],
    title: string,
    message?: string,
    duration?: number
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newMessage: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: duration !== undefined ? duration : 3000
    };

    setMessages(prev => [...prev, newMessage]);
    return id;
  }, []);

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('success', title, message, duration);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('error', title, message, duration);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    return showToast('info', title, message, duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
    clearAllToasts
  };
};

export default useToast;