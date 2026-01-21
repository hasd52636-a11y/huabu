import React, { useState, useEffect } from 'react';
import { Activity, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, Wifi } from 'lucide-react';
import { shareDiagnosticService, DiagnosticInfo } from '../services/ShareDiagnosticService';

interface ShareDiagnosticPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareDiagnosticPanel: React.FC<ShareDiagnosticPanelProps> = ({ isOpen, onClose }) => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [networkTest, setNetworkTest] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'errors' | 'performance'>('overview');

  useEffect(() => {
    if (isOpen) {
      loadDiagnosticInfo();
    }
  }, [isOpen]);

  const loadDiagnosticInfo = async () => {
    setIsLoading(true);
    try {
      const [info, network, api] = await Promise.all([
        shareDiagnosticService.collectDiagnosticInfo(),
        shareDiagnosticService.testNetworkConnection(),
        shareDiagnosticService.testAPIConnection()
      ]);
      
      setDiagnosticInfo(info);
      setNetworkTest(network);
      setApiTest(api);
    } catch (error) {
      console.error('Failed to load diagnostic info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const report = await shareDiagnosticService.generateDiagnosticReport();
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `share-diagnostic-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const handleExportData = () => {
    try {
      const data = shareDiagnosticService.exportDiagnosticData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `share-diagnostic-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getNetworkQualityStatus = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'good';
      case 'good':
        return 'good';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">系统诊断</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDiagnosticInfo}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              关闭
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'overview', label: '概览' },
            { key: 'network', label: '网络' },
            { key: 'errors', label: '错误' },
            { key: 'performance', label: '性能' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">正在收集诊断信息...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 概览标签页 */}
              {activeTab === 'overview' && diagnosticInfo && (
                <div className="space-y-6">
                  {/* 系统状态卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">网络状态</h3>
                        {getStatusIcon(getNetworkQualityStatus(networkTest?.quality || 'unknown'))}
                      </div>
                      <p className="text-sm text-gray-600">
                        质量: {networkTest?.quality || '未知'}
                      </p>
                      <p className="text-sm text-gray-600">
                        延迟: {networkTest?.latency?.toFixed(0) || '?'} ms
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">API 状态</h3>
                        {getStatusIcon(apiTest?.available ? 'good' : 'error')}
                      </div>
                      <p className="text-sm text-gray-600">
                        可用性: {apiTest?.available ? '可用' : '不可用'}
                      </p>
                      <p className="text-sm text-gray-600">
                        响应时间: {apiTest?.responseTime?.toFixed(0) || '?'} ms
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">分享状态</h3>
                        {getStatusIcon(diagnosticInfo.shareStatus.isActive ? 'good' : 'warning')}
                      </div>
                      <p className="text-sm text-gray-600">
                        模式: {diagnosticInfo.shareStatus.mode}
                      </p>
                      <p className="text-sm text-gray-600">
                        观众: {diagnosticInfo.shareStatus.viewerCount}
                      </p>
                    </div>
                  </div>

                  {/* 浏览器信息 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">浏览器信息</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">浏览器:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.browserInfo.browser} {diagnosticInfo.browserInfo.version}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">平台:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.browserInfo.platform}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">在线状态:</span>
                        <span className={`ml-2 font-medium ${diagnosticInfo.browserInfo.onLine ? 'text-green-600' : 'text-red-600'}`}>
                          {diagnosticInfo.browserInfo.onLine ? '在线' : '离线'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cookie:</span>
                        <span className={`ml-2 font-medium ${diagnosticInfo.browserInfo.cookieEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {diagnosticInfo.browserInfo.cookieEnabled ? '启用' : '禁用'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 设备信息 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">设备信息</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">屏幕分辨率:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.deviceInfo.screenWidth} x {diagnosticInfo.deviceInfo.screenHeight}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">像素比:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.deviceInfo.pixelRatio}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">触摸支持:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.deviceInfo.touchSupport ? '是' : '否'}</span>
                      </div>
                      {diagnosticInfo.deviceInfo.memoryInfo && (
                        <div>
                          <span className="text-gray-600">内存使用:</span>
                          <span className="ml-2 font-medium">
                            {(diagnosticInfo.deviceInfo.memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 网络标签页 */}
              {activeTab === 'network' && diagnosticInfo && networkTest && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Wifi className="w-5 h-5" />
                      网络连接信息
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">连接类型:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.networkInfo.connectionType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">有效类型:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.networkInfo.effectiveType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">下行速度:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.networkInfo.downlink} Mbps</span>
                      </div>
                      <div>
                        <span className="text-gray-600">往返时间:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.networkInfo.rtt} ms</span>
                      </div>
                      <div>
                        <span className="text-gray-600">省流量模式:</span>
                        <span className="ml-2 font-medium">{diagnosticInfo.networkInfo.saveData ? '开启' : '关闭'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">网络质量:</span>
                        <span className={`ml-2 font-medium ${
                          diagnosticInfo.networkInfo.quality === 'excellent' ? 'text-green-600' :
                          diagnosticInfo.networkInfo.quality === 'good' ? 'text-blue-600' :
                          diagnosticInfo.networkInfo.quality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {diagnosticInfo.networkInfo.quality}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">网络测试结果</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-600">延迟测试</span>
                        <span className="font-medium">{networkTest.latency.toFixed(2)} ms</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-600">带宽测试</span>
                        <span className="font-medium">{(networkTest.bandwidth / 1000000).toFixed(2)} Mbps</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-600">质量评估</span>
                        <span className={`font-medium ${
                          networkTest.quality === 'excellent' ? 'text-green-600' :
                          networkTest.quality === 'good' ? 'text-blue-600' :
                          networkTest.quality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {networkTest.quality}
                        </span>
                      </div>
                    </div>
                    
                    {networkTest.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <h4 className="font-medium text-red-800 mb-2">网络测试错误</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {networkTest.errors.map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 错误标签页 */}
              {activeTab === 'errors' && diagnosticInfo && (
                <div className="space-y-4">
                  {diagnosticInfo.errorLog.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-600">没有错误记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {diagnosticInfo.errorLog.slice().reverse().map((log, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          log.level === 'error' ? 'bg-red-50 border-red-200' :
                          log.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  log.level === 'error' ? 'bg-red-100 text-red-800' :
                                  log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {log.level.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">{log.category}</span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{log.message}</p>
                              {log.details && (
                                <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 ml-4">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 性能标签页 */}
              {activeTab === 'performance' && diagnosticInfo && (
                <div className="space-y-4">
                  {diagnosticInfo.performanceLog.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">没有性能记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {diagnosticInfo.performanceLog.slice().reverse().map((log, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{log.metric}</span>
                              <span className="ml-2 text-lg font-bold text-blue-600">
                                {log.value}{log.unit}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.context && (
                            <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-4 flex justify-between">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            导出原始数据
          </button>
          
          <div className="text-xs text-gray-500">
            诊断工具可以帮助识别和解决实时分享功能的问题
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDiagnosticPanel;