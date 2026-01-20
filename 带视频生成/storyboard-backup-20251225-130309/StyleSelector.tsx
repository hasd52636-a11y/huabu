import React, { useState, useRef, useEffect } from 'react';
import { StyleOption, STYLES, Theme } from '../types';

interface StyleSelectorProps {
  selectedStyle: StyleOption | null;
  onStyleChange: (style: StyleOption | null) => void;
  lang: 'zh' | 'en';
  theme: Theme;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onStyleChange,
  lang,
  theme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStyleLabel = () => {
    if (!selectedStyle) return lang === 'zh' ? '选择风格...' : 'Select Style...';
    return lang === 'zh' ? selectedStyle.nameZh || selectedStyle.name : selectedStyle.name;
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg font-semibold text-xs transition-all ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:border-purple-500/50'
            : 'bg-zinc-50 border-zinc-300 text-black hover:border-purple-500'
        }`}
        title={lang === 'zh' ? '选择风格' : 'Select Style'}
      >
        {selectedStyle && (
          <>
            <div
              className="w-5 h-5 rounded-full border-2 flex-shrink-0"
              style={{ backgroundColor: selectedStyle.color, borderColor: selectedStyle.color }}
            />
            <span className="flex-1 truncate text-left">{getStyleLabel()}</span>
          </>
        )}
        {!selectedStyle && (
          <span className="flex-1 truncate text-left opacity-50">{getStyleLabel()}</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 border rounded-lg shadow-lg z-50 w-full ${
          theme === 'dark'
            ? 'bg-[#0a0a0c] border-white/10'
            : 'bg-white border-zinc-300'
        }`}>
          <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onStyleChange(style);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-all text-left ${
                  selectedStyle?.id === style.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : theme === 'dark'
                    ? 'text-zinc-400 hover:bg-white/5'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={{
                    backgroundColor: style.color,
                    borderColor: selectedStyle?.id === style.id ? 'white' : style.color
                  }}
                />
                <span className="font-semibold truncate">
                  {lang === 'zh' ? style.nameZh || style.name : style.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleSelector;
