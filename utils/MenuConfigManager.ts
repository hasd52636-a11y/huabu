import { MenuConfig, FeatureModule, MenuItem } from '../types.js';

/**
 * 菜单配置管理器
 * Menu Configuration Manager
 * 
 * 负责：
 * - 保存和加载菜单配置
 * - 管理功能模块的可用状态
 * - 基于模型能力生成动态菜单
 * - 配置持久化到localStorage
 */
export class MenuConfigManager {
  private readonly STORAGE_KEY = 'canvas_menu_configs';
  private readonly FEATURES_KEY = 'canvas_features';
  private readonly CURRENT_CONFIG_KEY = 'canvas_current_config';

  /**
   * 获取所有保存的菜单配置
   * Get all saved menu configurations
   */
  getAllConfigs(): MenuConfig[] {
    try {
      const configs = localStorage.getItem(this.STORAGE_KEY);
      return configs ? JSON.parse(configs) : [];
    } catch (error) {
      console.error('Failed to load menu configs:', error);
      return [];
    }
  }

  /**
   * 获取当前活动的菜单配置
   * Get the currently active menu configuration
   */
  getCurrentConfig(): MenuConfig | null {
    try {
      const currentConfigId = localStorage.getItem(this.CURRENT_CONFIG_KEY);
      if (!currentConfigId) return null;
      
      const allConfigs = this.getAllConfigs();
      return allConfigs.find(config => config.id === currentConfigId) || null;
    } catch (error) {
      console.error('Failed to get current menu config:', error);
      return null;
    }
  }

  /**
   * 保存菜单配置
   * Save menu configuration
   */
  saveConfig(config: MenuConfig): MenuConfig {
    try {
      const allConfigs = this.getAllConfigs();
      const existingIndex = allConfigs.findIndex(c => c.id === config.id);
      
      const updatedConfig = {
        ...config,
        updatedAt: Date.now()
      };
      
      if (existingIndex >= 0) {
        allConfigs[existingIndex] = updatedConfig;
      } else {
        allConfigs.push(updatedConfig);
      }
      
      // 验证localStorage可用性
      if (typeof Storage === 'undefined') {
        console.warn('localStorage is not available');
        return updatedConfig;
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allConfigs));
      return updatedConfig;
    } catch (error) {
      console.error('Failed to save menu config:', error);
      // 如果localStorage满了或其他错误，尝试清理旧配置
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanupOldConfigs();
        // 重试一次
        try {
          const allConfigs = this.getAllConfigs();
          const existingIndex = allConfigs.findIndex(c => c.id === config.id);
          
          const updatedConfig = {
            ...config,
            updatedAt: Date.now()
          };
          
          if (existingIndex >= 0) {
            allConfigs[existingIndex] = updatedConfig;
          } else {
            allConfigs.push(updatedConfig);
          }
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allConfigs));
          return updatedConfig;
        } catch (retryError) {
          console.error('Failed to save menu config after cleanup:', retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  /**
   * 设置当前活动的菜单配置
   * Set the currently active menu configuration
   */
  setCurrentConfig(configId: string): boolean {
    try {
      const allConfigs = this.getAllConfigs();
      const configExists = allConfigs.some(config => config.id === configId);
      
      if (configExists) {
        localStorage.setItem(this.CURRENT_CONFIG_KEY, configId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set current menu config:', error);
      return false;
    }
  }

  /**
   * 删除菜单配置
   * Delete menu configuration
   */
  deleteConfig(configId: string): boolean {
    try {
      const allConfigs = this.getAllConfigs();
      const filteredConfigs = allConfigs.filter(config => config.id !== configId);
      
      if (filteredConfigs.length < allConfigs.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConfigs));
        
        // 如果删除的是当前配置，清除当前配置
        const currentConfigId = localStorage.getItem(this.CURRENT_CONFIG_KEY);
        if (currentConfigId === configId) {
          localStorage.removeItem(this.CURRENT_CONFIG_KEY);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete menu config:', error);
      return false;
    }
  }

  /**
   * 保存可用功能列表
   * Save available features list
   */
  saveFeatures(features: FeatureModule[]): void {
    try {
      localStorage.setItem(this.FEATURES_KEY, JSON.stringify(features));
    } catch (error) {
      console.error('Failed to save features:', error);
    }
  }

  /**
   * 获取可用功能列表
   * Get available features list
   */
  getFeatures(): FeatureModule[] {
    try {
      // 总是返回最新的功能定义，确保支持所有模型
      return this.getDefaultFeatures();
    } catch (error) {
      console.error('Failed to load features:', error);
      return this.getDefaultFeatures();
    }
  }

  /**
   * 获取默认功能列表
   * Get default features list
   */
  getDefaultFeatures(): FeatureModule[] {
    // 支持的模型列表，包括当前模型和所有可能的模型名称
    const supportedModels = [
      // Google Gemini模型
      'gemini-3-pro-image-preview', 
      'gemini-2.0-flash-exp', 
      'gemini-3-flash-preview', 
      'gemini-3-pro-preview', 
      'imagen-3.0-generate-001',
      
      // 神马API模型
      'nano-banana', 
      'nano-banana-hd', 
      'nano-banana-2', 
      'high-quality', 
      'byteedit-v2.0', 
      'flux-kontext-pro', 
      'flux-kontext-max', 
      'gpt-4o', 
      'gpt-4-turbo', 
      'gpt-3.5-turbo',
      
      // 智谱API模型
      'GLM-4-Flash', 
      'CogView-3-Flash', 
      'CogVideoX-Flash',
      
      // Sora视频模型
      'sora-2', 
      'sora-2-pro', 
      'sora_video2', 
      'sora_video2-portrait', 
      'sora_video2-landscape', 
      'sora_video2-portrait-hd', 
      'sora_video2-portrait-15s', 
      'sora_video2-portrait-hd-15s',
      
      // Veo视频模型
      'veo3', 
      'veo3-pro', 
      'veo3-pro-frames', 
      'veo3-fast', 
      'veo3.1', 
      'veo3.1-pro',
      'veo-3.1-fast-generate-preview', 
      'veo-3.1-generate-preview',
      
      // WanX视频模型
      'wanx2.1-vace-plus', 
      'wan2.2-animate-move', 
      'wan2.2-animate-mix',
      
      // 其他视频模型
      'animate-anyone-gen2',
      'dall-e-3',
      'dall-e-2',
      'viduq1-image'
    ];

    return [
      // 基础图片功能
      {
        id: 'image-generate',
        name: '生成图片',
        description: '基于文本提示生成图片',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 1
      },
      {
        id: 'image-edit',
        name: '编辑图片',
        description: '基于自然语言修改图片',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 2
      },
      {
        id: 'image-variation',
        name: '图片变体',
        description: '生成图片的变体版本',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 3
      },
      {
        id: 'image-copy',
        name: '图片复制',
        description: '复制图片到剪贴板',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 4
      },
      {
        id: 'image-preview-prompt',
        name: '预览提示词',
        description: '预览提示词效果',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 5
      },
      {
        id: 'image-multi',
        name: '多图生成',
        description: '一次性生成多张图片',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 6
      },
      {
        id: 'image-crop',
        name: '裁剪图片',
        description: '裁剪图片到指定尺寸',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 7
      },
      // 高级图片编辑功能
      {
        id: 'image-enhance',
        name: '增强图片',
        description: '增强图片质量、清晰度和色彩',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 7
      },
      {
        id: 'image-style-transfer',
        name: '风格迁移',
        description: '将一种图像的风格迁移到另一种图像',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'experimental',
        priority: 8
      },
      {
        id: 'image-remove-background',
        name: '移除背景',
        description: '自动移除图片背景',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 9
      },
      {
        id: 'image-add-element',
        name: '添加元素',
        description: '向图片中添加新元素',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 10
      },
      {
        id: 'image-replace-element',
        name: '替换元素',
        description: '替换图片中的元素',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 11
      },
      {
        id: 'image-remove-area',
        name: '涂抹消除',
        description: '涂抹图片区域进行消除',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 12
      },
      {
        id: 'image-edit-area',
        name: '涂抹编辑',
        description: '涂抹图片区域进行编辑',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 13
      },
      {
        id: 'image-analyze',
        name: '分析图片',
        description: '分析图片内容和信息',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 14
      },
      {
        id: 'image-multi-analyze',
        name: '多图分析',
        description: '分析多张图片的内容和关系',
        type: 'image',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 15
      },
      // 文本功能
      {
        id: 'text-generate',
        name: '生成文本',
        description: '基于提示生成文本内容',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 16
      },
      {
        id: 'text-summarize',
        name: '文本摘要',
        description: '生成文本摘要',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 17
      },
      {
        id: 'text-translate',
        name: '文本翻译',
        description: '翻译文本到指定语言',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 18
      },
      {
        id: 'text-edit',
        name: '编辑文本',
        description: '编辑现有文本',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 19
      },
      {
        id: 'text-format',
        name: '格式化文本',
        description: '格式化文本为指定格式',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 20
      },
      {
        id: 'text-font-size',
        name: '字体大小',
        description: '调整文本字体大小',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 21
      },
      {
        id: 'text-color',
        name: '文本颜色',
        description: '调整文本颜色',
        type: 'text',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 22
      },
      // 视频功能
      {
        id: 'video-generate',
        name: '生成视频',
        description: '基于文本提示生成视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 23
      },
      {
        id: 'video-analyze',
        name: '分析视频',
        description: '分析视频内容',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 24
      },
      {
        id: 'video-character',
        name: '角色客串',
        description: '将角色添加到视频中',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 25
      },
      {
        id: 'video-upload',
        name: '上传视频',
        description: '上传本地视频文件',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 26
      },
      {
        id: 'video-download',
        name: '下载视频',
        description: '下载生成的视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 27
      },
      {
        id: 'video-character-replace',
        name: '视频换人',
        description: '将视频中的角色替换为指定角色',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 28
      },
      {
        id: 'video-image-to-video',
        name: '图生视频',
        description: '基于单张图片生成视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 29
      },
      {
        id: 'video-multi-image-to-video',
        name: '多图生视频',
        description: '基于多张图片生成视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 30
      },
      {
        id: 'video-video-to-video',
        name: '视频生成视频',
        description: '基于现有视频生成新视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 31
      },
      {
        id: 'video-style-transfer',
        name: '视频风格迁移',
        description: '迁移视频风格',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 32
      },
      {
        id: 'video-image-to-action',
        name: '图生动作',
        description: '基于图片生成动作视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 33
      },
      {
        id: 'video-dance',
        name: '舞动人像',
        description: '基于人物图片生成舞蹈视频',
        type: 'video',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 34
      },
      // 语音功能 - 目前仅支持神马API
      {
        id: 'voice-realtime',
        name: '实时语音对话',
        description: '实时语音对话功能',
        type: 'voice',
        requiredModels: supportedModels,
        requiredProviders: ['shenma'],
        category: 'experimental',
        priority: 35
      },
      // 全局功能（鼠标右键菜单）- 所有提供商都支持
      {
        id: 'canvas-reset',
        name: '重置视角',
        description: '重置画布视角 (Ctrl+0)',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 36
      },
      {
        id: 'canvas-clear',
        name: '清空画布',
        description: '清空画布上所有内容',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 37
      },
      {
        id: 'canvas-copy',
        name: '复制模块',
        description: '复制选中的模块',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 38
      },
      {
        id: 'canvas-delete',
        name: '删除模块',
        description: '删除选中的模块',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 39
      },
      {
        id: 'canvas-batch-video',
        name: '批量处理',
        description: '批量生成视频',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 40
      },
      {
        id: 'canvas-auto-layout',
        name: '一键排序',
        description: '自动排列画布上的模块',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 41
      },
      {
        id: 'canvas-new',
        name: '新建项目',
        description: '创建一个新的项目',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 42
      },
      {
        id: 'canvas-save',
        name: '保存画布',
        description: '保存当前画布状态',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 43
      },
      {
        id: 'canvas-export',
        name: '导出结果',
        description: '导出画布结果',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 44
      },
      {
        id: 'canvas-export-storyboard',
        name: '导出分镜',
        description: '导出分镜图为JPEG/PNG文件',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 43
      },
      {
        id: 'canvas-performance',
        name: '性能模式',
        description: '切换性能模式',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 45
      },
      {
        id: 'canvas-help',
        name: '使用指南',
        description: '查看使用指南',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'basic',
        priority: 46
      },
      {
        id: 'canvas-webhook',
        name: 'WebHook设置',
        description: '配置通知WebHook地址',
        type: 'general',
        requiredModels: supportedModels,
        requiredProviders: ['google', 'openai-compatible', 'zhipu', 'shenma'],
        category: 'advanced',
        priority: 47
      }
    ];
  }

  /**
   * 根据当前模型生成可用的菜单项
   * Generate available menu items based on current model
   */
  generateMenuItemsForModel(model: string, featureIds: string[] = [], menuType: 'floating' | 'context' = 'floating'): MenuItem[] {
    const allFeatures = this.getFeatures();
    
    // 从模型名称中提取提供商信息
    let currentProvider: string = 'google'; // 默认提供商
    if (model.includes('nano-banana') || model.includes('flux-kontext') || model.includes('byteedit') || model.includes('high-quality')) {
      currentProvider = 'shenma';
    } else if (model.includes('GLM-') || model.includes('CogView') || model.includes('CogVideo') || model.includes('viduq')) {
      currentProvider = 'zhipu';
    } else if (model.includes('gpt-') || model.includes('dall-e')) {
      currentProvider = 'openai-compatible';
    }
    
    const availableFeatures = allFeatures.filter(f => {
      // 检查模型是否支持
      const isModelSupported = f.requiredModels.length === 0 || f.requiredModels.includes(model);
      
      // 检查提供商是否支持
      const isProviderSupported = !f.requiredProviders || f.requiredProviders.length === 0 || f.requiredProviders.includes(currentProvider);
      
      return isModelSupported && isProviderSupported;
    });
    
    const enabledFeatureIds = new Set(featureIds);
    
    // 按优先级排序
    availableFeatures.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    // 生成菜单项
    const menuItems: MenuItem[] = [];
    
    // 根据菜单类型过滤功能
    const filteredFeatures = menuType === 'floating' 
      ? availableFeatures.filter(f => f.type !== 'general') // 悬浮菜单：文本、图片、视频、语音功能
      : availableFeatures.filter(f => f.type === 'general'); // 上下文菜单：全局功能
    
    if (menuType === 'floating') {
      // 悬浮菜单：扁平化显示所有已启用的功能，不分组
      const relevantFeatures = filteredFeatures.filter(f => f.type !== 'general');
      
      relevantFeatures.forEach(feature => {
        if (enabledFeatureIds.has(feature.id)) {
          // 根据功能类型设置图标
          let icon = 'settings';
          if (feature.type === 'text') {
            icon = 'type';
          } else if (feature.type === 'image') {
            icon = 'image';
          } else if (feature.type === 'video') {
            icon = 'play';
          } else if (feature.type === 'voice') {
            icon = 'play';
          }
          
          menuItems.push({
            id: `menu-${feature.id}`,
            label: feature.name,
            action: `feature:${feature.id}`,
            featureId: feature.id,
            icon: icon,
            disabled: false // 已启用的功能不应该被禁用
          });
        }
      });
    } else {
      // 上下文菜单：全局功能（画布相关）
      const generalFeatures = filteredFeatures.filter(f => f.type === 'general');
      generalFeatures.forEach(feature => {
        let icon = 'settings'; // 默认图标
        // 根据功能ID设置不同的图标
        if (feature.id === 'canvas-reset' || feature.id === 'canvas-clear') {
          icon = 'rotateCcw';
        } else if (feature.id === 'canvas-copy' || feature.id === 'canvas-delete') {
          icon = 'copy';
        } else if (feature.id === 'canvas-batch-video') {
          icon = 'play';
        } else if (feature.id === 'canvas-export-storyboard') {
          icon = 'grid3X3';
        } else if (feature.id === 'canvas-auto-layout') {
          icon = 'layoutGrid';
        } else if (feature.id === 'canvas-save' || feature.id === 'canvas-export') {
          icon = 'save';
        } else if (feature.id === 'canvas-new') {
          icon = 'filePlus';
        } else if (feature.id === 'canvas-performance') {
          icon = 'zap';
        } else if (feature.id === 'canvas-help') {
          icon = 'helpCircle';
        } else if (feature.id === 'canvas-webhook') {
          icon = 'database';
        }
        
        menuItems.push({
          id: `menu-${feature.id}`,
          label: feature.name,
          action: `feature:${feature.id}`,
          featureId: feature.id,
          icon: icon, // 全局功能图标
          disabled: !enabledFeatureIds.has(feature.id)
        });
      });
    }
    
    return menuItems;
  }

  /**
   * 根据当前模型和功能选择生成菜单配置
   * Generate menu configuration based on current model and feature selection
   */
  generateMenuConfigForModel(model: string, featureIds: string[], configName: string = '自动生成配置', menuType: 'floating' | 'context' = 'floating'): MenuConfig {
    // 只生成指定类型的菜单项
    const menuItems = this.generateMenuItemsForModel(model, featureIds, menuType);
    
    // Generate a more unique ID to avoid conflicts in tests
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return {
      id: `auto-${timestamp}-${randomSuffix}`,
      name: configName,
      description: `基于模型 ${model} 自动生成的菜单配置`,
      createdAt: timestamp,
      updatedAt: timestamp,
      type: menuType,
      items: menuItems,
      active: true
    };
  }

  /**
   * 一键装配当前模型可用的所有功能
   * One-click assembly of all features available for current model
   */
  assembleAllFeaturesForModel(model: string): string[] {
    const allFeatures = this.getFeatures();
    return allFeatures
      .filter(f => f.requiredModels.length === 0 || f.requiredModels.includes(model))
      .map(f => f.id);
  }

  /**
   * 清除所有配置
   * Clear all configurations
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.FEATURES_KEY);
      localStorage.removeItem(this.CURRENT_CONFIG_KEY);
    } catch (error) {
      console.error('Failed to clear all menu configs:', error);
      throw error;
    }
  }

  /**
   * 清理旧配置，保留最近的10个
   * Clean up old configurations, keep the most recent 10
   */
  private cleanupOldConfigs(): void {
    try {
      const allConfigs = this.getAllConfigs();
      if (allConfigs.length <= 10) return;
      
      // 按更新时间排序，保留最新的10个
      const sortedConfigs = allConfigs.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const configsToKeep = sortedConfigs.slice(0, 10);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configsToKeep));
      console.log(`Cleaned up ${allConfigs.length - configsToKeep.length} old menu configurations`);
    } catch (error) {
      console.error('Failed to cleanup old configs:', error);
    }
  }
}

/**
 * 创建MenuConfigManager实例
 * Create MenuConfigManager instance
 */
export const menuConfigManager = new MenuConfigManager();