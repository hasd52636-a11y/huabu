import React, { useState } from 'react';
import { Upload, Play, Pause, Square, Zap, Settings, FileText, Image as ImageIcon, Download, Eye } from 'lucide-react';
import { ExecutionProgress, BatchInputSource } from '../types';

interface AutomationControlPanelProps {
  isAutomationTemplate: boolean;
  onBatchInputConfig: () => void;
  onStartExecution: (source?: BatchInputSource) => void;
  onPauseExecution: () => void;
  onStopExecution: () => void;
  executionProgress?: ExecutionProgress;
  lang: 'zh' | 'en';
  batchInputSource?: BatchInputSource;
  onConfigUpdate?: (config: { executionMode: string; customInterval: number; enableSmartInterval: boolean; resultHandling: 'canvas' | 'download'; downloadPath: string }) => void;
}

type ExecutionMode = 'conservative' | 'standard' | 'fast' | 'custom';

const AutomationControlPanel: React.FC<AutomationControlPanelProps> = ({
  isAutomationTemplate,
  onBatchInputConfig,
  onStartExecution,
  onPauseExecution,
  onStopExecution,
  executionProgress,
  lang,
  batchInputSource,
  onConfigUpdate
}) => {
  const hasBatchData = !!batchInputSource;
  
  // 执行模式状态
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('standard');
  const [customInterval, setCustomInterval] = useState<number>(60);
  const [enableSmartInterval, setEnableSmartInterval] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // 新增：结果处理方式
  const [resultHandling, setResultHandling] = useState<'canvas' | 'download'>('canvas');
  const [downloadPath, setDownloadPath] = useState<string>('');

  // 处理配置更新
  const handleConfigUpdate = () => {
    onConfigUpdate?.({
      executionMode,
      customInterval,
      enableSmartInterval,
      resultHandling,
      downloadPath
    });
  };

  const t = {
    zh: {
      automationMode: '自动化模式',
      batchInput: '批量数据输入',
      startExecution: '开始自动执行',
      pause: '暂停',
      resume: '继续',
      stop: '停止',
      needData: '需要先上传批量数据',
      progress: '执行进度',
      executionMode: '执行模式',
      conservative: '保守模式',
      standard: '标准模式',
      fast: '快速模式',
      custom: '自定义模式',
      customInterval: '自定义间隔（秒）',
      enableSmartInterval: '启用智能间隔调整',
      smartIntervalDesc: '根据实际执行时间自动调整间隔',
      settings: '设置',
      minInterval: '最小10秒',
      resultHandling: '结果处理方式',
      canvas: '显示在画布上',
      download: '自动下载',
      downloadPath: '下载路径',
      downloadPathRequired: '自动下载模式下必须填写下载路径',
      currentStep: '当前步骤',
      totalSteps: '总步骤',
      executing: '正在执行',
      completed: '已完成',
      paused: '已暂停',
      error: '执行错误',
      ready: '准备就绪',
      percentComplete: '完成百分比'
    },
    en: {
      automationMode: 'Automation Mode',
      batchInput: 'Batch Data Input',
      startExecution: 'Start Auto Execution',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      needData: 'Upload batch data first',
      progress: 'Execution Progress',
      executionMode: 'Execution Mode',
      conservative: 'Conservative',
      standard: 'Standard',
      fast: 'Fast',
      custom: 'Custom',
      customInterval: 'Custom Interval (seconds)',
      enableSmartInterval: 'Enable Smart Interval',
      smartIntervalDesc: 'Automatically adjust interval based on actual execution time',
      settings: 'Settings',
      minInterval: 'Minimum 10 seconds',
      resultHandling: 'Result Handling',
      canvas: 'Show on Canvas',
      download: 'Auto Download',
      downloadPath: 'Download Path',
      downloadPathRequired: 'Download path is required for auto download mode',
      currentStep: 'Current Step',
      totalSteps: 'Total Steps',
      executing: 'Executing',
      completed: 'Completed',
      paused: 'Paused',
      error: 'Error',
      ready: 'Ready',
      percentComplete: 'Percent Complete'
    }
  }[lang];

  if (!isAutomationTemplate) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-2xl shadow-xl p-4 min-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {t.automationMode}
          </span>
        </div>
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={t.settings}
        >
          <Settings size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Progress Display */}
      {executionProgress && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {t.progress}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {executionProgress.currentNodeIndex + 1}/{executionProgress.totalNodes}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((executionProgress.currentNodeIndex + 1) / executionProgress.totalNodes) * 100}%` 
              }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Status: {executionProgress.status}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
          {/* Execution Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.executionMode}
            </label>
            <select
              value={executionMode}
              onChange={(e) => {
                setExecutionMode(e.target.value as ExecutionMode);
                handleConfigUpdate();
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={executionProgress?.status === 'running'}
            >
              <option value="conservative">{t.conservative}</option>
              <option value="standard">{t.standard}</option>
              <option value="fast">{t.fast}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </div>

          {/* Custom Interval (only show in custom mode) */}
          {executionMode === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.customInterval}
              </label>
              <input
                type="number"
                value={customInterval}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 10) {
                    setCustomInterval(value);
                    handleConfigUpdate();
                  }
                }}
                min="10"
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="60"
                disabled={executionProgress?.status === 'running'}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t.minInterval}
              </p>
            </div>
          )}

          {/* Smart Interval */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.enableSmartInterval}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.smartIntervalDesc}
              </p>
            </div>
            <button
              onClick={() => {
                setEnableSmartInterval(!enableSmartInterval);
                handleConfigUpdate();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableSmartInterval ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              disabled={executionProgress?.status === 'running'}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableSmartInterval ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Result Handling */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.resultHandling}
            </label>
            <div className="space-y-2">
              {/* Canvas Option */}
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer transition-colors hover:border-blue-500 focus-within:border-blue-500">
                <input
                  type="radio"
                  name="resultHandling"
                  value="canvas"
                  checked={resultHandling === 'canvas'}
                  onChange={(e) => {
                    setResultHandling(e.target.value as 'canvas' | 'download');
                    handleConfigUpdate();
                  }}
                  className="w-4 h-4 text-blue-500"
                  disabled={executionProgress?.status === 'running'}
                />
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-blue-500" />
                  <span className="text-slate-900 dark:text-slate-100">{t.canvas}</span>
                </div>
              </label>
              
              {/* Download Option */}
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer transition-colors hover:border-blue-500 focus-within:border-blue-500">
                <input
                  type="radio"
                  name="resultHandling"
                  value="download"
                  checked={resultHandling === 'download'}
                  onChange={(e) => {
                    setResultHandling(e.target.value as 'canvas' | 'download');
                    handleConfigUpdate();
                  }}
                  className="w-4 h-4 text-blue-500"
                  disabled={executionProgress?.status === 'running'}
                />
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-blue-500" />
                  <span className="text-slate-900 dark:text-slate-100">{t.download}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Download Path - Only show in download mode */}
          {resultHandling === 'download' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.downloadPath}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={downloadPath}
                onChange={(e) => {
                  setDownloadPath(e.target.value);
                  handleConfigUpdate();
                }}
                placeholder="/downloads/automation-results"
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={executionProgress?.status === 'running'}
              />
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {t.downloadPathRequired}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress Display - Enhanced */}
      {executionProgress && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          {/* Progress Text */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {t.progress}
              </span>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {Math.min(executionProgress.currentNodeIndex + 1, executionProgress.totalNodes)} / {executionProgress.totalNodes}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${Math.min(((executionProgress.currentNodeIndex + 1) / executionProgress.totalNodes) * 100, 100)}%` 
              }}
            >
              {/* Progress Percentage */}
              <div className="flex items-center justify-end h-full pr-2">
                <span className="text-xs font-bold text-white">
                  {Math.min(Math.round(((executionProgress.currentNodeIndex + 1) / executionProgress.totalNodes) * 100), 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {t.currentStep}:
            </span>
            <span className={`text-xs font-medium ${executionProgress.status === 'running' ? 'text-blue-600 dark:text-blue-400' : executionProgress.status === 'completed' ? 'text-green-600 dark:text-green-400' : executionProgress.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {executionProgress.status === 'running' ? t.executing :
               executionProgress.status === 'completed' ? t.completed :
               executionProgress.status === 'paused' ? t.paused :
               executionProgress.status === 'error' ? t.error :
               t.ready}
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="space-y-2">
        {/* Batch Input Button */}
        <button
          onClick={onBatchInputConfig}
          disabled={executionProgress?.status === 'running'}
          className="w-full flex items-center gap-3 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          <Upload size={18} />
          <span className="font-medium">{t.batchInput}</span>
        </button>

        {/* Execution Control */}
        {!executionProgress || executionProgress.status === 'idle' || executionProgress.status === 'completed' ? (
          <button
            onClick={() => onStartExecution()}
            disabled={!hasBatchData || (resultHandling === 'download' && !downloadPath)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            title={!hasBatchData ? t.needData : (resultHandling === 'download' && !downloadPath ? t.downloadPathRequired : '')}
          >
            <Play size={18} />
            <span className="font-medium">{t.startExecution}</span>
          </button>
        ) : (
          <div className="flex gap-2">
            {executionProgress.status === 'running' ? (
              <button
                onClick={onPauseExecution}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-colors"
              >
                <Pause size={18} />
                <span className="font-medium">{t.pause}</span>
              </button>
            ) : executionProgress.status === 'paused' ? (
              <button
                onClick={() => onStartExecution()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
              >
                <Play size={18} />
                <span className="font-medium">{t.resume}</span>
              </button>
            ) : null}
            
            <button
              onClick={onStopExecution}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              <Square size={18} />
              <span className="font-medium">{t.stop}</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Zap size={12} />
          <span>
            {executionProgress?.status === 'running' ? 'Executing...' :
             executionProgress?.status === 'paused' ? 'Paused' :
             executionProgress?.status === 'completed' ? 'Completed' :
             executionProgress?.status === 'error' ? 'Error' :
             'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutomationControlPanel;