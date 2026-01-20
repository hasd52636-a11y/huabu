import React from 'react';
import { Language, Theme } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  theme: Theme;
  helpSections: Array<{ title: string; content: string }>;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  helpSections,
}) => {
  if (!isOpen) return null;

  const getButtonClassName = () => {
    return `w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all mt-8 ${
      theme === 'dark' 
        ? 'bg-white text-black hover:bg-zinc-200' 
        : 'bg-black text-white hover:bg-zinc-800'
    }`;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className={`max-w-4xl w-full max-h-[90vh] rounded-[2rem] p-8 border flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {lang === 'zh' ? '使用说明' : 'Usage Guide'}
          </h3>
          <button
            onClick={onClose}
            className={`text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-black'}`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto flex-1 pr-4">
          {helpSections.length > 0 ? (
            helpSections.map((section, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                  {section.title}
                </h4>
                <div className={`text-sm leading-relaxed font-bold whitespace-pre-wrap space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {section.content}
                </div>
              </div>
            ))
          ) : (
            <div className={`p-6 rounded-2xl border text-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <p className={`${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {lang === 'zh' ? '加载中...' : 'Loading...'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className={getButtonClassName()}
        >
          {lang === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default HelpModal;
