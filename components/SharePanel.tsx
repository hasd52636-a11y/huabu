import React, { useState, useEffect } from 'react';
import { Share2, Users, Copy, StopCircle, Eye, Wifi, WifiOff } from 'lucide-react';
import { p2pShareService, ShareStatus } from '../services/P2PShareService';

interface SharePanelProps {
  onShareStart?: () => void;
  onShareStop?: () => void;
}

const SharePanel: React.FC<SharePanelProps> = ({ onShareStart, onShareStop }) => {
  const [status, setStatus] = useState<ShareStatus>(p2pShareService.getStatus());
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // 监听状态变化
    p2pShareService.onStatusChanged((newStatus) => {
      setStatus(newStatus);
      setIsConnecting(false);
    });

    return () => {
      // 清理
    };
  }, []);

  const handleStartShare = async () => {
    try {
      setIsConnecting(true);
      const url = p2pShareService.startSharing();
      setShareUrl(url);
      onShareStart?.();
    } catch (error) {
      console.error('开始分享失败:', error);
      alert('开始分享失败，请检查网络连接后重试');
      setIsConnecting(false);
    }
  };

  const handleStopShare = () => {
    p2pShareService.stopSharing();
    setShareUrl('');
    setCopied(false);
    onShareStop?.();
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

  // 如果是观看模式，显示观看状态
  if (status.isViewing) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Eye className="w-5 h-5" />
          <span className="font-medium">观看模式</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          正在观看创作过程...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">实时分享</h3>
        {status.isSharing && (
          <div className="flex items-center gap-1 text-green-600">
            <Wifi className="w-4 h-4" />
            <span className="text-xs">在线</span>
          </div>
        )}
      </div>

      {!status.isSharing ? (
        // 未分享状态
        <div>
          <p className="text-sm text-gray-600 mb-3">
            开始分享后，最多3位观众可以实时观看你的创作过程
          </p>
          <button
            onClick={handleStartShare}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                连接中...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                开始分享
              </>
            )}
          </button>
        </div>
      ) : (
        // 分享中状态
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                {status.viewerCount}/3 观众在线
              </span>
            </div>
            <button
              onClick={handleStopShare}
              className="text-red-600 hover:text-red-700 p-1 rounded"
              title="停止分享"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {copied ? '已复制' : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• 观众通过链接即可观看，无需注册</p>
            <p>• 你的所有操作和生成结果会实时同步</p>
            <p>• 关闭页面或点击停止按钮结束分享</p>
          </div>

          {status.connections.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">在线观众</p>
              <div className="space-y-1">
                {status.connections.map((conn, index) => (
                  <div key={conn.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>观众 {index + 1}</span>
                    <span className="text-gray-400">
                      {Math.floor((Date.now() - conn.joinTime) / 1000)}秒前加入
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharePanel;