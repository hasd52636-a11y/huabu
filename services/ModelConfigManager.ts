/**
 * 模型配置管理器
 * Model Configuration Manager
 * 
 * 负责管理可用模型列表、模型信息查询、模型可用性检查等功能
 */

import { 
  ModelInfo, 
  ModelType, 
  ModelCapability, 
  NewModelConfig, 
  UserPreferences,
  SmartRoutingConfig,
  SHENMA_TEXT_MODELS,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_SMART_ROUTING_CONFIG,
  MODEL_TYPE_INFO,
  ProviderType
} from '../types';

export class ModelConfigManager {
  private config: NewModelConfig;
  private availableModels: Map<string, ModelInfo> = new Map();

  constructor(config: NewModelConfig) {
    this.config = config;
    this.initializeAvailableModels();
  }

  /**
   * 初始化可用模型列表
   * Initialize available models list
   */
  private initializeAvailableModels(): void {
    // 清空现有模型
    this.availableModels.clear();

    // 添加神马API的文本模型
    SHENMA_TEXT_MODELS.forEach(model => {
      this.availableModels.set(model.id, model);
    });

    // 如果配置中有自定义模型，也添加进来
    if (this.config.availableModels?.text) {
      this.config.availableModels.text.forEach(model => {
        this.availableModels.set(model.id, model);
      });
    }

    console.log(`[ModelConfigManager] 已初始化 ${this.availableModels.size} 个可用模型`);
  }

  /**
   * 获取所有可用的文本模型
   * Get all available text models
   */
  getAvailableTextModels(): ModelInfo[] {
    const models = Array.from(this.availableModels.values())
      .filter(model => model.isAvailable)
      .sort((a, b) => {
        // 推荐模型排在前面
        if (a.capabilities.isRecommended && !b.capabilities.isRecommended) return -1;
        if (!a.capabilities.isRecommended && b.capabilities.isRecommended) return 1;
        
        // 按类型排序
        const typeOrder: ModelType[] = ['fast-lightweight', 'deep-analysis', 'multimodal', 'network-enabled', 'reasoning-focused', 'standard'];
        const aIndex = typeOrder.indexOf(a.type);
        const bIndex = typeOrder.indexOf(b.type);
        if (aIndex !== bIndex) return aIndex - bIndex;
        
        // 按名称排序
        return a.name.localeCompare(b.name);
      });

    console.log(`[ModelConfigManager] 返回 ${models.length} 个可用文本模型`);
    return models;
  }

  /**
   * 根据类型获取模型列表
   * Get models by type
   */
  getModelsByType(type: ModelType): ModelInfo[] {
    return Array.from(this.availableModels.values())
      .filter(model => model.type === type && model.isAvailable)
      .sort((a, b) => {
        // 推荐模型排在前面
        if (a.capabilities.isRecommended && !b.capabilities.isRecommended) return -1;
        if (!a.capabilities.isRecommended && b.capabilities.isRecommended) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * 获取模型信息
   * Get model information by ID
   */
  getModelInfo(modelId: string): ModelInfo | null {
    const model = this.availableModels.get(modelId);
    if (!model) {
      console.warn(`[ModelConfigManager] 模型 ${modelId} 不存在`);
      return null;
    }
    return model;
  }

  /**
   * 检查模型是否可用
   * Check if model is available
   */
  isModelAvailable(modelId: string): boolean {
    const model = this.availableModels.get(modelId);
    if (!model) {
      console.warn(`[ModelConfigManager] 模型 ${modelId} 不存在`);
      return false;
    }
    
    // 检查提供商是否配置
    const providerConfig = this.config.providers[model.provider];
    if (!providerConfig || !providerConfig.enabled || !providerConfig.apiKey) {
      console.warn(`[ModelConfigManager] 模型 ${modelId} 的提供商 ${model.provider} 未正确配置`);
      return false;
    }

    return model.isAvailable;
  }

  /**
   * 获取默认模型
   * Get default model
   */
  getDefaultModel(): string {
    const preferences = this.getUserPreferences();
    const defaultModelId = preferences.defaultTextModel;
    
    // 检查默认模型是否可用
    if (this.isModelAvailable(defaultModelId)) {
      return defaultModelId;
    }

    // 如果默认模型不可用，返回第一个可用的推荐模型
    const availableModels = this.getAvailableTextModels();
    const recommendedModel = availableModels.find(model => model.capabilities.isRecommended);
    if (recommendedModel) {
      console.warn(`[ModelConfigManager] 默认模型 ${defaultModelId} 不可用，使用推荐模型 ${recommendedModel.id}`);
      return recommendedModel.id;
    }

    // 如果没有推荐模型，返回第一个可用模型
    if (availableModels.length > 0) {
      console.warn(`[ModelConfigManager] 没有推荐模型，使用第一个可用模型 ${availableModels[0].id}`);
      return availableModels[0].id;
    }

    // 如果没有任何可用模型，返回配置中的当前模型
    console.error(`[ModelConfigManager] 没有任何可用模型，返回配置中的当前模型 ${this.config.text.modelId}`);
    return this.config.text.modelId;
  }

  /**
   * 获取推荐模型
   * Get recommended model for specific scenario
   */
  getRecommendedModel(scenario: 'quickResponse' | 'complexAnalysis' | 'reasoning' | 'multimodal' | 'internetSearch' = 'quickResponse'): string {
    const preferences = this.getUserPreferences();
    const smartRouting = preferences.smartRouting;

    if (!smartRouting.enabled) {
      return this.getDefaultModel();
    }

    const recommendedModelId = smartRouting.preferredModels[scenario];
    
    // 检查推荐模型是否可用
    if (this.isModelAvailable(recommendedModelId)) {
      return recommendedModelId;
    }

    // 如果推荐模型不可用，使用降级模型
    const fallbackModelId = smartRouting.fallbackModel;
    if (this.isModelAvailable(fallbackModelId)) {
      console.warn(`[ModelConfigManager] 推荐模型 ${recommendedModelId} 不可用，使用降级模型 ${fallbackModelId}`);
      return fallbackModelId;
    }

    // 如果降级模型也不可用，返回默认模型
    console.warn(`[ModelConfigManager] 推荐模型和降级模型都不可用，使用默认模型`);
    return this.getDefaultModel();
  }

  /**
   * 根据内容类型智能推荐模型
   * Intelligently recommend model based on content type
   */
  recommendModelForContent(content: string, hasImages: boolean = false, hasVideo: boolean = false): string {
    const preferences = this.getUserPreferences();
    
    if (!preferences.smartRouting.enabled) {
      return this.getDefaultModel();
    }

    // 多模态内容
    if (hasImages || hasVideo) {
      return this.getRecommendedModel('multimodal');
    }

    // 检测内容特征
    const contentLower = content.toLowerCase();
    
    // 联网搜索相关关键词
    const internetKeywords = ['最新', '今天', '现在', '当前', '实时', '搜索', '查询', 'latest', 'today', 'now', 'current', 'search'];
    if (internetKeywords.some(keyword => contentLower.includes(keyword))) {
      return this.getRecommendedModel('internetSearch');
    }

    // 复杂分析相关关键词
    const analysisKeywords = ['分析', '解释', '详细', '深入', '原理', '机制', 'analyze', 'explain', 'detailed', 'principle', 'mechanism'];
    if (analysisKeywords.some(keyword => contentLower.includes(keyword))) {
      return this.getRecommendedModel('complexAnalysis');
    }

    // 推理相关关键词
    const reasoningKeywords = ['推理', '逻辑', '证明', '推导', '思考', 'reasoning', 'logic', 'proof', 'derive', 'think'];
    if (reasoningKeywords.some(keyword => contentLower.includes(keyword))) {
      return this.getRecommendedModel('reasoning');
    }

    // 内容长度判断
    if (content.length > 500) {
      return this.getRecommendedModel('complexAnalysis');
    }

    // 默认使用快速响应模型
    return this.getRecommendedModel('quickResponse');
  }

  /**
   * 获取用户偏好设置
   * Get user preferences
   */
  getUserPreferences(): UserPreferences {
    return this.config.userPreferences || DEFAULT_USER_PREFERENCES;
  }

  /**
   * 更新用户偏好设置
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.config.userPreferences = {
      ...this.getUserPreferences(),
      ...preferences
    };
    console.log('[ModelConfigManager] 用户偏好设置已更新');
  }

  /**
   * 获取模型类型信息
   * Get model type information
   */
  getModelTypeInfo(type: ModelType, lang: 'zh' | 'en' = 'zh'): { name: string; icon: string; description: string } {
    const info = MODEL_TYPE_INFO[type];
    return {
      name: lang === 'zh' ? info.name : info.nameEn,
      icon: info.icon,
      description: lang === 'zh' ? info.description : info.descriptionEn
    };
  }

  /**
   * 获取模型能力标识
   * Get model capability badges
   */
  getModelCapabilityBadges(modelId: string, lang: 'zh' | 'en' = 'zh'): Array<{ icon: string; text: string; color: string }> {
    const model = this.getModelInfo(modelId);
    if (!model) return [];

    const badges: Array<{ icon: string; text: string; color: string }> = [];

    if (model.capabilities.isRecommended) {
      badges.push({
        icon: '⭐',
        text: lang === 'zh' ? '推荐' : 'Recommended',
        color: 'text-purple-500'
      });
    }

    if (model.capabilities.supportsInternet) {
      badges.push({
        icon: '🌐',
        text: lang === 'zh' ? '联网' : 'Internet',
        color: 'text-indigo-500'
      });
    }

    if (model.capabilities.supportsImages || model.capabilities.supportsVideo) {
      badges.push({
        icon: '🎭',
        text: lang === 'zh' ? '多模态' : 'Multimodal',
        color: 'text-violet-500'
      });
    }

    if (model.capabilities.supportsThinking) {
      badges.push({
        icon: '🤔',
        text: lang === 'zh' ? '思维链' : 'Thinking',
        color: 'text-fuchsia-500'
      });
    }

    if (model.capabilities.isExperimental) {
      badges.push({
        icon: '🧪',
        text: lang === 'zh' ? '实验' : 'Experimental',
        color: 'text-pink-500'
      });
    }

    return badges;
  }

  /**
   * 更新配置
   * Update configuration
   */
  updateConfig(config: NewModelConfig): void {
    this.config = config;
    this.initializeAvailableModels();
  }

  /**
   * 获取当前配置
   * Get current configuration
   */
  getConfig(): NewModelConfig {
    return this.config;
  }

  /**
   * 验证模型配置
   * Validate model configuration
   */
  validateModelConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否有可用的模型
    const availableModels = this.getAvailableTextModels();
    if (availableModels.length === 0) {
      errors.push('没有可用的文本模型');
    }

    // 检查默认模型是否可用
    const defaultModel = this.getUserPreferences().defaultTextModel;
    if (!this.isModelAvailable(defaultModel)) {
      warnings.push(`默认模型 ${defaultModel} 不可用`);
    }

    // 检查智能路由配置
    const smartRouting = this.getUserPreferences().smartRouting;
    if (smartRouting.enabled) {
      Object.entries(smartRouting.preferredModels).forEach(([scenario, modelId]) => {
        if (!this.isModelAvailable(modelId)) {
          warnings.push(`智能路由场景 ${scenario} 的首选模型 ${modelId} 不可用`);
        }
      });

      if (!this.isModelAvailable(smartRouting.fallbackModel)) {
        warnings.push(`智能路由的降级模型 ${smartRouting.fallbackModel} 不可用`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}