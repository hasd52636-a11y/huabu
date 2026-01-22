import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Eye, Users, Wifi, WifiOff, Clock, HelpCircle, ArrowLeft } from 'lucide-react';

interface ShareSession {
  id: string;
  hostId: string;
  title: string;
  createdAt: number;
  lastUpdate: number;
  canvasState: {
    blocks: any[];
    connections: any[];
    zoom: number;
    pan: { x: number; y: number };
  };
  viewers: any[];
  isActive: boolean;
}

interface IsolatedViewerPageProps {
  shareId: string;
}

/**
 * 隔离的观看页面 - 完全独立于RealtimeShareService
 * 直接从localStorage读取数据，避免复杂的服务逻辑
 * 保持原有的主应用样式和布局
 */
const IsolatedViewerPage: React.FC<IsolatedViewerPageProps> = ({ shareId }) => {
  const [session, setSession] = useState<ShareSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);

  // 简化的数据加载函数
  const loadSessionData = useCallback(() => {
    try {
      console.log('[IsolatedViewer] Loading session data for:', shareId);
      
      const sessionKey = `share-session-${shareId}`;
      const sessionData = localStorage.getItem(sessionKey);
      
      if (!sessionData) {
        throw new Error(`分享会话 ${shareId} 不存在`);
      }
      
      const parsedSession = JSON.parse(sessionData);
      
      // 验证数据完整性
      if (!parsedSession.id || !parsedSession.canvasState) {
        throw new Error('分享数据格式无效');
      }
      
      console.log('[IsolatedViewer] Session loaded successfully:', parsedSession);
      setSession(parsedSession);
      setLastUpdate(parsedSession.lastUpdate || Date.now());
      setError('');
      
    } catch (err) {
      console.error('[IsolatedViewer] Failed to load session:', err);
      const errorMsg = err instanceof Error ? err.message : '加载分享会话失败';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [shareId]);

  // 简化的轮询更新函数
  const checkForUpdates = useCallback(() => {
    if (!session) return;
    
    try {
      const sessionKey = `share-session-${shareId}`;
      const sessionData = localStorage.getItem(sessionKey);
      
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        
        // 检查是否有更新
        if (parsedSession.lastUpdate > lastUpdate) {
          console.log('[IsolatedViewer] New update detected');
          setSession(parsedSession);
          setLastUpdate(parsedSession.lastUpdate);
          setUpdateCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.warn('[IsolatedViewer] Update check failed:', err);
      // 不设置错误状态，继续尝试
    }
  }, [shareId, session, lastUpdate]);

  // 初始化加载
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // 设置轮询更新（仅在有会话时）
  useEffect(() => {
    if (!session || error) return;
    
    const pollInterval = setInterval(checkForUpdates, 2000); // 2秒轮询
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [session, error, checkForUpdates]);

  const handleRetry = useCallback(() => {
    setError('');
    setIsLoading(true);
    setTimeout(loadSessionData, 500);
  }, [loadSessionData]);

  const handleExitViewer = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  }, []);

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在加载分享内容</h2>
          <p className="text-gray-600 mb-4">请稍候...</p>
          <div className="text-sm text-gray-500">
            会话ID: {shareId}
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">无法加载分享内容</h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">错误信息：</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-blue-800 mb-2">解决方案：</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div>• 确认分享链接是否正确</div>
              <div>• 联系分享者重新发送链接</div>
              <div>• 检查网络连接状态</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
            <button
              onClick={handleExitViewer}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回主页
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-100 rounded p-2 text-xs text-gray-600 font-mono">
              会话ID: {shareId}<br/>
              错误时间: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 渲染主内容
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部状态栏 - 保持原有样式 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-900">观看模式</h1>
              <span className="text-sm text-gray-500">(隔离模式)</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600">已连接</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>实时同步</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{session?.viewers?.length || 0} 观众</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{session?.canvasState?.blocks?.length || 0} 模块</span>
              </div>
              {updateCount > 0 && (
                <div className="flex items-center gap-1">
                  <span>{updateCount} 更新</span>
                </div>
              )}
            </div>
            <button
              onClick={handleExitViewer}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              退出观看
            </button>
          </div>
        </div>
      </div>

      {/* 画布内容区域 - 保持原有样式 */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                {session?.title || '分享画布'}
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  主持人正在分享画布内容，你可以实时查看所有操作
                </p>
                <div className="text-xs text-gray-400">
                  最后更新: {session?.lastUpdate ? new Date(session.lastUpdate).toLocaleTimeString() : '未知'}
                </div>
              </div>
            </div>

            {/* 画布预览区域 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-96 bg-gray-50">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    隔离模式运行中
                  </div>
                </div>
                
                {session?.canvasState?.blocks && session.canvasState.blocks.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      画布包含 {session.canvasState.blocks.length} 个模块
                    </p>
                    
                    {/* 模块网格显示 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                      {session.canvasState.blocks.map((block: any, index: number) => (
                        <div key={block.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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
                            <span className="text-xs text-gray-400 ml-auto">
                              #{block.number || index + 1}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {block.content ? 
                              (block.content.length > 50 ? 
                                block.content.substring(0, 50) + '...' : 
                                block.content) : 
                              '无内容'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            位置: ({Math.round(block.x || 0)}, {Math.round(block.y || 0)})
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsolatedViewerPage;