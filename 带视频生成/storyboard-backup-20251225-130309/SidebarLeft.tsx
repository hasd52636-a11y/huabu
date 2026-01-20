import React, { useState, useRef, useEffect } from 'react';
import { ToolType, Theme, Language, I18N } from '../types';

interface SidebarLeftProps {
  theme: Theme;
  lang: Language;
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
  onSettings: () => void;
  onImport: (type: 'ref' | 'frame') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onThemeChange: (theme: Theme) => void;
  onLangChange: (lang: Language) => void;
  colorMode: 'color' | 'blackAndWhite';
  onColorModeChange: (mode: 'color' | 'blackAndWhite') => void;
  isHelpMode?: boolean;
  onHelpModeToggle?: (enabled: boolean) => void;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ theme, lang, activeTool, setActiveTool, onSettings, onImport, zoom, onZoomChange, onThemeChange, onLangChange, colorMode, onColorModeChange }) => {
  const [showImportMenu, setShowImportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = I18N[lang];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools = [
    { type: ToolType.HAND, icon: "✋", title: lang === 'zh' ? '平移画布\n拖动画布移动视图\n快捷键: 鼠标拖动' : 'Pan Canvas\nDrag to move view\nShortcut: Mouse drag' },
    { type: ToolType.SELECT, icon: "🎯", title: lang === 'zh' ? '选择分镜\n框选或 Shift+click 选择\n快捷键: Ctrl+A 全选' : 'Select Frames\nBox select or Shift+click\nShortcut: Ctrl+A select all' },
  ];

  return (
    <div className={`fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-5 p-3 backdrop-blur-xl border rounded-[2rem] shadow-2xl items-center ${theme === 'dark' ? 'bg-zinc-900/70 border-white/10' : 'bg-white/90 border-zinc-200 shadow-zinc-300/50'}`}>
      <div className="flex flex-col gap-3 items-center">
        {tools.map((tool) => (
          <button 
            key={tool.type} 
            onClick={() => setActiveTool(tool.type)} 
            title={tool.title}
            className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all text-xl ${activeTool === tool.type ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-zinc-500 hover:bg-purple-500/10 hover:text-purple-500'}`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <div className={`h-[2px] w-8 ${theme === 'dark' ? 'bg-white/10' : 'bg-zinc-100'}`}></div>
      
      <div className="relative flex justify-center" ref={menuRef}>
        <button 
          onClick={() => setShowImportMenu(!showImportMenu)} 
          title={lang === 'zh' ? '上传图片\n点击打开菜单选择上传类型' : 'Upload Images\nClick to open menu'}
          className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${showImportMenu ? 'bg-purple-500/20 text-purple-500' : 'text-zinc-500 hover:text-purple-500'}`}
        >
          📥
        </button>
        {showImportMenu && (
          <div className={`absolute left-full ml-4 top-0 p-3 border rounded-2xl shadow-2xl flex flex-col gap-2 w-48 animate-in slide-in-from-left-2 duration-200 ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200 shadow-zinc-300/50'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 px-3 mb-1">{lang === 'zh' ? '选择上传类型' : 'Select Upload Type'}</p>
            <button 
              onClick={() => { onImport('ref'); setShowImportMenu(false); }} 
              title={lang === 'zh' ? '上传参考主体 (最多1张)' : 'Upload reference subject (max 1)'}
              className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all text-red-500 border border-red-500/20`}
            >
              {t.importImage}
            </button>
            <button 
              onClick={() => { onImport('frame'); setShowImportMenu(false); }} 
              title={lang === 'zh' ? '上传分镜图片 (最多6张)' : 'Upload storyboard frames (max 6)'}
              className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-500 hover:text-white transition-all text-purple-500 border border-purple-500/20`}
            >
              {t.importFrame}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onSettings} 
          title={lang === 'zh' ? 'API 接口配置\n设置 AI 模型和 API 密钥' : 'API Configuration\nSet up AI models and API keys'}
          className="w-14 h-14 flex items-center justify-center rounded-2xl text-zinc-500 hover:text-purple-500 transition-all"
        >
          ⚙️
        </button>
      </div>

      <div className={`h-[2px] w-8 ${theme === 'dark' ? 'bg-white/10' : 'bg-zinc-100'}`}></div>

      <button 
        onClick={() => onColorModeChange(colorMode === 'color' ? 'blackAndWhite' : 'color')} 
        title={lang === 'zh' ? `切换颜色模式\n当前: ${colorMode === 'color' ? '彩色' : '黑白'}` : `Toggle Color Mode\nCurrent: ${colorMode === 'color' ? 'Color' : 'B&W'}`}
        className={`w-14 h-14 flex items-center justify-center rounded-2xl border text-lg transition-all ${colorMode === 'color' ? (theme === 'dark' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-600') : (theme === 'dark' ? 'bg-zinc-800 border-white/10 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-600')}`}
      >
        {colorMode === 'color' ? '🌸' : '⚫'}
      </button>

      <div className={`flex items-center justify-center border px-3 py-2 rounded-2xl ${theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white/50 border-zinc-300 shadow-sm'}`} title={lang === 'zh' ? '缩放比例\n快捷键: Ctrl + 滚轮' : 'Zoom Level\nShortcut: Ctrl + Scroll'}>
        <span className="text-xs font-black w-12 text-center">{zoom}%</span>
      </div>

      <button 
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')} 
        title={lang === 'zh' ? '切换主题\n深色/浅色模式' : 'Toggle Theme\nDark/Light mode'}
        className={`w-14 h-14 flex items-center justify-center rounded-2xl border text-lg transition-all ${theme === 'dark' ? 'bg-zinc-900/50 border-white/5 text-purple-400' : 'bg-white/50 border-zinc-300 text-purple-600'}`}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>

      <button 
        onClick={() => onLangChange(lang === 'zh' ? 'en' : 'zh')} 
        title={lang === 'zh' ? '切换语言\n中文/English' : 'Toggle Language\n中文/English'}
        className={`w-14 h-14 flex items-center justify-center rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white/50 border-zinc-300'}`}
      >
        {lang === 'zh' ? 'EN' : '中'}
      </button>
    </div>
  );
};

export default SidebarLeft;
