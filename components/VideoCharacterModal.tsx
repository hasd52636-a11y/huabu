/**
 * Video Character Replacement Modal Component
 * 
 * Features:
 * - Character selection interface
 * - Replacement parameter configuration
 * - Progress tracking and status display
 * - Character detection and selection
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Upload, User, Play, Pause, RotateCcw, 
  CheckCircle, AlertCircle, Clock, Settings 
} from 'lucide-react';

interface VideoCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  onReplace: (params: CharacterReplaceParams) => Promise<{ taskId: string; videoUrl?: string }>;
  onTrackProgress: (taskId: string) => Promise<ProgressStatus>;
  lang?: 'zh' | 'en';
}

interface CharacterReplaceParams {
  videoUrl: string;
  characterImageUrl: string;
  prompt?: string;
  preserveMotion?: boolean;
  qualityLevel?: 'standard' | 'high';
  characterId?: string;
}

interface ProgressStatus {
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

interface DetectedCharacter {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  timestamp: number;
}

const VideoCharacterModal: React.FC<VideoCharacterModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  onReplace,
  onTrackProgress,
  lang = 'zh'
}) => {
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [characterImageUrl, setCharacterImageUrl] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [preserveMotion, setPreserveMotion] = useState(true);
  const [qualityLevel, setQualityLevel] = useState<'standard' | 'high'>('standard');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [progress, setProgress] = useState<ProgressStatus | null>(null);
  const [detectedCharacters, setDetectedCharacters] = useState<DetectedCharacter[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resultVideoUrl, setResultVideoUrl] = useState<string>('');

  const t = {
    zh: {
      title: '视频角色替换',
      selectCharacter: '选择替换角色',
      uploadImage: '上传角色图片',
      dragDrop: '拖拽图片到此处或点击上传',
      supportedFormats: '支持 JPG, PNG, WebP 格式',
      prompt: '替换提示词',
      promptPlaceholder: '描述角色替换的具体要求...',
      preserveMotion: '保持原有动作',
      qualityLevel: '质量级别',
      standard: '标准',
      high: '高质量',
      detectedCharacters: '检测到的角色',
      selectCharacterToReplace: '选择要替换的角色',
      noCharactersDetected: '未检测到角色',
      advanced: '高级设置',
      startReplacement: '开始替换',
      cancel: '取消',
      processing: '处理中...',
      pending: '等待中',
      running: '处理中',
      succeeded: '完成',
      failed: '失败',
      progress: '进度',
      estimatedTime: '预计时间',
      result: '结果',
      downloadResult: '下载结果',
      tryAgain: '重试',
      close: '关闭'
    },
    en: {
      title: 'Video Character Replacement',
      selectCharacter: 'Select Replacement Character',
      uploadImage: 'Upload Character Image',
      dragDrop: 'Drag image here or click to upload',
      supportedFormats: 'Supports JPG, PNG, WebP formats',
      prompt: 'Replacement Prompt',
      promptPlaceholder: 'Describe specific requirements for character replacement...',
      preserveMotion: 'Preserve Original Motion',
      qualityLevel: 'Quality Level',
      standard: 'Standard',
      high: 'High Quality',
      detectedCharacters: 'Detected Characters',
      selectCharacterToReplace: 'Select character to replace',
      noCharactersDetected: 'No characters detected',
      advanced: 'Advanced Settings',
      startReplacement: 'Start Replacement',
      cancel: 'Cancel',
      processing: 'Processing...',
      pending: 'Pending',
      running: 'Running',
      succeeded: 'Completed',
      failed: 'Failed',
      progress: 'Progress',
      estimatedTime: 'Estimated Time',
      result: 'Result',
      downloadResult: 'Download Result',
      tryAgain: 'Try Again',
      close: 'Close'
    }
  };

  // Mock character detection for demo
  useEffect(() => {
    if (isOpen && videoUrl) {
      // Simulate character detection
      setTimeout(() => {
        setDetectedCharacters([
          {
            id: 'character_1',
            boundingBox: { x: 100, y: 50, width: 200, height: 400 },
            confidence: 0.95,
            timestamp: 0
          },
          {
            id: 'character_2',
            boundingBox: { x: 350, y: 80, width: 180, height: 380 },
            confidence: 0.87,
            timestamp: 5
          }
        ]);
      }, 1000);
    }
  }, [isOpen, videoUrl]);

  // Progress tracking
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (currentTaskId && isProcessing) {
      intervalId = setInterval(async () => {
        try {
          const status = await onTrackProgress(currentTaskId);
          setProgress(status);
          
          if (status.status === 'SUCCEEDED') {
            setIsProcessing(false);
            if (status.videoUrl) {
              setResultVideoUrl(status.videoUrl);
            }
          } else if (status.status === 'FAILED') {
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Progress tracking failed:', error);
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, isProcessing, onTrackProgress]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCharacterImage(file);
      setCharacterImageUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setCharacterImage(file);
      setCharacterImageUrl(URL.createObjectURL(file));
    }
  };

  const handleStartReplacement = async () => {
    if (!characterImage && !characterImageUrl) {
      alert(lang === 'zh' ? '请先上传角色图片' : 'Please upload character image first');
      return;
    }

    setIsProcessing(true);
    setProgress({ status: 'PENDING' });

    try {
      const params: CharacterReplaceParams = {
        videoUrl,
        characterImageUrl: characterImageUrl || URL.createObjectURL(characterImage!),
        prompt: prompt || (lang === 'zh' ? '替换视频中的角色，保持原有动作和场景' : 'Replace character in video while preserving original motion and scene'),
        preserveMotion,
        qualityLevel,
        characterId: selectedCharacterId
      };

      const result = await onReplace(params);
      
      if (result.videoUrl) {
        // Synchronous result
        setResultVideoUrl(result.videoUrl);
        setIsProcessing(false);
        setProgress({ status: 'SUCCEEDED', progress: 100, videoUrl: result.videoUrl });
      } else if (result.taskId) {
        // Asynchronous task
        setCurrentTaskId(result.taskId);
        setProgress({ status: 'PENDING', progress: 0 });
      }
    } catch (error) {
      console.error('Character replacement failed:', error);
      setIsProcessing(false);
      setProgress({ 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const handleReset = () => {
    setCharacterImage(null);
    setCharacterImageUrl('');
    setPrompt('');
    setSelectedCharacterId('');
    setIsProcessing(false);
    setCurrentTaskId('');
    setProgress(null);
    setResultVideoUrl('');
  };

  const getStatusIcon = () => {
    if (!progress) return null;
    
    switch (progress.status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'RUNNING':
        return <Play className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'SUCCEEDED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getEstimatedTime = () => {
    if (!progress || progress.status !== 'RUNNING') return null;
    
    const progressPercent = progress.progress || 0;
    if (progressPercent === 0) return null;
    
    // Rough estimation based on progress
    const estimatedTotal = 300; // 5 minutes average
    const remaining = Math.round((estimatedTotal * (100 - progressPercent)) / 100);
    
    return `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t[lang].title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Character Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t[lang].selectCharacter}
            </label>
            
            {!characterImageUrl ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('character-upload')?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {t[lang].dragDrop}
                </p>
                <p className="text-sm text-gray-500">
                  {t[lang].supportedFormats}
                </p>
                <input
                  id="character-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={characterImageUrl}
                  alt="Character"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setCharacterImage(null);
                    setCharacterImageUrl('');
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Detected Characters */}
          {detectedCharacters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t[lang].detectedCharacters}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {detectedCharacters.map((character) => (
                  <div
                    key={character.id}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCharacterId === character.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {lang === 'zh' ? `角色 ${character.id.split('_')[1]}` : `Character ${character.id.split('_')[1]}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang === 'zh' ? '置信度' : 'Confidence'}: {Math.round(character.confidence * 100)}%
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t[lang].selectCharacterToReplace}
              </p>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t[lang].prompt}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t[lang].promptPlaceholder}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              rows={3}
            />
          </div>

          {/* Advanced Settings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t[lang].advanced}
              </label>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Settings size={16} />
                {showAdvanced ? '隐藏' : '显示'}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t[lang].preserveMotion}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveMotion}
                      onChange={(e) => setPreserveMotion(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[lang].qualityLevel}
                  </label>
                  <select
                    value={qualityLevel}
                    onChange={(e) => setQualityLevel(e.target.value as 'standard' | 'high')}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="standard">{t[lang].standard}</option>
                    <option value="high">{t[lang].high}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t[lang][progress.status.toLowerCase() as keyof typeof t[typeof lang]]}
                  </span>
                </div>
                {progress.progress !== undefined && (
                  <span className="text-sm text-gray-500">
                    {progress.progress}%
                  </span>
                )}
              </div>

              {progress.progress !== undefined && progress.status === 'RUNNING' && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  {getEstimatedTime() && (
                    <p className="text-sm text-gray-500">
                      {t[lang].estimatedTime}: {getEstimatedTime()}
                    </p>
                  )}
                </div>
              )}

              {progress.error && (
                <p className="text-sm text-red-500 mt-2">
                  {progress.error}
                </p>
              )}
            </div>
          )}

          {/* Result Video */}
          {resultVideoUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t[lang].result}
              </label>
              <video
                src={resultVideoUrl}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '300px' }}
              />
              <div className="flex justify-center mt-3">
                <a
                  href={resultVideoUrl}
                  download="character_replaced_video.mp4"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  {t[lang].downloadResult}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {progress?.status === 'FAILED' && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw size={16} className="inline mr-2" />
              {t[lang].tryAgain}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {resultVideoUrl ? t[lang].close : t[lang].cancel}
          </button>
          
          {!resultVideoUrl && !isProcessing && (
            <button
              onClick={handleStartReplacement}
              disabled={!characterImageUrl}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {t[lang].startReplacement}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCharacterModal;