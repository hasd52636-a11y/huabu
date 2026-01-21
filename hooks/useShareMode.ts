import { useState, useEffect } from 'react';
import { p2pShareService } from '../services/P2PShareService';

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
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const watchId = urlParams.get('watch');

    if (watchId) {
      // 进入观看模式
      setState(prev => ({
        ...prev,
        isViewer: true,
        shareId: watchId,
        isConnecting: true
      }));

      // 尝试连接
      connectToShare(watchId);
    }
  }, []);

  const connectToShare = async (shareId: string) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));
      
      const success = await p2pShareService.joinViewing(shareId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          isConnected: true,
          connectionError: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          isConnected: false,
          connectionError: '无法连接到分享者，可能分享已结束或网络问题'
        }));
      }
    } catch (error) {
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