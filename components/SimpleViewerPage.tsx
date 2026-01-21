import React, { useState, useEffect } from 'react';
import { Eye, Home, RefreshCw, Play, Pause } from 'lucide-react';

interface SimpleViewerPageProps {
  shareId: string;
}

interface CanvasState {
  blocks: any[];
  connections: any[];
  zoom: number;
  pan: { x: number; y: number };
}

interface ShareData {
  shareId: string;
  timestamp: number;
  canvasState: CanvasState;
  status: string;
  message: string;
  lastUpdate?: number;
}

const SimpleViewerPage: React.FC<SimpleViewerPageProps> = ({ shareId }) => {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  const loadShareData = () => {
    try {
      const data = localStorage.getItem(`canvas-share-${shareId}`);
      if (data) {
        const parsedData = JSON.parse(data);
        setShareData(parsedData);
        setError('');
        
        // 更新最后更新时间
        if (parsedData.lastUpdate) {
          setLastUpdateTime(new Date(parsedData.lastUpdate).toLocaleTimeString());
        }
      } else {
        setError('分享不存在或已过期');
      }
    } catch (err) {
      setError('无法加载分享数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShareData();
  }, [shareId]);

  // 自动刷新功能
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      loadShareData();
    }, 2000); // 每2秒刷新一次

    return () => clearInterval(interval);
  }, [isAutoRefresh, shareId]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      loadShareData();
    }, 500);
  };

  const handleGoHome = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('watch');
    window.location.href = url.toString();
  };

  const renderBlock = (block: any, index: number) => {
    const blockStyle = {
      position: 'absolute' as const,
      left: `${block.x}px`,
      top: `${block.y}px`,
      width: `${block.width}px`,
      height: `${block.height}px`,
      transform: shareData ? `scale(${shareData.canvasState.zoom})` : 'scale(1)',
      transformOrigin: 'top left'
    };

    return (
      <div
        key={block.id || index}
        style={blockStyle}
        className="border-2 border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden"
      >
        {/* 块标题 */}
        <div className="bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 border-b">
          {block.number} - {block.type}
        </div>
        
        {/* 块内容 */}
        <div className="p-2 h-full overflow-hidden">
          {block.type === 'text' && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {block.content || '(空内容)'}
            </div>
          )}
          
          {block.type === 'image' && (
            <div className="w-full h-full flex items-center justify-center">
              {block.content ? (
                <img 
                  src={block.content} 
                  alt="Generated" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-sm">等待生成图片...</div>
              )}
            </div>
          )}
          
          {block.type === 'video' && (
            <div className="w-full h-full flex items-center justify-center">
              {block.content ? (
                <video 
                  src={block.content} 
                  controls 
                  className="max-w-full max-h-full"
                />
              ) : (
                <div className="text-gray-400 text-sm">等待生成视频...</div>
              )}
            </div>
          )}
        </div>
        
        {/* 状态指示器 */}
        {block.status === 'processing' && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        )}
        {block.status === 'error' && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></div>
        )}
      </div>
    );
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">实时观看画布</h1>
            <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              在线
            </div>
            {lastUpdateTime && (
              <div className="text-xs text-gray-500">
                最后更新: {lastUpdateTime}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                isAutoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAutoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isAutoRefresh ? '暂停自动刷新' : '开启自动刷新'}
            </button>
            
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

      {/* 画布区域 */}
      <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
        {shareData && shareData.canvasState && (
          <div 
            className="relative bg-white"
            style={{
              transform: `translate(${shareData.canvasState.pan.x}px, ${shareData.canvasState.pan.y}px)`,
              minWidth: '200vw',
              minHeight: '200vh'
            }}
          >
            {/* 渲染所有块 */}
            {shareData.canvasState.blocks.map((block, index) => renderBlock(block, index))}
            
            {/* 连接线 */}
            {shareData.canvasState.connections && shareData.canvasState.connections.map((conn: any, index: number) => {
              const fromBlock = shareData.canvasState.blocks.find((b: any) => b.id === conn.fromId);
              const toBlock = shareData.canvasState.blocks.find((b: any) => b.id === conn.toId);
              
              if (!fromBlock || !toBlock) return null;
              
              const fromX = fromBlock.x + fromBlock.width / 2;
              const fromY = fromBlock.y + fromBlock.height / 2;
              const toX = toBlock.x + toBlock.width / 2;
              const toY = toBlock.y + toBlock.height / 2;
              
              return (
                <svg
                  key={conn.id || index}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    transform: `scale(${shareData.canvasState.zoom})`
                  }}
                >
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>
              );
            })}
          </div>
        )}
        
        {/* 空状态 */}
        {shareData && (!shareData.canvasState.blocks || shareData.canvasState.blocks.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">画布为空</h3>
              <p className="text-gray-500">等待创作者添加内容...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部信息栏 */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600 max-w-xs">
        <div className="font-medium mb-1">分享信息</div>
        <div>创建时间: {shareData ? new Date(shareData.timestamp).toLocaleString() : '-'}</div>
        <div>模块数量: {shareData?.canvasState.blocks.length || 0}</div>
        <div>缩放比例: {shareData ? Math.round(shareData.canvasState.zoom * 100) : 100}%</div>
      </div>
    </div>
  );
};

export default SimpleViewerPage;