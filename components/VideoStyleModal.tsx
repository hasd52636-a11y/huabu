import React, { useState } from 'react';
import { X, Palette, Sparkles, Film, Zap, Sun, Moon, Waves } from 'lucide-react';

interface VideoStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (style: string, options: any) => void;
  videoUrl?: string;
}

const VideoStyleModal: React.FC<VideoStyleModalProps> = ({
  isOpen,
  onClose,
  onApplyStyle,
  videoUrl
}) => {
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [intensity, setIntensity] = useState<number>(0.7);
  const [preserveMotion, setPreserveMotion] = useState<boolean>(true);

  if (!isOpen) return null;

  const styleOptions = [
    {
      id: 'cinematic',
      name: '电影风格',
      description: '专业电影级别的色彩和光影效果',
      icon: <Film className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'anime',
      name: '动漫风格',
      description: '日式动漫风格，鲜艳色彩和夸张表现',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'vintage',
      name: '复古风格',
      description: '怀旧复古色调，温暖的色彩搭配',
      icon: <Sun className="w-6 h-6" />,
      color: 'from-orange-500 to-yellow-500'
    },
    {
      id: 'cyberpunk',
      name: '赛博朋克',
      description: '未来科技感，霓虹灯和暗色调',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'noir',
      name: '黑白电影',
      description: '经典黑白电影风格，高对比度',
      icon: <Moon className="w-6 h-6" />,
      color: 'from-gray-600 to-gray-800'
    },
    {
      id: 'watercolor',
      name: '水彩画风',
      description: '柔和的水彩画效果，艺术感强',
      icon: <Palette className="w-6 h-6" />,
      color: 'from-rose-500 to-pink-500'
    },
    {
      id: 'dreamy',
      name: '梦幻风格',
      description: '柔焦梦幻效果，浪漫氛围',
      icon: <Waves className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const handleApplyStyle = () => {
    const options = {
      intensity,
      preserveMotion,
      quality: 'high'
    };
    onApplyStyle(selectedStyle, options);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">视频风格迁移</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">选择风格和调整参数</p>
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
          {/* Video Preview */}
          {videoUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                原视频预览
              </label>
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700 aspect-video">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-cover"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            </div>
          )}

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              风格选择
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {styleOptions.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all overflow-hidden ${
                    selectedStyle === style.id
                      ? 'border-amber-500 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-10`} />
                  
                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <div className={`inline-flex p-3 rounded-xl mb-3 bg-gradient-to-br ${style.color} text-white`}>
                      {style.icon}
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-1">{style.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{style.description}</p>
                  </div>

                  {/* Selection Indicator */}
                  {selectedStyle === style.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              风格强度: {Math.round(intensity * 100)}%
            </label>
            <div className="relative">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>轻微</span>
                <span>适中</span>
                <span>强烈</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              高级选项
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveMotion}
                  onChange={(e) => setPreserveMotion(e.target.checked)}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">保持原始动作</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">保持视频中人物和物体的原始运动轨迹</p>
                </div>
              </label>
            </div>
          </div>

          {/* Style Description */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
              {styleOptions.find(s => s.id === selectedStyle)?.name}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {styleOptions.find(s => s.id === selectedStyle)?.description}
            </p>
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              <p>• 处理时间: 约2-5分钟</p>
              <p>• 输出质量: 高清</p>
              <p>• 保持原始时长</p>
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
            onClick={handleApplyStyle}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            应用风格
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default VideoStyleModal;