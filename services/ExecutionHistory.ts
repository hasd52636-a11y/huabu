/**
 * Execution History Service
 * Manages storage and retrieval of automation execution history
 * Provides statistics tracking and re-execution functionality
 */

export interface ExecutionRecord {
  id: string;
  templateId?: string;
  templateName: string;
  executionType: 'manual' | 'scheduled' | 'batch';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalBlocks: number;
  completedBlocks: number;
  failedBlocks: number;
  skippedBlocks: number;
  results: ExecutionBlockResult[];
  configuration: ExecutionConfiguration;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionBlockResult {
  blockId: string;
  blockNumber: string;
  blockType: 'text' | 'image' | 'video';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: string;
  output?: string;
  outputUrl?: string;
  error?: string;
  retryCount?: number;
}

export interface ExecutionConfiguration {
  templateId?: string;
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
}

export interface ExecutionStatistics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  averageDuration: number;
  totalBlocksProcessed: number;
  successRate: number;
  mostUsedTemplates: Array<{ templateName: string; count: number }>;
  executionsByType: Record<string, number>;
  executionsByDay: Array<{ date: string; count: number }>;
}

export interface HistoryFilter {
  templateId?: string;
  templateName?: string;
  executionType?: 'manual' | 'scheduled' | 'batch';
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  dateRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  offset?: number;
}

export class ExecutionHistory {
  private static readonly STORAGE_KEY = 'execution_history';
  private static readonly MAX_RECORDS = 1000; // Limit to prevent storage overflow
  private executionRecords: ExecutionRecord[] = [];
  private onHistoryUpdate?: (records: ExecutionRecord[]) => void;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Set history update callback
   */
  setHistoryUpdateCallback(callback: (records: ExecutionRecord[]) => void): void {
    this.onHistoryUpdate = callback;
  }

  /**
   * Start a new execution record
   */
  startExecution(
    templateName: string,
    executionType: 'manual' | 'scheduled' | 'batch',
    configuration: ExecutionConfiguration,
    totalBlocks: number,
    templateId?: string
  ): string {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const record: ExecutionRecord = {
      id: executionId,
      templateId,
      templateName,
      executionType,
      startTime: Date.now(),
      status: 'running',
      totalBlocks,
      completedBlocks: 0,
      failedBlocks: 0,
      skippedBlocks: 0,
      results: [],
      configuration,
      metadata: {}
    };

    this.executionRecords.unshift(record); // Add to beginning for chronological order
    this.trimRecords();
    this.saveToStorage();
    this.notifyUpdate();

    return executionId;
  }

  /**
   * Update execution progress
   */
  updateExecution(
    executionId: string,
    updates: Partial<Pick<ExecutionRecord, 'status' | 'completedBlocks' | 'failedBlocks' | 'skippedBlocks' | 'error' | 'metadata'>>
  ): void {
    const record = this.executionRecords.find(r => r.id === executionId);
    if (!record) return;

    Object.assign(record, updates);

    // Calculate duration if execution is complete
    if (updates.status && ['completed', 'failed', 'cancelled'].includes(updates.status)) {
      record.endTime = Date.now();
      record.duration = record.endTime - record.startTime;
    }

    this.saveToStorage();
    this.notifyUpdate();
  }

  /**
   * Add or update block result
   */
  updateBlockResult(executionId: string, blockResult: ExecutionBlockResult): void {
    const record = this.executionRecords.find(r => r.id === executionId);
    if (!record) return;

    const existingIndex = record.results.findIndex(r => r.blockId === blockResult.blockId);
    
    if (existingIndex >= 0) {
      // Update existing result
      record.results[existingIndex] = { ...record.results[existingIndex], ...blockResult };
    } else {
      // Add new result
      record.results.push(blockResult);
    }

    // Update block counters based on status
    this.recalculateBlockCounters(record);

    this.saveToStorage();
    this.notifyUpdate();
  }

  /**
   * Complete execution
   */
  completeExecution(executionId: string, status: 'completed' | 'failed' | 'cancelled', error?: string): void {
    const record = this.executionRecords.find(r => r.id === executionId);
    if (!record) return;

    record.status = status;
    record.endTime = Date.now();
    record.duration = record.endTime - record.startTime;
    
    if (error) {
      record.error = error;
    }

    // Final recalculation of block counters
    this.recalculateBlockCounters(record);

    this.saveToStorage();
    this.notifyUpdate();
  }

  /**
   * Get execution record by ID
   */
  getExecution(executionId: string): ExecutionRecord | undefined {
    return this.executionRecords.find(r => r.id === executionId);
  }

  /**
   * Get all execution records with optional filtering
   */
  getExecutions(filter?: HistoryFilter): ExecutionRecord[] {
    let filtered = [...this.executionRecords];

    if (filter) {
      if (filter.templateId) {
        filtered = filtered.filter(r => r.templateId === filter.templateId);
      }
      
      if (filter.templateName) {
        filtered = filtered.filter(r => r.templateName.toLowerCase().includes(filter.templateName!.toLowerCase()));
      }
      
      if (filter.executionType) {
        filtered = filtered.filter(r => r.executionType === filter.executionType);
      }
      
      if (filter.status) {
        filtered = filtered.filter(r => r.status === filter.status);
      }
      
      if (filter.dateRange) {
        filtered = filtered.filter(r => 
          r.startTime >= filter.dateRange!.start && 
          r.startTime <= filter.dateRange!.end
        );
      }

      // Apply pagination
      if (filter.offset) {
        filtered = filtered.slice(filter.offset);
      }
      
      if (filter.limit) {
        filtered = filtered.slice(0, filter.limit);
      }
    }

    return filtered;
  }

  /**
   * Get execution statistics
   */
  getStatistics(filter?: HistoryFilter): ExecutionStatistics {
    const records = filter ? this.getExecutions(filter) : this.executionRecords;
    
    const totalExecutions = records.length;
    const completedExecutions = records.filter(r => r.status === 'completed').length;
    const failedExecutions = records.filter(r => r.status === 'failed').length;
    const cancelledExecutions = records.filter(r => r.status === 'cancelled').length;
    
    const completedRecords = records.filter(r => r.status === 'completed' && r.duration);
    const averageDuration = completedRecords.length > 0 
      ? completedRecords.reduce((sum, r) => sum + (r.duration || 0), 0) / completedRecords.length
      : 0;
    
    const totalBlocksProcessed = records.reduce((sum, r) => sum + r.completedBlocks, 0);
    const successRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;
    
    // Most used templates
    const templateCounts = new Map<string, number>();
    records.forEach(r => {
      const count = templateCounts.get(r.templateName) || 0;
      templateCounts.set(r.templateName, count + 1);
    });
    
    const mostUsedTemplates = Array.from(templateCounts.entries())
      .map(([templateName, count]) => ({ templateName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Executions by type
    const executionsByType: Record<string, number> = {
      manual: 0,
      scheduled: 0,
      batch: 0
    };
    
    records.forEach(r => {
      executionsByType[r.executionType] = (executionsByType[r.executionType] || 0) + 1;
    });
    
    // Executions by day (last 30 days)
    const executionsByDay: Array<{ date: string; count: number }> = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const count = records.filter(r => 
        r.startTime >= dayStart.getTime() && r.startTime <= dayEnd.getTime()
      ).length;
      
      executionsByDay.push({ date: dateStr, count });
    }

    return {
      totalExecutions,
      completedExecutions,
      failedExecutions,
      cancelledExecutions,
      averageDuration,
      totalBlocksProcessed,
      successRate,
      mostUsedTemplates,
      executionsByType,
      executionsByDay
    };
  }

  /**
   * Delete execution record
   */
  deleteExecution(executionId: string): boolean {
    const index = this.executionRecords.findIndex(r => r.id === executionId);
    if (index === -1) return false;

    this.executionRecords.splice(index, 1);
    this.saveToStorage();
    this.notifyUpdate();
    return true;
  }

  /**
   * Clear all execution history
   */
  clearHistory(): void {
    this.executionRecords = [];
    this.saveToStorage();
    this.notifyUpdate();
  }

  /**
   * Clear old execution records (older than specified days)
   */
  clearOldRecords(daysToKeep: number = 30): number {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.executionRecords.length;
    
    this.executionRecords = this.executionRecords.filter(r => r.startTime >= cutoffTime);
    
    const removedCount = initialCount - this.executionRecords.length;
    
    if (removedCount > 0) {
      this.saveToStorage();
      this.notifyUpdate();
    }
    
    return removedCount;
  }

  /**
   * Export execution history as JSON
   */
  exportHistory(filter?: HistoryFilter): string {
    const records = filter ? this.getExecutions(filter) : this.executionRecords;
    const exportData = {
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      records
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import execution history from JSON
   */
  importHistory(jsonData: string, mergeMode: 'replace' | 'merge' = 'merge'): number {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.records || !Array.isArray(importData.records)) {
        throw new Error('Invalid import data format');
      }
      
      const importedRecords: ExecutionRecord[] = importData.records;
      
      // Validate imported records
      const validRecords = importedRecords.filter(record => 
        record.id && 
        record.templateName && 
        record.executionType && 
        typeof record.startTime === 'number'
      );
      
      if (mergeMode === 'replace') {
        this.executionRecords = validRecords;
      } else {
        // Merge mode - avoid duplicates by ID
        const existingIds = new Set(this.executionRecords.map(r => r.id));
        const newRecords = validRecords.filter(r => !existingIds.has(r.id));
        
        this.executionRecords = [...this.executionRecords, ...newRecords];
        this.executionRecords.sort((a, b) => b.startTime - a.startTime); // Sort by start time descending
      }
      
      this.trimRecords();
      this.saveToStorage();
      this.notifyUpdate();
      
      return validRecords.length;
    } catch (error) {
      throw new Error(`Failed to import history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get execution configuration for re-execution
   */
  getExecutionConfiguration(executionId: string): ExecutionConfiguration | undefined {
    const record = this.executionRecords.find(r => r.id === executionId);
    return record?.configuration;
  }

  /**
   * Create a copy of execution configuration for re-execution
   */
  cloneExecutionConfiguration(executionId: string): ExecutionConfiguration | undefined {
    const config = this.getExecutionConfiguration(executionId);
    if (!config) return undefined;

    // Deep clone the configuration
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Get recent executions for a template
   */
  getRecentExecutionsForTemplate(templateId: string, limit: number = 10): ExecutionRecord[] {
    return this.executionRecords
      .filter(r => r.templateId === templateId)
      .slice(0, limit);
  }

  /**
   * Get running executions
   */
  getRunningExecutions(): ExecutionRecord[] {
    return this.executionRecords.filter(r => r.status === 'running');
  }

  /**
   * Check if execution is running
   */
  isExecutionRunning(executionId: string): boolean {
    const record = this.executionRecords.find(r => r.id === executionId);
    return record?.status === 'running' || false;
  }

  /**
   * Recalculate block counters based on results
   */
  private recalculateBlockCounters(record: ExecutionRecord): void {
    record.completedBlocks = record.results.filter(r => r.status === 'completed').length;
    record.failedBlocks = record.results.filter(r => r.status === 'failed').length;
    record.skippedBlocks = record.results.filter(r => r.status === 'skipped').length;
  }

  /**
   * Trim records to maximum limit
   */
  private trimRecords(): void {
    if (this.executionRecords.length > ExecutionHistory.MAX_RECORDS) {
      this.executionRecords = this.executionRecords.slice(0, ExecutionHistory.MAX_RECORDS);
    }
  }

  /**
   * Load execution history from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(ExecutionHistory.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          this.executionRecords = data;
        }
      }
    } catch (error) {
      console.error('Failed to load execution history from storage:', error);
      this.executionRecords = [];
    }
  }

  /**
   * Save execution history to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(ExecutionHistory.STORAGE_KEY, JSON.stringify(this.executionRecords));
    } catch (error) {
      console.error('Failed to save execution history to storage:', error);
    }
  }

  /**
   * Notify history update
   */
  private notifyUpdate(): void {
    if (this.onHistoryUpdate) {
      this.onHistoryUpdate([...this.executionRecords]);
    }
  }
}

export default ExecutionHistory;