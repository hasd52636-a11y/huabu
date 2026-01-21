/**
 * ParameterPanelExample - 参数面板使用示例
 * 
 * 展示如何集成和使用智能参数面板系统
 */

import React, { useState, useCallback } from 'react';
import { 
  ModelParameterIntegration,
  ErrorBoundary,
  NotificationSystem,
  useNotifications
} from '../components';
import { 
  NewModelConfig, 
  GenerationParameters,
  IMAGE_MODELS,
  VIDEO_MODELS
} from '../types';

// 示例模型配置
const exampleModelConfig: NewModelConfig = {
  providers: {
    shenma: {
      apiKey: 'your-api-key',
      baseUrl: 'https://hk-api.gptbest.vip',
      enabled: true
    }
  },
  text: {
    provider: 'shenma',
    modelId: 'gemini-2.0-flash-exp'
  },
  image: {
    provider: 'shenma',
    modelId: 'nano-banana-hd'
  },
  video: {
    provider: 'shenma',
    modelId: 'sora_video2'
  },
  _meta: {
    version: '2.0',
    lastSaved: Date.now()
  }
};

const ParameterPanelExample: React.FC = () => {
  // 状态管理
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [selectedModelId, setSelectedModelId] = useState(IMAGE_MODELS.basic[0]);
  const [currentParameters, setCurrentParameters] = useState<GenerationParameters>({
    prompt: ''
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  // 通知系统
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  // 处理生成类型切换
  const handleGenerationTypeChange = useCallback((type: 'image' | 'video') => {
    setGenerationType(type);
    // 切换到对应类型的默认模型
    if (type === 'image') {
      setSelectedModelId(IMAGE_MODELS.basic[0]);
    } else {
      setSelectedModelId(VIDEO_MODELS.sora[0]);
    }
  }, []);

  // 处理模型选择
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    showSuccess({
      title: `模型已切换到 ${modelId}`,
      message: '参数面板将根据新模型调整可用参数'
    });
  }, [showSuccess]);

  // 处理参数变化
  const handleParametersChange = useCallback(async (parameters: GenerationParameters) => {
    setCurrentParameters(parameters);
    
    try {
      // 这里应该调用实际的生成API
      console.log('Generating with parameters:', parameters);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccess({
        title: '生成成功',
        message: `使用模型 ${selectedModelId} 生成完成`
      });
    } catch (error) {
      showError({
        title: '生成失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }, [selectedModelId, showSuccess, showError]);

  // 处理主题切换
  const handleThemeToggle = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // 处理语言切换
  const handleLanguageToggle = useCallback(() => {
    setLang(prev => prev === 'zh' ? 'en' : 'zh');
  }, []);

  return (
    <ErrorBoundary lang={lang}>
      <div className={`min-h-screen transition-colors ${
        theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto p-6">
          {/* 头部控制 */}
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              智能参数面板系统示例
            </h1>
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* 生成类型切换 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerationTypeChange('image')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    generationType === 'image'
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  图像生成
                </button>
                <button
                  onClick={() => handleGenerationTypeChange('video')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    generationType === 'video'
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  视频生成
                </button>
              </div>

              {/* 主题切换 */}
              <button
                onClick={handleThemeToggle}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {theme === 'light' ? '🌙 暗色' : '☀️ 亮色'}
              </button>

              {/* 语言切换 */}
              <button
                onClick={handleLanguageToggle}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              模型选择和参数配置
            </h2>
            
            {/* 模型参数集成组件 */}
            <ModelParameterIntegration
              generationType={generationType}
              modelConfig={exampleModelConfig}
              selectedModelId={selectedModelId}
              onModelSelect={handleModelSelect}
              onParametersChange={handleParametersChange}
              initialParameters={currentParameters}
              theme={theme}
              lang={lang}
              className="mb-6"
            />

            {/* 当前参数显示 */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                当前参数
              </h3>
              <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto">
                {JSON.stringify(currentParameters, null, 2)}
              </pre>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              使用说明
            </h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>1. 选择生成类型（图像或视频）</p>
              <p>2. 从模型选择器中选择合适的模型</p>
              <p>3. 点击"参数设置"按钮打开参数面板</p>
              <p>4. 在参数面板中配置生成参数</p>
              <p>5. 点击"开始生成"提交参数并开始生成</p>
              <p>6. 可以保存常用参数为预设，方便下次使用</p>
            </div>
          </div>
        </div>

        {/* 通知系统 */}
        <NotificationSystem
          notifications={notifications}
          onRemove={removeNotification}
          position="top-right"
          lang={lang}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ParameterPanelExample;