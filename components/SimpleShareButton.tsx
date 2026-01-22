import React from 'react';
import { Share2 } from 'lucide-react';
import { useShare } from '../real-time-share-kit/core/ShareProvider';

interface SimpleShareButtonProps {
  className?: string;
  title?: string;
}

/**
 * 简化的分享按钮 - 用于左侧工具栏
 * 与右下角的 ShareKit 共享同一个分享会话
 */
const SimpleShareButton: React.FC<SimpleShareButtonProps> = ({ 
  className = "p-3 text-slate-400 hover:text-amber-500 transition-all",
  title = "分享画布"
}) => {
  const { session, createShare, stopSharing } = useShare();

  const handleClick = async () => {
    if (session.shareId) {
      // 如果已经在分享，停止分享
      stopSharing();
    } else {
      // 创建新的分享会话
      const result = await createShare('画布分享');
      console.log('[SimpleShareButton] 分享已创建:', result.shareUrl);
      
      // 可选：自动复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(result.shareUrl);
        console.log('[SimpleShareButton] 分享链接已复制到剪贴板');
      } catch (error) {
        console.warn('[SimpleShareButton] 无法复制到剪贴板:', error);
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={`${className} ${session.shareId ? 'text-green-500 hover:text-green-600' : ''}`}
      title={session.shareId ? '停止分享' : title}
    >
      <Share2 size={20} />
      {session.shareId && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default SimpleShareButton;