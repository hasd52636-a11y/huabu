/**
 * 多图生成配置界面 - 增强版
 * 
 * 功能：
 * - 数量选择滑块（2-10张）
 * - 布局预览网格
 * - 高级选项面板
 * - Token消耗估算
 * - 实时预览功能
 * - 一致性设置和质量控制
 * - 智能布局优化选项
 */

import React, { useState, useEffect } from 'react';
import { X, Grid3X3, ArrowRight, ArrowDown, Settings, Zap, Eye, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Block, MultiImageConfig } from '../types';

interface MultiImageConfigModalProps {
  isOpen: boolean;
  sourceBlock: Block;
  onClose: () => void;
  onGenerate: (config: MultiImageConfig) => void;
  lang: 'zh' | 'en';
}

const MultiImageConfigModal: React.FC<MultiImageConfigModalProps> = ({
  isOpen,
  sourceBlock,
  onClose,
  onGenerate,
  lang
}) => {
  const [config, setConfig] = useState<MultiImageConfig>({
    count: 4,
    aspectRatio: sourceBlock.aspectRatio || '16:9',
    imageSize: '1K',
    model: 'nano-banana',
    layoutPreference: 'grid',
    projectToCanvas: true,
    enableLayoutOptimization: true
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQualitySettings, setShowQualitySettings] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [qualityPreset, setQualityPreset] = useState<'fast' | 'balanced' | 'quality'>('balanced');

  const t = {
    zh: {
      title: '多图生成配置',
      count: '生成数量',
      layout: '布局方式',
      grid: '网格布局',
      horizontal: '水平布局',
      vertical: '垂直布局',
      advanced: '高级选项',
      aspectRatio: '宽高比',
      imageSize: '图片尺寸',
      model: '生成模型',
      projectToCanvas: '投射到画布',
      estimatedCost: '预计消耗',
      tokens: 'Tokens',
      preview: '布局预览',
      generate: '开始生成',
      cancel: '取消',
      tip: '提示：生成多张图片会消耗更多Token，建议先从少量开始尝试',
      qualitySettings: '质量设置',
      consistencyMode: '一致性模式',
      fast: '快速模式',
      balanced: '平衡模式',
      quality: '质量模式',
      fastDesc: '快速生成，适合预览',
      balancedDesc: '平衡质量和速度',
      qualityDesc: '最高质量，耗时较长',
      layoutOptimization: '布局优化',
      enableOptimization: '启用智能布局',
      optimizationDesc: '自动优化图像在画布上的排列'
    },
    en: {
      title: 'Multi-Image Generation Config',
      count: 'Image Count',
      layout: 'Layout Style',
      grid: 'Grid Layout',
      horizontal: 'Horizontal Layout',
      vertical: 'Vertical Layout',
      advanced: 'Advanced Options',
      aspectRatio: 'Aspect Ratio',
      imageSize: 'Image Size',
      model: 'Generation Model',
      projectToCanvas: 'Project to Canvas',
      estimatedCost: 'Estimated Cost',
      tokens: 'Tokens',
      preview: 'Layout Preview',
      generate: 'Start Generation',
      cancel: 'Cancel',
      tip: 'Tip: Generating multiple images consumes more tokens. Start with fewer images to test.',
      qualitySettings: 'Quality Settings',
      consistencyMode: 'Consistency Mode',
      fast: 'Fast Mode',
      balanced: 'Balanced Mode',
      quality: 'Quality Mode',
      fastDesc: 'Quick generation for preview',
      balancedDesc: 'Balance quality and speed',
      qualityDesc: 'Highest quality, takes longer',
      layoutOptimization: 'Layout Optimization',
      enableOptimization: 'Enable Smart Layout',
      optimizationDesc: 'Automatically optimize image arrangement on canvas'
    }
  };

  // 计算预计Token消耗
  useEffect(() => {
    const baseTokens = 100; // 基础Token消耗
    const countMultiplier = config.count;
    const sizeMultiplier = config.imageSize === '4K' ? 2 : config.imageSize === '2K' ? 1.5 : 1;
    const modelMultiplier = config.model?.includes('hd') ? 1.5 : 1;
    const qualityMultiplier = qualityPreset === 'quality' ? 1.5 : qualityPreset === 'fast' ? 0.8 : 1;
    
    const estimated = Math.round(baseTokens * countMultiplier * sizeMultiplier * modelMultiplier * qualityMultiplier);
    setEstimatedTokens(estimated);
  }, [config, qualityPreset]);

  // 质量预设变化时更新配置
  useEffect(() => {
    switch (qualityPreset) {
      case 'fast':
        setConfig(prev => ({
          ...prev,
          imageSize: '1K',
          model: 'nano-banana'
        }));
        break;
      case 'balanced':
        setConfig(prev => ({
          ...prev,
          imageSize: '2K',
          model: 'nano-banana'
        }));
        break;
      case 'quality':
        setConfig(prev => ({
          ...prev,
          imageSize: '4K',
          model: 'nano-banana-hd'
        }));
        break;
    }
  }, [qualityPreset]);

  const handleConfigChange = (key: keyof MultiImageConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    onGenerate(config);
  };

  const renderLayoutPreview = () => {
    const { count, layoutPreference } = config;
    const items = Array.from({ length: Math.min(count, 9) }, (_, i) => i); // 最多预览9个

    let gridClass = '';
    switch (layoutPreference) {
      case 'grid':
        const cols = Math.ceil(Math.sqrt(count));
        gridClass = `grid-cols-${Math.min(cols, 3)}`;
        break;
      case 'horizontal':
        gridClass = 'grid-flow-col auto-cols-max';
        break;
      case 'vertical':
        gridClass = 'grid-rows-4 grid-flow-col';
        break;
    }

    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t[lang].preview}
          </span>
        </div>
        
        <div className={`grid gap-2 ${gridClass} max-w-xs mx-auto`}>
          {/* 源模块 */}
          <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded border-2 border-blue-400 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">源</span>
          </div>
          
          {/* 生成的图片 */}
          {items.map(i => (
            <div 
              key={i} 
              className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded border border-emerald-300 dark:border-emerald-700 flex items-center justify-center"
            >
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{i + 1}</span>
            </div>
          ))}
          
          {count > 9 && (
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <span className="text-xs text-slate-500">...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="p-6 space-y-6">
          {/* 生成数量 */}
          <div>
            <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t[lang].count}: {config.count}张
            </label>
            <input
              type="range"
              min="2"
              max="10"
              value={config.count}
              onChange={(e) => handleConfigChange('count', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>2</span>
              <span>6</span>
              <span>10</span>
            </div>
          </div>

          {/* 布局方式 */}
          <div>
            <label className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t[lang].layout}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'grid', label: t[lang].grid, icon: Grid3X3 },
                { value: 'horizontal', label: t[lang].horizontal, icon: ArrowRight },
                { value: 'vertical', label: t[lang].vertical, icon: ArrowDown }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleConfigChange('layoutPreference', value)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    config.layoutPreference === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 布局预览 */}
          {renderLayoutPreview()}

          {/* 质量设置 */}
          <div>
            <button
              onClick={() => setShowQualitySettings(!showQualitySettings)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Zap size={16} />
              {t[lang].qualitySettings}
              <ArrowDown 
                size={16} 
                className={`transition-transform ${showQualitySettings ? 'rotate-180' : ''}`} 
              />
            </button>

            {showQualitySettings && (
              <div className="mt-4 space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {/* 质量预设 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t[lang].consistencyMode}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'fast', label: t[lang].fast, desc: t[lang].fastDesc, icon: '⚡' },
                      { value: 'balanced', label: t[lang].balanced, desc: t[lang].balancedDesc, icon: '⚖️' },
                      { value: 'quality', label: t[lang].quality, desc: t[lang].qualityDesc, icon: '💎' }
                    ].map(({ value, label, desc, icon }) => (
                      <button
                        key={value}
                        onClick={() => setQualityPreset(value as 'fast' | 'balanced' | 'quality')}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                          qualityPreset === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 布局优化 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t[lang].layoutOptimization}
                  </label>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t[lang].enableOptimization}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t[lang].optimizationDesc}
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfigChange('enableLayoutOptimization', !config.enableLayoutOptimization)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.enableLayoutOptimization 
                          ? 'bg-blue-600' 
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.enableLayoutOptimization ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 高级选项 */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Settings size={16} />
              {t[lang].advanced}
              <ArrowDown 
                size={16} 
                className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
              />
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {/* 宽高比 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t[lang].aspectRatio}
                  </label>
                  <select
                    value={config.aspectRatio}
                    onChange={(e) => handleConfigChange('aspectRatio', e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="16:9">16:9 (横屏)</option>
                    <option value="9:16">9:16 (竖屏)</option>
                    <option value="1:1">1:1 (正方形)</option>
                    <option value="4:3">4:3</option>
                    <option value="3:2">3:2</option>
                  </select>
                </div>

                {/* 图片尺寸 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t[lang].imageSize}
                  </label>
                  <select
                    value={config.imageSize}
                    onChange={(e) => handleConfigChange('imageSize', e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="1K">1K (快速)</option>
                    <option value="2K">2K (平衡)</option>
                    <option value="4K">4K (高质量)</option>
                  </select>
                </div>

                {/* 生成模型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t[lang].model}
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => handleConfigChange('model', e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="nano-banana">nano-banana (标准)</option>
                    <option value="nano-banana-hd">nano-banana-hd (高清)</option>
                    <option value="nano-banana-2">nano-banana-2 (最新)</option>
                  </select>
                </div>

                {/* 投射到画布 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t[lang].projectToCanvas}
                  </label>
                  <button
                    onClick={() => handleConfigChange('projectToCanvas', !config.projectToCanvas)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.projectToCanvas 
                        ? 'bg-blue-600' 
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.projectToCanvas ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Token消耗估算 */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t[lang].estimatedCost}
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              ~{estimatedTokens} {t[lang].tokens}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              {t[lang].tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {t[lang].cancel}
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Grid3X3 size={16} />
            {t[lang].generate}
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default MultiImageConfigModal;