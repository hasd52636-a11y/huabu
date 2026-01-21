/**
 * 语音设置模态框
 * 允许用户选择不同的语音选项，包括台湾女声
 */

import React, { useState, useEffect } from 'react';
import { X, Volume2, Play } from 'lucide-react';
import { voiceSettingsService, VoiceOption } from '../services/VoiceSettingsService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: 'zh' | 'en';
}

const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  currentLang
}) => {
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [currentSettings, setCurrentSettings] = useState<VoiceOption | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVoiceOptions(voiceSettingsService.getVoiceOptions());
      setCurrentSettings(voiceSettingsService.getCurrentVoiceSettings());
    }
  }, [isOpen]);

  const handleVoiceSelect = (voiceId: string) => {
    const success = voiceSettingsService.setVoiceSettings(voiceId);
    if (success) {
      setCurrentSettings(voiceSettingsService.getCurrentVoiceSettings());
    }
  };

  const handleTestVoice = (voiceId: string) => {
    setIsPlaying(voiceId);
    voiceSettingsService.testVoice(voiceId);
    
    // 3秒后重置播放状态
    setTimeout(() => {
      setIsPlaying(null);
    }, 3000);
  };

  const getRegionFlag = (region: string) => {
    const flags: { [key: string]: string } = {
      '大陆': '🇨🇳',
      '台湾': '🇹🇼',
      '香港': '🇭🇰',
      '四川': '🌶️',
      '美国': '🇺🇸'
    };
    return flags[region] || '🌐';
  };

  const getFilteredVoices = () => {
    // 根据当前语言过滤语音选项
    if (currentLang === 'zh') {
      return voiceOptions.filter(voice => voice.lang.startsWith('zh'));
    } else {
      return voiceOptions.filter(voice => voice.lang.startsWith('en'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              语音设置
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 当前设置显示 */}
        {currentSettings && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getRegionFlag(currentSettings.region)}</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                当前语音：{currentSettings.name}
              </span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              语言：{currentSettings.lang} | 性别：{currentSettings.gender === 'female' ? '女声' : '男声'}
            </div>
          </div>
        )}

        {/* 语音选项列表 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            选择语音
          </h3>
          <div className="space-y-2">
            {getFilteredVoices().map((voice) => (
              <div
                key={voice.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentSettings?.id === voice.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                }`}
                onClick={() => handleVoiceSelect(voice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getRegionFlag(voice.region)}</span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {voice.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {voice.region} | {voice.gender === 'female' ? '女声' : '男声'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestVoice(voice.id);
                    }}
                    disabled={isPlaying === voice.id}
                    className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    {isPlaying === voice.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            💡 推荐：台湾甜美女声 | 四川话男声很有特色哦 🌶️👨
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                voiceSettingsService.clearCache();
                window.location.reload();
              }}
              className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors text-sm"
            >
              清除缓存
            </button>
            <button
              onClick={() => currentSettings && handleTestVoice(currentSettings.id)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              测试当前语音
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettingsModal;