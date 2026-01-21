import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Users, Eye, Clock } from 'lucide-react';
import { realtimeShareService } from '../services/RealtimeShareService';

interface RealtimeShareButtonProps {
  blocks?: any[];
  connections?: any[];
  zoom?: number;
  pan?: { x: number; y: number };
}

const RealtimeShareButton: React.FC<RealtimeShareButtonProps> = ({ 
  blocks = [], 
  connections = [], 
  zoom = 1, 
  pan = { x: 200, y: 100 } 
}) => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 设置更新回调
    realtimeShareService.setUpdateCallback((update) => {
      if (update.type === 'canvas_update') {
        console.log('[RealtimeShare] Canvas updated by host');
      }
    });

    // 检查是否已经在分享
    const currentSession = realtimeShareService.getCurrentSession();
    if (currentSession && realtimeShareService.isHosting()) {
      setIsSharing(true);
      setShareUrl(`${window.location.origin}?watch=${currentSession.id}`);
      setViewerCount(currentSession.viewers.length);
    }

    return () => {
      // 清理
    };
  }, []);

  // 实时更新画布状态
  useEffect(() => {
    if (isSharing && realtimeShareService.isHosting()) {
      const canvasState = {
        blocks: blocks || [],
        connections: connections || [],
        zoom: zoom || 1,
        pan: pan || { x: 200, y: 100 }
      };
      
      // 防抖更新
      const timeoutId = setTimeout(() => {
        realtimeShareService.updateCanvas(canvasState);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [blocks, connections, zoom, pan, isSharing]);

  const handleStartShare = async () => {
    setIsLoading(true);
    setError('');

    try {
      const canvasState = {
        blocks: blocks || [],
        connections: connections || [],
        zoom: zoom || 1,
        pan: pan || { x: 200, y: 100 }
      };

      const { sessionId, shareUrl: url } = await realtimeShareService.createSession(
        '画布实时分享',
        canvasState
      );

      setShareUrl(url);
      setIsSharing(true);
      setViewerCount(0);

      console.log('[RealtimeShare] Share started:', { sessionId, url });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '启动分享失败';
      setError(errorMsg);
      console.error('[RealtimeShare] Failed to start share:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopShare = async () => {
    setIsLoading(true);
    
    try {
      await realtimeShareService.endSession();
      setIsSharing(false);
      setShareUrl('');
      setViewerCount(0);
      setError('');
      
      console.log('[RealtimeShare] Share stopped');
    } catch (err) {
      console.error('[RealtimeShare] Failed to stop share:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      {/* 工具栏按钮 */}
      <button 
        onClick={isSharing ? handleStopShare : handleStartShare}
        disabled={isLoading}
        className={`p-4 rounded-2xl transition-all relative ${
          isSharing 
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
            : 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isSharing ? '停止实时分享' : '开始实时分享'}
      >
        <Share2 size={24} />
        {isSharing && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        )}
        {viewerCount > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {viewerCount}
          </div>
        )}
      </button>

      {/* 分享面板 */}
      {isSharing && shareUrl && (
        <div className="absolute left-full ml-4 top-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">实时分享</h3>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>直播中</span>
              </div>
            </div>
            <button
              onClick={handleStopShare}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
            >
              停止
            </button>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{viewerCount} 观众</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{blocks.length} 模块</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>实时同步</span>
            </div>
          </div>

          {/* 分享链接 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分享链接
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1 font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 观众可以实时查看你的画布操作</p>
            <p>• 支持多人同时观看</p>
            <p>• 自动同步画布变化</p>
            <p>• 适合演示和教学场景</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* 点击外部关闭面板 */}
      {isSharing && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {/* 可以选择是否点击外部关闭 */}}
        />
      )}
    </div>
  );
};

export default RealtimeShareButton;