
import React, { useState, useEffect, useRef } from 'react';
import { Block } from '../types';
import { COLORS, I18N } from '../constants';
import { 
  Trash2, RefreshCw, Scissors, Type as TextIcon, 
  Image as ImageIcon, Play, MoveDiagonal2, Type, 
  Palette, Square, Monitor, Smartphone,
  Sparkles, Send, Upload, Paperclip,
  Pencil, Check, X, Copy
} from 'lucide-react';

interface BlockProps {
  block: Block;
  isSelected: boolean;
  isPerfMode: boolean;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string, isMulti: boolean) => void;
  onAnchorClick: (id: string, type: 'in' | 'out') => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string, prompt: string) => void;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  lang: 'zh' | 'en';
  upstreamIds: string[];
}

// 精简版 Tooltip：独立具名触发，动画更轻盈
const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover/btn:translate-y-0 z-[300]">
    <div className="bg-slate-900 dark:bg-black text-white px-3 py-1.5 rounded-lg shadow-2xl border border-white/10 whitespace-nowrap">
      <span className="text-[10px] font-black uppercase tracking-[0.1em]">{label}</span>
    </div>
    {/* Tooltip 小箭头 */}
    <div className="w-2 h-2 bg-slate-900 dark:bg-black border-r border-b border-white/10 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
  </div>
);

const BlockComponent: React.FC<BlockProps> = ({
  block,
  isSelected,
  isPerfMode,
  onDragStart,
  onResizeStart,
  onSelect,
  onAnchorClick,
  onDelete,
  onGenerate,
  onUpdate,
  lang,
  upstreamIds
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = I18N[lang];

  const theme = block.type === 'text' ? COLORS.text : block.type === 'image' ? COLORS.image : COLORS.video;

  // 定义三个固定的字号档位
  const FONT_SIZES = [24, 56, 112];

  const cycleFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = block.fontSize || 24;
    const currentIndex = FONT_SIZES.indexOf(current);
    // 如果不在列表中（比如导入的数据），默认回到第一档
    const nextIndex = (currentIndex + 1) % FONT_SIZES.length;
    onUpdate(block.id, { fontSize: FONT_SIZES[nextIndex] });
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() && upstreamIds.length === 0) return;
    
    let finalPrompt = userInput;
    if (!userInput.includes('[') && upstreamIds.length > 0) {
      finalPrompt = `${upstreamIds.map(id => `[${id}]`).join(' ')} ${userInput}`.trim();
    }
    
    onGenerate(block.id, finalPrompt);
  };

  const insertId = (id: string) => {
    const tag = `[${id}] `;
    setUserInput(prev => prev + tag);
    inputRef.current?.focus();
  };

  const copyIdToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = `[${block.number}]`;
    navigator.clipboard.writeText(tag);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'zh' ? '文件大小不能超过 5MB' : 'File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onUpdate(block.id, { content, status: 'idle' });
    };

    if (block.type === 'text') {
      reader.readAsText(file);
    } else if (block.type === 'image') {
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const getChipColor = (id: string) => {
    if (id.startsWith('A')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20';
    if (id.startsWith('B')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20';
    if (id.startsWith('V')) return 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20';
  };

  return (
    <div
      data-block-id={block.id}
      className="absolute group transition-transform duration-300 cursor-grab active:cursor-grabbing select-none"
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: `translate(-50%, -50%)`,
        zIndex: isSelected || isHovered || isEditing ? 200 : 10
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        onSelect(block.id, e.shiftKey);
        onDragStart(e, block.id);
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        accept={block.type === 'text' ? ".txt,.md,.js,.ts,.tsx,.json,.css,.html" : "image/*"}
      />

      {/* 隐形扩展区 */}
      <div className={`absolute -top-40 left-0 w-full h-40 pointer-events-auto ${isHovered ? 'block' : 'hidden'}`} />
      
      {/* 悬浮控制菜单 */}
      <div 
        className={`absolute bottom-[calc(100%+24px)] left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-2 border-black/5 dark:border-white/10 rounded-[2.5rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 z-[210]
          ${isHovered || isEditing ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-12 scale-90 pointer-events-none'}
        `}
        onMouseEnter={() => setIsHovered(true)}
      >
        <div className="flex items-center gap-2">
          {block.type === 'text' && (
            <>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }} className={`p-4 rounded-[1.2rem] transition-all ${isEditing ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white'}`}>
                  {isEditing ? <Check size={22} /> : <Pencil size={22} />}
                </button>
                <Tooltip label={isEditing ? t.tips.finish : t.tips.edit} />
              </div>
              <div className="relative group/btn">
                <button onClick={cycleFontSize} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Type size={22} /></button>
                <Tooltip label={t.tips.fontSize} />
              </div>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { textColor: block.textColor === '#334155' ? '#2563EB' : '#334155' }); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Palette size={22} /></button>
                <Tooltip label={t.tips.textColor} />
              </div>
            </>
          )}
          {block.type === 'image' && (
            <>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { aspectRatio: block.aspectRatio === '1:1' ? '16:9' : '1:1' }); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Square size={22} /></button>
                <Tooltip label={t.tips.aspectRatio} />
              </div>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { isCropped: !block.isCropped }); }} className={`p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all ${block.isCropped ? 'text-amber-600' : 'text-slate-700 dark:text-white'}`}><Scissors size={22} /></button>
                <Tooltip label={t.tips.crop} />
              </div>
            </>
          )}
          {block.type === 'video' && (
            <>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { aspectRatio: '16:9' }); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Monitor size={22} /></button>
                <Tooltip label={t.tips.landscape} />
              </div>
              <div className="relative group/btn">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(block.id, { aspectRatio: '9:16' }); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Smartphone size={22} /></button>
                <Tooltip label={t.tips.portrait} />
              </div>
            </>
          )}
          <div className="relative group/btn">
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-[1.2rem] transition-all"><Paperclip size={22} /></button>
            <Tooltip label={t.tips.upload} />
          </div>
        </div>
        
        <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-1" />
        
        <div className="relative group/btn">
          <button onClick={(e) => { e.stopPropagation(); onGenerate(block.id, userInput || block.content); }} className="p-4 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-[1.2rem] transition-all"><RefreshCw size={22} className={block.status === 'processing' ? 'animate-spin' : ''} /></button>
          <Tooltip label={t.tips.regenerate} />
        </div>
        <div className="relative group/btn">
          <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="p-4 hover:bg-red-500 hover:text-white text-slate-700 dark:text-white rounded-[1.2rem] transition-all"><Trash2 size={22} /></button>
          <Tooltip label={t.tips.delete} />
        </div>
      </div>

      {/* 主画布内容 */}
      <div 
        className={`relative w-full h-full rounded-[4rem] overflow-hidden transition-all duration-500 border-4
          ${isSelected ? 'scale-[1.01]' : 'hover:shadow-[0_40px_100px_rgba(0,0,0,0.15)]'}
        `}
        style={{ 
          backgroundColor: theme.bg,
          borderColor: theme.border,
          boxShadow: isSelected ? `0 0 0 4px ${theme.border}, 0 60px 140px -20px rgba(0,0,0,0.3), 0 0 60px ${theme.glow}` : ''
        }}
      >
        <div className="absolute top-10 left-12 z-20 pointer-events-auto">
          <button 
            onClick={copyIdToClipboard}
            className="group/id bg-white/90 dark:bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border-2 border-black/5 dark:border-white/10 shadow-lg flex items-center gap-3 active:scale-95 transition-all"
          >
             <span className="text-[16px] font-black tracking-[0.2em] text-slate-900 dark:text-white uppercase">
               {showCopied ? (lang === 'zh' ? '已复制' : 'COPIED') : block.number}
             </span>
             {!showCopied && <Copy size={16} className="text-slate-400 group-hover/id:text-amber-500 transition-colors" />}
          </button>
        </div>

        <div className="w-full h-full relative" onDoubleClick={() => block.type === 'text' && setIsEditing(true)}>
          {block.status === 'processing' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-3xl z-50">
              <div className="w-24 h-24 border-[6px] border-slate-200 border-t-slate-800 rounded-full animate-spin mb-6" style={{ borderTopColor: theme.border }} />
            </div>
          ) : block.type === 'image' && block.content ? (
            <img src={block.content} className={`w-full h-full object-cover transition-transform duration-1000 ${block.isCropped ? 'scale-150' : 'scale-100'}`} alt="AI Output" />
          ) : block.type === 'text' && block.content ? (
            <div className="w-full h-full flex items-center justify-center p-20 text-center overflow-auto scrollbar-hide">
              {isEditing ? (
                <textarea
                  className="w-full h-full bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-[2rem] p-10 border-none outline-none resize-none font-bold leading-relaxed text-center scrollbar-hide focus:ring-0"
                  value={block.content}
                  autoFocus
                  style={{ fontSize: block.fontSize || 24, color: block.textColor || '#334155' }}
                  onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) setIsEditing(false); }}
                />
              ) : (
                <p className="font-bold leading-relaxed transition-all whitespace-pre-wrap cursor-text" style={{ fontSize: block.fontSize || 24, color: block.textColor || '#334155' }}>
                  {block.content}
                </p>
              )}
            </div>
          ) : block.type === 'video' && block.content ? (
            <video src={block.content} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
               {block.type === 'text' ? <TextIcon size={100} className="text-slate-900 dark:text-white" /> : block.type === 'image' ? <ImageIcon size={100} className="text-slate-900 dark:text-white" /> : <Play size={100} className="text-slate-900 dark:text-white" />}
               <span className="mt-8 text-[14px] font-black uppercase tracking-[0.5em]">{t.blockPlaceholder}</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-12 right-12 w-16 h-16 flex items-center justify-center cursor-nwse-resize text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all z-[30] hover:scale-125" onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, block.id); }}>
          <MoveDiagonal2 size={36} />
        </div>
      </div>

      {/* 指令输入框 */}
      <div 
        className={`absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 w-full max-w-[720px] p-2 bg-white dark:bg-slate-900 shadow-[0_48px_100px_-15px_rgba(0,0,0,0.4)] rounded-[3.5rem] border-2 border-black/10 dark:border-white/10 transition-all duration-300 z-[210]
          ${isHovered || isSelected || upstreamIds.length > 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-12 pointer-events-none'}
        `}
        onMouseDown={e => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
      >
        <form onSubmit={handlePromptSubmit} className="flex items-center gap-4 px-6 py-2">
           <Sparkles size={24} className="text-amber-500 shrink-0" />
           
           <div className="flex-1 flex flex-wrap items-center gap-2 overflow-hidden">
             <div className="flex gap-2 shrink-0">
               {upstreamIds.map(id => (
                 <button 
                  key={id} 
                  type="button"
                  onClick={() => insertId(id)}
                  title={lang === 'zh' ? '点击插入编号' : 'Click to insert ID'}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-black text-[11px] uppercase tracking-wider select-none shadow-sm transition-all active:scale-90 ${getChipColor(id)}`}
                 >
                   <span>{id}</span>
                 </button>
               ))}
             </div>

             <div className="flex-1 relative flex items-center min-w-[200px]">
               <input 
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder={lang === 'zh' ? '输入指令，点击编号可混排...' : 'Enter command, click ID to mix...'}
                className="w-full bg-transparent text-lg font-bold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 py-4"
               />
             </div>
           </div>

           <button type="submit" className={`p-4 w-16 h-16 flex items-center justify-center rounded-full transition-all shadow-xl shrink-0 ${userInput.trim() || upstreamIds.length > 0 ? 'bg-amber-500 text-white hover:scale-110 active:scale-95' : 'bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed'}`}>
             <Send size={24} fill={userInput.trim() || upstreamIds.length > 0 ? "currentColor" : "none"} />
           </button>
        </form>
      </div>

      {/* 逻辑锚点 */}
      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-32 h-32 flex items-center justify-center cursor-crosshair z-[60]" onMouseDown={e => { e.stopPropagation(); onAnchorClick(block.id, 'in'); }}>
        <div className="w-16 h-16 rounded-full border-4 bg-white shadow-3xl flex items-center justify-center transition-all hover:scale-125" style={{ borderColor: theme.border }}>
          <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: theme.border }} />
        </div>
      </div>
      <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 w-32 h-32 flex items-center justify-center cursor-crosshair z-[60]" onMouseDown={e => { e.stopPropagation(); onAnchorClick(block.id, 'out'); }}>
        <div className="w-16 h-16 rounded-full border-4 bg-white shadow-3xl flex items-center justify-center transition-all hover:scale-125" style={{ borderColor: theme.border }}>
          <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: theme.border }} />
        </div>
      </div>
    </div>
  );
};

export default BlockComponent;
