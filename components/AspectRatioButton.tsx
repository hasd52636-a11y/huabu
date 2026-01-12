import React, { useState, useEffect, useRef } from 'react';
import { Image, X, Check, Edit } from 'lucide-react';

export type AspectRatio = {
  label: string;
  value: string;
  width: number;
  height: number;
};

interface AspectRatioButtonProps {
  selectedRatio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  size?: 'sm' | 'md' | 'lg';
}

const AspectRatioButton: React.FC<AspectRatioButtonProps> = ({
  selectedRatio,
  onRatioChange,
  theme,
  lang,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const defaultRatios: AspectRatio[] = [
    { label: '1:1', value: '1:1', width: 1024, height: 1024 },
    { label: '4:3', value: '4:3', width: 1024, height: 768 },
    { label: '16:9', value: '16:9', width: 1920, height: 1080 },
    { label: '3:2', value: '3:2', width: 1200, height: 800 },
    { label: '2:3', value: '2:3', width: 800, height: 1200 },
    { label: '9:16', value: '9:16', width: 1080, height: 1920 },
    { label: '16:10', value: '16:10', width: 1600, height: 1000 },
    { label: '21:9', value: '21:9', width: 2560, height: 1080 }
  ];

  const t = {
    zh: {
      aspectRatio: '宽高比',
      custom: '自定义',
      width: '宽',
      height: '高',
      apply: '应用',
      cancel: '取消'
    },
    en: {
      aspectRatio: 'Aspect Ratio',
      custom: 'Custom',
      width: 'Width',
      height: 'Height',
      apply: 'Apply',
      cancel: 'Cancel'
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRatioSelect = (ratio: AspectRatio) => {
    onRatioChange(ratio);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);
    
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height);
      const simplifiedWidth = width / divisor;
      const simplifiedHeight = height / divisor;
      
      const customRatio: AspectRatio = {
        label: `${simplifiedWidth}:${simplifiedHeight}`,
        value: `${simplifiedWidth}:${simplifiedHeight}`,
        width,
        height
      };
      
      onRatioChange(customRatio);
      setIsOpen(false);
      setIsCustomMode(false);
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5'
  };

  const buttonClasses = {
    base: `relative flex items-center justify-center rounded-[1.2rem] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${sizeClasses[size]}`,
    normal: theme === 'light' 
      ? 'bg-transparent hover:bg-black/5 text-gray-800 focus:ring-blue-500' 
      : 'bg-transparent hover:bg-white/10 text-white focus:ring-blue-400',
    active: theme === 'light' 
      ? 'bg-transparent hover:bg-black/5 text-blue-700 focus:ring-blue-500' 
      : 'bg-transparent hover:bg-white/10 text-blue-400 focus:ring-blue-400'
  };

  const menuClasses = {
    base: `absolute top-full left-0 mt-1 w-56 rounded-lg shadow-lg overflow-hidden z-50`,
    light: 'bg-white border border-gray-200 text-gray-800',
    dark: 'bg-gray-800 border border-gray-700 text-white'
  };

  return (
    <div ref={buttonRef} className="relative inline-block">
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonClasses.base} ${buttonClasses.normal}`}
        aria-label={t[lang].aspectRatio}
      >
        <Image size={size === 'sm' ? 20 : size === 'md' ? 22 : 24} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`${menuClasses.base} ${theme === 'light' ? menuClasses.light : menuClasses.dark}`}>
          {/* Preset ratios */}
          <div className="p-2">
            {defaultRatios.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => handleRatioSelect(ratio)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-150 ${selectedRatio.value === ratio.value 
                  ? (theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400') 
                  : (theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700')}`}
              >
                <span>{ratio.label}</span>
                {selectedRatio.value === ratio.value && <Check size={14} />}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={`h-px ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}`}></div>

          {/* Custom ratio */}
          {!isCustomMode ? (
            <button
              onClick={() => setIsCustomMode(true)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors duration-150 ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
            >
              <div className="flex items-center space-x-2">
                <Edit size={14} />
                <span>{t[lang].custom}</span>
              </div>
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-xs mb-1 opacity-70">{t[lang].width}</label>
                  <input
                    type="number"
                    min="1"
                    max="4096"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className={`w-full px-2 py-1 rounded-md text-sm border ${theme === 'light' 
                      ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                      : 'bg-gray-700 border-gray-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'}`}
                    placeholder="1024"
                  />
                </div>
                <span className="text-sm opacity-70">:</span>
                <div className="flex-1">
                  <label className="block text-xs mb-1 opacity-70">{t[lang].height}</label>
                  <input
                    type="number"
                    min="1"
                    max="4096"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className={`w-full px-2 py-1 rounded-md text-sm border ${theme === 'light' 
                      ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                      : 'bg-gray-700 border-gray-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'}`}
                    placeholder="1024"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsCustomMode(false)}
                  className={`px-3 py-1.5 rounded-md text-sm ${theme === 'light' 
                    ? 'bg-gray-100 hover:bg-gray-200' 
                    : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {t[lang].cancel}
                </button>
                <button
                  onClick={handleCustomApply}
                  className={`px-3 py-1.5 rounded-md text-sm ${theme === 'light' 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {t[lang].apply}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AspectRatioButton;