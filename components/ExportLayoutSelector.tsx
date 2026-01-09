import React, { useState } from 'react';
import { 
  Download, Grid3X3, Grid2X2, LayoutGrid, 
  Image as ImageIcon, X, Check, Loader2
} from 'lucide-react';
import { Block, ExportLayout } from '../types';

interface ExportLayoutSelectorProps {
  blocks: Block[];
  onExport: (layout: ExportLayout) => Promise<void>;
  onClose: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const ExportLayoutSelector: React.FC<ExportLayoutSelectorProps> = ({
  blocks,
  onExport,
  onClose,
  theme,
  lang
}) => {
  const [selectedLayout, setSelectedLayout] = useState<ExportLayout>('2x2');
  const [isExporting, setIsExporting] = useState(false);

  const t = {
    zh: {
      exportStoryboard: '导出分镜',
      selectLayout: '选择布局',
      exportButton: '导出分镜图',
      exporting: '导出中...',
      blocksSelected: '个块已选择',
      layoutOptions: {
        '2x2': '2×2 网格',
        '2x3': '2×3 网格', 
        '3x3': '3×3 网格',
        '4x3': '4×3 网格',
        'main-2x2': '主图+2×2',
        'main-2x3': '主图+2×3',
        'main-3x3': '主图+3×3',
        'main-4x3': '主图+4×3'
      },
      layoutDescriptions: {
        '2x2': '标准2×2网格布局',
        '2x3': '紧凑2×3网格布局',
        '3x3': '密集3×3网格布局', 
        '4x3': '宽屏4×3网格布局',
        'main-2x2': '大主图配2×2小图',
        'main-2x3': '大主图配2×3小图',
        'main-3x3': '大主图配3×3小图',
        'main-4x3': '大主图配4×3小图'
      }
    },
    en: {
      exportStoryboard: 'Export Storyboard',
      selectLayout: 'Select Layout',
      exportButton: 'Export Storyboard',
      exporting: 'Exporting...',
      blocksSelected: 'blocks selected',
      layoutOptions: {
        '2x2': '2×2 Grid',
        '2x3': '2×3 Grid',
        '3x3': '3×3 Grid', 
        '4x3': '4×3 Grid',
        'main-2x2': 'Main+2×2',
        'main-2x3': 'Main+2×3',
        'main-3x3': 'Main+3×3',
        'main-4x3': 'Main+4×3'
      },
      layoutDescriptions: {
        '2x2': 'Standard 2×2 grid layout',
        '2x3': 'Compact 2×3 grid layout',
        '3x3': 'Dense 3×3 grid layout',
        '4x3': 'Wide 4×3 grid layout', 
        'main-2x2': 'Large main with 2×2 grid',
        'main-2x3': 'Large main with 2×3 grid',
        'main-3x3': 'Large main with 3×3 grid',
        'main-4x3': 'Large main with 4×3 grid'
      }
    }
  }[lang];

  const layouts: ExportLayout[] = ['2x2', '2x3', '3x3', '4x3', 'main-2x2', 'main-2x3', 'main-3x3', 'main-4x3'];

  const getLayoutIcon = (layout: ExportLayout) => {
    if (layout.includes('main')) return <LayoutGrid size={24} />;
    if (layout === '2x2') return <Grid2X2 size={24} />;
    return <Grid3X3 size={24} />;
  };

  const getLayoutPreview = (layout: ExportLayout) => {
    const isMain = layout.includes('main');
    const [cols, rows] = layout.replace('main-', '').split('x').map(Number);
    
    if (isMain) {
      return (
        <div className="w-16 h-12 border-2 border-amber-500 rounded-lg flex">
          <div className="flex-1 bg-amber-500/20 border-r border-amber-500" />
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {Array.from({ length: cols * rows }).map((_, i) => (
              <div key={i} className="border border-amber-500/30 bg-amber-500/10" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div 
        className="w-16 h-12 border-2 border-amber-500 rounded-lg grid gap-0.5 p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div key={i} className="bg-amber-500/20 rounded-sm" />
        ))}
      </div>
    );
  };

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await onExport(selectedLayout);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 animate-in fade-in zoom-in duration-300">
      <div className={`w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-[4rem] border-4 shadow-4xl ${
        theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-black/5'
      }`}>
        {/* Header */}
        <div className="p-8 border-b-2 border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-2xl">
              <Download size={28} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">{t.exportStoryboard}</h2>
              <p className="text-sm text-slate-500 font-bold mt-1">
                {blocks.length} {t.blocksSelected}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-4 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
          <div className="mb-8">
            <h3 className="text-xl font-black uppercase tracking-widest mb-6 text-slate-500">
              {t.selectLayout}
            </h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {layouts.map((layout) => (
                <button
                  key={layout}
                  onClick={() => setSelectedLayout(layout)}
                  className={`p-6 rounded-3xl border-4 transition-all hover:scale-105 active:scale-95 ${
                    selectedLayout === layout
                      ? 'border-amber-500 bg-amber-500/5 shadow-xl'
                      : 'border-black/5 dark:border-white/5 hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    {getLayoutPreview(layout)}
                    <div className="text-center">
                      <div className="font-black text-sm uppercase tracking-widest mb-1">
                        {t.layoutOptions[layout]}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {t.layoutDescriptions[layout]}
                      </div>
                    </div>
                    {selectedLayout === layout && (
                      <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className={`p-6 rounded-3xl border-2 ${
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-black/5'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              {getLayoutIcon(selectedLayout)}
              <div>
                <h4 className="font-black text-lg uppercase tracking-widest">
                  {t.layoutOptions[selectedLayout]}
                </h4>
                <p className="text-sm text-slate-500 font-bold">
                  {t.layoutDescriptions[selectedLayout]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center py-8">
              {getLayoutPreview(selectedLayout)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t-2 border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="text-sm text-slate-500 font-bold">
            {blocks.filter(b => b.content).length} blocks with content ready for export
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-8 py-4 rounded-2xl border-2 border-black/5 dark:border-white/5 font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || blocks.length === 0}
              className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isExporting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {t.exporting}
                </>
              ) : (
                <>
                  <Download size={16} />
                  {t.exportButton}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportLayoutSelector;