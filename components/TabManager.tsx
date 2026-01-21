/**
 * TabManager - 标签管理组件
 * 
 * 功能：
 * - 图像/视频生成标签切换
 * - 紫色主题 (violet-500)
 * - 状态保持
 * - 键盘导航支持
 * - 无障碍访问
 * - 多语言支持
 */

import React from 'react';
import { Image as ImageIcon, Video } from 'lucide-react';

interface TabManagerProps {
  activeTab: 'image' | 'video';
  onTabChange: (tab: 'image' | 'video') => void;
  availableTabs: ('image' | 'video')[];
  disabledTabs?: ('image' | 'video')[];
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const TabManager: React.FC<TabManagerProps> = ({
  activeTab,
  onTabChange,
  availableTabs,
  disabledTabs = [],
  theme = 'light',
  lang = 'zh'
}) => {
  // 翻译
  const t = {
    zh: {
      imageTab: '图像生成',
      videoTab: '视频生成',
      ariaLabel: '生成类型标签'
    },
    en: {
      imageTab: 'Image Generation',
      videoTab: 'Video Generation',
      ariaLabel: 'Generation Type Tabs'
    }
  };
  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent, tab: 'image' | 'video') => {
    // 如果标签被禁用，不处理键盘事件
    if (disabledTabs.includes(tab)) {
      return;
    }
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabChange(tab);
    }
    
    // 左右箭头键导航
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const enabledTabs = availableTabs.filter(t => !disabledTabs.includes(t));
      const currentIndex = enabledTabs.indexOf(activeTab);
      let nextIndex;
      
      if (e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
      } else {
        nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
      }
      
      onTabChange(enabledTabs[nextIndex]);
    }
  };

  // 获取标签样式
  const getTabStyles = (tab: 'image' | 'video') => {
    const isActive = activeTab === tab;
    const isDisabled = disabledTabs.includes(tab);
    const baseStyles = "flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 rounded-t-lg";
    
    if (isDisabled) {
      return `${baseStyles} cursor-not-allowed opacity-50 text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800`;
    } else if (isActive) {
      return `${baseStyles} cursor-pointer tab-violet-active`;
    } else {
      return `${baseStyles} cursor-pointer tab-violet-inactive`;
    }
  };

  // 获取图标样式
  const getIconStyles = (tab: 'image' | 'video') => {
    const isActive = activeTab === tab;
    const isDisabled = disabledTabs.includes(tab);
    
    if (isDisabled) {
      return 'text-slate-400 dark:text-slate-600';
    } else if (isActive) {
      return 'text-violet-600';
    } else {
      return 'text-current';
    }
  };

  return (
    <div 
      className="flex border-b border-slate-200 dark:border-slate-700"
      role="tablist"
      aria-label={t[lang].ariaLabel}
    >
      {availableTabs.includes('image') && (
        <button
          role="tab"
          tabIndex={activeTab === 'image' ? 0 : -1}
          aria-selected={activeTab === 'image'}
          aria-controls="image-panel"
          aria-disabled={disabledTabs.includes('image')}
          id="image-tab"
          className={getTabStyles('image')}
          onClick={() => !disabledTabs.includes('image') && onTabChange('image')}
          onKeyDown={(e) => handleKeyDown(e, 'image')}
          disabled={disabledTabs.includes('image')}
        >
          <ImageIcon 
            size={14} 
            className={`${getIconStyles('image')} sm:w-4 sm:h-4`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{t[lang].imageTab}</span>
          <span className="sm:hidden">图像</span>
        </button>
      )}
      
      {availableTabs.includes('video') && (
        <button
          role="tab"
          tabIndex={activeTab === 'video' ? 0 : -1}
          aria-selected={activeTab === 'video'}
          aria-controls="video-panel"
          aria-disabled={disabledTabs.includes('video')}
          id="video-tab"
          className={getTabStyles('video')}
          onClick={() => !disabledTabs.includes('video') && onTabChange('video')}
          onKeyDown={(e) => handleKeyDown(e, 'video')}
          disabled={disabledTabs.includes('video')}
        >
          <Video 
            size={14} 
            className={`${getIconStyles('video')} sm:w-4 sm:h-4`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{t[lang].videoTab}</span>
          <span className="sm:hidden">视频</span>
        </button>
      )}
    </div>
  );
};

export default TabManager;