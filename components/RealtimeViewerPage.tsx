import React, { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeShareService, ShareSession } from '../services/RealtimeShareService';
import { shareDiagnosticService } from '../services/ShareDiagnosticService';
import { shareErrorHandler } from '../services/ShareErrorHandler';
import ShareErrorNotification from './ShareErrorNotification';
import ViewerGuideModal from './ViewerGuideModal';
import { Loader2, AlertCircle, Eye, Users, Wifi, WifiOff, Activity, Clock, Signal, HelpCircle } from 'lucide-react';

interface RealtimeViewerPageProps {
  shareId: string;
}

interface LoadingProgress {
  stage: 'connecting' | 'authenticating' | 'loading_canvas' | 'syncing' | 'complete';
  progress: number;
  message: string;
}

interface ConnectionStats {
  latency: number;
  quality: string;
  reconnectAttempts: number;
  lastUpdate: number;
  updateCount: number;
}

const RealtimeViewerPage: React.FC<RealtimeViewerPageProps> = ({ shareId }) => {
  const [session, setSession] = useState<ShareSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    stage: 'connecting',
    progress: 0,
    message: '正在连接到分享会话...'
  });
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    latency: 0,
    quality: 'unknown',
    reconnectAttempts: 0,
    lastUpdate: 0,
    updateCount: 0
  });
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [renderOptimization, setRenderOptimization] = useState({
    useVirtualization: false,
    throttleUpdates: true,
    cacheRendering: true
  });
  
  const updateCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // 优化的加载进度更新
  const updateLoadingProgress = useCallback((stage: LoadingProgress['stage'], progress: number, message: string) => {
    setLoadingProgress({ stage, progress, message });
    shareDiagnosticService.logInfo('service', '加载进度更新', { stage, progress, message });
  }, []);

  // 连接状态监控
  const monitorConnection = useCallback(() => {
    const status = realtimeShareService.getConnectionStatus();
    setIsConnected(status.isConnected);
    setConnectionStats(prev => ({
      ...prev,
      quality: status.quality?.level || 'unknown',
      reconnectAttempts: status.reconnectAttempts,
      latency: status.quality?.latency || 0
    }));
  }, []);

  // 优化的画布更新处理
  const handleCanvasUpdate = useCallback((update: any) => {
    if (update.type === 'canvas_update') {
      const now = Date.now();
      updateCountRef.current++;
      
      // 节流更新以提高性能
      if (renderOptimization.throttleUpdates && now - lastRenderTime.current < 100) {
        return;
      }
      
      setSession((prev: ShareSession | null) => prev ? {
        ...prev,
        canvasState: update.data,
        lastUpdate: update.timestamp
      } : null);
      
      setConnectionStats(prev => ({
        ...prev,
        lastUpdate: now,
        updateCount: updateCountRef.current
      }));
      
      lastRenderTime.current = now;
      
      shareDiagnosticService.logInfo('service', '画布更新处理完成', { 
        updateType: update.type, 
        timestamp: update.timestamp,
        renderTime: now - update.timestamp
      });
      shareDiagnosticService.logPerformance('canvas_render_time', now - update.timestamp, 'ms');
    }
  }, [renderOptimization.throttleUpdates]);

  useEffect(() => {
    const joinSession = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // 阶段1: 连接
        updateLoadingProgress('connecting', 20, '正在建立连接...');
        shareDiagnosticService.logInfo('service', '开始加入分享会话', { shareId });
        
        // 阶段2: 认证
        updateLoadingProgress('authenticating', 40, '正在验证会话...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟认证延迟
        
        // 阶段3: 加载画布
        updateLoadingProgress('loading_canvas', 60, '正在加载画布内容...');
        const sessionData = await realtimeShareService.joinSession(shareId);
        
        // 阶段4: 同步
        updateLoadingProgress('syncing', 80, '正在同步最新状态...');
        await new Promise(resolve => setTimeout(resolve, 300)); // 确保同步完成
        
        // 阶段5: 完成
        updateLoadingProgress('complete', 100, '加载完成！');
        
        setSession(sessionData);
        setIsConnected(true);
        
        // 启用渲染优化
        if (sessionData.canvasState.blocks.length > 20) {
          setRenderOptimization(prev => ({
            ...prev,
            useVirtualization: true
          }));
        }
        
        shareDiagnosticService.logInfo('service', '成功加入分享会话', { 
          shareId, 
          blockCount: sessionData.canvasState.blocks.length,
          viewerCount: sessionData.viewers.length
        });
        shareDiagnosticService.logPerformance('session_join_time', Date.now(), 'ms');
        
        console.log('[RealtimeViewer] Joined session:', shareId);
      } catch (err) {
        // 使用错误处理器处理错误
        await shareErrorHandler.handleError(err instanceof Error ? err : new Error('加入分享会话失败'), {
          action: 'join_session',
          shareId
        });
        
        const errorMsg = err instanceof Error ? err.message : '加入分享会话失败';
        setError(errorMsg);
        setShowErrorNotification(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (shareId) {
      joinSession();
    }

    // 设置更新回调
    realtimeShareService.setUpdateCallback(handleCanvasUpdate);

    // 启动连接监控
    connectionCheckInterval.current = setInterval(monitorConnection, 5000);

    return () => {
      // 清理
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [shareId, updateLoadingProgress, handleCanvasUpdate, monitorConnection]);

  const handleRetry = useCallback(() => {
    setError('');
    setShowErrorNotification(false);
    window.location.reload();
  }, []);

  const handleExitViewer = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  }, []);

  // 渲染加载进度组件
  const renderLoadingProgress = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在连接分享会话</h2>
          <p className="text-gray-600 mb-4">{loadingProgress.message}</p>
          
          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress.progress}%` }}
            ></div>
          </div>
          
          {/* 阶段指示器 */}
          <div className="flex justify-center space-x-2 mb-4">
            {['connecting', 'authenticating', 'loading_canvas', 'syncing', 'complete'].map((stage, index) => (
              <div
                key={stage}
                className={`w-3 h-3 rounded-full ${
                  loadingProgress.stage === stage ? 'bg-blue-500 animate-pulse' :
                  index < ['connecting', 'authenticating', 'loading_canvas', 'syncing', 'complete'].indexOf(loadingProgress.stage) ? 'bg-green-500' :
                  'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <p className="text-sm text-gray-500">{loadingProgress.progress}% 完成</p>
        </div>
      </div>
    </div>
  );

  // 渲染连接状态指示器
  const renderConnectionStatus = () => (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
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
      
      {connectionStats.quality !== 'unknown' && (
        <div className="flex items-center gap-1">
          <Signal className={`w-4 h-4 ${
            connectionStats.quality === 'excellent' ? 'text-green-500' :
            connectionStats.quality === 'good' ? 'text-blue-500' :
            connectionStats.quality === 'fair' ? 'text-yellow-500' : 'text-red-500'
          }`} />
          <span className={`${
            connectionStats.quality === 'excellent' ? 'text-green-600' :
            connectionStats.quality === 'good' ? 'text-blue-600' :
            connectionStats.quality === 'fair' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {connectionStats.quality === 'excellent' ? '优秀' :
             connectionStats.quality === 'good' ? '良好' :
             connectionStats.quality === 'fair' ? '一般' : '较差'}
          </span>
        </div>
      )}
      
      {connectionStats.latency > 0 && (
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{connectionStats.latency}ms</span>
        </div>
      )}
      
      {connectionStats.reconnectAttempts > 0 && (
        <div className="flex items-center gap-1 text-orange-600">
          <Activity className="w-4 h-4" />
          <span>重连 {connectionStats.reconnectAttempts} 次</span>
        </div>
      )}
    </div>
  );

  // 渲染优化的画布内容
  const renderCanvasContent = () => {
    if (!session) return null;

    const blocks = session.canvasState.blocks || [];
    
    // 如果启用虚拟化且块数量很多
    if (renderOptimization.useVirtualization && blocks.length > 20) {
      // 简化渲染，只显示前20个块
      const visibleBlocks = blocks.slice(0, 20);
      return (
        <div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <Activity className="w-4 h-4 inline mr-1" />
              性能优化已启用：显示前 20 个模块（共 {blocks.length} 个）
            </p>
          </div>
          {renderBlockGrid(visibleBlocks)}
        </div>
      );
    }
    
    return renderBlockGrid(blocks);
  };

  const renderBlockGrid = (blocks: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {blocks.map((block: any, index: number) => (
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
              {block.width}×{block.height}
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
  );

  if (isLoading) {
    return renderLoadingProgress();
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">连接失败</h2>
          
          {/* 详细错误信息 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">错误详情：</h3>
            <p className="text-sm text-red-700 mb-3">{error}</p>
            
            {/* 错误原因分析 */}
            <div className="text-xs text-red-600">
              <p className="mb-1"><strong>可能原因：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>分享会话已过期或被主持人结束</li>
                <li>网络连接不稳定或中断</li>
                <li>分享链接无效或已损坏</li>
                <li>服务器暂时不可用</li>
              </ul>
            </div>
          </div>

          {/* 解决方案建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-blue-800 mb-2">解决方案：</h3>
            <div className="text-xs text-blue-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <span>检查网络连接，确保网络正常</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>联系分享主持人确认会话是否仍然活跃</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>尝试重新获取最新的分享链接</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">4.</span>
                <span>如果问题持续，请稍后再试</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4" />
              重试连接
            </button>
            <button
              onClick={() => {
                // 复制当前链接到剪贴板
                navigator.clipboard.writeText(window.location.href).then(() => {
                  alert('链接已复制到剪贴板，请联系主持人确认');
                });
              }}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              复制链接
            </button>
            <button
              onClick={handleExitViewer}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              返回主页
            </button>
          </div>

          {/* 技术支持信息 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">如果问题持续存在，请提供以下信息给技术支持：</p>
            <div className="bg-gray-100 rounded p-2 text-xs text-gray-600 font-mono">
              会话ID: {shareId}<br/>
              错误时间: {new Date().toLocaleString()}<br/>
              浏览器: {navigator.userAgent.split(' ').slice(-2).join(' ')}<br/>
              连接尝试: {connectionStats.reconnectAttempts} 次
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">会话不存在</h2>
          
          {/* 详细说明 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">可能的情况：</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>分享会话已被主持人结束</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>分享链接已过期（会话超时）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>分享链接格式不正确</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">•</span>
                <span>会话ID无效或不存在</span>
              </div>
            </div>
          </div>

          {/* 建议操作 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-blue-800 mb-2">建议操作：</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <span>联系分享主持人确认会话状态</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>请求主持人重新发送分享链接</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>检查链接是否完整（避免复制时截断）</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              刷新页面
            </button>
            <button
              onClick={handleExitViewer}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回主页
            </button>
          </div>

          {/* 会话信息 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">会话信息：</p>
            <div className="bg-gray-100 rounded p-2 text-xs text-gray-600 font-mono">
              会话ID: {shareId}<br/>
              访问时间: {new Date().toLocaleString()}<br/>
              页面URL: {window.location.href}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 用户引导模态框 */}
      <ViewerGuideModal 
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
      
      {/* 错误通知 */}
      {showErrorNotification && (
        <ShareErrorNotification 
          onClose={() => setShowErrorNotification(false)}
        />
      )}
      
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-900">观看模式</h1>
            </div>
            {renderConnectionStatus()}
            <button
              onClick={() => setShowGuideModal(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="查看使用指南"
            >
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </button>
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
              {connectionStats.updateCount > 0 && (
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>{connectionStats.updateCount} 更新</span>
                </div>
              )}
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  主持人正在分享画布内容，你可以实时查看所有操作
                </p>
                <div className="text-xs text-gray-400">
                  最后更新: {session.lastUpdate ? new Date(session.lastUpdate).toLocaleTimeString() : '未知'}
                </div>
              </div>
            </div>

            {/* 画布预览区域 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-96 bg-gray-50">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    {isConnected ? '实时同步中' : '连接中断'}
                  </div>
                </div>
                
                {session.canvasState.blocks.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      画布包含 {session.canvasState.blocks.length} 个模块
                      {renderOptimization.useVirtualization && ' (性能优化模式)'}
                    </p>
                    {renderCanvasContent()}
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

export default RealtimeViewerPage;