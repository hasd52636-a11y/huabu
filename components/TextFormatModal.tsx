import React, { useState } from 'react';
import { X, Type, List, FileText, AlignLeft, Hash } from 'lucide-react';

interface TextFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFormat: (formatType: string, options: any) => void;
  currentText: string;
}

const TextFormatModal: React.FC<TextFormatModalProps> = ({
  isOpen,
  onClose,
  onFormat,
  currentText
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('markdown');
  const [customOptions, setCustomOptions] = useState({
    style: 'professional',
    structure: 'hierarchical',
    language: 'zh'
  });

  if (!isOpen) return null;

  const formatOptions = [
    {
      id: 'markdown',
      name: 'Markdown格式',
      description: '转换为Markdown格式，添加标题、列表和强调',
      icon: <Hash className="w-5 h-5" />
    },
    {
      id: 'bullet-points',
      name: '要点列表',
      description: '重新组织为要点列表格式',
      icon: <List className="w-5 h-5" />
    },
    {
      id: 'paragraph',
      name: '段落格式',
      description: '重新组织为段落格式，确保逻辑清晰',
      icon: <AlignLeft className="w-5 h-5" />
    },
    {
      id: 'outline',
      name: '大纲格式',
      description: '转换为大纲格式，包含主要点和子点',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'summary',
      name: '摘要格式',
      description: '压缩为简洁的摘要格式',
      icon: <Type className="w-5 h-5" />
    }
  ];

  const handleFormat = () => {
    onFormat(selectedFormat, customOptions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">文本格式化</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">选择格式化类型和选项</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              格式化类型
            </label>
            <div className="grid grid-cols-1 gap-3">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedFormat(option.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedFormat === option.id
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${
                      selectedFormat === option.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-white">{option.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              风格选项
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['professional', 'casual', 'academic'].map((style) => (
                <button
                  key={style}
                  onClick={() => setCustomOptions(prev => ({ ...prev, style }))}
                  className={`p-3 rounded-xl border transition-colors ${
                    customOptions.style === style
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {style === 'professional' ? '专业' : style === 'casual' ? '随意' : '学术'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Structure Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              结构选项
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['hierarchical', 'linear'].map((structure) => (
                <button
                  key={structure}
                  onClick={() => setCustomOptions(prev => ({ ...prev, structure }))}
                  className={`p-3 rounded-xl border transition-colors ${
                    customOptions.structure === structure
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {structure === 'hierarchical' ? '层次结构' : '线性结构'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              原文预览
            </label>
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {currentText.substring(0, 200)}
                {currentText.length > 200 && '...'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/50 dark:border-slate-700/50">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleFormat}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
          >
            开始格式化
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextFormatModal;