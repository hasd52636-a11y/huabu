
import React, { useState, useRef, useMemo } from 'react';
import { Block, Connection, EnhancedConnection } from '../types';
import BlockComponent from './BlockComponent';
import { COLORS, SNAP_SIZE, I18N } from '../constants';
import { connectionEngine } from '../services/ConnectionEngine';
import { AutoExecutor } from '../services/AutoExecutor';
import { TemplateManager } from '../services/TemplateManager';
import { StateManager } from '../services/StateManager';
import { ResourceManager } from '../services/ResourceManager';
import { ScheduleManager } from './ScheduleManager';
import { BatchInputSelector } from './BatchInputSelector';

interface CanvasProps {
  blocks: Block[];
  connections: Connection[];
  zoom: number;
  pan: { x: number; y: number };
  selectedIds: string[];
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isPerfMode: boolean;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onSelect: (id: string, isMulti: boolean) => void;
  onClearSelection: () => void;
  onDeleteBlock: (id: string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onGenerate: (id: string, prompt: string) => void;
  onUpdateConnection: (id: string, instruction: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUpdatePan: (updates: { x: number; y: number }) => void;
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
  onUpdateBlock,
  onSelect,
  onClearSelection,
  onDeleteBlock,
  onConnect,
  onGenerate,
  onUpdateConnection,
  onContextMenu,
  onUpdatePan
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragInfo, setDragInfo] = useState<{ blockId: string; startX: number; startY: number; initX: number; initY: number } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{ blockId: string; startX: number; startY: number; initW: number; initH: number } | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<{ blockId: string; type: 'in' | 'out'; mouseX: number; mouseY: number } | null>(null);
  const [isPanning, setIsPanning] = useState<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);
  
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

      // Execute workflow with progress simulation
      const result = await autoExecutor.executeWorkflow(canvasState);
      
      // Simulate progress updates
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        setExecutionProgress(progress);
        if (progress >= 100) {
          clearInterval(progressInterval);
          setIsExecuting(false);
        }
      }, 500);
      
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

  const renderConnections = () => {
    // Update connection engine with current connections
    connectionEngine.updateConnections(connections);
    
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <defs>
          <marker id="arrow-head-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 L 2 5 Z" fill="currentColor" />
          </marker>
          {/* Data flow indicator marker */}
          <marker id="data-flow-indicator" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4" markerHeight="4">
            <circle cx="4" cy="4" r="2" fill="#22C55E" opacity="0.8" />
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
              />
              
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
      {/* Automation Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        {/* Toggle Automation Panel Button */}
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

        {/* Automation Controls Panel */}
        {showAutomationControls && (
          <div className={`backdrop-blur-sm rounded-3xl shadow-xl p-4 min-w-[200px] border transition-all ${
            theme === 'dark' 
              ? 'bg-slate-800/95 border-white/10 text-white' 
              : 'bg-white/95 border-gray-200 text-gray-700'
          }`}>
            <div className="space-y-3">
              {/* Auto Execute Button */}
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

              {/* Execution Progress */}
              {isExecuting && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{lang === 'zh' ? '执行进度' : 'Progress'}</span>
                    <span>{Math.round(executionProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-3xl h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-3xl transition-all duration-300"
                      style={{ width: `${executionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Save Template Button */}
              <button
                onClick={handleSaveTemplate}
                disabled={blocks.length === 0}
                className="w-full px-3 py-2 rounded-3xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {lang === 'zh' ? '保存模板' : 'Save Template'}
              </button>

              {/* Advanced Automation Features */}
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

              {/* Resource Usage Indicator */}
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

      <div 
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%'
        }}
        className="absolute inset-0 transition-transform duration-75"
      >
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
          
          return (
            <BlockComponent
              key={block.id}
              block={block}
              isSelected={selectedIds.includes(block.id)}
              isPerfMode={isPerfMode}
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
                  connectionEngine.propagateData(id, block.content, block.type, block.number);
                }
                onGenerate(id, prompt);
              }}
              onUpdate={(id, updates) => {
                // Propagate data when block content is updated
                if (updates.content !== undefined) {
                  const block = blocks.find(b => b.id === id);
                  if (block) {
                    connectionEngine.propagateData(id, updates.content, block.type, block.number);
                  }
                }
                onUpdateBlock(id, updates);
              }}
              lang={lang}
              upstreamIds={connections.filter(c => c.toId === block.id).map(c => {
                const from = blocks.find(b => b.id === c.fromId);
                return from ? from.number : '';
              }).filter(Boolean)}
              upstreamData={upstreamData}
            />
          );
        })}
      </div>

      {/* Schedule Manager Modal */}
      {showScheduleManager && (
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

      {/* Batch Input Modal */}
      {showBatchInput && (
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
              <BatchInputSelector
                onFilesSelected={(batchItems) => {
                  console.log('Batch items created:', batchItems);
                  setShowBatchInput(false);
                }}
                onError={(error) => console.error('Batch input error:', error)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
