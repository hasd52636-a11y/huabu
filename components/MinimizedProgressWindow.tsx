import React from 'react';

interface MinimizedProgressWindowProps {
  isVisible?: boolean;
  current?: number;
  total?: number;
  status?: string;
  progress?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  isProcessing?: boolean;
  onClick: () => void;
  theme: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const MinimizedProgressWindow: React.FC<MinimizedProgressWindowProps> = ({
  isVisible = true,
  current = 0,
  total = 0,
  status = 'idle',
  progress,
  isProcessing,
  onClick,
  theme,
  lang = 'zh'
}) => {
  if (!isVisible) return null;

  // Use either the new progress prop or the legacy current/total props
  const completedCount = progress ? progress.completed : current;
  const totalCount = progress ? progress.total : total;
  const isCurrentlyProcessing = progress ? isProcessing : (status === 'processing');

  const completionPercentage = totalCount > 0 
    ? Math.round((completedCount / totalCount) * 100) 
    : 0;

  const progressText = lang === 'zh' 
    ? `${completedCount}/${totalCount}`
    : `${completedCount}/${totalCount}`;

  const statusText = lang === 'zh' 
    ? (isCurrentlyProcessing ? '生成中...' : '已完成')
    : (isCurrentlyProcessing ? 'Processing...' : 'Completed');

  return (
    <div
      className={`
        fixed top-5 right-5 z-50 cursor-pointer
        w-32 h-20 rounded-lg shadow-lg border
        flex flex-col items-center justify-center
        transition-all duration-300 hover:scale-105
        ${theme === 'dark' 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-900'
        }
        ${isCurrentlyProcessing 
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
          ${isCurrentlyProcessing 
            ? (theme === 'dark' ? 'bg-green-400' : 'bg-green-500')
            : (theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400')
          }
          ${isCurrentlyProcessing ? 'animate-pulse' : ''}
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

      {/* Progress bar - Fixed width to prevent overflow */}
      <div className={`
        w-28 h-1 rounded-full mt-1
        ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}
      `}>
        <div
          className={`
            h-full rounded-full transition-all duration-300
            ${isCurrentlyProcessing 
              ? (theme === 'dark' ? 'bg-green-400' : 'bg-green-500')
              : (theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400')
            }
          `}
          style={{ 
            width: `${Math.min(completionPercentage, 100)}%`,
            maxWidth: '100%'
          }}
        />
      </div>
    </div>
  );
};

export default MinimizedProgressWindow;