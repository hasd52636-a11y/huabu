import React, { useState, useEffect } from 'react';
import { Eye, Home, RefreshCw } from 'lucide-react';

interface SimpleViewerPageProps {
  shareId: string;
}

const SimpleViewerPage: React.FC<SimpleViewerPageProps> = ({ shareId }) => {
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 尝试从localStorage获取分享数据
    try {
      const data = localStorage.getItem(`canvas-share-${shareId}`);
      if (data) {
        const parsedData = JSON.parse(data);
        setShareData(parsedData);
        setError('');
      } else {
        setError('分享不存在或已过期');
      }
    } catch (err) {
      setError('无法加载分享数据');
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  const handleRefresh = () => {
    setLoading(true);
    // 重新加载数据
    setTimeout(() => {
      const data = localStorage.getItem(`canvas-share-${shareId}`);
      if (data) {
        const parsedData = JSON.parse(data);
        setShareData(parsedData);
        setError('');
      }
      setLoading(false);
    }, 500);
  };

  const handleGoHome = () => {
    // 清除URL参数并返回主页
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">加载中...</h2>
            <p className="text-gray-600">正在获取分享内容</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无法访问分享</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新加载
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                返回主页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">观看分享内容</h1>
            <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              简化版
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              分享ID: <span className="font-mono">{shareId}</span>
            </div>
            
            <button
              onClick={handleGoHome}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">分享内容</h2>
            
            {shareData && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">分享信息</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>分享时间: {new Date(shareData.timestamp).toLocaleString()}</p>
                    <p>分享ID: {shareData.shareId}</p>
                    <p>状态: {shareData.message}</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">简化版分享说明</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• 这是一个基础的分享功能演示</li>
                      <li>• 不需要复杂的网络配置</li>
                      <li>• 适合快速分享和展示</li>
                      <li>• 可以在此基础上扩展更多功能</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={handleRefresh}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                刷新内容
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleViewerPage;