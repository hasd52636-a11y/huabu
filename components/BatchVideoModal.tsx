import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, X, Video, Settings, Upload, FileText as FileIcon, Minimize2,
  FileText, Image as ImageIcon, VideoIcon, FolderOpen, AlertTriangle,
  RefreshCw, CheckCircle, XCircle, Info, AlertCircle, User, Users
} from 'lucide-react';
import { Block, BatchConfig, Character } from '../types';
import { ErrorHandler } from '../services/ErrorHandler';
import { characterService } from '../services/CharacterService';

// Custom error interface for BatchVideoModal
interface BatchModalError {
  type: string;
  code: string;
  message: string;
  userMessage: string;
  details?: string;
  timestamp: number;
  retryable: boolean;
  recoverable: boolean;
  suggestedAction?: string;
}

interface FrameData {
  id: string;
  prompt: string;
  imageUrl?: string;
  symbols: Array<{ name: string }>;
  order?: number;
}

interface BatchVideoModalProps {
  selectedBlocks: Block[];
  onStartBatch: (config: BatchConfig, videoPrompts: Record<string, string>, txtFile?: File, selectedFrames?: FrameData[], selectedCharacter?: Character) => void;
  onClose: () => void;
  onMinimize?: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isMinimized?: boolean;
  // Character integration props
  availableCharacters?: Character[];
  selectedCharacter?: Character;
  onCharacterSelect?: (character: Character | undefined) => void;
  onOpenCharacterPanel?: () => void;
}

const BatchVideoModal: React.FC<BatchVideoModalProps> = ({
  selectedBlocks,
  onStartBatch,
  onClose,
  onMinimize,
  theme,
  lang,
  isMinimized = false,
  availableCharacters = [],
  selectedCharacter,
  onCharacterSelect,
  onOpenCharacterPanel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorHandler = useRef(new ErrorHandler());
  
  // 输入模式：blocks（选中块）或 file（文件上传）
  const [inputMode, setInputMode] = useState<'blocks' | 'file'>(selectedBlocks.length > 0 ? 'blocks' : 'file');
  
  // 上传的文件和解析的提示词
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedPrompts, setParsedPrompts] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>('');
  
  // 角色相关状态
  const [localSelectedCharacter, setLocalSelectedCharacter] = useState<Character | undefined>(selectedCharacter);
  const [showCharacterSelector, setShowCharacterSelector] = useState<boolean>(false);
  const [characters, setCharacters] = useState<Character[]>(availableCharacters);
  
  // 错误处理状态
  const [errors, setErrors] = useState<BatchModalError[]>([]);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [retryingErrors, setRetryingErrors] = useState<Set<string>>(new Set());
  
  // 验证状态
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState<boolean>(false);
  
  // 默认全局视频提示词（来自参考项目）
  const defaultGlobalPrompt = '【All characters/products in the video must strictly use the provided reference image as the only visual source, ensuring complete consistency in identity, appearance, color, proportion, clothing, materials, and style. Do not modify the reference subject. If prompt conflicts with reference image, reference image always takes precedence.】\n\n';


  // Configuration persistence functions
  const saveConfiguration = (config: BatchConfig, orientation: 'landscape' | 'portrait') => {
    try {
      const configToSave = {
        ...config,
        videoOrientation: orientation,
        version: '1.0.0', // Version for migration support
        savedAt: Date.now()
      };
      localStorage.setItem('batch_video_config', JSON.stringify(configToSave));
    } catch (error) {
      console.error('Failed to save configuration:', error);
      addError(new Error('配置保存失败'), { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const loadConfiguration = (): { config: BatchConfig; orientation: 'landscape' | 'portrait' } | null => {
    try {
      const saved = localStorage.getItem('batch_video_config');
      if (!saved) return null;

      const savedConfig = JSON.parse(saved);
      
      // Configuration migration logic
      const migratedConfig = migrateConfiguration(savedConfig);
      
      return {
        config: {
          videoDuration: migratedConfig.videoDuration || 10,
          processingInterval: migratedConfig.processingInterval || 3000,
          videoOrientation: migratedConfig.videoOrientation || 'landscape',
          maxRetries: migratedConfig.maxRetries || 3,
          retryDelay: migratedConfig.retryDelay || 5000,
          enableNotifications: migratedConfig.enableNotifications !== false,
          downloadPath: migratedConfig.downloadPath || ''
        },
        orientation: migratedConfig.videoOrientation || 'landscape'
      };
    } catch (error) {
      console.error('Failed to load configuration:', error);
      addError(new Error('配置加载失败'), { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  };

  const migrateConfiguration = (savedConfig: any): any => {
    // Handle version migration
    const version = savedConfig.version || '0.0.0';
    
    // Migration from version 0.x to 1.x (aspectRatio -> videoOrientation)
    if (version.startsWith('0.')) {
      if (savedConfig.aspectRatio) {
        savedConfig.videoOrientation = savedConfig.aspectRatio === '16:9' ? 'landscape' : 'portrait';
      }
    }
    
    // Set default values for missing properties
    return {
      ...savedConfig,
      videoDuration: savedConfig.videoDuration || 10,
      processingInterval: Math.max(savedConfig.processingInterval || 3000, 1000), // Ensure minimum interval
      maxRetries: Math.min(Math.max(savedConfig.maxRetries || 3, 0), 10), // Ensure valid range
      retryDelay: savedConfig.retryDelay || 5000,
      enableNotifications: savedConfig.enableNotifications !== false,
      downloadPath: savedConfig.downloadPath || '',
      videoOrientation: savedConfig.videoOrientation || 'landscape',
      version: '1.0.0'
    };
  };

  const clearConfiguration = () => {
    try {
      localStorage.removeItem('batch_video_config');
      // Reset to default values
      setConfig({
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3,
        retryDelay: 5000,
        enableNotifications: true,
        downloadPath: ''
      });
      setVideoOrientation('landscape');
    } catch (error) {
      console.error('Failed to clear configuration:', error);
      addError(new Error('配置重置失败'), { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Export configuration for backup/sharing
  const exportConfiguration = (): string => {
    try {
      const configToExport = {
        config,
        videoOrientation,
        version: '1.0.0',
        exportedAt: Date.now()
      };
      return JSON.stringify(configToExport, null, 2);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      addError(new Error('配置导出失败'), { error: error instanceof Error ? error.message : String(error) });
      return '';
    }
  };

  // Import configuration from backup
  const importConfiguration = (configJson: string): boolean => {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // Validate imported configuration structure
      if (!importedConfig.config || !importedConfig.videoOrientation) {
        throw new Error('Invalid configuration format');
      }
      
      // Migrate if necessary
      const migratedConfig = migrateConfiguration(importedConfig);
      
      setConfig(migratedConfig.config);
      setVideoOrientation(migratedConfig.videoOrientation);
      
      // Save the imported configuration
      saveConfiguration(migratedConfig.config, migratedConfig.videoOrientation);
      
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      addError(new Error('配置导入失败'), { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  };

  const [config, setConfig] = useState<BatchConfig>({
    videoDuration: 10,
    processingInterval: 3000,
    videoOrientation: 'landscape',
    maxRetries: 3,
    retryDelay: 5000,
    enableNotifications: true,
    downloadPath: ''
  });

  // 视频方向状态（替代aspectRatio）
  const [videoOrientation, setVideoOrientation] = useState<'landscape' | 'portrait'>('landscape');
  
  // Flag to track if configuration has been loaded from storage
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);

  // Load configuration on component mount
  useEffect(() => {
    const savedConfig = loadConfiguration();
    if (savedConfig) {
      setConfig(savedConfig.config);
      setVideoOrientation(savedConfig.orientation);
    }
    setConfigLoaded(true);
  }, []);

  // Load characters and sync with props
  useEffect(() => {
    const loadedCharacters = characterService.getAllCharacters();
    setCharacters(loadedCharacters);
  }, []);

  useEffect(() => {
    setLocalSelectedCharacter(selectedCharacter);
  }, [selectedCharacter]);

  useEffect(() => {
    setCharacters(availableCharacters);
  }, [availableCharacters]);

  // Auto-save configuration when it changes (after initial load)
  useEffect(() => {
    // Skip auto-save until configuration is loaded from storage
    if (!configLoaded) return;
    
    // Sync videoOrientation with config
    setConfig(prev => ({ ...prev, videoOrientation }));
    
    const timeoutId = setTimeout(() => {
      saveConfiguration({ ...config, videoOrientation }, videoOrientation);
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [config, videoOrientation, configLoaded]);

  // 为每个选中的块或解析的提示词存储视频提示词
  const [videoPrompts, setVideoPrompts] = useState<Record<string, string>>(() => {
    const prompts: Record<string, string> = {};
    
    if (inputMode === 'blocks') {
      selectedBlocks.forEach((block: Block) => {
        // 根据块的类型和内容生成默认提示词，包含全局指令
        let defaultPrompt = defaultGlobalPrompt;
        if (block.type === 'text') {
          defaultPrompt += `基于文本内容生成视频：${block.content.substring(0, 50)}...`;
        } else if (block.type === 'image') {
          defaultPrompt += `基于图像内容生成视频，保持视觉风格一致`;
        } else if (block.type === 'video') {
          defaultPrompt += `优化和增强现有视频内容`;
        }
        prompts[block.id] = defaultPrompt;
      });
    }
    
    return prompts;
  });

  const t = {
    zh: {
      title: '批量视频生成',
      subtitle: '基于选中的内容块生成视频',
      subtitleFile: '基于上传的文本文件生成视频',
      inputMode: '输入模式',
      blocksMode: '选中块模式',
      fileMode: '文件上传模式',
      uploadFile: '上传TXT文件',
      uploadHint: '点击或拖拽上传TXT文件',
      uploadDescription: '支持 ****** 分隔符或换行符分隔的视频提示词',
      blockContent: '块内容',
      fileContent: '文件内容',
      videoPrompt: '视频提示词',
      settings: '生成设置',
      duration: '视频时长',
      videoOrientation: '视频方向',
      landscape: '横屏 (16:9)',
      portrait: '竖屏 (9:16)',
      downloadPath: '下载目录',
      downloadPathHint: '指定视频下载保存的目录路径',
      interval: '处理间隔',
      maxRetries: '最大重试',
      notifications: '通知',
      startGeneration: '开始生成',
      cancel: '取消',
      minimize: '最小化',
      seconds: '秒',
      milliseconds: '毫秒',
      times: '次',
      promptsFound: '找到 {count} 个提示词',
      maxPromptsWarning: '最多支持50个提示词，当前：{count}',
      fileEmpty: '文件为空或无有效内容',
      fileError: '文件解析错误',
      referenceImages: '参考图片',
      // Error handling
      errors: '错误信息',
      errorDetails: '错误详情',
      hideErrorDetails: '隐藏错误详情',
      showErrorDetails: '显示错误详情',
      retry: '重试',
      retrying: '重试中...',
      dismiss: '忽略',
      dismissAll: '忽略所有',
      clearErrors: '清除错误',
      errorOccurred: '发生错误',
      validationFailed: '验证失败',
      configurationError: '配置错误',
      // Validation messages
      promptRequired: '视频提示词不能为空',
      promptTooLong: '提示词过长，请控制在1000字符以内',
      downloadPathInvalid: '下载路径无效',
      intervalTooSmall: '处理间隔不能小于1000毫秒',
      durationInvalid: '视频时长必须为正数',
      maxRetriesInvalid: '最大重试次数必须在0-10之间'
    },
    en: {
      title: 'Batch Video Generation',
      subtitle: 'Generate videos based on selected content blocks',
      subtitleFile: 'Generate videos based on uploaded text file',
      inputMode: 'Input Mode',
      blocksMode: 'Selected Blocks',
      fileMode: 'File Upload',
      uploadFile: 'Upload TXT File',
      uploadHint: 'Click or drag to upload TXT file',
      uploadDescription: 'Supports ****** separators or line-separated video prompts',
      blockContent: 'Block Content',
      fileContent: 'File Content',
      videoPrompt: 'Video Prompt',
      settings: 'Generation Settings',
      duration: 'Duration',
      videoOrientation: 'Video Orientation',
      landscape: 'Landscape (16:9)',
      portrait: 'Portrait (9:16)',
      downloadPath: 'Download Directory',
      downloadPathHint: 'Specify directory path for video downloads',
      interval: 'Interval',
      maxRetries: 'Max Retries',
      notifications: 'Notifications',
      startGeneration: 'Start Generation',
      cancel: 'Cancel',
      minimize: 'Minimize',
      seconds: 's',
      milliseconds: 'ms',
      times: 'times',
      promptsFound: 'Found {count} prompts',
      maxPromptsWarning: 'Maximum 50 prompts supported, current: {count}',
      fileEmpty: 'File is empty or has no valid content',
      fileError: 'File parsing error',
      referenceImages: 'Reference Images',
      // Error handling
      errors: 'Errors',
      errorDetails: 'Error Details',
      hideErrorDetails: 'Hide Error Details',
      showErrorDetails: 'Show Error Details',
      retry: 'Retry',
      retrying: 'Retrying...',
      dismiss: 'Dismiss',
      dismissAll: 'Dismiss All',
      clearErrors: 'Clear Errors',
      errorOccurred: 'Error Occurred',
      validationFailed: 'Validation Failed',
      configurationError: 'Configuration Error',
      // Validation messages
      promptRequired: 'Video prompt cannot be empty',
      promptTooLong: 'Prompt is too long, please keep it under 1000 characters',
      downloadPathInvalid: 'Download path is invalid',
      intervalTooSmall: 'Processing interval cannot be less than 1000ms',
      durationInvalid: 'Video duration must be a positive number',
      maxRetriesInvalid: 'Max retries must be between 0-10'
    }
  };

  const text = t[lang];

  // 添加错误处理函数
  const addError = (error: Error | string, context?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorInfo: BatchModalError = {
      type: 'BATCH_ERROR',
      code: context?.code || 'UNKNOWN_ERROR',
      message: errorMessage,
      userMessage: errorMessage,
      details: context?.details,
      timestamp: Date.now(),
      retryable: context?.retryable !== false,
      recoverable: context?.recoverable !== false,
      suggestedAction: context?.suggestedAction
    };
    setErrors(prev => [...prev, errorInfo]);
  };

  const removeError = (timestamp: number) => {
    setErrors(prev => prev.filter(error => error.timestamp !== timestamp));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const retryError = async (errorInfo: BatchModalError) => {
    if (!errorInfo.retryable) return;
    
    setRetryingErrors(prev => new Set(prev).add(errorInfo.code));
    
    try {
      // 根据错误类型执行相应的重试逻辑
      switch (errorInfo.code) {
        case 'FILE_PARSING_ERROR':
          if (uploadedFile) {
            await handleFileUpload(uploadedFile);
          }
          break;
        case 'DOWNLOAD_ERROR':
          // 重试下载逻辑将在BatchProcessor中处理
          break;
        default:
          // 通用重试逻辑
          break;
      }
      
      // 移除已解决的错误
      removeError(errorInfo.timestamp);
    } catch (retryError) {
      // 重试失败，添加新的错误信息
      addError(retryError as Error, { originalError: errorInfo });
    } finally {
      setRetryingErrors(prev => {
        const newSet = new Set(prev);
        newSet.delete(errorInfo.code);
        return newSet;
      });
    }
  };

  // 验证配置
  const validateConfiguration = (): boolean => {
    const newValidationErrors: Record<string, string> = {};
    
    // 验证视频提示词
    if (inputMode === 'blocks') {
      selectedBlocks.forEach(block => {
        const prompt = videoPrompts[block.id];
        if (!prompt || prompt.trim().length === 0) {
          newValidationErrors[`prompt_${block.id}`] = text.promptRequired;
        } else if (prompt.length > 1000) {
          newValidationErrors[`prompt_${block.id}`] = text.promptTooLong;
        }
      });
    } else if (inputMode === 'file') {
      if (parsedPrompts.length === 0) {
        newValidationErrors.file = text.fileEmpty;
      }
    }
    
    // 验证下载路径
    if (config.downloadPath && config.downloadPath.trim().length > 0) {
      // 简单的路径验证
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(config.downloadPath)) {
        newValidationErrors.downloadPath = text.downloadPathInvalid;
      }
    }
    
    // 验证处理间隔
    if (config.processingInterval < 1000) {
      newValidationErrors.interval = text.intervalTooSmall;
    }
    
    // 验证视频时长
    if (config.videoDuration <= 0) {
      newValidationErrors.duration = text.durationInvalid;
    }
    
    // 验证最大重试次数
    if (config.maxRetries < 0 || config.maxRetries > 10) {
      newValidationErrors.maxRetries = text.maxRetriesInvalid;
    }
    
    setValidationErrors(newValidationErrors);
    return Object.keys(newValidationErrors).length === 0;
  };

  // 获取错误图标
  const getErrorIcon = (errorCode: string) => {
    switch (errorCode) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        return <AlertTriangle size={16} className="text-orange-500" />;
      case 'AUTH_ERROR':
      case 'API_ERROR':
        return <XCircle size={16} className="text-red-500" />;
      case 'FILE_PARSING_ERROR':
      case 'STORAGE_ERROR':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'RATE_LIMIT_ERROR':
        return <Info size={16} className="text-blue-500" />;
      default:
        return <AlertTriangle size={16} className="text-gray-500" />;
    }
  };

  // 获取错误颜色样式
  const getErrorColorClass = (errorCode: string, theme: 'light' | 'dark') => {
    const baseClasses = {
      light: {
        NETWORK_ERROR: 'bg-orange-50 border-orange-200 text-orange-800',
        TIMEOUT_ERROR: 'bg-orange-50 border-orange-200 text-orange-800',
        AUTH_ERROR: 'bg-red-50 border-red-200 text-red-800',
        API_ERROR: 'bg-red-50 border-red-200 text-red-800',
        FILE_PARSING_ERROR: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        STORAGE_ERROR: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        RATE_LIMIT_ERROR: 'bg-blue-50 border-blue-200 text-blue-800',
        default: 'bg-gray-50 border-gray-200 text-gray-800'
      },
      dark: {
        NETWORK_ERROR: 'bg-orange-900/20 border-orange-500/30 text-orange-400',
        TIMEOUT_ERROR: 'bg-orange-900/20 border-orange-500/30 text-orange-400',
        AUTH_ERROR: 'bg-red-900/20 border-red-500/30 text-red-400',
        API_ERROR: 'bg-red-900/20 border-red-500/30 text-red-400',
        FILE_PARSING_ERROR: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400',
        STORAGE_ERROR: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400',
        RATE_LIMIT_ERROR: 'bg-blue-900/20 border-blue-500/30 text-blue-400',
        default: 'bg-gray-900/20 border-gray-500/30 text-gray-400'
      }
    };
    
    return baseClasses[theme][errorCode as keyof typeof baseClasses[typeof theme]] || baseClasses[theme].default;
  };

  // 解析TXT文件内容
  const parseFileContent = (content: string): string[] => {
    // 首先尝试使用 ****** 分隔符
    if (content.includes('******')) {
      return content.split('******')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    // 回退到换行符分隔
    return content.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setFileError('');
    setUploadedFile(file);
    
    try {
      const content = await file.text();
      const prompts = parseFileContent(content);
      
      if (prompts.length === 0) {
        const errorMessage = text.fileEmpty;
        addError(errorMessage, { 
          code: 'FILE_PARSING_ERROR',
          fileName: file.name, 
          fileSize: file.size,
          retryable: true,
          suggestedAction: lang === 'zh' ? '请检查文件内容格式' : 'Please check file content format'
        });
        setFileError(errorMessage);
        return;
      }
      
      if (prompts.length > 50) {
        const errorMessage = text.maxPromptsWarning.replace('{count}', prompts.length.toString());
        addError(errorMessage, { 
          code: 'FILE_SIZE_ERROR',
          fileName: file.name, 
          promptCount: prompts.length,
          retryable: false,
          suggestedAction: lang === 'zh' ? '请减少提示词数量到50个以内' : 'Please reduce prompts to 50 or fewer'
        });
        setFileError(errorMessage);
        return;
      }
      
      setParsedPrompts(prompts);
      
      // 为每个解析的提示词创建默认的视频提示词（包含全局指令）
      const newVideoPrompts: Record<string, string> = {};
      prompts.forEach((prompt, index) => {
        const id = `file_prompt_${index}`;
        newVideoPrompts[id] = defaultGlobalPrompt + prompt;
      });
      setVideoPrompts(newVideoPrompts);
      
      // 清除之前的错误
      setErrors(prev => prev.filter(error => error.code !== 'FILE_PARSING_ERROR'));
      
    } catch (error) {
      const errorMessage = text.fileError + ': ' + (error instanceof Error ? error.message : String(error));
      addError(error instanceof Error ? error : new Error(errorMessage), { 
        code: 'FILE_PARSING_ERROR',
        fileName: file.name, 
        fileSize: file.size,
        retryable: true,
        suggestedAction: lang === 'zh' ? '请检查文件是否损坏或格式正确' : 'Please check if file is corrupted or format is correct'
      });
      setFileError(errorMessage);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      handleFileUpload(file);
    }
  };

  // 处理拖拽上传
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      handleFileUpload(file);
    }
  };

  // 切换输入模式
  const handleInputModeChange = (mode: 'blocks' | 'file') => {
    setInputMode(mode);
    setFileError('');
    
    if (mode === 'blocks') {
      // 重置文件相关状态
      setUploadedFile(null);
      setParsedPrompts([]);
      
      // 重新生成块的默认提示词
      const prompts: Record<string, string> = {};
      selectedBlocks.forEach((block: Block) => {
        let defaultPrompt = defaultGlobalPrompt;
        if (block.type === 'text') {
          defaultPrompt += `基于文本内容生成视频：${block.content.substring(0, 50)}...`;
        } else if (block.type === 'image') {
          defaultPrompt += `基于图像内容生成视频，保持视觉风格一致`;
        } else if (block.type === 'video') {
          defaultPrompt += `优化和增强现有视频内容`;
        }
        prompts[block.id] = defaultPrompt;
      });
      setVideoPrompts(prompts);
    } else {
      // 清空块相关的提示词
      setVideoPrompts({});
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText size={16} className="text-blue-500" />;
      case 'image': return <ImageIcon size={16} className="text-green-500" />;
      case 'video': return <VideoIcon size={16} className="text-purple-500" />;
      default: return <FileText size={16} className="text-gray-500" />;
    }
  };

  const handlePromptChange = (itemId: string, prompt: string) => {
    setVideoPrompts(prev => ({
      ...prev,
      [itemId]: prompt
    }));
  };

  const handleStartBatch = async () => {
    setIsValidating(true);
    
    try {
      // 验证配置
      if (!validateConfiguration()) {
        addError(text.validationFailed, { 
          code: 'VALIDATION_ERROR',
          validationErrors,
          retryable: false,
          suggestedAction: lang === 'zh' ? '请修正验证错误后重试' : 'Please fix validation errors and retry'
        });
        return;
      }
      
      // 创建selectedFrames数据（当使用blocks模式时）
      const selectedFrames: FrameData[] = inputMode === 'blocks' 
        ? selectedBlocks.map(block => ({
            id: block.id,
            prompt: videoPrompts[block.id] || '',
            imageUrl: block.type === 'image' ? block.content : undefined,
            symbols: [], // 暂时为空，后续可以扩展
            order: parseInt(block.number) || 0
          }))
        : [];

      // 更新config以包含视频方向
      const finalConfig = {
        ...config,
        videoOrientation: videoOrientation
      };

      onStartBatch(finalConfig, videoPrompts, uploadedFile || undefined, selectedFrames, localSelectedCharacter);
      onClose();
    } catch (error) {
      addError(error instanceof Error ? error : new Error(String(error)), {
        code: 'BATCH_START_ERROR',
        inputMode,
        blockCount: selectedBlocks.length,
        promptCount: parsedPrompts.length,
        retryable: true,
        suggestedAction: lang === 'zh' ? '请检查配置并重试' : 'Please check configuration and retry'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // 检查是否可以开始生成
  const canStartGeneration = inputMode === 'blocks' 
    ? selectedBlocks.length > 0 
    : uploadedFile && parsedPrompts.length > 0;

  // 角色处理函数
  const handleCharacterSelect = (character: Character | undefined) => {
    setLocalSelectedCharacter(character);
    if (onCharacterSelect) {
      onCharacterSelect(character);
    }
    setShowCharacterSelector(false);
  };

  const handleOpenCharacterPanel = () => {
    if (onOpenCharacterPanel) {
      onOpenCharacterPanel();
    }
  };

  const getCharacterStatusIcon = (status: Character['status']) => {
    switch (status) {
      case 'creating':
        return <AlertCircle size={14} className="animate-pulse text-blue-500" />;
      case 'ready':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'error':
        return <XCircle size={14} className="text-red-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        theme === 'dark' 
          ? 'bg-slate-800 border border-white/10' 
          : 'bg-white border border-black/10'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${
          theme === 'dark' 
            ? 'bg-slate-800 border-white/10' 
            : 'bg-white border-black/10'
        }`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Play size={20} className="text-purple-500" />
              {text.title}
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {inputMode === 'blocks' 
                ? `${text.subtitle} (${selectedBlocks.length} 个块)`
                : `${text.subtitleFile} (${parsedPrompts.length} 个提示词)`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-white/10 text-slate-400 hover:text-white' 
                    : 'hover:bg-black/5 text-slate-600 hover:text-black'
                }`}
                title={text.minimize}
              >
                <Minimize2 size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-white/10 text-slate-400 hover:text-white' 
                  : 'hover:bg-black/5 text-slate-600 hover:text-black'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Mode Selector */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{text.inputMode}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleInputModeChange('blocks')}
                disabled={selectedBlocks.length === 0}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'blocks'
                    ? 'bg-purple-500 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } ${selectedBlocks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Video size={16} className="inline mr-2" />
                {text.blocksMode}
              </button>
              <button
                onClick={() => handleInputModeChange('file')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  inputMode === 'file'
                    ? 'bg-purple-500 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileIcon size={16} className="inline mr-2" />
                {text.fileMode}
              </button>
            </div>
          </div>

          {/* Error Display Section */}
          {errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  {text.errors} ({errors.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-600 hover:text-black hover:bg-black/5'
                    }`}
                  >
                    {showErrorDetails ? text.hideErrorDetails : text.showErrorDetails}
                  </button>
                  <button
                    onClick={clearAllErrors}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-600 hover:text-black hover:bg-black/5'
                    }`}
                  >
                    {text.clearErrors}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={`${error.timestamp}_${index}`}
                    className={`p-3 rounded-lg border ${getErrorColorClass(error.code, theme)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getErrorIcon(error.code)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{error.userMessage}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            theme === 'dark' ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {error.type}
                          </span>
                        </div>
                        
                        {error.suggestedAction && (
                          <p className={`text-xs mb-2 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {error.suggestedAction}
                          </p>
                        )}
                        
                        {showErrorDetails && (
                          <div className={`text-xs p-2 rounded border mt-2 ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-white/10 text-slate-400'
                              : 'bg-slate-50 border-black/10 text-slate-500'
                          }`}>
                            <div className="mb-1">
                              <strong>时间:</strong> {new Date(error.timestamp).toLocaleString()}
                            </div>
                            <div className="mb-1">
                              <strong>详细信息:</strong> {error.message}
                            </div>
                            {error.details && (
                              <div>
                                <strong>额外信息:</strong> {error.details}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {error.recoverable && (
                          <button
                            onClick={() => retryError(error)}
                            disabled={retryingErrors.has(error.type)}
                            className={`p-1 rounded transition-colors ${
                              retryingErrors.has(error.type)
                                ? 'opacity-50 cursor-not-allowed'
                                : theme === 'dark'
                                ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                                : 'hover:bg-black/5 text-slate-600 hover:text-black'
                            }`}
                            title={retryingErrors.has(error.type) ? text.retrying : text.retry}
                          >
                            <RefreshCw 
                              size={14} 
                              className={retryingErrors.has(error.type) ? 'animate-spin' : ''} 
                            />
                          </button>
                        )}
                        <button
                          onClick={() => removeError(error.timestamp)}
                          className={`p-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                              : 'hover:bg-black/5 text-slate-600 hover:text-black'
                          }`}
                          title={text.dismiss}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors Display */}
          {Object.keys(validationErrors).length > 0 && (
            <div className={`p-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-500/30 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} />
                <span className="font-medium text-sm">{text.validationFailed}</span>
              </div>
              <ul className="text-xs space-y-1 ml-6">
                {Object.entries(validationErrors).map(([field, message]) => (
                  <li key={field}>• {String(message)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Content Sections */}
          {inputMode === 'blocks' ? (
            /* Blocks Mode Content */
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Video size={18} className="text-purple-500" />
                {text.blockContent}
              </h3>
              
              {selectedBlocks.map((block: Block) => (
                <div key={block.id} className={`p-4 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50 border-white/10' 
                    : 'bg-slate-50 border-black/10'
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    {getBlockIcon(block.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{block.number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          theme === 'dark' ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {block.type}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {block.content || '无内容'}
                      </p>
                      
                      {/* Reference Image Display */}
                      {block.type === 'image' && block.content && (
                        <div className="mt-2">
                          <p className={`text-xs mb-1 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {text.referenceImages}
                          </p>
                          <img 
                            src={block.content} 
                            alt="Reference" 
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {text.videoPrompt}
                    </label>
                    <textarea
                      value={videoPrompts[block.id] || ''}
                      onChange={(e) => handlePromptChange(block.id, e.target.value)}
                      placeholder={lang === 'zh' ? '输入视频生成提示词...' : 'Enter video generation prompt...'}
                      className={`w-full px-4 py-3 rounded-xl border-2 text-sm resize-none ${validationErrors[`prompt_${block.id}`]
                        ? theme === 'dark'
                          ? 'bg-slate-600 border-red-400 text-white placeholder-slate-400 focus:border-red-400'
                          : 'bg-white border-red-500 text-black placeholder-slate-500 focus:border-red-500'
                        : theme === 'dark'
                          ? 'bg-slate-600 border-amber-400 text-white placeholder-slate-400 focus:border-purple-400'
                          : 'bg-white border-amber-500 text-black placeholder-slate-500 focus:border-purple-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      rows={1}
                      onInput={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        textarea.style.height = 'auto';
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
                      }}
                    />
                    {validationErrors[`prompt_${block.id}`] && (
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {validationErrors[`prompt_${block.id}`]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* File Mode Content */
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload size={18} className="text-blue-500" />
                {text.uploadFile}
              </h3>
              
              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  theme === 'dark'
                    ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                  }`}>
                    <Upload size={24} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
                  </div>
                  
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      {text.uploadHint}
                    </p>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {text.uploadDescription}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    选择文件
                  </button>
                </div>
              </div>
              
              {/* File Error Display */}
              {fileError && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-red-900/20 border-red-500/30 text-red-400'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="text-sm">{fileError}</p>
                </div>
              )}
              
              {/* Uploaded File Info */}
              {uploadedFile && (
                <div className={`p-4 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50 border-white/10' 
                    : 'bg-slate-50 border-black/10'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <FileIcon size={16} className="text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">{uploadedFile.name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {text.promptsFound.replace('{count}', parsedPrompts.length.toString())}
                      </p>
                    </div>
                  </div>
                  
                  {/* File Content Preview */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {text.fileContent}
                    </label>
                    <div className={`max-h-32 overflow-y-auto p-3 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-600 border-white/20 text-slate-300'
                        : 'bg-white border-black/20 text-slate-700'
                    }`}>
                      {parsedPrompts.map((prompt, index) => (
                        <div key={index} className="mb-2 last:mb-0">
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {index + 1}.
                          </span>
                          <span className="ml-2">{prompt.substring(0, 100)}{prompt.length > 100 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Character Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User size={18} className="text-purple-500" />
              {lang === 'zh' ? '角色选择' : 'Character Selection'}
            </h3>
            
            <div className="space-y-3">
              {/* Character Selector */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <button
                    onClick={() => setShowCharacterSelector(!showCharacterSelector)}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      localSelectedCharacter
                        ? 'border-purple-500 bg-purple-500/10'
                        : theme === 'dark'
                        ? 'border-white/20 hover:border-white/30 bg-slate-700/50'
                        : 'border-black/20 hover:border-black/30 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {localSelectedCharacter ? (
                        <>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                          }`}>
                            {localSelectedCharacter.profile_picture_url ? (
                              <img
                                src={localSelectedCharacter.profile_picture_url}
                                alt={localSelectedCharacter.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User size={16} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm truncate ${
                                theme === 'dark' ? 'text-white' : 'text-black'
                              }`}>
                                {localSelectedCharacter.username}
                              </span>
                              {getCharacterStatusIcon(localSelectedCharacter.status)}
                            </div>
                            <p className={`text-xs truncate ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {localSelectedCharacter.timestamps && (
                                <span className="font-mono">{localSelectedCharacter.timestamps}</span>
                              )}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                          }`}>
                            <Users size={16} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
                          </div>
                          <span className={`text-sm ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {lang === 'zh' ? '选择角色（可选）' : 'Select Character (Optional)'}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
                
                <button
                  onClick={handleOpenCharacterPanel}
                  className={`p-3 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-white/20 hover:bg-white/10 text-slate-400 hover:text-white'
                      : 'border-black/20 hover:bg-black/5 text-slate-600 hover:text-black'
                  }`}
                  title={lang === 'zh' ? '管理角色' : 'Manage Characters'}
                >
                  <Settings size={16} />
                </button>
              </div>

              {/* Character Dropdown */}
              {showCharacterSelector && (
                <div className={`border rounded-lg max-h-64 overflow-y-auto ${
                  theme === 'dark'
                    ? 'border-white/20 bg-slate-700'
                    : 'border-black/20 bg-white'
                }`}>
                  {/* No Character Option */}
                  <button
                    onClick={() => handleCharacterSelect(undefined)}
                    className={`w-full px-4 py-3 text-left hover:bg-opacity-50 transition-colors ${
                      !localSelectedCharacter
                        ? theme === 'dark'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-purple-500/10 text-purple-600'
                        : theme === 'dark'
                        ? 'hover:bg-slate-600 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                      }`}>
                        <X size={16} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
                      </div>
                      <span className="text-sm">
                        {lang === 'zh' ? '不使用角色' : 'No Character'}
                      </span>
                    </div>
                  </button>

                  {/* Character List */}
                  {characters.filter(char => char.status === 'ready').map((character) => (
                    <button
                      key={character.id}
                      onClick={() => handleCharacterSelect(character)}
                      className={`w-full px-4 py-3 text-left hover:bg-opacity-50 transition-colors border-t ${
                        localSelectedCharacter?.id === character.id
                          ? theme === 'dark'
                            ? 'bg-purple-500/20 text-purple-400 border-white/10'
                            : 'bg-purple-500/10 text-purple-600 border-black/10'
                          : theme === 'dark'
                          ? 'hover:bg-slate-600 text-slate-300 border-white/10'
                          : 'hover:bg-slate-100 text-slate-700 border-black/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                        }`}>
                          {character.profile_picture_url ? (
                            <img
                              src={character.profile_picture_url}
                              alt={character.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User size={16} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {character.username}
                            </span>
                            {getCharacterStatusIcon(character.status)}
                          </div>
                          {character.timestamps && (
                            <p className={`text-xs font-mono truncate ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {character.timestamps}
                            </p>
                          )}
                          {character.usage_count !== undefined && character.usage_count > 0 && (
                            <p className={`text-xs truncate ${
                              theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                            }`}>
                              {lang === 'zh' ? `使用 ${character.usage_count} 次` : `Used ${character.usage_count} times`}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Empty State */}
                  {characters.filter(char => char.status === 'ready').length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <User size={32} className={theme === 'dark' ? 'text-slate-600 mx-auto mb-2' : 'text-slate-400 mx-auto mb-2'} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lang === 'zh' ? '暂无可用角色' : 'No characters available'}
                      </p>
                      <button
                        onClick={handleOpenCharacterPanel}
                        className="mt-2 text-xs text-purple-500 hover:text-purple-600 transition-colors"
                      >
                        {lang === 'zh' ? '创建角色' : 'Create Character'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Character Info */}
              {localSelectedCharacter && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'border-purple-500/30 bg-purple-500/10'
                    : 'border-purple-500/30 bg-purple-500/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-purple-500" />
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {lang === 'zh' ? '角色信息' : 'Character Info'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Video size={12} className="text-blue-500" />
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                        {localSelectedCharacter.url 
                          ? (lang === 'zh' ? '来自视频' : 'From Video')
                          : localSelectedCharacter.from_task 
                          ? (lang === 'zh' ? '来自任务' : 'From Task')
                          : (lang === 'zh' ? '未知来源' : 'Unknown Source')
                        }
                      </span>
                    </div>
                    {localSelectedCharacter.timestamps && (
                      <div className="flex items-center gap-2">
                        <AlertCircle size={12} className="text-orange-500" />
                        <span className={`font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {localSelectedCharacter.timestamps}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generation Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings size={18} className="text-amber-500" />
              {text.settings}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Duration */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {text.duration}
                </label>
                <select
                  value={config.videoDuration}
                  onChange={(e) => setConfig(prev => ({ ...prev, videoDuration: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    validationErrors.duration
                      ? theme === 'dark'
                        ? 'bg-slate-600 border-red-400 text-white'
                        : 'bg-white border-red-500 text-black'
                      : theme === 'dark'
                        ? 'bg-slate-600 border-white/20 text-white'
                        : 'bg-white border-black/20 text-black'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                >
                  <option value={5}>5{text.seconds}</option>
                  <option value={10}>10{text.seconds}</option>
                  <option value={15}>15{text.seconds}</option>
                  <option value={25}>25{text.seconds}</option>
                </select>
                {validationErrors.duration && (
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {validationErrors.duration}
                  </p>
                )}
              </div>

              {/* Video Orientation */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {text.videoOrientation}
                </label>
                <select
                  value={videoOrientation}
                  onChange={(e) => setVideoOrientation(e.target.value as 'landscape' | 'portrait')}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-600 border-white/20 text-white'
                      : 'bg-white border-black/20 text-black'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                >
                  <option value="landscape">{text.landscape}</option>
                  <option value="portrait">{text.portrait}</option>
                </select>
              </div>

              {/* Processing Interval */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {text.interval}
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={config.processingInterval}
                  onChange={(e) => setConfig(prev => ({ ...prev, processingInterval: Number(e.target.value) }))}
                  className={`w-full px-2 py-1 border-b border-l border-r rounded-t text-sm ${
                    validationErrors.interval
                      ? theme === 'dark'
                        ? 'bg-slate-600 border-red-400 text-white'
                        : 'bg-white border-red-500 text-black'
                      : theme === 'dark'
                        ? 'bg-slate-600 border-white/20 text-white'
                        : 'bg-white border-black/20 text-black'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {text.milliseconds}
                </span>
                {validationErrors.interval && (
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {validationErrors.interval}
                  </p>
                )}
              </div>

              {/* Max Retries */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {text.maxRetries}
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxRetries}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: Number(e.target.value) }))}
                  className={`w-full px-2 py-1 border-b border-l border-r rounded-t text-sm ${
                    validationErrors.maxRetries
                      ? theme === 'dark'
                        ? 'bg-slate-600 border-red-400 text-white'
                        : 'bg-white border-red-500 text-black'
                      : theme === 'dark'
                        ? 'bg-slate-600 border-white/20 text-white'
                        : 'bg-white border-black/20 text-black'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {text.times}
                </span>
                {validationErrors.maxRetries && (
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {validationErrors.maxRetries}
                  </p>
                )}
              </div>
            </div>

            {/* Download Path */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {text.downloadPath}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.downloadPath || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, downloadPath: e.target.value }))}
                  placeholder={text.downloadPathHint}
                  className={`flex-1 px-2 py-1 border-b border-l border-r rounded-t text-sm ${
                    validationErrors.downloadPath
                      ? theme === 'dark'
                        ? 'bg-slate-600 border-red-400 text-white placeholder-slate-400'
                        : 'bg-white border-red-500 text-black placeholder-slate-500'
                      : theme === 'dark'
                        ? 'bg-slate-600 border-white/20 text-white placeholder-slate-400'
                        : 'bg-white border-black/20 text-black placeholder-slate-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-white/20 hover:bg-white/10 text-slate-300'
                      : 'border-black/20 hover:bg-black/5 text-slate-600'
                  }`}
                  title="选择目录"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              {validationErrors.downloadPath && (
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {validationErrors.downloadPath}
                </p>
              )}
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfig(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  config.enableNotifications 
                    ? 'bg-purple-500' 
                    : theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  config.enableNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {text.notifications}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 px-6 py-4 border-t flex items-center justify-end gap-3 ${
          theme === 'dark' 
            ? 'bg-slate-800 border-white/10' 
            : 'bg-white border-black/10'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-black hover:bg-black/5'
            }`}
          >
            {text.cancel}
          </button>
          <button
            onClick={handleStartBatch}
            disabled={!canStartGeneration}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Play size={16} />
            {text.startGeneration}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchVideoModal;