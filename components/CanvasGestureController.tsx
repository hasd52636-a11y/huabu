/**
 * Canvas Gesture Controller - 画布手势控制组件
 * 在画布右侧中间显示紧凑的摄像头预览，或作为画布背景显示
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Hand, Settings, Minimize2, Maximize2, X } from 'lucide-react';
import { gestureRecognizer, GestureResult, GestureType } from '../services/GestureRecognizer';

// 手势执行音效函数
const playGestureSound = (gestureType: GestureType) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 根据手势类型播放不同音调
    let frequency = 800;
    let duration = 0.15;
    
    switch (gestureType) {
      case 'zoom_in':
        frequency = 1200; // 高音调 - 放大
        break;
      case 'zoom_out':
        frequency = 600;  // 低音调 - 缩小
        break;
      case 'move_up':
      case 'move_down':
      case 'move_left':
      case 'move_right':
        frequency = 900;  // 中音调 - 移动
        duration = 0.1;
        break;
      case 'reset_view':
        frequency = 1000; // 双音调 - 重置
        duration = 0.2;
        break;
      case 'auto_layout':
        frequency = 1400; // 高音调 - 布局
        duration = 0.25;
        break;
      case 'select_all':
        frequency = 1100; // 中高音调 - 选择
        break;
      default:
        frequency = 800;
    }
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn('手势音效播放失败:', error);
  }
};

interface CanvasGestureControllerProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onGestureCommand: (gesture: GestureType) => void;
  position?: 'right-center' | 'background' | 'custom' | 'sidebar-top';
  customPosition?: { x: number; y: number };
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const CanvasGestureController: React.FC<CanvasGestureControllerProps> = ({
  isActive,
  onToggle,
  onGestureCommand,
  position = 'right-center',
  customPosition,
  theme = 'dark',
  lang = 'zh'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');
  const [gestureCount, setGestureCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecutedGesture, setLastExecutedGesture] = useState<string>('');
  const [executionFeedback, setExecutionFeedback] = useState<string>('');

  const t = {
    zh: {
      startCamera: '启动手势控制',
      stopCamera: '停止手势控制',
      initializing: '正在初始化摄像头...',
      currentGesture: '当前手势',
      gestureCount: '识别次数',
      minimize: '最小化',
      maximize: '最大化',
      close: '关闭',
      error: '错误',
      cameraPermission: '请允许访问摄像头',
      gestures: {
        idle: '无手势',
        zoom_in: '放大',
        zoom_out: '缩小',
        move_up: '上移',
        move_down: '下移',
        move_left: '左移',
        move_right: '右移',
        reset_view: '重置',
        clear_canvas: '清空',
        auto_layout: '布局',
        select_all: '全选'
      }
    },
    en: {
      startCamera: 'Start Gesture Control',
      stopCamera: 'Stop Gesture Control',
      initializing: 'Initializing camera...',
      currentGesture: 'Current Gesture',
      gestureCount: 'Recognition Count',
      minimize: 'Minimize',
      maximize: 'Maximize',
      close: 'Close',
      error: 'Error',
      cameraPermission: 'Please allow camera access',
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
    if (isActive) {
      startGestureRecognition();
    } else {
      stopGestureRecognition();
    }

    return () => {
      if (isActive) {
        stopGestureRecognition();
      }
    };
  }, [isActive]);

  useEffect(() => {
    // 设置手势识别回调
    gestureRecognizer.setOnGestureCallback(handleGestureResult);
  }, []);

  const handleGestureResult = (result: GestureResult) => {
    setCurrentGesture(result.gesture);
    setGestureCount(prev => prev + 1);
    
    // 显示AI分析信息（如果有）
    if (result.aiAnalysis) {
      console.log('[AI Gesture Analysis]', {
        intent: result.aiAnalysis.primaryIntent,
        confidence: result.aiAnalysis.confidence,
        reasoning: result.aiAnalysis.reasoning
      });
    }
    
    // 播放手势音效
    playGestureSound(result.gesture as GestureType);
    
    // 设置执行状态和反馈
    setIsExecuting(true);
    setLastExecutedGesture(result.gesture);
    setExecutionFeedback(`正在执行: ${currentLang.gestures[result.gesture]}`);
    
    // 触发手势命令
    onGestureCommand(result.gesture);
    
    // 显示执行完成反馈
    setTimeout(() => {
      setIsExecuting(false);
      setExecutionFeedback(`✓ ${currentLang.gestures[result.gesture]} 完成`);
      
      // 清除反馈信息
      setTimeout(() => {
        setExecutionFeedback('');
        setCurrentGesture('idle');
      }, 1500);
    }, 300); // 300ms后显示完成状态
  };

  const startGestureRecognition = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      await gestureRecognizer.initialize(videoRef.current, canvasRef.current);
      console.log('[CanvasGestureController] 手势识别启动成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '摄像头初始化失败');
      onToggle(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopGestureRecognition = () => {
    gestureRecognizer.stop();
    setCurrentGesture('idle');
    console.log('[CanvasGestureController] 手势识别已停止');
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

  const getPositionStyles = () => {
    if (position === 'background') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity: 0.3,
        pointerEvents: 'none' as const
      };
    } else if (position === 'custom' && customPosition) {
      return {
        position: 'fixed' as const,
        left: customPosition.x,
        top: customPosition.y,
        zIndex: 9999 // 最高层级，确保浮现在所有内容之上
      };
    } else if (position === 'sidebar-top') {
      // 在右侧侧边栏上方显示
      return {
        position: 'fixed' as const,
        right: '20px', // 距离右边缘20px
        top: '120px',  // 在header下方，侧边栏上方
        zIndex: 9999 // 最高层级
      };
    } else {
      // right-center - 避开侧边栏，提高z-index
      return {
        position: 'fixed' as const,
        right: '320px', // 避开侧边栏宽度
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9999 // 最高层级
      };
    }
  };

  const containerSize = isMinimized ? { width: '200px', height: '150px' } : { width: '280px', height: '210px' };
  if (position === 'background') {
    containerSize.width = '400px';
    containerSize.height = '300px';
  } else if (position === 'sidebar-top') {
    // 侧边栏上方的紧凑尺寸
    containerSize.width = isMinimized ? '160px' : '240px';
    containerSize.height = isMinimized ? '120px' : '180px';
  }

  return (
    <div 
      className={`
        rounded-lg shadow-lg overflow-hidden transition-all duration-300
        ${position === 'background' 
          ? 'bg-black/20 backdrop-blur-sm' 
          : position === 'sidebar-top'
            ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-purple-200 dark:border-purple-700 shadow-purple-100 dark:shadow-purple-900/50'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }
      `}
      style={{ ...getPositionStyles(), ...containerSize }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* 标题栏（仅在sidebar-top位置显示） */}
      {position === 'sidebar-top' && (
        <div className="absolute top-0 left-0 right-0 bg-purple-500/90 text-white px-3 py-1 text-xs font-semibold flex items-center justify-between z-20">
          <div className="flex items-center gap-1">
            <Hand className="w-3 h-3" />
            <span>手势控制</span>
          </div>
          {showControls && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={isMinimized ? currentLang.maximize : currentLang.minimize}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => onToggle(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={currentLang.close}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 控制按钮 */}
      {showControls && position !== 'background' && position !== 'sidebar-top' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 bg-black/50 hover:bg-black/70 text-white rounded transition-colors"
            title={isMinimized ? currentLang.maximize : currentLang.minimize}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onToggle(false)}
            className="p-1 bg-black/50 hover:bg-black/70 text-white rounded transition-colors"
            title={currentLang.close}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 摄像头视频 */}
      <div className={`relative w-full h-full ${position === 'sidebar-top' ? 'mt-6' : ''}`}>
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
          width={320}
          height={240}
        />
        
        {/* 状态指示器 */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
          {!isMinimized && (
            <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
              {isActive ? '活跃' : '未激活'}
            </span>
          )}
        </div>

        {/* 当前手势显示 */}
        {currentGesture !== 'idle' && !isMinimized && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            <div className="flex items-center gap-1">
              <Hand className={`w-3 h-3 ${getGestureColor(currentGesture)} ${isExecuting ? 'animate-pulse' : ''}`} />
              <span>{currentLang.gestures[currentGesture]}</span>
              {isExecuting && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping ml-1" />
              )}
            </div>
          </div>
        )}

        {/* 执行反馈显示 */}
        {executionFeedback && !isMinimized && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <div className="flex items-center gap-2">
              {isExecuting ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3 h-3 bg-green-400 rounded-full" />
              )}
              <span>{executionFeedback}</span>
            </div>
          </div>
        )}

        {/* 手势计数 */}
        {gestureCount > 0 && !isMinimized && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {gestureCount}
          </div>
        )}

        {/* 初始化状态 */}
        {isInitializing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className="w-6 h-6 mx-auto mb-2 animate-pulse" />
              <p className="text-xs">{currentLang.initializing}</p>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <div className="text-white text-center p-2">
              <CameraOff className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* 启动按钮（当未激活时显示） */}
      {!isActive && !error && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <button
            onClick={() => onToggle(true)}
            disabled={isInitializing}
            className="flex flex-col items-center gap-2 p-4 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Hand className="w-8 h-8" />
            <span className="text-sm font-medium">{currentLang.startCamera}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CanvasGestureController;