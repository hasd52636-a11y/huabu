/**
 * 视频高级编辑模态框
 * 
 * 功能：
 * - 视频换人 (Character Replacement)
 * - 多图生视频 (Multi-Image to Video)
 * - 舞动人像 (Dance Animation)
 * - 视频风格转换 (Style Transfer)
 * - 图生动作 (Image to Action)
 */

import React, { useState, useEffect } from 'react';
import { X, Play, Users, Image as ImageIcon, Sparkles, Upload, Settings } from 'lucide-react';
import { VideoInput, ShenmaVideoOptions, Character } from '../types';
// import MultiImageUploader from './MultiImageUploader'; // Moved to UnusedComponents.tsx

interface VideoAdvancedEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    type: 'character-replace' | 'multi-image-to-video' | 'dance' | 'style-transfer' | 'image-to-action',
    prompt: string,
    options: ShenmaVideoOptions & {
      sourceVideo?: string;
      sourceImages?: (File | string)[];
      targetCharacter?: Character;
      danceStyle?: string;
      styleReference?: string;
    }
  ) => Promise<void>;
  lang: 'zh' | 'en';
  initialVideo?: string;
  availableCharacters?: Character[];
}

const VideoAdvancedEditModal: React.FC<VideoAdvancedEditModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  lang,
  initialVideo,
  availableCharacters = []
}) => {
  const [activeTab, setActiveTab] = useState<'character-replace' | 'multi-image-to-video' | 'dance' | 'style-transfer' | 'image-to-action'>('character-replace');
  const [prompt, setPrompt] = useState('');
  const [sourceVideo, setSourceVideo] = useState(initialVideo || '');
  const [sourceImages, setSourceImages] = useState<(File | string)[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [danceStyle, setDanceStyle] = useState('modern');
  const [styleReference, setStyleReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [options, setOptions] = useState<ShenmaVideoOptions>({
    model: 'sora-2',
    aspectRatio: '16:9',
    duration: '10',
    hd: false
  });

  const t = {
    zh: {
      title: '视频高级编辑',
      characterReplace: '视频换人',
      multiImageToVideo: '多图生视频',
      dance: '舞动人像',
      styleTransfer: '风格转换',
      imageToAction: '图生动作',
      prompt: '编辑提示词',
      promptPlaceholder: '描述你想要的视频效果...',
      sourceVideo: '源视频',
      sourceImages: '源图片',
      selectCharacter: '选择角色',
      danceStyle: '舞蹈风格',
      styleRef: '风格参考',
      generate: '开始生成',
      cancel: '取消',
      processing: '处理中...',
      uploadVideo: '上传视频',
      uploadImages: '上传图片',
      noCharacter: '未选择角色',
      selectCharacterTip: '请选择一个角色进行替换',
      noImages: '请至少上传一张图片',
      noVideo: '请上传源视频',
      maxImages: '最多支持10张图片',
      danceStyles: {
        modern: '现代舞',
        classical: '古典舞',
        hiphop: '街舞',
        ballet: '芭蕾',
        latin: '拉丁舞',
        jazz: '爵士舞'
      }
    },
    en: {
      title: 'Advanced Video Editing',
      characterReplace: 'Character Replace',
      multiImageToVideo: 'Multi-Image to Video',
      dance: 'Dance Animation',
      styleTransfer: 'Style Transfer',
      imageToAction: 'Image to Action',
      prompt: 'Edit Prompt',
      promptPlaceholder: 'Describe the video effect you want...',
      sourceVideo: 'Source Video',
      sourceImages: 'Source Images',
      selectCharacter: 'Select Character',
      danceStyle: 'Dance Style',
      styleRef: 'Style Reference',
      generate: 'Start Generation',
      cancel: 'Cancel',
      processing: 'Processing...',
      uploadVideo: 'Upload Video',
      uploadImages: 'Upload Images',
      noCharacter: 'No Character Selected',
      selectCharacterTip: 'Please select a character for replacement',
      noImages: 'Please upload at least one image',
      noVideo: 'Please upload source video',
      maxImages: 'Maximum 10 images supported',
      danceStyles: {
        modern: 'Modern',
        classical: 'Classical',
        hiphop: 'Hip Hop',
        ballet: 'Ballet',
        latin: 'Latin',
        jazz: 'Jazz'
      }
    }
  };

  const tabs = [
    { id: 'character-replace', label: t[lang].characterReplace, icon: Users },
    { id: 'multi-image-to-video', label: t[lang].multiImageToVideo, icon: ImageIcon },
    { id: 'dance', label: t[lang].dance, icon: Sparkles },
    { id: 'style-transfer', label: t[lang].styleTransfer, icon: Settings },
    { id: 'image-to-action', label: t[lang].imageToAction, icon: Play }
  ] as const;

  const handleGenerate = async () => {
    // Validation based on active tab
    switch (activeTab) {
      case 'character-replace':
        if (!sourceVideo) {
          alert(t[lang].noVideo);
          return;
        }
        if (!selectedCharacter) {
          alert(t[lang].selectCharacterTip);
          return;
        }
        break;
      case 'multi-image-to-video':
        if (sourceImages.length === 0) {
          alert(t[lang].noImages);
          return;
        }
        if (sourceImages.length > 10) {
          alert(t[lang].maxImages);
          return;
        }
        break;
      case 'dance':
        if (sourceImages.length === 0) {
          alert(t[lang].noImages);
          return;
        }
        break;
      case 'style-transfer':
        if (!sourceVideo) {
          alert(t[lang].noVideo);
          return;
        }
        break;
      case 'image-to-action':
        if (sourceImages.length === 0) {
          alert(t[lang].noImages);
          return;
        }
        break;
    }

    setIsProcessing(true);
    try {
      await onGenerate(activeTab, prompt, {
        ...options,
        sourceVideo,
        sourceImages,
        targetCharacter: selectedCharacter || undefined,
        danceStyle,
        styleReference
      });
      onClose();
    } catch (error) {
      console.error('Video generation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert(lang === 'zh' ? '视频文件大小不能超过 100MB' : 'Video file size must be less than 100MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSourceVideo(content);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
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
              rows={3}
            />
          </div>

          {/* Tab-specific Content */}
          {activeTab === 'character-replace' && (
            <div className="space-y-4">
              {/* Source Video */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].sourceVideo}
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
                  {sourceVideo ? (
                    <video
                      src={sourceVideo}
                      controls
                      className="w-full max-h-48 rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload size={48} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-600 dark:text-slate-400 mb-2">{t[lang].uploadVideo}</p>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                      >
                        {t[lang].uploadVideo}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Character Selection */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].selectCharacter}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableCharacters.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => setSelectedCharacter(character)}
                      className={`p-3 border rounded-lg transition-colors ${
                        selectedCharacter?.id === character.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                          {character.profile_picture_url ? (
                            <img
                              src={character.profile_picture_url}
                              alt={character.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users size={20} className="text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {character.username}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {availableCharacters.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-500">
                      {t[lang].noCharacter}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'multi-image-to-video' && (
            <div>
              <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t[lang].sourceImages} ({sourceImages.length}/10)
              </label>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {lang === 'zh' ? '多图上传功能暂时不可用' : 'Multi-image upload temporarily unavailable'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dance' && (
            <div className="space-y-4">
              {/* Source Images */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].sourceImages} ({sourceImages.length}/5)
                </label>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {lang === 'zh' ? '多图上传功能暂时不可用' : 'Multi-image upload temporarily unavailable'}
                  </p>
                </div>
              </div>

              {/* Dance Style */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].danceStyle}
                </label>
                <select
                  value={danceStyle}
                  onChange={(e) => setDanceStyle(e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {Object.entries(t[lang].danceStyles).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'style-transfer' && (
            <div className="space-y-4">
              {/* Source Video */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].sourceVideo}
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
                  {sourceVideo ? (
                    <video
                      src={sourceVideo}
                      controls
                      className="w-full max-h-48 rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload size={48} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-600 dark:text-slate-400 mb-2">{t[lang].uploadVideo}</p>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload-style"
                      />
                      <label
                        htmlFor="video-upload-style"
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                      >
                        {t[lang].uploadVideo}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Style Reference */}
              <div>
                <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t[lang].styleRef}
                </label>
                <input
                  type="text"
                  value={styleReference}
                  onChange={(e) => setStyleReference(e.target.value)}
                  placeholder={lang === 'zh' ? '输入风格描述或上传参考图片...' : 'Enter style description or upload reference image...'}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'image-to-action' && (
            <div>
              <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t[lang].sourceImages} ({sourceImages.length}/5)
              </label>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {lang === 'zh' ? '多图上传功能暂时不可用' : 'Multi-image upload temporarily unavailable'}
                </p>
              </div>
            </div>
          )}

          {/* Video Options */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
              {lang === 'zh' ? '视频设置' : 'Video Settings'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'zh' ? '比例' : 'Aspect Ratio'}
                </label>
                <select
                  value={options.aspectRatio}
                  onChange={(e) => setOptions(prev => ({ ...prev, aspectRatio: e.target.value as '16:9' | '9:16' }))}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="16:9">16:9 (横屏)</option>
                  <option value="9:16">9:16 (竖屏)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'zh' ? '时长' : 'Duration'}
                </label>
                <select
                  value={options.duration}
                  onChange={(e) => setOptions(prev => ({ ...prev, duration: e.target.value as '10' | '15' | '25' }))}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="10">10秒</option>
                  <option value="15">15秒</option>
                  <option value="25">25秒</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {lang === 'zh' ? '高清' : 'HD Quality'}
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.hd}
                    onChange={(e) => setOptions(prev => ({ ...prev, hd: e.target.checked }))}
                    className="mr-2"
                  />
                  {lang === 'zh' ? '启用高清' : 'Enable HD'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={isProcessing}
          >
            {t[lang].cancel}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg transition-colors"
          >
            {isProcessing ? t[lang].processing : t[lang].generate}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoAdvancedEditModal;