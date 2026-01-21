import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Share2, Copy, Check, Users, Eye, Clock, Activity, Settings, Loader2, Wifi, WifiOff, Signal } from 'lucide-react';
import { realtimeShareService } from '../services/RealtimeShareService';
import { shareDiagnosticService } from '../services/ShareDiagnosticService';
import { shareErrorHandler, ShareError, RecoveryAction } from '../services/ShareErrorHandler';
import ShareDiagnosticPanel from './ShareDiagnosticPanel';
import ShareErrorNotification from './ShareErrorNotification';

interface RealtimeShareButtonProps {
  blocks?: any[];
  connections?: any[];
  zoom?: number;
  pan?: { x: number; y: number };
}

interface ShareProgress {
  stage: 'idle' | 'initializing' | 'creating_session' | 'establishing_connection' | 'ready' | 'stopping';
  progress: number;
  message: string;
}

interface ShareStats {
  sessionDuration: number;
  totalViewers: number;
  currentViewers: number;
  updatesSent: number;
  connectionQuality: string;
  lastUpdate: number;
}

interface ShareSettings {
  maxViewers: number;
  autoReconnect: boolean;
  compressionEnabled: boolean;
  qualityAdaptive: boolean;
  updateThrottle: number;
}

interface RealtimeShareButtonProps {
  blocks?: any[];
  connections?: any[];
  zoom?: number;
  pan?: { x: number; y: number };
}

const RealtimeShareButton: React.FC<RealtimeShareButtonProps> = ({ 
  blocks = [], 
  connections = [], 
  zoom = 1, 
  pan = { x: 200, y: 100 } 
}) => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showPanel, setShowPanel] = useState(false); // 控制面板显示状态
  const [shareProgress, setShareProgress] = useState<ShareProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [shareStats, setShareStats] = useState<ShareStats>({
    sessionDuration: 0,
    totalViewers: 0,
    currentViewers: 0,
    updatesSent: 0,
    connectionQuality: 'unknown',
    lastUpdate: 0
  });
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    maxViewers: 10,
    autoReconnect: true,
    compressionEnabled: true,
    qualityAdaptive: true,
    updateThrottle: 500
  });
  const [error, setError] = useState<string>('');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentError, setCurrentError] = useState<ShareError | null>(null);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const sessionStartTime = useRef<number>(0);
  const statsUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const updateCounter = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 更新分享进度
  const updateShareProgress = useCallback((stage: ShareProgress['stage'], progress: number, message: string) => {
    setShareProgress({ stage, progress, message });
    shareDiagnosticService.logInfo('service', '分享进度更新', { stage, progress, message });
  }, []);

  // 更新统计信息
  const updateStats = useCallback(() => {
    if (!isSharing) return;

    const currentSession = realtimeShareService.getCurrentSession();
    const connectionStatus = realtimeShareService.getConnectionStatus();
    
    if (currentSession) {
      const now = Date.now();
      setShareStats(prev => ({
        ...prev,
        sessionDuration: sessionStartTime.current ? now - sessionStartTime.current : 0,
        currentViewers: currentSession.viewers.length,
        totalViewers: Math.max(prev.totalViewers, currentSession.viewers.length),
        connectionQuality: connectionStatus.quality?.level || 'unknown',
        lastUpdate: now
      }));
      
      setIsConnected(connectionStatus.isConnected);
    }
  }, [isSharing]);

  useEffect(() => {
    // 设置更新回调
    realtimeShareService.setUpdateCallback((update) => {
      if (update.type === 'canvas_update') {
        updateCounter.current++;
        setShareStats(prev => ({
          ...prev,
          updatesSent: updateCounter.current
        }));
        console.log('[RealtimeShare] Canvas updated by host');
      }
    });

    // 设置错误处理回调
    shareErrorHandler.setErrorCallback((error, actions) => {
      setCurrentError(error);
      setRecoveryActions(actions);
      setError(error.userMessage);
    });

    // 检查是否已经在分享
    const currentSession = realtimeShareService.getCurrentSession();
    if (currentSession && realtimeShareService.isHosting()) {
      setIsSharing(true);
      setShowPanel(true); // 如果已经在分享，显示面板
      setShareUrl(`${window.location.origin}?watch=${currentSession.id}`);
      sessionStartTime.current = currentSession.createdAt;
      updateShareProgress('ready', 100, '分享进行中');
      
      // 启动统计更新
      statsUpdateInterval.current = setInterval(updateStats, 2000);
    }

    return () => {
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
      }
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
      }
    };
  }, [updateStats, updateShareProgress]);

  // 实时更新画布状态（带节流）
  useEffect(() => {
    if (isSharing && realtimeShareService.isHosting()) {
      const canvasState = {
        blocks: blocks || [],
        connections: connections || [],
        zoom: zoom || 1,
        pan: pan || { x: 200, y: 100 }
      };
      
      // 使用设置中的节流时间
      const timeoutId = setTimeout(() => {
        realtimeShareService.updateCanvas(canvasState);
      }, shareSettings.updateThrottle);

      return () => clearTimeout(timeoutId);
    }
  }, [blocks, connections, zoom, pan, isSharing, shareSettings.updateThrottle]);

  const handleStartShare = async () => {
    updateShareProgress('initializing', 10, '正在初始化分享...');
    setError('');
    setCurrentError(null);

    try {
      const canvasState = {
        blocks: blocks || [],
        connections: connections || [],
        zoom: zoom || 1,
        pan: pan || { x: 200, y: 100 }
      };

      updateShareProgress('creating_session', 30, '正在创建分享会话...');
      
      const { sessionId, shareUrl: url } = await realtimeShareService.createSession(
        '画布同屏分享',
        canvasState
      );

      updateShareProgress('establishing_connection', 60, '正在建立连接...');
      
      // 应用分享设置
      const session = realtimeShareService.getCurrentSession();
      if (session) {
        session.settings = {
          ...session.settings,
          ...shareSettings
        };
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // 确保连接建立

      updateShareProgress('ready', 100, '分享已启动');

      setShareUrl(url);
      setIsSharing(true);
      setShowPanel(true); // 启动分享时显示面板
      sessionStartTime.current = Date.now();
      updateCounter.current = 0;
      
      // 重置统计
      setShareStats({
        sessionDuration: 0,
        totalViewers: 0,
        currentViewers: 0,
        updatesSent: 0,
        connectionQuality: 'good',
        lastUpdate: Date.now()
      });

      // 启动统计更新
      statsUpdateInterval.current = setInterval(updateStats, 2000);

      // 记录成功日志
      shareDiagnosticService.logInfo('service', '分享会话创建成功', { sessionId, url });
      shareDiagnosticService.logPerformance('share_start_time', Date.now(), 'ms');

      console.log('[RealtimeShare] Share started:', { sessionId, url });
    } catch (err) {
      updateShareProgress('idle', 0, '');
      // 使用错误处理器处理错误
      await shareErrorHandler.handleError(err instanceof Error ? err : new Error('启动分享失败'), {
        action: 'start_share',
        canvasState: { blocks, connections, zoom, pan }
      });
    }
  };

  const handleStopShare = async () => {
    updateShareProgress('stopping', 50, '正在停止分享...');
    
    try {
      await realtimeShareService.endSession();
      
      // 清理状态
      setIsSharing(false);
      setShareUrl('');
      setShowPanel(false); // 停止分享时隐藏面板
      setError('');
      setCurrentError(null);
      setIsConnected(false);
      updateShareProgress('idle', 0, '');
      
      // 清理定时器
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
        statsUpdateInterval.current = null;
      }
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
        panelTimeoutRef.current = null;
      }
      
      console.log('[RealtimeShare] Share stopped');
    } catch (err) {
      await shareErrorHandler.handleError(err instanceof Error ? err : new Error('停止分享失败'), {
        action: 'stop_share'
      });
    }
  };

  const handleRetryShare = async () => {
    await handleStartShare();
  };

  const handleDismissError = () => {
    setCurrentError(null);
    setError('');
  };

  // 智能面板交互处理
  const handleIconClick = async () => {
    if (isLoading) return;
    
    if (isSharing) {
      // 如果正在分享，点击停止分享
      await handleStopShare();
    } else {
      // 如果未分享，点击开始分享并显示面板
      await handleStartShare();
    }
  };

  const handlePanelMouseEnter = () => {
    // 鼠标进入面板时，清除隐藏定时器
    if (panelTimeoutRef.current) {
      clearTimeout(panelTimeoutRef.current);
      panelTimeoutRef.current = null;
    }
    setShowPanel(true);
  };

  const handlePanelMouseLeave = () => {
    // 鼠标离开面板时，设置延迟隐藏
    panelTimeoutRef.current = setTimeout(() => {
      setShowPanel(false);
    }, 300); // 300ms 延迟，避免意外隐藏
  };

  const handleIconMouseEnter = () => {
    // 鼠标悬停在图标上时，如果正在分享则显示面板
    if (isSharing) {
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
        panelTimeoutRef.current = null;
      }
      setShowPanel(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSettingsChange = (newSettings: Partial<ShareSettings>) => {
    setShareSettings(prev => ({ ...prev, ...newSettings }));
    
    // 如果正在分享，立即应用设置
    if (isSharing) {
      const session = realtimeShareService.getCurrentSession();
      if (session) {
        session.settings = {
          ...session.settings,
          ...newSettings
        };
      }
    }
  };

  // 格式化持续时间
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const isLoading = shareProgress.stage !== 'idle' && shareProgress.stage !== 'ready';

  return (
    <div className="relative">
      {/* 工具栏按钮 */}
      <button 
        onClick={handleIconClick}
        onMouseEnter={handleIconMouseEnter}
        disabled={isLoading}
        className={`p-4 rounded-2xl transition-all relative ${
          isSharing 
            ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20' 
            : 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isSharing ? '停止同屏分享' : '开启同屏分享'}
      >
        {isLoading ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          <Share2 size={24} />
        )}
        
        {/* 连接状态指示器 */}
        {isSharing && (
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
        )}
        
        {/* 观众计数 */}
        {shareStats.currentViewers > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {shareStats.currentViewers}
          </div>
        )}
      </button>

      {/* 加载进度提示 */}
      {isLoading && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {shareProgress.message}
        </div>
      )}

      {/* 分享面板 */}
      {isSharing && shareUrl && showPanel && (
        <div 
          ref={panelRef}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          className="absolute left-full ml-4 top-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">同屏分享</h3>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>已连接</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-600" />
                    <span className="text-red-600">连接中断</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="分享设置"
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={handleStopShare}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
              >
                停止
              </button>
            </div>
          </div>

          {/* 详细统计信息 */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{shareStats.currentViewers} / {shareStats.totalViewers} 观众</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{blocks.length} 模块</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(shareStats.sessionDuration)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Activity className="w-4 h-4" />
              <span>{shareStats.updatesSent} 更新</span>
            </div>
          </div>

          {/* 连接质量指示 */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Signal className={`w-4 h-4 ${
              shareStats.connectionQuality === 'excellent' ? 'text-green-500' :
              shareStats.connectionQuality === 'good' ? 'text-blue-500' :
              shareStats.connectionQuality === 'fair' ? 'text-yellow-500' : 'text-red-500'
            }`} />
            <span className="text-gray-600">
              连接质量: {
                shareStats.connectionQuality === 'excellent' ? '优秀' :
                shareStats.connectionQuality === 'good' ? '良好' :
                shareStats.connectionQuality === 'fair' ? '一般' : 
                shareStats.connectionQuality === 'poor' ? '较差' : '未知'
              }
            </span>
          </div>

          {/* 分享设置面板 */}
          {showSettings && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-3">分享设置</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">最大观众数</label>
                  <select
                    value={shareSettings.maxViewers}
                    onChange={(e) => handleSettingsChange({ maxViewers: parseInt(e.target.value) })}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={5}>5人</option>
                    <option value={10}>10人</option>
                    <option value={20}>20人</option>
                    <option value={50}>50人</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">自动重连</label>
                  <input
                    type="checkbox"
                    checked={shareSettings.autoReconnect}
                    onChange={(e) => handleSettingsChange({ autoReconnect: e.target.checked })}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">数据压缩</label>
                  <input
                    type="checkbox"
                    checked={shareSettings.compressionEnabled}
                    onChange={(e) => handleSettingsChange({ compressionEnabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">质量自适应</label>
                  <input
                    type="checkbox"
                    checked={shareSettings.qualityAdaptive}
                    onChange={(e) => handleSettingsChange({ qualityAdaptive: e.target.checked })}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">更新间隔</label>
                  <select
                    value={shareSettings.updateThrottle}
                    onChange={(e) => handleSettingsChange({ updateThrottle: parseInt(e.target.value) })}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={100}>100ms (快)</option>
                    <option value={500}>500ms (标准)</option>
                    <option value={1000}>1000ms (慢)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 分享链接 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同屏分享链接
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1 font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 观众可以实时查看你的画布操作</p>
            <p>• 支持多人同时观看</p>
            <p>• 自动同步画布变化</p>
            <p>• 适合演示和教学场景</p>
          </div>

          {/* 诊断按钮 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowDiagnostic(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Activity className="w-3 h-3" />
              系统诊断
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* 诊断面板 */}
      <ShareDiagnosticPanel 
        isOpen={showDiagnostic} 
        onClose={() => setShowDiagnostic(false)} 
      />

      {/* 错误通知 */}
      <ShareErrorNotification
        error={currentError}
        recoveryActions={recoveryActions}
        onDismiss={handleDismissError}
        onRetry={handleRetryShare}
        onShowDiagnostic={() => setShowDiagnostic(true)}
      />
    </div>
  );
};

export default RealtimeShareButton;