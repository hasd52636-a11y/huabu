import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

const SimpleShareButton: React.FC = () => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleStartShare = () => {
    // 生成一个简单的分享ID
    const shareId = 'share-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const url = `${window.location.origin}${window.location.pathname}?watch=${shareId}`;
    
    setShareUrl(url);
    setIsSharing(true);
    
    // 在localStorage中保存当前画布状态，供观众访问
    const canvasData = {
      shareId: shareId,
      timestamp: Date.now(),
      // 这里可以添加画布数据
      message: '分享功能已启用，观众可以通过此链接查看'
    };
    
    localStorage.setItem(`canvas-share-${shareId}`, JSON.stringify(canvasData));
    
    // 显示分享链接
    alert(`分享已开始！\n\n分享链接：\n${url}\n\n请复制链接分享给观众\n\n注意：这是一个简化版本，观众可以看到分享页面但不会实时同步`);
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

  const handleStopShare = () => {
    setIsSharing(false);
    setShareUrl('');
    setCopied(false);
  };

  return (
    <div className="relative">
      {/* 工具栏按钮 */}
      <button 
        onClick={isSharing ? handleStopShare : handleStartShare}
        className={`p-4 rounded-2xl transition-all ${
          isSharing 
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
            : 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10'
        }`}
        title={isSharing ? '停止分享' : '开始分享'}
      >
        <Share2 size={24} />
        {isSharing && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </button>

      {/* 分享面板 */}
      {isSharing && shareUrl && (
        <div className="absolute left-full ml-4 top-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">分享链接</h3>
            </div>
            <button
              onClick={handleStopShare}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              停止
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-3">
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

          <div className="text-xs text-gray-500 space-y-1">
            <p>• 这是一个简化版分享功能</p>
            <p>• 观众可以通过链接查看分享页面</p>
            <p>• 不需要复杂的网络配置</p>
            <p>• 适合快速分享和演示</p>
          </div>
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

export default SimpleShareButton;