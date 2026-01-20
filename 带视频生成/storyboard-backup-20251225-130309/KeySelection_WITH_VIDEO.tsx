import React, { useState, useEffect } from 'react';
import { ModelProvider, ProviderConfig, I18N, Language, Theme } from '../types';
import { testApiConnection } from '../geminiService';

interface KeySelectionProps {
  onSuccess: () => void;
  lang: Language;
  theme?: Theme;
  onLangChange?: (lang: Language) => void;
  onThemeChange?: (theme: Theme) => void;
}

const PROVIDERS = [
  { id: 'gemini', name: 'Gemini (Official)', logo: '✨' },
  { id: 'zhipu', name: '智谱 AI (ChatGLM)', logo: '🧠' },
  { id: 'openai', name: 'OpenAI', logo: '🤖' },
  { id: 'custom', name: 'Third-party (Custom)', logo: '🛠️' },
];

const PROVIDER_CONFIG: Record<string, { baseUrl: string; llmModel: string; imageModel: string }> = {
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    llmModel: 'glm-4',
    imageModel: 'cogview-4-250304'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    llmModel: 'gpt-4o',
    imageModel: 'dall-e-3'
  },
  custom: {
    baseUrl: 'https://api.example.com/v1',
    llmModel: 'model-name',
    imageModel: 'image-model-name'
  }
};

const KeySelection: React.FC<KeySelectionProps> = ({ onSuccess, lang, theme = 'dark', onLangChange, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  
  const [config, setConfig] = useState<ProviderConfig>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    llmModel: '',
    imageModel: ''
  });
  
  const [videoConfig, setVideoConfig] = useState({
    baseUrl: '',
    apiKey: ''
  });
  
  const [selectedLang, setSelectedLang] = useState<Language>(lang);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [testStatus, setTestStatus] = useState<{ llm?: 'idle' | 'loading' | 'success' | 'failed'; image?: 'idle' | 'loading' | 'success' | 'failed' }>({});
  const [videoTestStatus, setVideoTestStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [showHelp, setShowHelp] = useState(false);

  const t = I18N[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem('director_canvas_api_config');
    if (saved) setConfig(JSON.parse(saved));
    
    const videoSaved = localStorage.getItem('director_canvas_video_config');
    if (videoSaved) setVideoConfig(JSON.parse(videoSaved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('director_canvas_api_config', JSON.stringify(config));
    
    if (videoConfig.baseUrl && videoConfig.apiKey) {
      localStorage.setItem('director_canvas_video_config', JSON.stringify(videoConfig));
    }
    
    if (onLangChange && selectedLang !== lang) {
      onLangChange(selectedLang);
    }
    if (onThemeChange && selectedTheme !== theme) {
      onThemeChange(selectedTheme);
    }
    onSuccess();
  };

  const handleOfficialGemini = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const newConfig = { ...config, provider: 'gemini' as ModelProvider };
      localStorage.setItem('director_canvas_api_config', JSON.stringify(newConfig));
      onSuccess();
    }
  };

  const runApiTest = async (type: 'llm' | 'image') => {
    setTestStatus(prev => ({ ...prev, [type]: 'loading' }));
    try {
      const success = await testApiConnection(config, type);
      setTestStatus(prev => ({ ...prev, [type]: success ? 'success' : 'failed' }));
      if (!success) {
        setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 3000);
      }
    } catch (e) {
      setTestStatus(prev => ({ ...prev, [type]: 'failed' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 3000);
    }
  };

  const testVideoConnection = async () => {
    if (!videoConfig.baseUrl || !videoConfig.apiKey) {
      alert(selectedLang === 'zh' ? '请输入 Base URL 和 API Key' : 'Please enter Base URL and API Key');
      return;
    }

    setVideoTestStatus('loading');
    try {
      const response = await fetch(`${videoConfig.baseUrl}/v1/token/quota`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${videoConfig.apiKey}`
        }
      });

      if (response.ok) {
        setVideoTestStatus('success');
        setTimeout(() => setVideoTestStatus('idle'), 3000);
      } else {
        setVideoTestStatus('failed');
        setTimeout(() => setVideoTestStatus('idle'), 3000);
      }
    } catch (e) {
      console.error('Video API test failed:', e);
      setVideoTestStatus('failed');
      setTimeout(() => setVideoTestStatus('idle'), 3000);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 ${theme === 'light' ? 'bg-white/90' : ''}`}>
      <div className={`max-w-2xl w-full border rounded-[3rem] p-12 shadow-2xl text-left animate-in zoom-in-95 duration-500 ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-6 mb-10 justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-500/20">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-3xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{t.apiConfig}</h2>
              <p className={`font-bold mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Configure your creative brain</p>
            </div>
          </div>
          <button
            onClick={onSuccess}
            className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all ${theme === 'dark' ? 'border-white/20 text-white hover:border-white/50 hover:bg-white/10' : 'border-zinc-300 text-black hover:border-zinc-500 hover:bg-zinc-100'}`}
            title={lang === 'zh' ? '关闭' : 'Close'}
          >
            ✕
          </button>
        </div>

        {/* 语言和主题设置 */}
        <div className={`grid grid-cols-2 gap-8 mb-10 pb-10 border-b ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.language}</label>
            <div className="flex gap-3">
              {(['zh', 'en'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setSelectedLang(l)}
                  className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${selectedLang === l ? 'bg-purple-600 border-purple-600 text-white' : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                >
                  {l === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.theme}</label>
            <div className="flex gap-3">
              {(['dark', 'light'] as Theme[]).map(th => (
                <button
                  key={th}
                  onClick={() => setSelectedTheme(th)}
                  className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${selectedTheme === th ? 'bg-purple-600 border-purple-600 text-white' : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                >
                  {th === 'dark' ? t.darkMode : t.lightMode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className={`grid grid-cols-2 gap-4 mb-10 pb-10 border-b ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
          <button
            onClick={() => setActiveTab('image')}
            className={`py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${
              activeTab === 'image'
                ? 'bg-purple-600 border-purple-600 text-white'
                : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`
            }`}
          >
            🖼️ {selectedLang === 'zh' ? '图像生成 API' : 'Image API'}
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`py-3 rounded-xl border font-black uppercase text-xs tracking-widest transition-all ${
              activeTab === 'video'
                ? 'bg-purple-600 border-purple-600 text-white'
                : `${theme === 'dark' ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`
            }`}
          >
            🎬 {selectedLang === 'zh' ? '视频生成 API' : 'Video API'}
          </button>
        </div>

        {/* 图像 API 配置 */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t.provider}</label>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const providerConfig = PROVIDER_CONFIG[p.id];
                      setConfig({ 
                        ...config, 
                        provider: p.id as ModelProvider,
                        ...(providerConfig && {
                          baseUrl: providerConfig.baseUrl,
                          llmModel: providerConfig.llmModel,
                          imageModel: providerConfig.imageModel
                        })
                      });
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all hover:scale-105 ${config.provider === p.id ? 'bg-purple-600/20 border-purple-500 text-purple-400' : `${theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}`}
                  >
                    <div className="text-xl mb-1">{p.logo}</div>
                    <div className="text-[10px] font-black uppercase leading-tight">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {config.provider === 'gemini' ? (
                <div className="h-full flex flex-col justify-center space-y-4">
                   <p className={`text-sm leading-relaxed font-bold ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                     Use the built-in Gemini high-performance engine. Fast, reliable, and cinematic.
                   </p>
                   <button
                     onClick={handleOfficialGemini}
                     className="w-full py-5 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                   >
                     Connect Official Key
                   </button>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.apiKey}</label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.baseUrl}</label>
                    <input
                      type="text"
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LLM {t.model}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.llmModel}
                        onChange={(e) => setConfig({ ...config, llmModel: e.target.value })}
                        placeholder="glm-4 / gpt-4o"
                        className={`flex-1 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                      />
                      <button
                        onClick={() => runApiTest('llm')}
                        className={`px-3 py-2 rounded-lg font-bold text-[10px] tracking-widest transition-all min-w-[60px] ${testStatus.llm === 'loading' ? 'bg-yellow-600 text-white' : testStatus.llm === 'success' ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200'}`}`}
                      >
                        {testStatus.llm === 'loading' ? '...' : testStatus.llm === 'success' ? '✓' : 'Test'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Image {t.model}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.imageModel}
                        onChange={(e) => setConfig({ ...config, imageModel: e.target.value })}
                        placeholder="cogview-4-250304 / dall-e-3"
                        className={`flex-1 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                      />
                      <button
                        onClick={() => runApiTest('image')}
                        className={`px-3 py-2 rounded-lg font-bold text-[10px] tracking-widest transition-all min-w-[60px] ${testStatus.image === 'loading' ? 'bg-yellow-600 text-white' : testStatus.image === 'success' ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200'}`}`}
                      >
                        {testStatus.image === 'loading' ? '...' : testStatus.image === 'success' ? '✓' : 'Test'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 视频 API 配置 */}
        {activeTab === 'video' && (
          <div className="space-y-6 mb-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {selectedLang === 'zh' ? '视频 API 说明' : 'Video API Instructions'}
              </label>
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-zinc-50 border border-zinc-200'}`}>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {selectedLang === 'zh'
                    ? '配置 Sora 2 视频生成 API。您可以从中转服务（如神马 API）获取 Base URL 和 API Key。'
                    : 'Configure Sora 2 video generation API. You can get Base URL and API Key from relay services like Shenma API.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Base URL</label>
              <input
                type="text"
                value={videoConfig.baseUrl}
                onChange={(e) => setVideoConfig({ ...videoConfig, baseUrl: e.target.value })}
                placeholder="https://api.xxx.com"
                className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${
                  theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'
                }`}
              />
              <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {selectedLang === 'zh' ? '示例: https://api.xxx.com' : 'Example: https://api.xxx.com'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">API Key</label>
              <input
                type="password"
                value={videoConfig.apiKey}
                onChange={(e) => setVideoConfig({ ...videoConfig, apiKey: e.target.value })}
                placeholder="sk-xxx..."
                className={`w-full rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-purple-500/50 border ${
                  theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-zinc-50 border-zinc-200 text-black'
                }`}
              />
              <p className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {selectedLang === 'zh' ? 'API 密钥将被保存在本地存储中' : 'API key will be saved in local storage'}
              </p>
            </div>

            <button
              onClick={testVideoConnection}
              disabled={videoTestStatus === 'loading' || !videoConfig.baseUrl || !videoConfig.apiKey}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all ${
                videoTestStatus === 'loading'
                  ? 'bg-yellow-600 text-white cursor-not-allowed'
                  : videoTestStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : videoTestStatus === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-purple-600 text-white hover:scale-[1.02]'
              }`}
            >
              {videoTestStatus === 'loading'
                ? (selectedLang === 'zh' ? '测试中...' : 'Testing...')
                : videoTestStatus === 'success'
                ? (selectedLang === 'zh' ? '✓ 连接成功' : '✓ Connected')
                : videoTestStatus === 'failed'
                ? (selectedLang === 'zh' ? '✗ 连接失败' : '✗ Failed')
                : (selectedLang === 'zh' ? '测试连接' : 'Test Connection')}
            </button>

            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-zinc-50 border border-zinc-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {selectedLang === 'zh' ? '如何获取 API 密钥？' : 'How to get API key?'}
              </p>
              <ol className={`text-[10px] leading-relaxed space-y-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <li>1. {selectedLang === 'zh' ? '注册中转服务账号（如神马 API）' : 'Register relay service account (e.g., Shenma API)'}</li>
                <li>2. {selectedLang === 'zh' ? '在账户设置中获取 Base URL' : 'Get Base URL from account settings'}</li>
                <li>3. {selectedLang === 'zh' ? '生成或复制你的 API Key' : 'Generate or copy your API Key'}</li>
                <li>4. {selectedLang === 'zh' ? '粘贴到上面的输入框中' : 'Paste into the input field above'}</li>
              </ol>
            </div>
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full py-5 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
        >
          {selectedLang === 'zh' ? '保存配置' : 'Save Config'}
        </button>
      </div>
    </div>
  );
};

export default KeySelection;
