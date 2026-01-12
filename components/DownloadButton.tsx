import React, { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';

interface DownloadButtonProps {
  content: string;
  filename?: string;
  fileType?: 'png' | 'jpg' | 'webp';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  onDownload?: () => void;
  onError?: (error: Error) => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  content: url,
  filename = 'download',
  fileType: format = 'png',
  size = 'md',
  variant = 'primary',
  disabled = false,
  theme,
  lang,
  onDownload,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const t = {
    zh: {
      download: '下载',
      downloading: '下载中...',
      downloaded: '已下载',
      error: '下载失败'
    },
    en: {
      download: 'Download',
      downloading: 'Downloading...',
      downloaded: 'Downloaded',
      error: 'Download failed'
    }
  };

  const handleDownload = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setDownloaded(false);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      }, 100);

      setDownloaded(true);
      if (onDownload) onDownload();

      // Reset downloaded state after 2 seconds
      setTimeout(() => setDownloaded(false), 2000);
    } catch (error) {
      console.error('Download error:', error);
      if (onError) onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5'
  };

  const variantClasses = {
    primary: theme === 'light' 
      ? 'bg-transparent hover:bg-black/5 text-gray-800' 
      : 'bg-transparent hover:bg-white/10 text-white',
    secondary: theme === 'light' 
      ? 'bg-transparent hover:bg-black/5 text-gray-800' 
      : 'bg-transparent hover:bg-white/10 text-white',
    text: theme === 'light' 
      ? 'bg-transparent hover:bg-black/5 text-gray-800' 
      : 'bg-transparent hover:bg-white/10 text-white'
  };

  const commonClasses = 'flex items-center justify-center rounded-[1.2rem] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const focusRingColor = theme === 'light' ? 'focus:ring-blue-500' : 'focus:ring-blue-400';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || isLoading}
      className={`${commonClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${focusRingColor} ${disabledClasses}`}
      aria-label={t[lang].download}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 20 : size === 'md' ? 22 : 24} className="animate-spin" />
      ) : downloaded ? (
        <Check size={size === 'sm' ? 20 : size === 'md' ? 22 : 24} />
      ) : (
        <Download size={size === 'sm' ? 20 : size === 'md' ? 22 : 24} />
      )}
    </button>
  );
};

export default DownloadButton;