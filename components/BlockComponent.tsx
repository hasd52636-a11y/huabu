
import React, { useState, useEffect, useRef } from 'react';
import { Block, BlockData, Character, MenuConfig } from '../types';
import { COLORS, I18N } from '../constants.tsx';
import { variableSystem } from '../services/VariableSystem';
import { characterService } from '../services/CharacterService';
import { ErrorHandler } from '../services/ErrorHandler';
// import TaggedInput from './TaggedInput'; // Moved to UnusedComponents.tsx
import {
  Trash2, RefreshCw, Scissors, Type as TextIcon, 
  Image as ImageIcon, Play, MoveDiagonal2, Type, 
  Palette, Square, Monitor, Smartphone, Clock,
  Sparkles, Send, Upload, Paperclip,
  Pencil, Check, X, Copy, Info, Eye, Download, PlayCircle,
  Users, UserPlus, UserX, Grid3X3, FileText
} from 'lucide-react';
import AspectRatioButton from './AspectRatioButton';
import PromptPreviewPopover from './PromptPreviewPopover';
// import DownloadButton from './DownloadButton'; // Moved to UnusedComponents.tsx
import MultiImageConfigModal from './MultiImageConfigModal';
import ImageEditModal from './ImageEditModal';
import DynamicMenu from './DynamicMenu';
import TextFormatModal from './TextFormatModal';
import VideoStyleModal from './VideoStyleModal';
import LanguageSelectionModal from './LanguageSelectionModal';
import type { AspectRatio } from './AspectRatioButton';
import type { MultiImageConfig } from '../types';

// Enhanced video components for error handling and fallback UI
import VideoErrorBoundary from './VideoErrorBoundary';
import VideoErrorFallback from './VideoErrorFallback';
import VideoPreviewFallback from './VideoPreviewFallback';
import EnhancedVideoPlayer from './EnhancedVideoPlayer';

// Priority Features Components
import VoiceSessionModal from './VoiceSessionModal';
import VideoCharacterModal from './VideoCharacterModal';

// Priority Features Services
import PriorityFeatureManager, { 
  VoiceConfig, 
  CharacterReplaceParams 
} from '../services/PriorityFeatureHandlers';

interface BlockProps {
  block: Block;
  isSelected: boolean;
  isPerfMode: boolean;
  isAutomationTemplate?: boolean;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string, isMulti: boolean) => void;
  onAnchorClick: (id: string, type: 'in' | 'out') => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string, prompt: string) => void;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onCreateBlock?: (blockData: Partial<Block>, x: number, y: number) => void;
  onMultiImageGenerate?: (sourceBlock: Block, config: MultiImageConfig) => void;
  lang: 'zh' | 'en';
  upstreamIds: string[];
  upstreamData?: BlockData[]; // New prop for automation data flow
  // Character-related props
  availableCharacters?: Character[];
  onCharacterSelect?: (blockId: string, character: Character | null) => void;
  onOpenCharacterPanel?: () => void;
  onOpenCharacterSelector?: (blockId: string) => void;
  onCloseCharacterSelector?: () => void;
  // Image-related props
  onOpenImagePreview?: (blockId: string) => void;
  onOpenMultiImageModal?: (blockId: string) => void;
  onOpenImageEditModal?: (blockId: string) => void;
  onOpenSmearRemovalModal?: (imageUrl: string) => void;
  // Prompt resolution
  onResolvePrompt?: (prompt: string, blockId: string) => {
    original: string;
    resolved: string;
    references: Array<{ blockNumber: string; content: string; found: boolean; type: string }>;
  };
  // Menu configuration
  menuConfig?: MenuConfig;
  // Model information
  modelId?: string;
}

// 精简版 Tooltip：独立具名触发，动画更轻盈
const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover/btn:translate-y-0 z-[9999]">
    <div className="bg-slate-900 dark:bg-black text-white px-5 py-3 rounded-lg shadow-2xl border border-white/10 whitespace-nowrap">
      <span className="text-lg font-black uppercase tracking-[0.1em]">{label}</span>
    </div>
    {/* Tooltip 小箭头 */}
    <div className="w-2 h-2 bg-slate-900 dark:bg-black border-r border-b border-white/10 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
  </div>
);

const BlockComponent: React.FC<BlockProps> = ({
  block,
  isSelected,
  isPerfMode,
  isAutomationTemplate,
  onDragStart,
  onResizeStart,
  onSelect,
  onAnchorClick,
  onDelete,
  onGenerate,
  onUpdate,
  onCreateBlock,
  onMultiImageGenerate,
  lang,
  upstreamIds,
  upstreamData = [],
  availableCharacters = [],
  onCharacterSelect,
  onOpenCharacterPanel,
  onOpenCharacterSelector,
  onCloseCharacterSelector,
  onOpenImagePreview,
  onOpenMultiImageModal,
  onOpenImageEditModal,
  onOpenSmearRemovalModal,
  onResolvePrompt,
  menuConfig,
  modelId
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>({
    label: block.aspectRatio || '1:1',
    value: block.aspectRatio || '1:1',
    width: block.aspectRatio?.startsWith('1:1') ? 1024 : 1920,
    height: block.aspectRatio?.startsWith('1:1') ? 1024 : 1080
  });
  
  // 下载菜单状态管理
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Priority Features State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showVideoCharacterModal, setShowVideoCharacterModal] = useState(false);
  const [currentMask, setCurrentMask] = useState<string>('');
  const [priorityFeatureManager, setPriorityFeatureManager] = useState<PriorityFeatureManager | null>(null);
  
  // Configuration Modal States
  const [showTextFormatModal, setShowTextFormatModal] = useState(false);
  const [showVideoStyleModal, setShowVideoStyleModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Error handling
  const [errorHandler] = useState(() => new ErrorHandler());
  const [lastError, setLastError] = useState<string | null>(null);
  const [operationProgress, setOperationProgress] = useState<{
    operation: string;
    progress: number;
    stage: string;
    estimatedTime?: number;
    startTime: number;
  } | null>(null);
  
  // 图片加载状态
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoadingProgress, setImageLoadingProgress] = useState(0);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);

  // Update currentAspectRatio when block.aspectRatio changes
  useEffect(() => {
    if (block.aspectRatio) {
      const [width, height] = block.aspectRatio.split(':').map(Number);
      setCurrentAspectRatio({
        label: block.aspectRatio,
        value: block.aspectRatio,
        width: width * 1024,
        height: height * 1024
      });
    }
  }, [block.aspectRatio]);

  // Update userInput when block content changes (for batch processing and other cases)
  useEffect(() => {
    // 对于自动化模板，优先显示content（详细指令），这样用户可以看到和修改具体的执行指令
    // 对于图片模块，不应该将base64图片设置为userInput，因为这不是用户想要的输入提示词
    if (block.type === 'text' && !block.attachmentContent) {
      // 对于文本模块，只使用originalPrompt，避免生成结果显示在指令输入框中
      const contentToUse = block.originalPrompt || '';
      setUserInput(contentToUse);
    } else if (block.originalPrompt) {
      // 对于其他类型的模块，使用originalPrompt
      setUserInput(block.originalPrompt);
    }
  }, [block.originalPrompt, block.type, block.attachmentContent]);

  // Video blocks start empty like text and image blocks

  // Initialize Priority Feature Manager
  useEffect(() => {
    const initializePriorityFeatures = async () => {
      try {
        const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
        const shenmaService = new ShenmaService({
          provider: 'shenma',
          apiKey: '', // Will be set from config
          baseUrl: 'https://api.shenma.com',
          llmModel: 'gpt-4o',
          imageModel: 'nano-banana',
          videoModel: 'sora-2'
        });
        
        const manager = new PriorityFeatureManager(shenmaService);
        setPriorityFeatureManager(manager);
      } catch (error) {
        console.error('Failed to initialize priority feature manager:', error);
      }
    };
    
    initializePriorityFeatures();
  }, []);

  // Enhanced error handling function
  const handleFeatureError = async (error: Error, operation: string, blockId: string = block.id): Promise<boolean> => {
    try {
      const result = await errorHandler.handleError(error, {
        blockId,
        executionId: `${blockId}-${Date.now()}`,
        operation,
        attempt: 0
      });

      const userMessage = errorHandler.createUserFriendlyErrorMessage(error, operation);
      setLastError(userMessage);
      
      // Auto-clear error after 10 seconds
      setTimeout(() => setLastError(null), 10000);

      // Show user-friendly error message
      const recoveryInfo = errorHandler.getErrorRecoveryInfo(result.errorInfo.type);
      alert(`${recoveryInfo.userMessage}\n\n操作: ${operation}\n\n建议: ${recoveryInfo.recoveryActions[0]}`);

      return result.shouldRetry;
    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      alert(`操作失败: ${operation}\n错误: ${error.message}\n\n请稍后重试或联系技术支持。`);
      return false;
    }
  };

  // Provider compatibility validation
  const validateProviderCompatibility = (featureType: string, operation: string): { isCompatible: boolean; message?: string } => {
    // Get current provider from modelId or default to 'shenma'
    const currentProvider = modelId?.includes('gemini') ? 'google' : 
                           modelId?.includes('gpt') ? 'openai' : 
                           modelId?.includes('claude') ? 'anthropic' : 'shenma';

    // Define feature-provider compatibility matrix
    const compatibilityMatrix: Record<string, string[]> = {
      'voice': ['shenma'], // Voice features only work with ShenmaAPI
      'smear-edit': ['shenma'], // Smear editing only with ShenmaAPI
      'video-character': ['shenma'], // Video character replacement only with ShenmaAPI
      'video-analysis': ['shenma', 'google'], // Video analysis with ShenmaAPI and Google
      'image-enhance': ['shenma'], // Image enhancement only with ShenmaAPI
      'background-removal': ['shenma'], // Background removal only with ShenmaAPI
      'image-variations': ['openai', 'shenma'], // Image variations with OpenAI and ShenmaAPI
      'text-processing': ['google', 'openai', 'anthropic', 'shenma'], // Text processing with all providers
      'image-generation': ['google', 'openai', 'shenma'], // Image generation with most providers
      'video-generation': ['shenma'] // Video generation only with ShenmaAPI
    };

    const supportedProviders = compatibilityMatrix[featureType];
    
    if (!supportedProviders) {
      // Unknown feature type, assume compatible
      return { isCompatible: true };
    }

    const isCompatible = supportedProviders.includes(currentProvider);
    
    if (!isCompatible) {
      const providerNames = {
        'shenma': '神马API',
        'google': 'Google AI',
        'openai': 'OpenAI',
        'anthropic': 'Anthropic'
      };
      
      const currentProviderName = providerNames[currentProvider as keyof typeof providerNames] || currentProvider;
      const supportedProviderNames = supportedProviders.map(p => providerNames[p as keyof typeof providerNames] || p).join('、');
      
      return {
        isCompatible: false,
        message: `${operation}功能仅支持以下提供商: ${supportedProviderNames}\n\n当前使用的是: ${currentProviderName}\n\n请在设置中切换到支持的提供商后重试。`
      };
    }

    return { isCompatible: true };
  };

  // Feature availability checking
  const checkFeatureAvailability = (featureId: string): { isAvailable: boolean; reason?: string; suggestion?: string } => {
    // Check basic requirements first
    switch (featureId) {
      case 'image-analyze':
      case 'image-enhance':
      case 'image-remove-background':
      case 'image-variation':
        if (!block.content) {
          return {
            isAvailable: false,
            reason: '需要先生成或上传图片',
            suggestion: '请先使用图片生成功能或上传图片文件'
          };
        }
        break;
        
      case 'video-analyze':
      case 'video-character-replace':
      case 'video-style-transfer':
        if (!block.content) {
          return {
            isAvailable: false,
            reason: '需要先生成或上传视频',
            suggestion: '请先使用视频生成功能或上传视频文件'
          };
        }
        break;
        
      case 'text-summarize':
      case 'text-translate':
      case 'text-format':
        if (!block.content || block.content.trim().length === 0) {
          return {
            isAvailable: false,
            reason: '需要先输入或生成文本内容',
            suggestion: '请先在文本框中输入内容或使用文本生成功能'
          };
        }
        break;
        
      case 'multi-image-analyze':
        // Check if there are other image blocks available
        // This would need to be passed from parent component
        break;
        
      case 'voice-realtime':
      case 'voice-session':
        // Check if browser supports voice features
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return {
            isAvailable: false,
            reason: '浏览器不支持语音功能',
            suggestion: '请使用支持WebRTC的现代浏览器（Chrome、Firefox、Safari等）'
          };
        }
        break;
    }

    // Check provider compatibility
    const featureTypeMap: Record<string, string> = {
      'image-analyze': 'video-analysis',
      'image-enhance': 'image-enhance',
      'image-remove-background': 'background-removal',
      'image-variation': 'image-variations',
      'video-analyze': 'video-analysis',
      'video-character-replace': 'video-character',
      'video-style-transfer': 'video-character',
      'text-summarize': 'text-processing',
      'text-translate': 'text-processing',
      'text-format': 'text-processing',
      'voice-realtime': 'voice',
      'voice-session': 'voice',
      'smear-edit': 'smear-edit',
      'smear-removal': 'smear-edit'
    };

    const featureType = featureTypeMap[featureId];
    if (featureType) {
      const compatibility = validateProviderCompatibility(featureType, featureId);
      if (!compatibility.isCompatible) {
        return {
          isAvailable: false,
          reason: '当前提供商不支持此功能',
          suggestion: compatibility.message
        };
      }
    }

    return { isAvailable: true };
  };

  // Enhanced operation wrapper with retry logic and provider validation
  const executeWithErrorHandling = async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    featureType?: string,
    blockId: string = block.id,
    progressCallback?: (progress: number, stage: string) => void
  ): Promise<T | null> => {
    // Validate provider compatibility first
    if (featureType) {
      const compatibility = validateProviderCompatibility(featureType, operationName);
      if (!compatibility.isCompatible) {
        alert(compatibility.message);
        return null;
      }
    }

    try {
      onUpdate(blockId, { status: 'processing' });
      
      // Initialize progress tracking
      const startTime = Date.now();
      setOperationProgress({
        operation: operationName,
        progress: 0,
        stage: '准备中...',
        startTime
      });

      // Create progress updater
      const updateProgress = (progress: number, stage: string, estimatedTime?: number) => {
        setOperationProgress({
          operation: operationName,
          progress: Math.min(progress, 95), // Cap at 95% until completion
          stage,
          estimatedTime,
          startTime
        });
        progressCallback?.(progress, stage);
      };

      // Simulate progress for operations without native progress support
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => {
          if (!prev) return null;
          const elapsed = Date.now() - prev.startTime;
          const estimatedTotal = 30000; // 30 seconds estimated
          const calculatedProgress = Math.min((elapsed / estimatedTotal) * 90, 90);
          
          let stage = prev.stage;
          if (calculatedProgress > 20 && stage === '准备中...') stage = '处理中...';
          if (calculatedProgress > 60 && stage === '处理中...') stage = '完成中...';
          
          return {
            ...prev,
            progress: calculatedProgress,
            stage,
            estimatedTime: Math.max(0, estimatedTotal - elapsed)
          };
        });
      }, 1000);

      const result = await errorHandler.executeWithRetry(operation, {
        blockId,
        executionId: `${blockId}-${Date.now()}`,
        operation: operationName
      });

      // Clear progress tracking
      clearInterval(progressInterval);
      setOperationProgress({
        operation: operationName,
        progress: 100,
        stage: '完成',
        startTime
      });
      
      // Auto-clear progress after 2 seconds
      setTimeout(() => setOperationProgress(null), 2000);
      
      onUpdate(blockId, { status: 'idle' });
      return result;
    } catch (error) {
      // Clear progress on error
      setOperationProgress(null);
      onUpdate(blockId, { status: 'idle' });
      await handleFeatureError(error as Error, operationName, blockId);
      return null;
    }
  };

  const handleRatioChange = (ratio: AspectRatio) => {
    setCurrentAspectRatio(ratio);
    onUpdate(block.id, { aspectRatio: ratio.value });
  };

  const handleDownload = () => {
    if (block.type === 'image' && block.content) {
      const link = document.createElement('a');
      link.href = block.content;
      link.download = `image-${block.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const t = I18N[lang];

  const theme = block.type === 'text' ? COLORS.text : 
                block.type === 'image' ? COLORS.image : 
                block.type === 'video' ? COLORS.video : 
                COLORS.text; // Default fallback to text theme

  // Get selected character by characterId
  const getSelectedCharacter = (): Character | undefined => {
    if (!block.characterId) return undefined;
    return availableCharacters.find(char => char.id === block.characterId);
  };

  // Get available variables from upstream data
  const availableVariables = upstreamData.map(data => data.blockNumber);
  
  // Check if current input has variables and validate them
  const hasVariables = variableSystem.hasVariables(userInput);
  const variableErrors = variableSystem.validateVariables(userInput, availableVariables);

  // 定义三个固定的字号档位
  const FONT_SIZES = [18, 56, 112];

  const cycleFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = block.fontSize || 18;
    const currentIndex = FONT_SIZES.indexOf(current);
    // 如果不在列表中（比如导入的数据），默认回到第一档
    const nextIndex = (currentIndex + 1) % FONT_SIZES.length;
    onUpdate(block.id, { fontSize: FONT_SIZES[nextIndex] });
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() && upstreamIds.length === 0) return;
    
    let finalPrompt = userInput;
    
    // 不要在这里解析变量！让 App.tsx 的 handleGenerate 统一处理
    // 只保存原始提示词
    onUpdate(block.id, { 
      originalPrompt: userInput,  // 保存原始的未解析提示词
      imageMetadata: {
        ...block.imageMetadata,
        generatedAt: Date.now()
      }
    });
    
    // 传递原始提示词给 handleGenerate，让它来处理引用解析
    onGenerate(block.id, userInput);
  };

  const insertVariable = (blockNumber: string) => {
    // Insert variable text directly into textarea
    const variable = `[${blockNumber}]`;
    const textarea = inputRef.current as HTMLTextAreaElement;
    
    if (textarea) {
      const cursorPos = textarea.selectionStart || userInput.length;
      const newValue = userInput.slice(0, cursorPos) + variable + ' ' + userInput.slice(cursorPos);
      setUserInput(newValue);
      
      // Focus and set cursor position after the inserted variable
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          const newPos = cursorPos + variable.length + 1;
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      // Fallback: append to end
      setUserInput(prev => prev + variable + ' ');
    }
  };

  const copyIdToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = `[${block.number}]`;
    navigator.clipboard.writeText(tag);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // Generate input info text for display when no content
  const generateInputInfoText = () => {
    const inputInfo: string[] = [];

    // Add upstream module information with content summaries
    if (upstreamData && upstreamData.length > 0) {
      // Format upstream inputs with content summaries
      const upstreamInputs = upstreamData.map(data => {
        const typeText = data.type === 'text' ? '文本' : data.type === 'image' ? '图片' : '视频';
        const summary = generateContentSummary(data);
        return `[${data.blockNumber}]${typeText}: ${summary}`;
      }).join('，');
      
      if (upstreamInputs) {
        inputInfo.push(`${block.number}接收到${upstreamInputs}`);
      }
    } else if (upstreamIds.length > 0) {
      // Fallback if upstreamData is not available
      const upstreamInputs = upstreamIds.map(id => {
        const typeText = id.charAt(0) === 'A' ? '文本输入' : id.charAt(0) === 'B' ? '图片输入' : '视频输入';
        return `[${id}]${typeText}`;
      }).join('，');
      
      if (upstreamInputs) {
        inputInfo.push(`${block.number}接收到${upstreamInputs}`);
      }
    }

    // Add current module's feature selections
    if (block.type === 'video') {
      // Aspect ratio
      if (block.aspectRatio) {
        const orientation = block.aspectRatio === '16:9' ? '横屏' : '竖屏';
        inputInfo.push(orientation);
      }
      // Duration
      if (block.duration) {
        inputInfo.push(`${block.duration}秒`);
      }
    } else if (block.type === 'image') {
      // Aspect ratio
      if (block.aspectRatio) {
        inputInfo.push(`比例 ${block.aspectRatio}`);
      }
    } else if (block.type === 'text') {
      // Text specific settings
      if (block.fontSize) {
        inputInfo.push(`字号 ${block.fontSize}px`);
      }
    }

    return inputInfo.join('，');
  };

  // Generate content summary for upstream data display
  const generateContentSummary = (data: BlockData): string => {
    if (!data.content) return '无内容';
    
    const maxLength = 20; // 显示前20个字符，更符合用户期望
    let summary = data.content.trim();
    
    // 对不同类型的内容进行不同的摘要处理
    if (data.type === 'text') {
      // 文本内容：显示前20个字符，如"锄禾日当午，汗滴禾下土..."
      if (summary.length > maxLength) {
        summary = `"${summary.substring(0, maxLength)}..."`;
      } else {
        summary = `"${summary}"`;
      }
    } else if (data.type === 'image') {
      // 图片内容：显示图片信息
      if (summary.startsWith('data:image/')) {
        const sizeMatch = summary.match(/data:image\/(\w+);/);
        const format = sizeMatch ? sizeMatch[1].toUpperCase() : 'IMAGE';
        summary = `${format}图片已生成`;
      } else if (summary.startsWith('http')) {
        summary = '在线图片';
      } else {
        summary = '图片内容';
      }
    } else if (data.type === 'video') {
      // 视频内容：显示视频信息
      if (summary.startsWith('http')) {
        summary = '视频已生成';
      } else {
        summary = '视频内容';
      }
    }
    
    return summary;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use EnhancedBatchUploadHandler for better file handling
    try {
      const { EnhancedBatchUploadHandler } = await import('../services/EnhancedBatchUploadHandler');
      
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'zh' ? '文件大小不能超过 5MB' : 'File size must be less than 5MB');
        return;
      }

      // Process single file using enhanced handler
      const fileList = { 
        0: file, 
        length: 1,
        item: (index: number) => index === 0 ? file : null,
        [Symbol.iterator]: function* () { yield file; }
      } as unknown as FileList;
      
      const result = await EnhancedBatchUploadHandler.processBatchUpload(
        fileList,
        block.type,
        block.id
      );

      if (result.items.length > 0 && result.items[0].status === 'completed') {
        // 文本块：将文件内容保存为附件，不覆盖指令
        if (block.type === 'text') {
          onUpdate(block.id, { 
            attachmentContent: result.items[0].content,
            attachmentFileName: file.name,
            status: 'idle' 
          });
        } else {
          // 图片和视频块：保存为主要内容
          onUpdate(block.id, { content: result.items[0].content, status: 'idle' });
        }
      } else if (result.items[0].error) {
        alert(result.items[0].error);
      }
    } catch (error) {
      // Fallback to original implementation with file type validation
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'zh' ? '文件大小不能超过 5MB' : 'File size must be less than 5MB');
        return;
      }

      // Validate file type based on block type
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidType = block.type === 'text' && ['.txt', '.md', '.js', '.ts', '.tsx', '.json', '.css', '.html', '.doc', '.docx', '.pdf'].includes(fileExt) ||
                        block.type === 'image' && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(fileExt) ||
                        block.type === 'video' && ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(fileExt);
      
      if (!isValidType) {
        alert(lang === 'zh' ? `不支持的文件类型：${fileExt}` : `Unsupported file type: ${fileExt}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        
        // 根据块类型处理文件内容
        if (block.type === 'text') {
          // 文本块：将文件内容添加到附件字段，不覆盖指令
          onUpdate(block.id, {
            attachmentContent: content,
            attachmentFileName: file.name,
            status: 'idle'
          });
        } else if (block.type === 'image') {
          // 图片块：将上传的图片保存为附件（参考图片），不覆盖content
          onUpdate(block.id, {
            attachmentContent: content, // 保存为附件内容
            attachmentFileName: file.name,
            status: 'idle',
            imageMetadata: {
              ...block.imageMetadata,
              originalReferenceImage: content,
              referenceFileName: file.name
            }
          });
        } else if (block.type === 'video') {
          // 视频块：将上传的视频保存为附件（参考视频），不覆盖content
          onUpdate(block.id, {
            attachmentContent: content, // 保存为附件内容
            attachmentFileName: file.name,
            status: 'idle',
            videoMetadata: {
              ...block.videoMetadata,
              originalReferenceVideo: content,
              referenceFileName: file.name
            }
          });
        }
      };

    if (block.type === 'text') {
      reader.readAsText(file);
    } else if (block.type === 'image') {
      reader.readAsDataURL(file);
    } else if (block.type === 'video') {
      reader.readAsDataURL(file);
    }
    }
    
    e.target.value = '';
  };

  const getChipColor = (blockNumber: string) => {
    if (blockNumber.startsWith('A')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20';
    if (blockNumber.startsWith('B')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20';
    if (blockNumber.startsWith('V')) return 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20';
  };

  // Get multi-image group styling
  const getMultiImageStyling = () => {
    if (block.isMultiImageSource) {
      return {
        borderColor: '#3b82f6', // Blue for source
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)',
        className: 'ring-2 ring-blue-500/30'
      };
    } else if (block.multiImageGroupId && block.multiImageIndex !== undefined) {
      return {
        borderColor: '#10b981', // Green for generated images
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.2)',
        className: 'ring-2 ring-emerald-500/30'
      };
    }
    return {
      borderColor: theme?.border || '#2563EB', // Fallback to blue
      boxShadow: '',
      className: ''
    };
  };

  const multiImageStyling = getMultiImageStyling();

  // Task 2: Image feature handlers with enhanced error handling
  const handleImageAnalyze = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const result = await executeWithErrorHandling(async () => {
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '', // Will be set from current provider config
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const analysis = await shenmaService.analyzeImage(
        block.content, 
        '请详细分析这张图片的内容、风格和特点'
      );
      
      // 创建新的文本块显示分析结果
      if (onCreateBlock) {
        onCreateBlock({
          type: 'text',
          content: analysis,
          originalPrompt: '图片分析结果'
        }, block.x + 300, block.y);
      }
      
      return analysis;
    }, '图片分析', 'video-analysis'); // Use video-analysis compatibility for image analysis

    if (result) {
      // Success feedback
      const successMessage = '图片分析完成！分析结果已创建为新的文本块。';
      console.log(successMessage);
    }
  };

  const handleMultiImageAnalyze = async () => {
    // 简化实现：提示用户提供多张图片的URL
    const imageUrls = [];
    let imageUrl = '';
    let count = 0;
    
    // 收集图片URL
    while (count < 5) { // 最多5张图片
      imageUrl = prompt(`请输入第${count + 1}张图片的URL（留空结束输入）:`);
      if (!imageUrl || imageUrl.trim() === '') {
        break;
      }
      imageUrls.push(imageUrl.trim());
      count++;
    }
    
    if (imageUrls.length < 2) {
      alert('请至少提供2张图片的URL进行多图分析');
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用多模态分析功能
      const analysis = await shenmaService.analyzeMultipleImages(
        imageUrls,
        '请分析这些图片之间的关系、共同点、差异和整体主题'
      );
      
      // 创建新的文本块显示分析结果
      if (onCreateBlock) {
        onCreateBlock({
          type: 'text',
          content: analysis,
          originalPrompt: `多图分析结果 (${imageUrls.length}张图片)`
        }, block.x + 300, block.y);
      }
      
      alert(`成功分析了${imageUrls.length}张图片的关系`);
    } catch (error) {
      console.error('多图分析失败:', error);
      alert(`多图分析失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Task 2: Additional image feature handlers
  const handleImageCopy = async () => {
    if (!block.content) {
      alert('没有图片可复制');
      return;
    }
    
    try {
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const success = await shenmaService.copyImageToClipboard(block.content);
      if (success) {
        alert('图片已复制到剪贴板');
      } else {
        alert('复制失败，请重试');
      }
    } catch (error) {
      console.error('复制图片失败:', error);
      alert(`复制失败: ${error.message}`);
    }
  };

  const handlePreviewPrompt = () => {
    if (!block.originalPrompt) {
      alert('没有提示词可预览');
      return;
    }
    
    // 显示提示词预览
    const resolvedPrompt = onResolvePrompt?.(block.originalPrompt, block.id);
    if (resolvedPrompt) {
      alert(`原始提示词: ${resolvedPrompt.original}\n\n解析后提示词: ${resolvedPrompt.resolved}`);
    } else {
      alert(`提示词: ${block.originalPrompt}`);
    }
  };

  const handleImageVariation = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const variations = await shenmaService.generateImageVariations(block.content, 4);
      
      // 为每个变体创建新的图片块
      variations.forEach((variation, index) => {
        if (onCreateBlock) {
          onCreateBlock({
            type: 'image',
            content: variation,
            originalPrompt: `${block.originalPrompt || '图片'} - 变体 ${index + 1}`
          }, block.x + (index % 2) * 300, block.y + Math.floor(index / 2) * 200);
        }
      });
      
      alert(`成功生成 ${variations.length} 个图片变体`);
    } catch (error) {
      console.error('生成图片变体失败:', error);
      alert(`生成变体失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleImageEnhance = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const result = await executeWithErrorHandling(async () => {
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const enhancedImage = await shenmaService.enhanceImage(block.content);
      
      // 更新当前块的内容
      onUpdate(block.id, { 
        content: enhancedImage,
        originalPrompt: `${block.originalPrompt || '图片'} - 已增强`
      });
      
      return enhancedImage;
    }, '图片增强', 'image-enhance');

    if (result) {
      alert('图片增强完成');
    }
  };

  const handleRemoveBackground = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const processedImage = await shenmaService.removeBackground(block.content);
      
      // 更新当前块的内容
      onUpdate(block.id, { 
        content: processedImage,
        originalPrompt: `${block.originalPrompt || '图片'} - 已移除背景`
      });
      
      alert('背景移除完成');
    } catch (error) {
      console.error('移除背景失败:', error);
      alert(`移除背景失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Task 3: Video feature handlers
  const handleVideoAnalyze = async () => {
    if (!block.content) {
      alert('请先生成或上传视频');
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const analysis = await shenmaService.analyzeVideo(
        block.content, 
        '请详细分析这个视频的内容、场景和动作'
      );
      
      // 创建新的文本块显示分析结果
      if (onCreateBlock) {
        onCreateBlock({
          type: 'text',
          content: analysis,
          originalPrompt: '视频分析结果'
        }, block.x + 300, block.y);
      }
    } catch (error) {
      console.error('视频分析失败:', error);
      alert(`视频分析失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleVideoCharacterReplace = async () => {
    if (!block.content) {
      alert('请先生成或上传视频');
      return;
    }
    
    // 简化实现：提示用户需要角色图片
    const characterImageUrl = prompt('请输入角色图片URL（或上传角色图片后获取URL）:');
    if (!characterImageUrl) {
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const newVideoUrl = await shenmaService.replaceVideoCharacter(
        block.content,
        characterImageUrl,
        '替换视频中的角色，保持原有动作和场景'
      );
      
      // 更新当前块的内容
      onUpdate(block.id, { 
        content: newVideoUrl,
        originalPrompt: `${block.originalPrompt || '视频'} - 已替换角色`
      });
      
      alert('视频角色替换完成');
    } catch (error) {
      console.error('视频角色替换失败:', error);
      alert(`角色替换失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleMultiImageToVideo = async () => {
    // 提示用户提供多张图片URL
    const imageUrls = [];
    let imageUrl = '';
    let count = 0;
    
    // 收集图片URL
    while (count < 10) { // 最多10张图片
      imageUrl = prompt(`请输入第${count + 1}张图片的URL（留空结束输入）:`);
      if (!imageUrl || imageUrl.trim() === '') {
        break;
      }
      imageUrls.push(imageUrl.trim());
      count++;
    }
    
    if (imageUrls.length < 2) {
      alert('请至少提供2张图片的URL进行多图生视频');
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const videoUrl = await shenmaService.generateVideoFromMultipleImages(
        imageUrls,
        '根据这些图片生成连贯的视频，保持图片间的逻辑关系'
      );
      
      // 创建新的视频块
      if (onCreateBlock) {
        onCreateBlock({
          type: 'video',
          content: videoUrl,
          originalPrompt: `多图生视频 (${imageUrls.length}张图片)`
        }, block.x + 300, block.y);
      }
      
      alert(`成功从${imageUrls.length}张图片生成视频`);
    } catch (error) {
      console.error('多图生视频失败:', error);
      alert(`生成失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Task 4: Text feature handlers
  const handleTextSummarize = async () => {
    if (!block.content) {
      alert('没有文本可摘要');
      return;
    }
    
    const result = await executeWithErrorHandling(async () => {
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const summary = await shenmaService.summarizeText(block.content);
      
      // 创建新的文本块显示摘要
      if (onCreateBlock) {
        onCreateBlock({
          type: 'text',
          content: summary,
          originalPrompt: '文本摘要'
        }, block.x + 300, block.y);
      }
      
      return summary;
    }, '文本摘要', 'text-processing');

    if (result) {
      alert('文本摘要完成！摘要结果已创建为新的文本块。');
    }
  };

  const handleTextTranslate = async (targetLanguage: string, options: any) => {
    if (!block.content) {
      alert('没有文本可翻译');
      return;
    }

    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const translatedText = await shenmaService.translateText(block.content, targetLanguage);
      
      onUpdate(block.id, { 
        content: translatedText,
        originalPrompt: `翻译为${targetLanguage}`
      });
      
      console.log('Text translated successfully');
    } catch (error) {
      console.error('Text translation failed:', error);
      alert('文本翻译失败，请重试');
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleTextFormat = async (formatType: string, options: any) => {
    if (!block.content) {
      alert('没有文本可格式化');
      return;
    }

    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const formattedText = await shenmaService.formatText(block.content, formatType);
      
      onUpdate(block.id, { 
        content: formattedText,
        originalPrompt: `${block.originalPrompt || '文本'} - 已格式化为${formatType}`
      });
      
      console.log('Text formatted successfully');
    } catch (error) {
      console.error('Text formatting failed:', error);
      alert('文本格式化失败，请重试');
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleVideoStyleTransfer = async (style: string, options: any) => {
    if (!block.content) {
      alert('没有视频可处理');
      return;
    }

    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const prompt = `Apply ${style} style to this video while maintaining the original content and motion`;
      const styledVideoUrl = await shenmaService.transferVideoStyle(block.content, style, prompt);
      
      onUpdate(block.id, { 
        content: styledVideoUrl,
        originalPrompt: `${block.originalPrompt || '视频'} - ${style}风格`
      });
      
      console.log('Video style transfer completed successfully');
    } catch (error) {
      console.error('Video style transfer failed:', error);
      alert('视频风格迁移失败，请重试');
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Task 5: Canvas feature handlers
  const handleCanvasCopy = () => {
    // 复制块功能需要在父组件实现
    alert('复制模块功能需要在画布层面操作，请使用Ctrl+C或右键菜单');
  };

  // Task 6: Voice feature handler
  const handleVoiceRealtime = async () => {
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      const voiceSession = await shenmaService.generateVoiceChatLink();
      
      if (voiceSession && voiceSession.websocketUrl) {
        // 在新窗口打开语音聊天
        window.open(voiceSession.websocketUrl, '_blank');
        alert('语音对话已在新窗口打开');
      } else {
        alert('无法生成语音对话链接，请检查API配置');
      }
    } catch (error) {
      console.error('启动语音对话失败:', error);
      alert(`语音对话失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Text color toggle handler
  const handleTextColorToggle = () => {
    if (block.type !== 'text') {
      alert('只有文本块支持颜色切换');
      return;
    }
    
    // 定义颜色选项
    const colors = [
      '#334155', // 默认灰色
      '#2563EB', // 蓝色
      '#DC2626', // 红色
      '#059669', // 绿色
      '#7C3AED', // 紫色
      '#EA580C', // 橙色
      '#0891B2', // 青色
      '#BE185D'  // 粉色
    ];
    
    const currentColor = block.textColor || '#334155';
    const currentIndex = colors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % colors.length;
    const nextColor = colors[nextIndex];
    
    onUpdate(block.id, { textColor: nextColor });
  };

  // Additional Image Feature Handlers
  const handleImageCrop = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    // 简化实现：提供几种常见的裁剪比例
    const cropOptions = ['1:1', '4:3', '16:9', '9:16', '2:3', '3:2'];
    const currentRatio = block.aspectRatio || '1:1';
    const choice = prompt(`当前比例: ${currentRatio}\n\n选择裁剪比例:\n${cropOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n请输入数字选择:`, '1');
    
    if (!choice || isNaN(Number(choice)) || Number(choice) < 1 || Number(choice) > cropOptions.length) {
      return;
    }
    
    const selectedRatio = cropOptions[Number(choice) - 1];
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的图像裁剪API
      const croppedImage = await shenmaService.cropImage(
        block.content,
        `裁剪为${selectedRatio}比例，保持主要内容居中`
      );
      
      onUpdate(block.id, { 
        content: croppedImage,
        aspectRatio: selectedRatio as any,
        isCropped: true,
        originalPrompt: `${block.originalPrompt || '图片'} - 裁剪为${selectedRatio}`
      });
      
      alert(`图片已裁剪为 ${selectedRatio} 比例`);
    } catch (error) {
      console.error('图片裁剪失败:', error);
      alert(`图片裁剪失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleImageStyleTransfer = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const styleOptions = ['油画风格', '水彩风格', '素描风格', '卡通风格', '动漫风格', '抽象艺术', '印象派', '波普艺术'];
    const styleChoice = prompt(`请选择风格类型:\n${styleOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n请输入数字选择:`, '1');
    
    if (!styleChoice || isNaN(Number(styleChoice)) || Number(styleChoice) < 1 || Number(styleChoice) > styleOptions.length) {
      return;
    }
    
    const selectedStyle = styleOptions[Number(styleChoice) - 1];
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的风格迁移API
      const styledImage = await shenmaService.transferImageStyle(
        block.content,
        `转换为${selectedStyle}，保持原有构图和主要元素`
      );
      
      onUpdate(block.id, { 
        content: styledImage,
        originalPrompt: `${block.originalPrompt || '图片'} - ${selectedStyle}`
      });
      
      alert(`图片风格迁移完成 - ${selectedStyle}`);
    } catch (error) {
      console.error('图片风格迁移失败:', error);
      alert(`风格迁移失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleImageAddElement = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const element = prompt('请描述要添加的元素（如：一只蝴蝶、一朵花、一个人物等）:');
    if (!element || element.trim() === '') {
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的添加元素API
      const editedImage = await shenmaService.addImageElement(
        block.content,
        element
      );
      
      onUpdate(block.id, { 
        content: editedImage,
        originalPrompt: `${block.originalPrompt || '图片'} - 添加${element}`
      });
      
      alert(`成功添加元素: ${element}`);
    } catch (error) {
      console.error('添加元素失败:', error);
      alert(`添加元素失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleImageReplaceElement = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const oldElement = prompt('请描述要替换的元素（如：背景中的建筑、人物的衣服等）:');
    if (!oldElement || oldElement.trim() === '') {
      return;
    }
    
    const newElement = prompt('请描述替换后的元素:');
    if (!newElement || newElement.trim() === '') {
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的替换元素API
      const editedImage = await shenmaService.replaceImageElement(
        block.content,
        `将${oldElement}替换为${newElement}`
      );
      
      onUpdate(block.id, { 
        content: editedImage,
        originalPrompt: `${block.originalPrompt || '图片'} - 替换${oldElement}为${newElement}`
      });
      
      alert(`成功替换元素: ${oldElement} → ${newElement}`);
    } catch (error) {
      console.error('替换元素失败:', error);
      alert(`替换元素失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Additional Video Feature Handlers
  const handleImageToVideo = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const motion = prompt('请描述希望的动作效果（如：轻微摇摆、缓慢旋转、波浪效果等）:', '轻微摇摆');
    if (!motion) {
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用现有的视频生成API
      const videoResult = await shenmaService.generateVideo(
        `基于这张图片生成视频，添加${motion}效果，保持图片的主要内容和风格`,
        {
          aspectRatio: block.aspectRatio === '1:1' ? '16:9' : (block.aspectRatio as any) || '16:9',
          duration: 10,
          referenceImage: block.content
        }
      );
      
      // 创建新的视频块
      if (onCreateBlock) {
        onCreateBlock({
          type: 'video',
          content: '', // 将在轮询完成后更新
          originalPrompt: `图生视频 - ${motion}`,
          aspectRatio: block.aspectRatio === '1:1' ? '16:9' : (block.aspectRatio as any) || '16:9'
        }, block.x + 300, block.y);
      }
      
      alert('图生视频任务已提交，请等待生成完成');
    } catch (error) {
      console.error('图生视频失败:', error);
      alert(`图生视频失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleVideoToVideo = async () => {
    if (!block.content) {
      alert('请先生成或上传视频');
      return;
    }
    
    const transformation = prompt('请描述希望的视频变换（如：改变场景、添加特效、改变风格等）:');
    if (!transformation || transformation.trim() === '') {
      return;
    }
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用视频风格迁移API
      const newVideo = await shenmaService.transferVideoStyle(
        block.content,
        transformation,
        `对这个视频进行${transformation}，保持原有的动作和时长`
      );
      
      onUpdate(block.id, { 
        content: newVideo,
        originalPrompt: `${block.originalPrompt || '视频'} - ${transformation}`
      });
      
      alert(`视频变换完成 - ${transformation}`);
    } catch (error) {
      console.error('视频变换失败:', error);
      alert(`视频变换失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleImageToAction = async () => {
    if (!block.content) {
      alert('请先生成或上传图片');
      return;
    }
    
    const actionOptions = ['走路', '跑步', '跳舞', '挥手', '点头', '转身', '坐下', '站起'];
    const actionChoice = prompt(`请选择动作类型:\n${actionOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n请输入数字选择:`, '1');
    
    if (!actionChoice || isNaN(Number(actionChoice)) || Number(actionChoice) < 1 || Number(actionChoice) > actionOptions.length) {
      return;
    }
    
    const selectedAction = actionOptions[Number(actionChoice) - 1];
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的图像动作化API
      const taskId = await shenmaService.imageToAction(
        block.content,
        `让图片中的人物执行${selectedAction}动作，动作自然流畅`
      );
      
      // 创建新的视频块
      if (onCreateBlock) {
        onCreateBlock({
          type: 'video',
          content: '', // 将在轮询完成后更新
          originalPrompt: `图生动作 - ${selectedAction}`,
          aspectRatio: '16:9'
        }, block.x + 300, block.y);
      }
      
      alert(`图生动作任务已提交 - ${selectedAction}`);
    } catch (error) {
      console.error('图生动作失败:', error);
      alert(`图生动作失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  const handleVideoDance = async () => {
    if (!block.content) {
      alert('请先生成或上传图片（需要包含人物）');
      return;
    }
    
    const danceOptions = ['现代舞', '街舞', '芭蕾舞', '民族舞', '拉丁舞', '爵士舞', '古典舞', '自由舞蹈'];
    const danceChoice = prompt(`请选择舞蹈类型:\n${danceOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n请输入数字选择:`, '1');
    
    if (!danceChoice || isNaN(Number(danceChoice)) || Number(danceChoice) < 1 || Number(danceChoice) > danceOptions.length) {
      return;
    }
    
    const selectedDance = danceOptions[Number(danceChoice) - 1];
    
    try {
      onUpdate(block.id, { status: 'processing' });
      
      const ShenmaService = (await import('../services/shenmaService')).ShenmaService;
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://api.shenma.com',
        apiKey: '',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora-2',
        visionModel: 'nano-banana'
      });
      
      // 使用新的舞蹈生成API
      const taskId = await shenmaService.generateDanceVideo(
        `让图片中的人物跳${selectedDance}，动作优美流畅，保持人物特征`,
        block.content
      );
      
      // 创建新的视频块
      if (onCreateBlock) {
        onCreateBlock({
          type: 'video',
          content: '', // 将在轮询完成后更新
          originalPrompt: `舞动人像 - ${selectedDance}`,
          aspectRatio: '9:16'
        }, block.x + 300, block.y);
      }
      
      alert(`舞动人像任务已提交 - ${selectedDance}`);
    } catch (error) {
      console.error('舞动人像失败:', error);
      alert(`舞动人像失败: ${error.message}`);
    } finally {
      onUpdate(block.id, { status: 'idle' });
    }
  };

  // Priority Feature Handlers

  // Voice Session Handler
  const handleVoiceSession = () => {
    if (!priorityFeatureManager?.isFeatureAvailable('voice', 'shenma')) {
      alert(lang === 'zh' ? '语音功能仅在ShenmaAPI提供商下可用' : 'Voice features are only available with ShenmaAPI provider');
      return;
    }
    setShowVoiceModal(true);
  };

  const handleVoiceSessionCreate = async (config: VoiceConfig): Promise<string> => {
    if (!priorityFeatureManager) {
      throw new Error('Priority feature manager not initialized');
    }
    
    const session = await priorityFeatureManager.voice.createSession(config);
    return session.connectionUrl;
  };

  // Smear Editing Handler
  const handleSmearEdit = () => {
    console.log('Smear edit feature clicked', block.id);
    if (block.content && block.content.startsWith('data:image/')) {
      onOpenSmearRemovalModal?.(block.content);
    } else {
      alert(lang === 'zh' ? '请先生成或上传图片' : 'Please generate or upload an image first');
    }
  };

  // Smear Removal Handler  
  const handleSmearRemoval = () => {
    console.log('Smear removal feature clicked', block.id);
    if (block.content && block.content.startsWith('data:image/')) {
      onOpenSmearRemovalModal?.(block.content);
    } else {
      alert(lang === 'zh' ? '请先生成或上传图片' : 'Please generate or upload an image first');
    }
  };

  // Video Character Replacement Handler
  const handleVideoCharacterReplacement = () => {
    if (block.type !== 'video' || !block.content) {
      alert(lang === 'zh' ? '请先生成或上传视频' : 'Please generate or upload a video first');
      return;
    }
    setShowVideoCharacterModal(true);
  };

  const handleVideoCharacterReplaceAPI = async (params: CharacterReplaceParams) => {
    if (!priorityFeatureManager) {
      throw new Error('Priority feature manager not initialized');
    }
    
    return await priorityFeatureManager.videoCharacter.replaceCharacter(params);
  };

  const handleVideoCharacterProgressAPI = async (taskId: string) => {
    if (!priorityFeatureManager) {
      throw new Error('Priority feature manager not initialized');
    }
    
    return await priorityFeatureManager.videoCharacter.trackProgress(taskId);
  };

  return (
    <div
      data-block-id={block.id}
      className={`absolute group transition-transform duration-300 cursor-grab active:cursor-grabbing select-none ${multiImageStyling.className}`}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: `translate(-50%, -50%)`,
        zIndex: isSelected || isHovered || isEditing ? 200 : 10,
        boxShadow: (isSelected || isHovered) ? multiImageStyling.boxShadow : ''
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        
        // 只有左键点击才调用onSelect和onDragStart，右键点击保留多选状态
        if (e.button === 0) {
          onSelect(block.id, e.shiftKey);
          onDragStart(e, block.id);
        }
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        accept={block.type === 'text' ? ".txt,.md,.js,.ts,.tsx,.json,.css,.html,.doc,.docx,.pdf" : block.type === 'image' ? "image/*" : "video/*"}
      />

      {/* 隐形扩展区 */}
      <div className={`absolute -top-40 left-0 w-full h-40 pointer-events-auto ${isHovered ? 'block' : 'hidden'}`} />
      
      {/* 优化后的悬浮控制菜单 */}
      <div 
        className={`absolute bottom-[calc(100%+20px)] left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-violet-500 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_10px_30px_-5px_rgba(0,0,0,0.2)] transition-all duration-250 ease-out z-[9999]
          ${isHovered || isEditing ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}
          ${block.status === 'processing' ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* 动态菜单 */}
        {menuConfig ? (
          <DynamicMenu
            menuConfig={menuConfig}
            onMenuItemClick={(action, featureId, payload) => {
              // Handle feature-based actions
              if (action.startsWith('feature:')) {
                const actualFeatureId = action.replace('feature:', '');
                
                // Check feature availability before execution
                const availability = checkFeatureAvailability(actualFeatureId);
                if (!availability.isAvailable) {
                  alert(`功能不可用: ${availability.reason}\n\n${availability.suggestion || '请检查功能要求后重试。'}`);
                  return;
                }
                
                switch (actualFeatureId) {
                  // Image features
                  case 'image-analyze':
                    console.log('Image analyze feature clicked', block.id);
                    handleImageAnalyze();
                    break;
                  case 'image-edit':
                    console.log('Image edit feature clicked', block.id);
                    onOpenImageEditModal?.(block.id);
                    break;
                  case 'image-multi-analyze':
                    console.log('Multi image analyze feature clicked', block.id);
                    handleMultiImageAnalyze();
                    break;
                  case 'image-multi':
                    console.log('Multi image feature clicked', block.id);
                    onOpenMultiImageModal?.(block.id);
                    break;
                  case 'image-copy':
                    console.log('Image copy feature clicked', block.id);
                    handleImageCopy();
                    break;
                  case 'image-preview-prompt':
                    console.log('Preview prompt feature clicked', block.id);
                    handlePreviewPrompt();
                    break;
                  case 'image-variation':
                    console.log('Image variation feature clicked', block.id);
                    handleImageVariation();
                    break;
                  case 'image-enhance':
                    console.log('Image enhance feature clicked', block.id);
                    handleImageEnhance();
                    break;
                  case 'image-remove-background':
                    console.log('Remove background feature clicked', block.id);
                    handleRemoveBackground();
                    break;
                  case 'image-generate':
                    console.log('Image generate feature clicked', block.id);
                    onGenerate(block.id, userInput || '生成一张图片');
                    break;
                  case 'image-crop':
                    console.log('Image crop feature clicked', block.id);
                    handleImageCrop();
                    break;
                  case 'image-style-transfer':
                    console.log('Image style transfer feature clicked', block.id);
                    handleImageStyleTransfer();
                    break;
                  case 'image-add-element':
                    console.log('Add element feature clicked', block.id);
                    handleImageAddElement();
                    break;
                  case 'image-replace-element':
                    console.log('Replace element feature clicked', block.id);
                    handleImageReplaceElement();
                    break;
                  case 'canvas-copy':
                    console.log('Copy block feature clicked', block.id);
                    handleCanvasCopy();
                    break;
                  
                  // Video features
                  case 'video-generate':
                    console.log('Video generate feature clicked', block.id);
                    onGenerate(block.id, userInput || '生成一个视频');
                    break;
                  case 'video-analyze':
                    console.log('Video analyze feature clicked', block.id);
                    handleVideoAnalyze();
                    break;
                  case 'video-character':
                    console.log('Video character feature clicked', block.id);
                    handleVideoCharacterReplacement();
                    break;
                  case 'video-upload':
                    console.log('Video upload feature clicked', block.id);
                    fileInputRef.current?.click();
                    break;
                  case 'video-download':
                    console.log('Video download feature clicked', block.id);
                    handleDownload();
                    break;
                  case 'video-character-replace':
                    console.log('Character replace feature clicked', block.id);
                    handleVideoCharacterReplace();
                    break;
                  case 'video-image-to-video':
                    console.log('Image to video feature clicked', block.id);
                    handleImageToVideo();
                    break;
                  case 'video-multi-image-to-video':
                    console.log('Multi image to video feature clicked', block.id);
                    handleMultiImageToVideo();
                    break;
                  case 'video-video-to-video':
                    console.log('Video to video feature clicked', block.id);
                    handleVideoToVideo();
                    break;
                  case 'video-style-transfer':
                    console.log('Video style transfer feature clicked', block.id);
                    setShowVideoStyleModal(true);
                    break;
                  case 'video-image-to-action':
                    console.log('Image to action feature clicked', block.id);
                    handleImageToAction();
                    break;
                  case 'video-dance':
                    console.log('Dance feature clicked', block.id);
                    handleVideoDance();
                    break;
                  
                  // Text features
                  case 'text-generate':
                    console.log('Text generate feature clicked', block.id);
                    onGenerate(block.id, userInput || '生成文本内容');
                    break;
                  case 'text-summarize':
                    console.log('Text summarize feature clicked', block.id);
                    handleTextSummarize();
                    break;
                  case 'text-translate':
                    console.log('Text translate feature clicked', block.id);
                    setShowLanguageModal(true);
                    break;
                  case 'text-edit':
                    console.log('Text edit feature clicked', block.id);
                    setIsEditing(true);
                    break;
                  case 'text-format':
                    console.log('Text format feature clicked', block.id);
                    setShowTextFormatModal(true);
                    break;
                  case 'text-font-size':
                    console.log('Text font size feature clicked', block.id);
                    cycleFontSize(new MouseEvent('click') as any);
                    break;
                  case 'text-color':
                    console.log('Text color feature clicked', block.id);
                    handleTextColorToggle();
                    break;
                  
                  // Canvas features
                  case 'canvas-reset':
                    console.log('Canvas reset feature clicked', block.id);
                    // 重置视角功能现在通过手势/语音控制实现
                    break;
                  case 'canvas-clear':
                    console.log('Canvas clear feature clicked', block.id);
                    alert('清空画布功能需要在画布层面操作');
                    break;
                  case 'canvas-delete':
                    console.log('Canvas delete feature clicked', block.id);
                    onDelete(block.id);
                    break;
                  case 'canvas-batch-video':
                    console.log('Batch video feature clicked', block.id);
                    alert('批量处理功能开发中，敬请期待！');
                    break;
                  case 'canvas-auto-layout':
                    console.log('Auto layout feature clicked', block.id);
                    // 自动布局功能现在通过手势/语音控制实现
                    break;
                  case 'canvas-new':
                    console.log('New project feature clicked', block.id);
                    alert('新建项目功能需要在画布层面操作');
                    break;
                  case 'canvas-save':
                    console.log('Save canvas feature clicked', block.id);
                    alert('保存画布功能需要在画布层面操作');
                    break;
                  case 'canvas-export':
                    console.log('Export canvas feature clicked', block.id);
                    alert('导出结果功能需要在画布层面操作');
                    break;
                  case 'canvas-export-storyboard':
                    console.log('Export storyboard feature clicked', block.id);
                    alert('导出分镜功能需要在画布层面操作，请使用画布工具栏中的导出分镜功能');
                    break;
                  case 'canvas-performance':
                    console.log('Performance mode feature clicked', block.id);
                    alert('性能模式功能需要在画布层面操作');
                    break;
                  case 'canvas-help':
                    console.log('Help feature clicked', block.id);
                    alert('使用指南功能开发中，敬请期待！');
                    break;
                  case 'canvas-webhook':
                    console.log('WebHook settings feature clicked', block.id);
                    alert('WebHook设置功能开发中，敬请期待！');
                    break;
                  
                  // Voice features
                  case 'voice-realtime':
                    console.log('Realtime voice feature clicked', block.id);
                    handleVoiceRealtime();
                    break;
                  case 'voice-session':
                    console.log('Voice session feature clicked', block.id);
                    handleVoiceSession();
                    break;
                  
                  // Image editing features
                  case 'image-edit-area':
                    console.log('Smear editing feature clicked', block.id);
                    handleSmearEdit();
                    break;
                  case 'image-remove-area':
                    console.log('Smear removal feature clicked', block.id);
                    handleSmearRemoval();
                    break;
                  
                  // Video character replacement
                  case 'video-character-replace-advanced':
                    console.log('Advanced video character replacement clicked', block.id);
                    handleVideoCharacterReplacement();
                    break;
                  
                  default:
                    console.log('Unhandled feature action:', actualFeatureId, block.id, payload);
                }
                return;
              }
              
              // Handle traditional actions
              switch (action) {
                case 'toggleEdit':
                  setIsEditing(!isEditing);
                  break;
                case 'preview':
                  console.log('Preview block clicked', block.id);
                  onOpenImagePreview?.(block.id);
                  break;
                case 'toggleAspectRatio':
                  if (payload?.newRatio) {
                    onUpdate(block.id, { aspectRatio: payload.newRatio });
                  }
                  break;
                case 'toggleDuration':
                  // 切换视频时长设置
                  console.log('Toggle duration clicked');
                  break;
                case 'download':
                  handleDownload();
                  break;
                case 'upload':
                  fileInputRef.current?.click();
                  break;
                case 'regenerate':
                  onGenerate(block.id, block.originalPrompt || '');
                  break;
                case 'delete':
                  onDelete(block.id);
                  break;
                default:
                  console.log('Unhandled menu action:', action, featureId, payload);
              }
            }}
            lang={lang}
            blockType={block.type}
            blockStatus={block.status}
            blockAspectRatio={block.aspectRatio}
            blockDuration={block.duration}
            isGenerating={block.status === 'processing'}
            selectedRatio={currentAspectRatio}
            onRatioChange={handleRatioChange}
          />

        ) : (
          // 回退到原始菜单，确保兼容性
          <div className="flex items-center gap-2">
            {/* 状态指示器 - 仅在生成中显示 */}
            {block.status === 'processing' && (
              <div className="relative group/btn mr-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <Tooltip label={t.tips.generating || '生成中...'} />
              </div>
            )}

            {/* 文本模块回退菜单 */}
            {block.type === 'text' && (
              <div className="flex items-center gap-2">
                {/* 编辑 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }} 
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${isEditing ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white'}`}
                  >
                    {isEditing ? <Check size={24} /> : <Pencil size={24} />}
                  </button>
                  <Tooltip label={isEditing ? t.tips.finish : t.tips.edit} />
                </div>
                
                {/* 上传附件 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Upload size={24} />
                  </button>
                  <Tooltip label={t.tips.upload || '上传附件'} />
                </div>
                
                {/* 下载 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Download size={24} />
                  </button>
                  <Tooltip label={t.tips.download || '下载'} />
                </div>
              </div>
            )}

            {/* 图片模块回退菜单 */}
            {block.type === 'image' && (
              <div className="flex items-center gap-2">
                {/* 比例 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      // 循环切换比例: 1:1 -> 4:3 -> 16:9 -> 3:2 -> 9:16 -> 1:1
                      const currentRatio = currentAspectRatio.value;
                      let nextRatio;
                      switch (currentRatio) {
                        case '1:1':
                          nextRatio = { label: '4:3', value: '4:3', width: 1024, height: 768 };
                          break;
                        case '4:3':
                          nextRatio = { label: '16:9', value: '16:9', width: 1920, height: 1080 };
                          break;
                        case '16:9':
                          nextRatio = { label: '3:2', value: '3:2', width: 1200, height: 800 };
                          break;
                        case '3:2':
                          nextRatio = { label: '9:16', value: '9:16', width: 1080, height: 1920 };
                          break;
                        default:
                          nextRatio = { label: '1:1', value: '1:1', width: 1024, height: 1024 };
                      }
                      handleRatioChange(nextRatio);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white relative ${
                      currentAspectRatio.value !== '1:1' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <ImageIcon size={24} />
                    {/* 显示当前比例 */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                      {currentAspectRatio.label}
                    </div>
                  </button>
                  <Tooltip label={`比例: ${currentAspectRatio.label}`} />
                </div>

                {/* 上传附件 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Upload size={24} />
                  </button>
                  <Tooltip label={t.tips.upload || '上传附件'} />
                </div>

                {/* 编辑图片 */}
                {block.content && (
                  <div className="relative group/btn">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenImageEditModal?.(block.id); }} 
                      className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 text-purple-600 dark:text-purple-400"
                    >
                      <Pencil size={24} />
                    </button>
                    <Tooltip label={lang === 'zh' ? '图像编辑' : 'Edit Image'} />
                  </div>
                )}
                
                {/* 下载 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Download size={24} />
                  </button>
                  <Tooltip label={t.tips.download || '下载'} />
                </div>
              </div>
            )}

            {/* 视频模块回退菜单 */}
            {block.type === 'video' && (
              <div className="flex items-center gap-2">
                {/* 时长 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      // Toggle duration: 10s -> 15s -> 25s -> 10s
                      const currentDuration = block.duration || '10';
                      const nextDuration = currentDuration === '10' ? '15' : currentDuration === '15' ? '25' : '10';
                      onUpdate(block.id, { duration: nextDuration });
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white relative ${
                      block.duration ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <Clock size={24} />
                    {/* 显示当前时长 */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                      {block.duration || '10'}s
                    </div>
                  </button>
                  <Tooltip label={`时长: ${block.duration || '10'}秒`} />
                </div>
                
                {/* 切换比例 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const newRatio = block.aspectRatio === '16:9' ? '9:16' : '16:9';
                      onUpdate(block.id, { aspectRatio: newRatio });
                    }} 
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${block.aspectRatio === '16:9' ? 'bg-blue-50 dark:bg-blue-900/20' : ''} hover:bg-black/5 dark:hover:bg-white/10`}
                  >
                    {block.aspectRatio === '16:9' ? <Monitor size={24} /> : <Smartphone size={24} />}
                  </button>
                  <Tooltip label={`比例: ${block.aspectRatio || '16:9'}`} />
                </div>
                
                {/* 上传附件 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Upload size={24} />
                  </button>
                  <Tooltip label={t.tips.upload || '上传附件'} />
                </div>
                
                {/* 下载 */}
                <div className="relative group/btn">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-white"
                  >
                    <Download size={24} />
                  </button>
                  <Tooltip label={t.tips.download || '下载'} />
                </div>
              </div>
            )}
            
            <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-1" />
            
            <div className="relative group/btn">
              <button onClick={(e) => { e.stopPropagation(); onGenerate(block.id, block.originalPrompt || ''); }} className="w-12 h-12 rounded-full border-2 border-violet-500 flex items-center justify-center transition-all duration-200 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 text-slate-700 dark:text-white"><RefreshCw size={24} className={block.status === 'processing' ? 'animate-spin' : ''} /></button>
              <Tooltip label={t.tips.regenerate} />
            </div>
            <div className="relative group/btn">
              <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="w-12 h-12 rounded-full border-2 border-violet-500 flex items-center justify-center transition-all duration-200 hover:bg-red-500 hover:text-white hover:border-red-500 text-slate-700 dark:text-white"><Trash2 size={24} /></button>
              <Tooltip label={t.tips.delete} />
            </div>
          </div>
        )}
      </div>

      {/* 主画布内容 */}
      <div 
        className={`relative w-full h-full rounded-[4rem] overflow-hidden transition-all duration-500 border-4
          ${isSelected ? 'scale-[1.01] shadow-xl' : 'hover:shadow-[0_40px_100px_rgba(0,0,0,0.15)]'}
        `}
        style={{ 
          backgroundColor: theme?.bg || 'rgba(254, 242, 242, 0.9)',
          borderColor: (isSelected || isHovered) ? '#8b5cf6' : (theme?.border || '#8b5cf6'), // 鼠标悬停或选中时使用紫色边框
          boxShadow: (isSelected || isHovered) ? `0 0 0 4px #8b5cf6, 0 60px 140px -20px rgba(0,0,0,0.3), 0 0 60px rgba(139, 92, 246, 0.2)` : '' // 鼠标悬停或选中时使用紫色阴影
        }}
      >
        <div className="absolute top-4 left-4 z-20 pointer-events-auto">
          <button 
            onClick={copyIdToClipboard}
            className="group/id bg-white/90 dark:bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border-2 border-violet-500 shadow-lg flex items-center gap-3 active:scale-95 transition-all"
          >
             <span className="text-lg font-black tracking-[0.2em] text-slate-900 dark:text-white uppercase">
               {showCopied ? (lang === 'zh' ? '已复制' : 'COPIED') : block.number}
               {block.isMultiImageSource && (
                 <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                   {lang === 'zh' ? '多图源' : 'MULTI'}
                 </span>
               )}
             </span>
             {!showCopied && <Copy size={18} className="text-slate-400 group-hover/id:text-amber-500 transition-colors" />}
          </button>
        </div>

        {/* Automation Template Indicator */}
        {isAutomationTemplate && (
          <div className="absolute top-10 right-12 z-20 pointer-events-none">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              AUTO
            </div>
          </div>
        )}



        <div className="w-full h-full relative" onDoubleClick={() => block.type === 'text' && setIsEditing(true)}>
          {/* Error Display */}
          {lastError && (
            <div className="absolute top-2 left-2 right-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 z-40">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                    {lastError}
                  </p>
                </div>
                <button
                  onClick={() => setLastError(null)}
                  className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-800 flex items-center justify-center flex-shrink-0"
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Progress Display */}
          {operationProgress && (
            <div className="absolute top-2 left-2 right-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 z-40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {operationProgress.operation}
                    </p>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {Math.round(operationProgress.progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-2 mb-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${operationProgress.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {operationProgress.stage}
                    </p>
                    {operationProgress.estimatedTime && operationProgress.estimatedTime > 0 && (
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        预计剩余: {Math.ceil(operationProgress.estimatedTime / 1000)}秒
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {block.status === 'processing' && !operationProgress ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-3xl z-50">
              <div className="w-24 h-24 border-[6px] border-slate-200 border-t-slate-800 rounded-full animate-spin mb-6" style={{ borderTopColor: theme?.border || '#DC2626' }} />
            </div>
          ) : block.type === 'image' && (block.content || block.attachmentContent) ? (
            <div className="w-full h-full relative">
              {/* 生成的图片内容 */}
              {block.content && (
                <>
                  {/* 图片加载缓冲状态 */}
                  {isImageLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-3xl z-20">
                      <div className="w-16 h-16 border-[4px] border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" style={{ borderTopColor: theme?.border || '#DC2626' }} />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        图片加载中...
                      </p>
                    </div>
                  )}
                  <img 
                    src={block.content} 
                    className={`w-full h-full object-cover transition-transform duration-1000 ${block.isCropped ? 'scale-150' : 'scale-100'}`} 
                    alt="Generated Image"
                    onLoad={(e) => {
                      setIsImageLoading(false);
                    }}
                    onError={(e) => {
                      console.error('Generated image failed to load:', block.content);
                      setIsImageLoading(false);
                    }}
                    onLoadStart={(e) => {
                      setIsImageLoading(true);
                      setImageLoadingProgress(0);
                    }}
                  />
                </>
              )}
              
              {/* 附件图片（参考图片）- 当没有生成内容时显示 */}
              {!block.content && block.attachmentContent && (
                <div className="w-full h-full relative">
                  <img 
                    src={block.attachmentContent} 
                    className="w-full h-full object-cover opacity-70" 
                    alt="Reference Image"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white/90 dark:bg-black/90 px-3 py-1 rounded-full text-sm font-medium">
                      📎 参考图片
                    </div>
                  </div>
                </div>
              )}
              
              {/* 指令覆盖层 - 当有指令但没有生成内容时显示 */}
              {!block.content && block.originalPrompt && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white text-sm font-medium">
                    💬 {block.originalPrompt}
                  </p>
                </div>
              )}
              
              {/* Aspect ratio floating display */}
              {block.aspectRatio && (
                <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-base px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
                  {block.aspectRatio}
                </div>
              )}
            </div>
          ) : block.type === 'image' && !block.content ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <ImageIcon size={100} className="text-slate-400 dark:text-slate-500 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                {lang === 'zh' ? '点击上传图片或生成图片' : 'Click to upload or generate image'}
              </p>
              {/* 显示参考图片信息 */}
              {block.imageMetadata?.referenceFileName && (
                <p className="text-xs text-slate-400 mt-2">
                  📎 {block.imageMetadata.referenceFileName}
                </p>
              )}
            </div>
          ) : block.type === 'text' ? (
            <div className="w-full h-full flex flex-col items-start justify-start pt-20 px-8 pb-8 text-left overflow-auto scrollbar-hide">
              {isEditing ? (
                <textarea
                  className="w-full h-[calc(100%-12px)] bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border-2 border-violet-500 outline-none resize-none font-bold leading-relaxed text-left scrollbar-hide focus:ring-0"
                  value={block.content}
                  autoFocus
                  style={{ fontSize: block.fontSize || 18, color: block.textColor || '#334155' }}
                  onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) setIsEditing(false); }}
                  rows={1}
                  onInput={(e) => {
                    const textarea = e.target as HTMLTextAreaElement;
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, textarea.parentElement?.clientHeight || 500)}px`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col">
                  {/* 主要内容显示 */}
                  {block.content && (
                    <div className="flex-1 min-h-0 overflow-auto">
                      <p className="font-bold leading-relaxed transition-all whitespace-pre-wrap cursor-text p-3" style={{ fontSize: block.fontSize || 18, color: block.textColor || '#334155' }}>
                        {block.content}
                      </p>
                    </div>
                  )}
                  
                  {/* 附件内容显示 - 当没有主要内容时显示 */}
                  {!block.content && block.attachmentContent && (
                    <div className="flex-1 min-h-0 overflow-auto">
                      <div className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border-l-4 border-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
                        <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                          📎 {block.attachmentFileName || '附件内容'}
                        </div>
                        {block.attachmentContent}
                      </div>
                    </div>
                  )}
                  
                  {/* 空状态提示 */}
                  {!block.content && !block.attachmentContent && (
                    <p className="text-gray-400 dark:text-gray-500 italic cursor-text p-3">
                      {lang === 'zh' ? '点击编辑内容或上传文件...' : 'Click to edit content or upload file...'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : block.type === 'video' && block.content ? (
            <>
              <VideoErrorBoundary blockId={block.id}>
                {(() => {
                  // Enhanced video content validation
                  let isValidVideoUrl = true;
                  let errorMessage = '';
                  let errorType: 'invalid_url' | 'json_error' | 'network_error' | 'format_error' = 'invalid_url';
                  
                  try {
                    // Check if content is JSON error response
                    const parsedResult = JSON.parse(block.content);
                    if (parsedResult.error || parsedResult.message || parsedResult.status === 'error') {
                      isValidVideoUrl = false;
                      errorType = 'json_error';
                      errorMessage = parsedResult.error || parsedResult.message || 'Unknown error occurred';
                    }
                  } catch (e) {
                    // Not JSON, check if it's a valid URL format
                    if (!block.content.startsWith('http') && !block.content.startsWith('data:video/') && !block.content.startsWith('blob:')) {
                      isValidVideoUrl = false;
                      errorType = 'format_error';
                      errorMessage = 'Invalid video URL format';
                    }
                  }
                  
                  if (!isValidVideoUrl) {
                    // Enhanced error display with fallback options
                    return (
                      <VideoErrorFallback 
                        errorType={errorType}
                        errorMessage={errorMessage}
                        content={block.content}
                        blockId={block.id}
                        onRetry={() => {
                          // Trigger block regeneration
                          onUpdate(block.id, { status: 'idle', content: '' });
                        }}
                      />
                    );
                  }
                  
                  // Check for HTTP URLs that might have CORS issues
                  if (block.content.startsWith('http')) {
                    return (
                      <VideoPreviewFallback 
                        videoUrl={block.content}
                        blockId={block.id}
                        aspectRatio={block.aspectRatio}
                        duration={block.duration}
                      />
                    );
                  }
                  
                  // Valid video URL - render with enhanced error handling
                  return (
                    <EnhancedVideoPlayer
                      src={block.content}
                      blockId={block.id}
                      aspectRatio={block.aspectRatio}
                      duration={block.duration}
                      onError={(error) => {
                        console.error('[BlockComponent] Video load error:', error);
                        // Update block status to show error state
                        onUpdate(block.id, { 
                          status: 'error',
                          content: JSON.stringify({
                            error: 'Video load failed',
                            message: error.message || 'Failed to load video',
                            originalUrl: block.content
                          })
                        });
                      }}
                    />
                  );
                })()}
              </VideoErrorBoundary>
              {/* Video info floating display - preserved across all states */}
              {(block.aspectRatio || block.duration) && (
                <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-base px-4 py-2 rounded-full backdrop-blur-md shadow-lg z-10">
                  {block.aspectRatio && <span>{block.aspectRatio} </span>}
                  {block.duration && <span>{block.duration}秒</span>}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
               {block.type === 'text' ? <TextIcon size={100} className="text-slate-900 dark:text-white" /> : block.type === 'image' ? <ImageIcon size={100} className="text-slate-900 dark:text-white" /> : <Play size={100} className="text-slate-900 dark:text-white" />}
               {(() => {
                 const inputInfo = generateInputInfoText();
                 if (inputInfo) {
                   return (
                     <div className="mt-8 text-center">
                       <span className="text-base font-black uppercase tracking-[0.5em]">{t.blockPlaceholder}</span>
                       <span className="block mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 max-w-[80%] whitespace-normal">
                         {inputInfo}
                       </span>
                       
                       {/* Video block specific instructions when connected to image blocks */}
                       {block.type === 'video' && (upstreamIds.length > 0 || upstreamData.length > 0) && (
                         <span className="block mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400 max-w-[80%] text-center whitespace-normal">
                           {lang === 'zh' ? '可通过引用前面的图像块（如 [A01]）来设置角色客串和多参考图' : 'Can reference previous image blocks (e.g., [A01]) for character cameo and multi-reference images'}
                         </span>
                       )}

                       {/* Character assignment display */}
                       {block.type === 'video' && block.characterId && (() => {
                         const selectedCharacter = getSelectedCharacter();
                         return selectedCharacter ? (
                           <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 max-w-[80%] mx-auto">
                             <div className="flex items-center gap-2 mb-2">
                               <Users size={16} className="text-purple-600" />
                               <span className="text-xs font-medium text-purple-800 dark:text-purple-200">
                                 {lang === 'zh' ? '已选择角色' : 'Character Selected'}
                               </span>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                 {selectedCharacter.profile_picture_url ? (
                                   <img 
                                     src={selectedCharacter.profile_picture_url} 
                                     alt={selectedCharacter.username}
                                     className="w-full h-full object-cover"
                                   />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center">
                                     <Users size={16} className="text-slate-500" />
                                   </div>
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                   {selectedCharacter.username}
                                 </div>
                                 {selectedCharacter.timestamps && (
                                   <div className="text-xs text-slate-500 truncate">
                                     {lang === 'zh' ? '时间戳: ' : 'Timestamps: '}{selectedCharacter.timestamps}
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>
                         ) : null;
                       })()}
                     </div>
                   );
                 } else {
                   return (
                     <div className="mt-8 text-center">
                       <span className="text-base font-black uppercase tracking-[0.5em]">{t.blockPlaceholder}</span>
                       
                       {/* Video block specific instructions when connected to image blocks */}
                       {block.type === 'video' && (upstreamIds.length > 0 || upstreamData.length > 0) && (
                         <span className="block mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400 max-w-[80%] text-center whitespace-normal">
                           {lang === 'zh' ? '可通过引用前面的图像块（如 [A01]）来设置角色客串和多参考图' : 'Can reference previous image blocks (e.g., [A01]) for character cameo and multi-reference images'}
                         </span>
                       )}

                       {/* Character assignment display */}
                       {block.type === 'video' && block.characterId && (() => {
                         const selectedCharacter = getSelectedCharacter();
                         return selectedCharacter ? (
                           <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 max-w-[80%] mx-auto">
                             <div className="flex items-center gap-2 mb-2">
                               <Users size={16} className="text-purple-600" />
                               <span className="text-xs font-medium text-purple-800 dark:text-purple-200">
                                 {lang === 'zh' ? '已选择角色' : 'Character Selected'}
                               </span>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                 {selectedCharacter.profile_picture_url ? (
                                   <img 
                                     src={selectedCharacter.profile_picture_url} 
                                     alt={selectedCharacter.username}
                                     className="w-full h-full object-cover"
                                   />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center">
                                     <Users size={16} className="text-slate-500" />
                                   </div>
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                   {selectedCharacter.username}
                                 </div>
                                 {selectedCharacter.timestamps && (
                                   <div className="text-xs text-slate-500 truncate">
                                     {lang === 'zh' ? '时间戳: ' : 'Timestamps: '}{selectedCharacter.timestamps}
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>
                         ) : null;
                       })()}
                     </div>
                   );
                 }
               })()}
            </div>
          )}
        </div>

        {/* 调整大小指示器 - 始终可见的紫色短线 */}
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[100] group" 
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, block.id); }}
          style={{ transform: 'translate(50%, 50%)' }}
        >
          {/* 背景圆圈确保可见性 */}
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-sm group-hover:shadow-md transition-shadow"></div>
          
          {/* 三条紫色短线 */}
          <div className="absolute inset-0 flex items-end justify-end p-1">
            <div className="relative w-4 h-4">
              {/* 最短的线 */}
              <div className="absolute bottom-0 right-0 w-1 h-2 bg-purple-500 rounded-full shadow-sm"></div>
              {/* 中等长度的线 */}
              <div className="absolute bottom-0 right-1.5 w-1 h-2.5 bg-purple-500 rounded-full shadow-sm"></div>
              {/* 最长的线 */}
              <div className="absolute bottom-0 right-3 w-1 h-3 bg-purple-500 rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 指令输入框 */}
      <div 
        className={`absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-full max-w-[720px] transition-all duration-300 z-[210]
          ${isHovered || isSelected || upstreamIds.length > 0 || upstreamData.length > 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}
        `}
        onMouseDown={e => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* Variable validation errors */}
        {variableErrors.length > 0 && (
          <div className="mb-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-base">
              <Info size={18} />
              <span className="font-medium">
                {lang === 'zh' ? '变量错误:' : 'Variable errors:'}
              </span>
            </div>
            {variableErrors.map((error, index) => (
              <div key={index} className="text-red-600 dark:text-red-400 text-base mt-2 ml-7">
                {error.message}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handlePromptSubmit} className="flex flex-col gap-2 px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
           <div className="flex items-center gap-3 w-full">
             <Sparkles size={24} className="text-amber-500 shrink-0" />
              
             <div className="flex-1 flex flex-wrap items-center gap-3 overflow-hidden">
               {/* Available variables from upstream data */}
               {upstreamData.length > 0 && (
                 <div className="flex gap-2 shrink-0">
                   {upstreamData.map(data => (
                     <button 
                      key={data.blockId} 
                      type="button"
                      onClick={() => insertVariable(data.blockNumber)}
                      title={lang === 'zh' ? `点击插入变量 [${data.blockNumber}]` : `Click to insert variable [${data.blockNumber}]`}
                      className={`flex items-center gap-2 px-5 py-3 rounded-3xl border font-black text-base uppercase tracking-wider select-none shadow-sm transition-all active:scale-90 ${getChipColor(data.blockNumber)}`}
                     >
                       <span>[{data.blockNumber}]</span>
                       <div className="w-3 h-3 rounded-full bg-green-500" title={lang === 'zh' ? '有数据' : 'Has data'} />
                     </button>
                   ))}
                   
                   {/* Variable help button */}
                   <button
                     type="button"
                     onClick={() => setShowVariableHelp(!showVariableHelp)}
                     className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                     title={lang === 'zh' ? '变量帮助' : 'Variable help'}
                   >
                     <Info size={22} />
                   </button>
                   
                   {/* Video specific help button */}
                   {block.type === 'video' && (
                     <button
                       type="button"
                       onClick={() => setShowVideoHelp(!showVideoHelp)}
                       className="p-2 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                       title={lang === 'zh' ? '视频功能帮助' : 'Video feature help'}
                     >
                       <PlayCircle size={22} />
                     </button>
                   )}
                 </div>
               )}

               {/* Legacy upstream IDs (for backward compatibility) */}
               {upstreamIds.length > 0 && upstreamData.length === 0 && (
                 <div className="flex gap-2 shrink-0">
                   {upstreamIds.map(id => (
                     <button 
                      key={id} 
                      type="button"
                      onClick={() => insertVariable(id)}
                      title={lang === 'zh' ? '点击插入编号' : 'Click to insert ID'}
                      className={`flex items-center gap-2 px-5 py-3 rounded-3xl border font-black text-base uppercase tracking-wider select-none shadow-sm transition-all active:scale-90 ${getChipColor(id)}`}
                     >
                       <span>{id}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
             
             <button 
               type="submit" 
               disabled={variableErrors.length > 0}
               className={`p-4 w-14 h-14 flex items-center justify-center rounded-3xl transition-all shadow-md shrink-0 ${
                 (userInput.trim() || upstreamIds.length > 0 || upstreamData.length > 0) && variableErrors.length === 0
                   ? 'bg-amber-500 text-white hover:scale-105 active:scale-95' 
                   : 'bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed'
               }`}
             >
               <Send size={24} fill={(userInput.trim() || upstreamIds.length > 0 || upstreamData.length > 0) && variableErrors.length === 0 ? "currentColor" : "none"} />
             </button>
           </div>
           
           {/* Expanded prompt input area */}
           <div className="flex-1 relative w-full mt-1">
             <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePromptSubmit(e as any);
                }
              }}
              placeholder={
                upstreamData.length > 0 
                  ? (lang === 'zh' ? '输入指令，使用 [A01] 引用上游数据...' : 'Enter command, use [A01] to reference upstream data...')
                  : (lang === 'zh' ? '输入指令，点击编号可混排...' : 'Enter command, click ID to mix...')
              }
              className={`w-full bg-transparent text-2xl font-semibold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 py-3 px-6 min-h-[60px] max-h-[300px] overflow-y-auto resize-none border-2 border-amber-500/30 rounded-[2.5rem] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all duration-300 ${variableErrors.length > 0 ? 'text-red-600 dark:text-red-400 border-red-500/50' : ''}`}
             />
             
             {/* Character count display */}
             {userInput && (
               <div className="absolute bottom-2 right-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                 {userInput.length}/3000
               </div>
             )}
           </div>
        </form>

        {/* Variable help panel */}
        {showVariableHelp && upstreamData.length > 0 && (
          <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl">
            <div className="text-blue-800 dark:text-blue-200 text-lg font-medium mb-3">
              {lang === 'zh' ? '变量使用说明:' : 'Variable Usage:'}
            </div>
            <div className="space-y-3 text-base text-blue-700 dark:text-blue-300">
              <div>
                {lang === 'zh' ? '• 使用 [块编号] 引用上游块的输出内容' : '• Use [BlockNumber] to reference upstream block output'}
              </div>
              <div>
                {lang === 'zh' ? '• 例如: "基于 [A01] 的内容生成图片"' : '• Example: "Generate image based on [A01] content"'}
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="font-medium text-base">{lang === 'zh' ? '可用变量:' : 'Available variables:'}</span>
                {upstreamData.map(data => (
                  <span key={data.blockId} className="ml-3 px-3 py-2 bg-blue-100 dark:bg-blue-800 rounded-xl text-base">
                    [{data.blockNumber}]
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video help panel */}
        {showVideoHelp && block.type === 'video' && (
          <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl">
            <div className="text-amber-800 dark:text-amber-200 text-lg font-medium mb-3">
              {lang === 'zh' ? '视频功能说明:' : 'Video Features:'}
            </div>
            <div className="space-y-3 text-base text-amber-700 dark:text-amber-300">
              <div>
                {lang === 'zh' ? '• 可通过引用前面的图像块（如 [B01]）来设置角色客串和多参考图' : '• Can reference previous image blocks (e.g., [B01]) for character cameo and multi-reference images'}
              </div>
              <div>
                {lang === 'zh' ? '• 支持横屏 (16:9) 和竖屏 (9:16) 两种比例' : '• Supports landscape (16:9) and portrait (9:16) aspect ratios'}
              </div>
              <div>
                {lang === 'zh' ? '• 可选择 10秒、15秒 或 25秒 的视频时长' : '• Choose from 10s, 15s, or 25s video duration'}
              </div>
            </div>
          </div>
        )}
      </div>


      


      {/* 逻辑锚点 */}
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center cursor-crosshair z-[60]" onMouseDown={e => { e.stopPropagation(); onAnchorClick(block.id, 'in'); }}>
        <div className="w-8 h-8 rounded-full border-2 bg-white shadow-lg flex items-center justify-center transition-all hover:scale-110" style={{ borderColor: theme?.border || '#DC2626' }}>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme?.border || '#DC2626' }} />
        </div>
      </div>
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center cursor-crosshair z-[60]" onMouseDown={e => { e.stopPropagation(); onAnchorClick(block.id, 'out'); }}>
        <div className="w-8 h-8 rounded-full border-2 bg-white shadow-lg flex items-center justify-center transition-all hover:scale-110" style={{ borderColor: theme?.border || '#DC2626' }}>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme?.border || '#DC2626' }} />
        </div>
      </div>

      {/* Priority Feature Modals */}
      {showVoiceModal && (
        <VoiceSessionModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onSessionCreate={handleVoiceSessionCreate}
          lang={lang}
        />
      )}

      {showVideoCharacterModal && block.content && (
        <VideoCharacterModal
          isOpen={showVideoCharacterModal}
          onClose={() => setShowVideoCharacterModal(false)}
          videoUrl={block.content}
          onReplace={handleVideoCharacterReplaceAPI}
          onTrackProgress={handleVideoCharacterProgressAPI}
          lang={lang}
        />
      )}

      {/* Configuration Modals */}
      <TextFormatModal
        isOpen={showTextFormatModal}
        onClose={() => setShowTextFormatModal(false)}
        onFormat={handleTextFormat}
        currentText={block.content || ''}
      />

      <VideoStyleModal
        isOpen={showVideoStyleModal}
        onClose={() => setShowVideoStyleModal(false)}
        onApplyStyle={handleVideoStyleTransfer}
        videoUrl={block.content}
      />

      <LanguageSelectionModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onTranslate={handleTextTranslate}
        currentText={block.content || ''}
      />
    </div>
  );
};

export default BlockComponent;
