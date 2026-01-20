
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Block, Connection, EnhancedConnection, Character, MultiImageConfig, ImageInput, ShenmaImageEditOptions, NewModelConfig, convertNewToLegacyConfig, MenuConfig } from '../types';
import BlockComponent from './BlockComponent';
import VirtualizedCanvas from './VirtualizedCanvas';

import { COLORS, SNAP_SIZE, I18N } from '../constants.tsx';
import { connectionEngine } from '../services/ConnectionEngine';
import { AutoExecutor } from '../services/AutoExecutor';
import { TemplateManager } from '../services/TemplateManager';
import { StateManager } from '../services/StateManager';
import { ResourceManager } from '../services/ResourceManager';
import { performanceOptimizationSystem } from '../services/PerformanceOptimizationSystem';
import { ScheduleManager } from './ScheduleManager';
import PromptPreviewPopover from './PromptPreviewPopover';
import MultiImageConfigModal from './MultiImageConfigModal';
import ImageEditModal from './ImageEditModal';
import { X, UserX, Users, UserPlus, Eye, Grid3X3, Zap, ZapOff } from 'lucide-react';

interface CanvasProps {
  blocks: Block[];
  connections: Connection[];
  zoom: number;
  pan: { x: number; y: number };
  selectedIds: string[];
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isPerfMode: boolean;
  isAutomationTemplate?: boolean;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onSelect: (id: string, isMulti: boolean) => void;
  onClearSelection: () => void;
  onDeleteBlock: (id: string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onGenerate: (id: string, prompt: string) => void;
  onMultiImageGenerate?: (sourceBlock: Block, config: MultiImageConfig) => void;
  onUpdateConnection: (id: string, instruction: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUpdatePan: (updates: { x: number; y: number }) => void;
  onCreateBlock?: (blockData: Partial<Block>, x: number, y: number) => void;
  // Prompt resolution
  onResolvePrompt?: (prompt: string, blockId: string) => {
    original: string;
    resolved: string;
    references: Array<{ blockNumber: string; content: string; found: boolean; type: string }>;
  };
  // Character-related props
  availableCharacters?: Character[];
  onCharacterSelect?: (blockId: string, character: Character | null) => void;
  onOpenCharacterPanel?: () => void;
  // Image-related props
  onMultiImageGenerate?: (sourceBlock: Block, config: MultiImageConfig) => void;
  onOpenSmearRemovalModal?: (imageUrl: string) => void;
  // Model configuration for AI services
  modelConfig: NewModelConfig;
  // Menu configuration for dynamic menus
  menuConfig?: MenuConfig;
}

const Canvas: React.FC<CanvasProps> = ({
  blocks,
  connections,
  zoom,
  pan,
  selectedIds,
  theme,
  lang,
  isPerfMode,
  isAutomationTemplate,
  onUpdateBlock,
  onSelect,
  onClearSelection,
  onDeleteBlock,
  onConnect,
  onGenerate,
  onMultiImageGenerate,
  onUpdateConnection,
  onContextMenu,
  onUpdatePan,
  onCreateBlock,
  onResolvePrompt,
  availableCharacters = [],
  onCharacterSelect,
  onOpenCharacterPanel,
  onOpenSmearRemovalModal,
  modelConfig,
  menuConfig
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragInfo, setDragInfo] = useState<{ blockId: string; startX: number; startY: number; initX: number; initY: number } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{ blockId: string; startX: number; startY: number; initW: number; initH: number } | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<{ blockId: string; type: 'in' | 'out'; mouseX: number; mouseY: number } | null>(null);
  const [isPanning, setIsPanning] = useState<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);
  
  // Performance optimization state
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Character selector state
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // Image preview state
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedPreviewBlockId, setSelectedPreviewBlockId] = useState<string | null>(null);
  
  // Multi-image generation state
  const [showMultiImageModal, setShowMultiImageModal] = useState(false);
  const [selectedMultiImageBlockId, setSelectedMultiImageBlockId] = useState<string | null>(null);
  
  // Image editing state
  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [selectedImageEditBlockId, setSelectedImageEditBlockId] = useState<string | null>(null);
  
  // Automation state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [showAutomationControls, setShowAutomationControls] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [showBatchInput, setShowBatchInput] = useState(false);
  
  // Initialize automation services
  const autoExecutor = useMemo(() => new AutoExecutor(), []);
  const templateManager = useMemo(() => new TemplateManager(), []);
  const stateManager = useMemo(() => new StateManager(), []);
  const resourceManager = useMemo(() => new ResourceManager(), []);

  // Performance optimization: Auto-enable virtualization for large canvases
  useEffect(() => {
    const shouldUseVirtualization = blocks.length > 50 || isPerfMode;
    setUseVirtualization(shouldUseVirtualization);
    
    // Update performance metrics
    performanceOptimizationSystem.getMetrics();
  }, [blocks.length, isPerfMode]);

  // Track container dimensions for virtualization
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      performanceOptimizationSystem.destroy();
    };
  }, []);

  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  // Snapping logic: find the closest anchor of the opposite type
  const snapTarget = useMemo(() => {
    if (!activeAnchor) return null;
    const targetType = activeAnchor.type === 'out' ? 'in' : 'out';
    
    // Threshold in screen pixels (40px feels right for magnets)
    const screenThreshold = 40;
    const canvasThreshold = screenThreshold / zoom;

    let closest = null;
    let minDist = canvasThreshold;

    for (const block of blocks) {
      if (block.id === activeAnchor.blockId) continue;
      
      const anchorX = targetType === 'in' ? block.x - block.width / 2 : block.x + block.width / 2;
      const anchorY = block.y;
      
      const dist = Math.sqrt(Math.pow(activeAnchor.mouseX - anchorX, 2) + Math.pow(activeAnchor.mouseY - anchorY, 2));
      
      if (dist < minDist) {
        minDist = dist;
        closest = { blockId: block.id, type: targetType, x: anchorX, y: anchorY };
      }
    }
    return closest;
  }, [activeAnchor, blocks, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    onClearSelection();
    setIsPanning({
      startX: e.clientX,
      startY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - isPanning.startX;
      const dy = e.clientY - isPanning.startY;
      onUpdatePan({
        x: isPanning.initPanX + dx,
        y: isPanning.initPanY + dy
      });
      return;
    }

    if (dragInfo) {
      const dx = (e.clientX - dragInfo.startX) / zoom;
      const dy = (e.clientY - dragInfo.startY) / zoom;
      onUpdateBlock(dragInfo.blockId, { 
        x: Math.round((dragInfo.initX + dx) / SNAP_SIZE) * SNAP_SIZE, 
        y: Math.round((dragInfo.initY + dy) / SNAP_SIZE) * SNAP_SIZE 
      });
      return;
    }

    if (resizeInfo) {
      const dx = (e.clientX - resizeInfo.startX) / zoom;
      const dy = (e.clientY - resizeInfo.startY) / zoom;
      onUpdateBlock(resizeInfo.blockId, { 
        width: Math.max(200, resizeInfo.initW + dx), 
        height: Math.max(150, resizeInfo.initH + dy) 
      });
      return;
    }

    if (activeAnchor) {
      const coords = getCanvasCoords(e);
      setActiveAnchor(prev => prev ? { ...prev, mouseX: coords.x, mouseY: coords.y } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeAnchor && snapTarget) {
      const fromId = activeAnchor.type === 'out' ? activeAnchor.blockId : snapTarget.blockId;
      const toId = activeAnchor.type === 'in' ? activeAnchor.blockId : snapTarget.blockId;
      onConnect(fromId, toId);
    }
    setActiveAnchor(null);
    setDragInfo(null);
    setResizeInfo(null);
    setIsPanning(null);
  };

  // Automation control functions
  const handleAutoExecute = async () => {
    if (isExecuting) {
      // Get current execution ID and pause it
      setIsExecuting(false);
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionProgress(0);

      // Create canvas state object
      const canvasState = {
        blocks,
        connections: connections as EnhancedConnection[],
        settings: { zoom, pan }
      };

      // Start progress tracking
      const progressInterval = setInterval(() => {
        // Get current execution status from autoExecutor if available
        // For now, we'll simulate progress until we get real progress from AutoExecutor
        setExecutionProgress(prev => {
          if (prev < 90) return prev + 5; // Slow progress until completion
          return prev; // Stay at 90% until actual completion
        });
      }, 1000);

      // Execute workflow with real progress tracking
      const result = await autoExecutor.executeWorkflow(canvasState);
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Apply execution results back to canvas blocks
      if (result.status === 'completed' || result.status === 'failed') {
        result.results.forEach(blockResult => {
          if (blockResult.status === 'completed' && blockResult.output) {
            // Find the block by ID and update its content
            const block = blocks.find(b => b.id === blockResult.blockId);
            if (block) {
              console.log(`Updating block ${block.number} with generated content:`, blockResult.output.substring(0, 100) + '...');
              
              // Update block content with the generated result
              onUpdateBlock(blockResult.blockId, {
                content: blockResult.output,
                status: 'idle',
                // Update metadata based on block type
                ...(block.type === 'image' && {
                  imageMetadata: {
                    ...block.imageMetadata,
                    generatedAt: Date.now()
                  }
                }),
                ...(block.type === 'video' && {
                  videoMetadata: {
                    ...block.videoMetadata,
                    generatedAt: Date.now()
                  }
                })
              });
            }
          } else if (blockResult.status === 'failed') {
            // Update block status to show error
            const block = blocks.find(b => b.id === blockResult.blockId);
            if (block) {
              console.error(`Block ${block.number} execution failed:`, blockResult.error);
              onUpdateBlock(blockResult.blockId, {
                status: 'error'
              });
            }
          }
        });
      }
      
      // Update progress to 100% and stop execution
      setExecutionProgress(100);
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionProgress(0);
      }, 1000);
      
      console.log('Workflow execution completed:', result);
    } catch (error) {
      console.error('Auto execution failed:', error);
      setIsExecuting(false);
      setExecutionProgress(0);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const canvasState = {
        blocks,
        connections: connections as EnhancedConnection[],
        settings: { zoom, pan }
      };
      
      const template = await templateManager.saveTemplate(
        canvasState,
        `AI Video Production Pipeline - ${new Date().toLocaleString()}`,
        'Complete 6-module workflow for AI video production with script, character design, images, and video generation'
      );
      console.log('Template saved:', template.id);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const toggleAutomationControls = () => {
    setShowAutomationControls(!showAutomationControls);
  };

  const getConnectionColor = (from: Block) => {
    if (from.type === 'text') return COLORS.text.border;
    if (from.type === 'image') return COLORS.image.border;
    return COLORS.video.border;
  };

  // Character selector handlers
  const handleOpenCharacterSelector = (blockId: string) => {
    setSelectedBlockId(blockId);
    setShowCharacterSelector(true);
  };

  const handleCloseCharacterSelector = () => {
    setShowCharacterSelector(false);
    setSelectedBlockId(null);
  };

  const handleCharacterSelect = (character: Character | null) => {
    if (selectedBlockId && onCharacterSelect) {
      onCharacterSelect(selectedBlockId, character);
    }
    handleCloseCharacterSelector();
  };

  // Image preview handlers
  const handleOpenImagePreview = (blockId: string) => {
    setSelectedPreviewBlockId(blockId);
    setShowImagePreview(true);
  };

  const handleCloseImagePreview = () => {
    setShowImagePreview(false);
    setSelectedPreviewBlockId(null);
  };

  const handlePreviewRegenerate = (blockId: string, newPrompt?: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      const promptToUse = newPrompt || block.originalPrompt || '';
      if (promptToUse) {
        // Update prompt if changed
        if (newPrompt && newPrompt !== block.originalPrompt) {
          onUpdateBlock(blockId, { originalPrompt: newPrompt });
        }
        onGenerate(blockId, promptToUse);
      }
    }
    handleCloseImagePreview();
  };

  // Multi-image generation handlers
  const handleOpenMultiImageModal = (blockId: string) => {
    setSelectedMultiImageBlockId(blockId);
    setShowMultiImageModal(true);
  };

  const handleCloseMultiImageModal = () => {
    setShowMultiImageModal(false);
    setSelectedMultiImageBlockId(null);
  };

  const handleMultiImageGenerate = (blockId: string, config: MultiImageConfig) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && onMultiImageGenerate) {
      onMultiImageGenerate(block, config);
    }
    handleCloseMultiImageModal();
  };

  // Image editing handlers
  const handleOpenImageEditModal = (blockId: string) => {
    setSelectedImageEditBlockId(blockId);
    setShowImageEditModal(true);
  };

  const handleCloseImageEditModal = () => {
    setShowImageEditModal(false);
    setSelectedImageEditBlockId(null);
  };

  const handleImageEdit = async (images: ImageInput[], prompt: string, options: ShenmaImageEditOptions): Promise<void> => {
    console.log('Image edit request:', images, prompt, options);
    
    // Check if we have at least one image to edit
    if (images.length === 0) {
      console.error('No images provided for editing');
      handleCloseImageEditModal();
      return;
    }
    
    try {
      // Get the first image as the primary image to edit
      const primaryImage = images[0].source;
      
      // Convert image URLs to base64 if needed
      let imageToEdit: string = primaryImage;
      if (primaryImage.startsWith('http')) {
        // Download the image and convert to base64
        const response = await fetch(primaryImage);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        imageToEdit = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      // Create a service instance to call the AI service
      const aiService = new (await import('../adapters/AIServiceAdapter')).MultiProviderAIService();
      
      // Convert to legacy config format with correct API key
      const legacyConfig = convertNewToLegacyConfig(modelConfig);
      
      // Call the AI service to edit the image - correct parameter order: prompt, imageFile, options
      const result = await aiService.editImage(prompt, imageToEdit, legacyConfig.image);
      
      console.log('Image edit result:', result);
      
      // Update the block with the edited image
      if (selectedImageEditBlockId) {
        onUpdateBlock(selectedImageEditBlockId, { 
          content: result,
          status: 'idle',
          imageMetadata: {
            ...blocks.find(b => b.id === selectedImageEditBlockId)?.imageMetadata,
            editedAt: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('Image editing failed:', error);
      alert('图片编辑失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      handleCloseImageEditModal();
    }
  };

  // Performance toggle handler
  const toggleVirtualization = useCallback(() => {
    setUseVirtualization(!useVirtualization);
  }, [useVirtualization]);



  const renderConnections = () => {
    // Update connection engine with current connections
    connectionEngine.updateConnections(connections);
    
    return (
      <svg className="absolute inset-0 w-full h-full overflow-visible z-0">
        <defs>
          <marker id="arrow-head-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 L 2 5 Z" fill="currentColor" />
          </marker>
          {/* Data flow indicator marker */}
          <marker id="data-flow-indicator" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4" markerHeight="4">
            <circle cx="4" cy="4" r="2" fill="#22C55E" opacity="0.8" />
          </marker>
          {/* Arrow marker for instruction bubble */}
          <marker id="bubble-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="currentColor" />
          </marker>
        </defs>

        {connections.map(conn => {
          const fromBlock = blocks.find(b => b.id === conn.fromId);
          const toBlock = blocks.find(b => b.id === conn.toId);
          if (!fromBlock || !toBlock) return null;

          const enhanced = connectionEngine.getEnhancedConnection(conn.id);
          const hasDataFlow = enhanced?.dataFlow.enabled && enhanced?.dataFlow.lastData;

          const startX = fromBlock.x + fromBlock.width / 2;
          const startY = fromBlock.y;
          const endX = toBlock.x - toBlock.width / 2;
          const endY = toBlock.y;
          const color = getConnectionColor(fromBlock);

          const dist = Math.abs(endX - startX);
          const tension = Math.min(300, Math.max(80, dist * 0.45));
          const path = `M ${startX} ${startY} C ${startX + tension} ${startY}, ${endX - tension} ${endY}, ${endX} ${endY}`;

          return (
            <g key={conn.id}>
              {/* Main connection line */}
              <path
                d={path}
                stroke={color}
                strokeWidth={3 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                markerEnd="url(#arrow-head-gold)"
                className={`connection-flow transition-opacity ${hasDataFlow ? 'opacity-80' : 'opacity-40'} hover:opacity-100`}
                style={{ color: color } as any}
                pointerEvents="none"
              />
              
              {/* Connection Instruction Text */}
              {conn.instruction && (
                <g className="cursor-pointer pointer-events-all">
                  {(() => {
                    // Calculate positions and values outside JSX
                    const shortInstruction = conn.instruction.substring(0, 8); // Truncate to first 8 characters
                    
                    // Calculate midpoint for regular mode
                    const midX = (startX + endX) / 2;
                    const midY = Math.min(startY, endY) - 20; // Position above the connection line
                    
                    if (isAutomationTemplate) {
                      // Automation Mode: Show instruction at output node right side, first 8 chars
                      
                      // Output node position - 更靠近模块边框
                      const outputX = fromBlock.x + fromBlock.width; // 模块右边缘
                      const outputY = fromBlock.y + 10; // 输出节点位置
                      
                      // 优化气泡尺寸
                      const bubbleWidth = 100 / zoom; // 稍微缩小宽度
                      const bubbleHeight = 24 / zoom; // 稍微缩小高度
                      
                      // 气泡更靠近模块边框 - 减少间距
                      const bubbleX = outputX + 8 / zoom; // 只有8px间距，更靠近
                      const bubbleY = outputY - bubbleHeight / 2;
                      
                      return (
                        <g>
                          {/* Instruction bubble - Ample padding, excellent visual balance */}
                          <rect
                            x={bubbleX}
                            y={bubbleY}
                            width={bubbleWidth}
                            height={bubbleHeight}
                            rx={bubbleHeight / 2}
                            fill={theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
                            stroke={color}
                            strokeWidth={1.5 / zoom}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                          />
                          
                          {/* Instruction text - perfectly centered with optimal spacing */}
                          <text
                            x={bubbleX + bubbleWidth / 2}
                            y={bubbleY + bubbleHeight / 2 + 4 / zoom}
                            fontSize={12 / zoom}
                            fill={theme === 'dark' ? '#e2e8f0' : '#1e293b'}
                            className="text-xs font-medium"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ userSelect: 'none' }}
                          >
                            {shortInstruction}
                          </text>
                        </g>
                      );
                    } else {
                      // Regular Mode: Show full instruction above connection
                      return (
                        <g>
                          {/* Background rect for better readability */}
                          <rect
                            x={midX - 80}
                            y={midY - 15}
                            width={160}
                            height={30}
                            rx={15}
                            fill={theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'}
                            stroke={color}
                            strokeWidth={1 / zoom}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                          />
                          {/* Instruction text */}
                          <text
                            x={midX}
                            y={midY + 5}
                            fontSize={12 / zoom}
                            fill={theme === 'dark' ? '#e2e8f0' : '#1e293b'}
                            className="text-xs font-medium"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ userSelect: 'none' }}
                          >
                            {conn.instruction}
                          </text>
                        </g>
                      );
                    }
                  })()}
                </g>
              )}
              
              {/* Data flow indicator */}
              {hasDataFlow && (
                <g>
                  {/* Animated data flow dots */}
                  <circle
                    r={2 / zoom}
                    fill="#22C55E"
                    opacity="0.8"
                    className="animate-pulse"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={path}
                    />
                  </circle>
                  
                  {/* Data type indicator near the target */}
                  <text
                    x={endX - 20}
                    y={endY - 10}
                    fontSize={10 / zoom}
                    fill="#22C55E"
                    className="text-xs font-mono"
                    textAnchor="middle"
                  >
                    {enhanced.dataFlow.dataType}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Dynamic Connection Preview Line */}
        {activeAnchor && (() => {
          const from = blocks.find(b => b.id === activeAnchor.blockId);
          if (!from) return null;
          
          // Start exactly at the chosen anchor point
          const sX = activeAnchor.type === 'out' ? from.x + from.width / 2 : from.x - from.width / 2;
          const sY = from.y;
          
          // If snapped, target is the snapTarget coordinates, otherwise the mouse coordinates
          const eX = snapTarget ? snapTarget.x : activeAnchor.mouseX;
          const eY = snapTarget ? snapTarget.y : activeAnchor.mouseY;
          
          const dist = Math.abs(eX - sX);
          const tension = dist * 0.45;
          const isForward = activeAnchor.type === 'out';

          return (
            <path
              d={`M ${sX} ${sY} C ${sX + (isForward ? tension : -tension)} ${sY}, ${eX + (isForward ? -tension : tension)} ${eY}, ${eX} ${eY}`}
              stroke={snapTarget ? "#22C55E" : COLORS.gold.primary}
              strokeWidth={4 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              fill="none"
              className="opacity-80"
            />
          );
        })()}
      </svg>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden canvas-grid ${resizeInfo ? 'cursor-nwse-resize' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e); }}
    >
      {/* Automation Mode Indicator */}
      {isAutomationTemplate && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-500/90 backdrop-blur-sm text-white rounded-full shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-bold">
            {lang === 'zh' ? '自动化模式' : 'Automation Mode'}
          </span>
        </div>
      )}

      {/* Performance Controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        
        {/* Performance Toggle */}
        {/* Performance Mode Button - Hidden from regular users */}
        {false && (
          <button
            onClick={toggleVirtualization}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
              useVirtualization
                ? 'bg-green-500 text-white hover:bg-green-600'
                : theme === 'dark'
                  ? 'bg-slate-800/90 text-white hover:bg-slate-700'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
            }`}
            title={lang === 'zh' ? '性能优化模式' : 'Performance Optimization Mode'}
          >
            {useVirtualization ? <Zap size={16} /> : <ZapOff size={16} />}
            <span>{lang === 'zh' ? '性能模式' : 'Perf Mode'}</span>
          </button>
        )}
      </div>
      {/* Automation Controls - Disabled to avoid duplicate with AutomationControlPanel */}
      {false && (
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={toggleAutomationControls}
          className={`px-3 py-2 rounded-3xl text-sm font-medium transition-all ${
            showAutomationControls
              ? 'bg-blue-600 text-white shadow-lg'
              : theme === 'dark'
                ? 'bg-slate-800/90 text-white hover:bg-slate-700 shadow-md'
                : 'bg-white/90 text-gray-700 hover:bg-white shadow-md'
          }`}
          title={lang === 'zh' ? '自动化控制' : 'Automation Controls'}
        >
          {lang === 'zh' ? '自动化' : 'Auto'}
        </button>

        {showAutomationControls && (
          <div className={`backdrop-blur-sm rounded-3xl shadow-xl p-4 min-w-[200px] border transition-all ${
            theme === 'dark' 
              ? 'bg-slate-800/95 border-white/10 text-white' 
              : 'bg-white/95 border-gray-200 text-gray-700'
          }`}>
            <div className="space-y-3">
              <button
                onClick={handleAutoExecute}
                disabled={blocks.length === 0}
                className={`w-full px-3 py-2 rounded-3xl text-sm font-medium transition-all ${
                  isExecuting
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed'
                }`}
              >
                {isExecuting 
                  ? (lang === 'zh' ? '暂停执行' : 'Pause')
                  : (lang === 'zh' ? '自动执行' : 'Auto Execute')
                }
              </button>

              {isExecuting && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{lang === 'zh' ? '执行进度' : 'Progress'}</span>
                    <span>{Math.round(executionProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-3xl h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-2 rounded-3xl transition-all duration-300"
                      style={{ 
                        width: `${Math.min(executionProgress, 100)}%`,
                        maxWidth: '100%'
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveTemplate}
                disabled={blocks.length === 0}
                className="w-full px-3 py-2 rounded-3xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {lang === 'zh' ? '保存工作流' : 'Save Workflow'}
              </button>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <button
                  onClick={() => setShowScheduleManager(true)}
                  className="w-full px-3 py-2 rounded-3xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-all"
                >
                  {lang === 'zh' ? '⏰ 定时任务' : '⏰ Schedule'}
                </button>
                
                <button
                  onClick={() => setShowBatchInput(true)}
                  className="w-full px-3 py-2 rounded-3xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-all"
                >
                  {lang === 'zh' ? '📁 批量输入' : '📁 Batch Input'}
                </button>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>{lang === 'zh' ? '资源使用' : 'Resources'}</span>
                  <span className={`${resourceManager.getCurrentUsage().memory > 400 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.round(resourceManager.getCurrentUsage().memory)}MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'zh' ? '连接数' : 'Connections'}</span>
                  <span>{resourceManager.getCurrentUsage().activeConnections}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      <div 
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%'
        }}
        className="absolute inset-0 transition-transform duration-75"
      >
        {/* Conditional rendering: Use VirtualizedCanvas for large canvases */}
        {useVirtualization ? (
          <VirtualizedCanvas
            blocks={blocks}
            connections={connections}
            zoom={zoom}
            pan={pan}
            selectedIds={selectedIds}
            theme={theme}
            lang={lang}
            isPerfMode={isPerfMode}
            containerWidth={containerDimensions.width}
            containerHeight={containerDimensions.height}
            onUpdateBlock={onUpdateBlock}
            onSelect={onSelect}
            onDeleteBlock={onDeleteBlock}
            onGenerate={(id, prompt) => {
              // Propagate data when block generates content
              const block = blocks.find(b => b.id === id);
              if (block) {
                connectionEngine.propagateData(id, block.content, block.type, block.number, block);
              }
              onGenerate(id, prompt);
            }}
            // Pass through all other props
            isAutomationTemplate={isAutomationTemplate}
            onConnect={onConnect}
            onMultiImageGenerate={onMultiImageGenerate}
            onUpdateConnection={onUpdateConnection}
            onContextMenu={onContextMenu}
            onUpdatePan={onUpdatePan}
            onCreateBlock={onCreateBlock}
            onResolvePrompt={onResolvePrompt}
            availableCharacters={availableCharacters}
            onCharacterSelect={onCharacterSelect}
            onOpenCharacterPanel={onOpenCharacterPanel}
            modelConfig={modelConfig}
            menuConfig={menuConfig}
            onOpenCharacterSelector={handleOpenCharacterSelector}
            onOpenImagePreview={handleOpenImagePreview}
            onOpenMultiImageModal={handleOpenMultiImageModal}
            onOpenImageEditModal={handleOpenImageEditModal}
          />
        ) : (
          <>
            {/* Grid Background */}
            <div 
              className="absolute inset-[-10000px] pointer-events-none" 
              style={{ 
                backgroundImage: `radial-gradient(${COLORS.canvas.grid} 1px, transparent 1px)`,
                backgroundSize: `${SNAP_SIZE * 10}px ${SNAP_SIZE * 10}px`
              }} 
            />
            
            {renderConnections()}

            {blocks.map(block => {
              // Get upstream data for this block
              const upstreamData = connectionEngine.getUpstreamData(block.id);
              
              // Convert upstream block IDs to block numbers (A01, B01, etc.)
              const upstreamBlockIds = connectionEngine.getUpstreamBlockIds(block.id);
              const upstreamIds = upstreamBlockIds.map(id => {
                const upstreamBlock = blocks.find(b => b.id === id);
                return upstreamBlock ? upstreamBlock.number : id;
              });
              
              return (
                <BlockComponent
                  key={block.id}
                  block={block}
                  isSelected={selectedIds.includes(block.id)}
                  isPerfMode={isPerfMode}
                  isAutomationTemplate={isAutomationTemplate}
                  upstreamIds={upstreamIds}
                  upstreamData={connectionEngine.getUpstreamData(block.id)}
                  onDragStart={(e) => setDragInfo({ blockId: block.id, startX: e.clientX, startY: e.clientY, initX: block.x, initY: block.y })}
                  onResizeStart={(e) => setResizeInfo({ blockId: block.id, startX: e.clientX, startY: e.clientY, initW: block.width, initH: block.height })}
                  onSelect={onSelect}
                  onAnchorClick={(id, type) => {
                    // Initial coordinates set to 0; handleMouseMove will update it relative to pan/zoom immediately.
                    setActiveAnchor({ blockId: id, type, mouseX: 0, mouseY: 0 });
                  }}
                  onDelete={onDeleteBlock}
                  onGenerate={(id, prompt) => {
                    // Propagate data when block generates content
                    const block = blocks.find(b => b.id === id);
                    if (block) {
                      connectionEngine.propagateData(id, block.content, block.type, block.number, block);
                    }
                    onGenerate(id, prompt);
                  }}
                  onUpdate={(id, updates) => {
                    // Propagate data when block content is updated
                    if (updates.content !== undefined) {
                      const block = blocks.find(b => b.id === id);
                      if (block) {
                        connectionEngine.propagateData(id, updates.content, block.type, block.number, { ...block, ...updates });
                      }
                    }
                    onUpdateBlock(id, updates);
                  }}
                  onCreateBlock={onCreateBlock}
                  onMultiImageGenerate={onMultiImageGenerate}
                  lang={lang}
                  availableCharacters={availableCharacters}
                  onCharacterSelect={onCharacterSelect}
                  onOpenCharacterPanel={onOpenCharacterPanel}
                  onOpenCharacterSelector={handleOpenCharacterSelector}
                  onOpenImagePreview={handleOpenImagePreview}
                  onOpenMultiImageModal={handleOpenMultiImageModal}
                  onCloseCharacterSelector={handleCloseCharacterSelector}
                  onOpenImageEditModal={handleOpenImageEditModal}
                  onOpenSmearRemovalModal={onOpenSmearRemovalModal}
                  onResolvePrompt={onResolvePrompt}
                  menuConfig={menuConfig}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Character Selector Modal */}
      {showCharacterSelector && selectedBlockId && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/50 backdrop-blur-sm"
          onClick={handleCloseCharacterSelector}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {lang === 'zh' ? '选择角色' : 'Select Character'}
              </h3>
              <button
                onClick={handleCloseCharacterSelector}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {/* No Character Option */}
              <button
                onClick={() => handleCharacterSelect(null)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  !blocks.find(b => b.id === selectedBlockId)?.characterId 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <UserX size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="font-medium text-base text-slate-900 dark:text-white">
                      {lang === 'zh' ? '无角色' : 'No Character'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {lang === 'zh' ? '不使用角色客串' : 'No character cameo'}
                    </div>
                  </div>
                </div>
              </button>

              {/* Available Characters */}
              {availableCharacters.filter(char => char.status === 'ready').map(character => (
                <button
                  key={character.id}
                  onClick={() => handleCharacterSelect(character)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    blocks.find(b => b.id === selectedBlockId)?.characterId === character.id 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                      {character.profile_picture_url ? (
                        <img 
                          src={character.profile_picture_url} 
                          alt={character.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users size={20} className="text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base text-slate-900 dark:text-white truncate">
                        {character.username}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {character.description || character.permalink}
                      </div>
                      {character.usage_count !== undefined && (
                        <div className="text-sm text-purple-600 dark:text-purple-400">
                          {lang === 'zh' ? `使用 ${character.usage_count} 次` : `Used ${character.usage_count} times`}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* No Characters Available */}
              {availableCharacters.filter(char => char.status === 'ready').length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base">
                    {lang === 'zh' ? '暂无可用角色' : 'No characters available'}
                  </p>
                  {onOpenCharacterPanel && (
                    <button
                      onClick={() => {
                        handleCloseCharacterSelector();
                        onOpenCharacterPanel();
                      }}
                      className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-base"
                    >
                      {lang === 'zh' ? '创建角色' : 'Create Character'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Character Management Actions */}
            {onOpenCharacterPanel && availableCharacters.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    handleCloseCharacterSelector();
                    onOpenCharacterPanel();
                  }}
                  className="w-full p-3 text-base text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={20} />
                  {lang === 'zh' ? '管理角色' : 'Manage Characters'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && selectedPreviewBlockId && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={handleCloseImagePreview}
        >
          <div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-6 border-black/5 dark:border-white/10 rounded-xl shadow-2xl p-12 min-w-[900px] max-w-[1200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-5xl font-bold text-slate-900 dark:text-white">
                {lang === 'zh' ? '图片预览' : 'Image Preview'}
              </h3>
              <button
                onClick={handleCloseImagePreview}
                className="p-6 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={48} className="text-slate-500" />
              </button>
            </div>
            <PromptPreviewPopover
              isOpen={showImagePreview}
              prompt={blocks.find(b => b.id === selectedPreviewBlockId)?.originalPrompt || ''}
              previewUrl={blocks.find(b => b.id === selectedPreviewBlockId)?.content}
              onClose={handleCloseImagePreview}
              onRegenerate={(newPrompt) => {
                if (selectedPreviewBlockId) {
                  handlePreviewRegenerate(selectedPreviewBlockId, newPrompt);
                }
              }}
              theme="dark"
              lang={lang}
              resolvedPromptInfo={
                onResolvePrompt && selectedPreviewBlockId
                  ? onResolvePrompt(
                      blocks.find(b => b.id === selectedPreviewBlockId)?.originalPrompt || '',
                      selectedPreviewBlockId
                    )
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Multi-Image Generation Modal */}
      {showMultiImageModal && selectedMultiImageBlockId && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={handleCloseMultiImageModal}
        >
          <div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-6 border-black/5 dark:border-white/10 rounded-xl shadow-2xl p-12 min-w-[900px] max-w-[1200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-5xl font-bold text-slate-900 dark:text-white">
                {lang === 'zh' ? '多图生成配置' : 'Multi-Image Generation Config'}
              </h3>
              <button
                onClick={handleCloseMultiImageModal}
                className="p-6 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={48} className="text-slate-500" />
              </button>
            </div>
            <MultiImageConfigModal
              isOpen={showMultiImageModal}
              sourceBlock={blocks.find(b => b.id === selectedMultiImageBlockId)!}
              onClose={handleCloseMultiImageModal}
              onGenerate={(config) => {
                if (selectedMultiImageBlockId) {
                  handleMultiImageGenerate(selectedMultiImageBlockId, config);
                }
              }}
              lang={lang}
            />
          </div>
        </div>
      )}
      
      {/* Image Edit Modal */}
      {showImageEditModal && selectedImageEditBlockId && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={handleCloseImageEditModal}
        >
          <div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-6 border-black/5 dark:border-white/10 rounded-xl shadow-2xl p-12 min-w-[900px] max-w-[1200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-5xl font-bold text-slate-900 dark:text-white">
                {lang === 'zh' ? '图像编辑' : 'Image Edit'}
              </h3>
              <button
                onClick={handleCloseImageEditModal}
                className="p-6 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={48} className="text-slate-500" />
              </button>
            </div>
            <ImageEditModal
              isOpen={showImageEditModal}
              onClose={handleCloseImageEditModal}
              onEdit={(images, prompt, options) => {
                return handleImageEdit(images, prompt, options);
              }}
              lang={lang}
              initialImages={blocks.find(b => b.id === selectedImageEditBlockId)?.content ? [{ source: blocks.find(b => b.id === selectedImageEditBlockId)!.content, role: 'primary' }] : []}
              initialPrompt={blocks.find(b => b.id === selectedImageEditBlockId)?.prompt || ''}
            />
          </div>
        </div>
      )}

      {/* Schedule Manager Modal - Disabled temporarily */}
      {/* {showScheduleManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400]">
          <div className={`rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto m-4 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          }`}>
            <ScheduleManager
              onClose={() => setShowScheduleManager(false)}
              onError={(error) => console.error('Schedule error:', error)}
              onSuccess={(message) => console.log('Schedule success:', message)}
            />
          </div>
        </div>
      )}

      {/* Batch Input Modal - Disabled temporarily */}
      {/* {showBatchInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400]">
          <div className={`rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto m-4 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{lang === 'zh' ? '批量输入设置' : 'Batch Input Setup'}</h2>
                <button
                  onClick={() => setShowBatchInput(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {lang === 'zh' ? '批量输入功能暂时不可用' : 'Batch input feature temporarily unavailable'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {lang === 'zh' ? '此功能正在开发中，敬请期待' : 'This feature is under development'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Canvas;
