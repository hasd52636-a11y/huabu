import React, { useState, useEffect } from 'react';
import { Eye, Users, Wifi, WifiOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { ShareProvider, useShare } from '../real-time-share-kit/core/ShareProvider';
import Canvas from './Canvas';

interface ShareKitViewerPageProps {
  shareId: string;
}

// 添加画布网格样式（与主应用保持一致）
const canvasGridStyles = `
  .canvas-grid {
    background-color: #ffffff;
    background-image: radial-gradient(circle, rgba(100, 100, 100, 0.3) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .dark .canvas-grid {
    background-color: #020617;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
    background-size: 20px 20px;
  }
`;

/**
 * 内部观看页面组件 - 在 ShareProvider 内部使用
 */
const ShareKitViewerPageInternal: React.FC<{ shareId: string }> = ({ shareId }) => {
  const { session, receivedData } = useShare();
  const [canvasData, setCanvasData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 添加调试信息
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
    console.log(`[ShareKitViewer] ${message}`);
  };

  // 接收分享数据 - 优化处理
  useEffect(() => {
    if (receivedData) {
      // 延迟处理接收到的数据，避免频繁更新
      const timeoutId = setTimeout(() => {
        addDebugInfo(`处理接收到的数据: ${JSON.stringify(receivedData).substring(0, 50)}...`);
        setCanvasData(receivedData);
        setIsLoading(false);
      }, 50); // 50ms 延迟处理
      
      return () => clearTimeout(timeoutId);
    }
  }, [receivedData]);

  // 监听连接状态
  useEffect(() => {
    addDebugInfo(`连接状态变化: ${session.status}, 是否主机: ${session.isHost}`);
    
    if (session.status === 'connected' && !session.isHost) {
      addDebugInfo('已连接到分享会话，等待数据...');
      // 连接成功但可能还没有数据，继续等待
    } else if (session.status === 'error') {
      setError('连接分享会话失败');
      setIsLoading(false);
    } else if (session.status === 'connecting') {
      addDebugInfo('正在连接到主机...');
    }
  }, [session.status, session.isHost]);

  // 监听观看者数量变化
  useEffect(() => {
    if (session.viewers.length > 0) {
      addDebugInfo(`观看者数量: ${session.viewers.length}`);
    }
  }, [session.viewers.length]);

  // 初始化时的调试信息
  useEffect(() => {
    addDebugInfo(`开始连接到分享ID: ${shareId}`);
    
    // 添加画布网格样式到页面
    const styleElement = document.createElement('style');
    styleElement.textContent = canvasGridStyles;
    document.head.appendChild(styleElement);
    
    // 清理函数
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [shareId]);

  const handleExitViewer = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在连接分享会话</h2>
          <p className="text-gray-600 mb-4">连接到 {shareId}...</p>
          
          {/* 连接状态 */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              {session.status === 'connecting' ? (
                <>
                  <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
                  <span className="text-yellow-600 text-sm">正在连接...</span>
                </>
              ) : session.status === 'connected' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-sm">已连接，等待数据</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 text-sm">准备连接</span>
                </>
              )}
            </div>
          </div>
          
          {/* 调试信息 */}
          {debugInfo.length > 0 && (
            <div className="bg-gray-100 border rounded-lg p-3 text-left">
              <h4 className="text-sm font-medium text-gray-700 mb-2">连接日志:</h4>
              <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">连接失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重试连接
            </button>
            <button
              onClick={handleExitViewer}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen canvas-grid">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-900">观看模式</h1>
            </div>
            
            {/* 连接状态 */}
            <div className="flex items-center gap-1">
              {session.status === 'connected' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 text-sm">已连接</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 text-sm">连接中断</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 观众数量 */}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{session.viewers.length} 观众</span>
            </div>
            
            {/* 退出按钮 */}
            <button
              onClick={handleExitViewer}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              退出观看
            </button>
          </div>
        </div>
      </div>

      {/* 画布内容区域 */}
      <div className="pt-16">
        {canvasData ? (
          <div className="relative">
            {/* 只读提示 */}
            <div className="absolute top-4 left-4 z-40 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>实时观看中 - 只读模式</span>
              </div>
            </div>
            
            {/* 渲染画布 - 使用与主应用相同的背景样式 */}
            <div className="relative canvas-grid" style={{ minHeight: '100vh' }}>
              {/* 简化的画布渲染 */}
              <div 
                className="relative overflow-hidden"
                style={{
                  transform: `scale(${canvasData.zoom || 1}) translate(${(canvasData.pan?.x || 0)}px, ${(canvasData.pan?.y || 0)}px)`,
                  transformOrigin: '0 0',
                  width: '100%',
                  height: '100vh'
                }}
              >
                {/* 渲染所有块 */}
                {(canvasData.blocks || []).map((block: any) => (
                  <div
                    key={block.id}
                    className="absolute bg-white border border-gray-200 rounded-lg shadow-sm p-4"
                    style={{
                      left: `${block.x}px`,
                      top: `${block.y}px`,
                      width: `${block.width}px`,
                      height: `${block.height}px`,
                      pointerEvents: 'none' // 禁用所有交互
                    }}
                  >
                    {/* 块类型指示器 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        block.type === 'text' ? 'bg-blue-500' :
                        block.type === 'image' ? 'bg-green-500' :
                        block.type === 'video' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {block.type === 'text' ? '文本' :
                         block.type === 'image' ? '图片' :
                         block.type === 'video' ? '视频' : '未知'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">#{block.number}</span>
                    </div>
                    
                    {/* 块内容 */}
                    <div className="text-sm text-gray-700 overflow-hidden">
                      {block.type === 'text' && (
                        <div className="whitespace-pre-wrap break-words">
                          {block.content || '空文本'}
                        </div>
                      )}
                      {block.type === 'image' && block.content && (
                        <div className="w-full h-full relative overflow-hidden">
                          <img 
                            src={block.content} 
                            alt="分享图片" 
                            className={`w-full h-full object-cover transition-transform duration-1000 ${
                              block.isCropped ? 'scale-150' : 'scale-100'
                            }`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                        </div>
                      )}
                      {block.type === 'video' && block.content && (
                        <video 
                          src={block.content} 
                          className="w-full h-full object-contain"
                          controls
                          preload="metadata"
                        />
                      )}
                      {!block.content && (
                        <div className="text-gray-400 italic">无内容</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 渲染连接线 */}
                {(canvasData.connections || []).map((connection: any) => {
                  const fromBlock = canvasData.blocks?.find((b: any) => b.id === connection.fromId);
                  const toBlock = canvasData.blocks?.find((b: any) => b.id === connection.toId);
                  
                  if (!fromBlock || !toBlock) return null;
                  
                  const fromX = fromBlock.x + fromBlock.width;
                  const fromY = fromBlock.y + fromBlock.height / 2;
                  const toX = toBlock.x;
                  const toY = toBlock.y + toBlock.height / 2;
                  
                  return (
                    <svg
                      key={connection.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: Math.min(fromX, toX),
                        top: Math.min(fromY, toY),
                        width: Math.abs(toX - fromX),
                        height: Math.abs(toY - fromY)
                      }}
                    >
                      <line
                        x1={fromX > toX ? Math.abs(toX - fromX) : 0}
                        y1={fromY > toY ? Math.abs(toY - fromY) : 0}
                        x2={fromX > toX ? 0 : Math.abs(toX - fromX)}
                        y2={fromY > toY ? 0 : Math.abs(toY - fromY)}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    </svg>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center canvas-grid" style={{ minHeight: '100vh' }}>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">等待内容</h3>
              <p className="text-gray-600">主持人还没有分享任何内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 分享观看页面 - 包含 ShareProvider
 */
const ShareKitViewerPage: React.FC<ShareKitViewerPageProps> = ({ shareId }) => {
  return (
    <ShareProvider config={{ 
      appName: "caocao-canvas",
      maxViewers: 5,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }}>
      <ShareKitViewerPageInternal shareId={shareId} />
    </ShareProvider>
  );
};

export default ShareKitViewerPage;