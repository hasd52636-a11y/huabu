import React from 'react';

interface MinimizedProgressWindowProps {
  isVisible: boolean;
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  isProcessing: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const MinimizedProgressWindow: React.FC<MinimizedProgressWindowProps> = ({
  isVisible,
  progress,
  isProcessing,
  onClick,
  theme,
  lang
}) => {
  if (!isVisible) return null;

  const completionPercentage = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  const progressText = lang === 'zh' 
    ? `${progress.completed}/${progress.total}`
    : `${progress.completed}/${progress.total}`;

  const statusText = lang === 'zh' 
    ? (isProcessing ? '生成中...' : '已完成')
    : (isProcessing ? 'Processing...' : 'Completed');

  return (
    <div
      className={`
        fixed top-5 right-5 z-50 cursor-pointer
        w-30 h-20 rounded-lg shadow-lg border
        flex flex-col items-center justify-center
        transition-all duration-300 hover:scale-105
        ${theme === 'dark' 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-900'
        }
        ${isProcessing 
          ? (theme === 'dark' 
              ? 'ring-2 ring-green-400 animate-pulse' 
              : 'ring-2 ring-green-500 animate-pulse'
            )
          : (theme === 'dark' 
              ? 'ring-1 ring-gray-600' 
              : 'ring-1 ring-gray-300'
            )
        }
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={lang === 'zh' ? '点击展开批量视频生成进度' : 'Click to expand batch video progress'}
    >
      {/* Progress indicator */}
      <div className="flex items-center space-x-2 mb-1">
        <div className={`
          w-2 h-2 rounded-full
          ${isProcessing 
            ? (theme === 'dark' ? 'bg-green-400' : 'bg-green-500')
            : (theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400')
          }
          ${isProcessing ? 'animate-pulse' : ''}
        `} />
        <span className="text-sm font-medium">
          {progressText}
        </span>
      </div>

      {/* Completion percentage */}
      <div className="text-xs opacity-75 mb-1">
        {completionPercentage}%
      </div>

      {/* Status text */}
      <div className="text-xs opacity-60">
        {statusText}
      </div>

      {/* Progress bar */}
      <div className={`
        w-full h-1 rounded-full mt-1
        ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}
      `}>
        <div
          className={`
            h-full rounded-full transition-all duration-300
            ${isProcessing 
              ? (theme === 'dark' ? 'bg-green-400' : 'bg-green-500')
              : (theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400')
            }
          `}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default MinimizedProgressWindow;