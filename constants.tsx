
export const COLORS = {
  canvas: {
    bg: '#FAFAFA',
    grid: 'rgba(212, 175, 55, 0.08)',
  },
  gold: {
    primary: '#D4AF37',
    secondary: '#FFD700',
    accent: '#B8860B',
    glow: 'rgba(212, 175, 55, 0.2)',
    text: '#1E293B',
    // Enhanced golden theme variants
    light: '#F7E98E',
    medium: '#E6C547',
    dark: '#9A7B0A',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)',
    shadow: 'rgba(212, 175, 55, 0.3)'
  },
  text: {
    bg: 'rgba(239, 246, 255, 0.9)', // Very Light Blue
    border: '#2563EB', // Strong Blue
    connection: '#2563EB',
    glow: 'rgba(37, 99, 235, 0.2)'
  },
  image: {
    bg: 'rgba(236, 253, 245, 0.9)', // Very Light Green
    border: '#059669', // Strong Emerald
    connection: '#059669',
    glow: 'rgba(5, 150, 105, 0.2)'
  },
  video: {
    bg: 'rgba(254, 242, 242, 0.9)', // Very Light Red
    border: '#DC2626', // Strong Red
    connection: '#DC2626',
    glow: 'rgba(220, 38, 38, 0.2)'
  },
  // Enhanced theme system
  theme: {
    light: {
      primary: '#FFFFFF',
      secondary: '#F8FAFC',
      tertiary: '#F1F5F9',
      accent: '#D4AF37',
      text: {
        primary: '#1E293B',
        secondary: '#475569',
        tertiary: '#64748B',
        accent: '#B8860B'
      },
      border: {
        light: 'rgba(0, 0, 0, 0.05)',
        medium: 'rgba(0, 0, 0, 0.1)',
        strong: 'rgba(0, 0, 0, 0.2)'
      },
      shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    },
    dark: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      accent: '#FFD700',
      text: {
        primary: '#F8FAFC',
        secondary: '#E2E8F0',
        tertiary: '#CBD5E1',
        accent: '#FFD700'
      },
      border: {
        light: 'rgba(255, 255, 255, 0.05)',
        medium: 'rgba(255, 255, 255, 0.1)',
        strong: 'rgba(255, 255, 255, 0.2)'
      },
      shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
      }
    }
  },
  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Animation constants for consistent transitions
export const ANIMATIONS = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  scale: {
    hover: 'scale(1.05)',
    active: 'scale(0.95)',
    focus: 'scale(1.02)'
  }
};

// UI component sizing constants
export const SIZING = {
  header: {
    height: '7rem', // 112px
    padding: '4rem' // 64px
  },
  sidebar: {
    width: {
      default: '30rem', // 480px
      min: '20rem', // 320px
      max: '50rem' // 800px
    }
  },
  button: {
    sm: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      borderRadius: '0.5rem'
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
      borderRadius: '0.75rem'
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
      borderRadius: '1rem'
    },
    xl: {
      padding: '1.25rem 2.5rem',
      fontSize: '1.25rem',
      borderRadius: '1.5rem'
    }
  },
  modal: {
    borderRadius: '2rem',
    padding: '3rem',
    maxWidth: '75rem' // 1200px
  }
};

export const SNAP_SIZE = 5;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;

// Default SORA 2 prompt content for My Prompt feature
export const DEFAULT_SORA_PROMPT = `########################### SORA 2 GLOBAL PROMPT RULES##########################
1. GLOBAL REFERENCE LOCK:
All characters or products shown in this video must strictly use the main subject from the provided reference image(s) as the only visual source of identity, appearance, proportions, clothing, materials, and style. Do not redesign, replace, stylize, beautify, or alter the reference subject in any way. Preserve face, body, outfit, texture, logo, color, and silhouette exactly as in the reference. If any conflict exists between the prompt and the reference image, the reference image always overrides the prompt.

2. 视频开始的画面和语言一定要有勾子有悬念，开局炸裂，适应抖音的播放风格。MULTI-CUT SHOTS & DYNAMIC CAMERA:
- Use multiple cuts per scene to tell a cinematic story.
- Include wide shots, close-ups, over-the-shoulder, tracking shots, and dynamic effects like motion blur or tilt.
- Each cut must be short (≤10 seconds) and visually clear.

3. INLINE CHARACTER DESCRIPTIONS & DIALOGUE:
- Every time a character speaks or appears, include inline description in parentheses: distinctive look, wardrobe, position, and current emotion.
- Camera must focus on the speaking character using proper framing (close-up or medium shot).
- Character mouth movements must be perfectly synchronized with dialogue.
- Do not create separate character description sections.
- Dialogue order must remain exactly as in the script.
- Example format:
CharacterName (appearance, outfit, position; emotion): "Dialogue line." (camera instructions; lip-sync)

4. BGM, SFX & PACING:
- BGM: match scene emotion, adjust intensity dynamically between dialogue and silent beats.
- SFX: include realistic environmental and action sounds, precisely synced with on-screen actions.
- Pacing: keep each scene ≤10s, maintain cinematic rhythm with sharp cuts or smooth transitions, end with visual or emotional hook.

5. DIALOGUE ORDER LOCK:
- At the end of each scene, based on the actual number of characters present and the actual dialogue order, specify the dialogue sequence in the following format:
Dialogue_order_lock=[Character1, Character2, Character3,...]

6. ZERO NARRATION & CHARACTER LIMITS:
- No narration in any scene; dialogue only.
- Maintain natural dialogue flow and continuity.
- Each scene prompt: minimum 700 characters, maximum 1000 characters.`;

export const I18N = {
  zh: {
    new: '新建项目',
    save: '保存画布',
    export: '导出结果',
    addText: '文本模块',
    addImage: '图像模块',
    addVideo: '视频模块',
    upload: '上传素材',
    api: 'API 配置',
    performance: '性能模式',
    help: '使用指南',
    properties: '属性面板',
    aiAssistant: '智能助手',
    inputPlaceholder: '仙尊有疑问请召唤上方的"智能助手"',
    blockPlaceholder: '等待灵感降临...',
    linkPrompt: '输入转换逻辑...',
    ctxAddText: '新建文本',
    ctxAddImage: '新建图像',
    ctxAddVideo: '新建视频',
    ctxReset: '重置视角 (Ctrl+0)',
    ctxClear: '清空画布',
    ctxCopy: '复制模块',
    ctxDelete: '移除模块',
    ctxBatchVideo: '批量处理',
    ctxAutoLayout: '一键排序',
    copySuccess: '已成功复制',
    thinking: '正在思考...',
    projectToCanvas: '投射到画布',
    saveAndClose: '保存并关闭',
    chat: '聊天',
    featureAssembly: '功能管理',
    engines: '推理引擎',
    providerType: '提供商类型',
    modelId: '模型 ID',
    baseUrl: '接口地址',
    apiKey: '密钥 (API Key)',
    configure: '配置',
    active: '运行中',
    tips: {
      edit: '编辑文本',
      finish: '完成编辑',
      fontSize: '调整字号',
      textColor: '文字颜色',
      aspectRatio: '切换比例',
      crop: '智能剪裁',
      portrait: '设为竖屏',
      landscape: '设为横屏',
      upload: '上传本地文件',
      regenerate: '基于上下文重新生成',
      delete: '删除此模块',
      preview: '预览提示词',
      download: '下载'
    },
    // My Prompt feature translations
    presetPrompt: '我的提示词',
    presetPromptLibrary: '我的提示词库',
    presetPromptPlaceholder: '点击编辑提示词内容...',
    characterCount: '字符计数',
    selectPrompt: '激活使用',
    promptSlot: '提示词槽位',
    emptySlot: '空槽位',
    savePrompts: '保存提示词',
    cancelEdit: '取消编辑',
    promptTooLong: '提示词内容不能超过3000字符',
    promptSaved: '提示词已保存',
    storageError: '无法保存提示词设置，将使用临时存储'
  },
  en: {
    new: 'New Project',
    save: 'Save Canvas',
    export: 'Export',
    addText: 'Text Block',
    addImage: 'Image Block',
    addVideo: 'Video Block',
    upload: 'Upload',
    api: 'API Settings',
    performance: 'Performance',
    help: 'Guide',
    properties: 'Properties',
    aiAssistant: 'AI Hub',
    inputPlaceholder: 'Type an idea or command...',
    blockPlaceholder: 'Waiting for AI...',
    linkPrompt: 'Enter link logic...',
    ctxAddText: 'New Text',
    ctxAddImage: 'New Image',
    ctxAddVideo: 'New Video',
    ctxReset: 'Reset View (Ctrl+0)',
    ctxClear: 'Clear Canvas',
    ctxCopy: 'Copy',
    ctxDelete: 'Delete',
    ctxBatchVideo: 'Batch Video',
    ctxAutoLayout: 'Auto Layout',
    copySuccess: 'Copied!',
    thinking: 'Thinking...',
    projectToCanvas: 'Project to Canvas',
    saveAndClose: 'Save & Close',
    chat: 'Chat',
    featureAssembly: 'Feature Assembly',
    engines: 'Engines',
    providerType: 'Provider Type',
    modelId: 'Model ID',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    configure: 'Configure',
    active: 'Active',
    tips: {
      edit: 'Edit Text',
      finish: 'Finish',
      fontSize: 'Font Size',
      textColor: 'Text Color',
      aspectRatio: 'Toggle Ratio',
      crop: 'Smart Crop',
      portrait: 'Set Portrait',
      landscape: 'Set Landscape',
      upload: 'Upload Local File',
      regenerate: 'Regenerate w/ Context',
      delete: 'Delete Block',
      preview: 'Preview Prompt',
      download: 'Download'
    },
    // My Prompt feature translations
    presetPrompt: 'My Prompt',
    presetPromptLibrary: 'My Prompt Library',
    presetPromptPlaceholder: 'Click to edit prompt content...',
    characterCount: 'Character Count',
    selectPrompt: 'Select Prompt',
    promptSlot: 'Prompt Slot',
    emptySlot: 'Empty Slot',
    savePrompts: 'Save Prompts',
    cancelEdit: 'Cancel Edit',
    promptTooLong: 'Prompt content cannot exceed 3000 characters',
    promptSaved: 'Prompts saved',
    storageError: 'Unable to save prompt settings, using temporary storage'
  }
};
