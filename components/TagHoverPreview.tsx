import React, { useState, useEffect } from 'react';

interface TagHoverPreviewProps {
  tagData: { id: string; content?: string } | null;
  className?: string;
}

/**
 * TagHoverPreview - 标签悬停预览组件
 * 显示标签的详细信息和内容预览
 */
const TagHoverPreview: React.FC<TagHoverPreviewProps> = ({ tagData, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (tagData) {
      // 200ms 延迟显示
      const showTimer = setTimeout(() => setIsVisible(true), 200);
      return () => clearTimeout(showTimer);
    } else {
      // 100ms 延迟隐藏
      const hideTimer = setTimeout(() => setIsVisible(false), 100);
      return () => clearTimeout(hideTimer);
    }
  }, [tagData]);

  if (!tagData || !isVisible) {
    return null;
  }

  const getBlockTypeInfo = (id: string) => {
    const type = id.charAt(0);
    switch (type) {
      case 'A':
        return { name: '文本模块', color: 'bg-blue-500', icon: '📝' };
      case 'B':
        return { name: '图片模块', color: 'bg-emerald-500', icon: '🖼️' };
      case 'V':
        return { name: '视频模块', color: 'bg-red-500', icon: '🎥' };
      default:
        return { name: '未知模块', color: 'bg-gray-500', icon: '❓' };
    }
  };

  const blockInfo = getBlockTypeInfo(tagData.id);

  return (
    <div className={`fixed z-50 pointer-events-none transition-all duration-200 ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${blockInfo.color}`}></div>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {blockInfo.icon} {blockInfo.name}
          </span>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          标签ID: <span className="font-mono font-semibold">[{tagData.id}]</span>
        </div>
        
        {tagData.content && (
          <div className="text-xs text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
            <div className="font-medium mb-1">内容预览:</div>
            <div className="text-gray-600 dark:text-gray-400 line-clamp-3">
              {tagData.content.length > 100 
                ? `${tagData.content.substring(0, 100)}...` 
                : tagData.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagHoverPreview;