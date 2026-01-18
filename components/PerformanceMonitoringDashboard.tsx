/**
 * Performance Monitoring Dashboard Component
 * 
 * Provides real-time performance metrics and monitoring for the Canvas
 * Requirements: 8.1, 8.3, 8.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Block } from '../types';
import { PerformanceOptimizationSystem, PerformanceMetrics } from '../services/PerformanceOptimizationSystem';
import { Activity, BarChart3, Cpu, HardDrive, Zap, AlertTriangle, CheckCircle, Info, Settings } from 'lucide-react';
import PerformanceConfigPanel from './PerformanceConfigPanel';

interface PerformanceMonitoringDashboardProps {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  blocks: Block[];
  useVirtualization: boolean;
  zoom: number;
  performanceOptimizationSystem: PerformanceOptimizationSystem;
}

const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  theme,
  lang,
  blocks,
  useVirtualization,
  zoom,
  performanceOptimizationSystem
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = performanceOptimizationSystem.getMetrics();
      setMetrics(currentMetrics);
      
      // Get recommendations
      const newRecommendations = performanceOptimizationSystem.getOptimizationRecommendations();
      setRecommendations(newRecommendations);
      
      // Update history
      const history = performanceOptimizationSystem.getPerformanceHistory();
      setPerformanceHistory(history.slice(-20)); // Keep last 20 entries
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000); // Update every second

    return () => clearInterval(interval);
  }, [performanceOptimizationSystem]);

  const getPerformanceStatus = useCallback(() => {
    if (!metrics) return 'unknown';
    
    const issues = [];
    if (metrics.frameRate < 30) issues.push('low-fps');
    if (metrics.memoryUsage > 100) issues.push('high-memory');
    if (metrics.renderTime > 16) issues.push('slow-render');
    
    if (issues.length === 0) return 'good';
    if (issues.length === 1) return 'warning';
    return 'critical';
  }, [metrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'critical': return <AlertTriangle size={16} />;
      default: return <Info size={16} />;
    }
  };

  if (!metrics) return null;

  const status = getPerformanceStatus();

  return (
    <div className="relative">
      {/* Performance Status Indicator */}
      <button
        onClick={() => setShowDashboard(!showDashboard)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
          theme === 'dark' 
            ? 'bg-slate-800/90 text-white hover:bg-slate-700' 
            : 'bg-white/90 text-gray-700 hover:bg-white'
        }`}
        title={lang === 'zh' ? '性能监控' : 'Performance Monitor'}
      >
        <Activity size={16} className={getStatusColor(status)} />
        <span>{lang === 'zh' ? '性能' : 'Perf'}</span>
        {recommendations.length > 0 && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Expanded Dashboard */}
      {showDashboard && (
        <div className={`absolute top-full left-0 mt-2 p-4 rounded-lg shadow-xl border min-w-[320px] z-50 ${
          theme === 'dark' 
            ? 'bg-slate-800/95 border-white/10 text-white' 
            : 'bg-white/95 border-gray-200 text-gray-700'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 size={20} />
              {lang === 'zh' ? '性能监控' : 'Performance Monitor'}
            </h3>
            <div className={`flex items-center gap-1 text-sm ${getStatusColor(status)}`}>
              {getStatusIcon(status)}
              <span className="capitalize">{status}</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1">
                  <Zap size={14} />
                  {lang === 'zh' ? 'FPS' : 'FPS'}
                </span>
                <span className={`text-sm font-mono ${
                  metrics.frameRate < 30 ? 'text-red-500' : 
                  metrics.frameRate < 50 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {metrics.frameRate.toFixed(1)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1">
                  <Cpu size={14} />
                  {lang === 'zh' ? '渲染' : 'Render'}
                </span>
                <span className={`text-sm font-mono ${
                  metrics.renderTime > 16 ? 'text-red-500' : 
                  metrics.renderTime > 10 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {metrics.renderTime.toFixed(1)}ms
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1">
                  <HardDrive size={14} />
                  {lang === 'zh' ? '内存' : 'Memory'}
                </span>
                <span className={`text-sm font-mono ${
                  metrics.memoryUsage > 100 ? 'text-red-500' : 
                  metrics.memoryUsage > 50 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {metrics.memoryUsage.toFixed(1)}MB
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {lang === 'zh' ? '可见块' : 'Visible'}
                </span>
                <span className="text-sm font-mono">
                  {metrics.visibleBlocks}/{metrics.totalBlocks}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          {performanceHistory.length > 1 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">
                {lang === 'zh' ? 'FPS 趋势' : 'FPS Trend'}
              </div>
              <div className="h-16 flex items-end gap-1">
                {performanceHistory.slice(-20).map((entry, index) => {
                  const height = Math.max(2, (entry.frameRate / 60) * 100);
                  const color = entry.frameRate < 30 ? 'bg-red-500' : 
                               entry.frameRate < 50 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <div
                      key={index}
                      className={`w-2 ${color} opacity-70 rounded-t`}
                      style={{ height: `${Math.min(height, 100)}%` }}
                      title={`${entry.frameRate.toFixed(1)} FPS`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="text-xs space-y-1 mb-4 p-2 rounded bg-black/5 dark:bg-white/5">
            <div className="flex justify-between">
              <span>{lang === 'zh' ? '模式' : 'Mode'}:</span>
              <span className="font-mono">{useVirtualization ? 'Virtual' : 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'zh' ? '缩放' : 'Zoom'}:</span>
              <span className="font-mono">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'zh' ? '缓存命中率' : 'Cache Hit'}:</span>
              <span className="font-mono">{(metrics.cacheHitRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-1">
                <AlertTriangle size={14} className="text-yellow-500" />
                {lang === 'zh' ? '优化建议' : 'Recommendations'}
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-xs p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      {rec.message}
                    </div>
                    {rec.action && (
                      <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                        {rec.action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Force garbage collection if available
                  if (typeof window !== 'undefined' && 'gc' in window) {
                    (window as any).gc();
                  }
                  performanceOptimizationSystem.performAggressiveCleanup();
                }}
                className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {lang === 'zh' ? '清理内存' : 'Clean Memory'}
              </button>
              <button
                onClick={() => setShowConfigPanel(true)}
                className="flex-1 px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors flex items-center justify-center gap-1"
              >
                <Settings size={12} />
                {lang === 'zh' ? '配置' : 'Config'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfigPanel && (
        <PerformanceConfigPanel
          performanceOptimizationSystem={performanceOptimizationSystem}
          theme={theme}
          lang={lang}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
};

export default PerformanceMonitoringDashboard;