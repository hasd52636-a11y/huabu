/**
 * Execution History Panel Component
 * Displays execution history with filtering, statistics, and re-execution capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import ExecutionHistory, { 
  ExecutionRecord, 
  ExecutionStatistics, 
  HistoryFilter,
  ExecutionBlockResult 
} from '../services/ExecutionHistory';

interface ExecutionHistoryPanelProps {
  executionHistory: ExecutionHistory;
  onReExecute?: (configuration: any) => void;
  className?: string;
}

interface ExecutionDetailsModalProps {
  execution: ExecutionRecord;
  onClose: () => void;
  onReExecute?: (configuration: any) => void;
}

const ExecutionDetailsModal: React.FC<ExecutionDetailsModalProps> = ({
  execution,
  onClose,
  onReExecute
}) => {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      case 'cancelled': return 'text-gray-600';
      case 'skipped': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'running': return '⟳';
      case 'cancelled': return '⊘';
      case 'skipped': return '⊝';
      default: return '○';
    }
  };

  const handleReExecute = () => {
    if (onReExecute) {
      onReExecute(execution.configuration);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Execution Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Execution Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Execution Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Template</label>
                <p className="text-sm text-gray-900">{execution.templateName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900 capitalize">{execution.executionType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className={`text-sm font-medium ${getStatusColor(execution.status)}`}>
                  {getStatusIcon(execution.status)} {execution.status}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-sm text-gray-900">
                  {execution.duration ? formatDuration(execution.duration) : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Blocks</label>
                <p className="text-sm text-gray-900">{execution.totalBlocks}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Completed</label>
                <p className="text-sm text-green-600">{execution.completedBlocks}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Failed</label>
                <p className="text-sm text-red-600">{execution.failedBlocks}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Skipped</label>
                <p className="text-sm text-yellow-600">{execution.skippedBlocks}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Started</label>
              <p className="text-sm text-gray-900">
                {new Date(execution.startTime).toLocaleString()}
              </p>
            </div>

            {execution.error && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Error</label>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{execution.error}</p>
              </div>
            )}
          </div>

          {/* Block Results */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Block Results</h3>
            <div className="space-y-3">
              {execution.results.map((result, index) => (
                <div key={result.blockId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">
                        Block {result.blockNumber} ({result.blockType})
                      </h4>
                      <p className="text-sm text-gray-600">ID: {result.blockId}</p>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)} {result.status}
                    </span>
                  </div>
                  
                  {result.input && (
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700">Input</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {result.input}
                      </p>
                    </div>
                  )}
                  
                  {result.output && (
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700">Output</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {result.output}
                      </p>
                    </div>
                  )}
                  
                  {result.outputUrl && (
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700">Output URL</label>
                      <a 
                        href={result.outputUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {result.outputUrl}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      Duration: {result.duration ? formatDuration(result.duration) : 'N/A'}
                    </span>
                    {result.retryCount && result.retryCount > 0 && (
                      <span>Retries: {result.retryCount}</span>
                    )}
                  </div>
                  
                  {result.error && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Configuration</h3>
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(execution.configuration, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {onReExecute && execution.status !== 'running' && (
            <button
              onClick={handleReExecute}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Re-execute
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ExecutionHistoryPanel: React.FC<ExecutionHistoryPanelProps> = ({
  executionHistory,
  onReExecute,
  className = ''
}) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [statistics, setStatistics] = useState<ExecutionStatistics | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load executions and statistics
  useEffect(() => {
    const loadData = () => {
      const currentFilter = {
        ...filter,
        ...(searchTerm && { templateName: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter as any }),
        ...(typeFilter !== 'all' && { executionType: typeFilter as any })
      };

      const executionList = executionHistory.getExecutions(currentFilter);
      const stats = executionHistory.getStatistics(currentFilter);
      
      setExecutions(executionList);
      setStatistics(stats);
    };

    loadData();

    // Set up history update callback
    const handleHistoryUpdate = (records: ExecutionRecord[]) => {
      loadData();
    };

    executionHistory.setHistoryUpdateCallback(handleHistoryUpdate);

    return () => {
      executionHistory.setHistoryUpdateCallback(() => {});
    };
  }, [executionHistory, filter, searchTerm, statusFilter, typeFilter]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteExecution = (executionId: string) => {
    if (confirm('Are you sure you want to delete this execution record?')) {
      executionHistory.deleteExecution(executionId);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all execution history? This action cannot be undone.')) {
      executionHistory.clearHistory();
    }
  };

  const handleExportHistory = () => {
    const currentFilter = {
      ...filter,
      ...(searchTerm && { templateName: searchTerm }),
      ...(statusFilter !== 'all' && { status: statusFilter as any }),
      ...(typeFilter !== 'all' && { executionType: typeFilter as any })
    };

    const exportData = executionHistory.exportHistory(currentFilter);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Execution History</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportHistory}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Export
            </button>
            <button
              onClick={handleClearHistory}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'statistics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Statistics
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'history' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="batch">Batch</option>
              </select>
            </div>

            {/* Execution List */}
            <div className="space-y-3">
              {executions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No execution records found
                </div>
              ) : (
                executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedExecution(execution)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{execution.templateName}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(execution.startTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExecution(execution.id);
                          }}
                          className="text-gray-400 hover:text-red-600 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        {execution.completedBlocks}/{execution.totalBlocks} blocks completed
                      </span>
                      <span>
                        {execution.duration ? formatDuration(execution.duration) : 'Running...'}
                      </span>
                    </div>
                    
                    {execution.failedBlocks > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        {execution.failedBlocks} blocks failed
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'statistics' && statistics && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Executions</h3>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalExecutions}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Completed</h3>
                <p className="text-2xl font-bold text-green-900">{statistics.completedExecutions}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-800">Failed</h3>
                <p className="text-2xl font-bold text-red-900">{statistics.failedExecutions}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Success Rate</h3>
                <p className="text-2xl font-bold text-purple-900">{statistics.successRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Most Used Templates</h3>
                <div className="space-y-2">
                  {statistics.mostUsedTemplates.slice(0, 5).map((template, index) => (
                    <div key={template.templateName} className="flex justify-between items-center">
                      <span className="text-sm">{template.templateName}</span>
                      <span className="text-sm font-medium">{template.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Execution Types</h3>
                <div className="space-y-2">
                  {Object.entries(statistics.executionsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{type}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700">Average Duration</h4>
                  <p className="text-lg font-semibold">{formatDuration(statistics.averageDuration)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700">Total Blocks Processed</h4>
                  <p className="text-lg font-semibold">{statistics.totalBlocksProcessed}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700">Cancelled Executions</h4>
                  <p className="text-lg font-semibold">{statistics.cancelledExecutions}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <ExecutionDetailsModal
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
          onReExecute={onReExecute}
        />
      )}
    </div>
  );
};

export default ExecutionHistoryPanel;