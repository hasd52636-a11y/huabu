/**
 * Performance Configuration Panel
 * 
 * Allows users to configure performance optimization settings
 * Requirements: 8.1, 8.3, 8.6
 */

import React, { useState, useEffect } from 'react';
import { PerformanceOptimizationSystem, VirtualizationConfig } from '../services/PerformanceOptimizationSystem';
import { Settings, Sliders, Zap, Save, RotateCcw } from 'lucide-react';

interface PerformanceConfigPanelProps {
  performanceOptimizationSystem: PerformanceOptimizationSystem;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  onClose: () => void;
}

const PerformanceConfigPanel: React.FC<PerformanceConfigPanelProps> = ({
  performanceOptimizationSystem,
  theme,
  lang,
  onClose
}) => {
  const [config, setConfig] = useState<VirtualizationConfig>(
    performanceOptimizationSystem.getConfig()
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const originalConfig = performanceOptimizationSystem.getConfig();
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, performanceOptimizationSystem]);

  const handleConfigChange = (key: keyof VirtualizationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    performanceOptimizationSystem.updateConfig(config);
    setHasChanges(false);
  };

  const handleReset = () => {
    const originalConfig = performanceOptimizationSystem.getConfig();
    setConfig(originalConfig);
    setHasChanges(false);
  };

  const handleAutoOptimize = () => {
    const result = performanceOptimizationSystem.autoOptimize();
    const newConfig = performanceOptimizationSystem.getConfig();
    setConfig(newConfig);
    
    // Show optimization results
    if (result.actions.length > 0) {
      alert(
        (lang === 'zh' ? '自动优化完成：\n' : 'Auto-optimization completed:\n') +
        result.actions.join('\n')
      );
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]`}>
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 rounded-xl shadow-2xl ${
        theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Settings size={24} />
            {lang === 'zh' ? '性能配置' : 'Performance Configuration'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Virtualization Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sliders size={20} />
              {lang === 'zh' ? '虚拟化设置' : 'Virtualization Settings'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {lang === 'zh' ? '缓冲区大小 (px)' : 'Buffer Size (px)'}
                </label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={config.bufferSize}
                  onChange={(e) => handleConfigChange('bufferSize', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'zh' ? '视口外额外渲染的像素数' : 'Extra pixels to render outside viewport'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {lang === 'zh' ? '最小块大小 (px)' : 'Min Block Size (px)'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="200"
                  value={config.minBlockSize}
                  onChange={(e) => handleConfigChange('minBlockSize', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'zh' ? '用于剔除计算的最小块大小' : 'Minimum block size for culling calculations'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {lang === 'zh' ? '最大可见块数' : 'Max Visible Blocks'}
                </label>
                <input
                  type="number"
                  min="25"
                  max="200"
                  value={config.maxVisibleBlocks}
                  onChange={(e) => handleConfigChange('maxVisibleBlocks', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'zh' ? '同时渲染的最大块数' : 'Maximum blocks to render simultaneously'}
                </p>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'zh' ? '功能开关' : 'Feature Toggles'}
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.enableLazyLoading}
                  onChange={(e) => handleConfigChange('enableLazyLoading', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium">
                    {lang === 'zh' ? '启用懒加载' : 'Enable Lazy Loading'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lang === 'zh' ? '仅在需要时加载块内容' : 'Load block content only when needed'}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.enableResourceCleanup}
                  onChange={(e) => handleConfigChange('enableResourceCleanup', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium">
                    {lang === 'zh' ? '启用资源清理' : 'Enable Resource Cleanup'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lang === 'zh' ? '自动清理未使用的资源' : 'Automatically clean up unused resources'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Performance Presets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {lang === 'zh' ? '性能预设' : 'Performance Presets'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setConfig({
                  bufferSize: 100,
                  minBlockSize: 30,
                  maxVisibleBlocks: 150,
                  enableLazyLoading: false,
                  enableResourceCleanup: false
                })}
                className="p-3 rounded-lg border-2 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <div className="font-medium">{lang === 'zh' ? '高质量' : 'High Quality'}</div>
                <div className="text-xs">{lang === 'zh' ? '最佳视觉效果' : 'Best visual quality'}</div>
              </button>

              <button
                onClick={() => setConfig({
                  bufferSize: 150,
                  minBlockSize: 50,
                  maxVisibleBlocks: 100,
                  enableLazyLoading: true,
                  enableResourceCleanup: true
                })}
                className="p-3 rounded-lg border-2 border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="font-medium">{lang === 'zh' ? '平衡' : 'Balanced'}</div>
                <div className="text-xs">{lang === 'zh' ? '质量与性能平衡' : 'Quality & performance'}</div>
              </button>

              <button
                onClick={() => setConfig({
                  bufferSize: 200,
                  minBlockSize: 80,
                  maxVisibleBlocks: 50,
                  enableLazyLoading: true,
                  enableResourceCleanup: true
                })}
                className="p-3 rounded-lg border-2 border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="font-medium">{lang === 'zh' ? '高性能' : 'High Performance'}</div>
                <div className="text-xs">{lang === 'zh' ? '最佳性能' : 'Best performance'}</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleAutoOptimize}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Zap size={16} />
            {lang === 'zh' ? '自动优化' : 'Auto Optimize'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={16} />
              {lang === 'zh' ? '重置' : 'Reset'}
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceConfigPanel;