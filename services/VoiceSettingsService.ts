/**
 * 语音设置服务
 * 提供多种语音选项，包括台湾女声等
 */

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female';
  region: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string; // 系统语音名称
}

export class VoiceSettingsService {
  private static instance: VoiceSettingsService;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentVoiceSettings: VoiceOption;

  // 预定义的语音选项
  private voiceOptions: VoiceOption[] = [
    {
      id: 'zh-cn-standard',
      name: '标准普通话',
      lang: 'zh-CN',
      gender: 'female',
      region: '大陆',
      rate: 0.9,
      pitch: 1.1,
      volume: 0.8,
      voiceName: 'Microsoft Xiaoxiao - Chinese (Mainland)'
    },
    {
      id: 'zh-tw-sweet',
      name: '台湾甜美女声',
      lang: 'zh-TW',
      gender: 'female',
      region: '台湾',
      rate: 0.8,
      pitch: 1.25,
      volume: 0.8,
      voiceName: 'Microsoft Hanhan - Chinese (Taiwan)'
    },
    {
      id: 'zh-hk-cantonese',
      name: '粤语女声',
      lang: 'zh-HK',
      gender: 'female',
      region: '香港',
      rate: 0.9,
      pitch: 1.1,
      volume: 0.8,
      voiceName: 'Microsoft Tracy - Chinese (Hong Kong SAR)'
    },
    {
      id: 'zh-sc-sichuan',
      name: '四川话男声',
      lang: 'zh-CN',
      gender: 'male',
      region: '四川',
      rate: 0.85,
      pitch: 0.8,
      volume: 0.8,
      voiceName: 'Microsoft Kangkang - Chinese (Mainland)'
    },
    {
      id: 'en-us-female',
      name: '英语女声',
      lang: 'en-US',
      gender: 'female',
      region: '美国',
      rate: 0.9,
      pitch: 1.0,
      volume: 0.8,
      voiceName: 'Microsoft Zira - English (United States)'
    }
  ];

  private constructor() {
    // 默认使用台湾甜美女声
    this.currentVoiceSettings = this.voiceOptions.find(v => v.id === 'zh-tw-sweet') || this.voiceOptions[0];
    this.loadAvailableVoices();
    this.loadSavedSettings();
  }

  public static getInstance(): VoiceSettingsService {
    if (!VoiceSettingsService.instance) {
      VoiceSettingsService.instance = new VoiceSettingsService();
    }
    return VoiceSettingsService.instance;
  }

  private loadAvailableVoices(): void {
    if ('speechSynthesis' in window) {
      // 等待语音列表加载完成
      const loadVoices = () => {
        this.availableVoices = window.speechSynthesis.getVoices();
        console.log('[VoiceSettings] 可用语音数量:', this.availableVoices.length);
        
        // 打印所有可用的中文语音
        const chineseVoices = this.availableVoices.filter(voice => 
          voice.lang.startsWith('zh') || voice.name.includes('Chinese')
        );
        console.log('[VoiceSettings] 中文语音选项:', chineseVoices.map(v => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService
        })));
      };

      // 立即尝试加载
      loadVoices();

      // 监听语音列表变化
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  private loadSavedSettings(): void {
    try {
      const saved = localStorage.getItem('voiceSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        const voiceOption = this.voiceOptions.find(v => v.id === settings.id);
        if (voiceOption) {
          this.currentVoiceSettings = { ...voiceOption, ...settings };
        }
      }
    } catch (error) {
      console.warn('[VoiceSettings] 加载保存的语音设置失败:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('voiceSettings', JSON.stringify(this.currentVoiceSettings));
    } catch (error) {
      console.warn('[VoiceSettings] 保存语音设置失败:', error);
    }
  }

  public getVoiceOptions(): VoiceOption[] {
    return this.voiceOptions;
  }

  public getCurrentVoiceSettings(): VoiceOption {
    return this.currentVoiceSettings;
  }

  public setVoiceSettings(voiceId: string): boolean {
    const voiceOption = this.voiceOptions.find(v => v.id === voiceId);
    if (voiceOption) {
      this.currentVoiceSettings = voiceOption;
      this.saveSettings();
      console.log('[VoiceSettings] 语音设置已更新:', voiceOption.name);
      
      // 强制重新加载语音列表
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        // 重新获取语音列表
        this.availableVoices = window.speechSynthesis.getVoices();
      }
      
      return true;
    }
    return false;
  }

  public clearCache(): void {
    try {
      localStorage.removeItem('voiceSettings');
      console.log('[VoiceSettings] 语音设置缓存已清除');
    } catch (error) {
      console.warn('[VoiceSettings] 清除缓存失败:', error);
    }
  }

  public createUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    const settings = this.currentVoiceSettings;
    
    utterance.lang = settings.lang;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    // 尝试设置特定的语音
    if (settings.voiceName) {
      const targetVoice = this.availableVoices.find(voice => 
        voice.name === settings.voiceName || 
        voice.name.includes(settings.voiceName.split(' - ')[0])
      );
      
      if (targetVoice) {
        utterance.voice = targetVoice;
        console.log('[VoiceSettings] 使用指定语音:', targetVoice.name);
      } else {
        // 如果找不到指定语音，尝试找同语言的对应性别语音
        const genderKeywords = settings.gender === 'male' ? ['male', 'man', '男'] : ['female', 'woman', '女'];
        const fallbackVoice = this.availableVoices.find(voice => 
          voice.lang === settings.lang && 
          genderKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
        );
        
        if (fallbackVoice) {
          utterance.voice = fallbackVoice;
          console.log('[VoiceSettings] 使用备选语音:', fallbackVoice.name);
        } else {
          // 最后尝试找任何同语言的语音
          const anyVoice = this.availableVoices.find(voice => voice.lang === settings.lang);
          if (anyVoice) {
            utterance.voice = anyVoice;
            console.log('[VoiceSettings] 使用通用语音:', anyVoice.name);
          }
        }
      }
    }

    return utterance;
  }

  public testVoice(voiceId?: string): void {
    const originalSettings = this.currentVoiceSettings;
    
    if (voiceId) {
      const testVoice = this.voiceOptions.find(v => v.id === voiceId);
      if (testVoice) {
        this.currentVoiceSettings = testVoice;
      }
    }

    let testText = this.getTestText(this.currentVoiceSettings.lang);
    
    // 为四川话使用特殊的测试文本
    if (this.currentVoiceSettings.id === 'zh-sc-sichuan') {
      testText = '你好哇，我是你的AI助手，巴适得很！';
    }
    
    const utterance = this.createUtterance(testText);
    
    utterance.onend = () => {
      console.log('[VoiceSettings] 语音测试完成');
    };
    
    utterance.onerror = (event) => {
      console.error('[VoiceSettings] 语音测试失败:', event.error);
    };

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }

    // 恢复原始设置
    this.currentVoiceSettings = originalSettings;
  }

  private getTestText(lang: string): string {
    const testTexts: { [key: string]: string } = {
      'zh-CN': '你好，我是你的AI助手，很高兴为你服务！',
      'zh-TW': '你好，我是你的AI助手，很高興為你服務！',
      'zh-HK': '你好，我係你嘅AI助手，好開心為你服務！',
      'en-US': 'Hello, I am your AI assistant. Nice to meet you!'
    };
    
    return testTexts[lang] || testTexts['zh-CN'];
  }

  public speak(text: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = this.createUtterance(text);
      
      utterance.onstart = () => {
        console.log('[VoiceSettings] 开始播放语音:', text.substring(0, 30));
      };
      
      utterance.onend = () => {
        console.log('[VoiceSettings] 语音播放完成');
      };
      
      utterance.onerror = (event) => {
        console.error('[VoiceSettings] 语音播放失败:', event.error);
      };

      window.speechSynthesis.speak(utterance);
    }
  }
}

// 导出单例实例
export const voiceSettingsService = VoiceSettingsService.getInstance();