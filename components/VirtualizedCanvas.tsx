/**
 * Virtualized Canvas Component
 * 
 * Enhanced Canvas component with virtualization and performance optimization
 * for handling 100+ modules efficiently.
 * 
 * Requirements: 8.1, 8.3, 8.6
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Block, Connection } from '../types';
import { performanceOptimizationSystem, ViewportBounds } from '../services/PerformanceOptimizationSystem';
import BlockComponent from './BlockComponent';
import { COLORS, SNAP_SIZE } from '../constants.tsx';

interface VirtualizedCanvasProps {
  blocks: Block[];
  connections: Connection[];
  zoom: number;
  pan: { x: number; y: number };
  selectedIds: string[];
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isPerfMode: boolean;
  containerWidth: number;
  containerHeight: number;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onSelect: (id: string, isMulti: boolean) => void;
  onDeleteBlock: (id: string) => void;
  onGenerate: (id: string, prompt: string) => void;
  [key: string]: any; // Allow other props to be passed through
}

const VirtualizedCanvas: React.FC<VirtualizedCanvasProps> = ({
  blocks,
  connections,
  zoom,
  pan,
  selectedIds,
  theme,
  lang,
  isPerfMode,
  containerWidth,
  containerHeight,
  onUpdateBlock,
  onSelect,
  onDeleteBlock,
  onGenerate,
  ...otherProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportBounds>({ left: 0, top: 0, right: 0, bottom: 0 });
  const [performanceMode, setPerformanceMode] = useState(isPerfMode);

  // Calculate viewport bounds when pan, zoom, or container size changes
  const updateViewport = useCallback(() => {
    if (containerWidth && containerHeight) {
      const newViewport = performanceOptimizationSystem.calculateViewportBounds(
        containerWidth,
        containerHeight,
        pan,
        zoom
      );
      setViewport(newViewport);
    }
  }, [containerWidth, containerHeight, pan, zoom]);

  // Update viewport on changes
  useEffect(() => {
    updateViewport();
  }, [updateViewport]);

  // Get visible blocks using virtualization
  const visibleBlocks = useMemo(() => {
    if (!performanceMode || blocks.length < 20) {
      // For small numbers of blocks, render all
      return blocks;
    }

    const visible = performanceOptimizationSystem.getVisibleBlocks(blocks, viewport);
    return performanceOptimizationSystem.optimizeRenderOrder(visible, selectedIds);
  }, [blocks, viewport, performanceMode, selectedIds]);

  // Get visible connections (only connections between visible blocks)
  const visibleConnections = useMemo(() => {
    if (!performanceMode) return connections;

    const visibleBlockIds = new Set(visibleBlocks.map(block => block.id));
    return connections.filter(conn => 
      visibleBlockIds.has(conn.fromId) && visibleBlockIds.has(conn.toId)
    );
  }, [connections, visibleBlocks, performanceMode]);

  // Render connections with performance optimization
  const renderConnections = useCallback(() => {
    return visibleConnections.map(connection => {
      const fromBlock = visibleBlocks.find(b => b.id === connection.fromId);
      const toBlock = visibleBlocks.find(b => b.id === connection.toId);
      
      if (!fromBlock || !toBlock) return null;

      // Calculate connection path
      const fromX = fromBlock.x + fromBlock.width / 2;
      const fromY = fromBlock.y;
      const toX = toBlock.x - toBlock.width / 2;
      const toY = toBlock.y;

      const midX = (fromX + toX) / 2;
      const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

      return (
        <g key={connection.id}>
          <path
            d={path}
            stroke={COLORS.gold.primary}
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
            opacity={0.8}
          />
          {/* Connection label */}
          {connection.instruction && (
            <foreignObject
              x={midX - 60}
              y={(fromY + toY) / 2 - 15}
              width="120"
              height="30"
            >
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gold-300 rounded-lg px-2 py-1 text-xs text-center shadow-lg">
                {connection.instruction}
              </div>
            </foreignObject>
          )}
        </g>
      );
    });
  }, [visibleConnections, visibleBlocks]);

  // Performance monitoring
  useEffect(() => {
    const metrics = performanceOptimizationSystem.getMetrics();
    
    // Auto-enable performance mode if needed
    if (blocks.length > 50 && !performanceMode) {
      setPerformanceMode(true);
    }

    // Auto-disable performance mode for small canvases
    if (blocks.length < 20 && performanceMode) {
      setPerformanceMode(false);
    }
  }, [blocks.length, performanceMode]);

  // Render performance stats in development
  const renderPerformanceStats = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    const metrics = performanceOptimizationSystem.getMetrics();
    
    return (
      <div className="absolute top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
        <div>Visible: {metrics.visibleBlocks}/{metrics.totalBlocks}</div>
        <div>FPS: {metrics.frameRate.toFixed(1)}</div>
        <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
        <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
        <div>Mode: {performanceMode ? 'Virtualized' : 'Standard'}</div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0'
      }}
    >
      {/* Grid background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${COLORS.canvas.grid} 1px, transparent 1px)`,
          backgroundSize: `${SNAP_SIZE * 10}px ${SNAP_SIZE * 10}px`
        }} 
      />
      
      {/* SVG for connections */}
      <svg 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          width: '100%', 
          height: '100%',
          overflow: 'visible'
        }}
      >
        {renderConnections()}
      </svg>

      {/* Render visible blocks */}
      {visibleBlocks.map(block => {
        // Determine if block content should be loaded
        const isSelected = selectedIds.includes(block.id);
        const shouldLoadContent = performanceOptimizationSystem.shouldLoadBlockContent(block, viewport, isSelected);
        
        return (
          <BlockComponent
            key={block.id}
            block={{
              ...block,
              // Lazy load content based on viewport
              content: shouldLoadContent ? block.content : ''
            }}
            isSelected={isSelected}
            isPerfMode={performanceMode}
            onSelect={onSelect}
            onDelete={onDeleteBlock}
            onGenerate={onGenerate}
            onUpdate={onUpdateBlock}
            lang={lang}
            {...otherProps}
          />
        );
      })}

      {/* Performance stats overlay */}
      {renderPerformanceStats()}

      {/* Performance recommendations */}
      {performanceMode && (
        <PerformanceRecommendations />
      )}
    </div>
  );
};

// Performance recommendations component
const PerformanceRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    const updateRecommendations = () => {
      const newRecommendations = performanceOptimizationSystem.getOptimizationRecommendations();
      setRecommendations(newRecommendations);
      setShowRecommendations(newRecommendations.length > 0);
    };

    updateRecommendations();
    const interval = setInterval(updateRecommendations, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!showRecommendations) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 max-w-sm z-40">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Performance Tips
        </span>
        <button
          onClick={() => setShowRecommendations(false)}
          className="ml-auto text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
        >
          ×
        </button>
      </div>
      <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
        {recommendations.map((rec, index) => (
          <li key={index} className="flex items-start gap-1">
            <span className={`mt-0.5 ${
              rec.type === 'critical' ? 'text-red-500' : 
              rec.type === 'warning' ? 'text-yellow-500' : 
              'text-blue-500'
            }`}>
              {rec.type === 'critical' ? '⚠' : rec.type === 'warning' ? '⚡' : 'ℹ'}
            </span>
            <div>
              <div className="font-medium">{rec.message}</div>
              {rec.action && (
                <div className="text-xs opacity-75">{rec.action}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VirtualizedCanvas;