/**
 * 图片编辑模态框
 * 
 * 功能：
 * - 多图片上传和管理
 * - 编辑参数配置
 * - 预设选择
 * - 实时预览（无API调用）
 * - 编辑历史管理
 */

import React, { useState, useEffect } from 'react';
import { X, Edit3, History, Save, Undo, Settings } from 'lucide-react';
import { ImageInput, ShenmaImageEditOptions, EditPreset, EditOperation } from '../types';
import SmearEditCanvas from './SmearEditCanvas';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (images: ImageInput[], prompt: string, options: ShenmaImageEditOptions) => Promise<void>;
  lang: 'zh' | 'en';
  initialImages?: ImageInput[];
  initialPrompt?: string;
}

const ImageEditModal: React.FC<ImageEditModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  lang,
  initialImages = [],
  initialPrompt = ''
}) => {
  const [images, setImages] = useState<ImageInput[]>(initialImages);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [options, setOptions] = useState<ShenmaImageEditOptions>({
    aspectRatio: '1:1',
    imageSize: '2K',
    model: 'nano-banana',
    compositionMode: 'blend',
    guidanceScale: 7.5,
    steps: 20
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editHistory, setEditHistory] = useState<EditOperation[]>([]);
  const [showSmearEditor, setShowSmearEditor] = useState(false);
  const [currentMask, setCurrentMask] = useState<string>('');
  const [brushSize, setBrushSize] = useState(20);

  const t = {
    zh: {
      title: '图片编辑',
      prompt: '编辑提示词',
      promptPlaceholder: '描述你想要的编辑效果...',
      images: '图片',
      parameters: '参数',
      advanced: '高级选项',
      history: '编辑历史',
      edit: '开始编辑',
      cancel: '取消',
      processing: '处理中...',
      noImages: '请至少上传一张图片',
      maxImages: '最多支持5张图片',
      undo: '撤销',
      save: '保存',
      tip: '提示：多张图片将根据权重和模式进行混合编辑',
      smearEdit: '涂抹编辑',
      maskEdit: '蒙版编辑',
      backToEdit: '返回编辑'
    },
    en: {
      title: 'Image Editing',
      prompt: 'Edit Prompt',
      promptPlaceholder: 'Describe the editing effect you want...',
      images: 'Images',
      parameters: 'Parameters',
      advanced: 'Advanced Options',
      history: 'Edit History',
      edit: 'Start Editing',
      cancel: 'Cancel',
      processing: 'Processing...',
      noImages: 'Please upload at least one image',
      maxImages: 'Maximum 5 images supported',
      undo: 'Undo',
      save: 'Save',
      tip: 'Tip: Multiple images will be blended according to weights and mode',
      smearEdit: 'Smear Edit',
      maskEdit: 'Mask Edit',
      backToEdit: 'Back to Edit'
    }
  };

  // Load edit history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('imageEditHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setEditHistory(history.slice(-5)); // Keep last 5 operations
      } catch (error) {
        console.warn('Failed to load edit history:', error);
      }
    }
  }, []);

  // Save edit history to localStorage
  const saveEditHistory = (operation: EditOperation) => {
    const newHistory = [...editHistory, operation].slice(-5);
    setEditHistory(newHistory);
    localStorage.setItem('imageEditHistory', JSON.stringify(newHistory));
  };

  const handleImagesChange = (newImages: ImageInput[]) => {
    setImages(newImages);
  };

  const handleOptionsChange = (newOptions: Partial<ShenmaImageEditOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  };

  const handlePresetSelect = (preset: EditPreset) => {
    setOptions(prev => ({ ...prev, ...preset.options }));
    // 如果预设包含提示词模板，自动填充提示词
    if (preset.promptTemplate) {
      setPrompt(preset.promptTemplate);
    }
  };

  const handleEdit = async () => {
    if (images.length === 0) {
      alert(t[lang].noImages);
      return;
    }

    if (images.length > 5) {
      alert(t[lang].maxImages);
      return;
    }

    setIsProcessing(true);
    try {
      // If we have a mask from smear editing, include it in the edit options
      const editOptions = currentMask ? {
        ...options,
        maskImage: currentMask
      } : options;

      await onEdit(images, prompt, editOptions);
      
      // Save to history
      const operation: EditOperation = {
        id: Date.now().toString(),
        type: 'multi_edit',
        inputs: images,
        result: {
          resultImage: '', // Will be filled by the service
          metadata: {
            operation: 'multi_edit',
            timestamp: Date.now(),
            inputCount: images.length,
            processingTime: 0
          }
        },
        timestamp: Date.now()
      };
      saveEditHistory(operation);
      
      onClose();
    } catch (error) {
      console.error('Edit failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = () => {
    if (editHistory.length > 0) {
      const lastOperation = editHistory[editHistory.length - 1];
      setImages(lastOperation.inputs);
      // Remove from history
      const newHistory = editHistory.slice(0, -1);
      setEditHistory(newHistory);
      localStorage.setItem('imageEditHistory', JSON.stringify(newHistory));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t[lang].title}
          </h2>
          <div className="flex items-center gap-2">
            {editHistory.length > 0 && (
              <button
                onClick={handleUndo}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={t[lang].undo}
              >
                <Undo size={20} className="text-slate-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={24} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Prompt Input */}
          <div>
            <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t[lang].prompt}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t[lang].promptPlaceholder}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              rows={4}
            />
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t[lang].images} ({images.length}/5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleImagesChange(files.slice(0, 5));
                  }
                }}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <p className="text-gray-600 dark:text-gray-400">
                  {lang === 'zh' ? '点击上传图片' : 'Click to upload images'}
                </p>
                <p className="text-sm text-gray-500">
                  {lang === 'zh' ? `已选择 ${images.length}/5 张图片` : `Selected ${images.length}/5 images`}
                </p>
              </label>
            </div>
          </div>

          {/* Parameter Panel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-base font-medium text-slate-700 dark:text-slate-300">
                {t[lang].parameters}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Settings size={16} />
                  {t[lang].advanced}
                </button>
                {images.length > 0 && (
                  <button
                    onClick={() => setShowSmearEditor(!showSmearEditor)}
                    className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
                  >
                    <Edit3 size={16} />
                    {t[lang].smearEdit}
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'zh' ? '参数编辑功能暂时不可用' : 'Parameter editing temporarily unavailable'}
              </p>
            </div>
          </div>

          {/* Smear Edit Canvas */}
          {showSmearEditor && images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-base font-medium text-slate-700 dark:text-slate-300">
                  {t[lang].maskEdit}
                </label>
                <button
                  onClick={() => setShowSmearEditor(false)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {t[lang].backToEdit}
                </button>
              </div>
              <SmearEditCanvas
                imageUrl={typeof images[0] === 'string' ? images[0] : URL.createObjectURL(images[0])}
                onMaskGenerated={(maskDataUrl) => setCurrentMask(maskDataUrl)}
                lang={lang}
              />
              {currentMask && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {lang === 'zh' ? '✓ 蒙版已创建，将在编辑时应用' : '✓ Mask created, will be applied during editing'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Edit History */}
          {editHistory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-slate-600 dark:text-slate-400" />
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t[lang].history} ({editHistory.length})
                </label>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {editHistory.slice(-3).map((operation, index) => (
                  <div
                    key={operation.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300">
                        {operation.inputs.length} 张图片 • {operation.type}
                      </span>
                      <span className="text-sm text-slate-500">
                        {new Date(operation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          {images.length > 1 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-md">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                💡 {t[lang].tip}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={isProcessing}
          >
            {t[lang].cancel}
          </button>
          <button
            onClick={handleEdit}
            disabled={isProcessing || images.length === 0}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg transition-colors"
          >
            {isProcessing ? t[lang].processing : t[lang].edit}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditModal;