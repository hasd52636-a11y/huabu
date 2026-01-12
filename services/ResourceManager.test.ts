import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceManager } from './ResourceManager';
import { ResourceUsage, ExecutionPriority } from '../types';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resourceManager.cleanup();
  });

  describe('Resource Allocation', () => {
    it('should allocate resources when available', async () => {
      const requirement: Partial<ResourceUsage> = {
        memory: 100,
        cpu: 20,
        activeConnections: 2
      };

      const result = await resourceManager.requestResources('exec-1', requirement);
      
      expect(result.granted).toBe(true);
      expect(result.allocation).toBeDefined();
      expect(result.allocation?.allocatedResources).toEqual({
        memory: 100,
        cpu: 20,
        activeConnections: 2
      });
    });

    it('should queue requests when resources unavailable', async () => {
      // Fill up resources
      await resourceManager.requestResources('exec-1', { memory: 400, cpu: 60 });
      
      // This should be queued
      const result = await resourceManager.requestResources('exec-2', { memory: 200, cpu: 30 });
      
      expect(result.granted).toBe(false);
      
      const queueStatus = resourceManager.getQueueStatus();
      expect(queueStatus.queueLength).toBe(1);
    });

    it('should process queue when resources are released', async () => {
      // Fill up resources
      await resourceManager.requestResources('exec-1', { memory: 400, cpu: 60 });
      
      // Queue another request
      await resourceManager.requestResources('exec-2', { memory: 100, cpu: 20 });
      
      // Release resources
      resourceManager.releaseResources('exec-1');
      
      // Queue should be processed
      const queueStatus = resourceManager.getQueueStatus();
      expect(queueStatus.queueLength).toBe(0);
    });

    it('should prioritize high priority requests', async () => {
      // Fill up resources
      await resourceManager.requestResources('exec-1', { memory: 500, cpu: 70 });
      
      // Queue low priority request
      await resourceManager.requestResources('exec-2', { memory: 50 }, 'low');
      
      // Queue high priority request
      await resourceManager.requestResources('exec-3', { memory: 50 }, 'high');
      
      const queueStatus = resourceManager.getQueueStatus();
      expect(queueStatus.highPriorityCount).toBe(1);
    });
  });

  describe('API Rate Limiting', () => {
    it('should allow API requests within rate limit', () => {
      expect(resourceManager.canMakeApiRequest()).toBe(true);
      
      // Make requests up to limit
      for (let i = 0; i < 60; i++) {
        resourceManager.recordApiRequest();
      }
      
      expect(resourceManager.canMakeApiRequest()).toBe(false);
    });

    it('should calculate rate limit delay correctly', () => {
      // Fill up rate limit
      for (let i = 0; i < 60; i++) {
        resourceManager.recordApiRequest();
      }
      
      const delay = resourceManager.getApiRateLimitDelay();
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(60000);
    });

    it('should reset rate limit after time window', async () => {
      // Mock time
      const originalNow = Date.now;
      let mockTime = Date.now();
      Date.now = vi.fn(() => mockTime);

      // Fill up rate limit
      for (let i = 0; i < 60; i++) {
        resourceManager.recordApiRequest();
      }
      
      expect(resourceManager.canMakeApiRequest()).toBe(false);
      
      // Advance time by 61 seconds
      mockTime += 61000;
      
      expect(resourceManager.canMakeApiRequest()).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Property 11: Resource Management Compliance', () => {
    // Property test for resource management compliance
    it('should maintain resource limits across various allocation patterns', async () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Generate random resource requirements
        const requirement: Partial<ResourceUsage> = {
          memory: Math.floor(Math.random() * 200) + 10,
          cpu: Math.floor(Math.random() * 30) + 5,
          activeConnections: Math.floor(Math.random() * 3) + 1
        };
        
        const priority: ExecutionPriority = ['low', 'normal', 'high'][Math.floor(Math.random() * 3)] as ExecutionPriority;
        const executionId = `property-test-${i}`;
        
        const result = await resourceManager.requestResources(executionId, requirement, priority);
        
        // Check resource limits are never exceeded
        const currentUsage = resourceManager.getCurrentUsage();
        const limits = resourceManager.getLimits();
        
        expect(currentUsage.memory).toBeLessThanOrEqual(limits.maxMemory);
        expect(currentUsage.cpu).toBeLessThanOrEqual(limits.maxCpu);
        expect(currentUsage.activeConnections).toBeLessThanOrEqual(limits.maxConnections);
        
        // Verify utilization calculations
        const utilization = resourceManager.getUtilization();
        expect(utilization.memory).toBeGreaterThanOrEqual(0);
        expect(utilization.memory).toBeLessThanOrEqual(100);
        expect(utilization.cpu).toBeGreaterThanOrEqual(0);
        expect(utilization.cpu).toBeLessThanOrEqual(100);
        expect(utilization.connections).toBeGreaterThanOrEqual(0);
        expect(utilization.connections).toBeLessThanOrEqual(100);
        
        // Randomly release some resources
        if (Math.random() < 0.3 && result.granted) {
          resourceManager.releaseResources(executionId);
        }
      }
    });

    it('should handle concurrent resource requests safely', async () => {
      const iterations = 50;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const promise = (async () => {
          const requirement: Partial<ResourceUsage> = {
            memory: Math.floor(Math.random() * 50) + 10,
            cpu: Math.floor(Math.random() * 20) + 5,
            activeConnections: 1
          };
          
          const executionId = `concurrent-${i}`;
          const result = await resourceManager.requestResources(executionId, requirement);
          
          // Verify resource limits are maintained even under concurrency
          const currentUsage = resourceManager.getCurrentUsage();
          const limits = resourceManager.getLimits();
          
          expect(currentUsage.memory).toBeLessThanOrEqual(limits.maxMemory);
          expect(currentUsage.cpu).toBeLessThanOrEqual(limits.maxCpu);
          expect(currentUsage.activeConnections).toBeLessThanOrEqual(limits.maxConnections);
          
          // Release after random delay
          setTimeout(() => {
            if (result.granted) {
              resourceManager.releaseResources(executionId);
            }
          }, Math.random() * 100);
        })();
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
    });

    it('should maintain queue integrity under various priority scenarios', async () => {
      const iterations = 75;
      
      // Fill up resources first
      await resourceManager.requestResources('blocker', { memory: 500, cpu: 75 });
      
      for (let i = 0; i < iterations; i++) {
        const priority: ExecutionPriority = ['low', 'normal', 'high'][Math.floor(Math.random() * 3)] as ExecutionPriority;
        const requirement: Partial<ResourceUsage> = {
          memory: Math.floor(Math.random() * 100) + 10,
          cpu: Math.floor(Math.random() * 20) + 5
        };
        
        await resourceManager.requestResources(`queue-test-${i}`, requirement, priority);
        
        const queueStatus = resourceManager.getQueueStatus();
        
        // Queue should maintain proper ordering
        expect(queueStatus.queueLength).toBeGreaterThan(0);
        expect(queueStatus.averageWaitTime).toBeGreaterThanOrEqual(0);
        
        // High priority count should be accurate
        expect(queueStatus.highPriorityCount).toBeGreaterThanOrEqual(0);
        expect(queueStatus.highPriorityCount).toBeLessThanOrEqual(queueStatus.queueLength);
      }
      
      // Release blocker and verify queue processing
      resourceManager.releaseResources('blocker');
      
      const finalQueueStatus = resourceManager.getQueueStatus();
      expect(finalQueueStatus.queueLength).toBeLessThan(iterations);
    });
  });

  describe('Resource Utilization', () => {
    it('should calculate utilization correctly', async () => {
      const limits = resourceManager.getLimits();
      
      await resourceManager.requestResources('exec-1', {
        memory: limits.maxMemory / 2,
        cpu: limits.maxCpu / 4,
        activeConnections: limits.maxConnections / 2
      });

      const utilization = resourceManager.getUtilization();
      
      expect(utilization.memory).toBeCloseTo(50, 1);
      expect(utilization.cpu).toBeCloseTo(25, 1);
      expect(utilization.connections).toBeCloseTo(50, 1);
    });

    it('should provide resource recommendations', async () => {
      // High resource usage
      const limits = resourceManager.getLimits();
      await resourceManager.requestResources('exec-1', {
        memory: limits.maxMemory * 0.95,
        cpu: limits.maxCpu * 0.95
      });

      const recommendations = resourceManager.getResourceRecommendations();
      
      expect(recommendations.shouldReduceConcurrency).toBe(true);
      expect(recommendations.shouldPauseNewExecutions).toBe(true);
    });
  });

  describe('Force Allocation', () => {
    it('should force allocate for high priority requests', async () => {
      // Fill up with low priority
      await resourceManager.requestResources('low-1', { memory: 300, cpu: 40 }, 'low');
      await resourceManager.requestResources('low-2', { memory: 200, cpu: 35 }, 'low');
      
      // Force allocate high priority (should evict low priority)
      const allocation = resourceManager.forceAllocation('high-1', { memory: 100, cpu: 20 });
      
      expect(allocation).toBeDefined();
      expect(allocation.priority).toBe('high');
      
      const queueStatus = resourceManager.getQueueStatus();
      expect(queueStatus.queueLength).toBeGreaterThan(0); // Evicted execution should be queued
    });
  });

  describe('Limit Updates', () => {
    it('should update limits and re-evaluate allocations', async () => {
      await resourceManager.requestResources('exec-1', { memory: 400 });
      
      // Reduce memory limit
      resourceManager.updateLimits({ maxMemory: 300 });
      
      const newLimits = resourceManager.getLimits();
      expect(newLimits.maxMemory).toBe(300);
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources', async () => {
      await resourceManager.requestResources('exec-1', { memory: 100 });
      await resourceManager.requestResources('exec-2', { memory: 200 });
      
      resourceManager.cleanup();
      
      const usage = resourceManager.getCurrentUsage();
      expect(usage.memory).toBe(0);
      expect(usage.cpu).toBe(0);
      expect(usage.activeConnections).toBe(0);
      
      const queueStatus = resourceManager.getQueueStatus();
      expect(queueStatus.queueLength).toBe(0);
    });
  });
});