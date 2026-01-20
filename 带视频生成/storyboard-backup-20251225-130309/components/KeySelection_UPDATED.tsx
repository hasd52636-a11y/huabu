// 这是 KeySelection 组件的更新版本
// 需要在现有 KeySelection.tsx 中添加以下功能：

// 1. 添加标签页状态
const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

// 2. 添加视频 API 配置状态
const [videoConfig, setVideoConfig] = useState({
  baseUrl: localStorage.getItem('director_canvas_video_config') 
    ? JSON.parse(localStorage.getItem('director_canvas_video_config') || '{}').baseUrl 
    : '',
  apiKey: localStorage.getItem('director_canvas_video_config')
    ? JSON.parse(localStorage.getItem('director_canvas_video_config') || '{}').apiKey
    : ''
});

const [videoTestStatus, setVideoTestStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');

// 3. 添加视频 API 测试函数
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

// 4. 修改 handleSave 函数，保存视频配置
const handleSave = () => {
  localStorage.setItem('director_canvas_api_config', JSON.stringify(config));
  
  // 保存视频配置
  if (activeTab === 'video' && videoConfig.baseUrl && videoConfig.apiKey) {
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

// 5. 在 JSX 中添加标签页切换（在语言和主题设置下方）
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

{/* 图像 API 配置内容 */}
{activeTab === 'image' && (
  <div className="grid grid-cols-2 gap-8">
    {/* 现有的图像 API 配置代码 */}
  </div>
)}

{/* 视频 API 配置内容 */}
{activeTab === 'video' && (
  <div className="space-y-6">
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
