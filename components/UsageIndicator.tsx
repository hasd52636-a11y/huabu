import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { LimitValidator } from '../services/LimitValidator';

interface UsageData {
  apiCalls: { used: number; limit: number; percentage: number };
  imageGeneration: { used: number; limit: number; percentage: number };
  videoGeneration: { used: number; limit: number; percentage: number };
  batchGeneration: { used: number; limit: number; percentage: number };
  lastReset?: Date;
  nextReset?: Date;
}

interface UsageIndicatorProps {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  compact?: boolean;
  showDetails?: boolean;
  refreshInterval?: number; // 自动刷新间隔（毫秒）
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  theme,
  lang,
  compact = false,
  showDetails = false,
  refreshInterval = 60000 // 默认1分钟刷新一次
}) => {
  const [usageData, setUsageData] = useState<UsageData>({
    apiCalls: { used: 0, limit: 1000, percentage: 0 },
    imageGeneration: { used: 0, limit: 500, percentage: 0 },
    videoGeneration: { used: 0, limit: 50, percentage: 0 },
    batchGeneration: { used: 0, limit: 50, percentage: 0 }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const limitValidator = new LimitValidator();

  const t = {
    zh: {
      title: '使用情况',
      apiCalls: 'API调用',
      imageGeneration: '图像生成',
      videoGeneration: '视频生成',
      batchGeneration: '批量生成',
      used: '已使用',
      limit: '限制',
      remaining: '剩余',
      resetTime: '重置时间',
      nextReset: '下次重置',
      today: '今天',
      warning: '警告',
      nearLimit: '接近使用限制',
      exceeded: '已超出限制',
      refreshed: '数据已刷新',
      refresh: '刷新'
    },
    en: {
      title: 'Usage',
      apiCalls: 'API Calls',
      imageGeneration: 'Image Generation',
      videoGeneration: 'Video Generation',
      batchGeneration: 'Batch Generation',
      used: 'Used',
      limit: 'Limit',
      remaining: 'Remaining',
      resetTime: 'Reset Time',
      nextReset: 'Next Reset',
      today: 'Today',
      warning: 'Warning',
      nearLimit: 'Near usage limit',
      exceeded: 'Limit exceeded',
      refreshed: 'Data refreshed',
      refresh: 'Refresh'
    }
  };

  // 获取使用数据
  const fetchUsageData = () => {
    setIsRefreshing(true);
    try {
      // 从LimitValidator获取实际使用数据
      const apiCalls = limitValidator.getUsage('apiCalls');
      const imageGen = limitValidator.getUsage('imageGeneration');
      const videoGen = limitValidator.getUsage('videoGeneration');
      const batchGen = limitValidator.getUsage('batchGeneration');

      const apiCallsLimit = 1000;
      const imageLimit = 500;
      const videoLimit = 50;
      const batchLimit = 50;

      setUsageData({
        apiCalls: {
          used: apiCalls || 0,
          limit: apiCallsLimit,
          percentage: Math.min((apiCalls / apiCallsLimit) * 100, 100)
        },
        imageGeneration: {
          used: imageGen || 0,
          limit: imageLimit,
          percentage: Math.min((imageGen / imageLimit) * 100, 100)
        },
        videoGeneration: {
          used: videoGen || 0,
          limit: videoLimit,
          percentage: Math.min((videoGen / videoLimit) * 100, 100)
        },
        batchGeneration: {
          used: batchGen || 0,
          limit: batchLimit,
          percentage: Math.min((batchGen / batchLimit) * 100, 100)
        },
        lastReset: new Date(),
        nextReset: new Date(Date.now() + 24 * 60 * 60 * 1000) // 假设24小时重置
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    fetchUsageData();
    const interval = setInterval(fetchUsageData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 获取进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 获取状态文本
  const getStatusText = (used: number, limit: number) => {
    if (used >= limit) {
      return t[lang].exceeded;
    } else if (used >= limit * 0.8) {
      return t[lang].nearLimit;
    }
    return '';
  };

  // 渲染进度条
  const renderProgressBar = (title: string, data: { used: number; limit: number; percentage: number }) => {
    const statusText = getStatusText(data.used, data.limit);
    const hasWarning = statusText !== '';

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            {title}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {data.used}/{data.limit}
            </span>
            {hasWarning && (
              <AlertTriangle
                size={14}
                className="text-orange-500"
                aria-label={t[lang].warning}
              />
            )}
          </div>
        </div>
        <div className="relative">
          <div
            className={`h-2 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}`}
          ></div>
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(data.percentage)}`}
            style={{ width: `${data.percentage}%` }}
          ></div>
        </div>
        {hasWarning && (
          <div className="text-xs text-orange-500 mt-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            {statusText}
          </div>
        )}
      </div>
    );
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-gray-700 text-gray-200'}`}>
        <BarChart3 size={16} className="text-blue-500" />
        <span>{usageData.apiCalls.used}/{usageData.apiCalls.limit} {t[lang].apiCalls}</span>
        <span className="text-gray-500">•</span>
        <span>{usageData.imageGeneration.used}/{usageData.imageGeneration.limit} {t[lang].imageGeneration}</span>
      </div>
    );
  }

  // 完整模式
  return (
    <div
      className={`rounded-lg border p-4 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-800 border-gray-700 shadow-sm'}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-500" />
          <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
            {t[lang].title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsageData}
            disabled={isRefreshing}
            className={`p-1.5 rounded-full text-xs ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
            aria-label={t[lang].refresh}
          >
            <Clock size={14} className={`transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {renderProgressBar(t[lang].apiCalls, usageData.apiCalls)}
        {renderProgressBar(t[lang].imageGeneration, usageData.imageGeneration)}
        {renderProgressBar(t[lang].videoGeneration, usageData.videoGeneration)}
        {showDetails && renderProgressBar(t[lang].batchGeneration, usageData.batchGeneration)}
      </div>

      {/* Reset Information */}
      <div className={`mt-4 pt-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
        <div className="flex justify-between items-center text-xs">
          <span className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            <Clock size={12} className="inline-block mr-1 align-middle" />
            {t[lang].nextReset}
          </span>
          <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} font-medium`}>
            {t[lang].today}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UsageIndicator;