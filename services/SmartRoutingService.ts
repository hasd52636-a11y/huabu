/**
 * 智能路由服务
 * Smart Routing Service for Multi-Model Text Chat
 * 
 * 负责：
 * - 分析内容类型并推荐合适的模型
 * - 修复图像分析路由问题
 * - 实现用户选择优先级逻辑
 * - 支持智能模型推荐系统
 */

import { ModelConfigManager } from './ModelConfigManager';
import { NewModelConfig, ModelInfo, ProviderSettings, getProviderSettings, getAllImageModels, getAllVideoModels } from '../types';
import { FeatureModelManager } from './FeatureModelManager';

export interface ContentAnalysis {
  hasImages: boolean;
  hasVideo: boolean;
  hasCode: boolean;
  hasUrls: boolean;
  isQuestion: boolean;
  isCreativeTask: boolean;
  isAnalysisTask: boolean;
  isReasoningTask: boolean;
  needsRealTimeInfo: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  language: 'zh' | 'en' | 'mixed';
  contentLength: number;
}

export interface RoutingRecommendation {
  recommendedModelId: string;
  confidence: number;
  reason: string;
  fallbackModelId?: string;
  scenario: 'quickResponse' | 'complexAnalysis' | 'reasoning' | 'multimodal' | 'internetSearch';
}

export class SmartRoutingService {
  private manager: ModelConfigManager;
  private config: NewModelConfig;

  constructor(config: NewModelConfig) {
    this.config = config;
    this.manager = new ModelConfigManager(config);
  }

  /**
   * 更新配置
   */
  updateConfig(config: NewModelConfig): void {
    this.config = config;
    this.manager.updateConfig(config);
  }

  /**
   * 分析内容特征
   */
  analyzeContent(content: string, attachments?: Array<{ type: string; url?: string }>): ContentAnalysis {
    const contentLower = content.toLowerCase();
    
    // 检测多媒体内容
    const hasImages = !!(attachments?.some(a => a.type.startsWith('image/')) || 
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(content) ||
      /data:image\//.test(content));
    
    const hasVideo = !!(attachments?.some(a => a.type.startsWith('video/')) || 
      /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v)/i.test(content) ||
      /(youtube\.com|youtu\.be|vimeo\.com|bilibili\.com)/i.test(content));

    // 检测代码内容
    const hasCode = /```|`[^`]+`|function\s*\(|class\s+\w+|import\s+|from\s+|def\s+|public\s+class/.test(content);

    // 检测URL
    const hasUrls = /https?:\/\/[^\s]+/.test(content);

    // 检测问题类型
    const isQuestion = /[？?]|what|how|why|when|where|who|which|是什么|怎么|为什么|如何|哪里|谁|什么时候/.test(contentLower);

    // 检测创意任务
    const creativeKeywords = '写|创作|生成|设计|画|制作|编写|创建|想象|构思|write|create|generate|design|draw|make|imagine|compose';
    const isCreativeTask = new RegExp(creativeKeywords, 'i').test(contentLower);

    // 检测分析任务
    const analysisKeywords = '分析|解释|评估|比较|总结|归纳|研究|调查|analyze|explain|evaluate|compare|summarize|research|investigate';
    const isAnalysisTask = new RegExp(analysisKeywords, 'i').test(contentLower);

    // 检测推理任务
    const reasoningKeywords = '推理|逻辑|证明|推导|思考|判断|计算|解决|reason|logic|proof|derive|think|solve|calculate';
    const isReasoningTask = new RegExp(reasoningKeywords, 'i').test(contentLower);

    // 检测实时信息需求
    const realtimeKeywords = '最新|今天|现在|当前|实时|新闻|股价|天气|latest|today|now|current|real-time|news|weather';
    const needsRealTimeInfo = new RegExp(realtimeKeywords, 'i').test(contentLower);

    // 判断复杂度
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (content.length > 500 || isAnalysisTask || isReasoningTask || hasCode) {
      complexity = 'complex';
    } else if (content.length > 100 || isCreativeTask || hasImages || hasVideo) {
      complexity = 'medium';
    }

    // 检测语言
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (content.match(/[a-zA-Z]/g) || []).length;
    let language: 'zh' | 'en' | 'mixed' = 'en';
    if (chineseChars > englishChars) {
      language = 'zh';
    } else if (chineseChars > 0 && englishChars > 0) {
      language = 'mixed';
    }

    return {
      hasImages,
      hasVideo,
      hasCode,
      hasUrls,
      isQuestion,
      isCreativeTask,
      isAnalysisTask,
      isReasoningTask,
      needsRealTimeInfo,
      complexity,
      language,
      contentLength: content.length
    };
  }

  /**
   * 智能推荐模型
   * 修复图像分析路由问题，确保多模态内容正确路由
   */
  recommendModel(content: string, attachments?: Array<{ type: string; url?: string }>): RoutingRecommendation {
    const analysis = this.analyzeContent(content, attachments);
    
    // 多模态内容优先处理（修复图像分析路由问题）
    if (analysis.hasImages || analysis.hasVideo) {
      const multimodalModel = this.manager.getRecommendedModel('multimodal');
      return {
        recommendedModelId: multimodalModel,
        confidence: 0.95,
        reason: analysis.hasImages && analysis.hasVideo 
          ? '检测到图像和视频内容，使用多模态模型'
          : analysis.hasImages 
            ? '检测到图像内容，使用支持图像分析的模型'
            : '检测到视频内容，使用支持视频分析的模型',
        scenario: 'multimodal',
        fallbackModelId: this.manager.getRecommendedModel('complexAnalysis')
      };
    }

    // 实时信息需求
    if (analysis.needsRealTimeInfo) {
      const internetModel = this.manager.getRecommendedModel('internetSearch');
      return {
        recommendedModelId: internetModel,
        confidence: 0.9,
        reason: '检测到实时信息需求，使用支持联网搜索的模型',
        scenario: 'internetSearch',
        fallbackModelId: this.manager.getRecommendedModel('quickResponse')
      };
    }

    // 推理任务
    if (analysis.isReasoningTask || analysis.hasCode) {
      const reasoningModel = this.manager.getRecommendedModel('reasoning');
      return {
        recommendedModelId: reasoningModel,
        confidence: 0.85,
        reason: analysis.hasCode 
          ? '检测到代码内容，使用推理专用模型'
          : '检测到推理任务，使用专门的推理模型',
        scenario: 'reasoning',
        fallbackModelId: this.manager.getRecommendedModel('complexAnalysis')
      };
    }

    // 复杂分析任务
    if (analysis.complexity === 'complex' || analysis.isAnalysisTask) {
      const analysisModel = this.manager.getRecommendedModel('complexAnalysis');
      return {
        recommendedModelId: analysisModel,
        confidence: 0.8,
        reason: '检测到复杂分析任务，使用深度分析模型',
        scenario: 'complexAnalysis',
        fallbackModelId: this.manager.getRecommendedModel('quickResponse')
      };
    }

    // 默认快速响应
    const quickModel = this.manager.getRecommendedModel('quickResponse');
    return {
      recommendedModelId: quickModel,
      confidence: 0.7,
      reason: '常规对话任务，使用快速响应模型',
      scenario: 'quickResponse',
      fallbackModelId: this.manager.getDefaultModel()
    };
  }

  /**
   * 获取模型的提供商设置
   */
  getModelProviderSettings(modelId: string): ProviderSettings {
    const modelInfo = this.manager.getModelInfo(modelId);
    if (!modelInfo) {
      throw new Error(`模型 ${modelId} 不存在`);
    }

    // 创建临时配置以使用getProviderSettings
    const tempConfig = {
      ...this.config,
      text: { provider: modelInfo.provider, modelId }
    };

    return getProviderSettings(tempConfig, 'text');
  }

  /**
   * 检查模型是否支持多模态
   */
  isMultimodalCapable(modelId: string): boolean {
    const modelInfo = this.manager.getModelInfo(modelId);
    return !!(modelInfo?.capabilities.supportsImages || modelInfo?.capabilities.supportsVideo);
  }

  /**
   * 检查模型是否支持联网
   */
  isInternetCapable(modelId: string): boolean {
    const modelInfo = this.manager.getModelInfo(modelId);
    return !!modelInfo?.capabilities.supportsInternet;
  }

  /**
   * 获取用户偏好的模型（考虑用户选择优先级）
   */
  getUserPreferredModel(userSelectedModelId?: string, content?: string, attachments?: Array<{ type: string; url?: string }>): string {
    const userPreferences = this.manager.getUserPreferences();
    
    // 如果用户明确选择了模型，优先使用用户选择
    if (userSelectedModelId && this.manager.isModelAvailable(userSelectedModelId)) {
      // 但是要检查模型能力是否匹配内容需求
      if (content && attachments) {
        const analysis = this.analyzeContent(content, attachments);
        const isMultimodal = analysis.hasImages || analysis.hasVideo;
        
        if (isMultimodal && !this.isMultimodalCapable(userSelectedModelId)) {
          // 用户选择的模型不支持多模态，但内容需要多模态处理
          // 返回推荐的多模态模型，但记录用户偏好
          console.warn(`[SmartRouting] 用户选择的模型 ${userSelectedModelId} 不支持多模态，自动切换到多模态模型`);
          return this.manager.getRecommendedModel('multimodal');
        }
        
        if (analysis.needsRealTimeInfo && !this.isInternetCapable(userSelectedModelId)) {
          // 用户选择的模型不支持联网，但内容需要实时信息
          console.warn(`[SmartRouting] 用户选择的模型 ${userSelectedModelId} 不支持联网，自动切换到联网模型`);
          return this.manager.getRecommendedModel('internetSearch');
        }
      }
      
      return userSelectedModelId;
    }

    // 如果启用了智能路由，使用智能推荐
    if (userPreferences.smartRouting.enabled && content) {
      const recommendation = this.recommendModel(content, attachments);
      return recommendation.recommendedModelId;
    }

    // 否则使用默认模型
    return userPreferences.defaultTextModel;
  }

  /**
   * 获取路由决策的详细信息（用于调试和用户反馈）
   */
  getRoutingDecision(content: string, userSelectedModelId?: string, attachments?: Array<{ type: string; url?: string }>) {
    const analysis = this.analyzeContent(content, attachments);
    const recommendation = this.recommendModel(content, attachments);
    const finalModelId = this.getUserPreferredModel(userSelectedModelId, content, attachments);
    const modelInfo = this.manager.getModelInfo(finalModelId);

    return {
      analysis,
      recommendation,
      finalModelId,
      modelInfo,
      userOverride: userSelectedModelId && userSelectedModelId !== recommendation.recommendedModelId,
      smartRoutingEnabled: this.manager.getUserPreferences().smartRouting.enabled
    };
  }

  /**
   * 批量分析多个内容的路由决策
   */
  batchAnalyze(contents: Array<{ content: string; attachments?: Array<{ type: string; url?: string }> }>) {
    return contents.map(({ content, attachments }) => ({
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      decision: this.getRoutingDecision(content, undefined, attachments)
    }));
  }

  /**
   * 智能推荐图像模型
   * Intelligently recommend image model based on content and feature requirements
   */
  recommendImageModel(content: string, featureId?: string, userPreference?: string): string {
    const featureManager = new FeatureModelManager();
    
    // 如果指定了功能ID，检查是否需要特定模型
    if (featureId) {
      const requiredModel = featureManager.getRequiredModel(featureId);
      if (requiredModel) {
        console.log(`[SmartRouting] Feature ${featureId} requires model: ${requiredModel}`);
        return requiredModel;
      }
    }
    
    // 分析内容特征来推荐合适的图像模型
    const contentLower = content.toLowerCase();
    const imageModels = getAllImageModels();
    
    // 检测编辑相关关键词
    const editingKeywords = ['编辑', '修改', '去除', '删除', '涂抹', '背景', '风格', '转换', 'edit', 'remove', 'delete', 'background', 'style'];
    const needsEditing = editingKeywords.some(keyword => contentLower.includes(keyword));
    
    if (needsEditing) {
      // 需要编辑功能，优先使用 ByteEdit 模型
      if (imageModels.includes('byteedit-v2.0')) {
        return 'byteedit-v2.0';
      }
    }
    
    // 检测高质量需求
    const qualityKeywords = ['高清', '高质量', '专业', '精细', 'hd', 'high quality', 'professional', 'detailed'];
    const needsHighQuality = qualityKeywords.some(keyword => contentLower.includes(keyword));
    
    if (needsHighQuality) {
      // 需要高质量，优先使用高级模型
      const advancedModels = ['flux-kontext-max', 'dall-e-3', 'recraftv3'];
      for (const model of advancedModels) {
        if (imageModels.includes(model)) {
          return model;
        }
      }
    }
    
    // 使用用户偏好或默认模型
    if (userPreference && imageModels.includes(userPreference)) {
      return userPreference;
    }
    
    // 返回默认的高清模型
    return imageModels.includes('nano-banana-hd') ? 'nano-banana-hd' : imageModels[0];
  }

  /**
   * 智能推荐视频模型
   * Intelligently recommend video model based on content and feature requirements
   */
  recommendVideoModel(content: string, featureId?: string, userPreference?: string): string {
    const featureManager = new FeatureModelManager();
    
    // 如果指定了功能ID，检查是否需要特定模型
    if (featureId) {
      const requiredModel = featureManager.getRequiredModel(featureId);
      if (requiredModel) {
        console.log(`[SmartRouting] Feature ${featureId} requires model: ${requiredModel}`);
        return requiredModel;
      }
    }
    
    // 分析内容特征来推荐合适的视频模型
    const contentLower = content.toLowerCase();
    const videoModels = getAllVideoModels();
    
    // 检测角色相关关键词
    const characterKeywords = ['角色', '人物', '客串', '动画', '表演', 'character', 'person', 'cameo', 'animation', 'performance'];
    const needsCharacter = characterKeywords.some(keyword => contentLower.includes(keyword));
    
    if (needsCharacter) {
      // 需要角色功能，优先使用 Sora 或 WanX 模型
      const characterModels = ['sora-2', 'sora-2-pro', 'wan2.2-animate-mix'];
      for (const model of characterModels) {
        if (videoModels.includes(model)) {
          return model;
        }
      }
    }
    
    // 检测快速生成需求
    const speedKeywords = ['快速', '快', '简单', 'fast', 'quick', 'simple'];
    const needsSpeed = speedKeywords.some(keyword => contentLower.includes(keyword));
    
    if (needsSpeed) {
      // 需要快速生成，优先使用快速模型
      const fastModels = ['veo3-fast', 'sora_video2'];
      for (const model of fastModels) {
        if (videoModels.includes(model)) {
          return model;
        }
      }
    }
    
    // 检测高质量需求
    const qualityKeywords = ['高清', '高质量', '专业', '精细', 'hd', 'high quality', 'professional', 'detailed'];
    const needsHighQuality = qualityKeywords.some(keyword => contentLower.includes(keyword));
    
    if (needsHighQuality) {
      // 需要高质量，优先使用专业模型
      const proModels = ['veo3-pro', 'sora-2-pro', 'veo3.1-pro'];
      for (const model of proModels) {
        if (videoModels.includes(model)) {
          return model;
        }
      }
    }
    
    // 使用用户偏好或默认模型
    if (userPreference && videoModels.includes(userPreference)) {
      return userPreference;
    }
    
    // 返回默认的视频模型
    return videoModels.includes('sora_video2') ? 'sora_video2' : videoModels[0];
  }

  /**
   * 获取模型选择结果（包含锁定信息）
   * Get model selection result with lock information
   */
  getModelSelectionResult(
    generationType: 'text' | 'image' | 'video',
    content: string,
    featureId?: string,
    userPreference?: string
  ): { modelId: string; isLocked: boolean; lockReason?: string } {
    const featureManager = new FeatureModelManager();
    
    // 检查功能是否需要特定模型
    if (featureId) {
      const result = featureManager.getModelForFeature(featureId, userPreference);
      if (result.isLocked) {
        return {
          modelId: result.selectedModel,
          isLocked: true,
          lockReason: result.lockReason
        };
      }
    }
    
    // 根据生成类型推荐模型
    let recommendedModel: string;
    switch (generationType) {
      case 'image':
        recommendedModel = this.recommendImageModel(content, featureId, userPreference);
        break;
      case 'video':
        recommendedModel = this.recommendVideoModel(content, featureId, userPreference);
        break;
      default:
        recommendedModel = this.getUserPreferredModel(userPreference, content);
    }
    
    return {
      modelId: recommendedModel,
      isLocked: false
    };
  }
}

export default SmartRoutingService;