import React, { useState, useEffect } from 'react';
import { Eye, Users, Wifi, WifiOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { ShareProvider, useShare } from '../real-time-share-kit/core/ShareProvider';
import Canvas from './Canvas';

interface ShareKitViewerPageProps {
  shareId: string;
}

// 坐标验证和错误处理函数
const validateCoordinates = (pan: any, zoom: any) => {
  const safePan = { 
    x: typeof pan?.x === 'number' && isFinite(pan.x) ? pan.x : 0,
    y: typeof pan?.y === 'number' && isFinite(pan.y) ? pan.y : 0
  };
  const safeZoom = typeof zoom === 'number' && isFinite(zoom) && zoom > 0 ? zoom : 1;
  
  return { pan: safePan, zoom: safeZoom };
};

const validateBlockCoordinates = (block: any) => {
  return {
    ...block,
    x: typeof block.x === 'number' && isFinite(block.x) ? block.x : 0,
    y: typeof block.y === 'number' && isFinite(block.y) ? block.y : 0,
    width: typeof block.width === 'number' && isFinite(block.width) && block.width > 0 ? block.width : 200,
    height: typeof block.height === 'number' && isFinite(block.height) && block.height > 0 ? block.height : 150
  };
};

const generateSafeTransform = (pan: any, zoom: any) => {
  const { pan: safePan, zoom: safeZoom } = validateCoordinates(pan, zoom);
  // 在分享页面中应用35%的缩小比例，保持左上角对齐
  const viewerScale = safeZoom * 0.65; // 缩小35%
  
  // 添加偏移量：向右移动一个模块宽度(200px)，向下移动一个模块高度(150px)
  // 大幅增加偏移量以确保内容不会太靠上和太靠左
  const offsetX = 400; // 大幅增加向右偏移量
  const offsetY = 350; // 大幅增加向下偏移量
  const adjustedPanX = safePan.x + offsetX;
  const adjustedPanY = safePan.y + offsetY;
  
  return `translate(${adjustedPanX}px, ${adjustedPanY}px) scale(${viewerScale})`;
};

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
          <div className="flex items-center gap-8">
            {/* Logo和名称 - 与主屏幕相同的位置和样式 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                {/* 简化版曹操头像logo - 使用灰色调 */}
                <svg width="48" height="30" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* 胡须底部 */}
                  <path d="M12 32 Q32 28 52 32 L56 40 H8 Z" fill="#374151"/>
                  {/* 脸部轮廓 */}
                  <path d="M32 12 L38 13 Q42 18 37 24 L35 29 Q29 30 24 28 L27 22 Q22 16 32 12" fill="#6b7280" stroke="#374151" strokeWidth="1"/>
                  {/* 官帽 */}
                  <path d="M27 12 L37 12 L40 6 L35 4 L24 6 Z" fill="#1f2937" stroke="#111827" strokeWidth="1"/>
                  {/* 帽饰 */}
                  <rect x="30" y="3" width="4" height="3" fill="#9ca3af" stroke="#6b7280" strokeWidth="0.5" rx="1"/>
                  {/* 胡须细节 */}
                  <path d="M27 23 Q22 32 19 37 M30 25 Q30 34 29 39 M35 24 Q40 33 43 36" 
                        stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  {/* 眼睛 */}
                  <ellipse cx="29" cy="17" rx="1.5" ry="1" fill="#1f2937"/>
                  <ellipse cx="35" cy="17" rx="1.5" ry="1" fill="#1f2937"/>
                  <circle cx="29.5" cy="16.5" r="0.3" fill="white"/>
                  <circle cx="35.5" cy="16.5" r="0.3" fill="white"/>
                  {/* 鼻子 */}
                  <path d="M32 18 L32.5 19 L32 20 L31.5 19 Z" fill="#6b7280"/>
                  {/* 嘴巴 */}
                  <path d="M30 21 Q32 22 34 21" stroke="#1f2937" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="font-black text-2xl uppercase tracking-tighter leading-tight">
                <span className="text-slate-900 font-bold tracking-widest" style={{letterSpacing: '0.2em'}}>曹操</span>
                <span className="text-gray-600 font-bold tracking-widest relative" style={{letterSpacing: '0.2em'}}>
                  画布
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-gray-400/50 rounded-full"></span>
                </span>
              </h1>
            </div>
            
            {/* 观看模式标识 */}
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-900">观看模式</span>
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

      {/* 画布内容区域 - 移除 pt-16 填充，让画布从顶部边缘开始 */}
      <div className="absolute inset-0 top-0">
        {canvasData ? (
          <div className="relative w-full h-full">
            {/* 只读提示 - 调整位置以避免与固定头部重叠 */}
            <div className="absolute top-20 left-4 z-40 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>实时观看中 - 只读模式</span>
              </div>
            </div>
            
            {/* 缩放提示 - 说明左上角对齐 */}
            <div className="absolute top-20 right-4 z-40 bg-green-100 border border-green-300 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
                <span>缩小35%显示</span>
              </div>
            </div>
            
            {/* 渲染画布 - 使用与主应用相同的背景样式，确保画布容器从顶部边缘开始 */}
            <div className="relative canvas-grid w-full h-full overflow-hidden">
              {/* 画布变换容器 - 恢复原始transform-origin，通过平移调整居中 */}
              <div 
                style={{ 
                  transform: generateSafeTransform(canvasData.pan, canvasData.zoom),
                  transformOrigin: '0 0', // 恢复原始设置
                  width: '100%',
                  height: '100%'
                }}
                className="absolute inset-0 transition-transform duration-75"
              >
                {/* 渲染所有块 - 使用与主画布相同的定位逻辑，添加坐标验证 */}
                {(canvasData.blocks || []).map((block: any) => {
                  const validatedBlock = validateBlockCoordinates(block);
                  return (
                    <div
                      key={validatedBlock.id}
                      className="absolute bg-white border-2 border-purple-500 rounded-lg shadow-lg p-4"
                      style={{
                        left: validatedBlock.x,
                        top: validatedBlock.y,
                        width: validatedBlock.width,
                        height: validatedBlock.height,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none' // 禁用所有交互
                      }}
                    >
                    {/* 块类型指示器 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        validatedBlock.type === 'text' ? 'bg-blue-500' :
                        validatedBlock.type === 'image' ? 'bg-green-500' :
                        validatedBlock.type === 'video' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {validatedBlock.type === 'text' ? '文本' :
                         validatedBlock.type === 'image' ? '图片' :
                         validatedBlock.type === 'video' ? '视频' : '未知'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">#{validatedBlock.number}</span>
                    </div>
                    
                    {/* 块内容 - 严格按照模块框尺寸显示，超出部分裁剪 */}
                    <div className="text-sm text-gray-700 overflow-hidden relative" style={{ 
                      width: `${validatedBlock.width - 32}px`, // 减去左右padding (16px * 2)
                      height: `${validatedBlock.height - 60}px` // 减去header(28px) + 上下padding(16px * 2)
                    }}>
                      {validatedBlock.type === 'text' && (
                        <div 
                          className="whitespace-pre-wrap break-words absolute inset-0 overflow-hidden"
                          style={{
                            fontSize: `${validatedBlock.fontSize || 14}px`,
                            color: validatedBlock.textColor || '#333333',
                            lineHeight: '1.4'
                          }}
                        >
                          {validatedBlock.content || '空文本'}
                        </div>
                      )}
                      {validatedBlock.type === 'image' && validatedBlock.content && (
                        <div className="w-full h-full relative overflow-hidden">
                          <img 
                            src={validatedBlock.content} 
                            alt="分享图片" 
                            className={`absolute inset-0 transition-transform duration-1000 ${
                              validatedBlock.isCropped ? 'scale-150' : 'scale-100'
                            }`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                        </div>
                      )}
                      {validatedBlock.type === 'video' && validatedBlock.content && (
                        <div className="w-full h-full relative overflow-hidden">
                          <video 
                            src={validatedBlock.content} 
                            className="absolute inset-0"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              objectPosition: 'center'
                            }}
                            controls
                            preload="metadata"
                          />
                        </div>
                      )}
                      {!validatedBlock.content && (
                        <div className="text-gray-400 italic absolute inset-0 flex items-center justify-center">
                          无内容
                        </div>
                      )}
                    </div>
                  </div>
                )})}
                
                {/* 渲染连接线 - 移到变换容器内部，确保与模块同步缩放 */}
                {(canvasData.connections || []).map((connection: any) => {
                  const fromBlock = canvasData.blocks?.find((b: any) => b.id === connection.fromId);
                  const toBlock = canvasData.blocks?.find((b: any) => b.id === connection.toId);
                  
                  if (!fromBlock || !toBlock) return null;
                  
                  const validatedFromBlock = validateBlockCoordinates(fromBlock);
                  const validatedToBlock = validateBlockCoordinates(toBlock);
                  
                  // 使用与主Canvas相同的坐标计算逻辑
                  const startX = validatedFromBlock.x + validatedFromBlock.width / 2;
                  const startY = validatedFromBlock.y;
                  const endX = validatedToBlock.x - validatedToBlock.width / 2;
                  const endY = validatedToBlock.y;
                  
                  // 计算贝塞尔曲线路径（与主Canvas保持一致）
                  const dist = Math.abs(endX - startX);
                  const tension = Math.min(300, Math.max(80, dist * 0.45));
                  const path = `M ${startX} ${startY} C ${startX + tension} ${startY}, ${endX - tension} ${endY}, ${endX} ${endY}`;
                  
                  return (
                    <svg
                      key={connection.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      <path
                        d={path}
                        stroke="#3b82f6"
                        strokeWidth="4.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="opacity-60"
                      />
                    </svg>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center canvas-grid">
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