import React, { useState, useRef, useEffect } from 'react';
import { Target, ChevronDown } from 'lucide-react';
import { BlockType } from '../types';
import { getAvailableModels, getDefaultModel } from '../config/smartRouting';

interface ModelSelectorIconProps {
  chatMode: BlockType;
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  isVisible: boolean;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const ModelSelectorIcon: React.FC<ModelSelectorIconProps> = ({
  chatMode,
  selectedModel,
  onModelSelect,
  isVisible,
  theme,
  lang
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isVisible) return null;

  const availableModels = getAvailableModels(chatMode);
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    setIsDropdownOpen(false);
  };

  const getTypeLabel = (type: BlockType) => {
    const labels = {
      text: lang === 'zh' ? '文本' : 'Text',
      image: lang === 'zh' ? '图片' : 'Image', 
      video: lang === 'zh' ? '视频' : 'Video'
    };
    return labels[type] || type;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="p-3 text-slate-400 hover:text-amber-500 transition-colors group"
        title={lang === 'zh' ? `选择${getTypeLabel(chatMode)}模型` : `Select ${getTypeLabel(chatMode)} Model`}
      >
        <div className="relative">
          <Target size={22} />
          <ChevronDown 
            size={12} 
            className={`absolute -bottom-1 -right-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isDropdownOpen && (
        <div className={`absolute bottom-full right-0 mb-2 w-80 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto`}>
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Target size={16} className="text-amber-500" />
              <span className="font-semibold text-sm">
                {lang === 'zh' ? `${getTypeLabel(chatMode)}模型选择` : `${getTypeLabel(chatMode)} Model Selection`}
              </span>
            </div>
            {currentModel && (
              <div className="text-xs text-slate-500 mt-1">
                {lang === 'zh' ? '当前：' : 'Current: '}{currentModel.name}
              </div>
            )}
          </div>

          <div className="p-2">
            {availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors ${
                  selectedModel === model.id
                    ? theme === 'dark' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-amber-50 text-amber-600'
                    : theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-200'
                      : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs opacity-70 mt-1">{model.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {model.priority === 1 && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 rounded-full">
                        {lang === 'zh' ? '推荐' : 'Recommended'}
                      </span>
                    )}
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} text-xs text-slate-500`}>
            {lang === 'zh' ? '💡 优先级高的模型性能更好' : '💡 Higher priority models offer better performance'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelectorIcon;