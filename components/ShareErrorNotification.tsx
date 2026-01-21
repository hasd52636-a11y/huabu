import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { ShareError, RecoveryAction } from '../services/ShareErrorHandler';

interface ShareErrorNotificationProps {
  error: ShareError | null;
  recoveryActions: RecoveryAction[];
  onDismiss: () => void;
  onRetry?: () => void;
  onShowDiagnostic?: () => void;
}

const ShareErrorNotification: React.FC<ShareErrorNotificationProps> = ({
  error,
  recoveryActions,
  onDismiss,
  onRetry,
  onShowDiagnostic
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // 等待动画完成
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600';
      case 'high':
        return 'bg-orange-500 border-orange-600';
      case 'medium':
        return 'bg-yellow-500 border-yellow-600';
      case 'low':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'network':
        return '🌐';
      case 'service':
        return '🔧';
      case 'client':
        return '💻';
      case 'data':
        return '📄';
      default:
        return '⚠️';
    }
  };

  if (!error || !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-md w-full">
        {/* 头部 */}
        <div className={`flex items-center justify-between p-4 rounded-t-lg border-l-4 ${getSeverityColor(error.severity)}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTypeIcon(error.type)}</span>
            <div>
              <h3 className="font-medium text-gray-900">
                {error.type === 'network' ? '网络问题' :
                 error.type === 'service' ? '服务问题' :
                 error.type === 'client' ? '客户端问题' :
                 error.type === 'data' ? '数据问题' : '未知问题'}
              </h3>
              <p className="text-xs text-gray-500">
                错误代码: {error.code}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 错误信息 */}
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-700 mb-2">
            {error.userMessage}
          </p>
          
          {/* 技术详情（可折叠） */}
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              技术详情
            </summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 max-h-20 overflow-y-auto">
              {error.message}
            </div>
          </details>
        </div>

        {/* 恢复建议 */}
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">建议的解决方案:</h4>
          
          <div className="space-y-2">
            {recoveryActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 flex-1">
                  {action.description}
                </span>
                
                {action.type === 'retry' && onRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    {isRetrying ? '重试中...' : '重试'}
                  </button>
                )}
                
                {action.type === 'manual' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                    手动操作
                  </span>
                )}
                
                {action.type === 'fallback' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
                    自动切换
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {onShowDiagnostic && (
                <button
                  onClick={onShowDiagnostic}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <Settings className="w-3 h-3" />
                  系统诊断
                </button>
              )}
              
              <a
                href="https://github.com/your-repo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-3 h-3" />
                报告问题
              </a>
            </div>
            
            <span className="text-xs text-gray-400">
              {new Date(error.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareErrorNotification;