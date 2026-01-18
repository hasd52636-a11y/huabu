import React from 'react';
import { PlayCircle, ExternalLink, Download, Copy, Info } from 'lucide-react';

interface VideoPreviewFallbackProps {
  videoUrl: string;
  blockId: string;
  aspectRatio?: string;
  duration?: string;
}

/**
 * Fallback component for HTTP video URLs that may have CORS issues
 * Provides alternative ways to access the video content
 * Implements Requirement 1.2: Preserve upload attachment buttons and maintain proper rendering
 */
const VideoPreviewFallback: React.FC<VideoPreviewFallbackProps> = ({
  videoUrl,
  blockId,
  aspectRatio,
  duration
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showUrl, setShowUrl] = React.useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy video URL:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video_${blockId}_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 relative">
      {/* Video preview placeholder */}
      <div className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-300">
        <PlayCircle size={64} className="text-slate-400 mb-4" />
        
        <h3 className="text-lg font-semibold mb-2">Video Generated Successfully</h3>
        
        <p className="text-sm text-center px-4 mb-6 max-w-sm">
          Your video is ready! Due to browser security restrictions, the video cannot be displayed inline. 
          Use the options below to access your video.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleOpenInNewTab}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ExternalLink size={18} />
            Open in New Tab
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download size={18} />
            Download Video
          </button>

          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Copy size={18} />
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>

        {/* URL display toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowUrl(!showUrl)}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
          >
            <Info size={14} />
            {showUrl ? 'Hide URL' : 'Show URL'}
          </button>
        </div>

        {showUrl && (
          <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded-lg border max-w-md w-full">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Video URL:</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 break-all font-mono">
              {videoUrl}
            </div>
          </div>
        )}
      </div>

      {/* Video info overlay - preserved as required */}
      {(aspectRatio || duration) && (
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-base px-4 py-2 rounded-full backdrop-blur-md shadow-lg z-10">
          {aspectRatio && <span>{aspectRatio} </span>}
          {duration && <span>{duration}秒</span>}
        </div>
      )}

      {/* Block ID for debugging */}
      <div className="absolute bottom-2 right-2 text-xs text-slate-400 opacity-50">
        {blockId}
      </div>
    </div>
  );
};

export default VideoPreviewFallback;