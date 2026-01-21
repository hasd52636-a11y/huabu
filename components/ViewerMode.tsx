import React, { useState, useEffect } from 'react';
import { Eye, Wifi, WifiOff, RotateCcw, Home, Users } from 'lucide-react';
import { Block } from '../types';
import { p2pShareService } from '../services/P2PShareService';
import { useShareMode } from '../hooks/useShareMode';

interface ViewerModeProps {
  shareId: string;
}

const ViewerMode: React.FC<ViewerModeProps> = ({ shareId }) => {
  const { isConnecting, connectionError, isConnected, retry, exitViewer } = useShareMode();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    // 监听画布更新
    p2pShareService.onCanvasUpdated((newBlocks) => {
      setBlocks(newBlocks);
      setLastUpdate(Date.now());
    });
  }, []);

  // 连接中状态
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">连接中...</h2>
            <p className="text-gray-600">正在连接到分享者，请稍候</p>
            <div className="mt-4 text-sm text-gray-500">
              分享ID: {shareId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 连接失败状态
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">连接失败</h2>
            <p className="text-gray-600 mb-4">{connectionError}</p>
            
            <div className="space-y-3">
              <button
                onClick={retry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新连接
              </button>
              
              <button
                onClick={exitViewer}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                返回主页
              </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>可能的原因：</p>
              <ul className="text-left mt-1 space-y-1">
                <li>• 分享已结束</li>
                <li>• 网络连接问题</li>
                <li>• 分享者已离线</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 观看模式主界面
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">观看创作过程</h1>
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">已连接</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              分享ID: <span className="font-mono">{shareId}</span>
            </div>
            
            <button
              onClick={exitViewer}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              退出观看
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto p-4">
        {blocks.length === 0 ? (
          // 空状态
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">等待创作者开始</h3>
            <p className="text-gray-600">创作者还没有开始创作，请耐心等待...</p>
            {lastUpdate > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                最后更新: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          // 画布内容
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">创作画布</h2>
                {lastUpdate > 0 && (
                  <span className="text-sm text-gray-500">
                    最后更新: {new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              {/* 只读的画布显示 */}
              <div className="relative bg-gray-50 rounded-lg min-h-96 p-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="absolute bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-w-64"
                    style={{
                      left: block.x,
                      top: block.y,
                      width: block.width || 256,
                      height: block.height || 'auto'
                    }}
                  >
                    {/* 块头部 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        block.type === 'text' ? 'bg-blue-500' :
                        block.type === 'image' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {block.number} - {block.type === 'text' ? '文本' : block.type === 'image' ? '图片' : '视频'}
                      </span>
                      {block.status === 'processing' && (
                        <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                    
                    {/* 块内容 */}
                    <div className="text-sm text-gray-600">
                      {block.originalPrompt && (
                        <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>指令:</strong> {block.originalPrompt}
                        </div>
                      )}
                      
                      {block.content ? (
                        block.type === 'text' ? (
                          <div className="whitespace-pre-wrap">{block.content}</div>
                        ) : block.type === 'image' ? (
                          <img 
                            src={block.content} 
                            alt="Generated" 
                            className="max-w-full h-auto rounded"
                          />
                        ) : (
                          <video 
                            src={block.content} 
                            controls 
                            className="max-w-full h-auto rounded"
                          />
                        )
                      ) : (
                        <div className="text-gray-400 italic">
                          {block.status === 'processing' ? '生成中...' : '暂无内容'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">观看模式说明</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 你正在实时观看创作者的操作过程</li>
                    <li>• 所有的生成结果会自动同步显示</li>
                    <li>• 此模式下无法进行任何编辑操作</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerMode;