/**
 * State Recovery Panel Component
 * Displays interrupted executions and provides recovery options
 */

import React, { useState, useEffect } from 'react';
import StateManager, { ExecutionState, ExecutionCheckpoint } from '../services/StateManager';

interface StateRecoveryPanelProps {
  stateManager: StateManager;
  onRecoverExecution?: (executionId: string, checkpointId?: string) => void;
  onDiscardExecution?: (executionId: string) => void;
  className?: string;
}

interface ExecutionRecoveryModalProps {
  execution: ExecutionState;
  onRecover: (checkpointId?: string) => void;
  onDiscard: () => void;
  onClose: () => void;
}

const ExecutionRecoveryModal: React.FC<ExecutionRecoveryModalProps> = ({
  execution,
  onRecover,
  onDiscard,
  onClose
}) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | undefined>();

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

  const getProgressPercentage = (): number => {
    if (execution.totalBlocks === 0) return 0;
    return Math.round((execution.completedBlocks.length / execution.totalBlocks) * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'paused': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const handleRecover = () => {
    onRecover(selectedCheckpoint);
    onClose();
  };

  const handleDiscard = () => {
    onDiscard();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Recover Execution</h2>
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
            <h3 className="text-lg font-medium mb-4">Execution Details</h3>
            <div className="grid grid-cols-2 gap-4">
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
                  {execution.status}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <p className="text-sm text-gray-900">
                  {execution.completedBlocks.length}/{execution.totalBlocks} blocks ({getProgressPercentage()}%)
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Started</label>
              <p className="text-sm text-gray-900">
                {new Date(execution.startTime).toLocaleString()}
              </p>
            </div>

            {execution.pauseTime && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700">Paused</label>
                <p className="text-sm text-gray-900">
                  {new Date(execution.pauseTime).toLocaleString()}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Checkpoint Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Recovery Options</h3>
            
            <div className="space-y-3">
              {/* Resume from current state */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="recovery-option"
                  value=""
                  checked={selectedCheckpoint === undefined}
                  onChange={() => setSelectedCheckpoint(undefined)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Resume from current state</div>
                  <div className="text-sm text-gray-600">
                    Continue from where the execution was interrupted
                  </div>
                </div>
              </label>

              {/* Checkpoints */}
              {execution.checkpoints.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-700 mt-4 mb-2">
                    Or restore from checkpoint:
                  </div>
                  {execution.checkpoints.slice().reverse().map((checkpoint, index) => (
                    <label key={checkpoint.id} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="recovery-option"
                        value={checkpoint.id}
                        checked={selectedCheckpoint === checkpoint.id}
                        onChange={() => setSelectedCheckpoint(checkpoint.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          Checkpoint {execution.checkpoints.length - index}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(checkpoint.timestamp).toLocaleString()} - 
                          Block {checkpoint.blockIndex + 1}/{execution.totalBlocks}
                          {checkpoint.batchIndex !== undefined && (
                            <span> - Batch {checkpoint.batchIndex + 1}</span>
                          )}
                        </div>
                        {checkpoint.metadata.reason && (
                          <div className="text-xs text-gray-500">
                            Reason: {checkpoint.metadata.reason}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Batch Information */}
          {execution.batchInputs && execution.batchInputs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Batch Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Inputs</label>
                  <p className="text-sm text-gray-900">{execution.batchInputs.length}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Input</label>
                  <p className="text-sm text-gray-900">
                    {execution.currentBatchIndex !== undefined 
                      ? `${execution.currentBatchIndex + 1}/${execution.batchInputs.length}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Variables */}
          {Object.keys(execution.variables).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Variables</h3>
              <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                <pre className="text-sm">
                  {JSON.stringify(execution.variables, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDiscard}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Discard
          </button>
          <button
            onClick={handleRecover}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  );
};

const StateRecoveryPanel: React.FC<StateRecoveryPanelProps> = ({
  stateManager,
  onRecoverExecution,
  onDiscardExecution,
  className = ''
}) => {
  const [recoverableExecutions, setRecoverableExecutions] = useState<ExecutionState[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadRecoverableExecutions = () => {
      const recoverable = stateManager.getRecoverableExecutions();
      setRecoverableExecutions(recoverable);
      setIsVisible(recoverable.length > 0);
    };

    loadRecoverableExecutions();

    // Set up state recovery callback
    const handleStateRecovered = (executionId: string, state: ExecutionState) => {
      loadRecoverableExecutions();
    };

    stateManager.setStateRecoveryCallback(handleStateRecovered);

    return () => {
      stateManager.setStateRecoveryCallback(() => {});
    };
  }, [stateManager]);

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

  const getProgressPercentage = (execution: ExecutionState): number => {
    if (execution.totalBlocks === 0) return 0;
    return Math.round((execution.completedBlocks.length / execution.totalBlocks) * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRecoverExecution = (executionId: string, checkpointId?: string) => {
    if (onRecoverExecution) {
      onRecoverExecution(executionId, checkpointId);
    }
    
    // Remove from recoverable list
    setRecoverableExecutions(prev => prev.filter(exec => exec.executionId !== executionId));
    
    // Hide panel if no more recoverable executions
    if (recoverableExecutions.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleDiscardExecution = (executionId: string) => {
    if (onDiscardExecution) {
      onDiscardExecution(executionId);
    }
    
    // Remove from state manager
    stateManager.deleteExecutionState(executionId);
    
    // Remove from recoverable list
    setRecoverableExecutions(prev => prev.filter(exec => exec.executionId !== executionId));
    
    // Hide panel if no more recoverable executions
    if (recoverableExecutions.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleRecoverAll = () => {
    recoverableExecutions.forEach(execution => {
      handleRecoverExecution(execution.executionId);
    });
  };

  const handleDiscardAll = () => {
    if (confirm('Are you sure you want to discard all interrupted executions? This action cannot be undone.')) {
      recoverableExecutions.forEach(execution => {
        handleDiscardExecution(execution.executionId);
      });
    }
  };

  if (!isVisible || recoverableExecutions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm ${className}`}>
        <div className="p-4 border-b border-yellow-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">
                Interrupted Executions Found
              </h2>
              <p className="text-sm text-yellow-700">
                {recoverableExecutions.length} execution{recoverableExecutions.length !== 1 ? 's' : ''} can be recovered
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecoverAll}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Recover All
              </button>
              <button
                onClick={handleDiscardAll}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Discard All
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Hide
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {recoverableExecutions.map((execution) => (
              <div
                key={execution.executionId}
                className="border rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedExecution(execution)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{execution.templateName}</h3>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(execution.startTime).toLocaleString()}
                    </p>
                    {execution.pauseTime && (
                      <p className="text-sm text-gray-600">
                        Paused: {new Date(execution.pauseTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscardExecution(execution.executionId);
                      }}
                      className="text-gray-400 hover:text-red-600 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>
                    Progress: {execution.completedBlocks.length}/{execution.totalBlocks} blocks
                  </span>
                  <span>{getProgressPercentage(execution)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(execution)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Type: {execution.executionType}
                  </span>
                  <span>
                    Checkpoints: {execution.checkpoints.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recovery Modal */}
      {selectedExecution && (
        <ExecutionRecoveryModal
          execution={selectedExecution}
          onRecover={(checkpointId) => handleRecoverExecution(selectedExecution.executionId, checkpointId)}
          onDiscard={() => handleDiscardExecution(selectedExecution.executionId)}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </>
  );
};

export default StateRecoveryPanel;