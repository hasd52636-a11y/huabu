/**
 * 涂抹编辑Canvas工具
 * 
 * 功能：
 * - 画笔工具绘制mask
 * - 橡皮擦工具
 * - 实时预览
 * - 撤销/重做
 * - Mask生成和导出
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Brush, Eraser, Undo, Redo, Eye, EyeOff, RotateCcw, Download, Palette } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface BrushStroke {
  id: string;
  tool: 'brush' | 'eraser';
  points: Point[];
  brushSize: number;
  timestamp: number;
}

interface SmearEditCanvasProps {
  imageUrl: string;
  onMaskGenerated: (maskDataUrl: string) => void;
  onEditComplete?: (editedImageUrl: string) => void;
  initialBrushSize?: number;
  lang?: 'zh' | 'en';
}

const SmearEditCanvas: React.FC<SmearEditCanvasProps> = ({
  imageUrl,
  onMaskGenerated,
  onEditComplete,
  initialBrushSize = 20,
  lang = 'zh'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [showMask, setShowMask] = useState(true);
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const t = {
    zh: {
      brush: '画笔',
      eraser: '橡皮擦',
      brushSize: '画笔大小',
      showMask: '显示蒙版',
      hideMask: '隐藏蒙版',
      undo: '撤销',
      redo: '重做',
      clear: '清除',
      download: '下载蒙版',
      tip: '在需要编辑的区域涂抹，白色区域将被处理'
    },
    en: {
      brush: 'Brush',
      eraser: 'Eraser',
      brushSize: 'Brush Size',
      showMask: 'Show Mask',
      hideMask: 'Hide Mask',
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear',
      download: 'Download Mask',
      tip: 'Paint on areas you want to edit, white areas will be processed'
    }
  };

  // 初始化图像和Canvas
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      // 计算合适的Canvas尺寸
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      setCanvasSize({ width, height });
      
      // 设置Canvas尺寸
      canvas.width = width;
      canvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;

      // 绘制图像
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // 初始化mask canvas (黑色背景)
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, width, height);
      }

      imageRef.current = img;
      setImageLoaded(true);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // 获取鼠标在Canvas上的相对位置
  const getCanvasPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // 开始绘制
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    setIsDrawing(true);
    setCurrentStroke([pos]);
  }, [getCanvasPosition]);

  // 绘制过程
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasPosition(e);
    setCurrentStroke(prev => [...prev, pos]);

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // 设置绘制样式
    ctx.globalCompositeOperation = currentTool === 'brush' ? 'source-over' : 'destination-out';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制到当前位置
    if (currentStroke.length > 1) {
      const prevPos = currentStroke[currentStroke.length - 2];
      ctx.beginPath();
      ctx.moveTo(prevPos.x, prevPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    // 更新显示
    updateCanvasDisplay();
  }, [isDrawing, getCanvasPosition, currentTool, brushSize, currentStroke]);

  // 结束绘制
  const stopDrawing = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;

    // 保存笔画到历史
    const stroke: BrushStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tool: currentTool,
      points: [...currentStroke],
      brushSize,
      timestamp: Date.now()
    };

    setStrokes(prev => [...prev, stroke]);
    setCurrentStroke([]);
    setIsDrawing(false);

    // 生成mask并通知父组件
    generateMask();
  }, [isDrawing, currentStroke, currentTool, brushSize]);

  // 更新Canvas显示
  const updateCanvasDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除并重绘图像
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // 如果显示mask，叠加半透明的mask
    if (showMask) {
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
    }
  }, [showMask]);

  // 生成mask数据
  const generateMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskDataUrl = maskCanvas.toDataURL('image/png');
    onMaskGenerated(maskDataUrl);
  }, [onMaskGenerated]);

  // 撤销最后一笔
  const undo = useCallback(() => {
    if (strokes.length === 0) return;

    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    redrawMask(newStrokes);
  }, [strokes]);

  // 重绘mask
  const redrawMask = useCallback((strokesToRedraw: BrushStroke[]) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // 清除mask canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 重绘所有笔画
    strokesToRedraw.forEach(stroke => {
      ctx.globalCompositeOperation = stroke.tool === 'brush' ? 'source-over' : 'destination-out';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });

    updateCanvasDisplay();
    generateMask();
  }, [updateCanvasDisplay, generateMask]);

  // 清除所有
  const clearAll = useCallback(() => {
    setStrokes([]);
    redrawMask([]);
  }, [redrawMask]);

  // 下载mask
  const downloadMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const link = document.createElement('a');
    link.download = 'mask.png';
    link.href = maskCanvas.toDataURL();
    link.click();
  }, []);

  // 更新显示当mask可见性改变时
  useEffect(() => {
    updateCanvasDisplay();
  }, [showMask, updateCanvasDisplay]);

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'zh' ? '加载图像中...' : 'Loading image...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-4">
          {/* 工具选择 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTool('brush')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'brush'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={t[lang].brush}
            >
              <Brush size={20} />
            </button>
            <button
              onClick={() => setCurrentTool('eraser')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'eraser'
                  ? 'bg-red-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={t[lang].eraser}
            >
              <Eraser size={20} />
            </button>
          </div>

          {/* 画笔大小 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t[lang].brushSize}:
            </span>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
              {brushSize}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 显示/隐藏mask */}
          <button
            onClick={() => setShowMask(!showMask)}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            title={showMask ? t[lang].hideMask : t[lang].showMask}
          >
            {showMask ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          {/* 撤销 */}
          <button
            onClick={undo}
            disabled={strokes.length === 0}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t[lang].undo}
          >
            <Undo size={20} />
          </button>

          {/* 清除 */}
          <button
            onClick={clearAll}
            disabled={strokes.length === 0}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t[lang].clear}
          >
            <RotateCcw size={20} />
          </button>

          {/* 下载mask */}
          <button
            onClick={downloadMask}
            disabled={strokes.length === 0}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t[lang].download}
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Canvas区域 */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-gray-300 dark:border-gray-600 rounded cursor-crosshair"
            style={{ maxWidth: '100%', height: 'auto' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <canvas
            ref={maskCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 {t[lang].tip}
        </p>
      </div>

      {/* 状态信息 */}
      {strokes.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {lang === 'zh' ? `已绘制 ${strokes.length} 笔画` : `${strokes.length} strokes drawn`}
        </div>
      )}
    </div>
  );
};

export default SmearEditCanvas;