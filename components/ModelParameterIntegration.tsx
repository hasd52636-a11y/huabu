/**
 * ModelParameterIntegration - 模型参数集成组件
 * 
 * 功能：
 * - 连接 ModelSelector 和 ParameterPanel
 * - 处理模型选择变化时的参数更新
 * - 管理参数面板的开启/关闭状态
 * - 提供统一的接口给上层组件
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import ModelSelector from './ModelSelector';
import ParameterPanel from './ParameterPanel';
import { 
  NewModelConfig, 
  GenerationParameters,
  IMAGE_MODELS,
  VIDEO_MODELS
} from '../types';

interface ModelParameterIntegrationProps {
  generationType: 'image' | 'video';
  modelConfig: NewModelConfig;
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  onParametersChange: (parameters: GenerationParameters) => void;
  initialParameters?: GenerationParameters;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
  className?: string;
  disabled?: boolean;
}

const ModelParameterIntegration: React.FC<ModelParameterIntegrationProps> = ({
  generationType,
  modelConfig,
  selectedModelId,
  onModelSelect,
  onParametersChange,
  initialParameters,
  theme = 'light',
  lang = 'zh',
  className = '',
  disabled = false
}) => {
  const [isParameterPanelOpen, setIsParameterPanelOpen] = useState(false);
  const [currentParameters, setCurrentParameters] = useState<GenerationParameters>(
    initialParameters || { prompt: '' }
  );

  // 翻译
  const t = {
    zh: {
      openParameterPanel: '打开参数面板',
      parameterSettings: '参数设置'
    },
    en: {
      openParameterPanel: 'Open Parameter Panel',
      parameterSettings: 'Parameter Settings'
    }
  };

  // 检查当前模型是否支持参数面板
  const isModelSupported = useCallback(() => {
    if (generationType === 'image') {
      return [...IMAGE_MODELS.basic, ...IMAGE_MODELS.advanced, ...IMAGE_MODELS.editing]
        .includes(selectedModelId as any);
    } else if (generationType === 'video') {
      return [...VIDEO_MODELS.sora, ...VIDEO_MODELS.veo, ...VIDEO_MODELS.wanx, ...VIDEO_MODELS.special]
        .includes(selectedModelId as any);
    }
    return false;
  }, [generationType, selectedModelId]);

  // 处理模型选择变化
  const handleModelSelect = useCallback((modelId: string) => {
    onModelSelect(modelId);
    
    // 如果切换到不支持的模型，关闭参数面板
    if (!isModelSupported()) {
      setIsParameterPanelOpen(false);
    }
  }, [onModelSelect, isModelSupported]);

  // 处理参数变化
  const handleParametersChange = useCallback((parameters: GenerationParameters) => {
    setCurrentParameters(parameters);
    onParametersChange(parameters);
    setIsParameterPanelOpen(false); // 生成后关闭面板
  }, [onParametersChange]);

  // 处理参数面板开启
  const handleOpenParameterPanel = useCallback(() => {
    if (isModelSupported() && !disabled) {
      setIsParameterPanelOpen(true);
    }
  }, [isModelSupported, disabled]);

  // 当初始参数变化时更新当前参数
  useEffect(() => {
    if (initialParameters) {
      setCurrentParameters(initialParameters);
    }
  }, [initialParameters]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 模型选择器 */}
      <ModelSelector
        generationType={generationType}
        modelConfig={modelConfig}
        selectedModelId={selectedModelId}
        onModelSelect={handleModelSelect}
        theme={theme}
        lang={lang}
        disabled={disabled}
        groupByPlatform={true}
      />

      {/* 参数设置按钮 */}
      {isModelSupported() && (
        <button
          onClick={handleOpenParameterPanel}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            disabled
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm hover:shadow-md'
          }`}
          title={t[lang].openParameterPanel}
          aria-label={t[lang].parameterSettings}
        >
          <Settings size={16} />
          <span className="hidden sm:inline text-sm">
            {t[lang].parameterSettings}
          </span>
        </button>
      )}

      {/* 参数面板 */}
      <ParameterPanel
        isOpen={isParameterPanelOpen}
        onClose={() => setIsParameterPanelOpen(false)}
        selectedModel={selectedModelId}
        generationType={generationType}
        onParametersChange={handleParametersChange}
        initialParameters={currentParameters}
        theme={theme}
        lang={lang}
      />
    </div>
  );
};

export default ModelParameterIntegration;