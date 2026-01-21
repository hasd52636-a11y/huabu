/**
 * ErrorBoundary - 错误边界组件
 * 
 * 功能：
 * - 捕获参数面板中的JavaScript错误
 * - 显示友好的错误信息
 * - 提供错误恢复选项
 * - 错误日志记录
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  lang?: 'zh' | 'en';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误到控制台
    console.error('Parameter Panel Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { lang = 'zh' } = this.props;
    
    const t = {
      zh: {
        title: '参数面板出现错误',
        description: '抱歉，参数面板遇到了一个意外错误。您可以尝试刷新或返回主页。',
        retry: '重试',
        home: '返回主页',
        errorDetails: '错误详情',
        showDetails: '显示详情',
        hideDetails: '隐藏详情'
      },
      en: {
        title: 'Parameter Panel Error',
        description: 'Sorry, the parameter panel encountered an unexpected error. You can try refreshing or return to the home page.',
        retry: 'Retry',
        home: 'Go Home',
        errorDetails: 'Error Details',
        showDetails: 'Show Details',
        hideDetails: 'Hide Details'
      }
    };

    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t[lang].title}
                </h2>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t[lang].description}
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
              >
                <RefreshCw size={16} />
                {t[lang].retry}
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Home size={16} />
                {t[lang].home}
              </button>
            </div>

            {/* 错误详情（开发模式） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  {t[lang].errorDetails}
                </summary>
                <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono text-slate-800 dark:text-slate-200 overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;