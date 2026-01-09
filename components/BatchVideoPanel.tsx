import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, Settings, Download, Clock, 
  Video, AlertCircle, CheckCircle, Loader2, X,
  ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { Block, BatchConfig, BatchGenerationState, VideoItem } from '../types';

interface BatchVideoPanelProps {
  selectedBlocks: Block[];
  onStartBatch: (config: BatchConfig) => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onStopBatch: () => void;
  batchState?: BatchGenerationState;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const BatchVideoPanel: React.FC<BatchVideoPanelProps> = ({
  selectedBlocks,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onStopBatch,
  batchState,
  theme,
  lang
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<BatchConfig>({
    videoDuration: 10,
    processingInterval: 3000,
    aspectRatio: '16:9',
    maxRetries: 3,
    retryDelay: 5000,
    enableNotifications: true
  });

  const t = {
    zh: {
      batchVideo: '批量视频',
      selectedBlocks: '已选择块',
      duration: '视频时长',
      interval: '处理间隔',
      aspectRatio: '宽高比',
      maxRetries: '最大重试',
      notifications: '通知',
      startBatch: '开始批量处理',
      pauseBatch: '暂停处理',
      resumeBatch: '恢复处理',
      stopBatch: '停止处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      pending: '等待中',
      progress: '进度',
      seconds: '秒',
      milliseconds: '毫秒',
      times: '次'
    },
    en: {
      batchVideo: 'Batch Video',
      selectedBlocks: 'Selected Blocks',
      duration: 'Duration',
      interval: 'Interval',
      aspectRatio: 'Aspect Ratio',
      maxRetries: 'Max Retries',
      notifications: 'Notifications',
      startBatch: 'Start Batch',
      pauseBatch: 'Pause',
      resumeBatch: 'Resume',
      stopBatch: 'Stop',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending',
      progress: 'Progress',
      seconds: 's',
      milliseconds: 'ms',
      times: 'times'
    }
  }[lang];

  const handleStartBatch = () => {
    if (selectedBlocks.length === 0) return;
    onStartBatch(config);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'text-amber-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Loader2 className="animate-spin" size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      case 'failed': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className={`border-2 rounded-3xl shadow-xl backdrop-blur-3xl ${
      theme === 'dark' 
        ? 'bg-slate-900/80 border-white/5' 
        : 'bg-white/95 border-black/5'
    }`}>
      {/* Header */}
      <div 
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-2xl">
            <Video size={20} strokeWidth={3} />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-widest">{t.batchVideo}</h3>
            <p className="text-xs text-slate-500 font-bold">
              {selectedBlocks.length} {t.selectedBlocks}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {batchState && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                batchState.status === 'processing' ? 'bg-amber-500 animate-pulse' :
                batchState.status === 'completed' ? 'bg-green-500' :
                batchState.status === 'paused' ? 'bg-yellow-500' : 'bg-slate-400'
              }`} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                {batchState.completed}/{batchState.total}
              </span>
            </div>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t-2 border-black/5 dark:border-white/5 pt-6">
          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t.duration}
              </label>
              <select
                value={config.videoDuration}
                onChange={(e) => setConfig({...config, videoDuration: Number(e.target.value)})}
                className={`w-full p-3 rounded-2xl border-2 font-bold text-sm ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-black/5 border-black/5 text-slate-900'
                } focus:border-amber-500 outline-none transition-all`}
              >
                <option value={5}>5{t.seconds}</option>
                <option value={10}>10{t.seconds}</option>
                <option value={15}>15{t.seconds}</option>
                <option value={25}>25{t.seconds}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t.aspectRatio}
              </label>
              <select
                value={config.aspectRatio}
                onChange={(e) => setConfig({...config, aspectRatio: e.target.value})}
                className={`w-full p-3 rounded-2xl border-2 font-bold text-sm ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-black/5 border-black/5 text-slate-900'
                } focus:border-amber-500 outline-none transition-all`}
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t.interval}
              </label>
              <input
                type="number"
                value={config.processingInterval}
                onChange={(e) => setConfig({...config, processingInterval: Number(e.target.value)})}
                className={`w-full p-3 rounded-2xl border-2 font-bold text-sm ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-black/5 border-black/5 text-slate-900'
                } focus:border-amber-500 outline-none transition-all`}
                min={1000}
                step={500}
              />
              <span className="text-[9px] text-slate-400 font-bold">{t.milliseconds}</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t.maxRetries}
              </label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) => setConfig({...config, maxRetries: Number(e.target.value)})}
                className={`w-full p-3 rounded-2xl border-2 font-bold text-sm ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white' 
                    : 'bg-black/5 border-black/5 text-slate-900'
                } focus:border-amber-500 outline-none transition-all`}
                min={0}
                max={10}
              />
              <span className="text-[9px] text-slate-400 font-bold">{t.times}</span>
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5">
            <span className="text-sm font-bold">{t.notifications}</span>
            <button
              onClick={() => setConfig({...config, enableNotifications: !config.enableNotifications})}
              className={`w-12 h-6 rounded-full transition-all ${
                config.enableNotifications ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${
                config.enableNotifications ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Progress Bar */}
          {batchState && batchState.total > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {t.progress}
                </span>
                <span className="text-xs font-bold">
                  {Math.round((batchState.completed / batchState.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(batchState.completed / batchState.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={getStatusColor('completed')}>
                  {getStatusIcon('completed')} {batchState.completed} {t.completed}
                </span>
                <span className={getStatusColor('failed')}>
                  {getStatusIcon('failed')} {batchState.failed} {t.failed}
                </span>
                <span className={getStatusColor('pending')}>
                  {getStatusIcon('pending')} {batchState.pending} {t.pending}
                </span>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {!batchState || batchState.status === 'idle' ? (
              <button
                onClick={handleStartBatch}
                disabled={selectedBlocks.length === 0}
                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play size={16} fill="currentColor" />
                {t.startBatch}
              </button>
            ) : (
              <>
                {batchState.status === 'processing' ? (
                  <button
                    onClick={onPauseBatch}
                    className="flex-1 py-4 bg-yellow-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Pause size={16} fill="currentColor" />
                    {t.pauseBatch}
                  </button>
                ) : batchState.status === 'paused' ? (
                  <button
                    onClick={onResumeBatch}
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Play size={16} fill="currentColor" />
                    {t.resumeBatch}
                  </button>
                ) : null}
                
                <button
                  onClick={onStopBatch}
                  className="px-6 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Square size={16} fill="currentColor" />
                  {t.stopBatch}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchVideoPanel;