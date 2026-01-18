import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, RefreshCw } from 'lucide-react';

interface EnhancedVideoPlayerProps {
  src: string;
  blockId: string;
  aspectRatio?: string;
  duration?: string;
  onError: (error: { message: string; code?: number }) => void;
}

/**
 * Enhanced video player with comprehensive error handling and fallback mechanisms
 * Implements Requirement 1.2: Maintain proper rendering without white screen errors
 */
const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  blockId,
  aspectRatio,
  duration,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const maxRetries = 3;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      console.log('[EnhancedVideoPlayer] Video loading started:', src);
      setIsLoading(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      console.log('[EnhancedVideoPlayer] Video can play:', src);
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      const errorMessage = error ? getVideoErrorMessage(error.code) : 'Unknown video error';
      
      console.error('[EnhancedVideoPlayer] Video error:', {
        code: error?.code,
        message: errorMessage,
        src,
        attempt: loadAttempts + 1
      });

      setIsLoading(false);
      setHasError(true);

      // Report error to parent component
      onError({
        message: errorMessage,
        code: error?.code
      });
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src, loadAttempts, onError]);

  const getVideoErrorMessage = (errorCode: number): string => {
    switch (errorCode) {
      case 1: // MEDIA_ERR_ABORTED
        return 'Video loading was aborted';
      case 2: // MEDIA_ERR_NETWORK
        return 'Network error occurred while loading video';
      case 3: // MEDIA_ERR_DECODE
        return 'Video format is not supported or corrupted';
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        return 'Video source is not supported';
      default:
        return 'Unknown video error occurred';
    }
  };

  const handleRetry = () => {
    if (loadAttempts < maxRetries) {
      setLoadAttempts(prev => prev + 1);
      setHasError(false);
      setIsLoading(true);
      
      const video = videoRef.current;
      if (video) {
        video.load(); // Reload the video
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('[EnhancedVideoPlayer] Play failed:', err);
        setHasError(true);
        onError({ message: 'Failed to play video: ' + err.message });
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch(err => {
        console.error('[EnhancedVideoPlayer] Fullscreen failed:', err);
      });
    }
  };

  if (hasError && loadAttempts >= maxRetries) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
          Video Load Failed
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 text-center px-4 mb-4">
          Unable to load the video after {maxRetries} attempts. The video file may be corrupted or the URL is invalid.
        </p>
        <div className="text-xs text-red-600 dark:text-red-400 opacity-75">
          Block: {blockId}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay with retry */}
      {hasError && loadAttempts < maxRetries && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
          <AlertCircle size={32} className="mb-2" />
          <p className="text-sm mb-3">Failed to load video</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 transition-colors text-sm"
          >
            <RefreshCw size={14} />
            Retry ({loadAttempts + 1}/{maxRetries})
          </button>
        </div>
      )}

      {/* Video controls overlay */}
      {showControls && !isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 bg-black/60 rounded-full px-4 py-2 backdrop-blur-sm">
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
            
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Video info display - preserved as required */}
      {(aspectRatio || duration) && (
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-base px-4 py-2 rounded-full backdrop-blur-md shadow-lg z-10">
          {aspectRatio && <span>{aspectRatio} </span>}
          {duration && <span>{duration}秒</span>}
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPlayer;