/**
 * 手势控制器组件
 * 管理摄像头和手势识别的主要界面
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Hand, Settings, HelpCircle, X } from 'lucide-react';
import { gestureRecognizer, GestureResult, GestureType } from '../services/GestureRecognizer';

interface GestureControllerProps {
  isOpen: boolean;
  onClose: () => void;
  onGestureCommand: (gesture: GestureType) => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const GestureController: React.FC<GestureControllerProps> = ({
  isOpen,
  onClose,
  onGestureCommand,
  theme = 'dark',
  lang = 'zh'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');
  const [gestureCount, setGestureCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const t = {
    zh: {
      title: '手势控制',
      subtitle: '使用摄像头识别手势控制画布',
      startCamera: '启动摄像头',
      stopCamera: '停止摄像头',
      initializing: '正在初始化摄像头...',
      currentGesture: '当前手势',
      gestureCount: '识别次数',
      help: '手势帮助',
      settings: '设置',
      close: '关闭',
      error: '错误',
      cameraPermission: '请允许访问摄像头以使用手势控制功能',
      gestures: {
        idle: '无手势',
        zoom_in: '放大画布',
        zoom_out: '缩小画布',
        move_up: '向上移动',
        move_down: '向下移动',
        move_left: '向左移动',
        move_right: '向右移动',
        reset_view: '重置视角',
        clear_canvas: '清空画布',
        auto_layout: '自动布局',
        select_all: '全选模块'
      }
    },
    en: {
      title: 'Gesture Control',
      subtitle: 'Use camera to recognize gestures for canvas control',
      startCamera: 'Start Camera',
      stopCamera: 'Stop Camera',
      initializing: 'Initializing camera...',
      currentGesture: 'Current Gesture',
      gestureCount: 'Recognition Count',
      help: 'Gesture Help',
      settings: 'Settings',
      close: 'Close',
      error: 'Error',
      cameraPermission: 'Please allow camera access to use gesture control',
      gestures: {
        idle: 'No Gesture',
        zoom_in: 'Zoom In',
        zoom_out: 'Zoom Out',
        move_up: 'Move Up',
        move_down: 'Move Down',
        move_left: 'Move Left',
        move_right: 'Move Right',
        reset_view: 'Reset View',
        clear_canvas: 'Clear Canvas',
        auto_layout: 'Auto Layout',
        select_all: 'Select All'
      }
    }
  };

  const currentLang = t[lang];

  useEffect(() => {
    if (isOpen) {
      // 设置手势识别回调
      gestureRecognizer.setOnGestureCallback(handleGestureResult);
    }

    return () => {
      if (isActive) {
        stopGestureRecognition();
      }
    };
  }, [isOpen]);

  const handleGestureResult = (result: GestureResult) => {
    setCurrentGesture(result.gesture);
    setGestureCount(prev => prev + 1);
    
    // 显示AI分析信息（如果有）
    if (result.aiAnalysis) {
      console.log('[AI Gesture Analysis]', {
        intent: result.aiAnalysis.primaryIntent,
        confidence: result.aiAnalysis.confidence,
        reasoning: result.aiAnalysis.reasoning,
        alternatives: result.aiAnalysis.alternativeIntents
      });
    }
    
    // 触发手势命令
    onGestureCommand(result.gesture);
  };

  const startGestureRecognition = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      await gestureRecognizer.initialize(videoRef.current, canvasRef.current);
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '摄像头初始化失败');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopGestureRecognition = () => {
    gestureRecognizer.stop();
    setIsActive(false);
    setCurrentGesture('idle');
  };

  const getGestureColor = (gesture: GestureType): string => {
    const colors = {
      idle: 'text-gray-400',
      zoom_in: 'text-green-500',
      zoom_out: 'text-blue-500',
      move_up: 'text-purple-500',
      move_down: 'text-purple-500',
      move_left: 'text-purple-500',
      move_right: 'text-purple-500',
      reset_view: 'text-yellow-500',
      clear_canvas: 'text-red-500',
      auto_layout: 'text-indigo-500',
      select_all: 'text-pink-500'
    };
    return colors[gesture] || 'text-gray-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Hand className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentLang.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentLang.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={currentLang.help}
            >
              <HelpCircle className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  width={640}
                  height={480}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                  {isActive ? '🟢 活跃' : '🔴 未激活'}
                </div>

                {/* Current Gesture Overlay */}
                {currentGesture !== 'idle' && (
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Hand className={`w-4 h-4 ${getGestureColor(currentGesture)}`} />
                      <span className="text-sm font-medium">
                        {currentLang.gestures[currentGesture]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-3">
                {!isActive ? (
                  <button
                    onClick={startGestureRecognition}
                    disabled={isInitializing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {isInitializing ? currentLang.initializing : currentLang.startCamera}
                  </button>
                ) : (
                  <button
                    onClick={stopGestureRecognition}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <CameraOff className="w-4 h-4" />
                    {currentLang.stopCamera}
                  </button>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <span className="font-medium">{currentLang.error}:</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Panel */}
            <div className="space-y-6">
              {/* Current Status */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  状态信息
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {currentLang.currentGesture}:
                    </span>
                    <span className={`font-medium ${getGestureColor(currentGesture)}`}>
                      {currentLang.gestures[currentGesture]}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {currentLang.gestureCount}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {gestureCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      AI状态:
                    </span>
                    <span className="font-medium text-green-500">
                      🤖 智能分析
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Gesture Guide */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  快速手势指南
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👐</span>
                    <span className="text-gray-600 dark:text-gray-400">双手张开 - 放大画布</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤏</span>
                    <span className="text-gray-600 dark:text-gray-400">双手合拢 - 缩小画布</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">☝️</span>
                    <span className="text-gray-600 dark:text-gray-400">单手指向 - 移动画布</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🙌</span>
                    <span className="text-gray-600 dark:text-gray-400">双手摇摆 - 重置视角</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👏</span>
                    <span className="text-gray-600 dark:text-gray-400">拍手 - 自动布局</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✋</span>
                    <span className="text-gray-600 dark:text-gray-400">停止手势 - 清空画布</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  AI增强提示
                </h4>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <li>• 🤖 AI智能分析手势意图和上下文</li>
                  <li>• 📊 根据画布状态自动调整识别策略</li>
                  <li>• 🎯 学习用户习惯，提高识别准确度</li>
                  <li>• ⚡ 实时推理，响应更加智能自然</li>
                  <li>• 🔄 支持用户反馈，持续优化模型</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            {currentLang.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestureController;