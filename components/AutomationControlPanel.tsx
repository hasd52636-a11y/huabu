import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Upload, Settings, ChevronDown, ChevronUp, Download, Monitor } from 'lucide-react';
import { BatchInputSource, ExecutionProgress } from '../types';

interface AutomationControlPanelProps {
  isAutomationTemplate: boolean;
  onBatchInputConfig: () => void;
  onStartExecution: (source: BatchInputSource) => void;
  onPauseExecution: () => void;
  onStopExecution: () => void;
  executionProgress?: ExecutionProgress;
  lang: 'zh' | 'en';
  batchInputSource?: BatchInputSource | null;
  sidebarWidth?: number;
  showSidebar?: boolean;
  onConfigUpdate?: (config: {
    executionMode: 'conservative' | 'standard' | 'fast' | 'custom';
    customInterval: number;
    enableSmartInterval: boolean;
    resultHandling: 'canvas' | 'download';
    downloadPath: string;
  }) => void;
}

const AutomationControlPanel: React.FC<AutomationControlPanelProps> = ({
  isAutomationTemplate,
  onBatchInputConfig,
  onStartExecution,
  onPauseExecution,
  onStopExecution,
  executionProgress,
  lang,
  batchInputSource,
  sidebarWidth = 480,
  showSidebar = true,
  onConfigUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [executionMode, setExecutionMode] = useState<'conservative' | 'standard' | 'fast' | 'custom'>('standard');
  const [customInterval, setCustomInterval] = useState(2000);
  const [enableSmartInterval, setEnableSmartInterval] = useState(true);
  const [resultHandling, setResultHandling] = useState<'canvas' | 'download'>('canvas');
  const [downloadPath, setDownloadPath] = useState('');

  // 当加载自动化模板时，自动展开控制面板
  useEffect(() => {
    if (isAutomationTemplate) {
      setIsExpanded(true);
    }
  }, [isAutomationTemplate]);

  const t = {
    zh: {
      automationControl: '自动化控制',
      batchUpload: '批量上传',
      startExecution: '开始执行',
      pauseExecution: '暂停执行',
      stopExecution: '停止执行',
      executionMode: '执行模式',
      conservative: '保守模式 (2-5分钟)',
      standard: '标准模式 (1-3分钟)',
      fast: '快速模式 (30秒-1.5分钟)',
      custom: '自定义间隔',
      interval: '间隔时间',
      smartInterval: '智能间隔',
      resultHandling: '结果处理',
      displayOnCanvas: '显示在画布',
      autoDownload: '自动下载',
      downloadPath: '下载路径',
      progress: '进度',
      currentNode: '当前节点',
      totalNodes: '总节点数',
      status: '状态',
      idle: '空闲',
      running: '运行中',
      paused: '已暂停',
      completed: '已完成',
      error: '错误',
      noTemplate: '请先选择自动化模板',
      noBatchData: '请先配置批量输入数据',
      seconds: '秒',
      milliseconds: '毫秒'
    },
    en: {
      automationControl: 'Automation Control',
      batchUpload: 'Batch Upload',
      startExecution: 'Start Execution',
      pauseExecution: 'Pause Execution',
      stopExecution: 'Stop Execution',
      executionMode: 'Execution Mode',
      conservative: 'Conservative (2-5min)',
      standard: 'Standard (1-3min)',
      fast: 'Fast (30s-1.5min)',
      custom: 'Custom Interval',
      interval: 'Interval',
      smartInterval: 'Smart Interval',
      resultHandling: 'Result Handling',
      displayOnCanvas: 'Display on Canvas',
      autoDownload: 'Auto Download',
      downloadPath: 'Download Path',
      progress: 'Progress',
      currentNode: 'Current Node',
      totalNodes: 'Total Nodes',
      status: 'Status',
      idle: 'Idle',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
      error: 'Error',
      noTemplate: 'Please select an automation template first',
      noBatchData: 'Please configure batch input data first',
      seconds: 'seconds',
      milliseconds: 'ms'
    }
  }[lang];

  // Update parent component when config changes
  useEffect(() => {
    if (onConfigUpdate) {
      onConfigUpdate({
        executionMode,
        customInterval,
        enableSmartInterval,
        resultHandling,
        downloadPath
      });
    }
  }, [executionMode, customInterval, enableSmartInterval, resultHandling, downloadPath, onConfigUpdate]);

  const handleStartExecution = () => {
    if (!isAutomationTemplate) {
      alert(t.noTemplate);
      return;
    }
    
    if (!batchInputSource) {
      alert(t.noBatchData);
      return;
    }
    
    onStartExecution(batchInputSource);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return t.idle;
      case 'running': return t.running;
      case 'paused': return t.paused;
      case 'completed': return t.completed;
      case 'error': return t.error;
      default: return status;
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}${t.milliseconds}`;
    return `${(ms / 1000).toFixed(1)}${t.seconds}`;
  };

  const isExecuting = executionProgress?.status === 'running';
  const isPaused = executionProgress?.status === 'paused';
  const progressPercentage = executionProgress 
    ? (executionProgress.currentNodeIndex / executionProgress.totalNodes) * 100 
    : 0;

  // 只有在自动化模板模式下才显示面板
  if (!isAutomationTemplate) {
    return null;
  }

  // 计算位置：在侧边栏的最左侧（画布上）
  const rightPosition = showSidebar ? sidebarWidth + 20 : 20;

  return (
    <div 
      className="fixed top-40 z-[250] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[300px] max-w-[400px]"
      style={{ right: `${rightPosition}px` }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-2xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            {t.automationControl}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {/* Progress Bar (always visible when executing) */}
      {executionProgress && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{getStatusText(executionProgress.status)}</span>
            <span>{executionProgress.currentNodeIndex}/{executionProgress.totalNodes}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Main Controls */}
          <div className="flex gap-2">
            <button
              onClick={onBatchInputConfig}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t.batchUpload}
            </button>
          </div>

          {/* Execution Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStartExecution}
              disabled={isExecuting || !isAutomationTemplate}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {t.startExecution}
            </button>
            
            {isExecuting && (
              <button
                onClick={onPauseExecution}
                className="px-3 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors"
                title={t.pauseExecution}
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            
            {(isExecuting || isPaused) && (
              <button
                onClick={onStopExecution}
                className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                title={t.stopExecution}
              >
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Configuration */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Execution Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.executionMode}
              </label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="conservative">{t.conservative}</option>
                <option value="standard">{t.standard}</option>
                <option value="fast">{t.fast}</option>
                <option value="custom">{t.custom}</option>
              </select>
            </div>

            {/* Custom Interval */}
            {executionMode === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.interval} ({t.milliseconds})
                </label>
                <input
                  type="number"
                  value={customInterval}
                  onChange={(e) => setCustomInterval(Number(e.target.value))}
                  min="100"
                  max="10000"
                  step="100"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            )}

            {/* Smart Interval */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="smartInterval"
                checked={enableSmartInterval}
                onChange={(e) => setEnableSmartInterval(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="smartInterval" className="text-sm text-gray-700 dark:text-gray-300">
                {t.smartInterval}
              </label>
            </div>

            {/* Result Handling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.resultHandling}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setResultHandling('canvas')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    resultHandling === 'canvas'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  {t.displayOnCanvas}
                </button>
                <button
                  onClick={() => setResultHandling('download')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    resultHandling === 'download'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {t.autoDownload}
                </button>
              </div>
            </div>

            {/* Download Path */}
            {resultHandling === 'download' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.downloadPath}
                </label>
                <input
                  type="text"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  placeholder="/path/to/download/folder"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          {/* Batch Input Source Info */}
          {batchInputSource && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div className="font-medium mb-1">批量数据源:</div>
                <div>类型: {batchInputSource.type}</div>
                {batchInputSource.type === 'delimited' && (
                  <div>分隔符: "{batchInputSource.delimiter}"</div>
                )}
                {batchInputSource.type === 'multiple_files' && (
                  <div>文件数: {batchInputSource.files?.length || 0}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationControlPanel;