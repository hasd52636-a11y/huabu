import React, { useEffect, useRef } from 'react';
import { MenuConfig, MenuItem } from '../types.js';
import { COLORS, I18N } from '../constants.tsx';
import {
  Trash2, RefreshCw, Scissors, Type as TextIcon, 
  Image as ImageIcon, Play, MoveDiagonal2, Type, 
  Palette, Square, Monitor, Smartphone,
  Sparkles, Send, Upload, Paperclip,
  Pencil, Check, X, Copy, Info, Eye, Download, PlayCircle, Clock,
  Users, UserPlus, UserX, Grid3X3, FileText,
  RotateCcw, LayoutGrid, FilePlus, HelpCircle, Zap, Database, Layers
} from 'lucide-react';
import AspectRatioButton from './AspectRatioButton.js';
import type { AspectRatio } from './AspectRatioButton.js';

// 简洁版 Tooltip：鼠标悬停显示
const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-300 translate-y-2 group-hover/btn:translate-y-0 z-[9999]">
    <div className="bg-slate-900 dark:bg-black text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 whitespace-nowrap backdrop-blur-sm">
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {/* Tooltip 小箭头 */}
    <div className="w-3 h-3 bg-slate-900 dark:bg-black border-r border-b border-white/10 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
  </div>
);

interface DynamicMenuProps {
  menuConfig: MenuConfig;
  onMenuItemClick: (action: string, featureId?: string, payload?: any) => void;
  lang: 'zh' | 'en';
  blockType: 'text' | 'image' | 'video';
  blockStatus: 'idle' | 'processing' | 'error';
  blockAspectRatio?: string;
  blockDuration?: string;
  isGenerating?: boolean;
  selectedRatio?: AspectRatio;
  onRatioChange?: (ratio: AspectRatio) => void;
}

const DynamicMenu: React.FC<DynamicMenuProps> = ({
  menuConfig,
  onMenuItemClick,
  lang,
  blockType,
  blockStatus,
  blockAspectRatio,
  blockDuration,
  isGenerating = false,
  selectedRatio,
  onRatioChange
}) => {
  const t = I18N[lang];
  const theme = blockType === 'text' ? COLORS.text : blockType === 'image' ? COLORS.image : COLORS.video;
  const menuRef = useRef<HTMLDivElement>(null);

  const getIcon = (iconName?: string) => {
    const IconMap: Record<string, React.ComponentType<any>> = {
      trash2: Trash2,
      refreshCw: RefreshCw,
      scissors: Scissors,
      text: TextIcon,
      image: ImageIcon,
      play: Play,
      moveDiagonal2: MoveDiagonal2,
      type: Type,
      palette: Palette,
      square: Square,
      monitor: Monitor,
      smartphone: Smartphone,
      sparkles: Sparkles,
      send: Send,
      upload: Upload,
      paperclip: Paperclip,
      pencil: Pencil,
      check: Check,
      x: X,
      copy: Copy,
      info: Info,
      eye: Eye,
      download: Download,
      playCircle: PlayCircle,
      users: Users,
      userPlus: UserPlus,
      userX: UserX,
      grid3X3: Grid3X3,
      fileText: FileText,
      rotateccw: RotateCcw,
      layoutgrid: LayoutGrid,
      fileplus: FilePlus,
      helpcircle: HelpCircle,
      zap: Zap,
      database: Database,
      layers: Layers,
      settings: Info // 使用Info作为默认设置图标
    };

    const Icon = IconMap[iconName?.toLowerCase() || 'info'] || Info;
    return <Icon size={24} />;
  };

  // 渲染单个菜单项 - 简化样式
  const renderMenuItem = (item: MenuItem) => {
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onMenuItemClick(item.action, item.featureId);
    };

    if (item.children && item.children.length > 0) {
      // 子菜单 - 简化样式
      return (
        <div key={item.action} className="relative group/btn">
          <button
            onClick={handleClick}
            className={`w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-violet-500/10 dark:hover:bg-violet-500/20'}`}
            disabled={item.disabled}
          >
            <div className="text-xl">
              {getIcon(item.icon)}
            </div>
          </button>
          <Tooltip label={item.label} />
          
          {/* 子菜单弹出层 - 简化设计 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-violet-500 z-[1000] min-w-[200px] overflow-hidden opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-300 translate-y-2 group-hover/btn:translate-y-0">
            <div className="p-3 space-y-2">
              {item.children.slice(0, 8).map(child => ( // 增加子菜单数量限制
                <button
                  key={child.action}
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuItemClick(child.action, child.featureId); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/30 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:border-violet-500 text-left text-sm transition-all duration-200"
                  disabled={child.disabled}
                >
                  <span className="w-6 h-6 flex items-center justify-center">
                    {getIcon(child.icon)}
                  </span>
                  <span className="flex-1 truncate font-medium">{child.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 单个菜单项 - 简化样式
    return (
      <div key={item.action} className="relative group/btn">
        <button
          onClick={handleClick}
          className={`w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-violet-500/10 dark:hover:bg-violet-500/20'}`}
          disabled={item.disabled}
        >
          <div className="text-xl">
            {getIcon(item.icon)}
          </div>
        </button>
        <Tooltip label={item.label} />
      </div>
    );
  };

  // 渲染基础功能按钮 - 简化样式
  const renderBasicButtons = () => {
    const basicButtons = [];

    // 通用按钮：重新生成、删除
    basicButtons.push(
      <div key="regenerate" className="relative group/btn">
        <button 
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuItemClick('regenerate'); }} 
          className="w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white hover:bg-violet-500/10 dark:hover:bg-violet-500/20"
        >
          <div className={`text-xl ${isGenerating ? 'animate-spin' : ''}`}>
            <RefreshCw size={20} />
          </div>
        </button>
        <Tooltip label={t.tips?.regenerate || '重新生成'} />
      </div>,
      
      <div key="delete" className="relative group/btn">
        <button 
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuItemClick('delete'); }} 
          className="w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500"
        >
          <div className="text-xl">
            <Trash2 size={20} />
          </div>
        </button>
        <Tooltip label={t.tips?.delete || '删除'} />
      </div>
    );

    // 类型特定按钮
    if (blockType === 'text') {
      basicButtons.unshift(
        <div key="edit" className="relative group/btn">
          <button 
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuItemClick('toggleEdit'); }}
            className="w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white hover:bg-violet-500/10 dark:hover:bg-violet-500/20"
          >
            <div className="text-xl">
              <Pencil size={20} />
            </div>
          </button>
          <Tooltip label={t.tips?.edit || '编辑'} />
        </div>
      );
    }

    if (blockType === 'image' && selectedRatio && onRatioChange) {
      basicButtons.unshift(
        <div key="ratio" className="relative group/btn">
          <div className="w-12 h-12 rounded-2xl border-2 border-violet-500 overflow-hidden flex items-center justify-center hover:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-all duration-300 hover:scale-110">
            <AspectRatioButton 
              selectedRatio={selectedRatio}
              onRatioChange={onRatioChange}
              theme="light"
              lang={lang}
            />
          </div>
          <Tooltip label={t.tips?.aspectRatio || '宽高比'} />
        </div>
      );
    }

    if (blockType === 'video') {
      basicButtons.unshift(
        <div key="aspect" className="relative group/btn">
          <button 
            onClick={(e: React.MouseEvent) => { 
              e.stopPropagation(); 
              const newRatio = blockAspectRatio === '16:9' ? '9:16' : '16:9';
              onMenuItemClick('toggleAspectRatio', undefined, { newRatio });
            }} 
            className={`w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white hover:bg-violet-500/10 dark:hover:bg-violet-500/20 ${blockAspectRatio === '16:9' ? 'bg-violet-500/20 dark:bg-violet-500/30' : ''}`}
          >
            <div className="text-xl">
              {blockAspectRatio === '16:9' ? <Monitor size={20} /> : <Smartphone size={20} />}
            </div>
          </button>
          <Tooltip label="切换比例" />
        </div>
      );
    }

    // 上传按钮（文本和图片）
    if (blockType === 'text' || blockType === 'image') {
      basicButtons.push(
        <div key="upload" className="relative group/btn">
          <button 
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMenuItemClick('upload'); }} 
            className="w-12 h-12 rounded-2xl border-2 border-violet-500 flex items-center justify-center transition-all duration-300 hover:scale-110 text-slate-700 dark:text-white hover:bg-violet-500/10 dark:hover:bg-violet-500/20"
          >
            <div className="text-xl">
              <Paperclip size={20} />
            </div>
          </button>
          <Tooltip label={t.tips?.upload || '上传'} />
        </div>
      );
    }

    return <div className="flex items-center gap-2">{basicButtons}</div>;
  };

  return (
    <div ref={menuRef} className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-violet-500 rounded-3xl px-4 py-3 shadow-2xl relative max-w-[90vw]" role="toolbar" aria-label={`${blockType} menu`} style={{ overflow: 'visible' }}>
      <div className="flex items-center gap-3 min-w-max" style={{ overflow: 'visible' }}>
        {/* 状态指示器 - 仅在生成中显示 */}
        {blockStatus === 'processing' && (
          <div className="relative group/btn">
            <div className="w-12 h-12 bg-violet-500/10 border-2 border-violet-500 rounded-2xl flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <Tooltip label={t.tips?.generating || '生成中...'} />
          </div>
        )}

        {/* 渲染基础功能按钮 */}
        {renderBasicButtons()}

        {/* 渲染动态菜单项 - 扁平化显示，根据blockType过滤 */}
        {menuConfig?.items && menuConfig.items.length > 0 && (
          <>
            <div className="w-px h-8 bg-white/20 dark:bg-white/10 mx-1 rounded-full"></div>
            <div className="flex items-center gap-2">
              {menuConfig.items
                .filter((item: MenuItem) => {
                  // 根据blockType过滤菜单项
                  if (!item.featureId) return false; // 没有featureId的项目不显示
                  
                  // 根据featureId判断功能类型
                  if (blockType === 'text') {
                    return item.featureId.startsWith('text-');
                  } else if (blockType === 'image') {
                    return item.featureId.startsWith('image-');
                  } else if (blockType === 'video') {
                    return item.featureId.startsWith('video-');
                  }
                  
                  return false; // 默认不显示
                })
                .map((item: MenuItem) => renderMenuItem(item))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DynamicMenu;