/**
 * State Manager Service
 * Handles execution state persistence and recovery for long-running automation tasks
 * Provides checkpoint saving and restoration capabilities
 */

export interface ExecutionState {
  executionId: string;
  templateId: string;
  templateName: string;
  executionType: 'manual' | 'scheduled' | 'batch';
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  pauseTime?: number;
  resumeTime?: number;
  currentBlockIndex: number;
  totalBlocks: number;
  completedBlocks: string[];
  failedBlocks: string[];
  skippedBlocks: string[];
  blockStates: Map<string, BlockExecutionState>;
  configuration: ExecutionConfiguration;
  variables: Record<string, string>;
  batchInputs?: string[];
  currentBatchIndex?: number;
  checkpoints: ExecutionCheckpoint[];
  lastCheckpointTime: number;
  metadata: Record<string, any>;
}

export interface BlockExecutionState {
  blockId: string;
  blockNumber: string;
  blockType: 'text' | 'image' | 'video';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  input?: string;
  output?: string;
  outputUrl?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryTime?: number;
}

export interface ExecutionCheckpoint {
  id: string;
  executionId: string;
  timestamp: number;
  blockIndex: number;
  completedBlocks: string[];
  variables: Record<string, string>;
  batchIndex?: number;
  metadata: Record<string, any>;
}

export interface ExecutionConfiguration {
  templateId: string;
  batchInputs?: string[];
  variables?: Record<string, string>;
  scheduledTime?: number;
  downloadConfig?: {
    enabled: boolean;
    directory?: string;
    organizationPattern?: string;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  checkpointConfig?: {
    enabled: boolean;
    interval: number; // milliseconds
    maxCheckpoints: number;
  };
}

export interface StateManagerConfig {
  checkpointInterval: number;
  maxCheckpoints: number;
  autoSaveEnabled: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  maxStateAge: number; // milliseconds
}

export class StateManager {
  private static readonly STORAGE_KEY = 'automation_execution_states';
  private static readonly CHECKPOINT_KEY = 'automation_checkpoints';
  private executionStates = new Map<string, ExecutionState>();
  private checkpointTimers = new Map<string, NodeJS.Timeout>();
  private onStateUpdate?: (executionId: string, state: ExecutionState) => void;
  private onStateRecovered?: (executionId: string, state: ExecutionState) => void;
  private config: StateManagerConfig = {
    checkpointInterval: 30000, // 30 seconds
    maxCheckpoints: 10,
    autoSaveEnabled: true,
    compressionEnabled: false,
    encryptionEnabled: false,
    maxStateAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  constructor() {
    this.loadStatesFromStorage();
    this.cleanupOldStates();
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupOldStates();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Set state update callback
   */
  setStateUpdateCallback(callback: (executionId: string, state: ExecutionState) => void): void {
    this.onStateUpdate = callback;
  }

  /**
   * Set state recovery callback
   */
  setStateRecoveryCallback(callback: (executionId: string, state: ExecutionState) => void): void {
    this.onStateRecovered = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StateManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start tracking execution state
   */
  startExecution(
    executionId: string,
    templateId: string,
    templateName: string,
    executionType: 'manual' | 'scheduled' | 'batch',
    configuration: ExecutionConfiguration,
    totalBlocks: number,
    variables: Record<string, string> = {},
    batchInputs?: string[]
  ): void {
    const state: ExecutionState = {
      executionId,
      templateId,
      templateName,
      executionType,
      status: 'running',
      startTime: Date.now(),
      currentBlockIndex: 0,
      totalBlocks,
      completedBlocks: [],
      failedBlocks: [],
      skippedBlocks: [],
      blockStates: new Map(),
      configuration,
      variables,
      batchInputs,
      currentBatchIndex: batchInputs ? 0 : undefined,
      checkpoints: [],
      lastCheckpointTime: Date.now(),
      metadata: {}
    };

    this.executionStates.set(executionId, state);
    this.saveStateToStorage(executionId);
    
    // Start checkpoint timer if enabled
    if (configuration.checkpointConfig?.enabled !== false) {
      this.startCheckpointTimer(executionId);
    }

    this.notifyStateUpdate(executionId, state);
  }

  /**
   * Update execution state
   */
  updateExecutionState(
    executionId: string,
    updates: Partial<Pick<ExecutionState, 'status' | 'currentBlockIndex' | 'variables' | 'currentBatchIndex' | 'metadata'>>
  ): void {
    const state = this.executionStates.get(executionId);
    if (!state) return;

    Object.assign(state, updates);
    
    // Update pause/resume times
    if (updates.status === 'paused') {
      state.pauseTime = Date.now();
    } else if (updates.status === 'running' && state.pauseTime) {
      state.resumeTime = Date.now();
    }

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);
  }

  /**
   * Update block state
   */
  updateBlockState(executionId: string, blockState: BlockExecutionState): void {
    const state = this.executionStates.get(executionId);
    if (!state) return;

    state.blockStates.set(blockState.blockId, blockState);
    
    // Update completion tracking
    const blockId = blockState.blockId;
    
    // Remove from other arrays first
    state.completedBlocks = state.completedBlocks.filter(id => id !== blockId);
    state.failedBlocks = state.failedBlocks.filter(id => id !== blockId);
    state.skippedBlocks = state.skippedBlocks.filter(id => id !== blockId);
    
    // Add to appropriate array
    switch (blockState.status) {
      case 'completed':
        state.completedBlocks.push(blockId);
        break;
      case 'failed':
        state.failedBlocks.push(blockId);
        break;
      case 'skipped':
        state.skippedBlocks.push(blockId);
        break;
    }

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);
  }

  /**
   * Create checkpoint
   */
  createCheckpoint(executionId: string, metadata: Record<string, any> = {}): string {
    const state = this.executionStates.get(executionId);
    if (!state) {
      throw new Error(`Execution state not found: ${executionId}`);
    }

    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const checkpoint: ExecutionCheckpoint = {
      id: checkpointId,
      executionId,
      timestamp: Date.now(),
      blockIndex: state.currentBlockIndex,
      completedBlocks: [...state.completedBlocks],
      variables: { ...state.variables },
      batchIndex: state.currentBatchIndex,
      metadata
    };

    state.checkpoints.push(checkpoint);
    state.lastCheckpointTime = Date.now();
    
    // Limit number of checkpoints
    const maxCheckpoints = state.configuration.checkpointConfig?.maxCheckpoints || this.config.maxCheckpoints;
    if (state.checkpoints.length > maxCheckpoints) {
      state.checkpoints = state.checkpoints.slice(-maxCheckpoints);
    }

    this.saveStateToStorage(executionId);
    this.saveCheckpointToStorage(checkpoint);
    this.notifyStateUpdate(executionId, state);

    return checkpointId;
  }

  /**
   * Restore from checkpoint
   */
  restoreFromCheckpoint(executionId: string, checkpointId: string): boolean {
    const state = this.executionStates.get(executionId);
    if (!state) return false;

    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return false;

    // Restore state from checkpoint
    state.currentBlockIndex = checkpoint.blockIndex;
    state.completedBlocks = [...checkpoint.completedBlocks];
    state.variables = { ...checkpoint.variables };
    state.currentBatchIndex = checkpoint.batchIndex;
    state.status = 'running';
    state.resumeTime = Date.now();

    // Reset block states for blocks after checkpoint
    for (const [blockId, blockState] of state.blockStates.entries()) {
      if (!checkpoint.completedBlocks.includes(blockId)) {
        blockState.status = 'pending';
        blockState.startTime = undefined;
        blockState.endTime = undefined;
        blockState.output = undefined;
        blockState.outputUrl = undefined;
        blockState.error = undefined;
      }
    }

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);

    return true;
  }

  /**
   * Pause execution
   */
  pauseExecution(executionId: string): boolean {
    const state = this.executionStates.get(executionId);
    if (!state || state.status !== 'running') return false;

    state.status = 'paused';
    state.pauseTime = Date.now();
    
    // Create checkpoint before pausing
    this.createCheckpoint(executionId, { reason: 'pause' });
    
    // Stop checkpoint timer
    this.stopCheckpointTimer(executionId);

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);

    return true;
  }

  /**
   * Resume execution
   */
  resumeExecution(executionId: string): boolean {
    const state = this.executionStates.get(executionId);
    if (!state || state.status !== 'paused') return false;

    state.status = 'running';
    state.resumeTime = Date.now();
    
    // Restart checkpoint timer
    if (state.configuration.checkpointConfig?.enabled !== false) {
      this.startCheckpointTimer(executionId);
    }

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);

    return true;
  }

  /**
   * Complete execution
   */
  completeExecution(executionId: string, status: 'completed' | 'failed' | 'cancelled'): void {
    const state = this.executionStates.get(executionId);
    if (!state) return;

    state.status = status;
    
    // Create final checkpoint
    this.createCheckpoint(executionId, { reason: 'completion', finalStatus: status });
    
    // Stop checkpoint timer
    this.stopCheckpointTimer(executionId);

    this.saveStateToStorage(executionId);
    this.notifyStateUpdate(executionId, state);
  }

  /**
   * Get execution state
   */
  getExecutionState(executionId: string): ExecutionState | null {
    const state = this.executionStates.get(executionId);
    return state || null;
  }

  /**
   * Save execution state (for compatibility with tests)
   */
  saveExecutionState(state: any): void {
    try {
      const key = `automation_execution_${state.id}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // Silently handle storage errors
    }
  }

  /**
   * Save workflow state (for compatibility with tests)
   */
  saveWorkflowState(state: any): void {
    try {
      const key = `automation_workflow_${state.id}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // Silently handle storage errors
    }
  }

  /**
   * Get workflow state (for compatibility with tests)
   */
  getWorkflowState(workflowId: string): any {
    try {
      const key = `automation_workflow_${workflowId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save automation state (for compatibility with tests)
   */
  saveAutomationState(state: any): void {
    try {
      localStorage.setItem('automation_state', JSON.stringify(state));
    } catch (error) {
      // Silently handle storage errors
    }
  }

  /**
   * Get automation state (for compatibility with tests)
   */
  getAutomationState(): any {
    try {
      const stored = localStorage.getItem('automation_state');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Recover interrupted execution (for compatibility with tests)
   */
  recoverInterruptedExecution(executionId: string): any {
    try {
      const key = `automation_execution_${executionId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get recoverable states (for compatibility with tests)
   */
  getRecoverableStates(): { executions: string[]; workflows: string[] } {
    const executions: string[] = [];
    const workflows: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('automation_execution_')) {
          executions.push(key.replace('automation_execution_', ''));
        } else if (key?.startsWith('automation_workflow_')) {
          workflows.push(key.replace('automation_workflow_', ''));
        }
      }
    } catch (error) {
      // Return empty arrays on error
    }
    
    return { executions, workflows };
  }

  /**
   * Clear expired states (for compatibility with tests)
   */
  clearExpiredStates(): void {
    const expiredTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('automation_execution_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const state = JSON.parse(stored);
            if (state.startTime && state.startTime < expiredTime) {
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Get all execution states
   */
  getAllExecutionStates(): ExecutionState[] {
    return Array.from(this.executionStates.values());
  }

  /**
   * Get running executions
   */
  getRunningExecutions(): ExecutionState[] {
    return Array.from(this.executionStates.values()).filter(state => 
      state.status === 'running' || state.status === 'paused'
    );
  }

  /**
   * Get recoverable executions (interrupted executions)
   */
  getRecoverableExecutions(): ExecutionState[] {
    return Array.from(this.executionStates.values()).filter(state => 
      (state.status === 'running' || state.status === 'paused') && 
      state.checkpoints.length > 0
    );
  }

  /**
   * Recover interrupted executions
   */
  recoverInterruptedExecutions(): ExecutionState[] {
    const recoverable = this.getRecoverableExecutions();
    
    recoverable.forEach(state => {
      // Mark as paused for manual recovery decision
      if (state.status === 'running') {
        state.status = 'paused';
        this.saveStateToStorage(state.executionId);
      }
      
      if (this.onStateRecovered) {
        this.onStateRecovered(state.executionId, state);
      }
    });

    return recoverable;
  }

  /**
   * Delete execution state
   */
  deleteExecutionState(executionId: string): boolean {
    const deleted = this.executionStates.delete(executionId);
    
    if (deleted) {
      this.stopCheckpointTimer(executionId);
      this.removeStateFromStorage(executionId);
    }
    
    return deleted;
  }

  /**
   * Clear old execution states
   */
  clearOldStates(maxAge?: number): number {
    const cutoffTime = Date.now() - (maxAge || this.config.maxStateAge);
    let removedCount = 0;
    
    for (const [executionId, state] of this.executionStates.entries()) {
      if (state.startTime < cutoffTime && 
          (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled')) {
        this.deleteExecutionState(executionId);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Export execution states
   */
  exportStates(): string {
    const states = Array.from(this.executionStates.values()).map(state => ({
      ...state,
      blockStates: Array.from(state.blockStates.entries())
    }));
    
    const exportData = {
      exportDate: new Date().toISOString(),
      stateCount: states.length,
      states
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import execution states
   */
  importStates(jsonData: string, mergeMode: 'replace' | 'merge' = 'merge'): number {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.states || !Array.isArray(importData.states)) {
        throw new Error('Invalid import data format');
      }
      
      const importedStates = importData.states.map((stateData: any) => ({
        ...stateData,
        blockStates: new Map(stateData.blockStates || [])
      }));
      
      if (mergeMode === 'replace') {
        this.executionStates.clear();
      }
      
      let importedCount = 0;
      for (const state of importedStates) {
        if (mergeMode === 'merge' && this.executionStates.has(state.executionId)) {
          continue; // Skip existing states in merge mode
        }
        
        this.executionStates.set(state.executionId, state);
        importedCount++;
      }
      
      this.saveAllStatesToStorage();
      
      return importedCount;
    } catch (error) {
      throw new Error(`Failed to import states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start checkpoint timer for execution
   */
  private startCheckpointTimer(executionId: string): void {
    this.stopCheckpointTimer(executionId); // Clear existing timer
    
    const state = this.executionStates.get(executionId);
    if (!state) return;
    
    const interval = state.configuration.checkpointConfig?.interval || this.config.checkpointInterval;
    
    const timer = setInterval(() => {
      if (this.executionStates.get(executionId)?.status === 'running') {
        this.createCheckpoint(executionId, { reason: 'automatic' });
      }
    }, interval);
    
    this.checkpointTimers.set(executionId, timer);
  }

  /**
   * Stop checkpoint timer for execution
   */
  private stopCheckpointTimer(executionId: string): void {
    const timer = this.checkpointTimers.get(executionId);
    if (timer) {
      clearInterval(timer);
      this.checkpointTimers.delete(executionId);
    }
  }

  /**
   * Load states from localStorage
   */
  private loadStatesFromStorage(): void {
    try {
      const stored = localStorage.getItem(StateManager.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          data.forEach((stateData: any) => {
            const state = {
              ...stateData,
              blockStates: new Map(stateData.blockStates || [])
            };
            this.executionStates.set(state.executionId, state);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load execution states from storage:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveStateToStorage(executionId: string): void {
    if (!this.config.autoSaveEnabled) return;
    
    try {
      this.saveAllStatesToStorage();
    } catch (error) {
      console.error('Failed to save execution state to storage:', error);
    }
  }

  /**
   * Save all states to localStorage
   */
  private saveAllStatesToStorage(): void {
    try {
      const states = Array.from(this.executionStates.values()).map(state => ({
        ...state,
        blockStates: Array.from(state.blockStates.entries())
      }));
      
      localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save execution states to storage:', error);
    }
  }

  /**
   * Remove state from localStorage
   */
  private removeStateFromStorage(executionId: string): void {
    try {
      this.saveAllStatesToStorage();
    } catch (error) {
      console.error('Failed to remove execution state from storage:', error);
    }
  }

  /**
   * Save checkpoint to localStorage
   */
  private saveCheckpointToStorage(checkpoint: ExecutionCheckpoint): void {
    try {
      const stored = localStorage.getItem(StateManager.CHECKPOINT_KEY);
      const checkpoints = stored ? JSON.parse(stored) : [];
      
      checkpoints.push(checkpoint);
      
      // Limit total checkpoints
      const maxTotal = this.config.maxCheckpoints * 10; // Allow more total checkpoints
      if (checkpoints.length > maxTotal) {
        checkpoints.splice(0, checkpoints.length - maxTotal);
      }
      
      localStorage.setItem(StateManager.CHECKPOINT_KEY, JSON.stringify(checkpoints));
    } catch (error) {
      console.error('Failed to save checkpoint to storage:', error);
    }
  }

  /**
   * Clean up old states
   */
  private cleanupOldStates(): void {
    this.clearOldStates();
  }

  /**
   * Notify state update
   */
  private notifyStateUpdate(executionId: string, state: ExecutionState): void {
    if (this.onStateUpdate) {
      this.onStateUpdate(executionId, state);
    }
  }
}

export default StateManager;