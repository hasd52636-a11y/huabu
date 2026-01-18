import React, { useState } from 'react';
import { Key, Globe, Check, X, Loader2, Eye, EyeOff, Zap, ExternalLink } from 'lucide-react';
import { NewModelConfig, ProviderType, ModalityConfig } from '../types';

interface APIProviderConfigProps {
  config: NewModelConfig;
  onUpdateConfig: (config: NewModelConfig) => void;
  onClose: () => void;
}

const APIProviderConfig: React.FC<APIProviderConfigProps> = ({
  config,
  onUpdateConfig,
  onClose
}) => {
  const [showApiKeys, setShowApiKeys] = useState<Record<ProviderType, boolean>>({
    google: false,
    'openai-compatible': false,
    shenma: false,
    zhipu: false
  });

  const [testingProvider, setTestingProvider] = useState<ProviderType | null>(null);
  const [testResults, setTestResults] = useState<Record<ProviderType, 'success' | 'error' | null>>({
    google: null,
    'openai-compatible': null,
    shenma: null,
    zhipu: null
  });

  // Provider display names
  const providerNames: Record<ProviderType, string> = {
    google: 'Google Gemini',
    'openai-compatible': 'OpenAI Compatible',
    shenma: '神马API',
    zhipu: '智谱AI'
  };

  // Default base URLs - 以Canvas为准，神马使用香港API地址
  const defaultBaseUrls: Record<ProviderType, string> = {
    google: 'https://generativelanguage.googleapis.com',
    'openai-compatible': 'https://api.openai.com/v1',
    shenma: 'https://hk-api.gptbest.vip',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4'
  };

  // 默认模型配置 - 基于实际使用需求更新最优模型
  const defaultModels: Record<ProviderType, { text: string; image: string; video: string }> = {
    google: {
      text: 'gemini-2.0-flash-exp',
      image: 'imagen-3.0-generate-001',
      video: 'veo-3.1-fast-generate-preview'
    },
    'openai-compatible': {
      text: 'gpt-4o',
      image: 'dall-e-3',
      video: ''
    },
    shenma: {
      text: 'gemini-2.0-flash-exp', // 神马API的Gemini作为主选
      image: 'nano-banana-2', // 使用Nano Banana 2最新版作为默认图像生成模型
      video: 'sora_video2-portrait' // 保持Sora竖屏作为默认，支持角色选择功能
    },
    zhipu: {
      text: 'GLM-4-Flash',
      image: 'CogView-3-Plus',
      video: 'cogvideox-3' // 智谱最强视频生成模型
    }
  };

  // Model options for each provider with recommended defaults - 基于shenmaAPI文档更新
  const modelOptions: Record<ProviderType, { text: string[]; image: string[]; video: string[] }> = {
    google: {
      text: ['gemini-2.0-flash-exp', 'gemini-3-flash-preview', 'gemini-3-pro-preview'],
      image: ['imagen-3.0-generate-001', 'gemini-3-pro-image-preview'],
      video: ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview']
    },
    'openai-compatible': {
      text: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      image: ['dall-e-3', 'dall-e-2'],
      video: []
    },
    shenma: {
      // 基于shenmaAPI文档和sora2API文档的实际可用模型
      text: ['gemini-2.0-flash-exp', 'gemini-2.5-pro', 'gemini-2.5-pro-preview-05-06', 'gpt-4o', 'gpt-4o-2024-08-06', 'gpt-4-turbo'],
      image: ['nano-banana', 'nano-banana-hd', 'nano-banana-2', 'gpt-4o-image', 'high-quality', 'byteedit-v2.0'], // 神马API支持Nano Banana系列、gpt-4o-image和Volc高级模型
      video: ['veo3.1', 'veo3.1-pro', 'veo3', 'veo3-fast', 'veo3-pro', 'veo2', 'veo2-fast', 'sora_video2', 'sora_video2-portrait', 'sora_video2-landscape', 'sora_video2-portrait-hd', 'sora_video2-portrait-15s', 'sora_video2-portrait-hd-15s', 'sora-2', 'sora-2-pro']
    },
    zhipu: {
      text: ['GLM-4-Flash', 'GLM-4-Plus', 'GLM-4-Air'],
      image: ['CogView-3-Plus', 'CogView-3-Flash'],
      video: ['cogvideox-3', 'CogVideoX-Flash', 'CogVideoX-2', 'viduq1-image'] // 基于zhipuAPI文档的实际可用模型
    }
  };

  // Model descriptions to help users choose - 基于shenmaAPI文档更新
  const getModelDescription = (modelId: string, provider: ProviderType): string => {
    const descriptions: Record<string, Record<ProviderType, string>> = {
      // Gemini models - 神马API支持的Gemini模型
      'gemini-2.0-flash-exp': {
        google: '推荐 - Google原生Gemini，最新快速模型',
        shenma: '推荐 - 神马API的Gemini 2.0，多模态能力强',
        'openai-compatible': '最新快速模型，性价比高',
        zhipu: '最新快速模型，性价比高'
      },
      'gemini-2.5-pro': {
        google: 'Gemini 2.5 Pro版本',
        shenma: '神马API的Gemini 2.5 Pro，高质量输出',
        'openai-compatible': 'Gemini 2.5 Pro版本',
        zhipu: 'Gemini 2.5 Pro版本'
      },
      'gemini-2.5-pro-preview-05-06': {
        google: 'Gemini 2.5 Pro预览版',
        shenma: '神马API的Gemini 2.5 Pro预览版，支持视频分析',
        'openai-compatible': 'Gemini 2.5 Pro预览版',
        zhipu: 'Gemini 2.5 Pro预览版'
      },
      'gemini-3-flash-preview': {
        google: '快速响应，适合日常使用',
        shenma: '神马API的Gemini 3 Flash预览版',
        'openai-compatible': '快速响应，适合日常使用',
        zhipu: '快速响应，适合日常使用'
      },
      'gemini-3-pro-preview': {
        google: '高质量输出，适合专业场景',
        shenma: '神马API的Gemini 3 Pro预览版',
        'openai-compatible': '高质量输出，适合专业场景',
        zhipu: '高质量输出，适合专业场景'
      },
      
      // GPT models - 神马API支持的GPT模型
      'gpt-4o': {
        google: '最强大的模型',
        shenma: '神马API的GPT-4o，备选文本模型',
        'openai-compatible': '推荐 - 最强大的模型',
        zhipu: '最强大的模型'
      },
      'gpt-4o-2024-08-06': {
        google: 'GPT-4o特定版本',
        shenma: '神马API的GPT-4o 2024-08-06版本，支持结构化输出',
        'openai-compatible': 'GPT-4o特定版本',
        zhipu: 'GPT-4o特定版本'
      },
      'gpt-4-turbo': {
        google: '快速且强大',
        shenma: '神马API的GPT-4 Turbo',
        'openai-compatible': '快速且强大',
        zhipu: '快速且强大'
      },
      'gpt-3.5-turbo': {
        google: '经济实惠',
        shenma: '神马API的GPT-3.5',
        'openai-compatible': '经济实惠',
        zhipu: '经济实惠'
      },
      
      // 神马API图片生成模型 - Nano Banana系列
      'nano-banana': {
        google: 'Nano Banana标准版',
        shenma: '推荐 - 神马API的Nano Banana标准版，高质量图像生成',
        'openai-compatible': 'Nano Banana标准版',
        zhipu: 'Nano Banana标准版'
      },
      'nano-banana-hd': {
        google: 'Nano Banana高清版',
        shenma: '神马API的Nano Banana HD版，超高质量图像生成',
        'openai-compatible': 'Nano Banana高清版',
        zhipu: 'Nano Banana高清版'
      },
      'nano-banana-2': {
        google: 'Nano Banana最新版',
        shenma: '神马API的Nano Banana 2最新版，支持多分辨率(1K/2K/4K)，最先进的图像生成',
        'openai-compatible': 'Nano Banana最新版',
        zhipu: 'Nano Banana最新版'
      },
      'gpt-4o-image': {
        google: 'GPT-4o图片生成',
        shenma: '神马API的GPT-4o图像生成模型，支持生成和修改图片',
        'openai-compatible': 'GPT-4o图片生成',
        zhipu: 'GPT-4o图片生成'
      },
      
      // 神马API视频生成模型 - Sora系列
      'sora_video2': {
        google: 'Sora视频生成',
        shenma: '标准Sora视频生成',
        'openai-compatible': 'Sora视频生成',
        zhipu: 'Sora视频生成'
      },
      'sora_video2-portrait': {
        google: '竖屏视频（9:16）',
        shenma: '推荐 - Sora竖屏视频（9:16），适合手机观看',
        'openai-compatible': '竖屏视频（9:16）',
        zhipu: '竖屏视频（9:16）'
      },
      'sora_video2-landscape': {
        google: '横屏视频（16:9）',
        shenma: 'Sora横屏视频（16:9），适合电脑观看',
        'openai-compatible': '横屏视频（16:9）',
        zhipu: '横屏视频（16:9）'
      },
      'sora_video2-portrait-hd': {
        google: '高清竖屏视频',
        shenma: 'Sora高清竖屏视频，生成时间较长',
        'openai-compatible': '高清竖屏视频',
        zhipu: '高清竖屏视频'
      },
      'sora_video2-portrait-15s': {
        google: '15秒竖屏视频',
        shenma: 'Sora 15秒竖屏视频，Pro版本',
        'openai-compatible': '15秒竖屏视频',
        zhipu: '15秒竖屏视频'
      },
      'sora_video2-portrait-hd-15s': {
        google: '15秒高清竖屏视频',
        shenma: 'Sora 15秒高清竖屏视频，最高质量但生成很慢',
        'openai-compatible': '15秒高清竖屏视频',
        zhipu: '15秒高清竖屏视频'
      },
      'sora-2': {
        google: 'Sora 2标准版',
        shenma: 'Sora 2标准版，支持10秒视频',
        'openai-compatible': 'Sora 2标准版',
        zhipu: 'Sora 2标准版'
      },
      'sora-2-pro': {
        google: 'Sora 2 Pro版',
        shenma: 'Sora 2 Pro版，支持15s/25s和高清',
        'openai-compatible': 'Sora 2 Pro版',
        zhipu: 'Sora 2 Pro版'
      },
      
      // Google specific models
      'imagen-3.0-generate-001': {
        google: '推荐 - 最新图像生成模型',
        shenma: '最新图像生成模型',
        'openai-compatible': '最新图像生成模型',
        zhipu: '最新图像生成模型'
      },
      'gemini-3-pro-image-preview': {
        google: '高质量图像生成',
        shenma: '高质量图像生成',
        'openai-compatible': '高质量图像生成',
        zhipu: '高质量图像生成'
      },
      'veo-3.1-fast-generate-preview': {
        google: '推荐 - 快速视频生成',
        shenma: '快速视频生成',
        'openai-compatible': '快速视频生成',
        zhipu: '快速视频生成'
      },
      'veo-3.1-generate-preview': {
        google: '高质量视频生成',
        shenma: '高质量视频生成',
        'openai-compatible': '高质量视频生成',
        zhipu: '高质量视频生成'
      },
      
      // OpenAI specific models
      'dall-e-3': {
        google: '最新图像生成',
        shenma: '最新图像生成',
        'openai-compatible': '推荐 - 最新图像生成',
        zhipu: '最新图像生成'
      },
      'dall-e-2': {
        google: '经典图像生成',
        shenma: '经典图像生成',
        'openai-compatible': '经典图像生成',
        zhipu: '经典图像生成'
      },
      
      // Zhipu specific models
      'GLM-4-Flash': {
        google: '快速响应',
        shenma: '快速响应',
        'openai-compatible': '快速响应',
        zhipu: '推荐 - 快速响应'
      },
      'GLM-4-Plus': {
        google: '高质量输出',
        shenma: '高质量输出',
        'openai-compatible': '高质量输出',
        zhipu: '高质量输出'
      },
      'GLM-4-Air': {
        google: '轻量级模型',
        shenma: '轻量级模型',
        'openai-compatible': '轻量级模型',
        zhipu: '轻量级模型'
      },
      'CogView-3-Plus': {
        google: '高质量图像',
        shenma: '高质量图像',
        'openai-compatible': '高质量图像',
        zhipu: '推荐 - 高质量图像'
      },
      'CogView-3-Flash': {
        google: '快速图像生成',
        shenma: '快速图像生成',
        'openai-compatible': '快速图像生成',
        zhipu: '快速图像生成'
      },
      'CogVideoX-Pro': {
        google: '专业视频生成',
        shenma: '专业视频生成',
        'openai-compatible': '专业视频生成',
        zhipu: '专业视频生成（已弃用）'
      },
      'CogVideoX-Flash': {
        google: '快速视频生成',
        shenma: '快速视频生成',
        'openai-compatible': '快速视频生成',
        zhipu: '免费视频生成模型'
      },
      'cogvideox-3': {
        google: '最强视频生成',
        shenma: '最强视频生成',
        'openai-compatible': '最强视频生成',
        zhipu: '推荐 - 智谱最强视频生成模型，支持图生、文生、首尾帧生成'
      },
      'CogVideoX-2': {
        google: '视频生成',
        shenma: '视频生成',
        'openai-compatible': '视频生成',
        zhipu: '支持主体大幅运动，可驾驭多种艺术风格'
      },
      'viduq1-image': {
        google: '图片生成视频',
        shenma: '图片生成视频',
        'openai-compatible': '图片生成视频',
        zhipu: '图片生成视频专用模型'
      },
      
      // 神马API视频生成模型 - Veo系列（Google最新）
      'veo3.1': {
        google: 'Veo 3.1视频生成',
        shenma: '推荐 - Google最新高级AI模型，快速模式，支持视频自动配套音频生成，质量高价格低',
        'openai-compatible': 'Veo 3.1视频生成',
        zhipu: 'Veo 3.1视频生成'
      },
      'veo3.1-pro': {
        google: 'Veo 3.1 Pro视频生成',
        shenma: 'Google最新高级AI模型，高质量模式，支持视频自动配套音频生成，质量超高',
        'openai-compatible': 'Veo 3.1 Pro视频生成',
        zhipu: 'Veo 3.1 Pro视频生成'
      },
      'veo3': {
        google: 'Veo 3视频生成',
        shenma: 'Google Veo 3标准版',
        'openai-compatible': 'Veo 3视频生成',
        zhipu: 'Veo 3视频生成'
      },
      'veo3-fast': {
        google: 'Veo 3快速版',
        shenma: 'Google Veo 3快速版，生成速度快',
        'openai-compatible': 'Veo 3快速版',
        zhipu: 'Veo 3快速版'
      },
      'veo3-pro': {
        google: 'Veo 3专业版',
        shenma: 'Google Veo 3专业版，质量更高',
        'openai-compatible': 'Veo 3专业版',
        zhipu: 'Veo 3专业版'
      },
      'veo2': {
        google: 'Veo 2视频生成',
        shenma: 'Google Veo 2标准版',
        'openai-compatible': 'Veo 2视频生成',
        zhipu: 'Veo 2视频生成'
      },
      'veo2-fast': {
        google: 'Veo 2快速版',
        shenma: 'Google Veo 2快速版，生成速度快',
        'openai-compatible': 'Veo 2快速版',
        zhipu: 'Veo 2快速版'
      },
    };
    
    return descriptions[modelId]?.[provider] || modelId;
  };

  const updateProviderCredentials = (provider: ProviderType, field: 'apiKey' | 'baseUrl' | 'enabled', value: string | boolean) => {
    const newConfig = { ...config };
    
    // 如果是启用操作，先禁用所有其他提供商
    if (field === 'enabled' && value === true) {
      // 禁用所有提供商
      Object.keys(newConfig.providers).forEach(providerKey => {
        const providerType = providerKey as ProviderType;
        if (newConfig.providers[providerType]) {
          newConfig.providers[providerType].enabled = false;
        }
      });
    }
    
    // 更新当前提供商的配置
    if (!newConfig.providers[provider]) {
      newConfig.providers[provider] = {
        apiKey: '',
        baseUrl: defaultBaseUrls[provider],
        enabled: false
      };
    }
    newConfig.providers[provider] = {
      ...newConfig.providers[provider],
      [field]: value
    };
    
    // 当启用提供商时，自动设置默认模型
    if (field === 'enabled' && value === true) {
      // 为每个模态自动选择该提供商的默认模型
      (['text', 'image', 'video'] as const).forEach(modality => {
        const defaultModel = defaultModels[provider][modality];
        if (defaultModel) {
          newConfig[modality] = {
            provider: provider,
            modelId: defaultModel
          };
        }
      });
    }
    
    onUpdateConfig(newConfig);
  };

  const updateModalityConfig = (modality: 'text' | 'image' | 'video', field: 'provider' | 'modelId', value: string) => {
    const newConfig = { ...config };
    newConfig[modality] = {
      ...newConfig[modality],
      [field]: value
    };
    onUpdateConfig(newConfig);
  };

  const toggleApiKeyVisibility = (provider: ProviderType) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const isProviderConfigured = (provider: ProviderType): boolean => {
    const creds = config.providers[provider];
    return !!(creds && creds.apiKey && creds.apiKey.trim() && creds.enabled);
  };

  const maskApiKey = (apiKey: string): string => {
    if (!apiKey || apiKey.length < 8) return '••••••••';
    return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
  };

  // API测试功能
  const testApiConnection = async (provider: ProviderType) => {
    const creds = config.providers[provider];
    if (!creds || !creds.apiKey || !creds.baseUrl) {
      alert('请先填写API密钥和Base URL');
      return;
    }

    setTestingProvider(provider);
    setTestResults(prev => ({ ...prev, [provider]: null }));

    try {
      // 根据不同提供商使用不同的测试端点
      let testEndpoint = '';
      let testBody: any = {};
      let testHeaders: any = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.apiKey}`
      };

      if (provider === 'google') {
        // Google Gemini测试
        testEndpoint = `${creds.baseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent`;
        testBody = {
          contents: [{
            parts: [{ text: 'Hello' }]
          }]
        };
      } else if (provider === 'shenma') {
        // 神马API测试
        testEndpoint = `${creds.baseUrl}/v1/chat/completions`;
        testBody = {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        };
      } else if (provider === 'zhipu') {
        // 智谱API测试
        testEndpoint = `${creds.baseUrl}/chat/completions`;
        testBody = {
          model: 'GLM-4-Flash',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        };
      } else {
        // OpenAI兼容测试
        testEndpoint = `${creds.baseUrl}/v1/chat/completions`;
        testBody = {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        };
      }

      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: testHeaders,
        body: JSON.stringify(testBody)
      });

      if (response.ok) {
        setTestResults(prev => ({ ...prev, [provider]: 'success' }));
        setTimeout(() => {
          setTestResults(prev => ({ ...prev, [provider]: null }));
        }, 3000);
      } else {
        const errorText = await response.text();
        console.error(`[API Test] ${provider} failed:`, response.status, errorText);
        setTestResults(prev => ({ ...prev, [provider]: 'error' }));
        alert(`测试失败 (${response.status}): ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error(`[API Test] ${provider} error:`, error);
      setTestResults(prev => ({ ...prev, [provider]: 'error' }));
      alert(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">API配置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Quick Guide and Contact Information - Side by Side */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Quick Guide */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 flex-1">
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">📖</span>
                快速配置指南
              </h3>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <p><strong>1️⃣ 选择提供商</strong> - 点击链接图标访问官网获取密钥</p>
                <p><strong>2️⃣ 配置密钥</strong> - 填写API密钥和URL，点击单选启用该提供商</p>
                <p><strong>3️⃣ 开始使用</strong> - 系统自动为所有模态配置最佳模型</p>
                <p className="pl-8 text-xs opacity-90">💡 同一时间只能启用一个提供商，系统智能切换内部模型</p>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl p-6 flex-1">
              <h3 className="text-lg font-black text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">💬</span>
                联系我们
              </h3>
              <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📱</span>
                  <span>微信：<strong className="text-green-600 dark:text-green-400">wirelesscharger</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">💻</span>
                  <span>QQ：<strong className="text-green-600 dark:text-green-400">909599954</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Provider Configuration */}
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
              提供商配置
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              为每个AI提供商配置API密钥和Base URL（只需配置一次）
            </p>

            <div className="space-y-6">
              {(Object.keys(providerNames) as ProviderType[]).map(provider => {
                const creds = config.providers[provider];
                const isConfigured = isProviderConfigured(provider);

                return (
                  <div
                key={provider}
                className={`border border-gray-200 dark:border-gray-700 rounded-3xl p-6 space-y-4 transition-all duration-200 ${creds?.enabled ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 dark:bg-amber-900/10' : ''}`}
              >
                {/* Provider Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <h4 className="font-black text-gray-900 dark:text-white">
                      {providerNames[provider]}
                    </h4>
                    {/* Official Website Link */}
                    <a 
                      href={{
                        google: 'https://ai.google.dev/',
                        'openai-compatible': 'https://openai.com/api',
                        shenma: 'https://api.whatai.cc/register?aff=oKr965434',
                        zhipu: 'https://open.bigmodel.cn/'
                      }[provider]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                      title="访问官方网站获取API密钥"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </a>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{creds?.enabled ? '已启用' : '启用'}</span>
                    <input
                      type="radio"
                      name="api-provider"
                      checked={creds?.enabled || false}
                      onChange={(e) => updateProviderCredentials(provider, 'enabled', e.target.checked)}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-gray-300"
                    />
                  </label>
                </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        <Key className="w-4 h-4 inline mr-1" />
                        API密钥
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys[provider] ? 'text' : 'password'}
                          value={creds?.apiKey || ''}
                          onChange={(e) => updateProviderCredentials(provider, 'apiKey', e.target.value)}
                          placeholder="输入API密钥"
                          className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {/* 测试按钮 */}
                          {creds?.apiKey && creds?.baseUrl && (
                            <button
                              type="button"
                              onClick={() => testApiConnection(provider)}
                              disabled={testingProvider === provider}
                              className={`p-1.5 rounded-full transition-colors ${
                                testResults[provider] === 'success'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                  : testResults[provider] === 'error'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                              }`}
                              title="测试连接"
                            >
                              {testingProvider === provider ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : testResults[provider] === 'success' ? (
                                <Check className="w-4 h-4" />
                              ) : testResults[provider] === 'error' ? (
                                <X className="w-4 h-4" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {/* 显示/隐藏按钮 */}
                          <button
                            type="button"
                            onClick={() => toggleApiKeyVisibility(provider)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                          >
                            {showApiKeys[provider] ? (
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      {creds?.apiKey && !showApiKeys[provider] && (
                        <p className="text-xs text-gray-500 mt-1">
                          当前密钥: {maskApiKey(creds.apiKey)}
                        </p>
                      )}
                    </div>

                    {/* Base URL */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={creds?.baseUrl || defaultBaseUrls[provider]}
                        onChange={(e) => updateProviderCredentials(provider, 'baseUrl', e.target.value)}
                        placeholder={defaultBaseUrls[provider]}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Modality Selection - 简化版，自动配置 */}
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
              当前配置
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              系统已自动为您选择最优模型配置。启用提供商后，将自动应用以下配置：
            </p>

            <div className="space-y-4">
              {(['text', 'image', 'video'] as const).map(modality => {
                const modalityConfig = config[modality];
                const modalityNames = { text: '文本生成', image: '图片生成', video: '视频生成' };
                const isConfigured = isProviderConfigured(modalityConfig.provider);

                return (
                  <div
                    key={modality}
                    className="border border-gray-200 dark:border-gray-700 rounded-3xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-gray-900 dark:text-white mb-1">
                          {modalityNames[modality]}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isConfigured ? (
                            <>
                              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                              {' '}使用 {providerNames[modalityConfig.provider]} - {modalityConfig.modelId}
                            </>
                          ) : (
                            <>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">⚠</span>
                              {' '}请先配置并启用 {providerNames[modalityConfig.provider]}
                            </>
                          )}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 智能配置说明：</strong><br />
                • <strong>Gemini</strong>：文本、图片、视频全能，推荐首选<br />
                • <strong>GPT-4o</strong>：文本理解能力强，作为备选<br />
                • <strong>神马API</strong>：图片用nano-banana-2最新版（支持多分辨率），视频用sora2系列（支持竖屏/横屏/高清）<br />
                • <strong>智谱</strong>：国产模型，性价比高<br />
                • <strong>Nano Banana系列</strong>：nano-banana（标准）、nano-banana-hd（4K高清）、nano-banana-2（最新版支持1K/2K/4K）<br />
                • <strong>Sora视频</strong>：支持多种格式（竖屏适合手机，横屏适合电脑，HD高清但生成慢）
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            配置将自动保存到本地存储
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-3xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIProviderConfig;
