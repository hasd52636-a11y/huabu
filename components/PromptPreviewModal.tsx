import React, { useState, useEffect, useRef } from 'react';
import { 
  X, RefreshCw, Download, Share2, Copy, 
  Check, ZoomIn, ZoomOut, RotateCw, Trash2
} from 'lucide-react';

interface PromptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  previewUrl?: string;
  onRegenerate?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const PromptPreviewModal: React.FC<PromptPreviewModalProps> = ({
  isOpen,
  onClose,
  prompt,
  previewUrl,
  onRegenerate,
  onDownload,
  onShare,
  onDelete,
  theme,
  lang
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      preview: '预览',
      prompt: '提示词',
      regenerate: '重新生成',
      download: '下载',
      share: '分享',
      copyPrompt: '复制提示词',
      delete: '删除',
      close: '关闭',
      noPreview: '暂无预览',
      loading: '生成中...',
      copied: '已复制',
      zoomIn: '放大',
      zoomOut: '缩小',
      resetZoom: '重置缩放',
      confirmDelete: '确认删除此预览？',
      cancel: '取消',
      confirm: '确认'
    },
    en: {
      preview: 'Preview',
      prompt: 'Prompt',
      regenerate: 'Regenerate',
      download: 'Download',
      share: 'Share',
      copyPrompt: 'Copy Prompt',
      delete: 'Delete',
      close: 'Close',
      noPreview: 'No preview available',
      loading: 'Generating...',
      copied: 'Copied!',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      resetZoom: 'Reset Zoom',
      confirmDelete: 'Confirm delete this preview?',
      cancel: 'Cancel',
      confirm: 'Confirm'
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  if (!isOpen) return null;

  const modalClasses = {
    light: 'bg-white text-gray-800 border-gray-200 shadow-2xl',
    dark: 'bg-gray-800 text-white border-gray-700 shadow-2xl'
  };

  const buttonClasses = {
    primary: theme === 'light' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: theme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white',
    danger: theme === 'light' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/50">
      <div 
        ref={modalRef}
        className={`relative w-full max-w-4xl max-h-[90vh] p-6 rounded-lg border ${modalClasses[theme]} overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold">{t[lang].preview}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
            aria-label={t[lang].close}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Preview section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t[lang].preview}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleZoomOut}
                  className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
                  aria-label={t[lang].zoomOut}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={handleResetZoom}
                  className={`px-3 py-1 text-sm rounded ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
                  aria-label={t[lang].zoomIn}
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            <div className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-700">
              {isLoading ? (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="flex flex-col items-center">
                    <RefreshCw size={32} className="animate-spin mb-3" />
                    <span className="text-lg">{t[lang].loading}</span>
                  </div>
                </div>
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-contain transition-transform duration-300"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-lg text-gray-500 dark:text-gray-400">{t[lang].noPreview}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {onRegenerate && (
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium ${buttonClasses.primary} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  <span>{t[lang].regenerate}</span>
                </button>
              )}
              {onDownload && (
                <button
                  onClick={onDownload}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium ${buttonClasses.primary}`}
                >
                  <Download size={18} />
                  <span>{t[lang].download}</span>
                </button>
              )}
              {onShare && (
                <button
                  onClick={onShare}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium ${buttonClasses.secondary}`}
                >
                  <Share2 size={18} />
                  <span>{t[lang].share}</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium ${buttonClasses.danger}`}
                >
                  <Trash2 size={18} />
                  <span>{t[lang].delete}</span>
                </button>
              )}
            </div>
          </div>

          {/* Prompt section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t[lang].prompt}</h3>
              <button
                onClick={handleCopyPrompt}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? t[lang].copied : t[lang].copyPrompt}</span>
              </button>
            </div>

            <div 
              className={`p-5 rounded-lg border whitespace-pre-wrap max-h-60 overflow-y-auto ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-700 border-gray-600'}`}
            >
              <p className="text-sm leading-relaxed">{prompt}</p>
            </div>

            {/* Prompt metadata or additional info can be added here */}
            <div className={`p-4 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>生成时间: {new Date().toLocaleString()}</p>
                <p>提示词长度: {prompt.length} 字符</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptPreviewModal;