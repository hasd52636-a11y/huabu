/**
 * 简化的语音会话模态框
 * 提供基本的语音功能入口
 */

import React from 'react';
import { X, Mic } from 'lucide-react';

interface VoiceSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreate?: (config: any) => void;
  lang?: 'zh' | 'en';
}

const VoiceSessionModal: React.FC<VoiceSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreate,
  lang = 'zh'
}) => {
  const t = {
    zh: {
      title: '语音会话',
      description: '使用主要的语音控制功能',
      useMainVoice: '使用主语音控制',
      close: '关闭'
    },
    en: {
      title: 'Voice Session',
      description: 'Use main voice control features',
      useMainVoice: 'Use Main Voice Control',
      close: 'Close'
    }
  };

  const currentLang = t[lang];

  if (!isOpen) return null;

  const handleUseMainVoice = () => {
    // 触发主语音控制功能
    if (onSessionCreate) {
      onSessionCreate({
        type: 'main_voice_control',
        enabled: true
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {currentLang.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {currentLang.description}
          </p>
          
          <button
            onClick={handleUseMainVoice}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Mic size={20} />
            {currentLang.useMainVoice}
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            {currentLang.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSessionModal;