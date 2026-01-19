/**
 * 涂抹消失区域选择器
 * 
 * 功能：
 * - 交互式区域标记
 * - 多区域选择和管理
 * - 区域预览和编辑
 * - 批量处理支持
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Square, Circle, Lasso, Trash2, Eye, EyeOff, Play, Download, Plus } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface RemovalArea {
  id: string;
  name: string;
  type: 'rectangle' | 'circle' | 'freeform';
  bounds: { x: number; y: number; width: number; height: number };
  points?: Point[]; // For freeform areas
  selected: boolean;
  visible: boolean;
  color: string;
  timestamp: number;
}

interface SmearRemovalSelectorProps {
  imageUrl: string;
  onAreasSelected: (areas: RemovalArea[]) => void;
  onPreviewRequested?: (areaIds: string[]) => void;
  onProcessRequested?: (areaIds: string[]) => void;
  lang?: 'zh' | 'en';
}

const SmearRemovalSelector: React.FC<SmearRemovalSelectorProps> = ({
  imageUrl,
  onAreasSelected,
  onPreviewRequested,
  onProcessRequested,
  lang = 'zh'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [currentTool, setCurrentTool] = useState<'rectangle' | 'circle' | 'freeform'>('rectangle');
  const [areas, setAreas] = useState<RemovalArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAreas, setShowAreas] = useState(true);

  const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];

  const t = {
    zh: {
      rectangle: '矩形选择',
      circle: '圆形选择',
      freeform: '自由选择',
      showAreas: '显示区域',
      hideAreas: '隐藏区域',
      preview: '预览',
      process: '处理',
      delete: '删除',
      addArea: '添加区域',
      noAreas: '未选择区域',
      selectedAreas: '已选择区域',
      tip: '选择需要消除的区域，支持多个区域批量处理',
      areaName: '区域'
    },
    en: {
      rectangle: 'Rectangle Select',
      circle: 'Circle Select',
      freeform: 'Freeform Select',
      showAreas: 'Show Areas',
      hideAreas: 'Hide Areas',
      preview: 'Preview',
      process: 'Process',
      delete: 'Delete',
      addArea: 'Add Area',
      noAreas: 'No areas selected',
      selectedAreas: 'Selected areas',
      tip: 'Select areas to remove, supports batch processing',
      areaName: 'Area'
    }
  };

  // 初始化图像和Canvas
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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

      imageRef.current = img;
      setImageLoaded(true);
      redrawCanvas();
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

  // 开始绘制区域
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPosition(e);
    setIsDrawing(true);
    setStartPoint(pos);
    
    if (currentTool === 'freeform') {
      setCurrentPoints([pos]);
    }
  }, [getCanvasPosition, currentTool]);

  // 绘制过程
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasPosition(e);

    if (currentTool === 'freeform') {
      setCurrentPoints(prev => [...prev, pos]);
    }

    // 实时预览
    redrawCanvas(pos);
  }, [isDrawing, getCanvasPosition, currentTool]);

  // 结束绘制
  const stopDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasPosition(e);
    setIsDrawing(false);

    // 创建新区域
    const newArea: RemovalArea = {
      id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${t[lang].areaName} ${areas.length + 1}`,
      type: currentTool,
      bounds: calculateBounds(startPoint, pos, currentPoints),
      points: currentTool === 'freeform' ? [...currentPoints, pos] : undefined,
      selected: true,
      visible: true,
      color: colors[areas.length % colors.length],
      timestamp: Date.now()
    };

    // 验证区域大小
    if (newArea.bounds.width > 5 && newArea.bounds.height > 5) {
      const newAreas = [...areas, newArea];
      setAreas(newAreas);
      onAreasSelected(newAreas);
    }

    setCurrentPoints([]);
    redrawCanvas();
  }, [isDrawing, getCanvasPosition, startPoint, currentPoints, areas, currentTool, lang, onAreasSelected]);

  // 计算区域边界
  const calculateBounds = useCallback((start: Point, end: Point, points: Point[]) => {
    if (currentTool === 'freeform' && points.length > 0) {
      const allPoints = [...points, end];
      const minX = Math.min(...allPoints.map(p => p.x));
      const maxX = Math.max(...allPoints.map(p => p.x));
      const minY = Math.min(...allPoints.map(p => p.y));
      const maxY = Math.max(...allPoints.map(p => p.y));
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    } else {
      return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
      };
    }
  }, [currentTool]);

  // 重绘Canvas
  const redrawCanvas = useCallback((previewPos?: Point) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除并绘制图像
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    if (!showAreas) return;

    // 绘制已有区域
    areas.forEach(area => {
      if (!area.visible) return;

      ctx.strokeStyle = area.color;
      ctx.lineWidth = area.selected ? 3 : 2;
      ctx.setLineDash(area.selected ? [] : [5, 5]);

      if (area.type === 'rectangle') {
        ctx.strokeRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
      } else if (area.type === 'circle') {
        const centerX = area.bounds.x + area.bounds.width / 2;
        const centerY = area.bounds.y + area.bounds.height / 2;
        const radius = Math.min(area.bounds.width, area.bounds.height) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (area.type === 'freeform' && area.points) {
        ctx.beginPath();
        ctx.moveTo(area.points[0].x, area.points[0].y);
        for (let i = 1; i < area.points.length; i++) {
          ctx.lineTo(area.points[i].x, area.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 绘制区域标签
      ctx.fillStyle = area.color;
      ctx.font = '12px Arial';
      ctx.fillText(area.name, area.bounds.x, area.bounds.y - 5);
    });

    // 绘制当前绘制的预览
    if (isDrawing && previewPos) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);

      if (currentTool === 'rectangle') {
        const width = previewPos.x - startPoint.x;
        const height = previewPos.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
      } else if (currentTool === 'circle') {
        const centerX = (startPoint.x + previewPos.x) / 2;
        const centerY = (startPoint.y + previewPos.y) / 2;
        const radius = Math.sqrt(Math.pow(previewPos.x - startPoint.x, 2) + Math.pow(previewPos.y - startPoint.y, 2)) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'freeform' && currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.lineTo(previewPos.x, previewPos.y);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  }, [areas, showAreas, isDrawing, startPoint, currentPoints, currentTool]);

  // 切换区域选择状态
  const toggleAreaSelection = useCallback((areaId: string) => {
    const newAreas = areas.map(area => 
      area.id === areaId ? { ...area, selected: !area.selected } : area
    );
    setAreas(newAreas);
    onAreasSelected(newAreas);
    redrawCanvas();
  }, [areas, onAreasSelected, redrawCanvas]);

  // 切换区域可见性
  const toggleAreaVisibility = useCallback((areaId: string) => {
    const newAreas = areas.map(area => 
      area.id === areaId ? { ...area, visible: !area.visible } : area
    );
    setAreas(newAreas);
    redrawCanvas();
  }, [areas, redrawCanvas]);

  // 删除区域
  const deleteArea = useCallback((areaId: string) => {
    const newAreas = areas.filter(area => area.id !== areaId);
    setAreas(newAreas);
    onAreasSelected(newAreas);
    redrawCanvas();
  }, [areas, onAreasSelected, redrawCanvas]);

  // 预览选中区域
  const previewSelected = useCallback(() => {
    const selectedAreaIds = areas.filter(area => area.selected).map(area => area.id);
    if (selectedAreaIds.length > 0 && onPreviewRequested) {
      onPreviewRequested(selectedAreaIds);
    }
  }, [areas, onPreviewRequested]);

  // 处理选中区域
  const processSelected = useCallback(() => {
    const selectedAreaIds = areas.filter(area => area.selected).map(area => area.id);
    if (selectedAreaIds.length > 0 && onProcessRequested) {
      onProcessRequested(selectedAreaIds);
    }
  }, [areas, onProcessRequested]);

  // 重绘Canvas当区域或显示状态改变时
  useEffect(() => {
    redrawCanvas();
  }, [areas, showAreas, redrawCanvas]);

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

  const selectedAreas = areas.filter(area => area.selected);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-4">
          {/* 选择工具 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTool('rectangle')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'rectangle'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={t[lang].rectangle}
            >
              <Square size={20} />
            </button>
            <button
              onClick={() => setCurrentTool('circle')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'circle'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={t[lang].circle}
            >
              <Circle size={20} />
            </button>
            <button
              onClick={() => setCurrentTool('freeform')}
              className={`p-2 rounded-lg transition-colors ${
                currentTool === 'freeform'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={t[lang].freeform}
            >
              <Lasso size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 显示/隐藏区域 */}
          <button
            onClick={() => setShowAreas(!showAreas)}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            title={showAreas ? t[lang].hideAreas : t[lang].showAreas}
          >
            {showAreas ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          {/* 预览 */}
          <button
            onClick={previewSelected}
            disabled={selectedAreas.length === 0}
            className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t[lang].preview}
          >
            <Eye size={20} />
          </button>

          {/* 处理 */}
          <button
            onClick={processSelected}
            disabled={selectedAreas.length === 0}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t[lang].process}
          >
            <Play size={20} />
          </button>
        </div>
      </div>

      {/* Canvas和区域列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas区域 */}
        <div className="lg:col-span-2">
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
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
          </div>
        </div>

        {/* 区域列表 */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {areas.length > 0 ? t[lang].selectedAreas : t[lang].noAreas} ({areas.length})
            </h3>
            
            {areas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === 'zh' ? '使用工具选择需要消除的区域' : 'Use tools to select areas to remove'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {areas.map((area, index) => (
                  <div
                    key={area.id}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      area.selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {area.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAreaSelection(area.id)}
                          className={`p-1 rounded transition-colors ${
                            area.selected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                          }`}
                        >
                          <Plus size={16} className={area.selected ? 'rotate-45' : ''} />
                        </button>
                        <button
                          onClick={() => toggleAreaVisibility(area.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {area.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => deleteArea(area.id)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {area.type} • {Math.round(area.bounds.width)}×{Math.round(area.bounds.height)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 批量操作 */}
          {selectedAreas.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                {lang === 'zh' 
                  ? `已选择 ${selectedAreas.length} 个区域`
                  : `${selectedAreas.length} areas selected`
                }
              </p>
              <div className="flex gap-2">
                <button
                  onClick={previewSelected}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  {t[lang].preview}
                </button>
                <button
                  onClick={processSelected}
                  className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                >
                  {t[lang].process}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 {t[lang].tip}
        </p>
      </div>
    </div>
  );
};

export default SmearRemovalSelector;