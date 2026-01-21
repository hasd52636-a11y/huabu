import { Block, BatchScript, BatchConfig, BatchGenerationState, ProviderSettings } from '../types';
import { 
  RateLimiter, 
  ResourceMonitor, 
  PerformanceMetrics, 
  ProcessingWorker, 
  CompletionTimePredictor,
  ProcessingHistoryEntry
} from './EnhancedBatchProcessorSupport';

/**
 * Enhanced Progress state with detailed tracking and analytics
 */
export interface ProgressState {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  isProcessing: boolean;
  isMinimized: boolean;
  // Enhanced progress tracking (Requirements 3.4, 4.4)
  currentItem?: string;
  estimatedTimeRemaining: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  errorRate: number;
  retryCount: number;
  queuePosition: number;
  processingStrategy: 'sequential' | 'parallel' | 'adaptive';
  resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
    activeConnections: number;
  };
}

/**
 * Enhanced batch processing strategies (Requirement 7.2)
 */
export type BatchProcessingStrategy = 'sequential' | 'parallel' | 'adaptive';

/**
 * Rate limiting configuration for API providers
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerSecond: number;
  concurrentRequests: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
}

/**
 * Enhanced batch configuration with parallel processing support
 */
export interface EnhancedBatchConfig extends BatchConfig {
  processingStrategy: BatchProcessingStrategy;
  rateLimits: Record<string, RateLimitConfig>;
  parallelWorkers: number;
  adaptiveThresholds: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    memoryThreshold: number;
  };
  progressReporting: {
    updateInterval: number;
    enableDetailedMetrics: boolean;
    enablePredictiveAnalytics: boolean;
  };
  errorRecovery: {
    enablePartialCompletion: boolean;
    maxRetryAttempts: number;
    retryDelayMs: number;
    enableGracefulDegradation: boolean;
  };
}

/**
 * Processing queue item with enhanced metadata
 */
export interface ProcessingQueueItem {
  id: string;
  taskId: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  processingTime?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  progress: number;
  estimatedCompletion?: number;
  resourceRequirements: {
    memoryMB: number;
    processingComplexity: 'low' | 'medium' | 'high';
    expectedDuration: number;
  };
  dependencies: string[];
  metadata: Record<string, any>;
}

/**
 * Input source for batch processing
 */
export interface BatchInputSource {
  type: 'blocks' | 'file';
  blocks?: Block[];
  filePrompts?: string[];
  selectedFrames?: Array<{ id: string; imageUrl?: string; prompt: string }>;
}

/**
 * Enhanced Batch Processor Service
 * 
 * Implements Requirements 3.4, 4.4, 7.2:
 * - Real-time progress updates and estimated completion times (3.4)
 * - Queue management and progress tracking for batch processing (4.4)  
 * - Parallel execution with rate limit respect and resource constraints (7.2)
 * 
 * Features:
 * - Multiple processing strategies (sequential, parallel, adaptive)
 * - Intelligent rate limiting and resource management
 * - Comprehensive progress tracking and analytics
 * - Error recovery and partial completion support
 * - Predictive completion time estimation
 * - Resource usage monitoring and optimization
 */
export class BatchProcessor {
  private processingState: BatchGenerationState | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private progressState: ProgressState = {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    isProcessing: false,
    isMinimized: false,
    estimatedTimeRemaining: 0,
    averageProcessingTime: 0,
    throughputPerMinute: 0,
    errorRate: 0,
    retryCount: 0,
    queuePosition: 0,
    processingStrategy: 'sequential',
    resourceUsage: {
      memoryMB: 0,
      cpuPercent: 0,
      activeConnections: 0
    }
  };
  
  // Enhanced processing infrastructure
  private processingQueue: ProcessingQueueItem[] = [];
  private activeWorkers: Map<string, ProcessingWorker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private performanceMetrics: PerformanceMetrics = new PerformanceMetrics();
  private resourceMonitor: ResourceMonitor = new ResourceMonitor();
  
  private onProgressUpdate?: (progress: ProgressState) => void;
  private currentConfig: EnhancedBatchConfig | null = null;
  
  // Processing history for analytics and prediction
  private processingHistory: ProcessingHistoryEntry[] = [];
  private completionTimePredictor: CompletionTimePredictor = new CompletionTimePredictor();

  /**
   * Set progress update callback
   */
  setProgressCallback(callback: (progress: ProgressState) => void): void {
    this.onProgressUpdate = callback;
  }

  /**
   * Get current progress state
   */
  getProgressState(): ProgressState {
    return { ...this.progressState };
  }

  /**
   * Set minimization state
   */
  setMinimized(isMinimized: boolean): void {
    this.progressState.isMinimized = isMinimized;
    this.notifyProgressUpdate();
  }

  /**
   * Get detailed processing analytics
   * Implements comprehensive progress tracking (Requirements 3.4, 4.4)
   */
  getProcessingAnalytics(): {
    currentProgress: ProgressState;
    performanceTrends: any;
    resourceUtilization: any;
    predictiveInsights: {
      estimatedCompletion: number;
      recommendedWorkerCount: number;
      bottleneckAnalysis: string[];
    };
  } {
    const trends = this.performanceMetrics.getRecentTrends();
    const resourceMetrics = this.resourceMonitor.getCurrentMetrics();
    
    return {
      currentProgress: this.progressState,
      performanceTrends: trends,
      resourceUtilization: resourceMetrics,
      predictiveInsights: {
        estimatedCompletion: this.progressState.estimatedTimeRemaining,
        recommendedWorkerCount: this.calculateOptimalWorkerCount(resourceMetrics, this.currentConfig!),
        bottleneckAnalysis: this.analyzeBottlenecks()
      }
    };
  }

  /**
   * Initialize rate limiters for different API providers
   */
  private initializeRateLimiters(rateLimits: Record<string, RateLimitConfig>): void {
    this.rateLimiters.clear();
    
    for (const [provider, config] of Object.entries(rateLimits)) {
      this.rateLimiters.set(provider, new RateLimiter(config));
    }
    
    // Add default rate limiter if not specified
    if (!this.rateLimiters.has('default')) {
      this.rateLimiters.set('default', new RateLimiter({
        requestsPerMinute: 60,
        requestsPerSecond: 2,
        concurrentRequests: 3,
        backoffMultiplier: 2,
        maxBackoffTime: 30000
      }));
    }
  }

  /**
   * Prepare processing queue from input source
   */
  private async prepareProcessingQueue(
    inputSource: BatchInputSource,
    config: EnhancedBatchConfig,
    videoPrompts?: Record<string, string>
  ): Promise<ProcessingQueueItem[]> {
    const queueItems: ProcessingQueueItem[] = [];
    
    if (inputSource.type === 'blocks') {
      if (!inputSource.blocks || inputSource.blocks.length === 0) {
        throw new Error('No blocks selected for batch processing');
      }
      
      const validBlocks = inputSource.blocks.filter(block => 
        block.content && block.content.trim().length > 0
      );
      
      for (const [index, block] of validBlocks.entries()) {
        const basePrompt = videoPrompts?.[block.id] || this.generateDefaultPrompt(block);
        const characterInfo = this.extractCharacterInfo(block);
        
        queueItems.push({
          id: block.id,
          taskId: `task_${block.id}_${Date.now()}`,
          prompt: basePrompt,
          status: 'pending',
          priority: this.calculateItemPriority(block, index),
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries: config.errorRecovery.maxRetryAttempts,
          progress: 0,
          resourceRequirements: {
            memoryMB: this.estimateMemoryRequirement(block),
            processingComplexity: this.estimateProcessingComplexity(block),
            expectedDuration: this.estimateProcessingDuration(block)
          },
          dependencies: this.extractDependencies(block),
          metadata: {
            blockType: block.type,
            characterId: characterInfo.characterId,
            characterUrl: characterInfo.characterUrl,
            characterTimestamps: characterInfo.characterTimestamps,
            aspectRatio: block.aspectRatio,
            duration: block.duration,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height
          }
        });
      }
    } else if (inputSource.type === 'file') {
      if (!inputSource.filePrompts || inputSource.filePrompts.length === 0) {
        throw new Error('No prompts found in uploaded file');
      }
      
      const validPrompts = inputSource.filePrompts.filter(prompt => 
        prompt && prompt.trim().length >= 5
      );
      
      for (const [index, prompt] of validPrompts.entries()) {
        queueItems.push({
          id: `file_prompt_${index}`,
          taskId: `task_file_${index}_${Date.now()}`,
          prompt: prompt.trim(),
          status: 'pending',
          priority: index,
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries: config.errorRecovery.maxRetryAttempts,
          progress: 0,
          resourceRequirements: {
            memoryMB: 50, // Default for text prompts
            processingComplexity: 'medium',
            expectedDuration: 30000 // 30 seconds default
          },
          dependencies: [],
          metadata: {
            blockType: 'text',
            sourceType: 'file',
            promptIndex: index
          }
        });
      }
    }
    
    // Sort by priority and dependencies
    return this.sortQueueByPriorityAndDependencies(queueItems);
  }

  /**
   * Initialize progress state for processing
   */
  private initializeProgressState(items: ProcessingQueueItem[], config: EnhancedBatchConfig): void {
    this.progressState = {
      total: items.length,
      completed: 0,
      failed: 0,
      pending: items.length,
      isProcessing: true,
      isMinimized: false,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      throughputPerMinute: 0,
      errorRate: 0,
      retryCount: 0,
      queuePosition: 0,
      processingStrategy: config.processingStrategy,
      resourceUsage: {
        memoryMB: 0,
        cpuPercent: 0,
        activeConnections: 0
      }
    };
    
    // Initial time estimate
    const totalEstimatedTime = items.reduce((sum, item) => 
      sum + item.resourceRequirements.expectedDuration, 0
    );
    
    this.progressState.estimatedTimeRemaining = config.processingStrategy === 'parallel' 
      ? totalEstimatedTime / Math.min(config.parallelWorkers, items.length)
      : totalEstimatedTime;
    
    this.notifyProgressUpdate();
  }

  // Helper methods for queue management and processing
  private hasUnprocessedItems(): boolean {
    return this.processingQueue.some(item => 
      item.status === 'pending' || item.status === 'retrying'
    );
  }

  private getNextQueueItem(): ProcessingQueueItem | null {
    return this.processingQueue.find(item => 
      item.status === 'pending' || item.status === 'retrying'
    ) || null;
  }

  private requeueItem(item: ProcessingQueueItem): void {
    // Move item to appropriate position based on priority
    const index = this.processingQueue.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.processingQueue.splice(index, 1);
      
      // Find insertion point based on priority
      let insertIndex = 0;
      for (let i = 0; i < this.processingQueue.length; i++) {
        if (this.processingQueue[i].priority > item.priority) {
          insertIndex = i;
          break;
        }
        insertIndex = i + 1;
      }
      
      this.processingQueue.splice(insertIndex, 0, item);
    }
  }

  private hasAvailableResources(item: ProcessingQueueItem, config: EnhancedBatchConfig): boolean {
    const currentMetrics = this.resourceMonitor.getCurrentMetrics();
    const thresholds = config.adaptiveThresholds;
    
    return (
      currentMetrics.memoryMB + item.resourceRequirements.memoryMB < thresholds.memoryThreshold &&
      currentMetrics.cpuPercent < thresholds.responseTimeThreshold &&
      this.activeWorkers.size < config.parallelWorkers
    );
  }

  private async waitForResources(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async waitForRateLimit(provider: string): Promise<void> {
    const rateLimiter = this.rateLimiters.get(provider) || this.rateLimiters.get('default')!;
    await rateLimiter.waitForRateLimit();
  }

  private notifyProgressUpdate(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.progressState);
    }
  }

  // Additional helper methods would be implemented here...
  private calculateItemPriority(block: any, index: number): number {
    // Higher priority for items with dependencies or special requirements
    let priority = index;
    
    if (block.characterId) priority -= 10; // Character items get higher priority
    if (block.type === 'video') priority -= 5; // Video items get higher priority
    
    return priority;
  }

  private estimateMemoryRequirement(block: any): number {
    switch (block.type) {
      case 'video': return 200;
      case 'image': return 100;
      case 'text': return 50;
      default: return 75;
    }
  }

  private estimateProcessingComplexity(block: any): 'low' | 'medium' | 'high' {
    if (block.characterId) return 'high';
    if (block.type === 'video') return 'high';
    if (block.type === 'image') return 'medium';
    return 'low';
  }

  private estimateProcessingDuration(block: any): number {
    const baseTime = 30000; // 30 seconds
    
    if (block.characterId) return baseTime * 2;
    if (block.type === 'video') return baseTime * 1.5;
    if (block.type === 'image') return baseTime * 1.2;
    
    return baseTime;
  }

  private extractDependencies(block: any): string[] {
    const dependencies: string[] = [];
    
    if (block.characterId) {
      dependencies.push(`character:${block.characterId}`);
    }
    
    return dependencies;
  }

  private sortQueueByPriorityAndDependencies(items: ProcessingQueueItem[]): ProcessingQueueItem[] {
    // Simple priority sort - in a real implementation, this would handle dependencies
    return items.sort((a, b) => a.priority - b.priority);
  }

  private calculateOptimalWorkerCount(metrics: any, config: EnhancedBatchConfig): number {
    const maxWorkers = config.parallelWorkers;
    
    // Reduce workers if system is under stress
    if (metrics.memoryMB > config.adaptiveThresholds.memoryThreshold * 0.8) {
      return Math.max(1, Math.floor(maxWorkers * 0.5));
    }
    
    if (metrics.cpuPercent > 80) {
      return Math.max(1, Math.floor(maxWorkers * 0.7));
    }
    
    return maxWorkers;
  }

  private analyzeBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const metrics = this.resourceMonitor.getCurrentMetrics();
    
    if (metrics.memoryMB > 500) {
      bottlenecks.push('High memory usage detected');
    }
    
    if (metrics.cpuPercent > 80) {
      bottlenecks.push('High CPU usage detected');
    }
    
    if (this.progressState.errorRate > 0.1) {
      bottlenecks.push('High error rate detected');
    }
    
    return bottlenecks;
  }

  // Import the supporting classes
  private RateLimiter = RateLimiter;
  private ResourceMonitor = ResourceMonitor;
  private PerformanceMetrics = PerformanceMetrics;
  private ProcessingWorker = ProcessingWorker;
  private CompletionTimePredictor = CompletionTimePredictor;

  /**
   * Enhanced batch processing with multiple strategies
   * Implements Requirements 3.4, 4.4, 7.2
   */
  async startEnhancedBatchProcessing(
    inputSource: BatchInputSource,
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings,
    videoPrompts?: Record<string, string>
  ): Promise<void> {
    this.currentConfig = config;
    
    // Initialize rate limiters for different providers
    this.initializeRateLimiters(config.rateLimits);
    
    // Start resource monitoring
    this.resourceMonitor.startMonitoring();
    
    // Prepare processing queue
    const queueItems = await this.prepareProcessingQueue(inputSource, config, videoPrompts);
    
    if (queueItems.length === 0) {
      throw new Error('No valid items to process');
    }
    
    // Initialize processing state
    this.processingQueue = queueItems;
    this.initializeProgressState(queueItems, config);
    
    // Start processing based on strategy
    switch (config.processingStrategy) {
      case 'sequential':
        await this.processSequentially(config, videoSettings);
        break;
      case 'parallel':
        await this.processInParallel(config, videoSettings);
        break;
      case 'adaptive':
        await this.processAdaptively(config, videoSettings);
        break;
      default:
        throw new Error(`Unknown processing strategy: ${config.processingStrategy}`);
    }
  }

  /**
   * Sequential processing strategy
   * Processes items one at a time with full resource allocation
   */
  private async processSequentially(
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings
  ): Promise<void> {
    console.log('[BatchProcessor] Starting sequential processing');
    
    for (const item of this.processingQueue) {
      if (item.status === 'pending') {
        await this.processQueueItem(item, config, videoSettings);
        
        // Update progress and analytics
        this.updateProgressMetrics();
        
        // Respect rate limits between items
        await this.waitForRateLimit(videoSettings.provider || 'default');
      }
    }
    
    this.completeProcessing();
  }

  /**
   * Parallel processing strategy  
   * Processes multiple items simultaneously with resource management
   * Implements Requirement 7.2
   */
  private async processInParallel(
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings
  ): Promise<void> {
    console.log('[BatchProcessor] Starting parallel processing with', config.parallelWorkers, 'workers');
    
    // Create worker pool
    const workers: Promise<void>[] = [];
    const workerCount = Math.min(config.parallelWorkers, this.processingQueue.length);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = this.createProcessingWorker(i, config, videoSettings);
      workers.push(worker);
    }
    
    // Wait for all workers to complete
    await Promise.all(workers);
    this.completeProcessing();
  }

  /**
   * Adaptive processing strategy
   * Dynamically adjusts between sequential and parallel based on system performance
   * Implements Requirements 3.4, 7.2
   */
  private async processAdaptively(
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings
  ): Promise<void> {
    console.log('[BatchProcessor] Starting adaptive processing');
    
    let currentStrategy: 'sequential' | 'parallel' = 'sequential';
    let workerCount = 1;
    
    while (this.hasUnprocessedItems()) {
      // Monitor system performance
      const metrics = this.resourceMonitor.getCurrentMetrics();
      const errorRate = this.calculateCurrentErrorRate();
      
      // Adapt strategy based on performance
      const shouldUseParallel = this.shouldSwitchToParallel(metrics, errorRate, config);
      
      if (shouldUseParallel && currentStrategy === 'sequential') {
        console.log('[BatchProcessor] Switching to parallel processing');
        currentStrategy = 'parallel';
        workerCount = this.calculateOptimalWorkerCount(metrics, config);
      } else if (!shouldUseParallel && currentStrategy === 'parallel') {
        console.log('[BatchProcessor] Switching to sequential processing');
        currentStrategy = 'sequential';
        workerCount = 1;
      }
      
      // Process batch with current strategy
      if (currentStrategy === 'parallel') {
        await this.processParallelBatch(workerCount, config, videoSettings);
      } else {
        await this.processSequentialBatch(config, videoSettings);
      }
      
      // Update progress and predictions
      this.updateProgressMetrics();
      this.updateCompletionTimeEstimate();
    }
    
    this.completeProcessing();
  }

  /**
   * Create a processing worker for parallel execution
   */
  private async createProcessingWorker(
    workerId: number,
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings
  ): Promise<void> {
    const worker = new ProcessingWorker(workerId, this.rateLimiters, this.resourceMonitor);
    this.activeWorkers.set(`worker-${workerId}`, worker);
    
    try {
      while (this.hasUnprocessedItems()) {
        const item = this.getNextQueueItem();
        if (!item) break;
        
        // Check resource availability before processing
        if (!this.hasAvailableResources(item, config)) {
          // Put item back in queue and wait
          this.requeueItem(item);
          await this.waitForResources(1000);
          continue;
        }
        
        await this.processQueueItem(item, config, videoSettings);
        this.updateProgressMetrics();
      }
    } catch (error) {
      console.error(`[BatchProcessor] Worker ${workerId} error:`, error);
    } finally {
      this.activeWorkers.delete(`worker-${workerId}`);
    }
  }

  /**
   * Process a single queue item with comprehensive error handling
   * Implements Requirements 3.4, 4.4
   */
  private async processQueueItem(
    item: ProcessingQueueItem,
    config: EnhancedBatchConfig,
    videoSettings: ProviderSettings
  ): Promise<void> {
    item.status = 'processing';
    item.startedAt = Date.now();
    
    // Update current item in progress state
    this.progressState.currentItem = item.id;
    this.notifyProgressUpdate();
    
    try {
      // Wait for rate limit compliance
      await this.waitForRateLimit(videoSettings.provider || 'default');
      
      // Validate character compatibility if applicable
      if (item.metadata.characterId) {
        const isCompatible = await this.validateCharacterForProcessing(item);
        if (!isCompatible) {
          throw new Error(`Character ${item.metadata.characterId} is not compatible with processing parameters`);
        }
      }
      
      // Prepare processing parameters
      const processingParams = this.prepareProcessingParameters(item, videoSettings);
      
      // Execute processing with timeout and progress tracking
      const result = await this.executeProcessingWithTimeout(
        item,
        processingParams,
        config.progressReporting.updateInterval
      );
      
      // Handle successful completion
      item.status = 'completed';
      item.completedAt = Date.now();
      item.processingTime = item.completedAt - (item.startedAt || item.createdAt);
      item.progress = 100;
      
      // Update processing history for analytics
      this.addToProcessingHistory(item, true);
      
      // Update character usage statistics if applicable
      if (item.metadata.characterId) {
        await this.updateCharacterUsageStats(
          item.metadata.characterId,
          true,
          item.processingTime,
          'batch_processing'
        );
      }
      
    } catch (error) {
      await this.handleProcessingError(item, error, config);
    }
  }

  /**
   * Handle processing errors with retry logic and partial completion support
   * Implements error recovery from Requirements 7.2
   */
  private async handleProcessingError(
    item: ProcessingQueueItem,
    error: any,
    config: EnhancedBatchConfig
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    item.error = errorMessage;
    
    console.error(`[BatchProcessor] Processing error for item ${item.id}:`, errorMessage);
    
    // Update character usage statistics for failed processing
    if (item.metadata.characterId) {
      await this.updateCharacterUsageStats(
        item.metadata.characterId,
        false,
        Date.now() - (item.startedAt || item.createdAt),
        'batch_processing'
      );
    }
    
    // Determine if retry is appropriate
    if (item.retryCount < item.maxRetries && this.shouldRetryItem(item, error, config)) {
      item.status = 'retrying';
      item.retryCount++;
      this.progressState.retryCount++;
      
      // Calculate backoff delay
      const backoffDelay = this.calculateBackoffDelay(item.retryCount, config);
      
      console.log(`[BatchProcessor] Retrying item ${item.id} (attempt ${item.retryCount}/${item.maxRetries}) after ${backoffDelay}ms`);
      
      // Schedule retry
      setTimeout(() => {
        item.status = 'pending';
        this.requeueItem(item);
      }, backoffDelay);
      
    } else {
      // Mark as permanently failed
      item.status = 'failed';
      this.addToProcessingHistory(item, false);
      
      // Handle partial completion if enabled
      if (config.errorRecovery.enablePartialCompletion) {
        await this.handlePartialCompletion(item, config);
      }
    }
  }

  /**
   * Update progress metrics and analytics
   * Implements real-time progress updates (Requirement 3.4)
   */
  private updateProgressMetrics(): void {
    const completed = this.processingQueue.filter(item => item.status === 'completed').length;
    const failed = this.processingQueue.filter(item => item.status === 'failed').length;
    const pending = this.processingQueue.filter(item => 
      item.status === 'pending' || item.status === 'retrying'
    ).length;
    const processing = this.processingQueue.filter(item => item.status === 'processing').length;
    
    // Update basic counts
    this.progressState.completed = completed;
    this.progressState.failed = failed;
    this.progressState.pending = pending;
    
    // Calculate advanced metrics
    this.progressState.errorRate = this.progressState.total > 0 
      ? failed / this.progressState.total 
      : 0;
    
    // Calculate throughput
    const completedInLastMinute = this.getCompletedInTimeWindow(60000);
    this.progressState.throughputPerMinute = completedInLastMinute;
    
    // Update average processing time
    const completedItems = this.processingQueue.filter(item => 
      item.status === 'completed' && item.processingTime
    );
    
    if (completedItems.length > 0) {
      const totalTime = completedItems.reduce((sum, item) => sum + (item.processingTime || 0), 0);
      this.progressState.averageProcessingTime = totalTime / completedItems.length;
    }
    
    // Update estimated time remaining
    this.updateCompletionTimeEstimate();
    
    // Update resource usage
    this.progressState.resourceUsage = this.resourceMonitor.getCurrentMetrics();
    
    this.notifyProgressUpdate();
  }

  /**
   * Update completion time estimate using predictive analytics
   * Implements estimated completion times (Requirement 3.4)
   */
  private updateCompletionTimeEstimate(): void {
    const remainingItems = this.processingQueue.filter(item => 
      item.status === 'pending' || item.status === 'retrying' || item.status === 'processing'
    );
    
    if (remainingItems.length === 0) {
      this.progressState.estimatedTimeRemaining = 0;
      return;
    }
    
    // Use completion time predictor for accurate estimates
    const estimate = this.completionTimePredictor.predictCompletionTime(
      remainingItems,
      this.progressState.averageProcessingTime,
      this.progressState.throughputPerMinute,
      this.activeWorkers.size
    );
    
    this.progressState.estimatedTimeRemaining = estimate;
  }

  /**
   * Extract character information from a block
   */
  private extractCharacterInfo(block: any): {
    characterId?: string;
    characterUrl?: string;
    characterTimestamps?: string;
  } {
    return {
      characterId: block.characterId,
      characterUrl: block.characterUrl,
      characterTimestamps: block.characterTimestamps
    };
  }

  /**
   * Apply character parameters to video generation request
   */
  private applyCharacterParameters(
    baseParams: any,
    characterInfo: {
      characterId?: string;
      characterUrl?: string;
      characterTimestamps?: string;
    }
  ): any {
    const params = { ...baseParams };
    
    // Add character parameters if available
    if (characterInfo.characterId && characterInfo.characterUrl) {
      params.character_id = characterInfo.characterId;
      params.character_url = characterInfo.characterUrl;
      
      if (characterInfo.characterTimestamps) {
        params.character_timestamps = characterInfo.characterTimestamps;
      }
      
      console.log('[BatchProcessor] Applied character parameters:', {
        character_id: params.character_id,
        character_url: params.character_url,
        character_timestamps: params.character_timestamps
      });
    }
    
    return params;
  }

  /**
   * Default global video prompt for reference consistency
   */
  private static readonly DEFAULT_GLOBAL_PROMPT = '全局指令：参考锁定视频中出现的所有角色或产品，必须严格以提供的参考图中的主体为唯一视觉来源，确保身份、外形、比例、服饰、材质及风格完全一致。不得对参考主体进行任何形式的重新设计、替换、风格化、美化或修改。人物面部、身形、服装、纹理、标识、颜色及轮廓需与参考图完全一致。若提示词与参考图存在冲突，参考图优先级始终高于提示词。';

  /**
   * Start batch processing with enhanced input support
   */
  async startBatchProcessingEnhanced(
    inputSource: BatchInputSource,
    config: BatchConfig,
    videoSettings: ProviderSettings,
    videoPrompts?: Record<string, string>
  ): Promise<void> {
    this.currentConfig = config;
    
    let videoItems: any[] = [];

    if (inputSource.type === 'blocks') {
      if (!inputSource.blocks || inputSource.blocks.length === 0) {
        throw new Error('No blocks selected for batch processing');
      }
      
      // Filter out blocks with empty or whitespace-only content
      const validBlocks = inputSource.blocks.filter(block => 
        block.content && block.content.trim().length > 0
      );
      
      if (validBlocks.length === 0) {
        throw new Error('No valid blocks with content found');
      }
      
      // Get all reference images from selected frames
      const referenceImages = inputSource.selectedFrames?.filter(frame => frame.imageUrl)?.map(frame => frame.imageUrl) || [];
      
      // Create video items from blocks
      videoItems = validBlocks.map(block => {
        const basePrompt = videoPrompts?.[block.id] || this.generateDefaultPrompt(block);
        const enhancedPrompt = this.applyGlobalPrompt(basePrompt, referenceImages);
        
        // Extract character information from block
        const characterInfo = this.extractCharacterInfo(block);
        
        return {
            id: block.id,
            taskId: `task_${block.id}_${Date.now()}`,
            prompt: enhancedPrompt,
            videoPrompt: enhancedPrompt,
            status: 'pending' as const,
            progress: 0,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height,
            createdAt: Date.now(),
            retryCount: 0,
            maxRetries: config.maxRetries || 3,
            referenceImage: referenceImages.length > 0 ? referenceImages : undefined,
            // Character parameters
            characterId: characterInfo.characterId,
            characterUrl: characterInfo.characterUrl,
            characterTimestamps: characterInfo.characterTimestamps,
            // Video parameters
            aspectRatio: block.aspectRatio,
            duration: block.duration
          };
      });
    } else if (inputSource.type === 'file') {
      if (!inputSource.filePrompts || inputSource.filePrompts.length === 0) {
        throw new Error('No prompts found in uploaded file');
      }

      // Filter out empty or whitespace-only prompts
      const validPrompts = inputSource.filePrompts.filter(prompt => 
        prompt && prompt.trim().length >= 5 // Minimum 5 characters for a valid prompt
      );
      
      if (validPrompts.length === 0) {
        throw new Error('No valid prompts found in file');
      }

      // Get all reference images from selected frames
      const referenceImages = inputSource.selectedFrames?.filter(frame => frame.imageUrl)?.map(frame => frame.imageUrl) || [];

      // Create video items from file prompts
      videoItems = validPrompts.map((prompt, index) => {
        const enhancedPrompt = this.applyGlobalPrompt(prompt.trim(), referenceImages);
        
        return {
            id: `file_prompt_${index}`,
            taskId: `task_file_${index}_${Date.now()}`,
            prompt: enhancedPrompt,
            videoPrompt: enhancedPrompt,
            status: 'pending' as const,
            progress: 0,
            createdAt: Date.now(),
            retryCount: 0,
            maxRetries: config.maxRetries || 3,
            referenceImage: referenceImages.length > 0 ? referenceImages : undefined
          };
      });
    }

    if (videoItems.length === 0) {
      throw new Error('No valid items to process');
    }

    this.processingState = {
      id: `batch_${Date.now()}`,
      items: videoItems,
      total: videoItems.length,
      completed: 0,
      failed: 0,
      pending: videoItems.length,
      status: 'processing',
      startedAt: Date.now()
    };

    // Update progress state
    this.progressState = {
      total: videoItems.length,
      completed: 0,
      failed: 0,
      pending: videoItems.length,
      isProcessing: true,
      isMinimized: false
    };

    this.notifyProgressUpdate();

    // Start processing interval
    this.startProcessingInterval(config, videoSettings);
  }

  /**
   * Apply global prompt to enhance video generation consistency
   */
  private applyGlobalPrompt(basePrompt: string, referenceImages?: string[]): string {
    if (!referenceImages || referenceImages.length === 0) {
      return basePrompt;
    }
    
    // Prepend global prompt when reference images are available
    return `${BatchProcessor.DEFAULT_GLOBAL_PROMPT}\n\n${basePrompt}`;
  }

  /**
   * Start batch processing with video prompts (legacy method for backward compatibility)
   */
  async startBatchProcessing(
    blocks: Block[],
    config: BatchConfig,
    videoSettings: ProviderSettings,
    videoPrompts?: Record<string, string>
  ): Promise<void> {
    const inputSource: BatchInputSource = {
      type: 'blocks',
      blocks: blocks
    };
    
    return this.startBatchProcessingEnhanced(inputSource, config, videoSettings, videoPrompts);
  }

  /**
   * Generate default prompt based on block content
   */
  private generateDefaultPrompt(block: Block): string {
    switch (block.type) {
      case 'text':
        return `基于文本内容生成视频：${block.content.substring(0, 100)}...`;
      case 'image':
        return '基于图像内容生成视频，保持视觉风格一致';
      case 'video':
        return '优化和增强现有视频内容';
      default:
        return '生成视频内容';
    }
  }

  /**
   * Start processing interval
   */
  private startProcessingInterval(config: BatchConfig, videoSettings: ProviderSettings): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNextItem(config, videoSettings);
    }, config.processingInterval || 3000);
  }

  /**
   * Process next pending item with enhanced character support
   */
  private async processNextItem(config: BatchConfig, videoSettings: ProviderSettings): Promise<void> {
    if (!this.processingState) return;

    const nextItem = this.processingState.items.find(item => item.status === 'pending');
    if (!nextItem) {
      // All items processed
      this.completeProcessing();
      return;
    }

    // Update item status to processing
    nextItem.status = 'generating';
    nextItem.progress = 10;
    this.updateStats();

    try {
      // Validate character compatibility before processing
      if (nextItem.characterId) {
        const isCompatible = await this.validateCharacterForProcessing(nextItem);
        if (!isCompatible) {
          throw new Error(`Character ${nextItem.characterId} is not compatible with video parameters`);
        }
      }

      // Apply default global video prompt if configured
      const enhancedPrompt = nextItem.prompt;
      nextItem.prompt = enhancedPrompt;
      
      // Prepare video generation parameters with character support
      const videoParams = {
        prompt: enhancedPrompt,
        aspectRatio: nextItem.aspectRatio || '16:9',
        duration: nextItem.duration || '10',
        referenceImages: nextItem.referenceImage
      };
      
      // Apply character parameters if available
      const characterInfo = {
        characterId: nextItem.characterId,
        characterUrl: nextItem.characterUrl,
        characterTimestamps: nextItem.characterTimestamps
      };
      
      const finalParams = this.applyCharacterParameters(videoParams, characterInfo);
      
      // Add character-specific logging
      if (characterInfo.characterId) {
        console.log('[BatchProcessor] Processing with character:', {
          itemId: nextItem.id,
          characterId: characterInfo.characterId,
          characterUrl: characterInfo.characterUrl,
          timestamps: characterInfo.characterTimestamps
        });
      }
      
      // Simulate video generation with character support and retry logic
      await this.processVideoGenerationWithRetry(nextItem, config, finalParams);
      
      nextItem.status = 'completed';
      nextItem.progress = 100;
      nextItem.completedAt = Date.now();
      nextItem.videoUrl = `https://example.com/video/${nextItem.taskId}.mp4`;
      
      // Update character usage statistics if character was used
      if (characterInfo.characterId) {
        await this.updateCharacterUsageStats(
          characterInfo.characterId,
          true, // success
          Date.now() - nextItem.createdAt,
          'batch_video'
        );
      }
      
      this.processingState.completed++;
      this.processingState.pending--;
      this.progressState.completed++;
      this.progressState.pending--;
    } catch (error) {
      // Enhanced error handling with character-specific logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      nextItem.status = 'failed';
      nextItem.error = errorMessage;
      nextItem.errorMessage = errorMessage;
      
      // Log character-specific errors
      if (nextItem.characterId) {
        console.error('[BatchProcessor] Character processing failed:', {
          itemId: nextItem.id,
          characterId: nextItem.characterId,
          error: errorMessage
        });
        
        await this.updateCharacterUsageStats(
          nextItem.characterId,
          false, // failed
          Date.now() - nextItem.createdAt,
          'batch_video'
        );
      }
      
      this.processingState.failed++;
      this.processingState.pending--;
      this.progressState.failed++;
      this.progressState.pending--;
    }

    this.updateStats();
    this.notifyProgressUpdate();
  }

  /**
   * Validate character compatibility for processing
   */
  private async validateCharacterForProcessing(item: any): Promise<boolean> {
    try {
      if (!item.characterId) return true;
      
      const { characterService } = await import('./CharacterService');
      const character = characterService.getCharacterById(item.characterId);
      
      if (!character) {
        console.warn('[BatchProcessor] Character not found:', item.characterId);
        return false;
      }
      
      // Validate character compatibility with video parameters
      const videoOptions = {
        duration: item.duration,
        aspectRatio: item.aspectRatio
      };
      
      return characterService.validateCharacterCompatibility(character, videoOptions);
    } catch (error) {
      console.error('[BatchProcessor] Character validation error:', error);
      return false;
    }
  }

  /**
   * Process video generation with retry logic
   */
  private async processVideoGenerationWithRetry(
    item: any, 
    config: BatchConfig, 
    params: any
  ): Promise<void> {
    const maxRetries = config.maxRetries || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.simulateVideoGeneration(item, config, params);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Log retry attempt
        if (attempt < maxRetries) {
          console.warn(`[BatchProcessor] Attempt ${attempt + 1} failed for item ${item.id}, retrying...`, {
            error: lastError.message,
            characterId: item.characterId
          });
          
          // Wait before retry (exponential backoff)
          const retryDelay = (config.retryDelay || 5000) * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Video generation failed after all retries');
  }

  /**
   * Update character usage statistics with error handling
   */
  private async updateCharacterUsageStats(
    characterId: string,
    success: boolean,
    generationTime: number,
    videoType: string
  ): Promise<void> {
    try {
      const { characterService } = await import('./CharacterService');
      characterService.updateCharacterUsage(characterId, success, generationTime, videoType);
    } catch (error) {
      console.warn('[BatchProcessor] Failed to update character usage stats:', error);
      // Don't throw error here as it's not critical for batch processing
    }
  }

  /**
   * Simulate video generation (replace with actual API integration)
   */
  private async simulateVideoGeneration(item: any, config: BatchConfig, params?: any): Promise<void> {
    // Log character parameters if present
    if (params?.character_id) {
      console.log('[BatchProcessor] Generating video with character:', {
        character_id: params.character_id,
        character_url: params.character_url,
        character_timestamps: params.character_timestamps,
        aspectRatio: params.aspectRatio,
        duration: params.duration
      });
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Simulated generation failure');
    }
    
    // Simulate character-specific errors (rare)
    if (params?.character_id && Math.random() < 0.05) {
      throw new Error('Character processing failed - invalid timestamps or character not found');
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(): void {
    if (!this.processingState) return;
    
    // Stats are already updated in processNextItem
    // This method can be used for additional stat calculations if needed
  }

  /**
   * Complete processing
   */
  private completeProcessing(): void {
    if (!this.processingState) return;

    this.processingState.status = 'completed';
    this.processingState.completedAt = Date.now();
    this.progressState.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.notifyProgressUpdate();
    
    // Save final state to localStorage
    this.saveProcessingState();
  }

  /**
   * Save processing state to localStorage
   */
  private saveProcessingState(): void {
    if (!this.processingState || !this.currentConfig) return;
    
    try {
      const stateToSave = {
        processingState: this.processingState,
        progressState: this.progressState,
        config: this.currentConfig,
        timestamp: Date.now()
      };
      
      localStorage.setItem('batch_processing_enhanced_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save processing state:', error);
    }
  }

  /**
   * Load processing state from localStorage
   */
  loadProcessingState(): boolean {
    try {
      const saved = localStorage.getItem('batch_processing_enhanced_state');
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      
      // Check if state is recent (within 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem('batch_processing_enhanced_state');
        return false;
      }
      
      this.processingState = state.processingState;
      this.progressState = state.progressState;
      this.currentConfig = state.config;
      
      return true;
    } catch (error) {
      console.error('Failed to load processing state:', error);
      return false;
    }
  }

  /**
   * Clear saved processing state
   */
  clearSavedState(): void {
    try {
      localStorage.removeItem('batch_processing_enhanced_state');
    } catch (error) {
      console.error('Failed to clear saved state:', error);
    }
  }

  /**
   * Pause processing
   */
  pauseProcessing(): void {
    if (!this.processingState) return;
    
    this.processingState.status = 'paused';
    this.progressState.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.notifyProgressUpdate();
    this.saveProcessingState();
  }

  /**
   * Resume processing
   */
  resumeProcessing(): void {
    if (!this.processingState || this.processingState.status !== 'paused') return;
    
    this.processingState.status = 'processing';
    this.progressState.isProcessing = true;
    
    // Use saved config or default config
    const config = this.currentConfig || {
      videoDuration: 10,
      processingInterval: 3000,
      videoOrientation: 'landscape' as const,
      maxRetries: 3,
      retryDelay: 5000,
      enableNotifications: true
    };
    
    const defaultSettings: ProviderSettings = {
      provider: 'shenma',
      modelId: 'sora_video2'
    };
    
    this.startProcessingInterval(config, defaultSettings);
    this.notifyProgressUpdate();
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.progressState.isProcessing = false;
    this.processingState = null;
    this.notifyProgressUpdate();
    this.clearSavedState();
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): BatchGenerationState | undefined {
    return this.processingState || undefined;
  }

  /**
   * Update script status (legacy method for compatibility)
   */
  static updateScriptStatus(
    scripts: BatchScript[],
    scriptId: string,
    status: BatchScript['status'],
    progress: number,
    videoUrl?: string,
    error?: string
  ): BatchScript[] {
    return scripts.map(script =>
      script.id === scriptId
        ? {
            ...script,
            status,
            progress,
            videoUrl: videoUrl || script.videoUrl,
            error: error || script.error
          }
        : script
    );
  }

  /**
   * Get next pending script (legacy method for compatibility)
   */
  static getNextPendingScript(scripts: BatchScript[]): BatchScript | undefined {
    return scripts.find(s => s.status === 'pending');
  }

  /**
   * Calculate batch statistics (legacy method for compatibility)
   */
  static calculateStats(scripts: BatchScript[]) {
    return {
      total: scripts.length,
      completed: scripts.filter(s => s.status === 'completed').length,
      failed: scripts.filter(s => s.status === 'failed').length,
      processing: scripts.filter(s => s.status === 'processing').length,
      pending: scripts.filter(s => s.status === 'pending').length
    };
  }

  /**
   * Save batch state to localStorage (legacy method for compatibility)
   */
  static saveBatchState(state: any): void {
    try {
      localStorage.setItem('batch_processing_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save batch state:', error);
    }
  }

  /**
   * Load batch state from localStorage (legacy method for compatibility)
   */
  static loadBatchState(): any {
    try {
      const saved = localStorage.getItem('batch_processing_state');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load batch state:', error);
      return null;
    }
  }

  /**
   * Format error message (legacy method for compatibility)
   */
  static formatErrorMessage(error: string, lang: string): string {
    if (lang === 'zh') {
      if (error.includes('timeout')) return '超时错误';
      if (error.includes('network')) return '网络错误';
      if (error.includes('api')) return 'API 错误';
      return `错误: ${error}`;
    } else {
      if (error.includes('timeout')) return 'Timeout error';
      if (error.includes('network')) return 'Network error';
      if (error.includes('api')) return 'API error';
      return `Error: ${error}`;
    }
  }

  /**
   * Check if should retry (legacy method for compatibility)
   */
  static shouldRetry(script: BatchScript, config: BatchConfig): boolean {
    const retryCount = (script as any).retryCount || 0;
    return retryCount < (config.maxRetries || 3);
  }

  /**
   * Reset script for retry (legacy method for compatibility)
   */
  static resetScriptForRetry(scripts: BatchScript[], scriptId: string): BatchScript[] {
    return scripts.map(script =>
      script.id === scriptId
        ? {
            ...script,
            status: 'pending',
            progress: 0,
            error: undefined,
            retryCount: ((script as any).retryCount || 0) + 1
          }
        : script
    );
  }
}

export default BatchProcessor;