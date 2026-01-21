
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Image as ImageIcon, Video, Settings, Sun, Moon, Zap, 
  MessageSquare, LayoutGrid, X, Key, Upload, Cpu, HelpCircle, Save, FilePlus, Paperclip, Eraser, Copy, Check,
  Trash2, Layers, Languages, Globe, RotateCcw, MonitorX, Send, Play, Download, Hand, Brain,
  Type as TextIcon, BrainCircuit, Sparkles, ChevronLeft, ChevronRight, ImagePlus, FileText, Info, Loader2, ArrowUpRight,
  ChevronDown, Database, Sliders, ExternalLink, ShieldCheck, ListOrdered, FolderOpen, User, PanelLeft, PanelRight, Share2, Volume2
} from 'lucide-react';
import { Block, Connection, BlockType, ModelConfig, ProviderType, ProviderSettings, BatchConfig, BatchGenerationState, ExportLayout, FrameData, PresetPrompt, CanvasState, BatchInputSource, Character, NewModelConfig, getProviderSettings, convertLegacyToNewConfig, convertNewToLegacyConfig, MenuConfig } from './types';

// 分享功能导入
import { useShareMode } from './hooks/useShareMode';
import ViewerMode from './components/ViewerMode';
import SimpleViewerMode from './components/SimpleViewerMode';
import RealtimeViewerPage from './components/RealtimeViewerPage';
import SharePanel from './components/SharePanel';
import ShareToolbarButton from './components/ShareToolbarButton';
import RealtimeShareButton from './components/RealtimeShareButton';
import { p2pShareService } from './services/P2PShareService';

// 简单音效播放函数
const playCommandSound = () => {
  try {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 确保音频上下文处于运行状态
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 类似微信发送消息的音效 - 双音调
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('音效播放失败:', error);
  }
};

// 临时存储最后创建的块，用于解决异步状态更新问题
declare global {
  interface Window {
    lastCreatedBlock?: Block;
  }
}
import Canvas from './components/Canvas';
import BatchVideoModal from './components/BatchVideoModal';
import MinimizedProgressWindow from './components/MinimizedProgressWindow';
import ExportLayoutSelector from './components/ExportLayoutSelector';
import APIProviderConfig from './components/APIProviderConfig';
import PresetPromptButton from './components/PresetPromptButton';
import PresetPromptModal from './components/PresetPromptModal';
import TemplateManager from './components/TemplateManager';
import AutomationControlPanel from './components/AutomationControlPanel';
import BatchInputConfigModal from './components/BatchInputConfigModal';
import TokenConsumptionDisplay from './components/TokenConsumptionDisplay';
import CharacterPanel from './components/CharacterPanel';
import FeatureAssemblyPanel from './components/FeatureAssemblyPanel';
import ModelSelector from './components/ModelSelector';
import ParameterPanel from './components/ParameterPanel';
import { characterService } from './services/CharacterService';
import { aiService } from './services/geminiService';
import { MultiProviderAIService } from './adapters/AIServiceAdapter';
import { BatchProcessor } from './services/BatchProcessor';
import { ExportService } from './services/ExportService';
import { MultiImageGenerator } from './services/MultiImageGenerator';
import { loadPresetPrompts, savePresetPrompts } from './services/PresetPromptStorage';
import VoiceCommandHelp from './components/VoiceCommandHelp';
import GestureController from './components/GestureController';
import GestureHelp from './components/GestureHelp';
import CanvasVoiceController from './components/CanvasVoiceController';
import CanvasGestureController from './components/CanvasGestureController';
import CaocaoAIChat from './components/CaocaoAIChat';
import { simpleGestureRecognizer } from './services/SimpleGestureRecognizer';
import { connectionEngine } from './services/ConnectionEngine';
import { voiceCanvasReporter } from './services/VoiceCanvasReporter';
import { COLORS, I18N, MIN_ZOOM, MAX_ZOOM } from './constants.tsx';
import { getAssistantGuideContent, createAssistantSystemPrompt } from './config/assistant-guide';
import { TokenContextProvider, useTokenContext } from './contexts/TokenContext';
import { autoExecutionService, ExecutionProgress } from './services/AutoExecutionService';
import { TokenCalculator } from './services/TokenCalculator';
import { modelCapabilityDetector } from './services/ModelCapabilityDetector';
import { ConfigPersistence } from './utils/ConfigPersistence';
import { ConfigValidator } from './utils/ConfigValidator';
import { templateManager } from './services/TemplateManager';
import { menuConfigManager } from './utils/MenuConfigManager';
import CanvasToast from './components/CanvasToast';
import CanvasConfirmDialog from './components/CanvasConfirmDialog';
import { useToast } from './hooks/useToast';
import { useSystemMonitoring, useFeatureTracking } from './hooks/useSystemMonitoring';
import VoiceSettingsModal from './components/VoiceSettingsModal';
import { voiceSettingsService } from './services/VoiceSettingsService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'image' | 'video';
  content: string; 
  attachmentName?: string;
  attachmentContent?: string;
  timestamp: string;
  isGenerating?: boolean;
}

const App: React.FC = () => {
  // 分享模式检测
  const shareMode = useShareMode();
  
  // 调试信息
  console.log('[App] ShareMode state:', shareMode);
  
  // 如果是观看模式，显示观看界面
  if (shareMode.isViewer) {
    console.log('[App] Rendering SimpleViewerPage with shareId:', shareMode.shareId);
    return <RealtimeViewerPage shareId={shareMode.shareId} />;
  }

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 200, y: 100 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarInput, setSidebarInput] = useState('');
  const [chatMode, setChatMode] = useState<BlockType>('text');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('gemini-3-flash-preview-nothinking'); // 当前选择的文本模型
  const [isAssistantMode, setIsAssistantMode] = useState(false);
  const [assistantGuideContent, setAssistantGuideContent] = useState('');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, blockId?: string } | null>(null);

  // Attachments State
  const [pendingChatImage, setPendingChatImage] = useState<string | null>(null);
  const [pendingChatFile, setPendingChatFile] = useState<{ name: string, content: string } | null>(null);
  const [pendingChatVideo, setPendingChatVideo] = useState<string | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<'file' | 'url'>('file'); // 视频输入模式
  
  // Voice Input State
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [wasVoiceInput, setWasVoiceInput] = useState<boolean>(false); // 跟踪是否是语音输入
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [voiceTimeout, setVoiceTimeout] = useState<NodeJS.Timeout | null>(null); // 语音超时定时器
  const [wakeWord] = useState<string>('曹操'); // 唤醒词
  const [showVoiceHelp, setShowVoiceHelp] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<{text: string, command: string} | null>(null);

  // Gesture Control State
  const [showGestureController, setShowGestureController] = useState<boolean>(false);
  const [showGestureHelp, setShowGestureHelp] = useState<boolean>(false);
  const [isGestureActive, setIsGestureActive] = useState<boolean>(false);
  
  // Canvas Voice & Gesture Control State
  const [isCanvasVoiceActive, setIsCanvasVoiceActive] = useState<boolean>(false);
  const [isCanvasGestureActive, setIsCanvasGestureActive] = useState<boolean>(false);
  const [showCaocaoChat, setShowCaocaoChat] = useState<boolean>(false);
  
  // 语音消息传递状态
  const [voiceMessages, setVoiceMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type: 'voice' | 'system';
    timestamp: number;
  }>>([]);

  // 手势激活状态变化时的处理
  useEffect(() => {
    if (isCanvasGestureActive) {
      // 启动手势识别
      const startGestureRecognition = async () => {
        try {
          // 更新手势识别器的画布状态
          simpleGestureRecognizer.updateCanvasState({
            blockCount: blocks.length,
            selectedCount: selectedIds.length,
            hasContent: blocks.some(b => b.content && b.content.trim()),
            zoomLevel: zoom,
            panPosition: pan
          });
          
          // 清除之前的回调，避免重复设置
          simpleGestureRecognizer.setOnGestureCallback(null);
          
          // 延迟设置手势回调，确保组件状态稳定
          setTimeout(() => {
            simpleGestureRecognizer.setOnGestureCallback(handleGestureCommand);
            console.log('[App] 手势控制已激活，回调已设置');
          }, 200);
          
          // 自动切换到曹操AI标签页
          setSidebarTab('caocao');
        } catch (error) {
          console.error('[App] 手势控制启动失败:', error);
          setIsCanvasGestureActive(false);
        }
      };
      
      startGestureRecognition();
    } else {
      // 停止手势识别
      simpleGestureRecognizer.setOnGestureCallback(null);
      simpleGestureRecognizer.stop();
      console.log('[App] 手势控制已停止');
    }
  }, [isCanvasGestureActive, blocks.length, selectedIds.length, zoom, pan]);

  // New functionality state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchVideoModal, setShowBatchVideoModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showParameterPanel, setShowParameterPanel] = useState(false);
  const [parameterPanelType, setParameterPanelType] = useState<'image' | 'video'>('image');
  const [parameterPanelModel, setParameterPanelModel] = useState<string>('');
  const [batchState, setBatchState] = useState<BatchGenerationState | undefined>();
  const [isProgressMinimized, setIsProgressMinimized] = useState(false);
  const [aiServiceAdapter] = useState(() => new MultiProviderAIService());
  const [batchProcessor] = useState(() => new BatchProcessor());
  const [exportService] = useState(() => new ExportService());
  const [multiImageGenerator] = useState(() => new MultiImageGenerator(aiServiceAdapter.shenmaService));
  
  // Auto Execution State - Keep only progress for template automation
  const [autoExecutionProgress, setAutoExecutionProgress] = useState<ExecutionProgress | null>(null);

  // Automation Template State
  const [isAutomationTemplate, setIsAutomationTemplate] = useState(false);
  const [showBatchInputConfig, setShowBatchInputConfig] = useState(false);
  const [batchInputSource, setBatchInputSource] = useState<BatchInputSource | null>(null);
  
  // Result handling state
  const [resultHandling, setResultHandling] = useState<'canvas' | 'download'>('canvas');
  const [downloadPath, setDownloadPath] = useState<string>('');
  
  // Character Management State
  const [isCharacterPanelOpen, setIsCharacterPanelOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | undefined>();
  
  // Feature Assembly State
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'caocao' | 'assembly'>('chat');
  const [currentMenuConfig, setCurrentMenuConfig] = useState<MenuConfig | undefined>();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  // Toast and Dialog State
  const { messages: toastMessages, showSuccess, showError, showInfo, removeToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // Voice Settings State
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // 获取token context
  const { updateConsumption, checkTokenLimit, showTokenLimitModal } = useTokenContext();

  // 使用新的配置结构
  const [modelConfig, setModelConfig] = useState<NewModelConfig>({
    providers: {},
    text: { provider: 'google', modelId: 'gemini-3-flash-preview' },
    image: { provider: 'shenma', modelId: 'nano-banana-hd' },
    video: { provider: 'shenma', modelId: 'sora_video2' },
    _meta: {
      version: '2.0',
      lastSaved: Date.now()
    }
  });
  const [showConfig, setShowConfig] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<BlockType>('text');

  const [sidebarWidth, setSidebarWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Preset Prompt State
  const [presetPrompts, setPresetPrompts] = useState<PresetPrompt[]>([]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [showPresetPromptModal, setShowPresetPromptModal] = useState(false);

  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const chatTextInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const t = I18N[lang];

  // Feature tracking for analytics (backend data collection continues)
  const { trackFeatureUsage, trackFeatureError, trackPerformance } = useFeatureTracking();

  // Enhanced text formatting function with more features
  const formatText = (text: string): JSX.Element[] => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // Check for special line types first
      const trimmedLine = line.trim();
      
      // Handle headers (# ## ###)
      const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const HeaderTag = `h${level + 2}` as keyof JSX.IntrinsicElements; // h3, h4, h5
        return (
          <HeaderTag key={lineIndex} className={`font-bold mb-2 mt-4 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
            {headerText}
          </HeaderTag>
        );
      }
      
      // Handle bullet points (- or *)
      const bulletMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        return (
          <div key={lineIndex} className="flex items-start gap-2 my-1">
            <span className="text-amber-500 font-bold mt-1">•</span>
            <span className="flex-1">{formatInlineText(bulletMatch[1], lineIndex)}</span>
          </div>
        );
      }
      
      // Handle numbered lists (1. 2. etc.)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        return (
          <div key={lineIndex} className="flex items-start gap-2 my-1">
            <span className="text-amber-500 font-bold mt-1 min-w-[20px]">{numberedMatch[1]}.</span>
            <span className="flex-1">{formatInlineText(numberedMatch[2], lineIndex)}</span>
          </div>
        );
      }
      
      // Handle code blocks (```code```)
      if (trimmedLine.startsWith('```') && trimmedLine.endsWith('```') && trimmedLine.length > 6) {
        const codeContent = trimmedLine.slice(3, -3);
        return (
          <pre key={lineIndex} className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-3 my-2 overflow-x-auto">
            <code className="text-xs font-mono">{codeContent}</code>
          </pre>
        );
      }
      
      // Handle blockquotes (> text)
      const quoteMatch = trimmedLine.match(/^>\s+(.+)$/);
      if (quoteMatch) {
        return (
          <div key={lineIndex} className="border-l-4 border-amber-500 pl-4 py-2 my-2 bg-amber-50 dark:bg-amber-900/20 italic">
            {formatInlineText(quoteMatch[1], lineIndex)}
          </div>
        );
      }
      
      // Regular line with inline formatting
      return (
        <div key={lineIndex} className="leading-relaxed">
          {formatInlineText(line, lineIndex)}
        </div>
      );
    });
  };

  // Helper function for inline text formatting
  const formatInlineText = (text: string, lineIndex: number): (string | JSX.Element)[] => {
    if (!text.trim()) return ['\u00A0'];
    
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    
    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${lineIndex}-${match.index}`} className="font-bold">
          {match[1]}
        </strong>
      );
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    
    // Handle `code` text in the processed parts
    const processedParts: (string | JSX.Element)[] = [];
    parts.forEach((part, partIndex) => {
      if (typeof part === 'string') {
        const codeParts: (string | JSX.Element)[] = [];
        let codeIndex = 0;
        const codeRegex = /`(.*?)`/g;
        let codeMatch;
        
        while ((codeMatch = codeRegex.exec(part)) !== null) {
          // Add text before the match
          if (codeMatch.index > codeIndex) {
            codeParts.push(part.slice(codeIndex, codeMatch.index));
          }
          // Add code text
          codeParts.push(
            <code 
              key={`code-${lineIndex}-${partIndex}-${codeMatch.index}`}
              className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-mono"
            >
              {codeMatch[1]}
            </code>
          );
          codeIndex = codeMatch.index + codeMatch[0].length;
        }
        
        // Add remaining text
        if (codeIndex < part.length) {
          codeParts.push(part.slice(codeIndex));
        }
        
        processedParts.push(...codeParts);
      } else {
        processedParts.push(part);
      }
    });
    
    return processedParts.length > 0 ? processedParts : ['\u00A0'];
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // 监听语音控制状态变化，关闭时停止所有语音合成
  useEffect(() => {
    if (!isCanvasVoiceActive) {
      // 语音控制关闭时，立即停止所有语音合成播放
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        console.log('[App] 语音控制关闭，已停止所有语音合成');
      }
    }
  }, [isCanvasVoiceActive]);

  // 分享功能：监听blocks变化并广播给观众
  useEffect(() => {
    // 广播画布更新给观众
    p2pShareService.broadcastCanvasUpdate(blocks);
  }, [blocks]);
  
  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // 启用连续监听
      recognition.interimResults = true; // 启用中间结果
      recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // 处理所有识别结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // 如果有最终结果，添加到输入框
        if (finalTranscript) {
          setSidebarInput(prev => {
            const newValue = prev + (prev ? ' ' : '') + finalTranscript;
            return newValue;
          });
          setWasVoiceInput(true);
          
          // 清除之前的定时器
          if (voiceTimeout) {
            clearTimeout(voiceTimeout);
          }
          
          // 设置3秒后自动提交
          const timeout = setTimeout(() => {
            console.log('[语音识别] 3秒无语音，自动提交');
            handleSidebarSend();
            setIsVoiceRecording(false);
            if (recognition) {
              recognition.stop();
            }
          }, 3000);
          
          setVoiceTimeout(timeout);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // 如果是网络错误或其他可恢复错误，尝试重启
        if (event.error === 'network' || event.error === 'audio-capture') {
          console.log('[语音识别] 检测到网络错误，尝试重启...');
          setTimeout(() => {
            if (isVoiceRecording && recognition) {
              try {
                recognition.start();
              } catch (error) {
                console.error('[语音识别] 重启失败:', error);
                setIsVoiceRecording(false);
              }
            }
          }, 1000);
        } else {
          setIsVoiceRecording(false);
        }
      };
      
      recognition.onend = () => {
        console.log('[语音识别] 识别结束');
        
        // 如果仍在录音状态且没有错误，自动重启
        if (isVoiceRecording) {
          console.log('[语音识别] 自动重启连续监听...');
          setTimeout(() => {
            if (isVoiceRecording && recognition) {
              try {
                recognition.start();
              } catch (error) {
                console.error('[语音识别] 自动重启失败:', error);
                setIsVoiceRecording(false);
              }
            }
          }, 100);
        }
      };
      
      recognition.onstart = () => {
        console.log('[语音识别] 开始监听');
      };
      
      setRecognition(recognition);
    }
  }, [lang]);
  
  // 语音指令处理函数
  const handleVoiceCommand = async (commandText: string) => {
    try {
      
      // 简单的关键词匹配解析指令
      const command = parseVoiceCommand(commandText);
      
      if (command.command !== 'unknown') {
        // 执行指令
        await executeVoiceCommand(command);
      } else {
        // 未识别的指令，显示在输入框中
        setSidebarInput(prev => prev + commandText);
        setIsVoiceProcessing(false);
      }
    } catch (error) {
      console.error('语音指令处理失败:', error);
      setSidebarInput(prev => prev + commandText);
      setIsVoiceProcessing(false);
    }
  };

  const parseVoiceCommand = (text: string) => {
    // 简化的语音指令解析，避免动态导入问题
    const lowerText = text.toLowerCase();
    
    // 文本生成指令
    if (lowerText.includes('写') || lowerText.includes('文字') || lowerText.includes('文本')) {
      return {
        command: 'generate_text',
        content: text.replace(/帮我|请|生成|制作|写|文字|文本/g, '').trim(),
        confidence: 0.9,
        matched_pattern: '文本生成'
      };
    }
    
    // 图片生成指令
    if (lowerText.includes('画') || lowerText.includes('图片') || lowerText.includes('图像')) {
      return {
        command: 'generate_image',
        content: text.replace(/帮我|请|生成|制作|画|图片|图像/g, '').trim(),
        confidence: 0.9,
        matched_pattern: '图片生成'
      };
    }
    
    // 视频生成指令
    if (lowerText.includes('视频') || lowerText.includes('录像') || lowerText.includes('影片')) {
      return {
        command: 'generate_video',
        content: text.replace(/帮我|请|生成|制作|视频|录像|影片/g, '').trim(),
        confidence: 0.9,
        matched_pattern: '视频生成'
      };
    }
    
    // 画布操作指令
    if (lowerText.includes('清空') || lowerText.includes('清除')) {
      return { command: 'clear_canvas', content: text, confidence: 0.95, matched_pattern: '清空画布' };
    }
    
    if (lowerText.includes('重置') || lowerText.includes('居中')) {
      return { command: 'reset_view', content: text, confidence: 0.95, matched_pattern: '重置视角' };
    }
    
    if (lowerText.includes('布局') || lowerText.includes('排列')) {
      return { command: 'auto_layout', content: text, confidence: 0.95, matched_pattern: '自动布局' };
    }
    
    if (lowerText.includes('全选') || lowerText.includes('选择全部')) {
      return { command: 'select_all', content: text, confidence: 0.95, matched_pattern: '全选' };
    }

    return { command: 'unknown', content: text, confidence: 0 };
  };

  // 执行语音指令
  const executeVoiceCommand = async (command: any) => {
    // 播放指令提交音效
    playCommandSound();
    
    // 保存指令信息用于反馈
    setLastVoiceCommand({
      text: command.content,
      command: command.command
    });
    
    switch (command.command) {
      case 'generate_text':
        // 创建文字块并生成内容
        await createAndGenerateBlock('text', command.content);
        break;
      case 'generate_image':
        // 创建图片块并生成内容
        await createAndGenerateBlock('image', command.content, command.params);
        break;
      case 'generate_video':
        // 创建视频块并生成内容
        await createAndGenerateBlock('video', command.content);
        break;
      case 'clear_canvas':
        // 清空画布
        handleCanvasClear();
        break;
      case 'reset_view':
        // 重置视角
        handleCanvasReset();
        break;
      case 'auto_layout':
        // 自动布局
        handleAutoLayout();
        break;
      case 'copy_blocks':
        // 复制选中的块
        handleCanvasCopy();
        break;
      case 'select_all':
        // 全选
        handleSelectAll();
        break;
      case 'zoom_in':
        // 放大画布
        setZoom(prev => Math.min(prev * 1.2, 3));
        break;
      case 'zoom_out':
        // 缩小画布
        setZoom(prev => Math.max(prev / 1.2, 0.1));
        break;
      case 'show_config':
        // 显示配置
        setShowConfig(true);
        break;
      case 'switch_theme':
        // 切换主题
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        break;
      default:
        console.log('未知指令类型:', command.command);
    }

    setIsVoiceProcessing(false);

    // 如果置信度较低，显示反馈界面
    if (command.confidence && command.confidence < 0.8) {
      // 语音识别置信度较低，但不再显示反馈界面
      console.log('语音识别置信度较低:', command.confidence);
    }
  };

  // 创建块并生成内容
  const createAndGenerateBlock = async (type: 'text' | 'image' | 'video', content: string, params?: any) => {
    console.log('[createAndGenerateBlock] 开始创建块:', { type, content, params });
    
    // 在画布中心创建新块
    const centerX = -pan.x / zoom + (window.innerWidth * 0.7) / (2 * zoom); // 考虑侧边栏宽度
    const centerY = -pan.y / zoom + window.innerHeight / (2 * zoom);

    const newBlock = addBlock(type, '', centerX, centerY);
    console.log('[createAndGenerateBlock] 块已创建:', newBlock);
    
    // 播报实际创建的模块编号
    if (newBlock) {
      const moduleTypeText = lang === 'zh' 
        ? (type === 'text' ? '文本' : type === 'image' ? '图片' : '视频')
        : (type === 'text' ? 'text' : type === 'image' ? 'image' : 'video');
      
      const numberAnnouncement = lang === 'zh'
        ? `已创建${moduleTypeText}模块${newBlock.number}`
        : `Created ${moduleTypeText} module ${newBlock.number}`;
      
      // 通过语音消息更新播报编号
      setVoiceMessages(prev => [...prev, {
        id: `module-created-${Date.now()}`,
        role: 'assistant',
        content: numberAnnouncement,
        type: 'system',
        timestamp: Date.now()
      }]);
    }
    
    // 等待块创建完成后生成内容
    setTimeout(async () => {
      if (newBlock) {
        console.log('[createAndGenerateBlock] 开始生成内容:', { blockId: newBlock.id, content });
        await handleGenerate(newBlock.id, content);
      } else {
        console.error('[createAndGenerateBlock] 新块创建失败');
      }
    }, 100);
  };

  const handleSelectAll = () => {
    const allIds = blocks.map(block => block.id);
    setSelectedIds(allIds);
    showSuccess('全选完成', `已选中所有 ${allIds.length} 个模块`);
  };

  // 手势命令处理函数
  const handleGestureCommand = (gestureInput: string | any) => {
    // 处理不同类型的输入参数
    const gesture = typeof gestureInput === 'string' ? gestureInput : gestureInput.gesture;
    
    console.log('[App] 收到手势命令:', gesture);
    
    // 验证手势类型
    const validGestures = ['zoom_in', 'zoom_out', 'move_up', 'move_down', 'move_left', 'move_right', 'reset_view', 'clear_canvas', 'auto_layout', 'select_all'];
    if (!validGestures.includes(gesture)) {
      console.warn('[App] 无效的手势类型:', gesture);
      return;
    }
    
    // 更新手势识别器的画布状态
    simpleGestureRecognizer.updateCanvasState({
      blockCount: blocks.length,
      selectedCount: selectedIds.length,
      hasContent: blocks.some(b => b.content && b.content.trim()),
      zoomLevel: zoom,
      panPosition: pan
    });

    console.log('[App] 开始执行手势命令:', gesture);

    try {
      switch (gesture) {
        case 'zoom_in':
          console.log('[App] 执行放大操作');
          setZoom(prev => Math.min(prev * 1.2, MAX_ZOOM));
          break;
        case 'zoom_out':
          console.log('[App] 执行缩小操作');
          setZoom(prev => Math.max(prev / 1.2, MIN_ZOOM));
          break;
        case 'move_up':
          console.log('[App] 执行上移操作');
          setPan(prev => ({ ...prev, y: prev.y + 50 }));
          break;
        case 'move_down':
          console.log('[App] 执行下移操作');
          setPan(prev => ({ ...prev, y: prev.y - 50 }));
          break;
        case 'move_left':
          console.log('[App] 执行左移操作');
          setPan(prev => ({ ...prev, x: prev.x + 50 }));
          break;
        case 'move_right':
          console.log('[App] 执行右移操作');
          setPan(prev => ({ ...prev, x: prev.x - 50 }));
          break;
        case 'reset_view':
          console.log('[App] 执行重置视角操作');
          handleCanvasReset();
          break;
        case 'clear_canvas':
          console.log('[App] 执行清空画布操作');
          handleCanvasClear();
          break;
        case 'auto_layout':
          console.log('[App] 执行自动布局操作');
          handleAutoLayout();
          break;
        case 'select_all':
          console.log('[App] 执行全选操作');
          handleSelectAll();
          break;
        default:
          console.log('[App] 未知手势:', gesture);
      }
      
      console.log('[App] 手势命令执行完成:', gesture);
    } catch (error) {
      console.error('[App] 手势命令执行失败:', gesture, error);
    }
  };

  // 投射语音生成内容到画布
  const handleProjectVoiceContentToCanvas = (content: string, type: 'text' | 'image' | 'video') => {
    console.log('投射语音内容到画布:', { content, type });
    
    // 在画布中心创建新块
    const centerX = -pan.x / zoom + (window.innerWidth * 0.7) / (2 * zoom); // 考虑侧边栏宽度
    const centerY = -pan.y / zoom + window.innerHeight / (2 * zoom);

    const newBlock = addBlock(type, content, centerX, centerY);
    
    console.log('语音内容已投射到画布:', newBlock);
  };

  // 画布语音指令处理函数
  const handleCanvasVoiceCommand = async (voiceCommand: any) => {
    console.log('收到画布语音指令:', voiceCommand);
    
    try {
      switch (voiceCommand.command) {
        case 'generate_text':
          await createAndGenerateBlock('text', voiceCommand.content);
          break;
        case 'generate_image':
          await createAndGenerateBlock('image', voiceCommand.content, voiceCommand.params);
          break;
        case 'generate_video':
          await createAndGenerateBlock('video', voiceCommand.content, voiceCommand.params);
          break;
        case 'add_to_canvas':
          // 将内容添加到画布
          setSidebarInput(voiceCommand.content);
          break;
        default:
          console.log('未识别的语音指令:', voiceCommand.command);
      }
    } catch (error) {
      console.error('执行语音指令失败:', error);
    }
  };

  // 模块操作处理函数
  const handleModuleAction = async (action: string, moduleId?: string, params?: any) => {
    console.log('[App] 执行模块操作:', { action, moduleId, params });
    
    try {
      switch (action) {
        case 'select':
          if (moduleId) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              setSelectedIds([targetBlock.id]);
              showSuccess('模块已选择', `已选择模块 ${moduleId}`);
            }
          }
          break;
          
        case 'delete':
          if (moduleId) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              setBlocks(prev => prev.filter(b => b.id !== targetBlock.id));
              setSelectedIds(prev => prev.filter(id => id !== targetBlock.id));
              showSuccess('模块已删除', `已删除模块 ${moduleId}`);
            }
          }
          break;
          
        case 'generate':
          if (moduleId && params?.content) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              await handleGenerate(targetBlock.id, params.content);
              showSuccess('开始生成', `正在为模块 ${moduleId} 生成内容`);
            }
          }
          break;

        case 'edit':
          if (moduleId && params?.content) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              // 直接设置模块内容，不调用AI生成
              setBlocks(prev => prev.map(b => 
                b.id === targetBlock.id 
                  ? { ...b, content: params.content, status: 'idle' }
                  : b
              ));
              showSuccess('内容已输入', `已为模块 ${moduleId} 输入内容："${params.content}"`);
            }
          }
          break;

        case 'regenerate':
          if (moduleId) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock && targetBlock.originalPrompt) {
              await handleGenerate(targetBlock.id, targetBlock.originalPrompt);
              showSuccess('开始重新生成', `正在重新生成模块 ${moduleId}`);
            } else if (targetBlock) {
              showError('无法重新生成', `模块 ${moduleId} 没有原始提示词`);
            }
          }
          break;

        case 'modify_prompt':
          if (moduleId && params?.promptModification) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              // 构建新的提示词
              const originalPrompt = targetBlock.originalPrompt || '';
              const newPrompt = originalPrompt 
                ? `${originalPrompt}，${params.promptModification}`
                : params.promptModification;
              
              // 更新块的原始提示词
              setBlocks(prev => prev.map(b => 
                b.id === targetBlock.id 
                  ? { ...b, originalPrompt: newPrompt }
                  : b
              ));
              
              // 使用新提示词重新生成
              await handleGenerate(targetBlock.id, newPrompt);
              showSuccess('提示词已修改', `已为模块 ${moduleId} 添加："${params.promptModification}"`);
            }
          }
          break;
          
        case 'move':
          if (moduleId && params?.direction) {
            const targetBlock = blocks.find(b => b.number === moduleId);
            if (targetBlock) {
              const moveDistance = 100; // 移动距离
              let newX = targetBlock.x;
              let newY = targetBlock.y;
              
              switch (params.direction) {
                case 'up':
                  newY -= moveDistance;
                  break;
                case 'down':
                  newY += moveDistance;
                  break;
                case 'left':
                  newX -= moveDistance;
                  break;
                case 'right':
                  newX += moveDistance;
                  break;
              }
              
              setBlocks(prev => prev.map(b => 
                b.id === targetBlock.id 
                  ? { ...b, x: newX, y: newY }
                  : b
              ));
              
              showSuccess('模块已移动', `模块 ${moduleId} 已向${params.direction}移动`);
            }
          }
          break;
          
        case 'connect':
          if (moduleId && params?.connectTo) {
            const fromBlock = blocks.find(b => b.number === moduleId);
            const toBlock = blocks.find(b => b.number === params.connectTo);
            
            if (fromBlock && toBlock) {
              const newConnection = {
                id: crypto.randomUUID(),
                fromId: fromBlock.id,
                toId: toBlock.id,
                instruction: ''
              };
              
              setConnections(prev => [...prev, newConnection]);
              showSuccess('模块已连接', `已将模块 ${moduleId} 连接到 ${params.connectTo}`);
            }
          }
          break;
          
        case 'copy':
          if (moduleId) {
            const targetBlock = blocks.find(b => b.number === moduleId || b.number === moduleId.replace('_COPY', ''));
            if (targetBlock) {
              const newBlock = {
                ...targetBlock,
                id: crypto.randomUUID(),
                x: targetBlock.x + 50,
                y: targetBlock.y + 50,
                number: getNextBlockNumber(targetBlock.type),
                content: '', // 清空内容，避免重复
                status: 'idle' // 重置状态
              };
              
              setBlocks(prev => [...prev, newBlock]);
              showSuccess('模块已复制', `已复制模块 ${moduleId} 为 ${newBlock.number}`);
            }
          }
          break;
          
        default:
          console.log('未支持的模块操作:', action);
      }
    } catch (error) {
      console.error('模块操作失败:', error);
      showError('操作失败', `执行模块操作时出现错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 获取下一个块编号的辅助函数
  const getNextBlockNumber = (type: 'text' | 'image' | 'video'): string => {
    const prefix = type === 'text' ? 'A' : type === 'image' ? 'B' : 'V';
    
    // 使用更可靠的编号生成方法，避免重复
    const sameTypeBlocks = blocks.filter(b => b.type === type);
    const existingNumbers = sameTypeBlocks.map(b => {
      const match = b.number.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    
    // 找到下一个可用的编号
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    return `${prefix}${String(nextNumber).padStart(2, '0')}`;
  };
  
  // Voice Recording Functions - 常驻语音转文字功能
  const toggleVoiceRecording = () => {
    // 检查当前是否在聊天标签页
    if (sidebarTab !== 'chat') {
      const message = lang === 'zh' 
        ? '请先切换到"聊天"标签页才能使用语音转文字功能' 
        : 'Please switch to "Chat" tab to use voice-to-text feature';
      alert(message);
      return;
    }

    // 检查曹操语音控制是否激活
    if (isCanvasVoiceActive) {
      const message = lang === 'zh' 
        ? '曹操语音控制正在使用中，请先关闭曹操语音控制' 
        : 'Caocao voice control is active, please disable it first';
      alert(message);
      return;
    }

    if (!recognition) {
      const message = lang === 'zh' 
        ? '您的浏览器不支持语音输入功能，建议使用Chrome或Edge浏览器' 
        : 'Your browser does not support voice input. Please use Chrome or Edge browser';
      alert(message);
      return;
    }
    
    if (isVoiceRecording) {
      // 手动停止录音
      console.log('[语音识别] 用户手动停止录音');
      
      // 清除定时器
      if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        setVoiceTimeout(null);
      }
      
      recognition.stop();
      setIsVoiceRecording(false);
      
      // 如果有输入内容，立即提交
      if (sidebarInput.trim() && wasVoiceInput) {
        setTimeout(() => {
          handleSidebarSend();
        }, 100);
      }
    } else {
      // 开始录音
      try {
        console.log('[语音识别] 开始常驻语音监听');
        recognition.start();
        setIsVoiceRecording(true);
      } catch (error) {
        console.error('语音识别启动失败:', error);
        const message = lang === 'zh' 
          ? '语音识别启动失败，请检查麦克风权限' 
          : 'Failed to start voice recognition. Please check microphone permissions';
        alert(message);
      }
    }
  };

  // 播放文本转语音功能
  const playTextToSpeech = (text: string) => {
    // 使用新的语音设置服务
    voiceSettingsService.speak(text);
    setWasVoiceInput(false); // 重置语音输入状态
  };

  // Load saved config from localStorage
  useEffect(() => {
    // 使用 ConfigPersistence 加载配置
    const loadedConfig = ConfigPersistence.loadNewConfig();
    
    if (loadedConfig) {
      // 验证配置
      const validation = ConfigValidator.validateNewModelConfig(loadedConfig);
      if (!validation.valid) {
        console.warn('[App] Loaded configuration has issues:', validation.issues);
        // 显示警告但仍然使用配置
      }
      setModelConfig(loadedConfig);
      console.log('[App] ✓ Configuration loaded successfully');
    } else {
      console.log('[App] No saved configuration found, using defaults');
    }
    
    // 加载用户模型偏好设置
    import('./utils/ModelPreferencesStorage').then(({ ModelPreferencesStorage }) => {
      const preferences = ModelPreferencesStorage.getPreferences();
      console.log('[App] ✓ User model preferences loaded:', preferences);
      
      // 更新模型配置以反映用户偏好
      setModelConfig(prev => ({
        ...prev,
        image: { ...prev.image, modelId: preferences.defaultImageModel },
        video: { ...prev.video, modelId: preferences.defaultVideoModel },
        text: { ...prev.text, modelId: preferences.defaultTextModel }
      }));
      
      // 更新选中的文本模型
      setSelectedTextModel(preferences.defaultTextModel);
    }).catch(error => {
      console.warn('[App] Failed to load user preferences:', error);
    });
    
    // Initialize preset prompts
    const { prompts, selectedIndex } = loadPresetPrompts();
    setPresetPrompts(prompts);
    setSelectedPromptIndex(selectedIndex);
    
    const init = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
      }
    };
    init();

    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Auto-save modelConfig to localStorage whenever it changes
  useEffect(() => {
    if (modelConfig) {
      ConfigPersistence.saveNewConfig(modelConfig);
    }
  }, [modelConfig]);

  // Monitor batch processing state
  useEffect(() => {
    if (!batchState) {
      setIsProgressMinimized(false);
      return;
    }

    // Set up progress monitoring
    const interval = setInterval(() => {
      const currentState = batchProcessor.getProcessingStatus();
      setBatchState(currentState);
      
      // Auto-cleanup when processing completes
      if (currentState?.status === 'completed' || currentState?.status === 'stopped') {
        setTimeout(() => {
          setBatchState(undefined);
          setIsProgressMinimized(false);
        }, 3000); // Show completion for 3 seconds
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [batchState, batchProcessor]);

  // 设置token更新回调
  useEffect(() => {
    // 为AI服务适配器设置token更新回调
    const updateTokenConsumption = (amount: number, type: 'text' | 'image' | 'video') => {
      updateConsumption(amount, type);
    };
    
    if (aiServiceAdapter && typeof aiServiceAdapter.setTokenUpdateCallback === 'function') {
      aiServiceAdapter.setTokenUpdateCallback(updateTokenConsumption);
    }
  }, [aiServiceAdapter, updateConsumption]);

  // 加载角色列表到blocks
  useEffect(() => {
    if (!isCharacterPanelOpen) {
      // 当角色面板关闭时，重新加载所有角色到blocks中
      const allCharacters = characterService.getAllCharacters().filter(c => c.status === 'ready');
      setBlocks(prevBlocks => 
        prevBlocks.map(block => ({
          ...block,
          availableCharacters: allCharacters
        }))
      );
    }
  }, [isCharacterPanelOpen]);

  // 初始化自动化模板库
  useEffect(() => {
    const initTemplates = async () => {
      try {
        // 定义自动化模板数据
        const automationTemplates = [
          {
            "name": "文本转单图（画布显示）",
            "description": "从文本提示生成单张图片，结果显示在画布上。适合简单的图像生成任务。",
            "canvasState": {
              "blocks": [
                {
                  "id": "text_prompt_block",
                  "type": "text",
                  "x": 100,
                  "y": 100,
                  "width": 300,
                  "height": 150,
                  "content": "一只可爱的柴犬在草地上奔跑，阳光明媚，高清细节",
                  "status": "idle",
                  "number": "A01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "生成一只可爱的柴犬图片"
                },
                {
                  "id": "image_output_block",
                  "type": "image",
                  "x": 500,
                  "y": 100,
                  "width": 400,
                  "height": 400,
                  "content": "",
                  "status": "idle",
                  "number": "B01",
                  "aspectRatio": "1:1",
                  "originalPrompt": ""
                }
              ],
              "connections": [
                {
                  "id": "text_to_image_conn",
                  "fromId": "text_prompt_block",
                  "toId": "image_output_block",
                  "instruction": "根据文本提示生成图片",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          },
          {
            "name": "文本转多图（网格布局）",
            "description": "从文本提示生成多张图片，结果以网格布局显示在画布上。适合需要生成多个变体的场景。",
            "canvasState": {
              "blocks": [
                {
                  "id": "text_prompt_multi",
                  "type": "text",
                  "x": 100,
                  "y": 100,
                  "width": 300,
                  "height": 150,
                  "content": "不同风格的城市夜景，高清细节，4K分辨率",
                  "status": "idle",
                  "number": "A01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "生成不同风格的城市夜景"
                },
                {
                  "id": "image_output_multi",
                  "type": "image",
                  "x": 500,
                  "y": 100,
                  "width": 300,
                  "height": 300,
                  "content": "",
                  "status": "idle",
                  "number": "B01",
                  "aspectRatio": "16:9",
                  "originalPrompt": "",
                  "multiImageGroupId": "multi_images_1",
                  "multiImageIndex": 0,
                  "isMultiImageSource": true
                }
              ],
              "connections": [
                {
                  "id": "multi_image_conn",
                  "fromId": "text_prompt_multi",
                  "toId": "image_output_multi",
                  "instruction": "根据文本提示生成4张不同风格的图片",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          },
          {
            "name": "文本转图像（自动下载）",
            "description": "从文本提示生成图片，并自动下载到指定路径。适合批量生成图片的场景。",
            "canvasState": {
              "blocks": [
                {
                  "id": "text_prompt_download",
                  "type": "text",
                  "x": 100,
                  "y": 100,
                  "width": 350,
                  "height": 200,
                  "content": "未来科技感城市，飞行汽车，霓虹灯光，高清4K",
                  "status": "idle",
                  "number": "A01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "生成未来科技感城市图片"
                },
                {
                  "id": "image_output_download",
                  "type": "image",
                  "x": 550,
                  "y": 100,
                  "width": 450,
                  "height": 250,
                  "content": "",
                  "status": "idle",
                  "number": "B01",
                  "aspectRatio": "16:9",
                  "originalPrompt": ""
                }
              ],
              "connections": [
                {
                  "id": "download_conn",
                  "fromId": "text_prompt_download",
                  "toId": "image_output_download",
                  "instruction": "根据文本提示生成高清图片",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          },
          {
            "name": "图像编辑（带提示词）",
            "description": "上传图片，然后使用提示词进行编辑，结果显示在画布上。适合图像增强和修改任务。",
            "canvasState": {
              "blocks": [
                {
                  "id": "input_image_block",
                  "type": "image",
                  "x": 100,
                  "y": 100,
                  "width": 400,
                  "height": 300,
                  "content": "",
                  "status": "idle",
                  "number": "A01",
                  "aspectRatio": "4:3",
                  "originalPrompt": "上传需要编辑的图片"
                },
                {
                  "id": "edit_prompt_block",
                  "type": "text",
                  "x": 100,
                  "y": 500,
                  "width": 300,
                  "height": 120,
                  "content": "将图片转换为水彩画风格，增加艺术感",
                  "status": "idle",
                  "number": "B01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "图片编辑提示词"
                },
                {
                  "id": "edited_output_block",
                  "type": "image",
                  "x": 600,
                  "y": 100,
                  "width": 400,
                  "height": 300,
                  "content": "",
                  "status": "idle",
                  "number": "C01",
                  "aspectRatio": "4:3",
                  "originalPrompt": ""
                }
              ],
              "connections": [
                {
                  "id": "image_to_edit_conn",
                  "fromId": "input_image_block",
                  "toId": "edited_output_block",
                  "instruction": "使用上传的图片作为编辑源",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "image",
                    "lastData": ""
                  }
                },
                {
                  "id": "edit_prompt_to_image_conn",
                  "fromId": "edit_prompt_block",
                  "toId": "edited_output_block",
                  "instruction": "应用编辑提示词",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          },
          {
            "name": "文本链式生成（最终图像）",
            "description": "先从创意生成详细大纲，再根据大纲生成图像。适合需要结构化内容生成的场景。",
            "canvasState": {
              "blocks": [
                {
                  "id": "story_idea_block",
                  "type": "text",
                  "x": 100,
                  "y": 100,
                  "width": 300,
                  "height": 180,
                  "content": "科幻冒险故事：宇航员在未知星球发现神秘文明遗迹",
                  "status": "idle",
                  "number": "A01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "科幻冒险故事创意"
                },
                {
                  "id": "story_outline_block",
                  "type": "text",
                  "x": 100,
                  "y": 350,
                  "width": 350,
                  "height": 200,
                  "content": "",
                  "status": "idle",
                  "number": "B01",
                  "fontSize": 12,
                  "textColor": "#333333",
                  "originalPrompt": ""
                },
                {
                  "id": "story_image_block",
                  "type": "image",
                  "x": 550,
                  "y": 100,
                  "width": 450,
                  "height": 300,
                  "content": "",
                  "status": "idle",
                  "number": "C01",
                  "aspectRatio": "16:9",
                  "originalPrompt": ""
                }
              ],
              "connections": [
                {
                  "id": "idea_to_outline_conn",
                  "fromId": "story_idea_block",
                  "toId": "story_outline_block",
                  "instruction": "根据故事创意生成详细大纲",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                },
                {
                  "id": "outline_to_image_conn",
                  "fromId": "story_outline_block",
                  "toId": "story_image_block",
                  "instruction": "根据故事大纲生成场景图像",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          },
          {
            "name": "多模块拼接（含视频）",
            "description": "文本生成故事大纲，图像生成封面图，最终生成视频。这是唯一包含视频的模板。",
            "canvasState": {
              "blocks": [
                {
                  "id": "story_idea_block",
                  "type": "text",
                  "x": 100,
                  "y": 100,
                  "width": 300,
                  "height": 180,
                  "content": "科幻冒险故事：宇航员在未知星球发现神秘文明遗迹",
                  "status": "idle",
                  "number": "A01",
                  "fontSize": 14,
                  "textColor": "#333333",
                  "originalPrompt": "科幻冒险故事创意"
                },
                {
                  "id": "story_outline_block",
                  "type": "text",
                  "x": 100,
                  "y": 350,
                  "width": 350,
                  "height": 200,
                  "content": "",
                  "status": "idle",
                  "number": "B01",
                  "fontSize": 12,
                  "textColor": "#333333",
                  "originalPrompt": ""
                },
                {
                  "id": "cover_image_block",
                  "type": "image",
                  "x": 550,
                  "y": 100,
                  "width": 400,
                  "height": 400,
                  "content": "",
                  "status": "idle",
                  "number": "C01",
                  "aspectRatio": "1:1",
                  "originalPrompt": ""
                },
                {
                  "id": "video_output_block",
                  "type": "video",
                  "x": 1050,
                  "y": 100,
                  "width": 500,
                  "height": 300,
                  "content": "",
                  "status": "idle",
                  "number": "D01",
                  "aspectRatio": "16:9",
                  "duration": "15",
                  "originalPrompt": ""
                }
              ],
              "connections": [
                {
                  "id": "idea_to_outline_conn",
                  "fromId": "story_idea_block",
                  "toId": "story_outline_block",
                  "instruction": "根据故事创意生成详细大纲",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                },
                {
                  "id": "outline_to_cover_conn",
                  "fromId": "story_outline_block",
                  "toId": "cover_image_block",
                  "instruction": "根据故事大纲生成封面图片",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                },
                {
                  "id": "outline_to_video_conn",
                  "fromId": "story_outline_block",
                  "toId": "video_output_block",
                  "instruction": "根据故事大纲生成视频",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "text",
                    "lastData": ""
                  }
                },
                {
                  "id": "cover_to_video_conn",
                  "fromId": "cover_image_block",
                  "toId": "video_output_block",
                  "instruction": "使用封面图片作为视频的参考图像",
                  "dataFlow": {
                    "enabled": true,
                    "lastUpdate": 0,
                    "dataType": "image",
                    "lastData": ""
                  }
                }
              ],
              "settings": {
                "zoom": 1,
                "pan": { "x": 0, "y": 0 }
              }
            },
            "isAutomation": true
          }
        ];

        // 获取现有模板列表
        const existingTemplates = await templateManager.listTemplates();
        const existingTemplateNames = new Set(existingTemplates.map(t => t.name));

        // 导入新模板（避免重复）
        let importedCount = 0;
        for (const templateData of automationTemplates) {
          if (!existingTemplateNames.has(templateData.name)) {
            await templateManager.saveTemplate(
              templateData.canvasState,
              templateData.name,
              templateData.description,
              templateData.isAutomation
            );
            importedCount++;
          }
        }

        if (importedCount > 0) {
          console.log(`[Template Initialization] ✓ Imported ${importedCount} new automation templates`);
        } else {
          console.log(`[Template Initialization] ✓ All automation templates already exist`);
        }
      } catch (error) {
        console.error('[Template Initialization] Failed to initialize templates:', error);
      }
    };

    initTemplates();
  }, []);

  const saveMasterConfig = () => {
    try {
      // 验证配置
      const validation = ConfigValidator.validateNewModelConfig(modelConfig);
      
      if (!validation.valid) {
        // 收集所有错误
        const allErrors: string[] = [];
        Object.entries(validation.issues).forEach(([provider, issue]) => {
          if (issue && issue.errors && issue.errors.length > 0) {
            allErrors.push(`${provider}: ${issue.errors.join(', ')}`);
          }
        });
        
        if (allErrors.length > 0) {
          alert(`配置验证失败:\n${allErrors.join('\n')}`);
          return;
        }
      }

      // 保存配置
      ConfigPersistence.saveNewConfig(modelConfig);
      setShowConfig(false);
      console.log('[App] ✓ Configuration saved successfully');
    } catch (error) {
      console.error('[App] Failed to save configuration:', error);
      alert('配置保存失败，请重试');
    }
  };

  // Task 5: Canvas feature handlers
  const handleCanvasReset = () => {
    // 重置画布视角到默认状态
    setZoom(1.0);
    setPan({ x: 200, y: 100 });
    showSuccess('视角重置', '画布视角已重置到默认状态');
  };

  const handleCanvasClear = () => {
    // 显示确认对话框
    setConfirmDialog({
      isOpen: true,
      title: '清空画布',
      message: '确定要清空画布吗？这将删除所有模块，此操作不可撤销。',
      type: 'danger',
      onConfirm: () => {
        setBlocks([]);
        setConnections([]);
        setSelectedIds([]);
        showSuccess('画布清空', '所有模块已被清除');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAutoLayout = () => {
    autoLayout(); // 使用现有的自动布局函数
    showSuccess('自动布局', '模块布局已优化完成');
  };

  const handleCanvasCopy = () => {
    if (selectedIds.length === 0) {
      showInfo('复制提示', '请先选择要复制的模块');
      return;
    }

    const selectedBlocks = blocks.filter(block => selectedIds.includes(block.id));
    const newBlocks: Block[] = [];
    const idMapping: { [oldId: string]: string } = {};

    // 复制选中的块
    selectedBlocks.forEach(block => {
      const newId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMapping[block.id] = newId;
      
      const newBlock: Block = {
        ...block,
        id: newId,
        x: block.x + 50, // 偏移位置
        y: block.y + 50,
        number: `${block.number}_copy`
      };
      newBlocks.push(newBlock);
    });

    // 复制相关的连接
    const newConnections: Connection[] = [];
    connections.forEach(conn => {
      if (idMapping[conn.fromId] && idMapping[conn.toId]) {
        const newConnection: Connection = {
          ...conn,
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromId: idMapping[conn.fromId],
          toId: idMapping[conn.toId]
        };
        newConnections.push(newConnection);
      }
    });

    // 更新状态
    setBlocks(prev => [...prev, ...newBlocks]);
    setConnections(prev => [...prev, ...newConnections]);
    setSelectedIds(newBlocks.map(block => block.id));
    
    showSuccess('复制完成', `成功复制了 ${newBlocks.length} 个模块`);
  };

  const autoLayout = () => {
    if (blocks.length === 0) return;
    
    const MARGIN_X = 600;
    const MARGIN_Y = 500;
    const START_X = 1000;
    const START_Y = 800;
    const COLS = 3;

    const sortedBlocks = [...blocks].sort((a, b) => a.number.localeCompare(b.number));
    
    const newBlocks = sortedBlocks.map((block, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      return {
        ...block,
        x: START_X + col * MARGIN_X,
        y: START_Y + row * MARGIN_Y
      };
    });
    
    setBlocks(newBlocks);
  };

  // 解析提示词中的引用，返回解析信息
  const resolvePromptReferences = (prompt: string, currentBlockId: string): {
    original: string;
    resolved: string;
    references: Array<{ blockNumber: string; content: string; found: boolean; type: string }>;
  } => {
    const idMatches = prompt.match(/\[([A-Z]\d+)\]/g) || [];
    const uniqueIds = Array.from(new Set(idMatches.map(m => m.replace(/[\[\]]/g, ''))));
    
    let resolved = prompt;
    const references: Array<{ blockNumber: string; content: string; found: boolean; type: string }> = [];
    
    uniqueIds.forEach(num => {
      const refBlock = blocks.find(b => b.number === num);
      if (refBlock) {
        if (refBlock.type === 'text' && refBlock.content && refBlock.content.trim()) {
          resolved = resolved.replace(new RegExp(`\\[${num}\\]`, 'g'), refBlock.content);
          references.push({
            blockNumber: num,
            content: refBlock.content,
            found: true,
            type: refBlock.type
          });
        } else if (refBlock.type === 'image' && refBlock.content) {
          references.push({
            blockNumber: num,
            content: '(图片引用)',
            found: true,
            type: refBlock.type
          });
        } else {
          references.push({
            blockNumber: num,
            content: '',
            found: false,
            type: refBlock.type
          });
        }
      } else {
        references.push({
          blockNumber: num,
          content: '',
          found: false,
          type: 'unknown'
        });
      }
    });
    
    return {
      original: prompt,
      resolved,
      references
    };
  };

  const handleGenerate = async (blockId: string, prompt: string) => {
    // 检查token限制
    if (!checkTokenLimit()) {
      showTokenLimitModal();
      return;
    }

    // 使用useState的函数形式更新状态，确保每次都能访问到最新的blocks状态
    let block = blocks.find(b => b.id === blockId);
    let retryCount = 0;
    
    // 改进的重试逻辑，直接在循环中更新block引用，而不是依赖外部blocks状态
    while (!block && retryCount < 5) {
      console.log(`[handleGenerate] Block ${blockId} not found, retrying... (${retryCount + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      // 重新获取最新的blocks状态
      block = blocks.find(b => b.id === blockId);
      retryCount++;
    }
    
    if (!block) {
      console.error(`[handleGenerate] Block ${blockId} not found after 5 retries`);
      return;
    }
    
    // 将新配置转换为旧格式以兼容现有代码
    const legacyConfig = convertNewToLegacyConfig(modelConfig);
    
    // 立即更新块状态为processing
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'processing' } : b));
    
    try {
      // 使用函数形式获取最新的blocks状态，避免闭包捕获旧状态
      const getCurrentBlocks = () => {
        return blocks;
      };
      
      const parts: any[] = [];
      const idMatches = prompt.match(/\[([A-Z]\d+)\]/g) || [];
      const uniqueIds = Array.from(new Set(idMatches.map(m => m.replace(/[\[\]]/g, ''))));
      
      console.log(`[handleGenerate] Block ${block.number} (${block.type})`);
      console.log(`[handleGenerate] Original prompt:`, prompt);
      console.log(`[handleGenerate] Found ${uniqueIds.length} unique references:`, uniqueIds);
      
      // 收集所有引用的内容并解析提示词
      const upstreamTextContent: string[] = [];
      const imageReferences: string[] = [];
      const missingReferences: string[] = [];
      let resolvedPrompt = prompt; // 解析后的提示词
      
      // 按照引用顺序处理（保持一致性）
      uniqueIds.forEach(num => {
        // 每次获取最新的blocks状态，确保能找到最新添加的块
        const currentBlocks = getCurrentBlocks();
        const refBlock = currentBlocks.find(b => b.number === num);
        
        if (!refBlock) {
          // 引用的模块不存在
          missingReferences.push(num);
          console.warn(`[handleGenerate] Reference [${num}] not found`);
          return;
        }
        
        if (!refBlock.content || !refBlock.content.trim()) {
          // 引用的模块内容为空 - 这是一个严重问题，应该阻止生成
          missingReferences.push(num);
          console.warn(`[handleGenerate] Reference [${num}] has empty content - this will cause automation issues`);
          return;
        }
        
        if (refBlock.type === 'text') {
          // 文本引用：替换到提示词中
          upstreamTextContent.push(refBlock.content);
          resolvedPrompt = resolvedPrompt.replace(
            new RegExp(`\\[${num}\\]`, 'g'), 
            refBlock.content
          );
          console.log(`[handleGenerate] Text reference [${num}] resolved:`, refBlock.content.substring(0, 50) + '...');
          
        } else if (refBlock.type === 'image') {
          // 图片引用：添加到parts数组
          try {
            const base64Data = refBlock.content.split(',')[1];
            const mimeType = refBlock.content.split(';')[0].split(':')[1];
            parts.push({ 
              inlineData: { 
                data: base64Data, 
                mimeType: mimeType 
              } 
            });
            imageReferences.push(num);
            console.log(`[handleGenerate] Image reference [${num}] added to parts (${mimeType})`);
          } catch (error) {
            console.error(`[handleGenerate] Failed to process image reference [${num}]:`, error);
            missingReferences.push(num);
          }
        }
      });
      
      // 输出统计信息
      console.log(`[handleGenerate] Resolution summary:`);
      console.log(`  - Text references: ${upstreamTextContent.length}`);
      console.log(`  - Image references: ${imageReferences.length}`);
      console.log(`  - Missing/empty references: ${missingReferences.length}`);
      console.log(`[handleGenerate] Resolved prompt:`, resolvedPrompt);
      
      // 如果有缺失的引用，警告用户并阻止生成
      if (missingReferences.length > 0) {
        const warningMessage = lang === 'zh' 
          ? `❌ 错误：以下引用的模块不存在或内容为空：${missingReferences.map(r => `[${r}]`).join(', ')}\n\n⚠️ 空内容的模块引用会导致自动化流程出现问题！\n\n💡 解决方案：\n1. 先为被引用的模块生成内容\n2. 或者移除对空模块的引用\n3. 确保所有引用的模块都有实际内容`
          : `❌ Error: The following referenced modules are missing or have empty content: ${missingReferences.map(r => `[${r}]`).join(', ')}\n\n⚠️ Empty module references will cause automation workflow issues!\n\n💡 Solutions:\n1. Generate content for referenced modules first\n2. Remove references to empty modules\n3. Ensure all referenced modules have actual content`;
        
        alert(warningMessage);
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'idle' } : b));
        return;
      }
      
      // 合并所有文本内容用于token计算
      let combinedText = resolvedPrompt;
      
      // Token检查和处理
      const MAX_TOKENS = 30000; // 留一些缓冲，避免接近32768限制
      const tokenCount = TokenCalculator.calculateTextTokens(combinedText, {
        provider: legacyConfig.text.provider
      });
      
      if (tokenCount > MAX_TOKENS) {
        // 提示用户选择处理方式
        const userChoice = confirm(
          `提示：当前提示词的Token数量为${tokenCount}，超过${MAX_TOKENS}的限制\n\n` +
          `确定 → AI智能精简：自动缩短提示词，保持核心意思\n` +
          `取消 → 手动调整：请修改前面的文本模块或提示词，减少总内容量\n\n` +
          `建议：如果希望精确控制内容，请选择手动调整；如追求效率，选择AI精简`
        );
        
        if (userChoice) {
          // 用户选择使用AI精简功能
          try {
            // 调用AI服务进行文本缩减
            const condensedPrompt = await aiServiceAdapter.generateText(
              `角色：专业AI提示词优化专家\n任务：将用户提示词缩减到指定长度，同时保留核心意思和关键信息\n规则：\n1.保留所有关键信息点和指令\n2.删除冗余描述和重复内容\n3.保持语言简洁明了\n4.确保缩减后的内容可以正常用于AI生成任务\n5.不改变原文的核心意图\n\n原始内容：\n${combinedText}`,
              legacyConfig.text
            );
            
            // 再次检查token数
            const condensedTokenCount = TokenCalculator.calculateTextTokens(condensedPrompt, {
              provider: legacyConfig.text.provider
            });
            
            if (condensedTokenCount <= MAX_TOKENS) {
              resolvedPrompt = condensedPrompt;
              console.log(`[AI精简] 成功将Token从${tokenCount}缩减到${condensedTokenCount}`);
              alert(`提示词已通过AI智能精简功能成功缩短到${condensedTokenCount} Token！`);
            } else {
              // 如果AI缩减后仍过长，提示用户手动调整
              throw new Error('AI缩减后Token仍过长');
            }
          } catch (error) {
            console.error('[AI精简] 文本缩减失败:', error);
            // 出错时提示用户手动调整
            alert(`AI精简功能未能成功处理，请您手动调整前面的模块内容或提示词后重试！`);
            return;
          }
        } else {
          // 用户选择手动调整，取消当前操作
          return;
        }
      }
      
      // 处理不同类型的生成请求
      let result = '';
      
      // 检查解析后的提示词是否为空
      if (!resolvedPrompt.trim()) {
        console.warn(`[handleGenerate] Empty prompt received for block ${block.number}, skipping AI generation`);
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'idle' } : b));
        return;
      }
      
      if (block.type === 'text') {
        // 文本模块：考虑提示词、引用内容和模块自身的附件内容
        // 附件内容自动与指令结合，不需要用户手动引用
        // 模块内显示的内容用于预览和传递给下游模块
        
        // 如果模块有附件内容，自动添加到parts中
        if (block.content && block.content.trim() && !block.content.startsWith('data:image/')) {
          parts.push({ text: `\nReference Material: ${block.content}` });
        }
        
        // 添加用户指令
        parts.push({ text: `\nUser Instruction: ${resolvedPrompt}` });
        result = await aiServiceAdapter.generateText({ parts }, legacyConfig.text);
      } else if (block.type === 'image') {
          // 图片模块：考虑提示词、引用内容和模块自身的附件内容
          // 附件内容自动与指令结合，不需要用户手动引用
          // 模块内显示的内容用于预览和传递给下游模块
          
          // 如果模块有原始参考图，使用原始参考图
          // 如果没有原始参考图，使用当前内容作为参考图
          let referenceImageContent = block.imageMetadata?.originalReferenceImage || block.content;
          
          // 如果有参考图，使用editImage方法，否则使用generateImage方法
          if (referenceImageContent && referenceImageContent.startsWith('data:image/')) {
            // 有参考图，使用editImage方法
            console.log('[handleGenerate] Using editImage method with reference image');
            result = await aiServiceAdapter.editImage(
              referenceImageContent, 
              resolvedPrompt,
              legacyConfig.image,
              {
                async: false, // 默认使用同步模式，可根据需要调整
                aspectRatio: block.aspectRatio || '16:9'
              }
            );
          } else {
            // 没有参考图，使用generateImage方法
            console.log('[handleGenerate] Using generateImage method without reference image');
            // 添加用户指令
            parts.push({ text: `\nUser Instruction: ${resolvedPrompt}` });
            result = await aiServiceAdapter.generateImage({
              parts,
              aspectRatio: block.aspectRatio || '16:9' // 传递图片比例参数
            }, legacyConfig.image);
          }
          
          // 处理异步响应
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.type === 'async_task' && parsedResult.task_id) {
              console.log(`[handleGenerate] Async image editing started. Task ID: ${parsedResult.task_id}`);
              // 可以在这里添加异步任务状态管理逻辑
              // 例如，存储task_id以便后续查询状态
              result = JSON.stringify({
                type: 'async_task',
                task_id: parsedResult.task_id,
                status: 'started',
                message: '图像编辑任务已开始，正在处理中...'
              });
            }
          } catch (e) {
            // 不是JSON格式，直接使用结果
            console.log('[handleGenerate] Received non-JSON result, treating as direct image content');
          }
        } else {
        // 视频生成：使用解析后的提示词
        const videoParts = [];
        // 添加用户指令
        videoParts.push({ text: `User Instruction: ${resolvedPrompt}` });
        // 添加所有图片引用
        parts.forEach(part => {
          if (part.inlineData) {
            videoParts.push(part);
          }
        });
        
        // 添加角色客串参数和视频参数
        const videoContents: any = { parts: videoParts };
        if (block.characterUrl) {
          videoContents.characterUrl = block.characterUrl;
        }
        if (block.characterTimestamps) {
          videoContents.characterTimestamps = block.characterTimestamps;
        }
        
        // 重要：传递视频比例参数 - 确保从block中正确提取
        if (block.aspectRatio) {
          videoContents.aspectRatio = block.aspectRatio;
          console.log('[handleGenerate] Setting video aspectRatio from block:', block.aspectRatio);
        } else {
          // 如果block没有aspectRatio，使用默认值
          videoContents.aspectRatio = '16:9';
          console.log('[handleGenerate] Using default aspectRatio: 16:9');
        }
        
        // 传递视频时长参数
        if (block.duration) {
          videoContents.duration = typeof block.duration === 'string' ? parseInt(block.duration) : block.duration;
          console.log('[handleGenerate] Setting video duration from block:', videoContents.duration);
        } else {
          // 如果block没有duration，使用默认值
          videoContents.duration = 10;
          console.log('[handleGenerate] Using default duration: 10');
        }
        
        console.log('[handleGenerate] Final videoContents being passed to AIServiceAdapter:', {
          aspectRatio: videoContents.aspectRatio,
          duration: videoContents.duration,
          partsCount: videoContents.parts?.length || 0,
          hasCharacterUrl: !!videoContents.characterUrl,
          hasCharacterTimestamps: !!videoContents.characterTimestamps
        });
        
        result = await aiServiceAdapter.generateVideo(videoContents, legacyConfig.video);
      }
      
      // 更新块内容，并设置originalPrompt
      setBlocks(prev => prev.map(b => b.id === blockId ? {
        ...b, 
        content: result, 
        status: 'idle',
        originalPrompt: prompt // 设置originalPrompt为用户输入的原始提示词
      } : b));
    } catch (err) {
      console.error(err);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'error' } : b));
      
      // 显示错误提示
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('生成失败，请重试。');
      }
    }
  };

  const handleSidebarSend = async () => {
    // 检查token限制
    if (!checkTokenLimit()) {
      showTokenLimitModal();
      return;
    }

    // 保存语音输入状态，用于后续判断是否需要播放语音
    const shouldPlayVoice = wasVoiceInput;

    // 将新配置转换为旧格式以兼容现有代码
    const legacyConfig = convertNewToLegacyConfig(modelConfig);
    
    // 自动检测视频链接
    let detectedVideoUrl: string | null = null;
    let cleanedInput = sidebarInput;
    
    // 检测是否包含视频链接（支持常见视频平台）
    const urlRegex = /(https?:\/\/[^\s]+\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v))|https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|bilibili\.com|v\.qq\.com)[^\s]*/gi;
    const urlMatch = sidebarInput.match(urlRegex);
    
    if (urlMatch && urlMatch.length > 0 && chatMode === 'text' && modelCapabilityDetector.isVideoUploadEnabled(chatMode, legacyConfig)) {
      detectedVideoUrl = urlMatch[0];
      // 从输入中移除视频链接，保留其他文本作为提示词
      cleanedInput = sidebarInput.replace(urlMatch[0], '').trim();
      console.log('[Video URL Detection] Detected video URL:', detectedVideoUrl);
      console.log('[Video URL Detection] Cleaned input:', cleanedInput);
    }
    
    const finalVideoUrl = detectedVideoUrl || pendingVideoUrl;
    
    if (!cleanedInput.trim() && !pendingChatImage && !pendingChatFile && !pendingChatVideo && !finalVideoUrl) return;
    
    const inputText = cleanedInput;
    const currentMode = chatMode;
    const inputImage = pendingChatImage;
    const inputFile = pendingChatFile;
    const inputVideo = pendingChatVideo;
    const inputVideoUrl = finalVideoUrl;
    const selectedPresetPrompt = getSelectedPromptContent();

    setSidebarInput('');
    setPendingChatImage(null);
    setPendingChatFile(null);
    setPendingChatVideo(null);
    setPendingVideoUrl(null);

    // Compose final message with preset prompt if selected
    let finalMessage = inputText || "Generate from attachment";
    if (selectedPresetPrompt && selectedPresetPrompt.trim()) {
      finalMessage = `<system>
${selectedPresetPrompt}
</system>

<user>
${inputText || "Generate from attachment"}
</user>`;
    }

    // Add preset prompt indicator to user message
    let displayContent = inputText || "Generate from attachment";
    if (selectedPresetPrompt && selectedPresetPrompt.trim() && selectedPromptIndex !== null) {
      displayContent = `[P${selectedPromptIndex + 1}] ${displayContent}`;
    }

    const userMsg: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      type: 'text', 
      content: displayContent, // Show user input with preset prompt indicator
      attachmentName: inputFile?.name || (inputVideoUrl ? "Video URL" : undefined) || (inputVideo ? "Video" : undefined) || (inputImage ? "Image" : undefined),
      attachmentContent: inputFile?.content || inputVideoUrl || inputVideo || inputImage || undefined,
      timestamp: new Date().toLocaleTimeString() 
    };
    setMessages(prev => [...prev, userMsg]);
    
    const assistantMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', type: currentMode, content: '', timestamp: new Date().toLocaleTimeString(), isGenerating: true }]);
    
    // 语音播报生成开始状态（仅在语音输入时播放）
    if (shouldPlayVoice) {
      let startMessage = '';
      
      if (currentMode === 'text') {
        startMessage = lang === 'zh' ? '正在生成文本回复...' : 'Generating text response...';
      } else if (currentMode === 'image') {
        startMessage = lang === 'zh' ? '正在生成图片，请稍候...' : 'Generating image, please wait...';
      } else if (currentMode === 'video') {
        startMessage = lang === 'zh' ? '正在生成视频，请稍候...' : 'Generating video, please wait...';
      }
      
      if (startMessage) {
        playTextToSpeech(startMessage);
      }
    }
    
    try {
      // 对于文本模式，使用用户选择的模型；其他模式使用配置中的默认模型
      let settings: ProviderSettings;
      if (currentMode === 'text') {
        // 创建临时配置以使用选择的文本模型
        const tempConfig = {
          ...modelConfig,
          text: { provider: modelConfig.text.provider, modelId: selectedTextModel }
        };
        settings = getProviderSettings(tempConfig, 'text');
      } else {
        settings = currentMode === 'image' ? legacyConfig.image : legacyConfig.video;
      }
      
      let result = '';
      
      const parts: any[] = [];
      if (inputImage) {
        const base64Data = inputImage.split(',')[1];
        const mimeType = inputImage.split(';')[0].split(':')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        console.log('[Sidebar Send] Added image to parts, mimeType:', mimeType);
      }
      
      if (inputVideo) {
        const base64Data = inputVideo.split(',')[1];
        const mimeType = inputVideo.split(';')[0].split(':')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        console.log('[Sidebar Send] Added video to parts, mimeType:', mimeType, 'Size:', Math.round(base64Data.length / 1024) + 'KB');
      }
      
      if (inputVideoUrl) {
        // 使用URL方式传递视频（突破文件大小限制）
        parts.push({ 
          type: 'image_url',
          image_url: { url: inputVideoUrl }
        });
        console.log('[Sidebar Send] Added video URL to parts:', inputVideoUrl);
      }
      
      // 视频生成时不包含文件内容，避免信息过多
      if (currentMode !== 'video' && inputFile) {
        parts.push({ text: `Context from ${inputFile.name}:\n${inputFile.content}\n` });
      }
      
      // 构建对话历史
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Use final message with preset prompt only for text mode
      if (currentMode === 'text' && isAssistantMode) {
        const systemPrompt = createAssistantSystemPrompt(assistantGuideContent);
        parts.push({ text: systemPrompt });
      }
      
      // Add the user's final message
      parts.push({ text: finalMessage });

      // 构建包含对话历史的上下文
      const contextWithHistory = {
        parts,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: finalMessage }
        ]
      };

      if (currentMode === 'text') {
        // 检查是否包含视频链接
        const hasVideoUrl = inputVideoUrl || (finalMessage && (finalMessage.includes('http') && 
          (finalMessage.includes('.mp4') || finalMessage.includes('.mov') || finalMessage.includes('.webm') || 
           finalMessage.includes('youtube.com') || finalMessage.includes('youtu.be'))));
        
        if (hasVideoUrl) {
          // 使用视频分析方法处理视频链接
          const videoUrl = inputVideoUrl || finalMessage;
          const analysisPrompt = '请详细分析这个视频的内容，包括主题、场景、人物、动作、情感等方面';
          result = await aiServiceAdapter.analyzeVideo(videoUrl, analysisPrompt, settings);
        } else {
          // 正常文本生成，传递对话历史
          result = await aiServiceAdapter.generateText(contextWithHistory, settings);
        }
      } else if (currentMode === 'image') {
        result = await aiServiceAdapter.generateImage(contextWithHistory, settings);
      } else {
        // 视频生成：只传递用户指令和必要的图片引用
        result = await aiServiceAdapter.generateVideo(contextWithHistory, settings);
      }
      
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: result, isGenerating: false } : msg));
      
      // 语音播放AI回复内容或状态播报（仅在语音输入时播放）
      if (shouldPlayVoice) {
        let voiceContent = '';
        
        if (currentMode === 'text') {
          // 文本模式：播放AI回复内容
          voiceContent = result;
        } else if (currentMode === 'image') {
          // 图片模式：播放生成状态
          voiceContent = lang === 'zh' 
            ? '图片生成成功！已添加到聊天记录中。' 
            : 'Image generated successfully! Added to chat history.';
        } else if (currentMode === 'video') {
          // 视频模式：播放生成状态
          voiceContent = lang === 'zh' 
            ? '视频生成成功！已添加到聊天记录中。' 
            : 'Video generated successfully! Added to chat history.';
        }
        
        if (voiceContent) {
          playTextToSpeech(voiceContent);
        }
      }
    } catch (error) {
      console.error(error);
      
      // 显示错误提示
      let errorMsg = "Generation failed.";
      if (error instanceof Error) {
        errorMsg = error.message;
        alert(errorMsg);
      }
      
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: errorMsg, isGenerating: false } : msg));
    }
  };

  const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // 清理语音定时器
  useEffect(() => {
    return () => {
      if (voiceTimeout) {
        clearTimeout(voiceTimeout);
      }
    };
  }, [voiceTimeout]);

  const addBlock = (type: BlockType, initialContent: string = '', x?: number, y?: number) => {
    const prefix = type === 'text' ? 'A' : type === 'image' ? 'B' : 'V';
    
    // 简化编号生成：只找最大编号+1，不填补空缺
    setBlocks(currentBlocks => {
      const sameTypeBlocks = currentBlocks.filter(b => b.type === type);
      
      // 找到当前最大的编号
      let maxNumber = 0;
      sameTypeBlocks.forEach(b => {
        const match = b.number.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // 下一个编号就是最大编号+1
      const nextNumber = maxNumber + 1;
      const idNum = String(nextNumber).padStart(2, '0');
      
      // Calculate default position with offset based on existing blocks of the same type
      let defaultX = 300;
      let defaultY = 200;
      
      // For different types, use different starting positions to avoid overlap
      const typeOffsets = {
        text: { startX: 300, startY: 200 },
        image: { startX: 1000, startY: 200 },
        video: { startX: 1700, startY: 200 }
      };
      
      // Get the type-specific starting position
      const offset = typeOffsets[type];
      defaultX = offset.startX;
      defaultY = offset.startY;
      
      // If there are existing blocks of the same type, place new block in a grid pattern
      if (sameTypeBlocks.length > 0) {
        // Calculate grid position based on block index of the same type
        const COLS = 3; // 每行放置 3 个模块，与 autoLayout 函数保持一致
        const row = Math.floor((sameTypeBlocks.length) / COLS);
        const col = (sameTypeBlocks.length) % COLS;
        
        // Calculate position with grid spacing
        defaultX = offset.startX + (col * 600); // 600px spacing between columns
        defaultY = offset.startY + (row * 450); // 450px spacing between rows
      }
      
      const newBlock: Block = {
        id: crypto.randomUUID(), type, x: x || defaultX, y: y || defaultY, width: 500, height: 350,
        content: initialContent, status: 'idle', number: `${prefix}${idNum}`,
        fontSize: type === 'text' ? 24 : undefined,
        // Set default aspectRatio for video blocks
        aspectRatio: type === 'video' ? '16:9' : undefined,
        // Set default duration for video blocks
        duration: type === 'video' ? '10' : undefined
      };
      
      // Propagate initial data to connection engine for new blocks
      // This ensures blocks from projection can be referenced immediately
      if (initialContent) {
        // Use setTimeout to ensure the block is fully added to the state first
        setTimeout(() => {
          connectionEngine.propagateData(newBlock.id, initialContent, newBlock.type, newBlock.number);
        }, 100);
      }
      
      // 存储新创建的块到临时变量，用于返回
      window.lastCreatedBlock = newBlock;
      
      return [...currentBlocks, newBlock];
    });
    
    // 返回新创建的块（从临时存储获取）
    return window.lastCreatedBlock;
  };

  const handleLoadOperationGuide = async () => {
    try {
      // Add a message indicating that we're loading the operation guide
      const guideLoadingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        type: 'text',
        content: '正在加载Canvas智能创作平台操作指南...',
        timestamp: new Date().toLocaleTimeString(),
        isGenerating: true
      };
      
      setMessages(prev => [...prev, guideLoadingMessage]);
      
      // Scroll to bottom
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
      
      // Simulate loading the guide from a file
      // In a real implementation, you would read the actual file content
      const guideContent = `# Canvas 智能创作平台操作指南

## 前言

您好！我是 Canvas 智能创作平台的引导机器人。这份指南将帮助您快速上手并掌握 Canvas 的核心功能，从基础操作到高级应用，按使用流程由浅入深进行介绍。

## 目录

1. **快速开始**
   - 1.1 项目启动
   - 1.2 API 配置
   - 1.3 界面概览

2. **基础创作**
   - 2.1 创建模块
   - 2.2 文本生成
   - 2.3 图片生成
   - 2.4 视频生成

3. **智能助手**
   - 3.1 多模态对话
   - 3.2 工具调用
   - 3.3 内容投射

4. **进阶功能**
   - 4.1 多图生成
   - 4.2 角色客串功能
   - 4.3 文件上传
   - 4.4 批量处理

5. **高级应用**
   - 5.1 模板管理
   - 5.2 模块连接与工作流
   - 5.3 WebHook 配置
   - 5.4 模型管理

6. **项目管理**
   - 6.1 导出功能
   - 6.2 设置与偏好
   - 6.3 资源限制

7. **常见问题**

---

## 1. 快速开始

### 1.1 项目启动

**步骤 1：安装依赖**
- 打开命令行工具
- 导航到项目目录
- 执行：\`npm install\`

**步骤 2：启动开发服务器**
- 执行：\`npm run dev\`
- 打开浏览器访问本地地址（通常是 http://localhost:3000）

### 1.2 API 配置

要使用 Canvas 的 AI 功能，需配置 AI 服务提供商的 API 密钥：

**步骤 1：打开 API 设置**
- 点击左上角「设置」按钮（⚙️）
- 选择「API 配置」

**步骤 2：选择 AI 提供商**
- 支持：Google AI、智谱 AI、神马 AI、OpenAI 兼容服务
- 每个功能类型（文本、图片、视频）可独立配置

**步骤 3：填写参数**
- 根据提供商要求填写 API 密钥、模型 ID 等
- 点击「测试连接」验证配置

**示例：配置神马 AI**
1. 点击「图片」标签页
2. 选择「神马 AI」
3. 填写 API 密钥：\`sk-xxxxxxxxxxxxxxxx\`
4. 选择模型 ID：\`nano-banana\`
5. 测试连接成功即可使用

### 1.3 界面概览

Canvas 界面分为三部分：
- **顶部工具栏**：新建、保存、导出等核心功能
- **左侧控制面板**：API 设置、模板管理等
- **中央画布**：创建和编辑内容模块

**核心按钮**：
- \`+\`：新建模块
- 📝：文本模块
- 🖼️：图片模块
- 🎬：视频模块
- ⚙️：设置
- 🌙/☀️：主题切换

---

## 2. 基础创作

### 2.1 创建模块

1. 点击左上角「+」按钮
2. 选择模块类型（文本、图片、视频）
3. 在画布上点击放置模块
4. 点击模块上的「编辑」按钮开始创作

### 2.2 文本生成

**步骤**：
1. 创建文本模块并点击「编辑」
2. 输入提示词，如：「写一段关于春天的散文」
3. 点击「生成」按钮
4. 生成后可直接修改内容或调整格式
5. 点击「保存」确认

**示例**：生成产品描述
- 提示词：「为智能手表写产品描述，突出健康监测功能」
- 生成后可添加项目符号列表，优化可读性

### 2.3 图片生成

**步骤**：
1. 创建图片模块并点击「编辑」
2. 输入提示词，如：「一只可爱的小猫在草地上玩耍」
3. 选择尺寸和风格
4. 点击「生成」按钮
5. 生成后可调整亮度、对比度等参数
6. 点击「保存」确认

**示例**：生成产品宣传图
- 提示词：「简约风格无线耳机，白色背景，产品特写」
- 选择「16:9」宽高比和「产品摄影」风格

### 2.4 视频生成

**方式1：文生视频**
1. 创建视频模块并点击「编辑」
2. 输入提示词，如：「蝴蝶在花丛中飞舞的视频」
3. 选择时长和分辨率
4. 点击「生成」按钮
5. 生成后可裁剪时长或调整参数
6. 点击「保存」确认

**方式2：图生视频（通过角色客串）**
1. 从图片或视频中创建角色（参见4.2角色客串功能）
2. 创建视频模块并点击「编辑」
3. 选择已创建的角色
4. 输入提示词，如：@(角色名称) 在海滩上玩耍的视频
5. 点击「生成」按钮

**方式3：文字模块加图片模块共同生成视频**
1. 创建并配置文本模块，生成描述性文字
2. 创建并配置图片模块，生成参考图片
3. 创建视频模块，引用前两个模块
4. 输入提示词，如：基于 @T1 的文字和 @I1 的图片生成视频
5. 点击「生成」按钮

**示例1：生成动画短片**
- 提示词：「未来城市夜景，飞行器穿梭」
- 选择「10秒」时长和「4K」分辨率

**示例2：基于图片生成视频**
- 引用图片模块：基于 @B01 的风格生成一段相关视频
- 选择「15秒」时长和「1080p」分辨率

---

## 3. 智能助手

右侧对话框提供强大的 AI 助手功能，支持多模态交互和工具调用。

### 3.1 多模态对话

**文字生成**：
1. 在对话框输入文字提示
2. 点击「发送」
3. AI 生成响应内容

**图片分析**：
1. 点击「图片上传」按钮
2. 选择图片或输入图片 URL
3. 输入分析提示，如：「分析这张图片的内容和风格」
4. 点击「发送」

**视频分析**：
1. 点击「文件上传」按钮
2. 选择视频文件
3. 输入分析提示，如：「分析这段视频的关键帧」
4. 点击「发送」

### 3.2 工具调用

Canvas 支持 AI 工具调用功能，可执行特定任务：

**使用方法**：
1. 在对话框中描述需要执行的任务
2. AI 会自动调用相应工具
3. 等待工具执行结果返回

**支持的工具类型**：
- 文本处理工具
- 图片编辑工具
- 数据转换工具

### 3.3 内容投射

AI 生成的内容可直接投射到画布：

1. AI 生成内容后，点击「投射到画布」按钮
2. 选择模块类型
3. 内容自动在画布上创建新模块

**示例**：投射生成的文字
1. 输入「写一段关于秋天的诗歌」
2. AI 生成诗歌后，点击「投射到画布」
3. 选择「文本模块」
4. 诗歌自动创建为新文本模块

---

## 4. 进阶功能

### 4.1 多图生成

**步骤**：
1. 创建图片模块
2. 点击「多图生成」按钮
3. 设置生成数量（2-10张）和布局（网格、水平、垂直）
4. 点击「生成」
5. 生成后可预览、查看大图或投射到画布

**示例**：生成产品多角度图
- 提示词：「智能手机多角度展示图」
- 设置数量为「6张」，网格布局

### 4.2 角色客串功能

#### 功能概述
角色客串功能可以从视频中提取角色（物品、宠物、虚拟角色等），然后在生成新视频时使用这些角色。**注意：不支持真人角色。**

#### 创建角色

**步骤 1：打开角色管理面板**
1. 点击左侧工具栏的「角色」按钮（👤 图标）
2. 或在视频模块中点击「选择角色」按钮

**步骤 2：选择创建方式**

**方式一：从视频URL创建**
1. 点击「创建角色」→ 选择「从视频URL」
2. 输入视频URL（如何获取见下文）
3. 输入时间戳（格式：开始秒,结束秒，如 1,3）
4. 点击「创建角色」

**方式二：从任务ID创建**
1. 点击「创建角色」→ 选择「从任务ID」
2. 输入任务ID（如何获取见下文）
3. 输入时间戳（格式：开始秒,结束秒，如 1,3）
4. 点击「创建角色」

#### 如何获取视频URL和任务ID

**获取视频URL：**
1. **从应用内生成的视频**：
   - 视频生成完成后，右键点击视频模块
   - 选择「复制视频URL」
   - URL已复制到剪贴板

2. **从外部视频**：
   - 将视频上传到云存储（阿里云OSS、七牛云等）
   - 获取视频的公开访问URL
   - 确保URL可以直接访问

**获取任务ID：**
1. 视频生成完成后，点击视频模块
2. 在模块详情中查看「任务ID」
3. 点击「复制任务ID」按钮
4. 任务ID已复制到剪贴板

#### 使用角色

**方法1：在视频模块中选择（推荐）**
1. 创建或选择一个视频模块
2. 点击模块上的「选择角色」按钮
3. 在弹出的角色选择器中浏览已创建的角色
4. 点击要使用的角色
5. 角色自动应用到该模块
6. 输入提示词生成视频

**方法2：在提示词中引用**
在提示词中使用 @(角色用户名) 格式：
例如：@(角色用户名) 在草地上奔跑

**多角色使用：**
例如：@(角色1) 和 @(角色2) 在公园里玩耍

#### 角色管理

**查看角色列表**
- 在角色管理面板中查看所有已创建的角色
- 显示角色状态：创建中、就绪、错误

**删除角色**
- 点击角色卡片上的删除按钮
- 确认删除操作

**角色状态说明**
- 🔵 创建中：角色正在创建，请等待
- ✅ 就绪：角色创建成功，可以使用
- ❌ 错误：角色创建失败，查看错误信息

#### 最佳实践

**命名规范：**
- 使用有意义的名称：my-pet-dog 而不是 character1
- 使用连字符分隔：brand-mascot 而不是 brandmascot
- 避免特殊字符：只使用字母、数字和连字符

**创建技巧：**
- 选择高质量视频源
- 确保角色在时间段内清晰可见
- 选择角色正面、完整出现的片段
- 避免背景过于复杂
- 选择光线充足、角色清晰的片段

#### 实际应用案例

**案例1：宠物角色客串**
1. 拍摄宠物视频，上传到云存储获取URL
2. 创建角色，选择宠物清晰出现的2-3秒片段
3. 在新视频中使用：@(角色名称) 在海滩上玩耍

**案例2：产品角色客串**
1. 生成产品展示视频，获取任务ID
2. 创建角色，选择产品特写的时间段
3. 在不同场景中使用产品角色

**案例3：虚拟角色客串**
1. 生成虚拟角色视频（如卡通人物）
2. 提取角色创建客串角色
3. 在多个视频中重复使用该角色

### 4.3 文件上传

Canvas 支持多种文件格式上传，用于不同创作场景：

**支持格式**：
- **文本文件**：.txt, .md, .js, .ts, .tsx, .json, .css, .html, .jsonl
- **图片**：.jpg, .png, .gif, .svg
- **视频**：.mp4, .mov, .avi, .wmv, .flv, .webm, .mkv
- **文档**：.doc, .docx, .pdf

**使用场景**：
- 上传参考图片用于生成
- 上传 JSONL 文件用于批量处理
- 上传视频用于角色创建
- 上传文档用于内容分析

**上传限制**：
- 单个文件大小上限：50 MB
- 视频文件推荐大小：≤ 30 MB（超过建议使用URL链接）
- 批量上传最大支持：100个文件

**最佳实践**：
- 图片文件：使用PNG或JPG格式，分辨率≤2048px
- 视频文件：使用MP4格式，编码H.264
- 文本文件：UTF-8编码，单行≤1000字符

### 4.4 批量处理

**步骤**：
1. 点击左上角「批量」按钮（📋）
2. 选择处理类型（文本、图片、视频）
3. 上传输入文件或输入多个提示词
4. 配置输出参数
5. 点击「开始处理」
6. 监控进度，完成后下载结果

**示例**：批量生成社交媒体图片
- 选择「图片」类型
- 上传包含多个提示词的文本文件
- 选择「1:1」宽高比

---

## 5. 高级应用

### 5.1 模板管理

**创建模板**：
1. 在画布上创建并配置好模块
2. 点击「保存为模板」
3. 选择模板类型（普通模板、自动化模板）
4. 输入名称和描述，保存

**使用模板**：
1. 点击左上角「模板」按钮（📁）
2. 选择模板，点击「应用模板」
3. 模板模块自动添加到画布

**自动化模板**：
- 包含模块布局和自动化执行流程
- 支持批量数据输入
- 可自动执行整个工作流

### 5.2 模块连接与工作流

Canvas 支持复杂的模块间连接，实现自动化创作流程：

**连接模块**：
1. 鼠标悬停在模块上，点击出现的连接点
2. 拖动到另一个模块，建立连接
3. 点击连接线设置数据传递方式和触发条件

**工作流示例**：
- 文本模块生成标题 → 传递给下一个模块生成正文 → 再传递给图片模块生成配图
- 引用格式：@(模块编号)，如 基于 @T1 的内容生成图片

**支持的数据传递方式**：
- 内容拼接
- 风格参考
- 条件触发
- 循环处理

### 5.3 WebHook 配置

通过 WebHook 接收 AI 服务的实时通知：

**设置方法**：
1. 在 API 配置面板中找到 WebHook 设置
2. 输入 WebHook URL
3. 选择需要接收的通知类型
4. 保存配置

**支持的通知类型**：
- 生成任务完成
- 模型状态更新
- 资源使用提醒

### 5.4 模型管理

**查看可用模型**：
- 在 API 配置面板中，点击「查看模型列表」
- 系统会列出当前提供商支持的所有模型

**模型切换**：
- 在模块编辑界面选择不同模型
- 不同模型适用于不同场景，根据需求选择

---

## 6. 项目管理

### 6.1 导出功能

Canvas 支持多种导出和下载方式，满足不同创作需求：

**单个模块下载**：
- **文本模块**：点击模块下载按钮，可选择下载格式：
  - 📄 **TXT格式**：适合简单文本内容保存
  - 📑 **PDF格式**：适合需要格式化文档的场景
- **图片模块**：点击下载按钮，直接下载PNG格式图片
- **视频模块**：点击下载按钮，直接下载MP4格式视频

**整个画布导出**：
1. 点击左上角「导出」按钮（📤）
2. 选择导出内容（单个模块或整个画布）
3. 选择格式（图片、PDF、视频）
4. 配置质量和尺寸
5. 点击「导出」，下载文件

**批量下载**：
- 自动化执行完成后，系统自动识别最终模块
- 支持按模块类型智能选择下载格式
- 文本内容默认下载为TXT格式
- 支持同时下载多个模块结果

**下载格式说明**：
- **TXT格式**：纯文本，适合快速编辑和分享
- **PDF格式**：支持分页和基本格式化，适合正式文档
- **PNG格式**：适合图片保存和分享
- **MP4格式**：适合视频内容保存和播放

### 6.2 设置与偏好

**可配置项**：
- 主题切换（浅色/深色）
- 语言选择
- 默认模块设置
- API 超时设置

### 6.3 资源限制

Canvas 对各类资源使用有明确限制，确保系统稳定运行：

**文本处理**：
- 单个文本模块：2000字符上限
- 提示词长度：3000字符上限
- 批量文本处理：单次100条数据上限

**文件处理**：
- 单个文件上传：50 MB上限
- 视频文件推荐：≤ 30 MB（超过建议使用URL）
- 批量上传：最大100个文件

**画布与模块**：
- 画布模块数量：最多100个
- 单个画布大小：10000×10000像素
- 模块连接数量：单个模块最多20个连接

**自动化执行**：
- 单次自动化任务上限：100个
- 自动化执行超时：30分钟
- 并发执行数：3个任务上限

**AI模型使用**：
- 每秒请求数：3次上限
- 模型切换频率：每10秒最多1次
- 长文本生成：单次5000字符上限

---

## 7. 常见问题

**API 连接失败**：
- 检查 API 密钥是否正确
- 确认网络连接正常
- 检查模型 ID 是否支持所选功能

**生成内容不符合预期**：
- 优化提示词，更具体、清晰
- 尝试更换模型
- 调整生成参数

**文件上传失败**：
- 检查文件格式是否支持
- 确认文件大小不超过限制
- 刷新页面重试

**工具调用无响应**：
- 检查 API 权限是否包含工具调用
- 确认工具参数是否正确
- 查看系统日志获取详细错误信息

---

Canvas 智能创作平台持续更新中，更多功能请关注官方文档。祝您创作愉快！

Canvas 智能创作平台
2026年1月`;
      
      // Update the message with the guide content
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === guideLoadingMessage.id 
            ? { ...msg, content: `🧚‍♀️ 说曹操，曹操到，欢迎来到曹操画布工作站，这里是轻量级自动化多媒体工作站！我是您的AI助手曹冲，有任何使用问题冲我来。💫 偷偷告诉你！文案，脚本，课件，图片，修图，分镜，动画视频，自动化工作流……我都可以悄悄帮你搞定！💖 微信：wirelesscharger`, isGenerating: false } 
            : msg
        ));

        
        // Scroll to bottom again
        setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        
        // Enable assistant mode and save guide content
        setIsAssistantMode(true);
        setAssistantGuideContent(getAssistantGuideContent());
      }, 1000);
      
    } catch (error) {
      console.error('Error loading operation guide:', error);
      
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        type: 'text',
        content: `加载操作指南时出错: ${(error as Error).message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Batch processing handlers
  const handleStartBatch = async (config: BatchConfig, videoPrompts: Record<string, string>, txtFile?: File, selectedFrames?: FrameData[]) => {
    const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
    if (selectedBlocks.length === 0 && !txtFile) return;

    // 将新配置转换为旧格式
    const legacyConfig = convertNewToLegacyConfig(modelConfig);

    try {
      // Use the enhanced batch processor with minimization support
      if (txtFile) {
        // File-based processing
        await batchProcessor.startBatchProcessingEnhanced(
          { type: 'file', file: txtFile },
          config,
          legacyConfig.video,
          selectedFrames || []
        );
      } else {
        // Block-based processing
        await batchProcessor.startBatchProcessingEnhanced(
          { type: 'blocks', blocks: selectedBlocks, videoPrompts },
          config,
          legacyConfig.video,
          selectedFrames || []
        );
      }
      
      setBatchState(batchProcessor.getProcessingStatus());
      setShowBatchVideoModal(false);
    } catch (error) {
      console.error('Failed to start batch processing:', error);
    }
  };

  const handleMinimizeProgress = () => {
    setIsProgressMinimized(true);
  };

  const handleRestoreProgress = () => {
    setIsProgressMinimized(false);
  };

  const handlePauseBatch = () => {
    batchProcessor.pauseProcessing();
    setBatchState(batchProcessor.getProcessingStatus());
  };

  const handleResumeBatch = () => {
    batchProcessor.resumeProcessing();
    setBatchState(batchProcessor.getProcessingStatus());
  };

  const handleStopBatch = () => {
    batchProcessor.stopProcessing();
    setBatchState(undefined);
  };

  // Export functionality handlers
  const handleExportStoryboard = async (layout: ExportLayout) => {
    // 按照selectedIds的顺序获取选中的块，保持用户选择顺序
    const selectedBlocks = selectedIds
      .map(id => blocks.find(b => b.id === id))
      .filter((b): b is Block => b !== undefined);
    
    if (selectedBlocks.length === 0) return;

    try {
      // Check for non-image blocks
      const nonImageBlocks = selectedBlocks.filter(block => block.type !== 'image');
      if (nonImageBlocks.length > 0) {
        // Show notification about non-image blocks being filtered
        alert(lang === 'zh' ? `提示：导出分镜仅支持图片模块，已自动过滤${nonImageBlocks.length}个非图片模块` : `Note: Export storyboard only supports image modules, automatically filtered ${nonImageBlocks.length} non-image modules`);
      }

      // Export storyboard with png format for better quality
      // 添加sortBy: 'selection'选项，确保按照选择顺序导出
      const exportUrl = await exportService.exportStoryboard(selectedBlocks, { layout, format: 'png', sortBy: 'selection' });
      
      // Download the exported image with correct extension
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `storyboard-${layout}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export storyboard:', error);
      alert(lang === 'zh' ? '导出分镜失败，请确保所有选中的模块都是有内容的图片模块' : 'Failed to export storyboard, please ensure all selected modules are image modules with content');
    }
  };

  // Test API connection
  const handleTestConnection = async (settings: ProviderSettings): Promise<boolean> => {
    try {
      return await aiServiceAdapter.testConnection(settings);
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  // Preset Prompt handlers
  const handleOpenPresetPromptModal = () => {
    setShowPresetPromptModal(true);
  };

  const handleClosePresetPromptModal = () => {
    setShowPresetPromptModal(false);
  };

  // Parameter Panel handlers
  const handleOpenParameterPanel = (type: 'image' | 'video', modelId?: string) => {
    setParameterPanelType(type);
    setParameterPanelModel(modelId || (type === 'image' ? modelConfig.image.modelId : modelConfig.video.modelId));
    setShowParameterPanel(true);
  };

  const handleCloseParameterPanel = () => {
    setShowParameterPanel(false);
  };

  const handleParametersChange = async (parameters: any) => {
    try {
      // 在画布中心创建新块
      const centerX = -pan.x / zoom + (window.innerWidth * 0.7) / (2 * zoom);
      const centerY = -pan.y / zoom + window.innerHeight / (2 * zoom);

      const newBlock = addBlock(parameterPanelType, '', centerX, centerY);
      
      if (newBlock) {
        // 应用参数到新块
        setBlocks(prev => prev.map(b => 
          b.id === newBlock.id 
            ? { 
                ...b, 
                aspectRatio: parameters.aspectRatio || (parameterPanelType === 'image' ? '16:9' : '16:9'),
                duration: parameters.duration || (parameterPanelType === 'video' ? '10' : undefined),
                originalPrompt: parameters.prompt || ''
              }
            : b
        ));

        // 如果有提示词，立即开始生成
        if (parameters.prompt && parameters.prompt.trim()) {
          await handleGenerate(newBlock.id, parameters.prompt);
        }

        showSuccess(
          lang === 'zh' ? '参数已应用' : 'Parameters Applied',
          lang === 'zh' ? `已创建${parameterPanelType === 'image' ? '图像' : '视频'}模块并应用参数` : `Created ${parameterPanelType} module with parameters`
        );
      }

      // 关闭参数面板
      setShowParameterPanel(false);
    } catch (error) {
      console.error('Failed to apply parameters:', error);
      showError(
        lang === 'zh' ? '参数应用失败' : 'Parameter Application Failed',
        error instanceof Error ? error.message : '未知错误'
      );
    }
  };

  const handleSavePresetPrompts = (prompts: PresetPrompt[]) => {
    setPresetPrompts(prompts);
    savePresetPrompts(prompts, selectedPromptIndex);
  };

  const handleSelectPresetPrompt = (index: number) => {
    const newIndex = selectedPromptIndex === index ? null : index;
    setSelectedPromptIndex(newIndex);
    savePresetPrompts(presetPrompts, newIndex);
  };

  // Template Management handlers
  const handleOpenTemplateManager = () => {
    setShowTemplateManager(true);
  };

  const handleCloseTemplateManager = () => {
    setShowTemplateManager(false);
  };

  const getCurrentCanvasState = (): CanvasState => {
    // Convert basic connections to enhanced connections
    const enhancedConnections = connections.map(conn => 
      connectionEngine.getEnhancedConnection(conn.id) || {
        ...conn,
        dataFlow: {
          enabled: true,
          lastUpdate: Date.now(),
          dataType: 'text' as const,
          lastData: undefined
        }
      }
    );

    return {
      blocks: [...blocks],
      connections: enhancedConnections,
      settings: {
        zoom,
        pan: { ...pan }
      }
    };
  };

  const handleLoadTemplate = (canvasState: CanvasState, isAutomation?: boolean) => {
    setBlocks(canvasState.blocks);
    setConnections(canvasState.connections);
    setZoom(canvasState.settings.zoom);
    setPan(canvasState.settings.pan);
    setSelectedIds([]);
    
    // Set automation template state
    setIsAutomationTemplate(isAutomation || false);
    
    // Update connection engine with loaded connections
    connectionEngine.updateConnections(canvasState.connections);
  };

  const getSelectedPromptContent = (): string | null => {
    if (selectedPromptIndex !== null && presetPrompts[selectedPromptIndex]) {
      return presetPrompts[selectedPromptIndex].content;
    }
    return null;
  };
  
  // Automation Template handlers
  const handleBatchInputConfig = () => {
    setShowBatchInputConfig(true);
  };

  const handleBatchInputConfigComplete = (source: BatchInputSource) => {
    setBatchInputSource(source);
    setShowBatchInputConfig(false);
  };

  const handleBatchInputConfigCancel = () => {
    setShowBatchInputConfig(false);
  };

  const handleStartAutomationExecution = async (source?: BatchInputSource) => {
    // 检查token限制
    if (!checkTokenLimit()) {
      showTokenLimitModal();
      return;
    }

    if (!isAutomationTemplate) return;
    
    const inputSource = source || batchInputSource;
    if (!inputSource) {
      alert(lang === 'zh' ? '请先配置批量数据输入' : 'Please configure batch input first');
      return;
    }

    try {
      // Start automation execution using the AutoExecutionService
      await autoExecutionService.startExecution(
        blocks,
        connections,
        async (nodeId: string, prompt: string) => {
          // This will be called for each node execution
          await handleGenerate(nodeId, prompt);
        },
        (progress: ExecutionProgress) => {
          // Update progress
          setAutoExecutionProgress(progress);
          
          // Check if execution is completed
          if (progress.status === 'completed') {
            // Save the results as a batch
            handleSaveBatchResults();
          }
        },
        undefined, // batchData - 由AutoExecutionService内部处理
        resultHandling, // 用户选择的结果处理方式
        (newBlock) => {
          // 使用现有的 addBlock 函数创建新模块，保持一致的布局逻辑
          // addBlock 函数会自动计算正确的位置（从左到右，从上到下，保持间距）
          addBlock(newBlock.type, newBlock.content, newBlock.x, newBlock.y);
        }
      );
    } catch (error) {
      console.error('Failed to start automation execution:', error);
      alert(lang === 'zh' ? '启动自动化执行失败' : 'Failed to start automation execution');
    }
  };

  const handlePauseAutomationExecution = () => {
    if (autoExecutionProgress) {
      autoExecutionService.pauseExecution();
      setAutoExecutionProgress({ ...autoExecutionProgress, status: 'paused' });
    }
  };

  const handleStopAutomationExecution = () => {
    if (autoExecutionProgress) {
      autoExecutionService.stopExecution();
      setAutoExecutionProgress(null);
    }
  };

  const handleSaveBatchResults = () => {
    // 保持二选一结果处理原则：只在 resultHandling 为 'download' 时执行下载
    if (resultHandling !== 'download') {
      return;
    }
    
    // 获取时间戳，用于区分不同批次
    const timestamp = new Date().getTime();
    
    // 识别最终模块：没有被其他模块引用的模块（没有下游连接）
    const allToIds = new Set(connections.map(conn => conn.toId));
    const finalBlocks = blocks.filter(block => {
      // 检查是否有其他模块连接到这个模块
      return !allToIds.has(block.id) && block.content && block.status === 'idle';
    });

    if (finalBlocks.length === 0) {
      alert(lang === 'zh' ? '没有可下载的最终结果' : 'No final results to download');
      return;
    }

    // 创建下载链接数组，用于统一清理
    const downloadLinks: HTMLAnchorElement[] = [];
    const objectUrls: string[] = [];

    // 处理文本结果
    const textResults = finalBlocks.filter(block => block.type === 'text');
    if (textResults.length > 0) {
      const textContent = textResults
        .map(block => `${block.number}:
${block.content}
`)
        .join('\n');

      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      objectUrls.push(textUrl);

      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `final_text_${timestamp}.txt`;
      downloadLinks.push(textLink);
    }

    // 处理图片结果
    const imageResults = finalBlocks.filter(block => block.type === 'image');
    for (const block of imageResults) {
      // 检查是否是base64格式
      if (block.content.startsWith('data:image/')) {
        const blob = dataURItoBlob(block.content);
        const imageUrl = URL.createObjectURL(blob);
        objectUrls.push(imageUrl);

        const imageLink = document.createElement('a');
        imageLink.href = imageUrl;
        imageLink.download = `final_image_${block.number}_${timestamp}.png`;
        downloadLinks.push(imageLink);
      } else if (block.content.startsWith('http')) {
        // 处理HTTP/HTTPS链接
        const imageLink = document.createElement('a');
        imageLink.href = block.content;
        imageLink.download = `final_image_${block.number}_${timestamp}.png`;
        downloadLinks.push(imageLink);
      }
    }

    // 处理视频结果
    const videoResults = finalBlocks.filter(block => block.type === 'video');
    for (const block of videoResults) {
      const videoLink = document.createElement('a');
      videoLink.href = block.content;
      videoLink.download = `final_video_${block.number}_${timestamp}.mp4`;
      downloadLinks.push(videoLink);
    }

    // 下载所有文件
    downloadLinks.forEach(link => {
      document.body.appendChild(link);
      link.click();
    });

    // 清理
    setTimeout(() => {
      downloadLinks.forEach(link => {
        document.body.removeChild(link);
      });
      objectUrls.forEach(url => {
        URL.revokeObjectURL(url);
      });
    }, 100);

    alert(lang === 'zh' ? `已下载 ${downloadLinks.length} 个最终结果文件` : `Downloaded ${downloadLinks.length} final result files`);
  };

  // 辅助函数：将data URI转换为Blob对象
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div 
      className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
      data-canvas-state={JSON.stringify({
        blocks,
        connections,
        zoom,
        pan
      })}
    >
      <input type="file" ref={chatImageInputRef} className="hidden" accept="image/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setPendingChatImage(event.target?.result as string);
          reader.readAsDataURL(file);
        }
      }} />
      <input 
        type="file" 
        ref={chatTextInputRef} 
        className="hidden" 
        accept={
          chatMode === 'text' && modelCapabilityDetector.isVideoUploadEnabled(chatMode, modelConfig)
            ? ".txt,.md,.js,.ts,.tsx,.json,.css,.html,.doc,.docx,.pdf,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
            : ".txt,.md,.js,.ts,.tsx,.json,.css,.html,.doc,.docx,.pdf"
        }
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            // 检查是否为视频文件
            const isVideo = file.type.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(file.name);
            
            if (isVideo) {
              console.log('[Video Upload] Detected video file:', file.name, 'Size:', Math.round(file.size / 1024 / 1024) + 'MB');
              
              // 验证视频文件
              const validation = modelCapabilityDetector.validateVideoFile(file);
              if (!validation.valid) {
                console.error('[Video Upload] Validation failed:', validation.error);
                alert(validation.error);
                return;
              }
              
              console.log('[Video Upload] Validation passed, reading file...');
              
              // 读取视频文件为 Data URL
              const reader = new FileReader();
              reader.onload = (event) => {
                setPendingChatVideo(event.target?.result as string);
                setPendingChatFile({ name: file.name, content: '[视频文件]' });
                console.log('[Video Upload] Video file loaded successfully');
              };
              reader.readAsDataURL(file);
            } else {
              // 处理文本/文档文件
              const reader = new FileReader();
              if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                setPendingChatFile({ name: file.name, content: `[PDF文件内容将通过AI服务解析]` });
              } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                setPendingChatFile({ name: file.name, content: `[Word文件内容将通过AI服务解析]` });
              } else {
                reader.onload = (event) => setPendingChatFile({ name: file.name, content: event.target?.result as string });
                reader.readAsText(file);
              }
            }
          }
        }} 
      />

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[1000] min-w-[240px] bg-white dark:bg-slate-900 border-2 border-black/5 dark:border-white/10 rounded-3xl shadow-4xl py-4 overflow-hidden animate-in fade-in zoom-in duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { addBlock('text', '', (contextMenu.x - pan.x)/zoom, (contextMenu.y - pan.y)/zoom); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <TextIcon size={18} className="text-blue-500" />
            <span className="text-sm font-bold">{t.ctxAddText}</span>
          </button>
          <button onClick={() => { addBlock('image', '', (contextMenu.x - pan.x)/zoom, (contextMenu.y - pan.y)/zoom); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <ImageIcon size={18} className="text-emerald-500" />
            <span className="text-sm font-bold">{t.ctxAddImage}</span>
          </button>
          <button onClick={() => { addBlock('video', '', (contextMenu.x - pan.x)/zoom, (contextMenu.y - pan.y)/zoom); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <Video size={18} className="text-red-500" />
            <span className="text-sm font-bold">{t.ctxAddVideo}</span>
          </button>
          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
          {/* Batch Processing Option */}
          {selectedIds.length > 0 && (
            <button onClick={() => { setShowBatchVideoModal(true); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
              <Play size={18} className="text-purple-500" />
              <span className="text-sm font-bold">{lang === 'zh' ? '批量视频处理' : 'Batch Video Processing'}</span>
            </button>
          )}
          {/* Export Option */}
          {selectedIds.length > 0 && (
            <button onClick={() => { setShowExportModal(true); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
              <Download size={18} className="text-green-500" />
              <span className="text-sm font-bold">{lang === 'zh' ? '导出分镜' : 'Export Storyboard'}</span>
            </button>
          )}
          {(selectedIds.length > 0) && <div className="h-px bg-black/5 dark:bg-white/5 my-2" />}
          {/* Restored Auto Layout in Context Menu */}
          <button onClick={() => { handleAutoLayout(); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <ListOrdered size={18} className="text-amber-500" />
            <span className="text-sm font-bold">{t.ctxAutoLayout}</span>
          </button>
          <button onClick={() => { handleCanvasReset(); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <RotateCcw size={18} className="text-slate-400" />
            <span className="text-sm font-bold">{t.ctxReset}</span>
          </button>
          {/* Copy selected blocks */}
          {selectedIds.length > 0 && (
            <button onClick={() => { handleCanvasCopy(); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
              <Copy size={18} className="text-blue-500" />
              <span className="text-sm font-bold">{lang === 'zh' ? '复制模块' : 'Copy Blocks'}</span>
            </button>
          )}
          <button onClick={() => { handleCanvasClear(); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-4 text-red-500 transition-colors">
            <Eraser size={18} />
            <span className="text-sm font-bold">{t.ctxClear}</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-28 flex items-center justify-between px-16 z-[300] border-b-2 backdrop-blur-3xl ${theme === 'dark' ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-black/5 shadow-sm'} rounded-br-3xl`}>
        <div className="flex items-center gap-8">
           <div className="flex items-center justify-center">
             <svg width="64" height="40" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
               {/* 渐变定义 */}
               <defs>
                 <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" style={{stopColor:"#8b5cf6", stopOpacity:1}} />
                   <stop offset="50%" style={{stopColor:"#6366f1", stopOpacity:1}} />
                   <stop offset="100%" style={{stopColor:"#4338ca", stopOpacity:1}} />
                 </linearGradient>
                 <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" style={{stopColor:"#1e1b4b", stopOpacity:1}} />
                   <stop offset="100%" style={{stopColor:"#0f0f23", stopOpacity:1}} />
                 </linearGradient>
               </defs>
               
               {/* 胡须底部 */}
               <path d="M12 32 Q32 28 52 32 L56 40 H8 Z" fill="#2D1B69"/>
               
               {/* 脸部轮廓 */}
               <path d="M32 12 L38 13 Q42 18 37 24 L35 29 Q29 30 24 28 L27 22 Q22 16 32 12" fill="url(#faceGrad)" stroke="#4338ca" strokeWidth="1"/>
               
               {/* 官帽 */}
               <path d="M27 12 L37 12 L40 6 L35 4 L24 6 Z" fill="url(#hatGrad)" stroke="#1e1b4b" strokeWidth="1"/>
               
               {/* 帽饰 */}
               <rect x="30" y="3" width="4" height="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5" rx="1"/>
               
               {/* 胡须细节 */}
               <path d="M27 23 Q22 32 19 37 M30 25 Q30 34 29 39 M35 24 Q40 33 43 36" 
                     stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
               
               {/* 眼睛 */}
               <ellipse cx="29" cy="17" rx="1.5" ry="1" fill="#1e1b4b"/>
               <ellipse cx="35" cy="17" rx="1.5" ry="1" fill="#1e1b4b"/>
               <circle cx="29.5" cy="16.5" r="0.3" fill="white"/>
               <circle cx="35.5" cy="16.5" r="0.3" fill="white"/>
               
               {/* 鼻子 */}
               <path d="M32 18 L32.5 19 L32 20 L31.5 19 Z" fill="#6366f1"/>
               
               {/* 嘴巴 */}
               <path d="M30 21 Q32 22 34 21" stroke="#1e1b4b" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
               
               {/* 面部轮廓线 */}
               <path d="M33 15 Q37 15.5 39 15" stroke="#4338ca" strokeWidth="0.5" fill="none" strokeLinecap="round"/>
             </svg>
           </div>
           <h1 className="font-black text-3xl md:text-4xl uppercase tracking-tighter leading-tight">
             {lang === 'zh' ? (
               <>
                 <span className="text-slate-900 dark:text-white font-bold tracking-widest" style={{letterSpacing: '0.2em'}}>曹操</span>
                 <span className="text-amber-500 font-bold tracking-widest relative" style={{letterSpacing: '0.2em'}}>
                   画布
                   <span className="absolute -bottom-1 left-0 w-full h-1 bg-amber-500/50 rounded-full"></span>
                 </span>
               </>
             ) : (
               <>
                 <span className="text-slate-900 dark:text-white font-bold tracking-widest">AUTO</span>
                 <span className="text-amber-500 font-bold tracking-widest relative">
                   CANVAS
                   <span className="absolute -bottom-1 left-0 w-full h-1 bg-amber-500/50 rounded-full"></span>
                 </span>
               </>
             )}
           </h1>
        </div>

        <div className="flex items-center gap-6">
           {/* Token Consumption Display */}
           <div className="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl">
             <TokenConsumptionDisplay />
           </div>
           
           <button 
            onClick={handleOpenTemplateManager} 
            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-blue-500/20 text-blue-500' : 'bg-white border-black/5 hover:shadow-xl text-blue-600'}`}
           >
             <FolderOpen size={24} strokeWidth={3} />
             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{lang === 'zh' ? '模板' : 'Templates'}</span>
           </button>
           
           <button 
            onClick={() => setShowConfig(true)} 
            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-amber-500/20 text-amber-500' : 'bg-white border-black/5 hover:shadow-xl text-amber-600'}`}
           >
             <Key size={24} strokeWidth={3} />
             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{t.api}</span>
           </button>

           {/* Admin Monitoring Button - Hidden by default, shown with Ctrl+Shift+A */}
           <button 
            onClick={(e) => {
              // 移除管理监控功能
            }}
            onDoubleClick={() => {
              // 移除管理监控功能
            }}
            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 opacity-30 hover:opacity-100 ${
              theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-purple-500/20 text-purple-500' : 'bg-white border-black/5 hover:shadow-xl text-purple-600'
            }`}
            title={lang === 'zh' ? '管理员面板 (双击或Ctrl+Shift+点击)' : 'Admin Panel (Double-click or Ctrl+Shift+Click)'}
           >
             <Database size={24} strokeWidth={3} />
             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">
               {lang === 'zh' ? '管理' : 'Admin'}
             </span>
           </button>
           
           {/* Sidebar Toggle Button */}
           <button 
             onClick={() => setShowSidebar(!showSidebar)}
             className="p-5 rounded-2xl border-2 border-black/5 bg-white/50"
             title={showSidebar ? (lang === 'zh' ? '关闭侧边栏' : 'Close Sidebar') : (lang === 'zh' ? '打开侧边栏' : 'Open Sidebar')}
           >
             {showSidebar ? <PanelLeft size={24} /> : <PanelRight size={24} />}
           </button>
           
           <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-5 rounded-2xl border-2 border-black/5 bg-white/50">{theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}</button>
        </div>
      </header>

      {/* API Master Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 animate-in fade-in zoom-in duration-300">
           <div className={`w-full max-w-4xl h-[700px] flex overflow-hidden rounded-[4rem] border-4 shadow-4xl ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-black/5'}`}>
              <div className={`w-64 border-r-2 p-10 flex flex-col gap-6 ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-black/5 bg-slate-50'}`}>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">{t.engines}</h3>
                 {(['text', 'image', 'video'] as BlockType[]).map(tab => (
                   <button 
                    key={tab} 
                    onClick={() => setActiveConfigTab(tab)}
                    className={`flex items-center gap-4 p-5 rounded-2xl font-black text-sm uppercase transition-all ${activeConfigTab === tab ? 'bg-amber-500 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-black/5'}`}
                   >
                     {tab === 'text' ? <TextIcon size={18} /> : tab === 'image' ? <ImageIcon size={18} /> : <Video size={18} />}
                     {tab === 'text' ? t.addText.split('模块')[0] : tab === 'image' ? t.addImage.split('模块')[0] : t.addVideo.split('模块')[0]}
                   </button>
                 ))}
                 
                 {/* Contact Information */}
                 <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 border-2 border-purple-500/20">
                   <div className="flex items-center gap-2 mb-4">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                       <span className="text-white text-sm">💬</span>
                     </div>
                     <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">联系我们</h4>
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                       navigator.clipboard.writeText('Wirelesscharger');
                       alert('微信号已复制！');
                     }}>
                       <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                         <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                         </svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">微信</p>
                         <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-green-500 transition-colors">Wirelesscharger</p>
                       </div>
                       <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击复制</div>
                     </div>
                     <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                       navigator.clipboard.writeText('909599954@qq.com');
                       alert('邮箱已复制！');
                     }}>
                       <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                         <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                         </svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">邮箱</p>
                         <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">909599954@qq.com</p>
                       </div>
                       <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击复制</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="mt-auto pt-10 border-t border-black/5">
                    <button onClick={saveMasterConfig} className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">{t.saveAndClose}</button>
                 </div>
              </div>

              <div className="flex-1 p-16 overflow-y-auto scrollbar-hide">
                 <div className="flex items-center justify-between mb-12">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">{t.configure} <span className="text-amber-500">{activeConfigTab} Engine</span></h2>
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-3xl text-[10px] font-black flex items-center gap-2 border border-green-500/20"><ShieldCheck size={12} /> {t.active}</div>
                      <button onClick={() => setShowConfig(false)} className="p-4 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                        <X size={24} strokeWidth={3} />
                      </button>
                    </div>
                 </div>
                 
                 <APIProviderConfig
                   config={modelConfig}
                   onUpdateConfig={setModelConfig}
                   onClose={() => setShowConfig(false)}
                 />
              </div>
           </div>
        </div>
      )}

      {/* Toolbar (Left) */}
      <aside className={`fixed left-12 top-1/2 -translate-y-1/2 w-24 flex flex-col items-center py-6 gap-3 z-[300] border-2 border-purple-400/50 rounded-[3rem] shadow-3xl backdrop-blur-3xl ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/95'}`}>
        <button 
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
          className="w-12 h-12 bg-amber-500 text-white rounded-xl shadow-2xl hover:scale-110 active:scale-90 transition-all border-2 border-white/20 flex items-center justify-center font-black text-sm"
          title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
        >
          {lang === 'zh' ? 'EN' : '中'}
        </button>

        <div className="w-8 h-px bg-slate-300/30" />
        
        <button onClick={() => addBlock('text')} className="p-3 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all" title={t.addText}><TextIcon size={20} /></button>
        <button onClick={() => addBlock('image')} className="p-3 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all" title={t.addImage}><ImageIcon size={20} /></button>
        <button onClick={() => addBlock('video')} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all" title={t.addVideo}><Video size={20} /></button>
        
        <div className="w-8 h-px bg-slate-300/30" />
        
        <button 
          onClick={() => setShowVoiceSettings(true)} 
          className="p-3 text-purple-500 hover:bg-purple-500/10 rounded-xl transition-all" 
          title="语音设置"
        >
          <Volume2 size={20} />
        </button>
        
        <div className="w-8 h-px bg-slate-300/30" />
        
        <RealtimeShareButton 
          blocks={blocks}
          connections={connections}
          zoom={zoom}
          pan={pan}
        />
        
        <div className="w-8 h-px bg-slate-300/30" />
        
        <button onClick={() => { setZoom(0.5); setPan({ x: 0, y: 0 }); }} className="p-3 text-slate-400 hover:text-amber-500 transition-all" title={t.ctxReset}><RotateCcw size={20} /></button>
      </aside>

      <main className="flex-1 h-full pt-28 pl-40" style={{ marginRight: showSidebar ? `${sidebarWidth}px` : 0 }}>
        {/* 手势测试按钮（开发调试用） */}
        {isCanvasGestureActive && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <button
              onClick={() => simpleGestureRecognizer.triggerGesture('zoom_in')}
              className="px-3 py-2 bg-green-500 text-white rounded text-sm"
            >
              测试放大
            </button>
            <button
              onClick={() => simpleGestureRecognizer.triggerGesture('zoom_out')}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
            >
              测试缩小
            </button>
            <button
              onClick={() => simpleGestureRecognizer.triggerGesture('reset_view')}
              className="px-3 py-2 bg-purple-500 text-white rounded text-sm"
            >
              测试重置
            </button>
          </div>
        )}

        <Canvas 
          blocks={blocks} connections={connections} zoom={zoom} pan={pan} selectedIds={selectedIds} theme={theme} lang={lang} isPerfMode={false} isAutomationTemplate={isAutomationTemplate} modelConfig={modelConfig}
          menuConfig={currentMenuConfig}
          onUpdateBlock={(id, upd) => setBlocks(prev => prev.map(b => b.id === id ? {...b, ...upd} : b))}
          onSelect={(id, multi) => setSelectedIds(multi ? (selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]) : [id])}
          onClearSelection={() => setSelectedIds([])}
          onDeleteBlock={(id) => setBlocks(prev => prev.filter(b => b.id !== id))}
          onConnect={(f, t) => setConnections(prev => [...prev, { id: crypto.randomUUID(), fromId: f, toId: t, instruction: "" }])}
          onGenerate={handleGenerate}
          onMultiImageGenerate={async (sourceBlock, config) => {
            console.log('Multi-image generation requested:', sourceBlock, config);
            
            if (!sourceBlock.originalPrompt) {
              console.error('No prompt available for multi-image generation');
              return;
            }

            try {
              // Mark source block as multi-image source
              setBlocks(prev => prev.map(b => 
                b.id === sourceBlock.id 
                  ? { ...b, isMultiImageSource: true }
                  : b
              ));

              // Get canvas dimensions for layout optimization
              const canvasSize = config.enableLayoutOptimization ? { width: 1200, height: 800 } : undefined;

              // Generate image set using enhanced MultiImageGenerator
              const imageSet = await multiImageGenerator.generateImageSet(
                sourceBlock.id,
                sourceBlock.originalPrompt,
                config,
                canvasSize,
                (progress) => {
                  console.log('Multi-image generation progress:', progress);
                  // Update source block status based on progress
                  setBlocks(prev => prev.map(b => 
                    b.id === sourceBlock.id 
                      ? { ...b, status: progress.status === 'completed' ? 'idle' : 'processing' }
                      : b
                  ));
                }
              );

              console.log('Multi-image generation completed:', imageSet);

              if (config.projectToCanvas && imageSet.images.length > 0) {
                // Create blocks for generated images using optimized layout
                const newBlocks: Block[] = [];
                const initialImageCount = blocks.filter(b => b.type === 'image').length;

                imageSet.images.forEach((processedImage, index) => {
                  if (processedImage.status === 'ready') {
                    const blockNumber = initialImageCount + index + 1;
                    const position = imageSet.layout.positions[index];
                    
                    const newBlock: Block = {
                      id: crypto.randomUUID(),
                      type: 'image',
                      x: position ? sourceBlock.x + position.x : sourceBlock.x + (index * 200),
                      y: position ? sourceBlock.y + position.y : sourceBlock.y,
                      width: position ? position.width : sourceBlock.width,
                      height: position ? position.height : sourceBlock.height,
                      content: processedImage.base64 || processedImage.url,
                      status: 'idle',
                      number: `B${String(blockNumber).padStart(2, '0')}`,
                      aspectRatio: config.aspectRatio || sourceBlock.aspectRatio,
                      originalPrompt: sourceBlock.originalPrompt,
                      multiImageGroupId: sourceBlock.id,
                      multiImageIndex: index,
                      isMultiImageSource: false,
                      imageMetadata: {
                        width: position?.width,
                        height: position?.height,
                        aspectRatio: config.aspectRatio || sourceBlock.aspectRatio,
                        model: config.model,
                        generatedAt: Date.now()
                      }
                    };
                    
                    newBlocks.push(newBlock);
                  }
                });

                // Add all new blocks to the canvas
                setBlocks(prev => [...prev, ...newBlocks]);

                console.log(`✓ Created ${newBlocks.length} image blocks from multi-image generation`);
                console.log(`Consistency Score: ${imageSet.metadata.consistencyScore.toFixed(2)}`);
                console.log(`Layout Efficiency: ${imageSet.layout.metadata.efficiency.toFixed(2)}`);
              }

            } catch (error) {
              console.error('Multi-image generation failed:', error);
              
              // Reset source block status
              setBlocks(prev => prev.map(b => 
                b.id === sourceBlock.id 
                  ? { ...b, status: 'error', isMultiImageSource: false }
                  : b
              ));

              // Show error message to user
              alert(`多图生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
          }}
          onUpdateConnection={() => {}}
          onContextMenu={handleContextMenu}
          onUpdatePan={setPan}
          onCreateBlock={(blockData, x, y) => {
            // 创建新块，使用传递的blockData
            const type = blockData.type || 'image';
            const prefix = type === 'text' ? 'A' : type === 'image' ? 'B' : 'V';
            const idNum = String(blocks.filter(b => b.type === type).length + 1).padStart(2, '0');
            
            const newBlock: Block = {
              id: crypto.randomUUID(),
              type,
              x: x,
              y: y,
              width: blockData.width || 500,
              height: blockData.height || 350,
              content: blockData.content || '', // 保留原内容，如果有的话
              status: 'idle',
              number: `${prefix}${idNum}`,
              fontSize: blockData.fontSize,
              textColor: blockData.textColor,
              aspectRatio: blockData.aspectRatio,
              isCropped: blockData.isCropped,
              duration: blockData.duration,
              characterId: blockData.characterId,
              characterUrl: blockData.characterUrl,
              characterTimestamps: blockData.characterTimestamps,
              originalPrompt: blockData.originalPrompt,
              imageMetadata: blockData.imageMetadata,
              multiImageGroupId: blockData.multiImageGroupId,
              multiImageIndex: blockData.multiImageIndex,
              isMultiImageSource: blockData.isMultiImageSource
            };
            
            // 添加新块到状态
            setBlocks(prev => [...prev, newBlock]);
            
            // 不再自动生成内容，由用户手动触发
            // 用户可以通过点击"生成"按钮或"开始自动执行"来生成内容
          }}
          onOpenImagePreview={(blockId) => {
            // Open image preview modal
            console.log('Opening image preview for block:', blockId);
            // In a real implementation, this would open a modal with the image
          }}
          onOpenMultiImageModal={(blockId) => {
            // Open multi-image generation modal
            console.log('Opening multi-image modal for block:', blockId);
            // In a real implementation, this would open a modal to configure multi-image generation
          }}
          onOpenImageEditModal={(blockId) => {
            // Open image editing modal
            console.log('Opening image edit modal for block:', blockId);
            // In a real implementation, this would open a modal for image editing
          }}
          onResolvePrompt={resolvePromptReferences}
          availableCharacters={characterService.getAllCharacters().filter(c => c.status === 'ready')}
          onCharacterSelect={(blockId, character) => {
            setBlocks(prev => prev.map(b => 
              b.id === blockId 
                ? { 
                    ...b, 
                    characterId: character?.id,
                    characterUrl: character?.permalink || character?.url,
                    characterTimestamps: character?.timestamps
                  } 
                : b
            ));
          }}
          onOpenCharacterPanel={() => setIsCharacterPanelOpen(true)}
        />
      </main>

      {showSidebar && (
        <aside style={{ width: `${sidebarWidth}px` }} className={`fixed right-0 top-28 bottom-0 flex flex-col z-[300] border-l-2 border-purple-400/50 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-tl-3xl rounded-bl-3xl`}>
          <div onMouseDown={startResizing} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/20 z-[310]" />
          <div className="p-4 border-b-2 border-black/5 flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <div className="relative">
                    <button onClick={() => {
                      setChatMode('text');
                      if (isAssistantMode) {
                        setIsAssistantMode(false);
                      } else {
                        handleLoadOperationGuide();
                      }
                    }} className={`flex items-center gap-3 p-2 rounded-2xl transition-all ${isAssistantMode ? 'bg-purple-500/20 border border-purple-500/50' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                      <BrainCircuit className={isAssistantMode ? "text-purple-500 animate-pulse" : "text-purple-500"} /> 
                      <h2 className="font-black text-lg uppercase tracking-widest">{t.aiAssistant}</h2>
                    </button>
                    {isAssistantMode && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                    )}
                  </div>

                  <button onClick={() => { setShowSidebar(false); setIsAssistantMode(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-400"><X size={20} /></button>
               </div>

               {/* Sidebar Tabs */}
               <div className="flex gap-2">
                 <button
                   onClick={() => setSidebarTab('chat')}
                   className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${sidebarTab === 'chat' ? (theme === 'dark' ? 'bg-slate-700 text-amber-400' : 'bg-amber-100 text-amber-600') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}`}
                 >
                   <MessageSquare size={16} />
                   {t.chat}
                 </button>
                 <button
                   onClick={() => setSidebarTab('caocao')}
                   className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${sidebarTab === 'caocao' ? (theme === 'dark' ? 'bg-slate-700 text-purple-400' : 'bg-purple-100 text-purple-600') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}`}
                 >
                   <Brain size={16} />
                   曹操
                 </button>
                 <button
                   onClick={() => setSidebarTab('assembly')}
                   className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase transition-all ${sidebarTab === 'assembly' ? (theme === 'dark' ? 'bg-slate-700 text-amber-400' : 'bg-amber-100 text-amber-600') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}`}
                 >
                   <Layers size={16} />
                   {t.featureAssembly}
                 </button>
               </div>
            </div>

          {/* Chat Panel */}
          {sidebarTab === 'chat' && (
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Sparkles size={64} className="text-amber-500 mb-6" />
                <p className="font-bold text-sm leading-relaxed">{t.blockPlaceholder}</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[95%] p-4 rounded-[1.5rem] shadow-xl border-2 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'} group`}>
                  {msg.attachmentName && msg.role === 'user' && (
                    <div className="mb-3 px-3 py-1 bg-white/10 rounded-2xl border border-white/5 text-[9px] font-black uppercase flex items-center gap-2">
                      {msg.attachmentContent?.startsWith('data:image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                      <span className="truncate max-w-[150px]">{msg.attachmentName}</span>
                    </div>
                  )}
                  {msg.isGenerating ? <div className="flex items-center gap-4 py-2"><Loader2 className="animate-spin" /> {t.thinking}</div> : (
                    <>
                      {msg.type === 'text' && (
                        <div className="text-sm relative">
                          {formatText(msg.content)}
                          <button 
                            onClick={async () => {
                              await navigator.clipboard.writeText(msg.content);
                              // Show copy success feedback
                              const btn = document.querySelector(`[data-msg-id="${msg.id}"]`);
                              if (btn) {
                                const originalIcon = btn.innerHTML;
                                btn.innerHTML = `<Check size="14" />`;
                                btn.classList.remove('text-slate-400', 'hover:text-slate-600');
                                btn.classList.add('text-green-500');
                                setTimeout(() => {
                                  btn.innerHTML = originalIcon;
                                  btn.classList.add('text-slate-400', 'hover:text-slate-600');
                                  btn.classList.remove('text-green-500');
                                }, 1000);
                              }
                            }} 
                            className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
                            title={lang === 'zh' ? '复制内容' : 'Copy content'}
                            data-msg-id={msg.id}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      )}
                      {msg.type === 'image' && msg.content && (
                        <div className="max-w-xs">
                          <img 
                            src={msg.content} 
                            className="w-full max-h-48 object-cover rounded-xl shadow-lg border-2 border-black/5 cursor-pointer hover:scale-105 transition-transform" 
                            onClick={() => window.open(msg.content, '_blank')}
                            title="点击查看大图"
                          />
                        </div>
                      )}
                      {msg.type === 'video' && msg.content && <video src={msg.content} className="w-full rounded-xl shadow-lg border-2 border-black/5" controls loop muted autoPlay />}
                    </>
                  )}
                  {msg.role === 'assistant' && !msg.isGenerating && msg.content && (
                    <button onClick={() => addBlock(msg.type, msg.content)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all"><ArrowUpRight size={14} /> {t.projectToCanvas}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Feature Assembly Panel */}
          {sidebarTab === 'assembly' && (
            <div className="flex-1 overflow-y-auto p-4">
              <FeatureAssemblyPanel
                currentModel={modelConfig.image.modelId}
                currentProvider={modelConfig.image.provider}
                onFeatureChange={setSelectedFeatures}
                onMenuConfigChange={setCurrentMenuConfig}
                initialFeatures={selectedFeatures}
                initialMenuConfig={currentMenuConfig}
              />
            </div>
          )}

          {/* 曹操AI对话界面 */}
          {sidebarTab === 'caocao' && (
            <div className="flex-1 overflow-hidden">
              <CaocaoAIChat
                isVoiceActive={isCanvasVoiceActive}
                isGestureActive={isCanvasGestureActive}
                onVoiceToggle={setIsCanvasVoiceActive}
                onGestureToggle={setIsCanvasGestureActive}
                onCommand={(command) => {
                  console.log('[曹操AI] 执行指令:', command);
                  // 这里可以添加指令处理逻辑
                }}
                theme={theme}
                lang={lang}
                externalMessages={voiceMessages}
                isChatVoiceActive={isVoiceRecording}
                currentSidebarTab={sidebarTab}
              />
            </div>
          )}

          {/* Chat Input Area */}
          {sidebarTab === 'chat' && (
            <div className="p-8 border-t-2 border-black/5 bg-slate-50 dark:bg-black/20">
            
            {/* Model Selectors */}
            <div className="mb-4 space-y-3">
              {/* Text Model Selector */}
              {chatMode === 'text' && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    {lang === 'zh' ? '文本模型' : 'Text Model'}
                  </div>
                  <ModelSelector
                    generationType="text"
                    modelConfig={modelConfig}
                    selectedModelId={selectedTextModel}
                    onModelSelect={setSelectedTextModel}
                    theme={theme}
                    lang={lang}
                    className="w-full"
                  />
                </div>
              )}
              
              {/* Image Model Selector */}
              {chatMode === 'image' && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    {lang === 'zh' ? '图像模型' : 'Image Model'}
                  </div>
                  <div className="flex gap-2">
                    {/* 模型选择器 - 占用三分之二宽度 */}
                    <div className="flex-[2]">
                      <ModelSelector
                        generationType="image"
                        modelConfig={modelConfig}
                        selectedModelId={modelConfig.image.modelId}
                        onModelSelect={(modelId) => {
                          setModelConfig(prev => ({
                            ...prev,
                            image: { ...prev.image, modelId }
                          }));
                          // 保存到用户偏好，带错误处理
                          import('./utils/ModelPreferencesStorage').then(({ ModelPreferencesStorage }) => {
                            const success = ModelPreferencesStorage.setImageModelPreference(modelId);
                            if (!success) {
                              import('./services/ModelErrorHandler').then(({ ModelErrorHandler }) => {
                                const fallbackResult = ModelErrorHandler.handleStorageFailure('save', lang);
                                console.warn('[App] Image model preference save failed:', fallbackResult.reason);
                              });
                            }
                          });
                        }}
                        theme={theme}
                        lang={lang}
                        className="w-full"
                      />
                    </div>
                    
                    {/* 参数设置按钮 - 占用三分之一宽度 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleOpenParameterPanel('image', modelConfig.image.modelId)}
                        className="w-full h-[44px] p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                        title={lang === 'zh' ? '图像参数设置' : 'Image Parameters'}
                      >
                        <Settings size={14} />
                        <span className="hidden sm:inline">{lang === 'zh' ? '参数' : 'Params'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Video Model Selector */}
              {chatMode === 'video' && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    {lang === 'zh' ? '视频模型' : 'Video Model'}
                  </div>
                  <div className="flex gap-2">
                    {/* 模型选择器 - 占用三分之二宽度 */}
                    <div className="flex-[2]">
                      <ModelSelector
                        generationType="video"
                        modelConfig={modelConfig}
                        selectedModelId={modelConfig.video.modelId}
                        onModelSelect={(modelId) => {
                          setModelConfig(prev => ({
                            ...prev,
                            video: { ...prev.video, modelId }
                          }));
                          // 保存到用户偏好，带错误处理
                          import('./utils/ModelPreferencesStorage').then(({ ModelPreferencesStorage }) => {
                            const success = ModelPreferencesStorage.setVideoModelPreference(modelId);
                            if (!success) {
                              import('./services/ModelErrorHandler').then(({ ModelErrorHandler }) => {
                                const fallbackResult = ModelErrorHandler.handleStorageFailure('save', lang);
                                console.warn('[App] Video model preference save failed:', fallbackResult.reason);
                              });
                            }
                          });
                        }}
                        theme={theme}
                        lang={lang}
                        className="w-full"
                      />
                    </div>
                    
                    {/* 参数设置按钮 - 占用三分之一宽度 */}
                    <div className="flex-1">
                      <button
                        onClick={() => handleOpenParameterPanel('video', modelConfig.video.modelId)}
                        className="w-full h-[44px] p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                        title={lang === 'zh' ? '视频参数设置' : 'Video Parameters'}
                      >
                        <Settings size={14} />
                        <span className="hidden sm:inline">{lang === 'zh' ? '参数' : 'Params'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Attachment Previews */}
            <div className="flex gap-4 mb-4 flex-wrap">
              {pendingChatImage && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-4 border-amber-500 shadow-xl animate-in zoom-in">
                  <img src={pendingChatImage} className="w-full h-full object-cover" />
                  <button onClick={() => setPendingChatImage(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-2xl p-1"><X size={10} /></button>
                </div>
              )}
              {pendingChatVideo && (
                <div className="relative w-32 h-20 rounded-xl overflow-hidden border-4 border-purple-500 shadow-xl animate-in zoom-in">
                  <video src={pendingChatVideo} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Video className="text-white" size={24} />
                  </div>
                  <button onClick={() => { setPendingChatVideo(null); setPendingChatFile(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-2xl p-1"><X size={10} /></button>
                </div>
              )}
              {pendingVideoUrl && (
                <div className="h-20 px-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center gap-3 animate-in slide-in-from-left">
                  <ExternalLink className="text-purple-500" size={18} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-purple-700">视频链接</span>
                    <span className="text-[8px] text-purple-600 max-w-[120px] truncate">{pendingVideoUrl}</span>
                  </div>
                  <button onClick={() => setPendingVideoUrl(null)} className="bg-red-500 text-white rounded-2xl p-1"><X size={10} /></button>
                </div>
              )}
              {pendingChatFile && !pendingChatVideo && !pendingVideoUrl && (
                <div className="h-20 px-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center gap-3 animate-in slide-in-from-left">
                  <FileText className="text-blue-500" size={18} />
                  <span className="text-[9px] font-black uppercase text-blue-700 max-w-[80px] truncate">{pendingChatFile.name}</span>
                  <button onClick={() => setPendingChatFile(null)} className="bg-red-500 text-white rounded-2xl p-1"><X size={10} /></button>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 mb-2 p-1 rounded-2xl w-fit ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
              {(['text', 'image', 'video'] as BlockType[]).map(mode => (
                <button key={mode} onClick={() => { 
                  setChatMode(mode); 
                  // Exit assistant mode when switching to non-text modes
                  if (mode !== 'text' && isAssistantMode) {
                    setIsAssistantMode(false);
                  }
                }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${chatMode === mode ? (theme === 'dark' ? 'bg-slate-700 shadow-md text-amber-400' : 'bg-white shadow-md text-amber-600') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}`}>
                   {mode === 'text' ? t.addText.split('模块')[0] : mode === 'image' ? t.addImage.split('模块')[0] : t.addVideo.split('模块')[0]}
                </button>
              ))}
              {/* Preset Prompt Button */}
              <PresetPromptButton
                selectedPrompt={getSelectedPromptContent()}
                selectedPromptIndex={selectedPromptIndex}
                onOpenModal={handleOpenPresetPromptModal}
                theme={theme}
                lang={lang}
              />
            </div>

            <div className="relative">
              {/* Preset Prompt Active Indicator */}
              {getSelectedPromptContent() && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase rounded-full shadow-lg flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  {lang === 'zh' ? '预设提示词已激活' : 'PRESET PROMPT ACTIVE'}
                </div>
              )}
              <textarea rows={5} value={sidebarInput} onChange={e => setSidebarInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSidebarSend())} placeholder={t.inputPlaceholder} className="w-full p-4 bg-transparent outline-none text-lg font-bold resize-none scrollbar-hide pr-20 border-2 border-amber-500/30 rounded-[2rem] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all duration-300" />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                 {/* Clear Chat Button */}
                 <button onClick={() => setMessages([])} className="p-3 text-slate-400 hover:text-red-500 transition-colors" title={t.ctxClear}><Eraser size={22} /></button>
                 <button onClick={() => chatImageInputRef.current?.click()} className="p-3 text-slate-400 hover:text-emerald-500 transition-colors" title={t.tips.upload}><ImagePlus size={22} /></button>
                 <button onClick={() => chatTextInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-500 transition-colors" title={chatMode === 'text' && modelCapabilityDetector.isVideoUploadEnabled(chatMode, modelConfig) ? (lang === 'zh' ? '上传文件或视频' : 'Upload File or Video') : (lang === 'zh' ? '上传文件' : 'Upload File')}><Paperclip size={22} /></button>
                 {/* Voice Input Button - Voice to Text Input */}
                 <button 
                   onClick={toggleVoiceRecording}
                   disabled={!recognition || sidebarTab !== 'chat' || isCanvasVoiceActive}
                   className={`p-3 transition-colors ${
                     isVoiceRecording 
                       ? 'text-red-500 animate-pulse' 
                       : (sidebarTab !== 'chat' || isCanvasVoiceActive)
                         ? 'text-gray-300 cursor-not-allowed'
                         : 'text-purple-500 hover:text-purple-600'
                   } ${!recognition ? 'opacity-50 cursor-not-allowed' : ''}`}
                   title={
                     !recognition 
                       ? (lang === 'zh' ? '浏览器不支持语音输入' : 'Browser does not support voice input')
                       : sidebarTab !== 'chat'
                         ? (lang === 'zh' ? '请切换到聊天标签页使用语音转文字' : 'Switch to Chat tab to use voice-to-text')
                         : isCanvasVoiceActive
                           ? (lang === 'zh' ? '曹操语音控制正在使用中' : 'Caocao voice control is active')
                           : isVoiceRecording 
                             ? (lang === 'zh' ? '常驻监听中，点击停止或停止说话3秒自动提交' : 'Continuous listening, click to stop or auto-submit after 3s silence')
                             : (lang === 'zh' ? '语音转文字（常驻模式）' : 'Voice to text (continuous mode)')
                   }
                 >
                   {isVoiceRecording ? (
                     <span className="text-xl">🔴</span>
                   ) : (
                     <span className="text-xl">🎤</span>
                   )}
                 </button>
                 <button onClick={handleSidebarSend} className="p-4 bg-slate-900 text-amber-400 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg"><Send size={24} fill="currentColor" /></button>
              </div>
            </div>
          </div>
          )}

        </aside>
      )}

      {/* Batch Video Modal */}
      {showBatchVideoModal && (
        <BatchVideoModal
          selectedBlocks={blocks.filter(b => selectedIds.includes(b.id))}
          onStartBatch={handleStartBatch}
          onClose={() => setShowBatchVideoModal(false)}
          onMinimize={handleMinimizeProgress}
          theme={theme}
          lang={lang}
        />
      )}

      {/* Export Layout Selector Modal */}
      {showExportModal && (
        <ExportLayoutSelector
          blocks={blocks.filter(b => selectedIds.includes(b.id))}
          onExport={handleExportStoryboard}
          onClose={() => setShowExportModal(false)}
          theme={theme}
          lang={lang}
        />
      )}

      {/* Preset Prompt Modal */}
      {showPresetPromptModal && (
        <PresetPromptModal
          isOpen={showPresetPromptModal}
          prompts={presetPrompts}
          selectedPromptIndex={selectedPromptIndex}
          onClose={handleClosePresetPromptModal}
          onSave={handleSavePresetPrompts}
          onSelect={handleSelectPresetPrompt}
          theme={theme}
          lang={lang}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManager
          isOpen={showTemplateManager}
          onClose={handleCloseTemplateManager}
          currentCanvas={getCurrentCanvasState()}
          onLoadTemplate={handleLoadTemplate}
          lang={lang}
        />
      )}

      {/* Parameter Panel Modal */}
      {showParameterPanel && (
        <ParameterPanel
          isOpen={showParameterPanel}
          onClose={handleCloseParameterPanel}
          selectedModel={parameterPanelModel}
          generationType={parameterPanelType}
          onParametersChange={handleParametersChange}
          theme={theme}
          lang={lang}
        />
      )}
      
      {/* Automation Control Panel */}
      <AutomationControlPanel
        isAutomationTemplate={isAutomationTemplate}
        onBatchInputConfig={handleBatchInputConfig}
        onStartExecution={handleStartAutomationExecution}
        onPauseExecution={handlePauseAutomationExecution}
        onStopExecution={handleStopAutomationExecution}
        executionProgress={autoExecutionProgress}
        lang={lang}
        batchInputSource={batchInputSource}
        onConfigUpdate={(config) => {
          // 更新自动执行服务的配置
          autoExecutionService.updateConfig({
            mode: config.executionMode as any,
            customInterval: config.customInterval,
            enableSmartInterval: config.enableSmartInterval
          });
          // 更新 App 组件中的结果处理状态
          // 移除自动选择逻辑，严格遵循用户选择
          setResultHandling(config.resultHandling);
          setDownloadPath(config.downloadPath);
        }}
      />
      

      
      {/* Batch Input Configuration Modal */}
      {showBatchInputConfig && (
        <BatchInputConfigModal
          isOpen={showBatchInputConfig}
          onCancel={handleBatchInputConfigCancel}
          onConfigComplete={handleBatchInputConfigComplete}
          lang={lang}
        />
      )}

      {/* Minimized Progress Window */}
      {batchState && isProgressMinimized && (
        <MinimizedProgressWindow
          current={batchState.current}
          total={batchState.total}
          status={batchState.status}
          onClick={handleRestoreProgress}
          theme={theme}
        />
      )}

      {/* Character Management Panel */}
      <CharacterPanel
        isOpen={isCharacterPanelOpen}
        onClose={() => setIsCharacterPanelOpen(false)}
        onCharacterSelect={(character) => {
          setSelectedCharacter(character);
          setIsCharacterPanelOpen(false);
          
          // 加载所有角色到blocks中
          const allCharacters = characterService.getAllCharacters().filter(c => c.status === 'ready');
          setBlocks(prevBlocks => 
            prevBlocks.map(block => ({
              ...block,
              availableCharacters: allCharacters
            }))
          );
          
          // 提示用户角色已选择
          alert(lang === 'zh' 
            ? `已选择角色：${character.username}\n\n在视频提示词中使用 @(${character.username}) 来引用此角色`
            : `Character selected: ${character.username}\n\nUse @(${character.username}) in your video prompt to reference this character`
          );
        }}
        selectedCharacter={selectedCharacter}
        theme={theme}
        lang={lang}
        shenmaService={aiServiceAdapter.getShenmaService()}
      />

      {/* Canvas Voice Controller - 语音控制器 */}
      <CanvasVoiceController
        onCommand={handleCanvasVoiceCommand}
        lang={lang}
        wakeWord={wakeWord}
        position={{ x: 20, y: 20 }}
        theme={theme}
        isActive={isCanvasVoiceActive}
        blocks={blocks}
        onModuleAction={handleModuleAction}
        apiSettings={{
          provider: modelConfig.text.provider,
          apiKey: modelConfig.providers[modelConfig.text.provider]?.apiKey || '',
          baseUrl: modelConfig.providers[modelConfig.text.provider]?.baseUrl || ''
        }}
        onMessage={(role, content, type) => {
          // 通过CaocaoAIChat显示语音消息
          console.log('[App] 收到语音消息:', { role, content, type });
          
          const newMessage = {
            id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: role as 'user' | 'assistant',
            content,
            type: type || 'voice',
            timestamp: Date.now()
          };
          
          setVoiceMessages(prev => [...prev, newMessage]);
          
          // 自动切换到曹操AI标签页显示消息
          if (sidebarTab !== 'caocao') {
            setSidebarTab('caocao');
          }
        }}
        onStatusChange={(status, message) => {
          // 处理语音控制状态变化
          console.log('[App] 语音控制状态变化:', { status, message });
        }}
        onDisplayMessageUpdate={(addMessage) => {
          // 将addMessage函数保存，以便外部可以调用
          // 这里可以通过ref或其他方式保存
          console.log('[App] 收到显示消息更新函数');
        }}
      />

      {/* Canvas Gesture Controller - 位于右侧侧边栏左上角 */}
      {isCanvasGestureActive && (
        <CanvasGestureController
          isActive={isCanvasGestureActive}
          onToggle={setIsCanvasGestureActive}
          onGestureCommand={handleGestureCommand}
          position="sidebar-top"
          theme={theme}
          lang={lang}
          showSidebar={showSidebar}
          sidebarWidth={sidebarWidth}
        />
      )}

      {/* Voice Command Help */}
      <VoiceCommandHelp
        isOpen={showVoiceHelp}
        onClose={() => setShowVoiceHelp(false)}
        lang={lang}
      />

      {/* Gesture Help */}
      <GestureHelp
        isOpen={showGestureHelp}
        onClose={() => setShowGestureHelp(false)}
        lang={lang}
      />

      {/* Canvas Toast Messages */}
      <CanvasToast
        messages={toastMessages}
        onRemove={removeToast}
        theme={theme}
      />

      {/* Canvas Confirm Dialog */}
      <CanvasConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        theme={theme}
      />

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        currentLang={lang}
      />

    </div>
  );
};

export default App;
