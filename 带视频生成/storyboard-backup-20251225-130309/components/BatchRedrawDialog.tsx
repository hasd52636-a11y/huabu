import React, { useState } from 'react';
import { StoryboardItem, Language, Theme } from '../types';

interface BatchRedrawDialogProps {
  theme: Theme;
  lang: Language;
  frames: StoryboardItem[];
  onClose: () => void;
  onSubmit: (instructions: Record<string, string>) => void;
}

const BatchRedrawDialog: React.FC<BatchRedrawDialogProps> = ({ theme, lang, frames, onClose, onSubmit }) => {
  const [instructions, setInstructions] = useState(() => {
    // Pre-populate with scene numbers
    const lines: string[] = [];
    for (let i = 1; i <= frames.length; i++) {
      lines.push(`SC-${String(i).padStart(2, '0')}: `);
    }
    return lines.join('\n');
  });
  const [selectedSceneNum, setSelectedSceneNum] = useState(1);
  
  const handleSubmit = () => {
    // 解析指令：SC-01: 指令内容
    const lines = instructions.split('\n').filter(line => line.trim());
    const parsed: Record<string, string> = {};
    
    lines.forEach(line => {
      const match = line.match(/^(SC-\d+):\s*(.*)$/);
      if (match) {
        parsed[match[1]] = match[2].trim();
      }
    });
    
    onSubmit(parsed);
  };
  
  const currentFrame = frames[selectedSceneNum - 1];
  
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className={`max-w-5xl w-full rounded-[2rem] p-8 border flex flex-col shadow-2xl animate-in zoom-in-95 ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
        <h3 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          {lang === 'zh' ? '批量重绘指令' : 'Batch Redraw Instructions'}
        </h3>
        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {lang === 'zh' 
            ? '在每个序号后输入改进指令。例如：SC-01: 加入更多细节 / SC-02: 改成夜间场景'
            : 'Enter instructions after each scene number. Example: SC-01: Add more details / SC-02: Change to night scene'}
        </p>
        
        <div className="flex gap-6 flex-1 min-h-[400px]">
          {/* 左侧：图片预览 */}
          <div className="flex flex-col gap-4 w-80 flex-shrink-0">
            <div className={`rounded-xl overflow-hidden border-2 ${theme === 'dark' ? 'border-purple-500/50' : 'border-purple-300'}`}>
              {currentFrame && (
                <img src={currentFrame.imageUrl} alt={`SC-${String(selectedSceneNum).padStart(2, '0')}`} className="w-full h-auto object-cover" />
              )}
            </div>
            
            {/* 场景选择按钮 */}
            <div className="flex flex-wrap gap-2">
              {frames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSceneNum(i + 1)}
                  className={`px-3 py-2 rounded-lg font-black text-xs uppercase transition-all ${
                    selectedSceneNum === i + 1
                      ? 'bg-purple-600 text-white'
                      : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  }`}
                >
                  SC-{String(i + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
            
            {/* 提示词预览 */}
            {currentFrame && (
              <div className={`rounded-xl p-3 text-xs overflow-y-auto max-h-[150px] ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                <p className="font-bold mb-2">{lang === 'zh' ? '原始提示词：' : 'Original Prompt:'}</p>
                <p className="whitespace-pre-wrap break-words">{currentFrame.prompt}</p>
              </div>
            )}
          </div>
          
          {/* 右侧：指令输入 */}
          <div className="flex-1 flex flex-col">
            <textarea 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
              className={`flex-1 w-full rounded-xl p-4 text-sm font-bold border bg-transparent outline-none focus:border-purple-500/50 resize-none ${theme === 'dark' ? 'border-white/5 text-white' : 'border-zinc-200 text-black'}`} 
            />
            <div className="mt-6 flex gap-4">
              <button 
                onClick={onClose} 
                className={`flex-1 py-3 border rounded-xl uppercase font-black text-sm transition-all ${theme === 'dark' ? 'border-zinc-500 text-zinc-500 hover:bg-zinc-500 hover:text-white' : 'border-zinc-400 text-zinc-600 hover:bg-zinc-200 hover:text-black'}`}
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button 
                onClick={handleSubmit} 
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl uppercase font-black text-sm shadow-lg hover:scale-[1.02] transition-all"
              >
                {lang === 'zh' ? '提交' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchRedrawDialog;
