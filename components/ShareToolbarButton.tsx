import React, { useState, useEffect } from 'react';
import { Share2, Users, Copy, StopCircle, Wifi } from 'lucide-react';
import { p2pShareService, ShareStatus } from '../services/P2PShareService';

const ShareToolbarButton: React.FC = () => {
  const [status, setStatus] = useState<ShareStatus>(p2pShareService.getStatus());
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 监听状态变化
    p2pShareService.onStatusChanged((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const handleStartShare = async () => {
    try {
      console.log('[ShareToolbarButton] 开始分享...');
      
      // 检查PeerJS是否可用
      if (typeof window.Peer === 'undefined') {
        throw new Error('PeerJS库未加载，请刷新页面重试');
      }
      
      const url = p2pShareService.startSharing();
      console.log('[ShareToolbarButton] 分享链接生成成功:', url);
      
      setShareUrl(url);
      setShowPanel(true);
      
      // 显示成功提示
      alert(`分享已开始！\n分享链接：${url}\n\n请复制链接分享给观众`);
      
    } catch (error) {
      console.error('[ShareToolbarButton] 开始分享失败:', error);
      
      // 更详细的错误信息
      let errorMessage = '开始分享失败：';
      if (error instanceof Error) {
        if (error.message.includes('PeerJS')) {
          errorMessage += '\n• PeerJS服务连接失败，请检查网络连接';
        } else if (error.message.includes('未准备就绪')) {
          errorMessage += '\n• 服务正在初始化，请稍后重试';
        } else {
          errorMessage += `\n• ${error.message}`;
        }
      } else {
        errorMessage += '\n• 未知错误，请刷新页面重试';
      }
      
      errorMessage += '\n\n解决方案：\n1. 检查网络连接\n2. 刷新页面重试\n3. 尝试使用其他浏览器';
      
      alert(errorMessage);
    }
  };

  const handleStopShare = () => {
    p2pShareService.stopSharing();
    setShareUrl('');
    setShowPanel(false);
    setCopied(false);
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
        onClick={status.isSharing ? () => setShowPanel(!showPanel) : handleStartShare}
        className={`p-4 rounded-2xl transition-all relative ${
          status.isSharing 
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
            : 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10'
        }`}
        title={status.isSharing ? '管理分享' : '开始分享'}
      >
        <Share2 size={24} />
        {status.isSharing && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
        {status.viewerCount > 0 && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {status.viewerCount}
          </div>
        )}
      </button>

      {/* 弹出面板 */}
      {showPanel && status.isSharing && (
        <div className="absolute left-full ml-4 top-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">正在分享</h3>
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">在线</span>
              </div>
            </div>
            <button
              onClick={handleStopShare}
              className="text-red-600 hover:text-red-700 p-1 rounded"
              title="停止分享"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-green-600 mb-3">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">
              {status.viewerCount}/3 观众在线
            </span>
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

      {/* 点击外部关闭面板 */}
      {showPanel && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowPanel(false)}
        />
      )}
    </div>
  );
};

export default ShareToolbarButton;