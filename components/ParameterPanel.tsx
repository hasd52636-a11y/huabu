/**
 * ParameterPanel - 智能参数面板组件
 * 
 * 功能：
 * - 统一的模态界面用于图像和视频生成参数配置
 * - 紫色主题 (violet-500)
 * - 标签式界面 (Image/Video)
 * - 模型感知的参数验证
 * - 实时验证反馈
 * - 参数预设管理
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings, Save, Upload, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  ParameterPanelProps,
  GenerationParameters,
  ParameterValidationResult,
  ParameterPreset,
  ModelParameter
} from '../types';
import { ModelConfigService } from '../services/ModelConfigService';
import { ParameterValidationService } from '../services/ParameterValidationService';
import { PresetStorageService } from '../services/PresetStorageService';
import TabManager from './TabManager';
import ParameterControls from './ParameterControls';
import PresetManager from './PresetManager';
import ErrorBoundary from './ErrorBoundary';
import NotificationSystem from './NotificationSystem';
import { useNotifications } from '../hooks/useNotifications';

const ParameterPanel: React.FC<ParameterPanelProps> = ({
  isOpen,
  onClose,
  selectedModel,
  generationType,
  onParametersChange,
  initialParameters,
  theme = 'light',
  lang = 'zh'
}) => {
  // Services
  const modelConfigService = ModelConfigService.getInstance();
  const validationService = ParameterValidationService.getInstance();
  const presetService = PresetStorageService.getInstance();

  // State
  const [activeTab, setActiveTab] = useState<'image' | 'video'>(generationType);
  const [parameters, setParameters] = useState<GenerationParameters>(
    initialParameters || { prompt: '' }
  );
  const [validationResults, setValidationResults] = useState<ParameterValidationResult[]>([]);
  const [availableParameters, setAvailableParameters] = useState<ModelParameter[]>([]);
  const [presets, setPresets] = useState<ParameterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 标签状态保持 - 为每个标签保存独立的参数状态
  const [tabParameters, setTabParameters] = useState<{
    image: GenerationParameters;
    video: GenerationParameters;
  }>({
    image: initialParameters || { prompt: '' },
    video: initialParameters || { prompt: '' }
  });

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 通知系统
  const { 
    notifications, 
    removeNotification, 
    showSuccess, 
    showError, 
    showWarning 
  } = useNotifications();

  // Translations
  const t = {
    zh: {
      title: '智能参数面板',
      imageTab: '图像生成',
      videoTab: '视频生成',
      prompt: '提示词',
      promptPlaceholder: '描述你想要生成的内容...',
      negativePrompt: '负面提示词',
      negativePromptPlaceholder: '描述你不想要的内容...',
      aspectRatio: '宽高比',
      imageSize: '图像尺寸',
      duration: '视频时长',
      guidanceScale: '引导强度',
      steps: '生成步数',
      seed: '随机种子',
      fps: '帧率',
      motionStrength: '运动强度',
      referenceImage: '参考图片',
      referenceVideo: '参考视频',
      presets: '预设',
      savePreset: '保存预设',
      loadPreset: '加载预设',
      generate: '开始生成',
      cancel: '取消',
      loading: '加载中...',
      validationErrors: '验证错误',
      validationWarnings: '验证警告',
      allValid: '所有参数有效'
    },
    en: {
      title: 'Intelligent Parameter Panel',
      imageTab: 'Image Generation',
      videoTab: 'Video Generation',
      prompt: 'Prompt',
      promptPlaceholder: 'Describe what you want to generate...',
      negativePrompt: 'Negative Prompt',
      negativePromptPlaceholder: 'Describe what you don\'t want...',
      aspectRatio: 'Aspect Ratio',
      imageSize: 'Image Size',
      duration: 'Duration',
      guidanceScale: 'Guidance Scale',
      steps: 'Steps',
      seed: 'Seed',
      fps: 'FPS',
      motionStrength: 'Motion Strength',
      referenceImage: 'Reference Image',
      referenceVideo: 'Reference Video',
      presets: 'Presets',
      savePreset: 'Save Preset',
      loadPreset: 'Load Preset',
      generate: 'Generate',
      cancel: 'Cancel',
      loading: 'Loading...',
      validationErrors: 'Validation Errors',
      validationWarnings: 'Validation Warnings',
      allValid: 'All Parameters Valid'
    }
  };

  // Load model parameters when model or tab changes
  useEffect(() => {
    if (selectedModel && isOpen) {
      loadModelParameters();
    }
  }, [selectedModel, activeTab, isOpen]);

  // Load presets when tab changes
  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [activeTab, isOpen]);

  // Validate parameters when they change
  useEffect(() => {
    if (selectedModel && Object.keys(parameters).length > 0) {
      validateParameters();
    }
  }, [parameters, selectedModel]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点元素
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // 延迟设置焦点，确保DOM已渲染
      const timer = setTimeout(() => {
        if (modalRef.current) {
          // 尝试聚焦到第一个可聚焦元素
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusable = focusableElements[0] as HTMLElement;
          
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            // 如果没有可聚焦元素，聚焦到模态框本身
            modalRef.current.focus();
          }
        }
      }, 100);
      
      // 防止页面滚动
      document.body.style.overflow = 'hidden';
      
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      // 恢复焦点到之前的元素
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      
      // 恢复页面滚动
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // 确保组件卸载时恢复页面滚动
      document.body.style.overflow = '';
    };
  }, []);

  const loadModelParameters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = modelConfigService.getModelParameters(selectedModel, activeTab);
      setAvailableParameters(params);
      
      // Set default values for new parameters
      const defaultParams = { ...parameters };
      params.forEach(param => {
        if (!(param.key in defaultParams)) {
          defaultParams[param.key as keyof GenerationParameters] = param.defaultValue;
        }
      });
      setParameters(defaultParams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载模型参数失败';
      setError(errorMessage);
      showError({
        title: lang === 'zh' ? '参数加载失败' : 'Parameter Loading Failed',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const loadedPresets = await presetService.loadPresets(activeTab, selectedModel);
      setPresets(loadedPresets);
    } catch (err) {
      console.error('Failed to load presets:', err);
      showWarning({
        title: lang === 'zh' ? '预设加载失败' : 'Preset Loading Failed',
        message: err instanceof Error ? err.message : '无法加载预设列表'
      });
    }
  };

  const validateParameters = async () => {
    try {
      const results = validationService.validateParameters(selectedModel, parameters);
      setValidationResults(results);
    } catch (err) {
      console.error('Validation failed:', err);
      showError({
        title: lang === 'zh' ? '参数验证失败' : 'Parameter Validation Failed',
        message: err instanceof Error ? err.message : '参数验证过程中出现错误'
      });
    }
  };

  const handleParameterChange = useCallback((key: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // 同时更新标签参数状态
    setTabParameters(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: value
      }
    }));
  }, [activeTab]);

  // 处理标签切换
  const handleTabChange = useCallback((newTab: 'image' | 'video') => {
    // 保存当前标签的参数
    setTabParameters(prev => ({
      ...prev,
      [activeTab]: parameters
    }));
    
    // 切换到新标签
    setActiveTab(newTab);
    
    // 恢复新标签的参数
    setParameters(tabParameters[newTab]);
  }, [activeTab, parameters, tabParameters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    // Tab键焦点陷阱
    if (e.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;
      
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey) {
        // Shift + Tab - 向前导航
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab - 向后导航
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  // 处理背景点击关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 处理模态框内容点击，阻止事件冒泡
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 检查是否可以生成
  const canGenerate = () => {
    // 检查必填参数
    const requiredParams = availableParameters.filter(param => param.required);
    const hasAllRequired = requiredParams.every(param => {
      const value = parameters[param.key as keyof GenerationParameters];
      return value !== undefined && value !== null && value !== '';
    });

    // 检查是否有验证错误
    const hasErrors = validationResults.some(result => result.errors.length > 0);

    // 检查是否正在生成
    return hasAllRequired && !hasErrors && !isGenerating && !isLoading;
  };

  // 处理生成按钮点击
  const handleGenerate = async () => {
    if (!canGenerate()) return;

    setIsGenerating(true);
    setError(null);
    
    try {
      await onParametersChange(parameters);
      showSuccess({
        title: lang === 'zh' ? '生成已开始' : 'Generation Started',
        message: lang === 'zh' ? '参数已提交，正在生成内容...' : 'Parameters submitted, generating content...'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      console.error('Generation failed:', error);
      setError(errorMessage);
      showError({
        title: lang === 'zh' ? '生成失败' : 'Generation Failed',
        message: errorMessage,
        action: {
          label: lang === 'zh' ? '重试' : 'Retry',
          onClick: handleGenerate
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理预设加载
  const handlePresetLoad = (preset: ParameterPreset) => {
    setParameters(preset.parameters);
    // 同时更新标签参数状态
    setTabParameters(prev => ({
      ...prev,
      [activeTab]: preset.parameters
    }));
  };

  // 处理预设保存
  const handlePresetSave = async (name: string, parameters: GenerationParameters) => {
    try {
      await presetService.savePreset(name, parameters, activeTab, selectedModel);
      await loadPresets(); // 重新加载预设列表
      
      showSuccess({
        title: lang === 'zh' ? '预设已保存' : 'Preset Saved',
        message: lang === 'zh' ? `预设 "${name}" 已成功保存` : `Preset "${name}" has been saved successfully`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存预设失败';
      console.error('Failed to save preset:', error);
      showError({
        title: lang === 'zh' ? '保存失败' : 'Save Failed',
        message: errorMessage
      });
    }
  };

  // 处理预设删除
  const handlePresetDelete = async (presetId: string) => {
    try {
      await presetService.deletePreset(presetId);
      await loadPresets(); // 重新加载预设列表
      
      showSuccess({
        title: lang === 'zh' ? '预设已删除' : 'Preset Deleted',
        message: lang === 'zh' ? '预设已成功删除' : 'Preset has been deleted successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除预设失败';
      console.error('Failed to delete preset:', error);
      showError({
        title: lang === 'zh' ? '删除失败' : 'Delete Failed',
        message: errorMessage
      });
    }
  };

  const getValidationStatus = () => {
    const errorCount = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
    const warningCount = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
    
    if (errorCount > 0) return { type: 'error', count: errorCount, icon: AlertCircle };
    if (warningCount > 0) return { type: 'warning', count: warningCount, icon: AlertTriangle };
    return { type: 'valid', count: 0, icon: CheckCircle };
  };

  if (!isOpen) return null;

  return (
    <ErrorBoundary lang={lang as 'zh' | 'en'}>
      <div 
        className="fixed inset-0 modal-backdrop-violet flex items-center justify-center z-[10000] p-4"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
      >
        <div 
          ref={modalRef}
          tabIndex={-1}
          className="bg-white dark:bg-slate-900 rounded-2xl modal-content-violet w-full max-w-7xl max-h-[95vh] overflow-y-auto focus:outline-none border-4 border-violet-500 shadow-2xl shadow-violet-500/20"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parameter-panel-title"
          onClick={handleModalClick}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-violet-500/20 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <h2 id="parameter-panel-title" className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {t[lang].title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-violet-100 dark:hover:bg-violet-800/30 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            aria-label={t[lang].cancel}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <TabManager
          activeTab={activeTab}
          onTabChange={handleTabChange}
          availableTabs={['image', 'video']}
          disabledTabs={generationType === 'image' ? ['video'] : ['image']}
          theme={theme}
          lang={lang}
        />

        {/* Content */}
        <div className="p-6 space-y-6" role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-slate-500">{t[lang].loading}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-1 gap-6">
              {/* Main Parameters */}
              <div className="xl:col-span-2 lg:col-span-1">
                <ParameterControls
                  generationType={activeTab}
                  modelId={selectedModel}
                  parameters={parameters}
                  availableParameters={availableParameters}
                  onParameterChange={handleParameterChange}
                  validationErrors={validationResults.flatMap(result => result.errors)}
                  theme={theme}
                  lang={lang}
                />
              </div>

              {/* Sidebar - Presets and Validation */}
              <div className="xl:col-span-1 lg:col-span-1 space-y-6">
                {/* Validation Status */}
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-3">验证状态</h3>
                  {(() => {
                    const status = getValidationStatus();
                    const StatusIcon = status.icon;
                    return (
                      <div className={`flex items-center gap-2 ${
                        status.type === 'error' ? 'text-red-600' :
                        status.type === 'warning' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        <StatusIcon size={16} />
                        <span className="text-sm">
                          {status.type === 'error' ? `${status.count} 个错误` :
                           status.type === 'warning' ? `${status.count} 个警告` :
                           t[lang].allValid}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Presets */}
                <PresetManager
                  generationType={activeTab}
                  currentParameters={parameters}
                  presets={presets}
                  onPresetLoad={handlePresetLoad}
                  onPresetSave={handlePresetSave}
                  onPresetDelete={handlePresetDelete}
                  theme={theme}
                  lang={lang}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t-2 border-violet-500/20 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-2">
            {/* Validation status */}
            {(() => {
              const status = getValidationStatus();
              const StatusIcon = status.icon;
              
              if (status.type === 'error') {
                return (
                  <div className="flex items-center gap-2 text-red-600">
                    <StatusIcon size={16} />
                    <span className="text-sm">{status.count} 个错误</span>
                  </div>
                );
              } else if (status.type === 'warning') {
                return (
                  <div className="flex items-center gap-2 text-amber-600">
                    <StatusIcon size={16} />
                    <span className="text-sm">{status.count} 个警告</span>
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center gap-2 text-green-600">
                    <StatusIcon size={16} />
                    <span className="text-sm">{t[lang].allValid}</span>
                  </div>
                );
              }
            })()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-800/30 transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-violet-300/30 hover:-translate-y-0.5"
            >
              {t[lang].cancel}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate()}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 border-2 transition-all duration-300 transform ${
                canGenerate()
                  ? 'btn-violet-primary border-violet-500 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5'
                  : 'btn-violet-primary opacity-50 cursor-not-allowed border-violet-300'
              }`}
            >
              {isGenerating && (
                <div className="loading-spinner-violet rounded-full h-4 w-4 border-2"></div>
              )}
              {isGenerating ? (lang === 'zh' ? '生成中...' : 'Generating...') : t[lang as 'zh' | 'en'].generate}
            </button>
          </div>
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
    </ErrorBoundary>
  );
};

export default ParameterPanel;