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

  // Default base URLs
  const defaultBaseUrls: Record<ProviderType, string> = {
    google: 'https://generativelanguage.googleapis.com',
    'openai-compatible': 'https://api.openai.com/v1',
    shenma: 'https://hk-api.gptbest.vip',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4'
  };

  // Default models
  const defaultModels: Record<ProviderType, { text: string; image: string; video: string }> = {
    google: {
      text: 'gemini-2.0-flash-exp',
      image: 'nano-banana-hd',
      video: 'sora_video2'
    },
    'openai-compatible': {
      text: 'gpt-4o',
      image: 'dall-e-3',
      video: ''
    },
    shenma: {
      text: 'gemini-2.0-flash-exp',
      image: 'nano-banana-2',
      video: 'sora_video2-portrait'
    },
    zhipu: {
      text: 'GLM-4-Flash',
      image: 'CogView-3-Plus',
      video: 'cogvideox-3'
    }
  };

  const updateProviderCredentials = (provider: ProviderType, field: 'apiKey' | 'baseUrl' | 'enabled', value: string | boolean) => {
    const newConfig = { ...config };
    
    // If enabling, disable all others first
    if (field === 'enabled' && value === true) {
      Object.keys(newConfig.providers).forEach(providerKey => {
        const providerType = providerKey as ProviderType;
        if (newConfig.providers[providerType]) {
          newConfig.providers[providerType].enabled = false;
        }
      });
    }
    
    // Update current provider
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
    
    // Auto-set default models when enabling
    if (field === 'enabled' && value === true) {
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

  const getProviderUrl = (provider: ProviderType): string => {
    const urls = {
      google: 'https://ai.google.dev/',
      'openai-compatible': 'https://openai.com/api',
      shenma: 'https://api.whatai.cc/register?aff=oKr965434',
      zhipu: 'https://open.bigmodel.cn/'
    };
    return urls[provider];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900 dark:text-white">API配置详情</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {/* Quick Guide */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-6">
          <h4 className="text-lg font-black text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
            <span className="text-2xl">📖</span>
            快速配置指南
          </h4>
          <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <p><strong>1️⃣ 选择提供商</strong> - 点击链接图标访问官网获取密钥</p>
            <p><strong>2️⃣ 配置密钥</strong> - 填写API密钥和URL，点击单选启用该提供商</p>
            <p><strong>3️⃣ 开始使用</strong> - 系统自动为所有模态配置最佳模型</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl p-6">
          <h4 className="text-lg font-black text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
            <span className="text-2xl">💬</span>
            联系我们
          </h4>
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

        {/* Provider Configuration */}
        <div>
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-4">
            提供商配置
          </h4>
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
                      <h5 className="font-black text-gray-900 dark:text-white">
                        {providerNames[provider]}
                      </h5>
                      {/* Official Website Link */}
                      <a 
                        href={getProviderUrl(provider)}
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
                        className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {/* API Test Button */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!creds?.apiKey?.trim()) {
                              alert('请先输入API密钥');
                              return;
                            }
                            
                            setTestingProvider(provider);
                            setTestResults(prev => ({ ...prev, [provider]: null }));
                            
                            try {
                              // Simple test request based on provider
                              let testSuccess = false;
                              
                              if (provider === 'google') {
                                // Test Google Gemini API
                                const response = await fetch(`${creds.baseUrl || defaultBaseUrls[provider]}/v1beta/models?key=${creds.apiKey}`);
                                testSuccess = response.ok;
                              } else if (provider === 'openai-compatible') {
                                // Test OpenAI Compatible API
                                const response = await fetch(`${creds.baseUrl || defaultBaseUrls[provider]}/models`, {
                                  headers: { 'Authorization': `Bearer ${creds.apiKey}` }
                                });
                                testSuccess = response.ok;
                              } else if (provider === 'shenma') {
                                // Test ShenmaAPI
                                const response = await fetch(`${creds.baseUrl || defaultBaseUrls[provider]}/v1/models`, {
                                  headers: { 'Authorization': `Bearer ${creds.apiKey}` }
                                });
                                testSuccess = response.ok;
                              } else if (provider === 'zhipu') {
                                // Test Zhipu API
                                const response = await fetch(`${creds.baseUrl || defaultBaseUrls[provider]}/models`, {
                                  headers: { 'Authorization': `Bearer ${creds.apiKey}` }
                                });
                                testSuccess = response.ok;
                              }
                              
                              setTestResults(prev => ({ 
                                ...prev, 
                                [provider]: testSuccess ? 'success' : 'error' 
                              }));
                              
                            } catch (error) {
                              console.error('API test failed:', error);
                              setTestResults(prev => ({ ...prev, [provider]: 'error' }));
                            } finally {
                              setTestingProvider(null);
                            }
                          }}
                          disabled={testingProvider === provider || !creds?.apiKey?.trim()}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                          title="测试API连接"
                        >
                          {testingProvider === provider ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          ) : testResults[provider] === 'success' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : testResults[provider] === 'error' ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : (
                            <Zap className="w-4 h-4 text-blue-500" />
                          )}
                        </button>
                        
                        {/* Eye Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleApiKeyVisibility(provider)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                          title={showApiKeys[provider] ? '隐藏密钥' : '显示密钥'}
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

        {/* Current Configuration */}
        <div>
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-4">
            当前配置
          </h4>
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
                      <h5 className="font-black text-gray-900 dark:text-white mb-1">
                        {modalityNames[modality]}
                      </h5>
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
              • <strong>神马API</strong>：图片用nano-banana-2最新版，视频用sora2系列<br />
              • <strong>智谱</strong>：国产模型，性价比高
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIProviderConfig;