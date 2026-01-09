
import React, { useState, useRef, useMemo } from 'react';
import { Block, Connection } from '../types';
import BlockComponent from './BlockComponent';
import { COLORS, SNAP_SIZE, I18N } from '../constants';

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

  const getConnectionColor = (from: Block) => {
    if (from.type === 'text') return COLORS.text.border;
    if (from.type === 'image') return COLORS.image.border;
    return COLORS.video.border;
  };

  const renderConnections = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <defs>
          <marker id="arrow-head-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 L 2 5 Z" fill="currentColor" />
          </marker>
        </defs>

        {connections.map(conn => {
          const fromBlock = blocks.find(b => b.id === conn.fromId);
          const toBlock = blocks.find(b => b.id === conn.toId);
          if (!fromBlock || !toBlock) return null;

          const startX = fromBlock.x + fromBlock.width / 2;
          const startY = fromBlock.y;
          const endX = toBlock.x - toBlock.width / 2;
          const endY = toBlock.y;
          const color = getConnectionColor(fromBlock);

          const dist = Math.abs(endX - startX);
          const tension = Math.min(300, Math.max(80, dist * 0.45));
          const path = `M ${startX} ${startY} C ${startX + tension} ${startY}, ${endX - tension} ${endY}, ${endX} ${endY}`;

          return (
            <path
              key={conn.id}
              d={path}
              stroke={color}
              strokeWidth={3 / zoom}
              fill="none"
              markerEnd="url(#arrow-head-gold)"
              className="connection-flow opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: color } as any}
            />
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
      className={`relative w-full h-full overflow-hidden ${resizeInfo ? 'cursor-nwse-resize' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      style={{ backgroundColor: COLORS.canvas.bg }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e); }}
    >
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

        {blocks.map(block => (
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
            onGenerate={onGenerate}
            onUpdate={onUpdateBlock}
            lang={lang}
            upstreamIds={connections.filter(c => c.toId === block.id).map(c => {
              const from = blocks.find(b => b.id === c.fromId);
              return from ? from.number : '';
            }).filter(Boolean)}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
