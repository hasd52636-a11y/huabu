/**
 * 语音指令统计界面
 * 显示指令库的学习情况和统计数据
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Download, Trash2, RefreshCw } from 'lucide-react';
import { voiceCommandLibrary } from '../services/VoiceCommandLibrary';

interface VoiceCommandStatsProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'zh' | 'en';
}

const VoiceCommandStats: React.FC<VoiceCommandStatsProps> = ({
  isOpen,
  onClose,
  lang = 'zh'
}) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const t = {
    zh: {
      title: '语音指令学习统计',
      overview: '总览',
      totalPatterns: '指令模式总数',
      totalFeedbacks: '用户反馈总数',
      averageSuccess: '平均成功率',
      mostUsed: '最常用指令',
      patternsByCommand: '各类指令分布',
      usageCount: '使用次数',
      successRate: '成功率',
      command: '指令类型',
      exportData: '导出数据',
      clearData: '清空数据',
      refresh: '刷新',
      close: '关闭',
      commands: {
        generate_text: '生成文字',
        generate_image: '生成图片',
        generate_video: '生成视频',
        add_to_canvas: '添加到画布'
      },
      noData: '暂无数据',
      confirmClear: '确定要清空所有学习数据吗？此操作不可恢复。'
    },
    en: {
      title: 'Voice Command Learning Statistics',
      overview: 'Overview',
      totalPatterns: 'Total Patterns',
      totalFeedbacks: 'Total Feedbacks',
      averageSuccess: 'Average Success Rate',
      mostUsed: 'Most Used Commands',
      patternsByCommand: 'Patterns by Command',
      usageCount: 'Usage Count',
      successRate: 'Success Rate',
      command: 'Command Type',
      exportData: 'Export Data',
      clearData: 'Clear Data',
      refresh: 'Refresh',
      close: 'Close',
      commands: {
        generate_text: 'Generate Text',
        generate_image: 'Generate Image',
        generate_video: 'Generate Video',
        add_to_canvas: 'Add to Canvas'
      },
      noData: 'No data available',
      confirmClear: 'Are you sure you want to clear all learning data? This action cannot be undone.'
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = () => {
    setIsLoading(true);
    try {
      const statsData = voiceCommandLibrary.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    try {
      const data = voiceCommandLibrary.exportLearningData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-command-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleClearData = () => {
    if (window.confirm(t[lang].confirmClear)) {
      try {
        localStorage.removeItem('voice_command_library');
        localStorage.removeItem('voice_command_feedback');
        loadStats();
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} />
            {t[lang].title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t[lang].refresh}
            >
              <RefreshCw size={20} className="text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : !stats ? (
            <div className="text-center py-12 text-gray-500">
              {t[lang].noData}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 总览卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t[lang].totalPatterns}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.total_patterns}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {t[lang].totalFeedbacks}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.total_feedbacks}
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      {t[lang].averageSuccess}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {(stats.average_success_rate * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      {t[lang].command}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    {Object.keys(stats.patterns_by_command).length}
                  </div>
                </div>
              </div>

              {/* 指令分布 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {t[lang].patternsByCommand}
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.patterns_by_command).map(([command, count]) => (
                    <div key={command} className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t[lang].commands[command as keyof typeof t[typeof lang]['commands']] || command}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(count as number / stats.total_patterns) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最常用指令 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {t[lang].mostUsed}
                </h3>
                <div className="space-y-2">
                  {stats.most_used_patterns.map((pattern: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t[lang].commands[pattern.command as keyof typeof t[typeof lang]['commands']] || pattern.command}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t[lang].usageCount}: {pattern.usage_count}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t[lang].successRate}: {(pattern.success_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    {t[lang].exportData}
                  </button>
                  
                  <button
                    onClick={handleClearData}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                    {t[lang].clearData}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t[lang].close}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandStats;