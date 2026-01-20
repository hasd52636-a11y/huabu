/**
 * Canvas Gesture Controller - 画布手势控制组件
 * 在画布右侧中间显示紧凑的摄像头预览，或作为画布背景显示
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Hand, Minimize2, Maximize2, X } from 'lucide-react';
import { simpleGestureRecognizer, SimpleGestureResult, SimpleGestureType } from '../services/SimpleGestureRecognizer';

// 手势执行音效函数
const playGestureSound = (gestureType: SimpleGestureType) => {
  try {
    // 检查浏览器支持
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('浏览器不支持Web Audio API');
      return;
    }

    const audioContext = new AudioContext();
    
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
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn('手势音效播放失败:', error);
  }
};

interface CanvasGestureControllerProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onGestureCommand: (gesture: SimpleGestureType) => void;
  position?: 'right-center' | 'background' | 'custom' | 'sidebar-top';
  customPosition?: { x: number; y: number };
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
  showSidebar?: boolean;
  sidebarWidth?: number;
}

const CanvasGestureController: React.FC<CanvasGestureControllerProps> = ({
  isActive,
  onToggle,
  onGestureCommand,
  position = 'right-center',
  customPosition,
  theme = 'dark',
  lang = 'zh',
  showSidebar = true,
  sidebarWidth = 480
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<SimpleGestureType>('idle');
  const [gestureCount, setGestureCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
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

  // 添加键盘快捷键支持（用于测试手势功能）
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isActive) {
        console.log('[键盘事件] 手势控制未激活，忽略按键');
        return;
      }
      
      console.log('[键盘事件] 按键:', event.key.toLowerCase());
      
      switch (event.key.toLowerCase()) {
        case 'z':
          console.log('[键盘事件] 触发放大手势');
          simpleGestureRecognizer.triggerGesture('zoom_in');
          break;
        case 'x':
          console.log('[键盘事件] 触发缩小手势');
          simpleGestureRecognizer.triggerGesture('zoom_out');
          break;
        case 'arrowup':
          console.log('[键盘事件] 触发上移手势');
          simpleGestureRecognizer.triggerGesture('move_up');
          break;
        case 'arrowdown':
          console.log('[键盘事件] 触发下移手势');
          simpleGestureRecognizer.triggerGesture('move_down');
          break;
        case 'arrowleft':
          console.log('[键盘事件] 触发左移手势');
          simpleGestureRecognizer.triggerGesture('move_left');
          break;
        case 'arrowright':
          console.log('[键盘事件] 触发右移手势');
          simpleGestureRecognizer.triggerGesture('move_right');
          break;
        case 'r':
          console.log('[键盘事件] 触发重置手势');
          simpleGestureRecognizer.triggerGesture('reset_view');
          break;
        case 'c':
          console.log('[键盘事件] 触发清空手势');
          simpleGestureRecognizer.triggerGesture('clear_canvas');
          break;
        case 'a':
          console.log('[键盘事件] 触发布局手势');
          simpleGestureRecognizer.triggerGesture('auto_layout');
          break;
        case 's':
          console.log('[键盘事件] 触发全选手势');
          simpleGestureRecognizer.triggerGesture('select_all');
          break;
        default:
          console.log('[键盘事件] 未识别的按键:', event.key);
      }
    };

    console.log('[键盘事件] 添加监听器，isActive:', isActive);
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      console.log('[键盘事件] 移除监听器');
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isActive]); // 确保依赖数组正确

  useEffect(() => {
    if (isActive) {
      // 只有在激活时才设置回调，并确保不重复设置
      console.log('[CanvasGestureController] 设置手势识别回调');
      
      // 清除之前的回调，避免重复设置
      simpleGestureRecognizer.setOnGestureCallback(null);
      
      // 设置新的回调
      setTimeout(() => {
        simpleGestureRecognizer.setOnGestureCallback(handleGestureResult);
        console.log('[CanvasGestureController] 手势回调设置完成');
      }, 100);
    } else {
      // 停用时清除回调
      console.log('[CanvasGestureController] 清理手势识别回调');
      simpleGestureRecognizer.setOnGestureCallback(null);
    }
    
    return () => {
      if (isActive) {
        // 组件卸载时清理回调
        console.log('[CanvasGestureController] 组件卸载，清理手势识别回调');
        simpleGestureRecognizer.setOnGestureCallback(null);
      }
    };
  }, [isActive]); // 依赖isActive状态

  const handleGestureResult = (result: SimpleGestureResult) => {
    console.log('[CanvasGestureController] 收到手势结果:', result);
    
    setCurrentGesture(result.gesture as SimpleGestureType);
    setGestureCount(prev => (prev as number) + 1);
    
    console.log('[手势识别]', {
      gesture: result.gesture,
      confidence: result.confidence,
      timestamp: result.timestamp
    });
    
    // 播放手势音效
    playGestureSound(result.gesture as SimpleGestureType);
    
    // 设置执行状态和反馈
    setIsExecuting(true);
    setExecutionFeedback(`正在执行: ${currentLang.gestures[result.gesture as keyof typeof currentLang.gestures] || result.gesture}`);
    
    // 触发手势命令 - 确保只传递手势字符串
    console.log('[CanvasGestureController] 触发手势命令:', result.gesture);
    try {
      onGestureCommand(result.gesture as SimpleGestureType);
      console.log('[CanvasGestureController] 手势命令执行成功');
    } catch (error) {
      console.error('[CanvasGestureController] 手势命令执行失败:', error);
      setExecutionFeedback('❌ 执行失败');
      setTimeout(() => {
        setExecutionFeedback('');
        setIsExecuting(false);
      }, 1500);
      return;
    }
    
    // 简化反馈显示，避免复杂的setTimeout链
    setTimeout(() => {
      setIsExecuting(false);
      setExecutionFeedback(`✓ ${currentLang.gestures[result.gesture as keyof typeof currentLang.gestures] || result.gesture} 完成`);
      
      // 延迟清除反馈，但不重置手势状态
      setTimeout(() => {
        setExecutionFeedback('');
      }, 1000); // 缩短显示时间
    }, 200); // 缩短执行时间
  };

  const startGestureRecognition = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      await simpleGestureRecognizer.initialize(videoRef.current, canvasRef.current);
      console.log('[CanvasGestureController] 手势识别启动成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '摄像头初始化失败');
      onToggle(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopGestureRecognition = () => {
    simpleGestureRecognizer.stop();
    setCurrentGesture('idle');
    console.log('[CanvasGestureController] 手势识别已停止');
  };

  const getGestureColor = (gesture: SimpleGestureType): string => {
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
      // 确保位置在可见范围内
      const safeX = Math.max(20, Math.min(customPosition.x, window.innerWidth - 300));
      const safeY = Math.max(20, Math.min(customPosition.y, window.innerHeight - 250));
      
      console.log('[手势控制器位置]', {
        原始位置: customPosition,
        安全位置: { x: safeX, y: safeY },
        屏幕尺寸: { width: window.innerWidth, height: window.innerHeight }
      });
      
      return {
        position: 'fixed' as const,
        left: safeX,
        top: safeY,
        zIndex: 99999 // 超高层级，确保可见
      };
    } else if (position === 'sidebar-top') {
      // 在右侧侧边栏左上角显示
      const rightOffset = showSidebar ? sidebarWidth + 20 : 20;
      return {
        position: 'fixed' as const,
        right: `${rightOffset}px`, // 距离侧边栏左边缘20px
        top: '80px',  // 在header下方
        zIndex: 99999 // 最高层级
      };
    } else {
      // right-center - 避开侧边栏，提高z-index
      return {
        position: 'fixed' as const,
        right: '320px', // 避开侧边栏宽度
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 99999 // 最高层级
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