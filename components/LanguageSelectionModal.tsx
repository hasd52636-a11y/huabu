import React, { useState } from 'react';
import { X, Globe, ArrowRight, Check } from 'lucide-react';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (targetLanguage: string, options: any) => void;
  currentText: string;
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  onClose,
  onTranslate,
  currentText
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translationMode, setTranslationMode] = useState<string>('standard');
  const [preserveFormatting, setPreserveFormatting] = useState<boolean>(true);

  if (!isOpen) return null;

  const languages = [
    { code: 'en', name: '英语', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日语', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '韩语', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'fr', name: '法语', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: '德语', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: '西班牙语', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'it', name: '意大利语', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: '葡萄牙语', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: '俄语', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: '阿拉伯语', nativeName: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: '印地语', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'th', name: '泰语', nativeName: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: '越南语', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: '印尼语', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' }
  ];

  const translationModes = [
    {
      id: 'standard',
      name: '标准翻译',
      description: '准确翻译，保持原文意思'
    },
    {
      id: 'formal',
      name: '正式翻译',
      description: '使用正式语言风格'
    },
    {
      id: 'casual',
      name: '口语翻译',
      description: '使用日常口语表达'
    },
    {
      id: 'literary',
      name: '文学翻译',
      description: '优美的文学表达方式'
    }
  ];

  const handleTranslate = () => {
    const options = {
      mode: translationMode,
      preserveFormatting,
      quality: 'high'
    };
    onTranslate(selectedLanguage, options);
    onClose();
  };

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">文本翻译</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">选择目标语言和翻译选项</p>
            </div>
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
          {/* Translation Preview */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🇨🇳</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">中文</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {currentText.substring(0, 100)}
                {currentText.length > 100 && '...'}
              </p>
            </div>
            
            <ArrowRight className="w-6 h-6 text-blue-500 flex-shrink-0" />
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selectedLang?.flag}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedLang?.name}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                翻译结果将在这里显示...
              </p>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              目标语言
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => setSelectedLanguage(language.code)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    selectedLanguage === language.code
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{language.flag}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 dark:text-white text-sm truncate">
                        {language.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {language.nativeName}
                      </p>
                    </div>
                    {selectedLanguage === language.code && (
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Translation Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              翻译风格
            </label>
            <div className="grid grid-cols-2 gap-3">
              {translationModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setTranslationMode(mode.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    translationMode === mode.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <h4 className="font-medium text-gray-800 dark:text-white mb-1">{mode.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              翻译选项
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveFormatting}
                  onChange={(e) => setPreserveFormatting(e.target.checked)}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">保持格式</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">保持原文的段落、标点和格式结构</p>
                </div>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">翻译说明</h4>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p>• 使用AI智能翻译，准确度高</p>
              <p>• 支持上下文理解和语境适配</p>
              <p>• 保持原文的语气和风格</p>
              <p>• 处理时间: 通常在10秒内完成</p>
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
            onClick={handleTranslate}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            开始翻译
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionModal;