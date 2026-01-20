import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, ExternalLink, Download, Copy, Info, Play, Pause, Volume2, VolumeX, Link, Maximize2 } from 'lucide-react';

interface VideoPreviewFallbackProps {
  videoUrl: string;
  blockId: string;
  aspectRatio?: string;
  duration?: string;
}

/**
 * Enhanced video preview component that attempts direct playback first
 * Falls back to download options if direct playback fails
 * Implements Requirement 1.2: Preserve upload attachment buttons and maintain proper rendering
 */
const VideoPreviewFallback: React.FC<VideoPreviewFallbackProps> = ({
  videoUrl,
  blockId,
  aspectRatio,
  duration
}) => {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [canPlay, setCanPlay] = useState(true); // 默认尝试播放
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 尝试预加载视频以检测是否可以播放
    if (videoRef.current && canPlay) {
      const video = videoRef.current;
      
      const handleCanPlay = () => {
        console.log('[VideoPreviewFallback] Video can play:', videoUrl);
        setHasError(false);
      };
      
      const handleError = (e: any) => {
        console.error('[VideoPreviewFallback] Video load error:', e);
        setHasError(true);
        setCanPlay(false);
      };
      
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [videoUrl, canPlay]);

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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error('[VideoPreviewFallback] Play failed:', err);
          setHasError(true);
          setCanPlay(false);
        });
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleExtractLink = () => {
    // Create a modal or prompt to show the extractable link
    const linkText = `Video Link: ${videoUrl}`;
    
    // Try to copy to clipboard
    navigator.clipboard.writeText(videoUrl).then(() => {
      alert('Video link copied to clipboard!\n\n' + linkText);
    }).catch(() => {
      // Fallback: show in alert if clipboard fails
      alert('Video Link:\n\n' + videoUrl + '\n\n(Please copy manually)');
    });
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  // 如果可以播放且没有错误，显示视频播放器
  if (canPlay && !hasError) {
    return (
      <div className="w-full h-full relative bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setHasError(true);
            setCanPlay(false);
          }}
          controls={false}
          muted={isMuted}
          preload="metadata"
        />
        
        {/* 自定义控制栏 */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExtractLink}
              className="text-white hover:text-yellow-400 transition-colors"
              title="Extract Link"
            >
              <Link size={18} />
            </button>
            
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-purple-400 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            
            <button
              onClick={handleDownload}
              className="text-white hover:text-green-400 transition-colors"
              title="Download Video"
            >
              <Download size={18} />
            </button>
            
            <button
              onClick={handleOpenInNewTab}
              className="text-white hover:text-blue-400 transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink size={18} />
            </button>
          </div>
        </div>

        {/* Video info overlay */}
        {(aspectRatio || duration) && (
          <div className="absolute top-4 right-4 bg-black/80 text-white text-sm px-3 py-1 rounded-full backdrop-blur-md">
            {aspectRatio && <span>{aspectRatio} </span>}
            {duration && <span>{duration}s</span>}
          </div>
        )}
      </div>
    );
  }

  // 如果无法播放，显示下载选项
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
            onClick={handleExtractLink}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Link size={18} />
            Extract Link
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