import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface PromptPreviewPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  previewUrl?: string;
  onRegenerate?: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const PromptPreviewPopover: React.FC<PromptPreviewPopoverProps> = ({
  isOpen,
  onClose,
  prompt,
  previewUrl,
  onRegenerate,
  theme,
  lang
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      preview: '预览',
      prompt: '提示词',
      regenerate: '重新生成',
      close: '关闭',
      noPreview: '暂无预览',
      loading: '生成中...'
    },
    en: {
      preview: 'Preview',
      prompt: 'Prompt',
      regenerate: 'Regenerate',
      close: 'Close',
      noPreview: 'No preview available',
      loading: 'Generating...'
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsLoading(true);
      try {
        await onRegenerate();
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const popoverClasses = {
    light: 'bg-white text-gray-800 border-gray-200 shadow-lg',
    dark: 'bg-gray-800 text-white border-gray-700 shadow-lg'
  };

  const buttonClasses = {
    light: 'bg-blue-500 hover:bg-blue-600 text-white',
    dark: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/20">
      <div 
        ref={popoverRef}
        className={`relative w-full max-w-2xl p-6 rounded-lg border ${popoverClasses[theme]}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
          aria-label={t[lang].close}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{t[lang].preview}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
              aria-label={showPrompt ? t[lang].preview : t[lang].prompt}
            >
              {showPrompt ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${buttonClasses[theme]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>{t[lang].regenerate}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prompt section */}
          {showPrompt && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t[lang].prompt}</h4>
              <div 
                className={`p-4 rounded-lg ${theme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}
              >
                <p className="whitespace-pre-wrap text-sm">{prompt}</p>
              </div>
            </div>
          )}

          {/* Preview section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t[lang].preview}</h4>
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              {isLoading ? (
                <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
                  <div className="flex flex-col items-center">
                    <RefreshCw size={24} className="animate-spin mb-2" />
                    <span className="text-sm">{t[lang].loading}</span>
                  </div>
                </div>
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t[lang].noPreview}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptPreviewPopover;