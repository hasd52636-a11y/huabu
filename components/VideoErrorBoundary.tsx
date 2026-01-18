import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface VideoErrorBoundaryProps {
  children: React.ReactNode;
  blockId: string;
}

/**
 * Error boundary wrapper for video modules to prevent white screen issues
 * Implements Requirement 1.2: Maintain proper rendering without white screen errors
 */
const VideoErrorBoundary: React.FC<VideoErrorBoundaryProps> = ({ children, blockId }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset error state when children change
  useEffect(() => {
    setHasError(false);
    setError(null);
  }, [children]);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[VideoErrorBoundary] Caught error in video module:', event.error);
      setHasError(true);
      setError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[VideoErrorBoundary] Caught unhandled promise rejection:', event.reason);
      setHasError(true);
      setError(new Error(event.reason?.message || 'Unhandled promise rejection'));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    // Fallback UI when video component crashes
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
        <div className="text-orange-600 dark:text-orange-400 text-center px-6 py-8">
          <AlertTriangle size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Video Component Error</h3>
          <p className="text-sm mb-4 text-orange-700 dark:text-orange-300">
            The video module encountered an unexpected error and has been safely contained.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          {error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                Show Error Details
              </summary>
              <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded border text-xs font-mono text-slate-600 dark:text-slate-300 overflow-auto max-h-32">
                <div className="font-bold text-red-600 dark:text-red-400 mb-1">
                  {error.name}: {error.message}
                </div>
                {error.stack && (
                  <pre className="whitespace-pre-wrap text-xs">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
          <div className="mt-4 text-xs opacity-60">
            Block ID: {blockId}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default VideoErrorBoundary;