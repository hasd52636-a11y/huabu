/**
 * 模型选择器组件
 * Model Selector Component for Multi-Model Text Chat
 * 
 * 功能：
 * - 显示可用文本模型列表
 * - 支持模型分组显示（快速轻量型、深度分析型等）
 * - 显示模型能力图标（⭐推荐、🌐联网、🎭全模态）
 * - 支持向上展开的下拉菜单
 * - 支持主题和多语言
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Zap, Brain, Globe, Sparkles, FileText, Target, Image, Video } from 'lucide-react';
import { ModelConfigManager } from '../services/ModelConfigManager';
import { ModelInfo, ModelType, NewModelConfig, getAllImageModels, getAllVideoModels, MODEL_PLATFORM_INFO, getModelPlatform, groupModelsByPlatform, ProviderType } from '../types';
import { ModelErrorHandler } from '../services/ModelErrorHandler';
import { modelConfigurationIntegration } from '../services/ModelConfigurationIntegration';
import { useModelConfiguration } from '../hooks/useModelConfiguration';

interface ModelSelectorProps {
  generationType?: 'text' | 'image' | 'video';
  modelConfig: NewModelConfig;
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
  className?: string;
  disabled?: boolean;
  lockReason?: string;
  groupByPlatform?: boolean; // 新增：是否按平台分组
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  generationType = 'text',
  modelConfig,
  selectedModelId,
  onModelSelect,
  theme = 'dark',
  lang = 'zh',
  className = '',
  disabled = false,
  lockReason,
  groupByPlatform = true // 默认启用平台分组
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manager] = useState(() => new ModelConfigManager(modelConfig));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Use model configuration hook
  const { isInitialized, validateModel } = useModelConfiguration();
  
  // 缓存模型列表以提高性能
  const [cachedModels, setCachedModels] = useState<Record<string, ModelInfo[]>>({});
  const [lastCacheTime, setLastCacheTime] = useState<Record<string, number>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 更新管理器配置
  useEffect(() => {
    manager.updateConfig(modelConfig);
  }, [modelConfig, manager]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 根据生成类型获取可用模型（带缓存）
  const getAvailableModels = () => {
    const cacheKey = `${generationType}-${modelConfig._meta?.version || '1.0'}`;
    const now = Date.now();
    
    // 检查缓存是否有效
    if (cachedModels[cacheKey] && 
        lastCacheTime[cacheKey] && 
        (now - lastCacheTime[cacheKey]) < CACHE_DURATION) {
      return cachedModels[cacheKey];
    }
    
    try {
      let models: ModelInfo[];
      
      // Use new model configuration integration for better model management
      const availableModels = isInitialized ? 
        modelConfigurationIntegration.getAvailableModels(generationType as 'text' | 'image' | 'video') : 
        [];
      
      if (availableModels.length > 0) {
        // Convert from new format to existing ModelInfo format
        models = availableModels.map(modelResult => {
          const registration = modelResult.registration!;
          const platform = registration.provider;
          const platformInfo = MODEL_PLATFORM_INFO[platform as keyof typeof MODEL_PLATFORM_INFO];
          
          return {
            id: registration.modelId,
            name: registration.metadata.displayName || formatModelName(registration.modelId),
            displayName: registration.metadata.displayName || formatModelName(registration.modelId),
            provider: platform as ProviderType,
            type: 'standard' as ModelType,
            capabilities: {
              isRecommended: registration.priority >= 90,
              supportsImages: generationType === 'image' || registration.metadata.capabilities?.includes('multimodal'),
              supportsVideo: generationType === 'video',
              supportsInternet: registration.metadata.capabilities?.includes('internet'),
              supportsThinking: registration.metadata.capabilities?.includes('thinking'),
              supportsCodeExecution: registration.metadata.capabilities?.includes('code'),
              isExperimental: registration.metadata.capabilities?.includes('experimental')
            },
            description: registration.metadata.description || getModelDescription(registration.modelId, generationType as 'image' | 'video'),
            isAvailable: modelResult.isAvailable,
            lastUpdated: registration.lastUpdated || Date.now(),
            platformInfo: platformInfo ? {
              name: lang === 'zh' ? platformInfo.name : platformInfo.nameEn,
              icon: platformInfo.icon,
              color: platformInfo.color
            } : undefined
          };
        });
      } else {
        // Fallback to original logic if new system has no models
        if (generationType === 'image') {
          const imageModelIds = getAllImageModels();
          models = imageModelIds.map(id => {
            const platform = getModelPlatform(id, 'image') || 'shenma';
            const platformInfo = MODEL_PLATFORM_INFO[platform as keyof typeof MODEL_PLATFORM_INFO];
            
            return {
              id,
              name: formatModelName(id),
              displayName: formatModelName(id),
              provider: platform as ProviderType,
              type: 'standard' as ModelType,
              capabilities: {
                isRecommended: id === 'nano-banana-hd',
                supportsImages: true,
                supportsVideo: false,
                supportsInternet: false,
                supportsThinking: false,
                supportsCodeExecution: false,
                isExperimental: false
              },
              description: getModelDescription(id, 'image'),
              isAvailable: true,
              lastUpdated: Date.now(),
              platformInfo: platformInfo ? {
                name: lang === 'zh' ? platformInfo.name : platformInfo.nameEn,
                icon: platformInfo.icon,
                color: platformInfo.color
              } : undefined
            };
          });
        } else if (generationType === 'video') {
          const videoModelIds = getAllVideoModels();
          models = videoModelIds.map(id => {
            const platform = getModelPlatform(id, 'video') || 'shenma';
            const platformInfo = MODEL_PLATFORM_INFO[platform as keyof typeof MODEL_PLATFORM_INFO];
            
            return {
              id,
              name: formatModelName(id),
              displayName: formatModelName(id),
              provider: platform as ProviderType,
              type: 'standard' as ModelType,
              capabilities: {
                isRecommended: id === 'sora_video2',
                supportsImages: false,
                supportsVideo: true,
                supportsInternet: false,
                supportsThinking: false,
                supportsCodeExecution: false,
                isExperimental: false
              },
              description: getModelDescription(id, 'video'),
              isAvailable: true,
              lastUpdated: Date.now(),
              platformInfo: platformInfo ? {
                name: lang === 'zh' ? platformInfo.name : platformInfo.nameEn,
                icon: platformInfo.icon,
                color: platformInfo.color
              } : undefined
            };
          });
        } else {
          // 文本模型 - 使用现有逻辑
          models = manager.getAvailableTextModels();
        }
      }
      
      // 更新缓存
      setCachedModels(prev => ({ ...prev, [cacheKey]: models }));
      setLastCacheTime(prev => ({ ...prev, [cacheKey]: now }));
      
      return models;
    } catch (error) {
      console.error('[ModelSelector] Error getting available models:', error);
      // 如果有缓存，返回缓存的数据
      if (cachedModels[cacheKey]) {
        return cachedModels[cacheKey];
      }
      // 返回空数组，让组件显示错误状态
      return [];
    }
  };

  // 格式化模型名称
  const formatModelName = (modelId: string): string => {
    return modelId
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // 获取模型描述
  const getModelDescription = (modelId: string, type: 'image' | 'video'): string => {
    const descriptions: Record<string, string> = {
      // 图像模型描述
      'nano-banana': '基础图像生成模型',
      'nano-banana-hd': '高清图像生成模型',
      'nano-banana-2': '图像生成模型 v2',
      'gpt-image-1': 'GPT 图像生成模型',
      'high-quality': '高质量图像生成',
      'flux-kontext-pro': 'Flux 专业版图像生成',
      'flux-kontext-max': 'Flux 最大版图像生成',
      'recraftv3': 'Recraft v3 图像生成',
      'dall-e-3': 'DALL-E 3 图像生成',
      'dall-e-2': 'DALL-E 2 图像生成',
      'byteedit-v2.0': 'ByteEdit v2.0 图像编辑',
      'byteedit-enhance': 'ByteEdit 图像增强',
      
      // 视频模型描述
      'sora-2': 'Sora 2 视频生成',
      'sora-2-pro': 'Sora 2 Pro 视频生成',
      'sora_video2': 'Sora Video 2 视频生成',
      'sora_video2-portrait': 'Sora 竖屏视频生成',
      'sora_video2-landscape': 'Sora 横屏视频生成',
      'sora_video2-portrait-hd': 'Sora 竖屏高清视频',
      'sora_video2-portrait-15s': 'Sora 竖屏15秒视频',
      'sora_video2-portrait-hd-15s': 'Sora 竖屏高清15秒视频',
      'veo3': 'Veo 3 视频生成',
      'veo3-pro': 'Veo 3 Pro 视频生成',
      'veo3-fast': 'Veo 3 Fast 快速视频生成',
      'veo3.1': 'Veo 3.1 视频生成',
      'veo3.1-pro': 'Veo 3.1 Pro 视频生成',
      'wanx2.1-vace-plus': 'WanX 2.1 Vace Plus 视频生成',
      'wan2.2-animate-move': 'WanX 2.2 动画移动',
      'wan2.2-animate-mix': 'WanX 2.2 动画混合',
      'video-style-transfer': '视频风格转换',
      'animate-anyone-gen2': '人物动画生成'
    };
    
    return descriptions[modelId] || `${type === 'image' ? '图像' : '视频'}生成模型`;
  };

  const availableModels = getAvailableModels();
  
  // 验证选中的模型是否有效
  let selectedModel = availableModels.find(model => model.id === selectedModelId);
  let validationError: string | null = null;
  
  // 如果选中的模型无效，尝试错误处理
  if (!selectedModel && selectedModelId) {
    // Use new validation system if initialized
    if (isInitialized) {
      validateModel(
        selectedModelId, 
        generationType as 'text' | 'image' | 'video'
      ).then(validation => {
        if (!validation.isValid) {
          validationError = validation.error || 'Model validation failed';
          
          // Try to get model mapping for debugging
          const mapping = modelConfigurationIntegration.getModelMapping(
            selectedModelId, 
            generationType as 'text' | 'image' | 'video'
          );
          
          if (!mapping.isValid) {
            console.warn(`[ModelSelector] Invalid model mapping for ${selectedModelId}:`, mapping);
          }
        }
      }).catch(error => {
        console.error('[ModelSelector] Model validation error:', error);
      });
    }
    
    // Fallback to original error handling
    const isValidModel = ModelErrorHandler.validateModel(selectedModelId, generationType as 'text' | 'image' | 'video');
    if (!isValidModel) {
      const fallbackResult = ModelErrorHandler.handleInvalidModel(selectedModelId, generationType as 'text' | 'image' | 'video', lang as 'zh' | 'en');
      validationError = ModelErrorHandler.getUserFriendlyMessage(fallbackResult.error!, lang as 'zh' | 'en');
      
      // 尝试使用降级模型
      selectedModel = availableModels.find(model => model.id === fallbackResult.selectedModel);
    }
  }

  // 按类型分组模型（仅对文本模型进行复杂分组）
  const groupedModels = generationType === 'text' 
    ? availableModels.reduce((groups, model) => {
        if (!groups[model.type]) {
          groups[model.type] = [];
        }
        groups[model.type].push(model);
        return groups;
      }, {} as Record<ModelType, ModelInfo[]>)
    : groupByPlatform 
      ? availableModels.reduce((groups, model) => {
          const platformKey = model.platformInfo?.name || 'Unknown';
          if (!groups[platformKey]) {
            groups[platformKey] = [];
          }
          groups[platformKey].push(model);
          return groups;
        }, {} as Record<string, ModelInfo[]>)
      : { 'standard': availableModels } as Record<string, ModelInfo[]>;

  // 类型显示顺序
  const typeOrder: (ModelType | string)[] = generationType === 'text' 
    ? ['fast-lightweight', 'deep-analysis', 'multimodal', 'network-enabled', 'reasoning-focused', 'standard']
    : groupByPlatform 
      ? Object.keys(groupedModels).sort((a, b) => {
          // 优先显示有推荐模型的平台
          const aHasRecommended = groupedModels[a].some(m => m.capabilities.isRecommended);
          const bHasRecommended = groupedModels[b].some(m => m.capabilities.isRecommended);
          if (aHasRecommended && !bHasRecommended) return -1;
          if (!aHasRecommended && bHasRecommended) return 1;
          return a.localeCompare(b);
        })
      : ['standard'];

  // 获取类型图标
  const getTypeIcon = (type: ModelType) => {
    const iconMap = {
      'fast-lightweight': Zap,
      'deep-analysis': Brain,
      'multimodal': Sparkles,
      'network-enabled': Globe,
      'reasoning-focused': Target,
      'standard': FileText
    };
    return iconMap[type] || FileText;
  };

  // 渲染模型能力标识
  const renderCapabilityBadges = (model: ModelInfo) => {
    if (generationType === 'text') {
      const badges = manager.getModelCapabilityBadges(model.id, lang);
      return badges.map((badge, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${badge.color} opacity-75`}
          title={badge.text}
        >
          <span>{badge.icon}</span>
          <span className="hidden sm:inline">{badge.text}</span>
        </span>
      ));
    } else {
      // 图像和视频模型的简化标识
      const badges = [];
      if (model.capabilities.isRecommended) {
        badges.push({
          icon: '⭐',
          text: lang === 'zh' ? '推荐' : 'Recommended',
          color: 'text-purple-500'
        });
      }
      if (generationType === 'image') {
        badges.push({
          icon: '🖼️',
          text: lang === 'zh' ? '图像' : 'Image',
          color: 'text-indigo-500'
        });
      } else if (generationType === 'video') {
        badges.push({
          icon: '🎬',
          text: lang === 'zh' ? '视频' : 'Video',
          color: 'text-violet-500'
        });
      }
      
      return badges.map((badge, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${badge.color} opacity-75`}
          title={badge.text}
        >
          <span>{badge.icon}</span>
          <span className="hidden sm:inline">{badge.text}</span>
        </span>
      ));
    }
  };

  // 渲染模型项
  const renderModelItem = (model: ModelInfo) => {
    const isSelected = model.id === selectedModelId;
    
    return (
      <button
        key={model.id}
        onClick={() => {
          onModelSelect(model.id);
          setIsOpen(false);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${
          isSelected
            ? theme === 'dark'
              ? 'bg-purple-600 text-white border border-purple-500'
              : 'bg-purple-100 text-purple-900 border border-purple-300'
            : theme === 'dark'
              ? 'hover:bg-purple-900/30 text-gray-200 hover:border-purple-500/50 border border-transparent'
              : 'hover:bg-purple-50 text-gray-700 hover:border-purple-300 border border-transparent'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{model.name}</span>
              {isSelected && (
                <Target className="w-4 h-4 text-purple-500 flex-shrink-0" />
              )}
            </div>
            <div className="text-xs opacity-75 mt-1 line-clamp-2">
              {model.description}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {renderCapabilityBadges(model)}
            </div>
          </div>
        </div>
      </button>
    );
  };

  // 渲染类型分组
  const renderTypeGroup = (type: ModelType | string, models: ModelInfo[]) => {
    if (models.length === 0) return null;

    // 对于图像和视频模型，如果启用平台分组，显示平台信息
    if (generationType !== 'text' && groupByPlatform) {
      const platformModel = models[0]; // 获取第一个模型来确定平台信息
      const platformInfo = platformModel.platformInfo;

      return (
        <div key={type} className="mb-4 last:mb-0">
          <div className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
            theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
          }`}>
            {platformInfo && (
              <>
                <span className="text-lg">{platformInfo.icon}</span>
                <span className={platformInfo.color}>{platformInfo.name}</span>
              </>
            )}
            {!platformInfo && <span>{type}</span>}
            <span className="text-xs opacity-75">({models.length})</span>
          </div>
          <div className="space-y-1">
            {models.map(renderModelItem)}
          </div>
        </div>
      );
    }

    // 对于文本模型，使用原有的类型分组逻辑
    if (generationType === 'text') {
      const typeInfo = manager.getModelTypeInfo(type as ModelType, lang as 'zh' | 'en');
      const TypeIcon = getTypeIcon(type as ModelType);

      return (
        <div key={type} className="mb-4 last:mb-0">
          <div className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
            theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
          }`}>
            <TypeIcon className="w-4 h-4" />
            <span>{typeInfo.name}</span>
            <span className="text-xs opacity-75">({models.length})</span>
          </div>
          <div className="space-y-1">
            {models.map(renderModelItem)}
          </div>
        </div>
      );
    }

    // 默认分组（不按平台分组时）
    return (
      <div key={type} className="space-y-1">
        {models.map(renderModelItem)}
      </div>
    );
  };

  // 计算下拉菜单位置（向上展开）
  const getDropdownStyle = () => {
    if (!buttonRef.current) return {};
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 400; // 预估下拉菜单高度
    
    // 如果按钮下方空间不足，向上展开
    const shouldExpandUp = rect.bottom + dropdownHeight > viewportHeight;
    
    return shouldExpandUp ? {
      bottom: '100%',
      marginBottom: '4px'
    } : {
      top: '100%',
      marginTop: '4px'
    };
  };

  if (availableModels.length === 0) {
    const modelTypeText = generationType === 'image' ? '图像' : generationType === 'video' ? '视频' : '文本';
    const modelTypeTextEn = generationType === 'image' ? 'image' : generationType === 'video' ? 'video' : 'text';
    
    return (
      <div className={`px-3 py-2 text-sm rounded-lg ${
        theme === 'dark' 
          ? 'bg-red-900/20 text-red-400 border border-red-800' 
          : 'bg-red-50 text-red-600 border border-red-200'
      }`}>
        {lang === 'zh' ? `❌ 没有可用的${modelTypeText}模型` : `❌ No available ${modelTypeTextEn} models`}
      </div>
    );
  }

  // 获取生成类型对应的图标
  const getGenerationTypeIcon = () => {
    switch (generationType) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      default:
        return Brain;
    }
  };

  const GenerationIcon = getGenerationTypeIcon();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-[44px] flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
          disabled
            ? theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : theme === 'dark'
              ? 'bg-gray-800 border-purple-500 text-white hover:bg-gray-700 hover:border-purple-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
              : 'bg-white border-purple-500 text-gray-900 hover:bg-purple-50 hover:border-purple-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GenerationIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <div className="font-medium truncate">
              {selectedModel?.name || (lang === 'zh' ? '选择模型' : 'Select Model')}
            </div>
            {selectedModel && generationType === 'text' && (
              <div className="text-xs opacity-75 truncate">
                {manager.getModelTypeInfo(selectedModel.type, lang).name}
              </div>
            )}
            {selectedModel && generationType !== 'text' && (
              <div className="text-xs opacity-75 truncate">
                {generationType === 'image' ? (lang === 'zh' ? '图像模型' : 'Image Model') : (lang === 'zh' ? '视频模型' : 'Video Model')}
              </div>
            )}
            {lockReason && (
              <div className="text-xs text-yellow-500 truncate">
                🔒 {lockReason}
              </div>
            )}
            {validationError && (
              <div className="text-xs text-red-500 truncate">
                ⚠️ {validationError}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedModel && (
            <div className="flex gap-1">
              {renderCapabilityBadges(selectedModel).slice(0, 2)}
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-lg border-2 border-purple-500 shadow-xl max-h-96 overflow-y-auto ${
            theme === 'dark'
              ? 'bg-gray-800 shadow-purple-500/20'
              : 'bg-white shadow-purple-500/10'
          }`}
          style={getDropdownStyle()}
        >
          <div className="p-2">
            {/* 标题 */}
            <div className={`px-3 py-2 text-sm font-medium border-b mb-2 ${
              theme === 'dark' 
                ? 'text-gray-300 border-purple-500/30' 
                : 'text-gray-700 border-purple-500/30'
            }`}>
              {lang === 'zh' 
                ? `选择${generationType === 'image' ? '图像' : generationType === 'video' ? '视频' : '文本'}模型` 
                : `Select ${generationType === 'image' ? 'Image' : generationType === 'video' ? 'Video' : 'Text'} Model`}
              <span className="text-xs opacity-75 ml-2">
                ({availableModels.length} {lang === 'zh' ? '个可用' : 'available'})
              </span>
            </div>

            {/* 模型分组列表 */}
            <div className="space-y-3">
              {typeOrder.map(type => {
                const models = groupedModels[type];
                return models ? renderTypeGroup(type, models) : null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ModelSelector);