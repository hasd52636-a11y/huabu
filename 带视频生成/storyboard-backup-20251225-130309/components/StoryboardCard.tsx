import React, { useState, useRef } from 'react';
import { StoryboardItem, FilterMode, Language, I18N, Theme, SYMBOL_LABELS, SYMBOL_DESCRIPTIONS } from '../types';

interface StoryboardCardProps {
  item: StoryboardItem;
  theme: Theme;
  isSelected: boolean;
  onSelect: (id: string, shift: boolean) => void;
  onAction: (id: string, action: string, data?: any) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  lang: Language;
  onDropSymbol: (itemId: string, symName: string, x: number, y: number) => void;
  selectedCount?: number;
  onShowBatchRedrawDialog?: () => void;
  onExportJPEG?: () => void;
  selectedIds?: Set<string>;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ item, theme, isSelected, onSelect, onAction, onDragStart, lang, onDropSymbol, selectedCount, onShowBatchRedrawDialog, onExportJPEG, selectedIds }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editPrompt, setEditPrompt] = useState(item.prompt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = I18N[lang];

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = item.width;
    // 使用实际的图片比例，而不是硬编码的比例
    const ratio = item.height / item.width;
    const onMouseMove = (me: MouseEvent) => {
      const nw = Math.max(120, startW + (me.clientX - startX));
      const nh = nw * ratio;
      onAction(item.id, 'resize', { width: nw, height: nh });
    };
    const onMouseUp = () => { setIsResizing(false); window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`absolute group transition-shadow duration-300 rounded-[1.5rem] border ${isSelected ? 'z-50 ring-4 ring-purple-600 shadow-2xl' : 'z-10 shadow-lg'} ${theme === 'dark' ? 'bg-[#121216] border-white/5' : 'bg-white border-zinc-200'}`}
      style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
      onMouseDown={e => { if (e.button === 0 && !isResizing) { e.stopPropagation(); onDragStart(e, item.id); onSelect(item.id, e.shiftKey); } }}
      onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true); }}
      onDragOver={e => !item.isMain && e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (item.isMain) return; const rect = e.currentTarget.getBoundingClientRect(); onDropSymbol(item.id, e.dataTransfer.getData('symbolName'), ((e.clientX - rect.left)/rect.width)*100, ((e.clientY - rect.top)/rect.height)*100); }}>
      
      <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => onAction(item.id, 'replace', ev.target?.result); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
      
      {item.isMain && (
        <div className="absolute -top-10 left-0 flex items-center gap-2 pointer-events-none">
          <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Ref</span>
          <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">{t.importImage}</span>
        </div>
      )}

      <div className={`relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black`}>
        <img 
          src={item.imageUrl} 
          className={`w-full h-full object-cover pointer-events-none transition-transform ${!item.isMain && item.colorMode === 'blackAndWhite' ? 'grayscale contrast-125' : ''}`}
          style={item.isMain && item.scale ? { transform: `scale(${item.scale})`, transformOrigin: 'center' } : {}}
        />
        {!item.isMain && (
          <div className="absolute inset-0 pointer-events-none">
            {item.symbols.map(s => <div key={s.id} className="absolute text-purple-500 font-black text-3xl drop-shadow-md" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}>{s.label}</div>)}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-black text-white">SCENE {String(item.order + 1).padStart(2, '0')}</div>
          </div>
        )}
        <div className="absolute bottom-1 right-1 w-5 h-5 cursor-nwse-resize z-50 flex items-end justify-end opacity-0 group-hover:opacity-100" onMouseDown={handleResizeStart}>
          <div className="w-2 h-2 border-r-2 border-b-2 border-white/50" />
        </div>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-[200]" onClick={() => setShowMenu(false)}>
          <div 
            ref={(el) => {
              if (el && showMenu) {
                const rect = el.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                let x = menuPos.x;
                let y = menuPos.y;
                
                // 如果菜单超出右边界，向左调整
                if (x + rect.width > viewportWidth - 10) {
                  x = viewportWidth - rect.width - 10;
                }
                
                // 如果菜单超出下边界，向上调整
                if (y + rect.height > viewportHeight - 10) {
                  y = viewportHeight - rect.height - 10;
                }
                
                // 确保菜单不会超出左边界和上边界
                x = Math.max(10, x);
                y = Math.max(10, y);
                
                el.style.position = 'fixed';
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
              }
            }}
            className={`p-2 border rounded-2xl shadow-2xl w-40 flex flex-col font-black text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'bg-zinc-900 border-white/10 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600 shadow-zinc-300/50'}`} 
            style={{ position: 'fixed', left: `${menuPos.x}px`, top: `${menuPos.y}px` }}>
            <button onClick={() => { onAction(item.id, 'setMain'); setShowMenu(false); }} className="p-3 text-left hover:text-red-500 transition-all">{t.setKey}</button>
            <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="p-3 text-left hover:text-purple-500 transition-all">{t.replace}</button>
            {!item.isMain && selectedCount && selectedCount > 1 ? (
              <button onClick={() => { onShowBatchRedrawDialog?.(); setShowMenu(false); }} className="p-3 text-left hover:text-purple-500 transition-all">{lang === 'zh' ? '批量重绘' : 'Batch Redraw'}</button>
            ) : (
              !item.isMain && <button onClick={() => { setEditPrompt(item.prompt); setShowEditPrompt(true); setShowMenu(false); }} className="p-3 text-left hover:text-purple-500 transition-all">{t.redrawViewScript}</button>
            )}
            <button onClick={() => { onAction(item.id, 'copy'); setShowMenu(false); }} className="p-3 text-left hover:text-blue-500 transition-all">{t.copy}</button>
            {onExportJPEG && <button onClick={() => { onExportJPEG(); setShowMenu(false); }} className="p-3 text-left hover:text-green-500 transition-all">{t.downloadImage}</button>}
            <button onClick={() => { onAction(item.id, 'delete'); setShowMenu(false); }} className="p-3 text-left text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all">{t.delete}</button>
          </div>
        </div>
      )}

      {showEditPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className={`max-w-2xl w-full rounded-[2rem] p-8 border flex flex-col shadow-2xl animate-in zoom-in-95 ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
            <h3 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{lang === 'zh' ? '编辑提示词' : 'Edit Prompt'}</h3>
            <textarea 
              value={editPrompt} 
              onChange={e => setEditPrompt(e.target.value)} 
              className={`flex-1 w-full rounded-xl p-4 text-sm font-bold border bg-transparent outline-none focus:border-purple-500/50 resize-none min-h-[200px] ${theme === 'dark' ? 'border-white/5 text-white' : 'border-zinc-200 text-black'}`} 
            />
            <div className="mt-6 flex gap-4">
              <button 
                onClick={() => setShowEditPrompt(false)} 
                className={`flex-1 py-3 border rounded-xl uppercase font-black text-sm transition-all ${theme === 'dark' ? 'border-zinc-500 text-zinc-500 hover:bg-zinc-500 hover:text-white' : 'border-zinc-400 text-zinc-600 hover:bg-zinc-200 hover:text-black'}`}
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button 
                onClick={() => { onAction(item.id, 'regenerate', editPrompt); setShowEditPrompt(false); }} 
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl uppercase font-black text-sm shadow-lg hover:scale-[1.02] transition-all"
              >
                {lang === 'zh' ? '重绘' : 'Redraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryboardCard;
