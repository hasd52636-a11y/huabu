
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StoryboardItem, FilterMode, ToolType, Language, I18N, ModelProvider, Theme, StoryboardSymbol, ExportLayout, SYMBOL_DESCRIPTIONS, SYMBOL_LABELS, StyleOption, AspectRatio } from './types';
import { generateSceneImage, parseScriptToScenes, generateStoryboardFromDialogue } from './geminiService';
import StoryboardCard from './components/StoryboardCard';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import KeySelection from './components/KeySelection';
import BatchRedrawDialog from './components/BatchRedrawDialog';
import VideoGenDialog from './components/VideoGenDialog';
import APIConfigDialog from './components/APIConfigDialog';
import VideoService from './videoService';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [items, setItems] = useState<StoryboardItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
  const [lang, setLang] = useState<Language>('zh');
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [model, setModel] = useState<ModelProvider>('gemini');
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [globalColorMode, setGlobalColorMode] = useState<'color' | 'blackAndWhite'>('color');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBatchRedrawDialog, setShowBatchRedrawDialog] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<StyleOption | null>(null);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio | null>(null);
  const [showVideoGenDialog, setShowVideoGenDialog] = useState(false);
  const [videoGenDialogPrompt, setVideoGenDialogPrompt] = useState('');
  const [showAPIConfigDialog, setShowAPIConfigDialog] = useState(false);
  const [videoServiceConfig, setVideoServiceConfig] = useState<{ baseUrl: string; apiKey: string } | null>(null);
  
  // Selection Marquee State
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const selectionStart = useRef<{ x: number, y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importTypeRef = useRef<'ref' | 'frame'>('frame');
  const videoServiceRef = useRef<VideoService | null>(null);
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const t = I18N[lang];

  // Video generation handler
  const handleGenerateVideo = useCallback(async (prompt: string, options: any) => {
    setShowVideoGenDialog(false);
    
    if (!videoServiceRef.current) {
      alert('视频生成服务未配置，请先配置API');
      setShowAPIConfigDialog(true);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Generating video with prompt:', prompt, 'and options:', options);
      
      // Call the actual video generation API
      const result = await videoServiceRef.current.createVideo(prompt, options);
      console.log('Video generation started successfully:', result);
      
      // Start polling for video status
      videoServiceRef.current.startPolling(result.task_id, {
        onStatusChange: (status) => {
          console.log('Video status update:', status);
          // You can update the UI with the status here
        },
        onComplete: (videoData) => {
          console.log('Video generation completed:', videoData);
          alert('视频生成完成！视频ID: ' + videoData.task_id);
        },
        onError: (error) => {
          console.error('Video generation error:', error);
          alert('视频生成失败: ' + error.message);
        }
      });
      
      alert(`${t.videoGenStarted || 'Video generation started'}`);
    } catch (error) {
      console.error('Video generation error:', error);
      alert('视频生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Open video generation dialog with selected frames
  // Initialize VideoService when config changes
  useEffect(() => {
    if (videoServiceConfig) {
      videoServiceRef.current = new VideoService(videoServiceConfig);
      console.log('VideoService initialized successfully');
    } else {
      // Check for saved config in localStorage
      const savedBaseUrl = localStorage.getItem('sora_base_url');
      const savedApiKey = localStorage.getItem('sora_api_key');
      if (savedBaseUrl && savedApiKey) {
        const config = { baseUrl: savedBaseUrl, apiKey: savedApiKey };
        setVideoServiceConfig(config);
        videoServiceRef.current = new VideoService(config);
        console.log('VideoService initialized from localStorage');
      }
    }

    return () => {
      videoServiceRef.current?.cleanup();
    };
  }, [videoServiceConfig]);

  // Handle API configuration
  const handleAPIConfigured = useCallback((config: { baseUrl: string; apiKey: string }) => {
    setVideoServiceConfig(config);
    setShowAPIConfigDialog(false);
    localStorage.setItem('sora_base_url', config.baseUrl);
    localStorage.setItem('sora_api_key', config.apiKey);
  }, []);

  const handleOpenVideoGenDialog = useCallback(() => {
    if (selectedIds.size === 0) {
      alert(t.selectFramesFirst || 'Please select frames first');
      return;
    }

    // Check if API is configured
    if (!videoServiceConfig) {
      alert('视频生成服务未配置，请先配置API');
      setShowAPIConfigDialog(true);
      return;
    }

    // Build prompt from selected frames
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    const prompt = selectedItems
      .map(item => item.prompt)
      .join('\n\n');

    setVideoGenDialogPrompt(prompt);
    setShowVideoGenDialog(true);
  }, [selectedIds, items, t, videoServiceConfig]);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('director_canvas_lang', newLang);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('director_canvas_theme', newTheme);
  };

  useEffect(() => {
    const checkKey = async () => {
      const saved = localStorage.getItem('director_canvas_api_config');
      if (saved) {
        setHasKey(true);
      } else if ((window as any).aistudio) {
        setHasKey(await (window as any).aistudio.hasSelectedApiKey());
      } else {
        setHasKey(false);
      }
    };
    
    // 检测系统语言
    const systemLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    const savedLang = localStorage.getItem('director_canvas_lang') as Language | null;
    if (savedLang) {
      setLang(savedLang);
    } else {
      setLang(systemLang);
    }
    
    // 检测系统主题
    const savedTheme = localStorage.getItem('director_canvas_theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    
    checkKey();
  }, []);

  // Keyboard Shortcuts (Ctrl+A and Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框或文本区域中
      const isInInput = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInInput) {
        e.preventDefault();
        const allIds = items.map(it => it.id);
        setSelectedIds(new Set(allIds));
        // For Ctrl+A, use natural order (top-left to bottom-right)
        const sorted = items.sort((a, b) => {
          if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
          return a.x - b.x;
        }).map(it => it.id);
        setSelectionOrder(sorted);
      } else if (e.key === 'Delete' && !isInInput && selectedIds.size > 0) {
        // Delete selected frames
        e.preventDefault();
        const idsToDelete = Array.from(selectedIds);
        setItems(prev => prev.filter(it => !idsToDelete.includes(it.id)));
        setSelectedIds(new Set());
        setSelectionOrder([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIds]);

  const handleGenerateFromScript = useCallback(async (scriptText: string, sceneCount: number, style?: any, aspectRatio?: string, duration?: number) => {
    if (!scriptText.trim()) return;
    setIsLoading(true);
    try {
      const scenes = await parseScriptToScenes(scriptText, sceneCount);
      const newItems: StoryboardItem[] = [];
      const startOrder = items.length;
      const isBlackAndWhite = globalColorMode === 'blackAndWhite';
      
      // 构建全局参数部分
      const globalParams: string[] = [];
      if (style) {
        globalParams.push(`风格: ${style.nameZh || style.name}`);
      }
      if (aspectRatio) {
        globalParams.push(`分辨率: ${aspectRatio}`);
      }
      if (duration && duration > 0) {
        globalParams.push(`总时长: ${duration}秒`);
      }
      
      const hasRefImage = items.some(it => it.isMain);
      if (hasRefImage) {
        globalParams.push('参考主体: 严格使用提供的参考图片，保持主体外观100%一致');
      }
      
      // 导入工具函数
      const { calculateHeight } = await import('./types');
      const baseWidth = 380;
      const height = calculateHeight(baseWidth, aspectRatio || '16:9');
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`;
        
        // 构建完整的提示词格式 - 简洁结构化格式
        let enrichedPrompt = `== ${sceneNum} / SCRIPT ${i + 1}/${sceneCount} ==
[画面描述]: ${scene.description}
[摄像机语言]: ${scene.visualPrompt}${globalParams.length > 0 ? '\n[全局参数]: ' + globalParams.join(' | ') : ''}
[约束条件]: 不修改参考主体特征 | 保持视觉连续性 | 严格按编号顺序`;
        
        const imageUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio);
        if (imageUrl) {
          newItems.push({
            id: crypto.randomUUID(),
            imageUrl,
            prompt: enrichedPrompt,
            description: scene.description,
            x: (i % 4) * 440 + 100 - canvasOffset.x,
            y: Math.floor(i / 4) * 280 + 100 - canvasOffset.y,
            width: baseWidth,
            height,
            isMain: false,
            filter: FilterMode.LINE_ART,
            order: startOrder + i,
            symbols: [],
            colorMode: isBlackAndWhite ? 'blackAndWhite' : 'color',
            aspectRatio
          });
        }
      }
      setItems(prev => [...prev, ...newItems]);
    } catch (e) {
      console.error("Failed to generate from script", e);
    } finally {
      setIsLoading(false);
    }
  }, [items.length, canvasOffset, globalColorMode]);

  const handleGenerateFromDialogue = useCallback(async (scenes: any[], frameCount: number, styleId: string, aspectRatio?: string) => {
    if (!scenes || scenes.length === 0) return;
    setIsLoading(true);
    try {
      const newItems: StoryboardItem[] = [];
      const startOrder = items.length;
      const isBlackAndWhite = globalColorMode === 'blackAndWhite';
      
      // 获取风格对象
      const { STYLES } = await import('./types');
      const style = STYLES.find(s => s.id === styleId);
      
      // 构建全局参数部分
      const globalParams: string[] = [];
      if (style) {
        globalParams.push(`风格: ${style.nameZh || style.name}`);
      }
      
      // 导入工具函数
      const { calculateHeight } = await import('./types');
      const baseWidth = 380;
      const height = calculateHeight(baseWidth, aspectRatio || '16:9');
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`;
        
        // 构建完整的提示词格式
        let enrichedPrompt = `== ${sceneNum} / DIALOGUE ${i + 1}/${frameCount} ==
[画面描述]: ${scene.description}
[摄像机语言]: ${scene.visualPrompt}${globalParams.length > 0 ? '\n[全局参数]: ' + globalParams.join(' | ') : ''}`;
        
        const imageUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio);
        if (imageUrl) {
          newItems.push({
            id: crypto.randomUUID(),
            imageUrl,
            prompt: enrichedPrompt,
            description: scene.description,
            x: (i % 4) * 440 + 100 - canvasOffset.x,
            y: Math.floor(i / 4) * 280 + 100 - canvasOffset.y,
            width: baseWidth,
            height,
            isMain: false,
            filter: FilterMode.LINE_ART,
            order: startOrder + i,
            symbols: [],
            colorMode: isBlackAndWhite ? 'blackAndWhite' : 'color',
            aspectRatio
          });
        }
      }
      setItems(prev => [...prev, ...newItems]);
    } catch (e) {
      console.error("Failed to generate from dialogue", e);
    } finally {
      setIsLoading(false);
    }
  }, [items.length, canvasOffset, globalColorMode]);

  const handleAction = useCallback(async (id: string, action: string, data?: any) => {
    if (action === 'delete') {
      setItems(prev => prev.filter(it => it.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else if (action === 'replace' && typeof data === 'string') {
      setItems(prev => prev.map(it => it.id === id ? { ...it, imageUrl: data } : it));
    } else if (action === 'resize' && data) {
      setItems(prev => prev.map(it => it.id === id ? { ...it, width: data.width, height: data.height } : it));
    } else if (action === 'regenerate') {
      const target = items.find(it => it.id === id);
      if (!target) return;
      setIsLoading(true);
      // 如果传入了自定义提示词，使用它；否则使用原始提示词加符号
      const promptToUse = typeof data === 'string' ? data : target.prompt;
      const symbolInstructions = target.symbols.map(s => SYMBOL_DESCRIPTIONS[lang][s.name]).join(', ');
      const enrichedPrompt = symbolInstructions ? `${promptToUse}. Key actions: ${symbolInstructions}` : promptToUse;
      const isBlackAndWhite = target.colorMode === 'blackAndWhite';
      const newUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, undefined, target.aspectRatio);
      if (newUrl) setItems(prev => prev.map(it => it.id === id ? { ...it, imageUrl: newUrl, filter: FilterMode.LINE_ART, prompt: promptToUse } : it));
      setIsLoading(false);
    } else if (action === 'copy') {
      const target = items.find(it => it.id === id);
      if (!target) return;
      const newItem = { ...target, id: crypto.randomUUID(), x: target.x + 40, y: target.y + 40, order: items.length };
      setItems(prev => [...prev, newItem]);
    } else if (action === 'setMain') {
      setItems(prev => prev.map(it => ({ ...it, isMain: it.id === id })));
    }
  }, [items, lang]);

  const getFormattedPrompts = useCallback(() => {
    if (selectedIds.size === 0) return "";
    const selectedItems = items.filter(it => selectedIds.has(it.id)).sort((a,b) => a.order - b.order);
    const mainSubject = items.find(it => it.isMain);

    let content = `${t.exportGlobalInstr}\n\n`;
    content += selectedItems.map(it => {
        const syms = it.symbols.map(s => {
          const desc = SYMBOL_DESCRIPTIONS[lang][s.name];
          if (s.name === 'ref-subject') return `[Ref Area] at ${s.x}% ${s.y}%`;
          return `Action: ${desc}`;
        }).join(', ');

        return `SCENE ${String(it.order + 1).padStart(2, '0')}\nPROMPT: ${it.prompt}\nACTIONS: ${syms || 'None'}\n`;
      }).join('\n\n');
    return content;
  }, [selectedIds, items, t, lang]);

  // 生成优化后的三段式提示词格式（中英文分开）
  const getOptimizedPrompts = useCallback(() => {
    if (selectedIds.size === 0) return { zh: "", en: "" };
    const selectedItems = items.filter(it => selectedIds.has(it.id)).sort((a,b) => a.order - b.order);
    
    // 获取风格和画幅信息
    const styleInfo = currentStyle?.nameZh || currentStyle?.name || '写实摄影';
    const styleInfoEn = currentStyle?.name || 'Realistic Photography';
    const aspectRatioInfo = currentAspectRatio || '16:9';
    
    // 生成中文版本
    const zhContent = (() => {
      let globalInstr = `【全局指令】必须按照以下规则生成视频：
1、禁止将参考图写入画面，按照参考图标注的序号生成视频
2、保持${styleInfo}风格
3、${aspectRatioInfo}画幅
【限制性指令】禁止闪烁，严禁背景形变，保持角色一致性。
单一连续电影镜头，沉浸式360度环境，无分屏，无边框，无分镜布局，无UI`;
      let content = `${globalInstr}\n\n`;
      
      content += selectedItems.map(it => {
        // 使用分镜的 order 属性生成编号，保持和画布上的编号一致
        const sceneNum = `SC-${String(it.order + 1).padStart(2, '0')}`;
        let sceneContent = `${sceneNum}\n${it.prompt}`;
        
        // 添加符号信息
        if (it.symbols && it.symbols.length > 0) {
          const symbolDescriptions = it.symbols
            .map(s => SYMBOL_DESCRIPTIONS['zh'][s.name] || s.name)
            .filter(Boolean);
          if (symbolDescriptions.length > 0) {
            sceneContent += `\n【动作与运动】${symbolDescriptions.join('，')}`;
          }
        }
        
        return sceneContent;
      }).join('\n\n');
      
      return content;
    })();
    
    // 生成英文版本
    const enContent = (() => {
      let globalInstr = `[GLOBAL] Must generate video according to the following rules:
1. Do not write reference image into the frame, generate video according to the sequence marked in the reference image
2. Maintain ${styleInfoEn} style
3. ${aspectRatioInfo} aspect ratio
[RESTRICTIVE] No flickering, no background warping, maintain character consistency.
Single continuous cinematic shot, immersive 360-degree environment, no split-screen, no borders, no storyboard layout, no UI`;
      let content = `${globalInstr}\n\n`;
      
      content += selectedItems.map(it => {
        // 使用分镜的 order 属性生成编号，保持和画布上的编号一致
        const sceneNum = `SC-${String(it.order + 1).padStart(2, '0')}`;
        let sceneContent = `${sceneNum}\n${it.prompt}`;
        
        // 添加符号信息
        if (it.symbols && it.symbols.length > 0) {
          const symbolDescriptions = it.symbols
            .map(s => SYMBOL_DESCRIPTIONS['en'][s.name] || s.name)
            .filter(Boolean);
          if (symbolDescriptions.length > 0) {
            sceneContent += `\n[Action & Motion] ${symbolDescriptions.join(', ')}`;
          }
        }
        
        return sceneContent;
      }).join('\n\n');
      
      return content;
    })();
    
    return { zh: zhContent, en: enContent };
  }, [selectedIds, items, currentStyle, currentAspectRatio]);

  const handleExportPrompts = (editedContent?: string) => {
    const content = editedContent || getFormattedPrompts();
    if (!content.trim()) return alert(t.noSelection);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Director_Prompts_${Date.now()}.txt`;
    a.click();
  };

  const handleExportJPEG = async () => {
    if (selectedIds.size === 0) return alert(t.noSelection);
    setIsLoading(true);
    
    try {
      // Separate reference subject and storyboard frames
      const refItem = items.find(it => it.isMain && selectedIds.has(it.id));
      const frameItems = items.filter(it => !it.isMain && selectedIds.has(it.id));
      
      // ✅ 新增：验证所有分镜的比例相同
      const { parseAspectRatio } = await import('./types');
      const ratios = new Set(frameItems.map(it => it.aspectRatio || '16:9'));
      if (ratios.size > 1) {
        setIsLoading(false);
        return alert(lang === 'zh' 
          ? '导出的分镜必须是同一个比例' 
          : 'All exported frames must have the same aspect ratio');
      }
      
      // Create numbering map based on selection order
      const numberMap: Record<string, number> = {};
      if (selectionOrder.length > 0) {
        // Use selection order
        let frameNum = 1;
        for (const id of selectionOrder) {
          if (frameItems.some(it => it.id === id)) {
            numberMap[id] = frameNum++;
          }
        }
      } else {
        // Use natural order (top-left to bottom-right)
        const sorted = frameItems.sort((a, b) => {
          if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
          return a.x - b.x;
        });
        sorted.forEach((it, idx) => {
          numberMap[it.id] = idx + 1;
        });
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Layout calculation
      const frameCount = frameItems.length;
      const hasRef = !!refItem;
      
      // ✅ 新增：获取统一的比例
      const frameRatio = frameItems[0]?.aspectRatio || '16:9';
      const ratio = parseAspectRatio(frameRatio);
      
      let cols: number, rows: number, frameW: number, frameH: number;
      let refW: number, refH: number, refX: number, refY: number;
      let framesStartX: number, framesStartY: number;
      const padding = 20;
      
      if (hasRef) {
        // Layout with reference: ref on left, frames on right
        refW = 300;
        refH = 400;
        frameW = 300;
        frameH = frameW / ratio;  // ✅ 改动：动态计算
        
        // 有参考主体时，分镜最多2列
        cols = Math.min(2, frameCount);
        rows = Math.ceil(frameCount / cols);
        
        const framesWidth = frameW * cols + padding * (cols - 1);
        const framesHeight = frameH * rows + padding * (rows - 1);
        
        canvas.width = refW + framesWidth + padding * 3;
        canvas.height = Math.max(refH, framesHeight) + padding * 2;
        
        refX = padding;
        refY = padding;
        framesStartX = refX + refW + padding;
        framesStartY = padding;
      } else {
        // Layout without reference: full grid
        frameW = 400;
        frameH = frameW / ratio;  // ✅ 改动：动态计算
        
        // 无参考主体时，根据数量智能调整列数
        if (frameCount <= 2) {
          cols = frameCount;
        } else if (frameCount <= 4) {
          cols = 2;
        } else if (frameCount <= 6) {
          cols = 3;
        } else {
          cols = Math.ceil(Math.sqrt(frameCount));
        }
        rows = Math.ceil(frameCount / cols);
        
        canvas.width = frameW * cols + padding * (cols + 1);
        canvas.height = frameH * rows + padding * (rows + 1);
        
        framesStartX = padding;
        framesStartY = padding;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 将图片 URL 转换为 data URL，使用代理 API
      const imageUrlToDataUrl = async (url: string, retries: number = 2): Promise<string> => {
        try {
          // 如果已经是 data URL，直接返回
          if (url.startsWith('data:')) {
            return url;
          }
          
          // 使用代理 API 来获取图片，避免 CORS 问题
          try {
            const response = await fetch('/api/proxy-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url }),
              signal: AbortSignal.timeout(15000) // 15秒超时
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.dataUrl) {
                console.log('✓ Proxy API succeeded for:', url.substring(0, 50));
                return data.dataUrl;
              }
            }
            
            console.warn('Proxy API failed with status:', response.status, 'for URL:', url.substring(0, 50));
          } catch (proxyError) {
            console.warn('Proxy API error:', proxyError instanceof Error ? proxyError.message : String(proxyError));
          }
          
          // 如果代理失败，尝试直接获取
          console.log('Attempting direct fetch for:', url.substring(0, 50));
          try {
            const directResponse = await fetch(url, {
              mode: 'no-cors',
              signal: AbortSignal.timeout(15000) // 15秒超时
            });
            
            const blob = await directResponse.blob();
            
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                console.log('✓ Direct fetch succeeded for:', url.substring(0, 50));
                resolve(reader.result as string);
              };
              reader.onerror = () => {
                console.warn('FileReader error for:', url.substring(0, 50));
                reject(new Error('FileReader error'));
              };
              reader.readAsDataURL(blob);
            });
          } catch (directError) {
            console.warn('Direct fetch failed:', directError instanceof Error ? directError.message : String(directError));
            
            // 如果还有重试次数，等待后重试
            if (retries > 0) {
              console.log(`Retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 500));
              return imageUrlToDataUrl(url, retries - 1);
            }
          }
          
          // 所有方法都失败，返回原始 URL
          console.warn('All conversion methods failed, returning original URL:', url.substring(0, 50));
          return url;
        } catch (error) {
          console.error('Unexpected error in imageUrlToDataUrl:', error);
          return url;
        }
      };

      // 改进的图片加载函数，带超时控制
      const loadImage = (url: string, timeout: number = 20000): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          const timeoutId = setTimeout(() => {
            reject(new Error(`Image load timeout: ${url.substring(0, 50)}...`));
          }, timeout);
          
          img.onload = () => {
            clearTimeout(timeoutId);
            resolve(img);
          };
          
          img.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to load image`));
          };
          
          img.src = url;
        });
      };

      // Draw reference image if exists
      if (hasRef && refItem) {
        try {
          const dataUrl = await imageUrlToDataUrl(refItem.imageUrl);
          const img = await loadImage(dataUrl, 25000);
          ctx.drawImage(img, refX, refY, refW, refH);
          
          // Red dashed border for reference
          ctx.strokeStyle = '#ff0000';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 2;
          ctx.strokeRect(refX, refY, refW, refH);
          ctx.setLineDash([]);
          
          // Label background
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(refX, refY - 25, 80, 25);
          
          // Label text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('REF', refX + 8, refY + 2);
          
          // Chinese label - 参考主体
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 12px Arial';
          const refLabel = lang === 'zh' ? '参考主体' : 'Reference';
          ctx.fillText(refLabel, refX + 90, refY + 2);
        } catch (e) { 
          console.error("Reference image load fail", e);
          // 绘制占位符
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(refX, refY, refW, refH);
          ctx.fillStyle = '#666666';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Failed to load', refX + 10, refY + 20);
        }
      }

      // Draw storyboard frames
      for (let i = 0; i < frameItems.length; i++) {
        const it = frameItems[i];
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = framesStartX + c * (frameW + padding);
        const y = framesStartY + r * (frameH + padding);
        const frameNum = numberMap[it.id] || i + 1;

        console.log(`Loading frame ${i + 1}:`, it.imageUrl.substring(0, 100));

        try {
          const dataUrl = await imageUrlToDataUrl(it.imageUrl);
          const img = await loadImage(dataUrl, 25000);
          ctx.drawImage(img, x, y, frameW, frameH);
          
          // Blue solid border for frames
          ctx.strokeStyle = '#0000ff';
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, frameW, frameH);
          
          // Scene number label
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x + 10, y + 10, 60, 28);
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 14px Inter';
          ctx.fillText(`SC-${String(frameNum).padStart(2, '0')}`, x + 18, y + 30);
          console.log(`Frame ${i + 1} loaded successfully`);
        } catch (e) { 
          console.error(`Frame ${i + 1} load fail:`, e);
          // 绘制占位符
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(x, y, frameW, frameH);
          ctx.strokeStyle = '#0000ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, frameW, frameH);
          ctx.fillStyle = '#999999';
          ctx.font = 'bold 12px Arial';
          ctx.fillText('Failed', x + 10, y + 20);
        }
      }

      // 使用 canvas.toBlob 而不是 toDataURL，更高效
      canvas.toBlob((blob) => {
        if (!blob) {
          alert(lang === 'zh' ? '导出失败，请重试' : 'Export failed, please try again');
          setIsLoading(false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Storyboard_Export_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsLoading(false);
      }, 'image/jpeg', 0.9);
    } catch (e) {
      console.error("Export failed", e);
      alert(lang === 'zh' ? '导出失败：' + String(e) : 'Export failed: ' + String(e));
      setIsLoading(false);
    }
  };

  const handleDropSymbol = (itemId: string, symName: string, x: number, y: number) => {
    const item = items.find(it => it.id === itemId);
    if (item?.isMain) return;
    setItems(prev => prev.map(it => it.id === itemId ? {
      ...it,
      symbols: [...it.symbols, { id: crypto.randomUUID(), type: 'action', name: symName, label: SYMBOL_LABELS[symName], x, y, rotation: 0 }]
    } : it));
  };

  const handleBatchRedraw = useCallback(async (instructions: Record<string, string>) => {
    if (Object.keys(instructions).length === 0) return;
    
    setIsLoading(true);
    let successCount = 0;
    let failureCount = 0;
    
    try {
      // 获取所有选中的分镜（按标注顺序）
      const selectedFrames = items.filter(it => !it.isMain && selectedIds.has(it.id));
      
      // 按标注顺序排序
      const orderedFrames = selectionOrder.length > 0 
        ? selectionOrder.map(id => selectedFrames.find(f => f.id === id)).filter(Boolean) as StoryboardItem[]
        : selectedFrames.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
            return a.x - b.x;
          });
      
      // 为每张图片生成新的提示词并重绘
      for (let i = 0; i < orderedFrames.length; i++) {
        const frame = orderedFrames[i];
        // 使用在批量重绘对话框中的序号（1-based）
        const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`;
        const instruction = instructions[sceneNum] || '';
        
        // 组合提示词：原始提示词 + 用户指令 + 符号信息
        const symbolInstructions = frame.symbols
          .map(s => SYMBOL_DESCRIPTIONS[lang][s.name] || s.name)
          .filter(Boolean)
          .join(', ');
        let finalPrompt = frame.prompt;
        
        if (instruction) {
          finalPrompt = `${finalPrompt}. ${instruction}`;
        }
        if (symbolInstructions) {
          finalPrompt = `${finalPrompt}. Key actions: ${symbolInstructions}`;
        }
        
        // 生成新图片
        const isBlackAndWhite = frame.colorMode === 'blackAndWhite';
        try {
          const newUrl = await generateSceneImage(finalPrompt, true, isBlackAndWhite, undefined, frame.aspectRatio);
          if (newUrl) {
            setItems(prev => prev.map(it => it.id === frame.id ? { ...it, imageUrl: newUrl, filter: FilterMode.LINE_ART, prompt: finalPrompt } : it));
            successCount++;
          } else {
            failureCount++;
            console.warn(`Failed to generate image for ${sceneNum}`);
          }
        } catch (frameError) {
          failureCount++;
          console.error(`Error generating image for ${sceneNum}:`, frameError);
        }
      }
      
      // 显示结果提示
      if (failureCount > 0) {
        alert(lang === 'zh' 
          ? `批量重绘完成：成功 ${successCount} 张，失败 ${failureCount} 张` 
          : `Batch redraw completed: ${successCount} succeeded, ${failureCount} failed`);
      } else if (successCount > 0) {
        alert(lang === 'zh' 
          ? `批量重绘完成：成功 ${successCount} 张` 
          : `Batch redraw completed: ${successCount} succeeded`);
      }
      
      // 关闭批量重绘对话框
      setShowBatchRedrawDialog(false);
    } catch (e) {
      console.error("Batch redraw failed", e);
      alert(lang === 'zh' 
        ? `批量重绘失败：${String(e)}` 
        : `Batch redraw failed: ${String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, [items, selectedIds, selectionOrder, lang, setShowBatchRedrawDialog]);

  const handleSidebarImport = (type: 'ref' | 'frame') => {
    importTypeRef.current = type;
    importInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const type = importTypeRef.current;
    
    // 参考主体只能上传1张，分镜最多6张
    const maxFiles = type === 'ref' ? 1 : 6;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_CONCURRENT = 3; // 最多同时处理3个文件

    const filesToProcess = Array.from(files).slice(0, maxFiles);

    // 验证文件大小
    const validFiles = filesToProcess.filter((file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件 "${file.name}" 超过 5MB 限制，已跳过`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // 如果是参考主体，先清除现有的参考主体
    if (type === 'ref') {
      setItems(prev => prev.filter(it => !it.isMain));
    }

    let processedCount = 0;
    let currentIndex = 0;
    const newItems: StoryboardItem[] = [];

    // 并发控制：一次最多处理3个文件
    const processNextFile = () => {
      if (currentIndex >= validFiles.length) {
        // 所有文件处理完成
        if (processedCount === validFiles.length) {
          setItems(prev => {
            if (type === 'ref') {
              return [...prev.filter(it => !it.isMain), ...newItems];
            } else {
              return [...prev, ...newItems];
            }
          });
        }
        return;
      }

      const file = validFiles[currentIndex] as File;
      const fileIndex = currentIndex;
      currentIndex++;

      const reader = new FileReader();
      reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
        const dataUrl = readerEvent.target?.result as string;
        const currentOrder = items.length + newItems.length;
        
        const newItem: StoryboardItem = {
          id: crypto.randomUUID(),
          imageUrl: dataUrl,
          prompt: type === 'ref' ? "Reference Subject" : "Manual Frame",
          description: "",
          x: (fileIndex % 4) * 440 + 100 - canvasOffset.x,
          y: Math.floor(fileIndex / 4) * 280 + 100 - canvasOffset.y,
          width: type === 'ref' ? 214 : 380,
          height: type === 'ref' ? 380 : 214,
          isMain: type === 'ref',
          filter: FilterMode.NORMAL,
          order: currentOrder,
          symbols: []
        };
        
        newItems.push(newItem);
        processedCount++;

        // 处理下一个文件
        processNextFile();
      };

      reader.onerror = () => {
        console.error(`文件读取失败`);
        processedCount++;
        processNextFile();
      };

      reader.readAsDataURL(file);
    };

    // 启动并发处理（最多3个）
    for (let i = 0; i < Math.min(MAX_CONCURRENT, validFiles.length); i++) {
      processNextFile();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (activeTool === ToolType.HAND) {
      setIsPanning(true);
    } else if (activeTool === ToolType.SELECT) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - canvasOffset.x) / (zoom / 100);
      const y = (e.clientY - rect.top - canvasOffset.y) / (zoom / 100);
      selectionStart.current = { x, y };
      setSelectionRect({ x, y, w: 0, h: 0 });
      if (!e.shiftKey) setSelectedIds(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === ToolType.HAND && isPanning) {
      setCanvasOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (dragState) {
      const dx = (e.clientX - dragState.startX) / (zoom / 100);
      const dy = (e.clientY - dragState.startY) / (zoom / 100);
      setItems(prev => prev.map(it => it.id === dragState.id ? { ...it, x: dragState.origX + dx, y: dragState.origY + dy } : it));
    } else if (selectionStart.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const curX = (e.clientX - rect.left - canvasOffset.x) / (zoom / 100);
      const curY = (e.clientY - rect.top - canvasOffset.y) / (zoom / 100);
      const x = Math.min(selectionStart.current.x, curX);
      const y = Math.min(selectionStart.current.y, curY);
      const w = Math.abs(curX - selectionStart.current.x);
      const h = Math.abs(curY - selectionStart.current.y);
      setSelectionRect({ x, y, w, h });
      
      const newSelected = new Set(selectedIds);
      items.forEach(it => {
        const inRect = it.x < x + w && it.x + it.width > x && it.y < y + h && it.y + it.height > y;
        if (inRect) newSelected.add(it.id);
        else if (!e.shiftKey) newSelected.delete(it.id);
      });
      setSelectedIds(newSelected);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragState(null);
    setSelectionRect(null);
    selectionStart.current = null;
  };

  if (!hasKey) return <KeySelection lang={lang} theme={theme} onSuccess={() => setHasKey(true)} onLangChange={handleLangChange} onThemeChange={handleThemeChange} />;

  return (
    <div className={`flex h-screen w-screen transition-all duration-500 overflow-hidden select-none ${theme === 'dark' ? 'bg-[#050506] text-zinc-300' : 'bg-[#f5f5f7] text-zinc-700'}`} onWheel={(e) => {
      if (e.ctrlKey) { 
        e.preventDefault(); 
        // Check if hovering over reference image
        const refItem = items.find(it => it.isMain);
        if (refItem) {
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (canvasRect) {
            const mouseX = e.clientX - canvasRect.left;
            const mouseY = e.clientY - canvasRect.top;
            const itemLeft = (refItem.x + canvasOffset.x) * (zoom / 100);
            const itemTop = (refItem.y + canvasOffset.y) * (zoom / 100);
            const itemRight = itemLeft + refItem.width * (zoom / 100);
            const itemBottom = itemTop + refItem.height * (zoom / 100);
            
            // If hovering over reference image, scale it instead of canvas
            if (mouseX >= itemLeft && mouseX <= itemRight && mouseY >= itemTop && mouseY <= itemBottom) {
              const currentScale = refItem.scale || 1;
              const newScale = Math.min(3, Math.max(0.5, currentScale + (e.deltaY > 0 ? -0.1 : 0.1)));
              setItems(prev => prev.map(it => it.id === refItem.id ? { ...it, scale: newScale } : it));
              return;
            }
          }
        }
        // Otherwise zoom canvas
        setZoom(prev => Math.min(300, Math.max(10, prev + (e.deltaY > 0 ? -5 : 5))));
      }
    }}>
      <input type="file" ref={importInputRef} onChange={handleFileImport} className="hidden" accept="image/*" multiple />
      
      <div className="fixed top-0 left-0 right-0 h-20 px-8 flex items-center justify-start z-50 no-print pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-white font-black text-3xl">L</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{lang === 'zh' ? '分镜大师' : 'Storyboard Master'}</span>
            <span className="text-xs font-bold text-purple-500 uppercase tracking-widest">{lang === 'zh' ? 'Storyboard Master' : '分镜大师'}</span>
          </div>
        </div>
      </div>

      <SidebarLeft theme={theme} lang={lang} activeTool={activeTool} setActiveTool={setActiveTool} onSettings={() => setShowSettings(true)} onImport={handleSidebarImport} zoom={zoom} onZoomChange={setZoom} onThemeChange={handleThemeChange} onLangChange={handleLangChange} colorMode={globalColorMode} onColorModeChange={setGlobalColorMode} />

      <div ref={canvasRef} className={`flex-1 relative overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'canvas-bg-dark' : 'canvas-bg-light'} ${activeTool === ToolType.HAND ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
        <div className="relative w-full h-full transition-transform duration-75" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom/100})`, transformOrigin: '0 0' }}>
          {items.map(item => (
            <StoryboardCard key={item.id} item={item} lang={lang} theme={theme} isSelected={selectedIds.has(item.id)}
              selectedCount={selectedIds.size}
              onSelect={(id, shift) => { if (activeTool === ToolType.SELECT) setSelectedIds(prev => { const n = new Set(prev); if (shift) { if (n.has(id)) { n.delete(id); setSelectionOrder(prev => prev.filter(x => x !== id)); } else { n.add(id); setSelectionOrder(prev => [...prev, id]); } } else { n.clear(); n.add(id); setSelectionOrder([id]); } return n; }); }}
              onDragStart={(e, id) => { if (activeTool === ToolType.SELECT) { const it = items.find(x => x.id === id); if (it) setDragState({ id, startX: e.clientX, startY: e.clientY, origX: it.x, origY: it.y }); } }}
              onAction={handleAction} onDropSymbol={handleDropSymbol}
              onShowBatchRedrawDialog={() => setShowBatchRedrawDialog(true)}
              onExportJPEG={handleExportJPEG}
              selectedIds={selectedIds} />
          ))}
          {selectionRect && (
            <div className="absolute border-2 border-purple-500 bg-purple-500/10 pointer-events-none z-[60]"
              style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.w, height: selectionRect.h }} />
          )}
        </div>
      </div>

      <SidebarRight 
        lang={lang} theme={theme} isLoading={isLoading} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        onGenerateFromScript={handleGenerateFromScript} onExportPrompts={handleExportPrompts} onExportJPEG={handleExportJPEG} 
        getFormattedPrompts={getOptimizedPrompts} model={model} setModel={setModel} onGenerateFromDialogue={handleGenerateFromDialogue} globalColorMode={globalColorMode} 
        onOpenHelp={() => setShowHelpModal(true)} 
        onStyleChange={setCurrentStyle}
        onAspectRatioChange={setCurrentAspectRatio}
        onGenerateVideo={handleOpenVideoGenDialog} />

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
           <div className={`max-w-2xl w-full rounded-3xl p-1 shadow-2xl overflow-hidden border ${theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200'}`}>
              <div className="p-8"><KeySelection lang={lang} theme={theme} onSuccess={() => setShowSettings(false)} onLangChange={handleLangChange} onThemeChange={handleThemeChange} /></div>
           </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className={`max-w-2xl w-full max-h-[80vh] rounded-[2rem] p-8 border flex flex-col shadow-2xl animate-in zoom-in-95 overflow-y-auto ${theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {lang === 'zh' ? '使用说明' : 'Usage Guide'}
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className={`text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-black'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto">
              {lang === 'zh' ? (
                <>
                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>📐 图片操作详解</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【调整图片大小】</p>
                        <p>1. 将鼠标放到分镜图片的右下角</p>
                        <p>2. 当光标变为「双箭头」↔ 时，按住鼠标左键</p>
                        <p>3. 向右下拖动可放大，向左上拖动可缩小</p>
                        <p>4. 松开鼠标完成调整</p>
                        <p className="text-xs mt-2">💡 提示：调整大小时，图片比例会自动保持不变</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【选择多张图片】</p>
                        <p>方法一：框选 - 在空白区域按住鼠标左键拖动形成矩形框</p>
                        <p>方法二：Shift+鼠标左键 - 按住 Shift 逐个点击要选择的图片</p>
                        <p>方法三：全选 - 按 Ctrl+A 快速全选所有分镜</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【右键菜单操作】</p>
                        <p>• 重绘（查看脚本）- 单独或批量重绘</p>
                        <p>• 下载图片 - 下载单张图片</p>
                        <p>• 删除镜头 - 删除该分镜</p>
                        <p>• 克隆镜头 - 复制该分镜</p>
                        <p>• 上传替换图片 - 用本地图片替换</p>
                        <p>• 设为参考主体 - 用作角色参考</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>🔄 批量重绘功能</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【什么是批量重绘】</p>
                        <p>批量重绘允许你同时修改多张分镜的提示词，系统会逐个发出生图指令，每张图片独立生成。</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【使用步骤】</p>
                        <p>1. 选择多张分镜（框选、Shift+点击或 Ctrl+A）</p>
                        <p>2. 右键点击任意选中的分镜</p>
                        <p>3. 选择「重绘（查看脚本）」</p>
                        <p>4. 在对话框中修改每张分镜的提示词</p>
                        <p>5. 使用「SC-01、SC-02...」按钮切换不同分镜</p>
                        <p>6. 点击「批量重绘」开始生成</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【重要说明】</p>
                        <p>• 每张图片会独立发出一条生图指令</p>
                        <p>• 系统会显示成功/失败统计</p>
                        <p>• 如果某张图片生成失败，不会影响其他图片</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>⚡ 快捷键大全</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-2 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <p>• Ctrl+A - 全选所有分镜</p>
                      <p>• Shift+鼠标左键 - 逐个选择/取消选择</p>
                      <p>• 鼠标框选 - 在空白区域拖动形成矩形框</p>
                      <p>• 右键点击 - 打开分镜菜单</p>
                      <p>• 拖动右下角 - 调整分镜大小</p>
                      <p>• 点击并拖动 - 移动分镜位置</p>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>📝 创意对话模式</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【适用场景】</p>
                        <p>您没有完整剧本，想通过与 AI 对话逐步构思分镜。</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【操作步骤】</p>
                        <p>① 切换到「创意对话」标签</p>
                        <p>② 在输入框输入您的创意想法</p>
                        <p>③ 点击 🚀 发送按钮</p>
                        <p>④ AI 会理解您的想法并生成对应的分镜场景</p>
                        <p>⑤ 继续对话，逐步完善场景细节</p>
                        <p>⑥ 当满意时，点击「生成分镜」按钮生成对应的图片</p>
                        <p>⑦ 如果想清除之前的对话重新开始，点击 🧹 清除按钮</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【重要提示】</p>
                        <p>⚠️ 多轮对话会被融合到一起。如果想生成不同风格的分镜，需要清除对话历史后重新开始。</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>📐 Image Operations Guide</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【Resize Images】</p>
                        <p>1. Move mouse to bottom-right corner of image</p>
                        <p>2. When cursor becomes double arrow ↔, hold left mouse button</p>
                        <p>3. Drag down-right to enlarge, up-left to shrink</p>
                        <p>4. Release to complete</p>
                        <p className="text-xs mt-2">💡 Tip: Aspect ratio is automatically maintained</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【Select Multiple Images】</p>
                        <p>Method 1: Marquee - Hold left mouse button in blank area and drag</p>
                        <p>Method 2: Shift+Click - Hold Shift and click images one by one</p>
                        <p>Method 3: Select All - Press Ctrl+A</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【Right-Click Menu】</p>
                        <p>• Redraw (View Script) - Redraw individually or in batch</p>
                        <p>• Download Image - Download single image</p>
                        <p>• Remove - Delete frame</p>
                        <p>• Clone - Duplicate frame</p>
                        <p>• Upload & Replace - Replace with local image</p>
                        <p>• Set as Main - Use as reference</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>🔄 Batch Redraw Feature</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【What is Batch Redraw】</p>
                        <p>Batch redraw allows you to modify prompts for multiple frames at once. Each frame is generated independently.</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【How to Use】</p>
                        <p>1. Select multiple frames (marquee, Shift+click, or Ctrl+A)</p>
                        <p>2. Right-click on any selected frame</p>
                        <p>3. Select "Redraw (View Script)"</p>
                        <p>4. Modify prompts for each frame in the dialog</p>
                        <p>5. Use "SC-01, SC-02..." buttons to switch frames</p>
                        <p>6. Click "Batch Redraw" to start generation</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【Important Notes】</p>
                        <p>• Each frame generates independently</p>
                        <p>• Success/failure count is displayed</p>
                        <p>• Failed frames don't affect others</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>⚡ Keyboard Shortcuts</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-2 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <p>• Ctrl+A - Select all frames</p>
                      <p>• Shift+Click - Select/deselect individual frames</p>
                      <p>• Marquee select - Drag in blank area to select multiple</p>
                      <p>• Right-click - Open frame menu</p>
                      <p>• Drag corner - Resize frame</p>
                      <p>• Click & drag - Move frame</p>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h4 className={`text-lg font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>📝 Creative Chat Mode</h4>
                    <div className={`text-sm leading-relaxed font-bold space-y-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div>
                        <p className="font-black mb-1">【When to Use】</p>
                        <p>You don't have a complete script and want to develop storyboards through AI conversation.</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【Steps】</p>
                        <p>① Switch to "Creative Chat" tab</p>
                        <p>② Enter your creative idea in the input field</p>
                        <p>③ Click 🚀 send button</p>
                        <p>④ AI understands and generates corresponding scenes</p>
                        <p>⑤ Continue conversation to refine details</p>
                        <p>⑥ Click "Generate Storyboard" when satisfied</p>
                        <p>⑦ Click 🧹 clear button to start fresh</p>
                      </div>
                      <div>
                        <p className="font-black mb-1">【Important】</p>
                        <p>⚠️ Multi-turn conversations are merged. Clear history first if you want different style storyboards.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all mt-8 ${theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}
            >
              {lang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </div>
      )}
      {showBatchRedrawDialog && (
        <BatchRedrawDialog
          theme={theme}
          lang={lang}
          frames={items.filter(it => !it.isMain && selectedIds.has(it.id)).sort((a, b) => {
            if (selectionOrder.length > 0) {
              const aIdx = selectionOrder.indexOf(a.id);
              const bIdx = selectionOrder.indexOf(b.id);
              return aIdx - bIdx;
            }
            if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
            return a.x - b.x;
          })}
          onClose={() => setShowBatchRedrawDialog(false)}
          onSubmit={handleBatchRedraw}
        />
      )}
      {showVideoGenDialog && (
        <VideoGenDialog
          isOpen={showVideoGenDialog}
          onClose={() => setShowVideoGenDialog(false)}
          initialPrompt={videoGenDialogPrompt}
          onGenerate={handleGenerateVideo}
          lang={lang}
          theme={theme}
        />
      )}
      {showAPIConfigDialog && (
        <APIConfigDialog
          isOpen={showAPIConfigDialog}
          onClose={() => setShowAPIConfigDialog(false)}
          onConfigured={handleAPIConfigured}
          lang={lang}
          theme={theme}
        />
      )}
      {isLoading && <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600 animate-[loading_2s_infinite] z-[100]" />}
    </div>
  );
};

export default App;
