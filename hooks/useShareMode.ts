import { useState, useEffect } from 'react';
import { realtimeShareService } from '../services/RealtimeShareService';

export interface ShareModeState {
  isViewer: boolean;
  shareId: string;
  isConnecting: boolean;
  connectionError: string | null;
  isConnected: boolean;
}

export const useShareMode = () => {
  const [state, setState] = useState<ShareModeState>({
    isViewer: false,
    shareId: '',
    isConnecting: false,
    connectionError: null,
    isConnected: false
  });

  useEffect(() => {
    console.log('[useShareMode] Hook initialized');
    
    try {
      // 检查URL参数
      const urlParams = new URLSearchParams(window.location.search);
      const watchId = urlParams.get('watch');
      
      console.log('[useShareMode] URL params:', { watchId });

      if (watchId) {
        console.log('[useShareMode] Entering viewer mode with ID:', watchId);
        
        // 进入观看模式
        setState(prev => ({
          ...prev,
          isViewer: true,
          shareId: watchId,
          isConnecting: true
        }));

        // 尝试连接
        connectToShare(watchId);
      } else {
        console.log('[useShareMode] No watch ID found, staying in normal mode');
      }
    } catch (error) {
      console.error('[useShareMode] Error in initialization:', error);
      setState(prev => ({
        ...prev,
        connectionError: `初始化错误: ${error instanceof Error ? error.message : '未知错误'}`
      }));
    }
  }, []);

  const connectToShare = async (shareId: string) => {
    console.log('[useShareMode] Attempting to connect to share:', shareId);
    
    try {
      setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));
      
      // 使用 RealtimeShareService 连接
      await realtimeShareService.joinSession(shareId);
      
      console.log('[useShareMode] Successfully connected to share session');
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        connectionError: null
      }));
    } catch (error) {
      console.error('[useShareMode] Connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        connectionError: error instanceof Error ? error.message : '连接失败'
      }));
    }
  };

  const retry = () => {
    if (state.shareId) {
      connectToShare(state.shareId);
    }
  };

  const exitViewer = () => {
    // 清除URL参数并刷新页面
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  };

  return {
    ...state,
    retry,
    exitViewer
  };
};