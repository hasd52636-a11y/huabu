
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Image as ImageIcon, Video, Settings, Sun, Moon, Zap, 
  MessageSquare, LayoutGrid, X, Key, Upload, Cpu, HelpCircle, Save, FilePlus, Paperclip, Eraser, Copy, Check,
  Trash2, Layers, Languages, Globe, RotateCcw, MonitorX, Send, Play, Download,
  Type as TextIcon, BrainCircuit, Sparkles, ChevronLeft, ChevronRight, ImagePlus, FileText, Info, Loader2, ArrowUpRight,
  ChevronDown, Database, Sliders, ExternalLink, ShieldCheck, ListOrdered
} from 'lucide-react';
import { Block, Connection, BlockType, ModelConfig, ProviderType, BatchConfig, BatchGenerationState, ExportLayout, FrameData, PresetPrompt } from './types';
import Canvas from './components/Canvas';
import BatchVideoModal from './components/BatchVideoModal';
import MinimizedProgressWindow from './components/MinimizedProgressWindow';
import ExportLayoutSelector from './components/ExportLayoutSelector';
import APIProviderConfig from './components/APIProviderConfig';
import PresetPromptButton from './components/PresetPromptButton';
import PresetPromptModal from './components/PresetPromptModal';
import { aiService } from './services/geminiService';
import { MultiProviderAIService } from './adapters/AIServiceAdapter';
import { BatchProcessor } from './services/BatchProcessor';
import { ExportService } from './services/ExportService';
import { loadPresetPrompts, savePresetPrompts } from './services/PresetPromptStorage';
import { COLORS, I18N, MIN_ZOOM, MAX_ZOOM } from './constants';

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarInput, setSidebarInput] = useState('');
  const [chatMode, setChatMode] = useState<BlockType>('text');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, blockId?: string } | null>(null);

  // Attachments State
  const [pendingChatImage, setPendingChatImage] = useState<string | null>(null);
  const [pendingChatFile, setPendingChatFile] = useState<{ name: string, content: string } | null>(null);

  // New functionality state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchVideoModal, setShowBatchVideoModal] = useState(false);
  const [batchState, setBatchState] = useState<BatchGenerationState | undefined>();
  const [isProgressMinimized, setIsProgressMinimized] = useState(false);
  const [aiServiceAdapter] = useState(() => new MultiProviderAIService());
  const [batchProcessor] = useState(() => new BatchProcessor());
  const [exportService] = useState(() => new ExportService());

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    text: { provider: 'google', modelId: 'gemini-3-flash-preview' },
    image: { provider: 'google', modelId: 'gemini-3-pro-image-preview' },
    video: { provider: 'google', modelId: 'veo-3.1-fast-generate-preview' }
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
          <pre key={lineIndex} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto">
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
              className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono"
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

  useEffect(() => {
    const saved = localStorage.getItem('creative-flow-master-config');
    if (saved) setModelConfig(JSON.parse(saved));
    
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

  const saveMasterConfig = () => {
    localStorage.setItem('creative-flow-master-config', JSON.stringify(modelConfig));
    setShowConfig(false);
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

  const handleGenerate = async (blockId: string, prompt: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'processing' } : b));
    try {
      const parts: any[] = [];
      const idMatches = prompt.match(/\[([A-Z]\d+)\]/g) || [];
      const uniqueIds = Array.from(new Set(idMatches.map(m => m.replace(/[\[\]]/g, ''))));
      uniqueIds.forEach(num => {
        const refBlock = blocks.find(b => b.number === num);
        if (refBlock && refBlock.content) {
          if (refBlock.type === 'text') parts.push({ text: `[${num}] content: "${refBlock.content}"\n` });
          else if (refBlock.type === 'image') {
            const base64Data = refBlock.content.split(',')[1];
            const mimeType = refBlock.content.split(';')[0].split(':')[1];
            parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
          }
        }
      });
      parts.push({ text: `\nUser Instruction: ${prompt}` });
      
      let result = '';
      if (block.type === 'text') result = await aiServiceAdapter.generateText({ parts }, modelConfig.text);
      else if (block.type === 'image') result = await aiServiceAdapter.generateImage({ parts }, modelConfig.image);
      else result = await aiServiceAdapter.generateVideo(prompt, modelConfig.video);
      
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: result, status: 'idle' } : b));
    } catch (err) {
      console.error(err);
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, status: 'error' } : b));
    }
  };

  const handleSidebarSend = async () => {
    if (!sidebarInput.trim() && !pendingChatImage && !pendingChatFile) return;
    const inputText = sidebarInput;
    const currentMode = chatMode;
    const inputImage = pendingChatImage;
    const inputFile = pendingChatFile;
    const selectedPresetPrompt = getSelectedPromptContent();

    setSidebarInput('');
    setPendingChatImage(null);
    setPendingChatFile(null);

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
      attachmentName: inputFile?.name || (inputImage ? "Image" : undefined),
      attachmentContent: inputFile?.content || inputImage || undefined,
      timestamp: new Date().toLocaleTimeString() 
    };
    setMessages(prev => [...prev, userMsg]);
    
    const assistantMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', type: currentMode, content: '', timestamp: new Date().toLocaleTimeString(), isGenerating: true }]);
    
    try {
      const settings = currentMode === 'text' ? modelConfig.text : currentMode === 'image' ? modelConfig.image : modelConfig.video;
      let result = '';
      
      const parts: any[] = [];
      if (inputImage) {
        const base64Data = inputImage.split(',')[1];
        const mimeType = inputImage.split(';')[0].split(':')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
      }
      if (inputFile) {
        parts.push({ text: `Context from ${inputFile.name}:\n${inputFile.content}\n` });
      }
      // Use final message with preset prompt for AI generation
      parts.push({ text: finalMessage });

      if (currentMode === 'text') result = await aiServiceAdapter.generateText({ parts }, settings);
      else if (currentMode === 'image') result = await aiServiceAdapter.generateImage({ parts }, settings);
      else result = await aiServiceAdapter.generateVideo(finalMessage, settings);
      
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: result, isGenerating: false } : msg));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: "Generation failed.", isGenerating: false } : msg));
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

  const addBlock = (type: BlockType, initialContent: string = '', x?: number, y?: number) => {
    const prefix = type === 'text' ? 'A' : type === 'image' ? 'B' : 'V';
    const idNum = String(blocks.filter(b => b.type === type).length + 1).padStart(2, '0');
    const newBlock: Block = {
      id: crypto.randomUUID(), type, x: x || 1000, y: y || 800, width: 500, height: 350,
      content: initialContent, status: 'idle', number: `${prefix}${idNum}`,
      fontSize: type === 'text' ? 24 : undefined
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Batch processing handlers
  const handleStartBatch = async (config: BatchConfig, videoPrompts: Record<string, string>, txtFile?: File, selectedFrames?: FrameData[]) => {
    const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
    if (selectedBlocks.length === 0 && !txtFile) return;

    try {
      // Use the enhanced batch processor with minimization support
      if (txtFile) {
        // File-based processing
        await batchProcessor.startBatchProcessingEnhanced(
          { type: 'file', file: txtFile },
          config,
          modelConfig.video,
          selectedFrames || []
        );
      } else {
        // Block-based processing
        await batchProcessor.startBatchProcessingEnhanced(
          { type: 'blocks', blocks: selectedBlocks, videoPrompts },
          config,
          modelConfig.video,
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
    const selectedBlocks = blocks.filter(b => selectedIds.includes(b.id));
    if (selectedBlocks.length === 0) return;

    try {
      const exportUrl = await exportService.exportStoryboard(selectedBlocks, layout);
      
      // Download the exported image
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `storyboard-${layout}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export storyboard:', error);
    }
  };

  // Test API connection
  const handleTestConnection = async (provider: ProviderType): Promise<boolean> => {
    try {
      return await aiServiceAdapter.testConnection(provider);
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

  const handleSavePresetPrompts = (prompts: PresetPrompt[]) => {
    setPresetPrompts(prompts);
    savePresetPrompts(prompts, selectedPromptIndex);
  };

  const handleSelectPresetPrompt = (index: number) => {
    const newIndex = selectedPromptIndex === index ? null : index;
    setSelectedPromptIndex(newIndex);
    savePresetPrompts(presetPrompts, newIndex);
  };

  const getSelectedPromptContent = (): string | null => {
    if (selectedPromptIndex !== null && presetPrompts[selectedPromptIndex]) {
      return presetPrompts[selectedPromptIndex].content;
    }
    return null;
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <input type="file" ref={chatImageInputRef} className="hidden" accept="image/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setPendingChatImage(event.target?.result as string);
          reader.readAsDataURL(file);
        }
      }} />
      <input type="file" ref={chatTextInputRef} className="hidden" accept=".txt,.md,.js,.ts,.tsx,.json,.css,.html" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setPendingChatFile({ name: file.name, content: event.target?.result as string });
          reader.readAsText(file);
        }
      }} />

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
          <button onClick={() => { autoLayout(); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <ListOrdered size={18} className="text-amber-500" />
            <span className="text-sm font-bold">{t.ctxAutoLayout}</span>
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-4 transition-colors">
            <RotateCcw size={18} className="text-slate-400" />
            <span className="text-sm font-bold">{t.ctxReset}</span>
          </button>
          <button onClick={() => { setBlocks([]); setConnections([]); setContextMenu(null); }} className="w-full px-6 py-4 text-left hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-4 text-red-500 transition-colors">
            <Eraser size={18} />
            <span className="text-sm font-bold">{t.ctxClear}</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-28 flex items-center justify-between px-16 z-[300] border-b-2 backdrop-blur-3xl ${theme === 'dark' ? 'bg-slate-900/80 border-white/5' : 'bg-white/80 border-black/5 shadow-sm'}`}>
        <div className="flex items-center gap-8">
           <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-3"><LayoutGrid size={28} strokeWidth={3} /></div>
           <h1 className="font-black text-2xl uppercase tracking-tighter">Creative <span className="text-amber-500">Center</span></h1>
        </div>

        <div className="flex items-center gap-6">
           <button 
            onClick={() => setShowConfig(true)} 
            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-amber-500/20 text-amber-500' : 'bg-white border-black/5 hover:shadow-xl text-amber-600'}`}
           >
             <Key size={24} strokeWidth={3} />
             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{t.api}</span>
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
                 <div className="mt-auto pt-10 border-t border-black/5">
                    <button onClick={saveMasterConfig} className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">{t.saveAndClose}</button>
                 </div>
              </div>

              <div className="flex-1 p-16 overflow-y-auto scrollbar-hide">
                 <div className="flex items-center justify-between mb-12">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">{t.configure} <span className="text-amber-500">{activeConfigTab} Engine</span></h2>
                    <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black flex items-center gap-2 border border-green-500/20"><ShieldCheck size={12} /> {t.active}</div>
                 </div>
                 
                 <APIProviderConfig
                   activeTab={activeConfigTab}
                   settings={modelConfig[activeConfigTab]}
                   onUpdateSettings={(updates) => setModelConfig({...modelConfig, [activeConfigTab]: {...modelConfig[activeConfigTab], ...updates}})}
                   onTestConnection={handleTestConnection}
                   theme={theme}
                   lang={lang}
                 />
              </div>
           </div>
        </div>
      )}

      {/* Toolbar (Left) */}
      <aside className={`fixed left-12 top-1/2 -translate-y-1/2 w-28 flex flex-col items-center py-16 gap-10 z-[300] border-2 rounded-[4rem] shadow-3xl backdrop-blur-3xl ${theme === 'dark' ? 'bg-slate-900/80 border-white/5' : 'bg-white/95 border-black/5'}`}>
        <button 
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} 
          className="w-16 h-16 bg-amber-500 text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-90 transition-all border-2 border-white/20 flex items-center justify-center font-black text-lg"
          title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
        >
          {lang === 'zh' ? 'EN' : '中'}
        </button>

        <div className="w-16 h-px bg-slate-300/30" />
        
        <button onClick={() => addBlock('text')} className="p-6 text-blue-500 hover:bg-blue-500/10 rounded-3xl transition-all" title={t.addText}><TextIcon size={28} /></button>
        <button onClick={() => addBlock('image')} className="p-6 text-emerald-500 hover:bg-emerald-500/10 rounded-3xl transition-all" title={t.addImage}><ImageIcon size={28} /></button>
        <button onClick={() => addBlock('video')} className="p-6 text-red-500 hover:bg-red-500/10 rounded-3xl transition-all" title={t.addVideo}><Video size={28} /></button>
        
        <div className="w-16 h-px bg-slate-300/30" />
        
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-6 text-slate-400 hover:text-amber-500 transition-all" title={t.ctxReset}><RotateCcw size={28} /></button>
      </aside>

      <main className="flex-1 h-full pt-28 pl-44" style={{ marginRight: showSidebar ? sidebarWidth : 0 }}>
        <Canvas 
          blocks={blocks} connections={connections} zoom={zoom} pan={pan} selectedIds={selectedIds} theme={theme} lang={lang} isPerfMode={false}
          onUpdateBlock={(id, upd) => setBlocks(prev => prev.map(b => b.id === id ? {...b, ...upd} : b))}
          onSelect={(id, multi) => setSelectedIds(multi ? (selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]) : [id])}
          onClearSelection={() => setSelectedIds([])}
          onDeleteBlock={(id) => setBlocks(prev => prev.filter(b => b.id !== id))}
          onConnect={(f, t) => setConnections(prev => [...prev, { id: crypto.randomUUID(), fromId: f, toId: t, instruction: "" }])}
          onGenerate={handleGenerate}
          onUpdateConnection={() => {}}
          onContextMenu={handleContextMenu}
          onUpdatePan={setPan}
        />
      </main>

      {showSidebar && (
        <aside style={{ width: sidebarWidth }} className={`fixed right-0 top-28 bottom-0 flex flex-col z-[300] border-l-2 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-black/5'}`}>
          <div onMouseDown={startResizing} className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/20 z-[310]" />
          <div className="p-8 border-b-2 border-black/5 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><BrainCircuit className="text-amber-500" /> <h2 className="font-black text-lg uppercase tracking-widest">{t.aiAssistant}</h2></div>
                <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400"><X size={20} /></button>
             </div>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Sparkles size={64} className="text-amber-500 mb-6" />
                <p className="font-bold text-sm leading-relaxed">{t.blockPlaceholder}</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[95%] p-6 rounded-[2rem] shadow-xl border-2 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
                  {msg.attachmentName && msg.role === 'user' && (
                    <div className="mb-3 px-3 py-1 bg-white/10 rounded-lg border border-white/5 text-[9px] font-black uppercase flex items-center gap-2">
                      {msg.attachmentContent?.startsWith('data:image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                      <span className="truncate max-w-[150px]">{msg.attachmentName}</span>
                    </div>
                  )}
                  {msg.isGenerating ? <div className="flex items-center gap-4 py-2"><Loader2 className="animate-spin" /> {t.thinking}</div> : (
                    <>
                      {msg.type === 'text' && (
                        <div className="text-sm">
                          {formatText(msg.content)}
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

          <div className="p-8 border-t-2 border-black/5 bg-slate-50 dark:bg-black/20">
            {/* Attachment Previews */}
            <div className="flex gap-4 mb-4 flex-wrap">
              {pendingChatImage && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-4 border-amber-500 shadow-xl animate-in zoom-in">
                  <img src={pendingChatImage} className="w-full h-full object-cover" />
                  <button onClick={() => setPendingChatImage(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10} /></button>
                </div>
              )}
              {pendingChatFile && (
                <div className="h-20 px-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center gap-3 animate-in slide-in-from-left">
                  <FileText className="text-blue-500" size={18} />
                  <span className="text-[9px] font-black uppercase text-blue-700 max-w-[80px] truncate">{pendingChatFile.name}</span>
                  <button onClick={() => setPendingChatFile(null)} className="bg-red-500 text-white rounded-full p-1"><X size={10} /></button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6 p-1 bg-black/5 rounded-2xl w-fit">
              {(['text', 'image', 'video'] as BlockType[]).map(mode => (
                <button key={mode} onClick={() => setChatMode(mode)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${chatMode === mode ? 'bg-white shadow-md text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
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

            <div className="relative p-2 rounded-[2.5rem] border-2 border-black/10 bg-white dark:bg-slate-800 focus-within:ring-8 focus-within:ring-amber-500/5 transition-all shadow-xl">
              {/* Preset Prompt Active Indicator */}
              {getSelectedPromptContent() && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase rounded-full shadow-lg flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  {lang === 'zh' ? '预设提示词已激活' : 'PRESET PROMPT ACTIVE'}
                </div>
              )}
              <textarea rows={3} value={sidebarInput} onChange={e => setSidebarInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSidebarSend())} placeholder={t.inputPlaceholder} className="w-full p-4 bg-transparent outline-none text-lg font-bold resize-none scrollbar-hide pr-20" />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                 {/* Clear Chat Button restored next to other attachment tools */}
                 <button onClick={() => setMessages([])} className="p-3 text-slate-400 hover:text-red-500 transition-colors" title={t.ctxClear}><Eraser size={22} /></button>
                 <button onClick={() => chatImageInputRef.current?.click()} className="p-3 text-slate-400 hover:text-emerald-500 transition-colors" title={t.tips.upload}><ImagePlus size={22} /></button>
                 <button onClick={() => chatTextInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-500 transition-colors" title={t.tips.upload}><Paperclip size={22} /></button>
                 <button onClick={handleSidebarSend} className="p-4 bg-slate-900 text-amber-400 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg"><Send size={24} fill="currentColor" /></button>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default App;
