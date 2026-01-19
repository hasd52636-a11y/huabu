/**
 * 涂抹消失模态框
 * 
 * 功能：
 * - 集成SmearRemovalSelector
 * - 处理涂抹消失操作
 * - 与ShenmaService集成
 * - 结果预览和下载
 */

import React, { useState } from 'react';
import { X, Download, Eye, Play, Loader2 } from 'lucide-react';
import SmearRemovalSelector from './SmearRemovalSelector';
import { ShenmaService } from '../services/shenmaService';

interface RemovalArea {
  id: string;
  name: string;
  type: 'rectangle' | 'circle' | 'freeform';
  bounds: { x: number; y: number; width: number; height: number };
  points?: { x: number; y: number }[];
  selected: boolean;
  visible: boolean;
  color: string;
  timestamp: number;
}

interface SmearRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onComplete?: (resultImageUrl: string) => void;
  lang?: 'zh' | 'en';
}

const SmearRemovalModal: React.FC<SmearRemovalModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onComplete,
  lang = 'zh'
}) => {
  const [selectedAreas, setSelectedAreas] = useState<RemovalArea[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<string>('');
  const [finalResult, setFinalResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const t = {
    zh: {
      title: '涂抹消失',
      preview: '预览效果',
      process: '开始处理',
      processing: '处理中...',
      previewing: '预览中...',
      download: '下载结果',
      close: '关闭',
      complete: '完成',
      error: '处理失败',
      noAreas: '请先选择需要消除的区域',
      previewSuccess: '预览生成成功',
      processSuccess: '处理完成',
      tip: '选择需要消除的区域，然后点击预览或处理'
    },
    en: {
      title: 'Smear Removal',
      preview: 'Preview Effect',
      process: 'Start Processing',
      processing: 'Processing...',
      previewing: 'Previewing...',
      download: 'Download Result',
      close: 'Close',
      complete: 'Complete',
      error: 'Processing Failed',
      noAreas: 'Please select areas to remove first',
      previewSuccess: 'Preview generated successfully',
      processSuccess: 'Processing completed',
      tip: 'Select areas to remove, then click preview or process'
    }
  };

  // 处理区域选择
  const handleAreasSelected = (areas: RemovalArea[]) => {
    setSelectedAreas(areas);
    // 清除之前的结果
    setPreviewResult('');
    setFinalResult('');
    setError('');
  };

  // 预览处理结果
  const handlePreview = async (areaIds: string[]) => {
    if (areaIds.length === 0) {
      setError(t[lang].noAreas);
      return;
    }

    setIsPreviewing(true);
    setError('');

    try {
      // 这里需要生成合并的mask数据
      const combinedMask = await generateCombinedMask(areaIds);
      
      // 模拟API调用 - 实际使用时需要集成ShenmaService
      // const shenmaService = new ShenmaService(config);
      // const result = await shenmaService.processSmearRemoval(imageUrl, combinedMask);
      
      // 临时模拟结果
      setTimeout(() => {
        setPreviewResult(imageUrl); // 临时使用原图作为预览
        setIsPreviewing(false);
      }, 2000);

    } catch (error) {
      console.error('Preview failed:', error);
      setError(error instanceof Error ? error.message : t[lang].error);
      setIsPreviewing(false);
    }
  };

  // 处理最终结果
  const handleProcess = async (areaIds: string[]) => {
    if (areaIds.length === 0) {
      setError(t[lang].noAreas);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // 这里需要生成合并的mask数据
      const combinedMask = await generateCombinedMask(areaIds);
      
      // 模拟API调用 - 实际使用时需要集成ShenmaService
      // const shenmaService = new ShenmaService(config);
      // const result = await shenmaService.processSmearRemoval(imageUrl, combinedMask);
      
      // 临时模拟结果
      setTimeout(() => {
        setFinalResult(imageUrl); // 临时使用原图作为结果
        setIsProcessing(false);
        
        if (onComplete) {
          onComplete(imageUrl);
        }
      }, 3000);

    } catch (error) {
      console.error('Processing failed:', error);
      setError(error instanceof Error ? error.message : t[lang].error);
      setIsProcessing(false);
    }
  };

  // 生成合并的mask数据
  const generateCombinedMask = async (areaIds: string[]): Promise<string> => {
    // 找到选中的区域
    const areasToProcess = selectedAreas.filter(area => areaIds.includes(area.id));
    
    if (areasToProcess.length === 0) {
      throw new Error('No valid areas found');
    }

    // 创建Canvas生成mask
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // 设置Canvas尺寸 (应该与图像尺寸匹配)
    canvas.width = 800;
    canvas.height = 600;

    // 黑色背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制白色区域表示需要处理的部分
    ctx.fillStyle = 'white';
    
    areasToProcess.forEach(area => {
      if (area.type === 'rectangle') {
        ctx.fillRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
      } else if (area.type === 'circle') {
        const centerX = area.bounds.x + area.bounds.width / 2;
        const centerY = area.bounds.y + area.bounds.height / 2;
        const radius = Math.min(area.bounds.width, area.bounds.height) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
      } else if (area.type === 'freeform' && area.points) {
        ctx.beginPath();
        ctx.moveTo(area.points[0].x, area.points[0].y);
        for (let i = 1; i < area.points.length; i++) {
          ctx.lineTo(area.points[i].x, area.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
    });

    return canvas.toDataURL('image/png');
  };

  // 下载结果
  const handleDownload = () => {
    if (!finalResult) return;

    const link = document.createElement('a');
    link.download = 'smear-removal-result.png';
    link.href = finalResult;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t[lang].title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {/* 区域选择器 */}
          <SmearRemovalSelector
            imageUrl={imageUrl}
            onAreasSelected={handleAreasSelected}
            onPreviewRequested={handlePreview}
            onProcessRequested={handleProcess}
            lang={lang}
          />

          {/* 结果显示区域 */}
          {(previewResult || finalResult || isProcessing || isPreviewing) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {finalResult ? t[lang].processSuccess : t[lang].previewSuccess}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 原图 */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {lang === 'zh' ? '原图' : 'Original'}
                  </h4>
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full h-64 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg"
                  />
                </div>

                {/* 处理结果 */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {finalResult ? (lang === 'zh' ? '最终结果' : 'Final Result') : (lang === 'zh' ? '预览结果' : 'Preview Result')}
                  </h4>
                  <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    {(isProcessing || isPreviewing) ? (
                      <div className="text-center">
                        <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isProcessing ? t[lang].processing : t[lang].previewing}
                        </p>
                      </div>
                    ) : (previewResult || finalResult) ? (
                      <img
                        src={finalResult || previewResult}
                        alt="Result"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              {finalResult && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <Download size={20} />
                    {t[lang].download}
                  </button>
                  <button
                    onClick={() => onComplete?.(finalResult)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Play size={20} />
                    {t[lang].complete}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">
                ❌ {error}
              </p>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 {t[lang].tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t[lang].close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmearRemovalModal;