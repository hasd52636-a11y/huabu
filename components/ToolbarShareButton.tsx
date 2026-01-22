import React, { useState, useEffect } from 'react';
import { Share2, StopCircle, Copy, Check, Users } from 'lucide-react';
import { ShareProvider, useShare } from '../real-time-share-kit/core/ShareProvider';

interface ToolbarShareButtonProps {
  data: any;
  onDataChange: (data: any) => void;
  className?: string;
  title?: string;
}

/**
 * 内部分享按钮组件 - 在 ShareProvider 内部使用
 */
const ToolbarShareButtonInternal: React.FC<{ 
  data: any; 
  onDataChange: (data: any) => void;
  className?: string;
  title?: string;
}> = ({ data, onDataChange, className, title }) => {
  const { session, createShare, stopSharing, syncData, receivedData } = useShare();
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  // 同步数据 - 使用防抖优化
  useEffect(() => {
    if (session.isHost && session.shareId && data) {
      console.log('[ToolbarShare] 检测到数据变化，准备同步:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        shareId: session.shareId
      });
      
      // 防抖处理，避免过于频繁的同步
      const timeoutId = setTimeout(() => {
        console.log('[ToolbarShare] 执行数据同步');
        syncData(data);
      }, 50); // 从100ms减少到50ms
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('[ToolbarShare] 跳过数据同步:', {
        isHost: session.isHost,
        hasShareId: !!session.shareId,
        hasData: !!data
      });
    }
  }, [data, session.isHost, session.shareId, syncData]);

  // 接收数据
  useEffect(() => {
    if (!session.isHost && receivedData) {
      console.log('[ToolbarShare] 观看者接收数据:', receivedData);
      onDataChange(receivedData);
    }
  }, [receivedData, session.isHost, onDataChange]);

  const handleToggle = async () => {
    try {
      if (session.shareId) {
        stopSharing();
        setShowUrl(false);
      } else {
        // 使用英文字符避免 PeerJS ID 验证错误，并传递当前数据作为初始状态
        const result = await createShare('Caocao Canvas Share', data);
        setShowUrl(true);
      }
    } catch (error) {
      console.error('[ToolbarShare] 分享操作失败:', error);
      alert('分享操作失败: ' + error.message);
    }
  };

  const copyUrl = () => {
    if (session.shareId) {
      const url = `${window.location.origin}?watch=${session.shareId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative" data-share-button>
      <button 
        onClick={handleToggle}
        className={`${className} ${session.shareId ? 'text-green-500 hover:text-green-600' : 'text-slate-400 hover:text-amber-500'} transition-all relative`}
        title={session.shareId ? '停止分享' : (title || '分享画布')}
      >
        {session.shareId ? <StopCircle size={20} /> : <Share2 size={20} />}
        
        {/* 分享状态指示器 */}
        {session.shareId && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
        
        {/* 观众数量 */}
        {session.shareId && session.viewers.length > 0 && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
            {session.viewers.length}
          </div>
        )}
      </button>

      {/* 分享链接弹出框 */}
      {showUrl && session.shareId && (
        <div className="absolute left-full ml-2 top-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[300px] z-50 animate-in fade-in slide-in-from-left-2 duration-300 share-button-popup">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">分享链接</span>
            <button 
              onClick={() => setShowUrl(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <input 
              readOnly 
              value={`${window.location.origin}?watch=${session.shareId}`}
              className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border flex-1 outline-none"
            />
            <button 
              onClick={copyUrl}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="复制链接"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          
          {session.viewers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={12} />
              <span>{session.viewers.length} 人正在观看</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 工具栏分享按钮 - 包含 ShareProvider
 */
const ToolbarShareButton: React.FC<ToolbarShareButtonProps> = ({ 
  data, 
  onDataChange, 
  className = "p-3",
  title = "分享画布"
}) => {
  return (
    <ShareProvider config={{ 
      appName: "caocao-canvas", // 注意：PeerJS 不支持中文字符，必须使用英文
      maxViewers: 5,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }}>
      <ToolbarShareButtonInternal 
        data={data}
        onDataChange={onDataChange}
        className={className}
        title={title}
      />
    </ShareProvider>
  );
};

export default ToolbarShareButton;