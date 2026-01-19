import React, { useState, useEffect, useCallback } from 'react';
import { FeatureAssemblyPanelProps, FeatureModule, MenuConfig } from '../types.js';
import { menuConfigManager } from '../utils/MenuConfigManager.js';

/**
 * 功能管理面板
 * Feature Management Panel
 */
const FeatureAssemblyPanel: React.FC<FeatureAssemblyPanelProps> = ({
  currentModel,
  currentProvider,
  onFeatureChange,
  onMenuConfigChange,
  initialFeatures = [],
  initialMenuConfig
}) => {
  const [allFeatures, setAllFeatures] = useState<FeatureModule[]>([]);
  const [localSelectedFeatures, setLocalSelectedFeatures] = useState<string[]>(initialFeatures);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [menuType, setMenuType] = useState<'floating' | 'context'>('floating');
  // 用于跟踪正在被添加的功能，实现飞入动画
  const [animatingFeatures, setAnimatingFeatures] = useState<Set<string>>(new Set());
  // 用于管理动画超时，避免冲突
  const [pendingAnimations, setPendingAnimations] = useState<Map<string, NodeJS.Timeout>>(new Map());
  // 用于防抖功能切换操作
  const [toggleDebounce, setToggleDebounce] = useState<NodeJS.Timeout | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);



  // 清理定时器，防止内存泄漏
  React.useEffect(() => {
    return () => {
      // 清理防抖定时器
      if (toggleDebounce) {
        clearTimeout(toggleDebounce);
      }
      
      // 清理所有动画定时器
      pendingAnimations.forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [toggleDebounce, pendingAnimations]);

  // 初始化数据
  useEffect(() => {
    console.log('[FeatureAssemblyPanel] Initializing with model:', currentModel, 'provider:', currentProvider);
    setIsLoading(true);
    try {
      const features = menuConfigManager.getFeatures();
      console.log('[FeatureAssemblyPanel] Loaded features:', features.length, features);
      setAllFeatures(features);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentModel]);

  // 初始化菜单配置
  useEffect(() => {
    if (onMenuConfigChange && !initialMenuConfig && localSelectedFeatures.length > 0) {
      // 生成初始菜单配置
      const initialMenuConfig = menuConfigManager.generateMenuConfigForModel(currentModel, localSelectedFeatures, '菜单配置', 'floating');
      // 保存配置到localStorage
      menuConfigManager.saveConfig(initialMenuConfig);
      menuConfigManager.setCurrentConfig(initialMenuConfig.id);
      onMenuConfigChange(initialMenuConfig);
    }
  }, [currentModel, localSelectedFeatures, onMenuConfigChange, initialMenuConfig]);

  // 基础功能定义 - 与悬浮菜单中的基础按钮保持一致
  // 这些是每个模块悬浮菜单中默认显示的基础操作按钮，不计入3个额外功能的限制
  // 注意：这里记录的是基础功能的数量，用于正确计算额外功能限制
  const basicFeaturesByType = {
    text: [
      // 文本模块基础功能（5个）：编辑、上传、下载、重新生成、删除
      'edit', 'upload', 'download', 'regenerate', 'delete'
    ], 
    image: [
      // 图片模块基础功能（5个）：宽高比、上传、下载、重新生成、删除
      'ratio', 'upload', 'download', 'regenerate', 'delete'
    ], 
    video: [
      // 视频模块基础功能（6个）：时长、宽高比、上传、下载、重新生成、删除
      'duration', 'ratio', 'upload', 'download', 'regenerate', 'delete'
    ], 
    voice: [], // 语音功能都是额外功能
    general: ['canvas-clear', 'canvas-copy', 'canvas-delete', 'canvas-auto-layout', 'canvas-export-storyboard'] // 鼠标右键基础功能
  };

  // 每个类型允许的额外功能数量（基础菜单按钮之外的 featureId 功能）
  const maxExtraFeatures = 3;

  // 注释：移除了自动加载基础功能的逻辑，让用户完全控制所有功能的启用/禁用

  // 切换功能选择
  const toggleFeature = (featureId: string) => {
    console.log('[FeatureAssemblyPanel] toggleFeature called with:', featureId);
    
    // 清除现有的防抖定时器
    if (toggleDebounce) {
      clearTimeout(toggleDebounce);
    }
    
    // 防抖处理，避免快速点击导致的状态冲突
    const timeout = setTimeout(() => {
      try {
        console.log('[FeatureAssemblyPanel] Processing feature toggle for:', featureId);
        
        setLocalSelectedFeatures(prev => {
          console.log('[FeatureAssemblyPanel] Current selected features:', prev);
          
          let newSelectedFeatures;
          
          // 找到当前功能的类型
          const feature = allFeatures.find(f => f.id === featureId);
          if (!feature) {
            console.warn(`Feature ${featureId} not found in allFeatures:`, allFeatures);
            return prev;
          }
          
          console.log('[FeatureAssemblyPanel] Found feature:', feature);
          
          // 验证功能可用性
          const available = isFeatureAvailable(feature);
          console.log('[FeatureAssemblyPanel] Feature availability:', available, {
            currentModel,
            currentProvider,
            requiredModels: feature.requiredModels,
            requiredProviders: feature.requiredProviders
          });
          
          if (!available) {
            console.warn(`Feature ${featureId} is not available for current model`);
            alert(`功能 "${feature.name}" 当前不可用\n\n当前模型: ${currentModel}\n当前提供商: ${currentProvider}\n\n需要的模型: ${feature.requiredModels.join(', ') || '任意'}\n需要的提供商: ${feature.requiredProviders?.join(', ') || '任意'}`);
            return prev;
          }
          
          if (prev.includes(featureId)) {
            // 允许用户取消选择任何功能，包括基础功能
            newSelectedFeatures = prev.filter(id => id !== featureId);
            
            // 清除该功能的动画状态
            const existingTimeout = pendingAnimations.get(featureId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              setPendingAnimations(prev => {
                const newMap = new Map(prev);
                newMap.delete(featureId);
                return newMap;
              });
            }
            setAnimatingFeatures(prev => {
              const newSet = new Set(prev);
              newSet.delete(featureId);
              return newSet;
            });
          } else {
            // 计算当前该类型已选中的功能数
            // 每个模块类型有不同的数量限制
            const selectedFeaturesByType = prev.filter(id => {
              const f = allFeatures.find(item => item.id === id);
              return f && f.type === feature.type;
            });
            
            // 不同类型功能的数量限制
            // 文本、图片、视频模块：最多3个额外功能（基础功能如编辑、上传等在悬浮菜单中内置，不计入限制）
            // 鼠标右键模块：最多12个功能
            const maxFeatures = feature.type === 'general' ? 12 : 3;
            const typeName = feature.type === 'text' ? '文本' : 
                            feature.type === 'image' ? '图片' : 
                            feature.type === 'video' ? '视频' : 
                            feature.type === 'voice' ? '语音' : '鼠标右键';
            
            if (selectedFeaturesByType.length >= maxFeatures) {
              const message = feature.type === 'general' 
                ? `${typeName}模块最多只能启用${maxFeatures}个功能`
                : `${typeName}模块最多只能添加${maxFeatures}个额外功能（基础功能如编辑、上传等不限制）`;
              alert(message);
              return prev;
            }
            
            newSelectedFeatures = [...prev, featureId];
            
            // 清除该功能现有的动画超时
            const existingTimeout = pendingAnimations.get(featureId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }
            
            // 添加到动画集合，触发飞入动画
            setAnimatingFeatures(prev => new Set(prev).add(featureId));
            
            // 设置新的动画超时
            const animationTimeout = setTimeout(() => {
              setAnimatingFeatures(prev => {
                const newSet = new Set(prev);
                newSet.delete(featureId);
                return newSet;
              });
              setPendingAnimations(prev => {
                const newMap = new Map(prev);
                newMap.delete(featureId);
                return newMap;
              });
            }, 300);
            
            setPendingAnimations(prev => new Map(prev).set(featureId, animationTimeout));
          }
          
          // 更新功能选择
          onFeatureChange(newSelectedFeatures);
          
          // 批量更新菜单配置（防抖处理）
          batchUpdateMenuConfig(newSelectedFeatures);
          
          return newSelectedFeatures;
        });
      } catch (error) {
        console.error('Error toggling feature:', error);
        alert('功能切换失败，请刷新页面重试');
      }
    }, 100); // 100ms 防抖延迟
    
    setToggleDebounce(timeout);
  };

  // 批量更新菜单配置，使用防抖避免频繁操作
  const batchUpdateMenuConfig = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      
      return (features: string[]) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          if (onMenuConfigChange) {
            try {
              const floatingMenuConfig = menuConfigManager.generateMenuConfigForModel(
                currentModel, 
                features, 
                '菜单配置', 
                'floating'
              );
              menuConfigManager.saveConfig(floatingMenuConfig);
              menuConfigManager.setCurrentConfig(floatingMenuConfig.id);
              onMenuConfigChange(floatingMenuConfig);
            } catch (error) {
              console.error('Failed to update menu config:', error);
            }
          }
        }, 300); // 300ms 防抖延迟
      };
    })(),
    [currentModel, onMenuConfigChange]
  );

  // 根据类型过滤功能
  const getFilteredFeatures = () => {
    return allFeatures.filter(feature => {
      const matchesMenuType = menuType === 'floating' 
        ? feature.type !== 'general' 
        : feature.type === 'general';
      return matchesMenuType;
    });
  };

  // 按类型分组功能
  const groupFeaturesByType = () => {
    const features = getFilteredFeatures();
    const groups: Record<string, FeatureModule[]> = {
      text: [],
      image: [],
      video: [],
      voice: [],
      general: []
    };

    features.forEach(feature => {
      groups[feature.type].push(feature);
    });

    return groups;
  };

  // 检查功能是否可用
  const isFeatureAvailable = (feature: FeatureModule) => {
    const isModelSupported = feature.requiredModels.length === 0 || feature.requiredModels.includes(currentModel);
    const isProviderSupported = !feature.requiredProviders || feature.requiredProviders.length === 0 || feature.requiredProviders.includes(currentProvider);
    return isModelSupported && isProviderSupported;
  };

  // 获取功能类型的显示名称
  const getFeatureTypeName = (type: string) => {
    switch (type) {
      case 'text': return '文本功能';
      case 'image': return '图片功能';
      case 'video': return '视频功能';
      case 'voice': return '语音功能';
      case 'general': return '画布功能';
      default: return '其他功能';
    }
  };

  // 获取友好的API接口名
  const getFriendlyProviderName = (providerId: string) => {
    const providerNameMap: Record<string, string> = {
      'google': 'Google Gemini API',
      'openai-compatible': 'OpenAI兼容API',
      'shenma': '神马API',
      'zhipu': '智谱API'
    };
    return providerNameMap[providerId] || providerId;
  };

  // 功能图标组件 - 重新设计
  const FeatureIcon = ({ type, isSelected, isBasic }: { type: string; isSelected: boolean; isBasic: boolean }) => {
    // 根据类型定义图标和颜色
    const getIconConfig = () => {
      switch (type) {
        case 'text':
          return {
            icon: '📝',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-blue-500 to-blue-700',
            glowColor: 'shadow-blue-500/50'
          };
        case 'image':
          return {
            icon: '🖼️',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-emerald-500 to-emerald-700',
            glowColor: 'shadow-emerald-500/50'
          };
        case 'video':
          return {
            icon: '🎬',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-red-500 to-red-700',
            glowColor: 'shadow-red-500/50'
          };
        case 'voice':
          return {
            icon: '🎤',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-purple-500 to-purple-700',
            glowColor: 'shadow-purple-500/50'
          };
        case 'general':
          return {
            icon: '⚙️',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-amber-500 to-amber-700',
            glowColor: 'shadow-amber-500/50'
          };
        default:
          return {
            icon: '🔧',
            baseColor: 'from-slate-400 to-slate-600',
            selectedColor: 'from-slate-500 to-slate-700',
            glowColor: 'shadow-slate-500/50'
          };
      }
    };

    const config = getIconConfig();
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* 背景渐变 */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${isSelected ? config.selectedColor : config.baseColor} ${isSelected ? `shadow-2xl ${config.glowColor}` : 'shadow-lg'} transition-all duration-300`} />
        
        {/* 图标 */}
        <div className="relative z-10 text-4xl filter drop-shadow-lg">
          {config.icon}
        </div>
        
        {/* 添加/移除符号 - 居中大大的显示 */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-12 h-12 bg-white/90 dark:bg-black/90 rounded-full flex items-center justify-center shadow-xl border-2 border-white/50">
            <span className="text-3xl font-bold text-gray-700 dark:text-gray-300">
              {isSelected ? '−' : '+'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const featureGroups = groupFeaturesByType();

  return (
    <div ref={panelRef} className="p-6 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl shadow-2xl border-2 border-violet-500 max-h-full overflow-y-auto backdrop-blur-sm" role="region" aria-label="功能管理面板">
      {/* 添加CSS样式到head */}
      {typeof window !== 'undefined' && (() => {
        const styleId = 'feature-assembly-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes flyToCanvas {
              0% {
                opacity: 1;
                transform: translate(0, 0) scale(1) rotate(0deg);
              }
              50% {
                opacity: 0.8;
                transform: translate(50px, -50px) scale(1.2) rotate(180deg);
              }
              100% {
                opacity: 0;
                transform: translate(100px, -100px) scale(0) rotate(360deg);
              }
            }
            
            .animate-fly-to-canvas {
              animation: flyToCanvas 0.3s ease-out forwards;
              position: absolute;
              z-index: 100;
            }

            .glass-effect {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border: 2px solid #8b5cf6;
            }

            .feature-button-glow {
              box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
            }

            .neumorphism {
              background: linear-gradient(145deg, #f0f0f0, #cacaca);
              box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #ffffff;
              border: 2px solid #8b5cf6;
            }

            .neumorphism-dark {
              background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
              box-shadow: 20px 20px 60px #1a1a1a, -20px -20px 60px #343434;
              border: 2px solid #8b5cf6;
            }

            .neumorphism-pressed {
              background: linear-gradient(145deg, #cacaca, #f0f0f0);
              box-shadow: inset 20px 20px 60px #bebebe, inset -20px -20px 60px #ffffff;
              border: 2px solid #8b5cf6;
            }

            .neumorphism-pressed-dark {
              background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
              box-shadow: inset 20px 20px 60px #1a1a1a, inset -20px -20px 60px #343434;
              border: 2px solid #8b5cf6;
            }

            .glassmorphism {
              background: rgba(255, 255, 255, 0.25);
              backdrop-filter: blur(20px);
              border: 2px solid #8b5cf6;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }

            .glassmorphism-dark {
              background: rgba(0, 0, 0, 0.25);
              backdrop-filter: blur(20px);
              border: 2px solid #8b5cf6;
              box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            }

            .icon-3d {
              filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3)) 
                      drop-shadow(-1px -1px 2px rgba(255, 255, 255, 0.8));
              transform-style: preserve-3d;
            }

            .icon-3d:hover {
              filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.4)) 
                      drop-shadow(-2px -2px 4px rgba(255, 255, 255, 0.9));
              transform: translateZ(10px) rotateX(5deg) rotateY(5deg);
            }

            .glossy {
              position: relative;
              overflow: hidden;
            }

            .glossy::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.6),
                transparent
              );
              transition: left 0.5s;
            }

            .glossy:hover::before {
              left: 100%;
            }

            .gradient-button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              position: relative;
              overflow: hidden;
            }

            .gradient-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              opacity: 0;
              transition: opacity 0.3s ease;
            }

            .gradient-button:hover::before {
              opacity: 1;
            }

            .glow-border {
              border: 2px solid #8b5cf6;
              background: linear-gradient(45deg, #8b5cf6, #a855f7, #c084fc, #ddd6fe, #8b5cf6) border-box;
              background-clip: padding-box, border-box;
            }

            .rainbow-shine {
              background: linear-gradient(
                45deg,
                #8b5cf6, #a855f7, #c084fc, #ddd6fe, 
                #8b5cf6, #a855f7, #c084fc
              );
              background-size: 400% 400%;
              animation: rainbow 3s ease infinite;
            }

            @keyframes rainbow {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }

            .crystal {
              background: linear-gradient(135deg, 
                rgba(255, 255, 255, 0.1) 0%,
                rgba(255, 255, 255, 0.05) 50%,
                rgba(255, 255, 255, 0.1) 100%
              );
              backdrop-filter: blur(10px);
              border: 2px solid #8b5cf6;
              box-shadow: 
                0 8px 32px 0 rgba(31, 38, 135, 0.37),
                inset 0 1px 0 rgba(255, 255, 255, 0.5),
                inset 0 -1px 0 rgba(255, 255, 255, 0.1);
            }
          `;
          document.head.appendChild(style);
        }
        return null;
      })()}
      {/* 当前API接口信息 - 拟态玻璃风格 */}
      <div className="mb-6 p-4 glassmorphism dark:glassmorphism-dark rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 rainbow-shine opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse crystal"></div>
            <span className="text-sm font-bold tracking-wide text-gray-800 dark:text-white">
              {getFriendlyProviderName(currentProvider)}
            </span>
          </div>
          <div className="text-xs opacity-90 mt-1 text-gray-600 dark:text-gray-300">
            当前活跃API接口
          </div>
        </div>
      </div>

      {/* 菜单类型切换 - 拟态风格 */}
      <div className="mb-6">
        <div className="flex gap-2 neumorphism dark:neumorphism-dark p-2 rounded-3xl" role="tablist" aria-label="菜单类型选择">
          <button
            onClick={() => setMenuType('floating')}
            className={`flex-1 py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-500 ${menuType === 'floating'
              ? 'neumorphism-pressed dark:neumorphism-pressed-dark text-amber-600 dark:text-amber-400 transform scale-95'
              : 'text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 glossy'}`}
            role="tab"
            aria-selected={menuType === 'floating'}
            aria-controls="floating-features"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl icon-3d">🎛️</span>
              <span>菜单功能区</span>
            </div>
          </button>
          <button
            onClick={() => setMenuType('context')}
            className={`flex-1 py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-500 ${menuType === 'context'
              ? 'neumorphism-pressed dark:neumorphism-pressed-dark text-amber-600 dark:text-amber-400 transform scale-95'
              : 'text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 glossy'}`}
            role="tab"
            aria-selected={menuType === 'context'}
            aria-controls="context-features"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl icon-3d">🖱️</span>
              <span>右键功能区</span>
            </div>
          </button>
        </div>
      </div>

      {/* 功能选择 - 优化设计 */}
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-bold text-gray-800 dark:text-white py-4 px-8 glassmorphism dark:glassmorphism-dark rounded-3xl glow-border inline-block relative overflow-hidden">
            <div className="absolute inset-0 rainbow-shine opacity-10"></div>
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-3xl icon-3d">
                {menuType === 'floating' ? '🎛️' : '🖱️'}
              </span>
              <span>{menuType === 'floating' ? '菜单功能区' : '鼠标右键功能区'}</span>
            </div>
          </h4>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-16 glassmorphism dark:glassmorphism-dark rounded-3xl glow-border">
            <div className="w-16 h-16 relative">
              <div className="w-16 h-16 border-4 border-transparent rounded-full animate-spin glow-border"></div>
              <div className="absolute inset-2 glassmorphism rounded-full"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium mt-6 text-lg">加载功能中...</p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* 遍历每个功能组 */}
          {Object.entries(featureGroups).map(([type, features]) => {
            if (features.length === 0) return null;
            
            // 只显示当前选中菜单类型的功能
            if (menuType === 'floating' && type === 'general') return null;
            if (menuType === 'context' && type !== 'general') return null;

            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl glassmorphism dark:glassmorphism-dark flex items-center justify-center text-3xl icon-3d glow-border">
                    {type === 'text' && '📝'}
                    {type === 'image' && '🖼️'}
                    {type === 'video' && '🎬'}
                    {type === 'voice' && '🎤'}
                    {type === 'general' && '⚙️'}
                  </div>
                  <h5 className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {getFeatureTypeName(type)}
                  </h5>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-transparent rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {features.map(feature => {
                    const available = isFeatureAvailable(feature);
                    const selected = localSelectedFeatures.includes(feature.id);
                    // 检查是否为基础功能 - 所有 featureId 都是额外功能，基础功能在悬浮菜单中内置
                    const isBasicFeature = false; // 所有通过 FeatureAssemblyPanel 管理的都是额外功能
                    // 检查是否为当前模型支持的基础功能
                    const isSupportedBasicFeature = false;

                    return (
                      <div key={feature.id} className="relative p-4 flex flex-col items-center group" title={`${feature.name}\n${feature.description}${!available ? '\n\n当前模型不支持此功能' : ''}`}>
                        {/* 拟态玻璃风格3D按钮 */}
                        <button
                          data-feature-id={feature.id}
                          onClick={() => {
                            console.log('[FeatureAssemblyPanel] Button clicked:', feature.id, 'available:', available);
                            if (available) {
                              toggleFeature(feature.id);
                            } else {
                              console.log('[FeatureAssemblyPanel] Feature not available, showing alert');
                              alert(`功能 "${feature.name}" 当前不可用\n\n当前模型: ${currentModel}\n当前提供商: ${currentProvider}\n\n${feature.requiredModels.length > 0 ? `需要的模型: ${feature.requiredModels.join(', ')}` : '支持所有模型'}\n${feature.requiredProviders && feature.requiredProviders.length > 0 ? `需要的提供商: ${feature.requiredProviders.join(', ')}` : '支持所有提供商'}`);
                            }
                          }}
                          className={`relative flex items-center justify-center transition-all duration-700 ease-out cursor-pointer w-24 h-24 rounded-3xl transform hover:scale-110 glossy ${available
                            ? selected
                              ? 'neumorphism-pressed dark:neumorphism-pressed-dark text-amber-600 dark:text-amber-400 crystal'
                              : 'neumorphism dark:neumorphism-dark text-amber-700 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 opacity-60 cursor-not-allowed'}`}
                          disabled={!available}
                          aria-pressed={selected}
                          aria-label={`${feature.name}: ${feature.description}${!available ? ' (当前模型不支持)' : ''}`}
                          role="switch"
                        >
                          {/* 彩虹光泽效果 */}
                          {selected && (
                            <div className="absolute inset-0 rounded-3xl rainbow-shine opacity-20"></div>
                          )}
                          
                          {/* 功能图标 - 3D效果 */}
                          <div className="relative z-10 w-full h-full">
                            <FeatureIcon type={feature.type} isSelected={selected} isBasic={isBasicFeature} />
                          </div>
                        </button>
                        
                        {/* 飞入画布的动画效果 - 增强版 */}
                        {animatingFeatures.has(feature.id) && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-24 h-24 rounded-3xl glassmorphism glow-border shadow-2xl animate-fly-to-canvas flex items-center justify-center">
                              <FeatureIcon type={feature.type} isSelected={true} isBasic={isBasicFeature} />
                            </div>
                          </div>
                        )}
                        
                        {/* 功能名称 - 玻璃态设计 */}
                        <div className={`mt-4 text-center w-full ${available
                          ? selected
                            ? `text-amber-700 dark:text-amber-300 ${isBasicFeature ? 'font-bold' : 'font-semibold'}`
                            : 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-gray-400 dark:text-gray-500'}`}>
                          <div className="text-sm leading-tight font-semibold">
                            {feature.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 功能统计 - 玻璃态拟态设计 */}
      <div className="mt-8 p-6 glassmorphism dark:glassmorphism-dark rounded-3xl glow-border relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 rainbow-shine opacity-5"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 neumorphism dark:neumorphism-dark rounded-2xl flex items-center justify-center text-3xl icon-3d glow-border crystal">
                📊
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  功能统计
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse crystal"></div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  已选择 <span className="font-bold text-amber-600 dark:text-amber-400 text-xl mx-1 icon-3d">
                    {localSelectedFeatures.length}
                  </span> / <span className="font-bold text-gray-700 dark:text-gray-300 text-xl mx-1">
                    {menuType === 'context' ? 12 : 3}
                  </span> 个额外功能
                </div>
              </div>
            </div>
            
            {/* 圆形进度指示器 */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - localSelectedFeatures.length / (menuType === 'context' ? 12 : 3))}`}
                  className="transition-all duration-1000 ease-out drop-shadow-lg"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 icon-3d">
                  {Math.round((localSelectedFeatures.length / (menuType === 'context' ? 12 : 3)) * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* 详细统计信息 */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 neumorphism dark:neumorphism-dark rounded-2xl crystal">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 icon-3d">
                {localSelectedFeatures.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">已启用额外功能</div>
            </div>
            <div className="text-center p-4 neumorphism dark:neumorphism-dark rounded-2xl crystal">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 icon-3d">
                {(menuType === 'context' ? 12 : 3) - localSelectedFeatures.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">可添加额外功能</div>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">功能配置进度</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {Math.round((localSelectedFeatures.length / (menuType === 'context' ? 12 : 3)) * 100)}% 完成
              </span>
            </div>
            <div className="w-full h-3 neumorphism-pressed dark:neumorphism-pressed-dark rounded-full overflow-hidden">
              <div 
                className="h-full rainbow-shine transition-all duration-1000 ease-out rounded-full relative overflow-hidden"
                style={{ width: `${(localSelectedFeatures.length / (menuType === 'context' ? 12 : 3)) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 opacity-80"></div>
                <div className="absolute inset-0 glossy"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureAssemblyPanel;