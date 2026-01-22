import React, { useState, useEffect } from 'react';
import { AlertCircle, Eye, Home, RefreshCw } from 'lucide-react';
import { useShareMode } from '../hooks/useShareMode';

interface MinimalViewerPageProps {
  shareId: string;
}

const MinimalViewerPage: React.FC<MinimalViewerPageProps> = ({ shareId }) => {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const shareMode = useShareMode();

  useEffect(() => {
    console.log('[MinimalViewer] Loading shareId:', shareId);
    console.log('[MinimalViewer] ShareMode state:', shareMode);
    
    // 如果useShareMode已经设置了错误，直接使用
    if (shareMode.connectionError) {
      setError(shareMode.connectionError);
      setLoading(false);
      return;
    }
    
    // 简单的超时处理
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(`分享会话 ${shareId} 不存在或已过期`);
    }, 1000); // 缩短到1秒

    // 清理函数
    return () => {
      clearTimeout(timeout);
    };
  }, [shareId, shareMode.connectionError]);

  const handleGoHome = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('watch');
      window.location.href = url.toString();
    } catch (error) {
      // 如果URL操作失败，直接跳转到根路径
      window.location.href = '/';
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">正在连接分享会话</h2>
          <p className="text-gray-600 text-sm">分享ID: {shareId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-lg mx-4">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">无法连接到分享会话</h2>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-red-800 mb-2">错误信息：</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-blue-800 mb-2">可能的原因：</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 分享会话已过期或被主持人结束</li>
            <li>• 分享链接无效或不完整</li>
            <li>• 网络连接问题</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
          
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">分享ID: {shareId}</p>
        </div>
      </div>
    </div>
  );
};

export default MinimalViewerPage;