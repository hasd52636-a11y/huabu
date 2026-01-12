import React from 'react';
import { 
  Key, ShieldCheck, ExternalLink, AlertCircle, 
  CheckCircle, Loader2, TestTube
} from 'lucide-react';
import { ProviderType, ProviderSettings } from '../types';

interface APIProviderConfigProps {
  activeTab: 'text' | 'image' | 'video';
  settings: ProviderSettings;
  onUpdateSettings: (updates: Partial<ProviderSettings>) => void;
  onTestConnection?: (provider: ProviderType) => Promise<boolean>;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const APIProviderConfig: React.FC<APIProviderConfigProps> = ({
  activeTab,
  settings,
  onUpdateSettings,
  onTestConnection,
  theme,
  lang
}) => {
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const t = {
    zh: {
      providerType: '提供商类型',
      modelId: '模型ID',
      baseUrl: '基础URL',
      apiKey: 'API密钥',
      testConnection: '测试连接',
      testing: '测试中...',
      connectionSuccess: '连接成功',
      connectionFailed: '连接失败',
      providers: {
        google: 'Google AI',
        'openai-compatible': 'OpenAI兼容',
        zhipu: '智谱AI',
        shenma: '神马AI'
      },
      descriptions: {
        google: 'Gemini, Imagen, Veo',
        'openai-compatible': 'Qwen, DeepSeek, 本地LLM',
        zhipu: 'GLM-4, CogView, CogVideo',
        shenma: '对话, nano-banana, sora2'
      },
      placeholders: {
        modelId: {
          text: 'e.g. gemini-3-flash-preview',
          image: 'e.g. gemini-3-pro-image-preview', 
          video: 'e.g. veo-3.1-fast-generate-preview'
        },
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-...'
      },
      zhipuModels: {
        text: 'GLM-4-Flash, GLM-4-Plus',
        image: 'CogView-3-Flash',
        video: 'CogVideoX-Flash'
      },
      shenmaModels: {
        text: 'gpt-4o, gpt-4o-mini',
        image: 'nano-banana',
        video: 'sora_video2'
      }
    },
    en: {
      providerType: 'Provider Type',
      modelId: 'Model ID',
      baseUrl: 'Base URL',
      apiKey: 'API Key',
      testConnection: 'Test Connection',
      testing: 'Testing...',
      connectionSuccess: 'Connection Success',
      connectionFailed: 'Connection Failed',
      providers: {
        google: 'Google AI',
        'openai-compatible': 'OpenAI Compatible',
        zhipu: 'Zhipu AI',
        shenma: 'Shenma AI'
      },
      descriptions: {
        google: 'Gemini, Imagen, Veo',
        'openai-compatible': 'Qwen, DeepSeek, Local LLM',
        zhipu: 'GLM-4, CogView, CogVideo',
        shenma: 'Chat, nano-banana, sora2'
      },
      placeholders: {
        modelId: {
          text: 'e.g. gemini-3-flash-preview',
          image: 'e.g. gemini-3-pro-image-preview',
          video: 'e.g. veo-3.1-fast-generate-preview'
        },
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-...'
      },
      zhipuModels: {
        text: 'GLM-4-Flash, GLM-4-Plus',
        image: 'CogView-3-Flash', 
        video: 'CogVideoX-Flash'
      },
      shenmaModels: {
        text: 'gpt-4o, gpt-4o-mini',
        image: 'nano-banana',
        video: 'sora_video2'
      }
    }
  }[lang];

  const providers: ProviderType[] = ['google', 'openai-compatible', 'zhipu', 'shenma'];

  const handleTestConnection = async () => {
    if (!onTestConnection) return;
    
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      const success = await onTestConnection(settings.provider);
      setConnectionStatus(success ? 'success' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getDefaultModelId = (provider: ProviderType, type: 'text' | 'image' | 'video') => {
    const defaults = {
      google: {
        text: 'gemini-3-flash-preview',
        image: 'gemini-3-pro-image-preview',
        video: 'veo-3.1-fast-generate-preview'
      },
      'openai-compatible': {
        text: 'qwen-plus',
        image: 'dall-e-3',
        video: 'sora-1'
      },
      zhipu: {
        text: 'GLM-4-Flash',
        image: 'CogView-3-Flash',
        video: 'CogVideoX-Flash'
      },
      shenma: {
        text: 'gpt-4o',
        image: 'nano-banana',
        video: 'sora_video2'
      }
    };
    return defaults[provider][type];
  };

  const handleProviderChange = (provider: ProviderType) => {
    onUpdateSettings({
      provider,
      modelId: getDefaultModelId(provider, activeTab),
      // Clear API key and base URL when switching providers
      ...(provider === 'google' ? { apiKey: undefined, baseUrl: undefined } : {})
    });
    setConnectionStatus('idle');
  };

  const needsApiKey = settings.provider !== 'google';
  const needsBaseUrl = settings.provider === 'openai-compatible' || settings.provider === 'zhipu' || settings.provider === 'shenma';

  return (
    <div className="space-y-8">
      {/* Provider Selection */}
      <div className="space-y-4">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {t.providerType}
        </label>
        <div className="grid grid-cols-2 gap-4">
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => handleProviderChange(provider)}
              className={`p-6 rounded-3xl border-4 transition-all hover:scale-105 active:scale-95 flex flex-col gap-3 ${
                settings.provider === provider
                  ? 'border-amber-500 bg-amber-500/5 shadow-xl'
                  : 'border-black/5 dark:border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <span className="font-black text-lg">{t.providers[provider]}</span>
              <span className="text-[9px] uppercase opacity-60 font-bold">
                {t.descriptions[provider]}
              </span>
              {settings.provider === provider && (
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white mx-auto">
                  <CheckCircle size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Model ID */}
      <div className="space-y-4">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          {t.modelId}
        </label>
        <input
          type="text"
          value={settings.modelId}
          onChange={(e) => onUpdateSettings({ modelId: e.target.value })}
          className={`w-full p-6 text-xl font-bold bg-black/5 dark:bg-white/5 border-2 rounded-3xl outline-none focus:border-amber-500 transition-all ${
            theme === 'dark' ? 'border-white/10' : 'border-black/5'
          }`}
          placeholder={t.placeholders.modelId[activeTab]}
        />
        {(settings.provider === 'zhipu' || settings.provider === 'shenma') && (
          <div className="text-[10px] text-slate-500 font-bold p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
            <strong>推荐模型:</strong> {settings.provider === 'zhipu' ? t.zhipuModels[activeTab] : t.shenmaModels[activeTab]}
          </div>
        )}
      </div>

      {/* Base URL (for compatible providers) */}
      {needsBaseUrl && (
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            {t.baseUrl}
          </label>
          <input
            type="text"
            value={settings.baseUrl || ''}
            onChange={(e) => onUpdateSettings({ baseUrl: e.target.value })}
            className={`w-full p-6 text-xl font-bold bg-black/5 dark:bg-white/5 border-2 rounded-3xl outline-none focus:border-amber-500 transition-all ${
              theme === 'dark' ? 'border-white/10' : 'border-black/5'
            }`}
            placeholder={t.placeholders.baseUrl}
          />
        </div>
      )}

      {/* API Key */}
      {needsApiKey && (
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            {t.apiKey}
          </label>
          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
            className={`w-full p-6 text-xl font-bold bg-black/5 dark:bg-white/5 border-2 rounded-3xl outline-none focus:border-amber-500 transition-all ${
              theme === 'dark' ? 'border-white/10' : 'border-black/5'
            }`}
            placeholder={t.placeholders.apiKey}
          />
        </div>
      )}

      {/* Connection Test */}
      {onTestConnection && needsApiKey && settings.apiKey && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex items-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {t.testing}
                </>
              ) : (
                <>
                  <TestTube size={16} />
                  {t.testConnection}
                </>
              )}
            </button>

            {connectionStatus !== 'idle' && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                connectionStatus === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircle size={16} />
                    {t.connectionSuccess}
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    {t.connectionFailed}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider-specific Help */}
      {settings.provider === 'zhipu' && (
        <div className="p-6 bg-blue-500/5 border-2 border-blue-500/20 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <ExternalLink size={16} />
            </div>
            <div className="text-sm">
              <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">智谱AI配置说明</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                请在智谱AI开放平台获取API密钥。支持GLM-4系列文本模型、CogView-3图像生成和CogVideoX视频生成。
              </p>
            </div>
          </div>
        </div>
      )}

      {settings.provider === 'shenma' && (
        <div className="p-6 bg-purple-500/5 border-2 border-purple-500/20 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <ExternalLink size={16} />
            </div>
            <div className="text-sm">
              <p className="font-bold text-purple-700 dark:text-purple-300 mb-2">神马AI配置说明</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                请配置神马API的基础URL和密钥。支持对话模型、nano-banana图像生成和sora2视频生成。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIProviderConfig;