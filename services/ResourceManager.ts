import { ResourceUsage, ResourceLimits, ResourceAllocation, ExecutionPriority } from '../types';

export class ResourceManager {
  private currentUsage: ResourceUsage = {
    memory: 0,
    cpu: 0,
    activeConnections: 0
  };

  private limits: ResourceLimits = {
    maxMemory: 512, // MB
    maxCpu: 80, // percentage
    maxConnections: 10,
    maxConcurrentExecutions: 3,
    apiRateLimit: 60 // requests per minute
  };

  private allocations: Map<string, ResourceAllocation> = new Map();
  private executionQueue: Array<{
    id: string;
    priority: ExecutionPriority;
    resourceRequirement: Partial<ResourceUsage>;
    timestamp: number;
  }> = [];

  private apiRequestTimes: number[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(customLimits?: Partial<ResourceLimits>) {
    if (customLimits) {
      this.limits = { ...this.limits, ...customLimits };
    }
    this.startMonitoring();
  }

  /**
   * Request resource allocation for an execution
   */
  async requestResources(
    executionId: string,
    requirement: Partial<ResourceUsage>,
    priority: ExecutionPriority = 'normal'
  ): Promise<{ granted: boolean; allocation?: ResourceAllocation }> {
    // Validate resource requirements
    const requestedMemory = requirement.memory || 0;
    const requestedCpu = requirement.cpu || 0;
    const requestedConnections = requirement.activeConnections || 0;

    // Check if individual resource request exceeds limits
    if (requestedMemory > this.limits.maxMemory) {
      console.warn(`Requested memory (${requestedMemory}MB) exceeds limit (${this.limits.maxMemory}MB)`);
      return { granted: false };
    }

    if (requestedCpu > this.limits.maxCpu) {
      console.warn(`Requested CPU (${requestedCpu}%) exceeds limit (${this.limits.maxCpu}%)`);
      return { granted: false };
    }

    if (requestedConnections > this.limits.maxConnections) {
      console.warn(`Requested connections (${requestedConnections}) exceeds limit (${this.limits.maxConnections})`);
      return { granted: false };
    }

    // Check if resources are available
    const wouldExceedLimits = this.wouldExceedLimits(requirement);
    
    if (wouldExceedLimits) {
      // Queue the request regardless of priority
      this.executionQueue.push({
        id: executionId,
        priority,
        resourceRequirement: requirement,
        timestamp: Date.now()
      });
      
      // Sort queue by priority and timestamp
      this.sortExecutionQueue();
      
      return { granted: false };
    }

    // Allocate resources
    const allocation: ResourceAllocation = {
      executionId,
      allocatedResources: {
        memory: requestedMemory,
        cpu: requestedCpu,
        activeConnections: requestedConnections
      },
      priority,
      timestamp: Date.now()
    };

    this.allocations.set(executionId, allocation);
    this.updateCurrentUsage();

    // Verify allocation didn't exceed limits
    if (this.currentUsage.memory > this.limits.maxMemory ||
        this.currentUsage.cpu > this.limits.maxCpu ||
        this.currentUsage.activeConnections > this.limits.maxConnections) {
      // Rollback allocation
      this.allocations.delete(executionId);
      this.updateCurrentUsage();
      console.error('Resource allocation would exceed limits, rolled back');
      return { granted: false };
    }

    return { granted: true, allocation };
  }

  /**
   * Release resources for completed execution
   */
  releaseResources(executionId: string): void {
    const allocation = this.allocations.get(executionId);
    if (allocation) {
      this.allocations.delete(executionId);
      this.updateCurrentUsage();
      
      // Process queued executions
      this.processQueue();
    }
  }

  /**
   * Check if API rate limit allows new request
   */
  canMakeApiRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old requests
    this.apiRequestTimes = this.apiRequestTimes.filter(time => time > oneMinuteAgo);
    
    return this.apiRequestTimes.length < this.limits.apiRateLimit;
  }

  /**
   * Record API request for rate limiting
   */
  recordApiRequest(): void {
    this.apiRequestTimes.push(Date.now());
  }

  /**
   * Get time until next API request is allowed
   */
  getApiRateLimitDelay(): number {
    if (this.canMakeApiRequest()) {
      return 0;
    }

    const now = Date.now();
    const oldestRequest = Math.min(...this.apiRequestTimes);
    const timeUntilExpiry = (oldestRequest + 60000) - now;
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Get current resource usage
   */
  getCurrentUsage(): ResourceUsage {
    return { ...this.currentUsage };
  }

  /**
   * Get resource limits
   */
  getLimits(): ResourceLimits {
    return { ...this.limits };
  }

  /**
   * Update resource limits
   */
  updateLimits(newLimits: Partial<ResourceLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    
    // Re-evaluate current allocations
    this.processQueue();
  }

  /**
   * Get resource utilization percentage
   */
  getUtilization(): {
    memory: number;
    cpu: number;
    connections: number;
    executions: number;
  } {
    return {
      memory: (this.currentUsage.memory / this.limits.maxMemory) * 100,
      cpu: (this.currentUsage.cpu / this.limits.maxCpu) * 100,
      connections: (this.currentUsage.activeConnections / this.limits.maxConnections) * 100,
      executions: (this.allocations.size / this.limits.maxConcurrentExecutions) * 100
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    highPriorityCount: number;
    averageWaitTime: number;
  } {
    const now = Date.now();
    const highPriorityCount = this.executionQueue.filter(item => item.priority === 'high').length;
    const waitTimes = this.executionQueue.map(item => now - item.timestamp);
    const averageWaitTime = waitTimes.length > 0 ? 
      waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0;

    return {
      queueLength: this.executionQueue.length,
      highPriorityCount,
      averageWaitTime
    };
  }

  /**
   * Force resource allocation for high priority execution
   */
  forceAllocation(
    executionId: string,
    requirement: Partial<ResourceUsage>
  ): ResourceAllocation {
    // Find lowest priority allocation to potentially evict
    const allocationsArray = Array.from(this.allocations.values());
    const lowestPriority = allocationsArray
      .filter(alloc => alloc.priority === 'low')
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (lowestPriority && this.wouldExceedLimits(requirement)) {
      // Evict lowest priority allocation
      this.allocations.delete(lowestPriority.executionId);
      
      // Re-queue the evicted execution
      this.executionQueue.unshift({
        id: lowestPriority.executionId,
        priority: lowestPriority.priority,
        resourceRequirement: lowestPriority.allocatedResources,
        timestamp: Date.now()
      });
    }

    const allocation: ResourceAllocation = {
      executionId,
      allocatedResources: {
        memory: requirement.memory || 0,
        cpu: requirement.cpu || 0,
        activeConnections: requirement.activeConnections || 0
      },
      priority: 'high',
      timestamp: Date.now()
    };

    this.allocations.set(executionId, allocation);
    this.updateCurrentUsage();

    return allocation;
  }

  /**
   * Get resource recommendations based on current usage
   */
  getResourceRecommendations(): {
    shouldReduceConcurrency: boolean;
    shouldIncreaseDelay: boolean;
    recommendedDelay: number;
    shouldPauseNewExecutions: boolean;
  } {
    const utilization = this.getUtilization();
    
    // Thresholds based on design document
    const memoryThreshold = 80;
    const cpuThreshold = 80;
    const connectionThreshold = 90;
    
    return {
      shouldReduceConcurrency: utilization.cpu > 90 || utilization.memory > 90,
      shouldIncreaseDelay: utilization.connections > 80,
      recommendedDelay: utilization.connections > 80 ? 2000 : 1000,
      shouldPauseNewExecutions: 
        utilization.memory > memoryThreshold ||
        utilization.cpu > cpuThreshold ||
        utilization.connections > connectionThreshold
    };
  }

  /**
   * Clean up resources and stop monitoring
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Clear all allocations and reset usage
    this.allocations.clear();
    this.executionQueue = [];
    this.apiRequestTimes = [];
    this.currentUsage = {
      memory: 0,
      cpu: 0,
      activeConnections: 0
    };
  }

  private wouldExceedLimits(requirement: Partial<ResourceUsage>): boolean {
    const newUsage = {
      memory: this.currentUsage.memory + (requirement.memory || 0),
      cpu: this.currentUsage.cpu + (requirement.cpu || 0),
      activeConnections: this.currentUsage.activeConnections + (requirement.activeConnections || 0)
    };

    return (
      newUsage.memory > this.limits.maxMemory ||
      newUsage.cpu > this.limits.maxCpu ||
      newUsage.activeConnections > this.limits.maxConnections ||
      this.allocations.size >= this.limits.maxConcurrentExecutions
    );
  }

  private updateCurrentUsage(): void {
    this.currentUsage = {
      memory: 0,
      cpu: 0,
      activeConnections: 0
    };

    for (const allocation of this.allocations.values()) {
      this.currentUsage.memory += allocation.allocatedResources.memory;
      this.currentUsage.cpu += allocation.allocatedResources.cpu;
      this.currentUsage.activeConnections += allocation.allocatedResources.activeConnections;
    }
  }

  private sortExecutionQueue(): void {
    this.executionQueue.sort((a, b) => {
      // Priority order: high > normal > low
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // If same priority, sort by timestamp (FIFO)
      return a.timestamp - b.timestamp;
    });
  }

  private async processQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const nextExecution = this.executionQueue[0];
      
      if (this.wouldExceedLimits(nextExecution.resourceRequirement)) {
        break; // Can't process any more from queue
      }

      // Remove from queue and allocate
      this.executionQueue.shift();
      
      const allocation: ResourceAllocation = {
        executionId: nextExecution.id,
        allocatedResources: {
          memory: nextExecution.resourceRequirement.memory || 0,
          cpu: nextExecution.resourceRequirement.cpu || 0,
          activeConnections: nextExecution.resourceRequirement.activeConnections || 0
        },
        priority: nextExecution.priority,
        timestamp: Date.now()
      };

      this.allocations.set(nextExecution.id, allocation);
      this.updateCurrentUsage();

      // Notify that resources are now available (would be handled by event system)
      console.log(`Resources allocated for queued execution: ${nextExecution.id}`);
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const utilization = this.getUtilization();
      
      // Log high utilization warnings
      if (utilization.memory > 90) {
        console.warn(`High memory utilization: ${utilization.memory.toFixed(1)}%`);
      }
      
      if (utilization.cpu > 90) {
        console.warn(`High CPU utilization: ${utilization.cpu.toFixed(1)}%`);
      }
      
      // Auto-adjust if needed
      const recommendations = this.getResourceRecommendations();
      if (recommendations.shouldPauseNewExecutions) {
        console.warn('Resource manager recommends pausing new executions');
      }
    }, 5000); // Check every 5 seconds
  }
}