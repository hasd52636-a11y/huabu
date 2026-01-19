/**
 * 管理员监控仪表板
 * 
 * 为网站管理员提供完整的用户使用数据和系统监控信息
 * 包含详细的分析报告和数据导出功能
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
  Database,
  X
} from 'lucide-react';
import AdminMonitoringAPI, { AdminDashboardData } from '../services/AdminMonitoringAPI';

interface AdminMonitoringDashboardProps {
  theme: 'light' | 'dark';
  onClose?: () => void;
}

const AdminMonitoringDashboard: React.FC<AdminMonitoringDashboardProps> = ({
  theme,
  onClose
}) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'api' | 'models' | 'features' | 'system' | 'alerts'>('overview');
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const adminAPI = AdminMonitoringAPI.getInstance();

  useEffect(() => {
    // Authenticate admin on component mount
    authenticateAdmin();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      
      // Auto-refresh every minute
      const interval = setInterval(loadData, 60000);
      return () => clearInterval(interval);
    }
  }, [timeRange, isAuthenticated]);

  const authenticateAdmin = () => {
    // In a real application, this would be a proper login flow
    const adminKey = prompt('Enter admin key:') || 'admin-key-2024';
    
    const authResult = adminAPI.authenticateAdmin({
      adminKey,
      timestamp: Date.now()
    });

    if (authResult.authenticated && authResult.sessionToken) {
      setSessionToken(authResult.sessionToken);
      setIsAuthenticated(true);
    } else {
      alert('Authentication failed: ' + (authResult.error || 'Invalid credentials'));
      if (onClose) onClose();
    }
  };

  const loadData = async () => {
    if (!sessionToken) return;
    
    setIsLoading(true);
    try {
      const dashboardData = adminAPI.getAdminDashboardData({
        start: getTimeRangeStart(),
        end: Date.now(),
        period: timeRange
      });
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRangeStart = () => {
    const now = Date.now();
    switch (timeRange) {
      case 'hour':
        return now - 60 * 60 * 1000;
      case 'day':
        return now - 24 * 60 * 60 * 1000;
      case 'week':
        return now - 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return now - 30 * 24 * 60 * 60 * 1000;
      default:
        return now - 24 * 60 * 60 * 1000;
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    if (!sessionToken) return;
    
    try {
      const exportData = await adminAPI.exportAdminReport(sessionToken, format, {
        start: getTimeRangeStart(),
        end: Date.now(),
        period: timeRange
      });
      
      if (!exportData) {
        alert('Export failed: Authentication required');
        return;
      }
      
      const blob = new Blob([exportData as string], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-report-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}秒`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}分钟`;
    } else {
      return `${Math.round(ms / 3600000)}小时`;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[400]">
        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6`}>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Admin Authentication Required</h3>
            <p className="text-sm text-gray-500 mb-4">Please authenticate to access the admin monitoring dashboard.</p>
            <div className="flex space-x-3">
              <button
                onClick={authenticateAdmin}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Authenticate
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[400]">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6`}>
          <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
          <p className="mt-2">Loading admin dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[400]">
      <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} 
                      rounded-lg shadow-2xl w-11/12 h-5/6 max-w-7xl flex flex-col`}>
        
        {/* Header */}
        <div className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} 
                        border-b px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Admin Monitoring Dashboard</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 时间范围选择 */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className={`px-3 py-1 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            {/* 导出按钮 */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                CSV
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={loadData}
              disabled={isLoading}
              className={`p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* 关闭按钮 */}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} 
                        border-b px-6 py-2`}>
          <div className="flex space-x-6">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'users', label: 'User Analytics', icon: Users },
              { key: 'api', label: 'API Usage', icon: Zap },
              { key: 'models', label: 'Model Stats', icon: Database },
              { key: 'features', label: 'Feature Usage', icon: TrendingUp },
              { key: 'system', label: 'System Performance', icon: Activity },
              { key: 'alerts', label: 'Alerts', icon: AlertTriangle }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab data={data} theme={theme} formatDuration={formatDuration} />
          )}
          
          {activeTab === 'users' && (
            <UsersTab data={data} theme={theme} formatDuration={formatDuration} />
          )}
          
          {activeTab === 'api' && (
            <APITab data={data} theme={theme} />
          )}
          
          {activeTab === 'models' && (
            <ModelsTab data={data} theme={theme} />
          )}
          
          {activeTab === 'features' && (
            <FeaturesTab data={data} theme={theme} />
          )}
          
          {activeTab === 'system' && (
            <SystemTab data={data} theme={theme} formatDuration={formatDuration} />
          )}
          
          {activeTab === 'alerts' && (
            <AlertsTab theme={theme} adminAPI={adminAPI} />
          )}
        </div>
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab: React.FC<{ data: AdminDashboardData; theme: string; formatDuration: (ms: number) => string }> = ({ data, theme, formatDuration }) => (
  <div className="space-y-6">
    {/* 关键指标卡片 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总用户数</p>
            <p className="text-2xl font-bold">{data.userStats.totalUsers}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">API调用</p>
            <p className="text-2xl font-bold">{data.apiStats.totalAPICalls}</p>
          </div>
          <Zap className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Token消耗</p>
            <p className="text-2xl font-bold">{data.tokenStats.totalTokens.toLocaleString()}</p>
          </div>
          <Database className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">响应时间</p>
            <p className="text-2xl font-bold">{data.systemPerformance.avgResponseTime}ms</p>
          </div>
          <Activity className="w-8 h-8 text-purple-500" />
        </div>
      </div>
    </div>

    {/* 使用趋势 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4">API提供商使用分布</h3>
        <div className="space-y-3">
          {data.apiStats.apisByProvider.slice(0, 5).map((provider, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium">{provider.provider}</span>
              <div className="flex space-x-2 text-sm text-gray-500">
                <span>{provider.calls} 次</span>
                <span>{Math.round(provider.successRate * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4">热门模型</h3>
        <div className="space-y-3">
          {data.modelStats.modelsByUsage.slice(0, 5).map((model, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium">{model.modelName}</span>
              <div className="flex space-x-2 text-sm text-gray-500">
                <span>{model.usageCount} 次</span>
                <span>{model.tokens.toLocaleString()} tokens</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* 时间统计 */}
    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">使用时间分析</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{formatDuration(data.timeStats.averageSessionLength * 1000)}</p>
          <p className="text-sm text-gray-500">平均会话时长</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{formatDuration(data.timeStats.totalActiveTime * 1000)}</p>
          <p className="text-sm text-gray-500">总活跃时间</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{data.userStats.totalSessions}</p>
          <p className="text-sm text-gray-500">总会话数</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-500">${data.tokenStats.totalCost.toFixed(2)}</p>
          <p className="text-sm text-gray-500">总成本</p>
        </div>
      </div>
    </div>
  </div>
);

const UsersTab: React.FC<{ data: AdminDashboardData; theme: string; formatDuration: (ms: number) => string }> = ({ data, theme, formatDuration }) => (
  <div className="space-y-6">
    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">用户统计</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{data.userStats.totalUsers}</p>
          <p className="text-sm text-gray-500">总用户数</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{data.userStats.activeUsers}</p>
          <p className="text-sm text-gray-500">活跃用户</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{data.userStats.newUsers}</p>
          <p className="text-sm text-gray-500">新用户</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{Math.round(data.userStats.bounceRate * 100)}%</p>
          <p className="text-sm text-gray-500">跳出率</p>
        </div>
      </div>
    </div>

    {data.userBehavior.pageViews.length > 0 && (
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4">页面浏览统计</h3>
        <div className="space-y-2">
          {data.userBehavior.pageViews.map((page, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{page.page}</span>
              <div className="flex space-x-4 text-sm text-gray-500">
                <span>{page.views} 次浏览</span>
                <span>平均 {formatDuration(page.avgTime)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const FeaturesTab: React.FC<{ data: AdminDashboardData; theme: string }> = ({ data, theme }) => (
  <div className="space-y-6">
    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">最常用功能</h3>
      <div className="space-y-3">
        {data.featureStats.mostUsedFeatures.map((feature, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm font-medium">{feature.name}</span>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{feature.usageCount} 次使用</span>
              <span>{Math.round(feature.successRate * 100)}% 成功率</span>
              <span>平均 {feature.avgDuration}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {data.featureStats.errorRates.length > 0 && (
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4">错误率统计</h3>
        <div className="space-y-3">
          {data.featureStats.errorRates.map((error, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm font-medium">{error.feature}</span>
              <div className="flex space-x-4 text-sm">
                <span className="text-red-500">{Math.round(error.errorRate * 100)}% 错误率</span>
                <span className="text-gray-500">{error.errorCount} 次错误</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SystemTab: React.FC<{ data: AdminDashboardData; theme: string; formatDuration: (ms: number) => string }> = ({ data, theme, formatDuration }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">平均响应时间</p>
            <p className="text-2xl font-bold">{data.systemPerformance.avgResponseTime}ms</p>
          </div>
          <Zap className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">系统负载</p>
            <p className="text-2xl font-bold">{Math.round(data.systemPerformance.systemLoad * 100)}%</p>
          </div>
          <Activity className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">内存使用</p>
            <p className="text-2xl font-bold">{data.systemPerformance.memoryUsage}%</p>
          </div>
          <Database className="w-8 h-8 text-yellow-500" />
        </div>
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">系统信息</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">运行时间</p>
          <p className="text-lg font-medium">{formatDuration(data.systemPerformance.uptime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">错误次数</p>
          <p className="text-lg font-medium">{data.systemPerformance.errorCount}</p>
        </div>
      </div>
    </div>
  </div>
);

const APITab: React.FC<{ data: AdminDashboardData; theme: string }> = ({ data, theme }) => (
  <div className="space-y-6">
    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">API使用概览</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{data.apiStats.totalAPICalls}</p>
          <p className="text-sm text-gray-500">总API调用</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{data.tokenStats.totalTokens.toLocaleString()}</p>
          <p className="text-sm text-gray-500">总Token消耗</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">${data.tokenStats.totalCost.toFixed(2)}</p>
          <p className="text-sm text-gray-500">总成本</p>
        </div>
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">按提供商统计</h3>
      <div className="space-y-3">
        {data.apiStats.apisByProvider.map((provider, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm font-medium">{provider.provider}</span>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{provider.calls} 次调用</span>
              <span>{provider.tokens.toLocaleString()} tokens</span>
              <span>${provider.cost.toFixed(2)}</span>
              <span>{Math.round(provider.successRate * 100)}% 成功率</span>
              <span>{Math.round(provider.avgLatency)}ms 延迟</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">热门API端点</h3>
      <div className="space-y-3">
        {data.apiStats.topEndpoints.map((endpoint, index) => (
          <div key={index} className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">{endpoint.endpoint}</span>
              <span className="text-xs text-gray-500 ml-2">({endpoint.provider})</span>
            </div>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{endpoint.calls} 次调用</span>
              <span>{endpoint.tokens.toLocaleString()} tokens</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {data.tokenStats.dailyUsage.length > 0 && (
      <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4">每日Token使用趋势</h3>
        <div className="space-y-2">
          {data.tokenStats.dailyUsage.slice(-7).map((day, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{day.date}</span>
              <div className="flex space-x-4 text-sm text-gray-500">
                <span>{day.tokens.toLocaleString()} tokens</span>
                <span>${day.cost.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ModelsTab: React.FC<{ data: AdminDashboardData; theme: string }> = ({ data, theme }) => (
  <div className="space-y-6">
    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">模型使用概览</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{data.modelStats.totalModels}</p>
          <p className="text-sm text-gray-500">使用的模型数量</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">
            {data.modelStats.modelsByUsage.reduce((sum, m) => sum + m.usageCount, 0)}
          </p>
          <p className="text-sm text-gray-500">总模型调用次数</p>
        </div>
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">模型使用排行</h3>
      <div className="space-y-3">
        {data.modelStats.modelsByUsage.map((model, index) => (
          <div key={index} className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">{model.modelName}</span>
              <span className="text-xs text-gray-500 ml-2">({model.provider})</span>
            </div>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{model.usageCount} 次使用</span>
              <span>{model.tokens.toLocaleString()} tokens</span>
              <span>{Math.round(model.successRate * 100)}% 成功率</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">内容类型分布</h3>
      <div className="space-y-4">
        {data.modelStats.modelsByUsage.map((model, modelIndex) => (
          model.contentTypes.length > 0 && (
            <div key={modelIndex}>
              <h4 className="text-sm font-medium mb-2">{model.modelName}</h4>
              <div className="grid grid-cols-3 gap-2">
                {model.contentTypes.map((contentType, index) => (
                  <div key={index} className="text-center">
                    <p className="text-lg font-bold">{contentType.count}</p>
                    <p className="text-xs text-gray-500">{contentType.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>

    <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold mb-4">Token消耗按模型</h3>
      <div className="space-y-3">
        {data.tokenStats.byModel.map((model, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm font-medium">{model.model}</span>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{model.tokens.toLocaleString()} tokens</span>
              <span>${model.cost.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AlertsTab: React.FC<{ theme: string; adminAPI: AdminMonitoringAPI }> = ({ theme, adminAPI }) => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const loadAlerts = () => {
      const currentAlerts = adminAPI.getAdminAlerts();
      setAlerts(currentAlerts);
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [adminAPI]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 text-center`}>
          <p className="text-gray-500">No alerts at this time</p>
        </div>
      ) : (
        alerts.map((alert) => (
          <div key={alert.id} className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 ${getSeverityColor(alert.severity)}`} />
                  <span className={`text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{alert.category}</span>
                </div>
                <h4 className="font-medium mb-1">{alert.title}</h4>
                <p className="text-sm text-gray-600">{alert.message}</p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminMonitoringDashboard;