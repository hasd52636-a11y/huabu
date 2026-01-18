import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink, Copy, Info } from 'lucide-react';

interface VideoErrorFallbackProps {
  errorType: 'invalid_url' | 'json_error' | 'network_error' | 'format_error';
  errorMessage: string;
  content: string;
  blockId: string;
  onRetry: () => void;
}

/**
 * Enhanced error fallback component for video generation failures
 * Implements Requirement 1.3: Display appropriate error messages and provide fallback options
 */
const VideoErrorFallback: React.FC<VideoErrorFallbackProps> = ({
  errorType,
  errorMessage,
  content,
  blockId,
  onRetry
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const getErrorConfig = () => {
    switch (errorType) {
      case 'json_error':
        return {
          title: 'Video Generation Failed',
          description: 'The video generation service returned an error response.',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-600 dark:text-red-400',
          icon: AlertCircle,
          showRetry: true,
          showDetails: true
        };
      case 'format_error':
        return {
          title: 'Invalid Video Format',
          description: 'The generated content is not in a valid video format.',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          textColor: 'text-amber-600 dark:text-amber-400',
          icon: AlertCircle,
          showRetry: true,
          showDetails: true
        };
      case 'network_error':
        return {
          title: 'Network Error',
          description: 'Unable to load the video due to network issues.',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: AlertCircle,
          showRetry: true,
          showDetails: false
        };
      default:
        return {
          title: 'Video Load Error',
          description: 'The video content could not be loaded or displayed.',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
          icon: AlertCircle,
          showRetry: true,
          showDetails: true
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const handleOpenInNewTab = () => {
    if (content.startsWith('http')) {
      window.open(content, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center ${config.bgColor} border-2 ${config.borderColor} rounded-lg`}>
      <div className={`${config.textColor} text-center px-6 py-8 max-w-md`}>
        <IconComponent size={48} className="mx-auto mb-4" />
        
        <h3 className="text-lg font-bold mb-2">{config.title}</h3>
        
        <p className="text-sm mb-4 opacity-90">
          {config.description}
        </p>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg border">
            <p className="text-xs font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          {config.showRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Retry Generation
            </button>
          )}

          {content.startsWith('http') && (
            <button
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <ExternalLink size={16} />
              Open Link
            </button>
          )}

          {config.showDetails && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                showDetails 
                  ? 'bg-gray-500 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Info size={16} />
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          )}
        </div>

        {showDetails && (
          <div className="mt-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-75">Error Details:</span>
              <button
                onClick={handleCopyError}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/50 dark:bg-black/20 rounded hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-left overflow-auto max-h-40 border">
              <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-all">
                {content}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs opacity-60">
          Block ID: {blockId}
        </div>
      </div>
    </div>
  );
};

export default VideoErrorFallback;