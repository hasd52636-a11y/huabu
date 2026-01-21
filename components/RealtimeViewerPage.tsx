import React, { useState, useEffect } from 'react';
import { realtimeShareService, ShareSession } from '../services/RealtimeShareService';
import { Loader2, AlertCircle, Eye, Users, Wifi, WifiOff } from 'lucide-react';

interface RealtimeViewerPageProps {
  shareId: string;
}

const RealtimeViewerPage: React.FC<RealtimeViewerPageProps> = ({ shareId }) => {
  const [session, setSession] = useState<ShareSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const joinSession = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const sessionData = await realtimeShareService.joinSession(shareId);
        setSession(sessionData);
        setIsConnected(true);
        setLastUpdate(Date.now());
        
        console.log('[RealtimeViewer] Joined session:', shareId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '加入分享会话失败';
        setError(errorMsg);
        console.error('[RealtimeViewer] Failed to join session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (shareId) {
      joinSession();
    }

    // 设置更新回调
    realtimeShareService.setUpdateCallback((update) => {
      if (update.type === 'canvas_update') {
        setSession(prev => prev ? {
          ...prev,
          canvasState: update.data,
          lastUpdate: update.timestamp
        } : null);
        setLastUpdate(Date.now());
        console.log('[RealtimeViewer] Canvas updated');
      }
    });

    return () => {
      // 清理
    };
  }, [shareId]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleExitViewer = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在连接分享会话...</h2>
          <p className="text-gray-600">请稍候，正在加载画布内容</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">连接失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重试连接
            </button>
            <button
              onClick={handleExitViewer}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              退出观看
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">会话不存在</h2>
          <p className="text-gray-600 mb-6">分享会话可能已结束或不存在</p>
          <button
            onClick={handleExitViewer}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-900">观看模式</h1>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">连接中断</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{session.viewers.length} 观众</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{session.canvasState.blocks.length} 模块</span>
              </div>
            </div>
            <button
              onClick={handleExitViewer}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              退出观看
            </button>
          </div>
        </div>
      </div>

      {/* 画布内容 */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">{session.title}</h2>
              <p className="text-sm text-gray-600">
                主持人正在分享画布内容，你可以实时查看所有操作
              </p>
            </div>

            {/* 画布预览区域 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-96 bg-gray-50">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    实时同步中
                  </div>
                </div>
                
                {session.canvasState.blocks.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      画布包含 {session.canvasState.blocks.length} 个模块
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                      {session.canvasState.blocks.map((block: any, index: number) => (
                        <div key={block.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              block.type === 'text' ? 'bg-blue-500' :
                              block.type === 'image' ? 'bg-green-500' :
                              block.type === 'video' ? 'bg-purple-500' : 'bg-gray-500'
                            }`}></div>
                            <span className="text-sm font-medium text-gray-700">
                              {block.type === 'text' ? '文本' :
                               block.type === 'image' ? '图片' :
                               block.type === 'video' ? '视频' : '未知'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {block.content ? 
                              (block.content.length > 50 ? 
                                block.content.substring(0, 50) + '...' : 
                                block.content) : 
                              '无内容'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500 mb-2">画布暂时为空</p>
                    <p className="text-sm text-gray-400">等待主持人添加内容...</p>
                  </div>
                )}

                <div className="mt-6 text-xs text-gray-400">
                  最后更新: {new Date(session.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeViewerPage;