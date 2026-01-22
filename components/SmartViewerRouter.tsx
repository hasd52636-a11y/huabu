import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Shield, Zap, Globe } from 'lucide-react';
import ShareKitViewerPage from './ShareKitViewerPage';
import RealtimeViewerPage from './RealtimeViewerPage';
import IsolatedViewerPage from './IsolatedViewerPage';
import MinimalViewerPage from './MinimalViewerPage';

interface SmartViewerRouterProps {
  shareId: string;
}

type ViewerMode = 'auto' | 'sharekit' | 'realtime' | 'isolated' | 'minimal';

interface ViewerOption {
  mode: ViewerMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  stability: 'high' | 'medium' | 'low';
  features: string[];
}

/**
 * 智能查看器路由组件
 * 根据分享ID和用户选择，自动选择最合适的查看器
 */
const SmartViewerRouter: React.FC<SmartViewerRouterProps> = ({ shareId }) => {
  const [selectedMode, setSelectedMode] = useState<ViewerMode>('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [autoSelectedMode, setAutoSelectedMode] = useState<ViewerMode>('sharekit');
  const [showModeSelector, setShowModeSelector] = useState(false);

  // 问题分享ID列表
  const problematicShareIds = [
    'share-1769056688844-v3iise'
  ];

  // 查看器选项配置
  const viewerOptions: ViewerOption[] = [
    {
      mode: 'sharekit',
      name: 'ShareKit 观看器',
      description: '新版分享系统，P2P实时同步，只读模式',
      icon: <Zap className="w-5 h-5" />,
      stability: 'high',
      features: ['P2P连接', '实时同步', '只读模式', '高性能']
    },
    {
      mode: 'realtime',
      name: '实时查看器',
      description: '完整功能，实时同步，保持原有样式',
      icon: <Zap className="w-5 h-5" />,
      stability: 'medium',
      features: ['实时同步', '完整样式', '连接监控', '自动重连']
    },
    {
      mode: 'isolated',
      name: '隔离查看器',
      description: '独立运行，避免复杂逻辑，保持原有样式',
      icon: <Shield className="w-5 h-5" />,
      stability: 'high',
      features: ['高稳定性', '原有样式', '简化逻辑', '直接读取']
    },
    {
      mode: 'minimal',
      name: '简化查看器',
      description: '最小化实现，最高稳定性',
      icon: <Globe className="w-5 h-5" />,
      stability: 'high',
      features: ['极简设计', '最高稳定性', '快速加载', '兼容性好']
    }
  ];

  // 自动选择查看器模式
  useEffect(() => {
    const selectViewerMode = async () => {
      setIsLoading(true);
      
      try {
        // 检查是否为问题分享ID
        if (problematicShareIds.includes(shareId)) {
          console.log('[SmartViewerRouter] Problematic share ID detected, using isolated viewer');
          setAutoSelectedMode('isolated');
          setSelectedMode('isolated');
          return;
        }

        // 默认使用新的 ShareKit 观看器
        console.log('[SmartViewerRouter] Using ShareKit viewer');
        setAutoSelectedMode('sharekit');
        setSelectedMode('sharekit');

      } catch (error) {
        console.error('[SmartViewerRouter] Error in mode selection:', error);
        setAutoSelectedMode('minimal');
        setSelectedMode('minimal');
      } finally {
        setIsLoading(false);
      }
    };

    selectViewerMode();
  }, [shareId]);

  // 渲染查看器模式选择器
  const renderModeSelector = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">选择查看器模式</h1>
          <p className="text-gray-600 mb-4">
            为了确保最佳的查看体验，请选择合适的查看器模式
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>自动推荐:</strong> {viewerOptions.find(opt => opt.mode === autoSelectedMode)?.name}
            （基于分享ID和数据分析）
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {viewerOptions.map((option) => (
            <div
              key={option.mode}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedMode === option.mode
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${option.mode === autoSelectedMode ? 'ring-2 ring-amber-200' : ''}`}
              onClick={() => setSelectedMode(option.mode)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  option.stability === 'high' ? 'bg-green-100 text-green-600' :
                  option.stability === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {option.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{option.name}</h3>
                  {option.mode === autoSelectedMode && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      推荐
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{option.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">稳定性:</span>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    option.stability === 'high' ? 'bg-green-100 text-green-700' :
                    option.stability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {option.stability === 'high' ? '高' : option.stability === 'medium' ? '中' : '低'}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div className="font-medium mb-1">特性:</div>
                  <ul className="space-y-1">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowModeSelector(false)}
            className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            使用 {viewerOptions.find(opt => opt.mode === selectedMode)?.name}
          </button>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>会话ID: {shareId}</p>
            <p>你可以随时通过页面顶部的按钮切换查看器模式</p>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">正在分析分享内容</h2>
          <p className="text-gray-600">选择最适合的查看器模式...</p>
        </div>
      </div>
    );
  }

  // 显示模式选择器
  if (showModeSelector) {
    return renderModeSelector();
  }

  // 渲染选定的查看器
  const renderViewer = () => {
    switch (selectedMode) {
      case 'sharekit':
        return <ShareKitViewerPage shareId={shareId} />;
      case 'isolated':
        return <IsolatedViewerPage shareId={shareId} />;
      case 'minimal':
        return <MinimalViewerPage shareId={shareId} />;
      case 'realtime':
      default:
        return <RealtimeViewerPage shareId={shareId} />;
    }
  };

  return (
    <div className="relative">
      {/* 模式切换按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowModeSelector(true)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
          title="切换查看器模式"
        >
          <Shield className="w-4 h-4" />
          {viewerOptions.find(opt => opt.mode === selectedMode)?.name}
        </button>
      </div>

      {/* 当前查看器 */}
      {renderViewer()}
    </div>
  );
};

export default SmartViewerRouter;