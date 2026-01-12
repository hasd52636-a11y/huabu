import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from './ErrorHandler';
import { ErrorType, RetryPolicy } from '../types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', async () => {
      const networkErrors = [
        new Error('Network request failed'),
        new Error('fetch error occurred'),
        new Error('Connection timeout'),
        Object.assign(new Error('Request failed'), { name: 'NetworkError' })
      ];

      for (const error of networkErrors) {
        const result = await errorHandler.handleError(error, {
          blockId: 'test-block',
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });

        expect(result.errorInfo.type).toBe('network');
      }
    });

    it('should classify API errors correctly', async () => {
      const apiErrors = [
        new Error('API key unauthorized'),
        new Error('Bad request to API'),
        new Error('Forbidden access'),
        new Error('API endpoint not found')
      ];

      for (const error of apiErrors) {
        const result = await errorHandler.handleError(error, {
          blockId: 'test-block',
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });

        expect(result.errorInfo.type).toBe('api');
      }
    });

    it('should classify rate limit errors correctly', async () => {
      const rateLimitErrors = [
        new Error('Rate limit exceeded'),
        new Error('Too many requests'),
        new Error('Quota exceeded for API')
      ];

      for (const error of rateLimitErrors) {
        const result = await errorHandler.handleError(error, {
          blockId: 'test-block',
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });

        expect(result.errorInfo.type).toBe('rate_limit');
      }
    });

    it('should classify validation errors correctly', async () => {
      const validationErrors = [
        new Error('Validation failed for input'),
        new Error('Invalid parameter provided'),
        new Error('Required field missing'),
        Object.assign(new Error('Invalid data'), { name: 'ValidationError' })
      ];

      for (const error of validationErrors) {
        const result = await errorHandler.handleError(error, {
          blockId: 'test-block',
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });

        expect(result.errorInfo.type).toBe('validation');
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry network errors with exponential backoff', async () => {
      const error = new Error('Network request failed');
      
      const result1 = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 0
      });

      const result2 = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 1
      });

      expect(result1.shouldRetry).toBe(true);
      expect(result2.shouldRetry).toBe(true);
      expect(result2.delay).toBeGreaterThan(result1.delay);
    });

    it('should not retry validation errors', async () => {
      const error = new Error('Validation failed');
      
      const result = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 0
      });

      expect(result.shouldRetry).toBe(false);
      expect(result.errorInfo.recoverable).toBe(false);
    });

    it('should stop retrying after max attempts', async () => {
      const error = new Error('Network request failed');
      
      // Network errors have max 5 retries
      const result = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 5
      });

      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('Property 10: Error Handling Isolation', () => {
    // Property test for error handling isolation
    it('should isolate errors appropriately across different scenarios', async () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Generate random error scenarios
        const errorTypes: ErrorType[] = ['network', 'api', 'rate_limit', 'validation', 'system'];
        const randomType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        
        const error = new Error(`${randomType} error ${i}`);
        if (randomType === 'network') error.message = 'Network request failed';
        else if (randomType === 'api') error.message = 'API unauthorized';
        else if (randomType === 'rate_limit') error.message = 'Rate limit exceeded';
        else if (randomType === 'validation') error.message = 'Validation failed';
        
        const result = await errorHandler.handleError(error, {
          blockId: `block-${i}`,
          executionId: `exec-${i}`,
          operation: `op-${i}`,
          attempt: Math.floor(Math.random() * 3)
        });

        // Verify error isolation properties
        expect(result.errorInfo.type).toBe(randomType);
        
        // Validation and API errors should be isolated
        const shouldIsolate = errorHandler.shouldIsolateError(result.errorInfo);
        if (randomType === 'validation' || randomType === 'api') {
          expect(shouldIsolate).toBe(true);
        }
        
        // Error context should be preserved
        expect(result.errorInfo.context.blockId).toBe(`block-${i}`);
        expect(result.errorInfo.context.executionId).toBe(`exec-${i}`);
        expect(result.errorInfo.timestamp).toBeGreaterThan(0);
      }
    });

    it('should maintain error isolation across concurrent operations', async () => {
      const iterations = 50;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const promise = (async () => {
          const error = new Error(`Concurrent error ${i}`);
          const blockId = `concurrent-block-${i}`;
          
          const result = await errorHandler.handleError(error, {
            blockId,
            executionId: `exec-${i}`,
            operation: `concurrent-op-${i}`,
            attempt: 0
          });

          // Each error should be isolated to its own context
          expect(result.errorInfo.context.blockId).toBe(blockId);
          expect(result.errorInfo.message).toBe(`Concurrent error ${i}`);
          
          // Error should not affect other concurrent operations
          const shouldIsolate = errorHandler.shouldIsolateError(result.errorInfo);
          if (result.errorInfo.type === 'validation' || result.errorInfo.type === 'api') {
            expect(shouldIsolate).toBe(true);
          }
        })();
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
    });

    it('should preserve error context integrity under various conditions', async () => {
      const iterations = 75;
      
      for (let i = 0; i < iterations; i++) {
        const context = {
          blockId: `integrity-block-${i}`,
          executionId: `integrity-exec-${i}`,
          operation: `integrity-op-${i}`,
          attempt: Math.floor(Math.random() * 10)
        };
        
        const error = new Error(`Integrity test error ${i}`);
        const result = await errorHandler.handleError(error, context);
        
        // Context should be perfectly preserved
        expect(result.errorInfo.context).toEqual(context);
        expect(result.errorInfo.context.blockId).toBe(context.blockId);
        expect(result.errorInfo.context.executionId).toBe(context.executionId);
        expect(result.errorInfo.context.operation).toBe(context.operation);
        expect(result.errorInfo.context.attempt).toBe(context.attempt);
        
        // Error info should be complete
        expect(result.errorInfo.message).toBe(error.message);
        expect(result.errorInfo.timestamp).toBeGreaterThan(0);
        expect(typeof result.errorInfo.recoverable).toBe('boolean');
      }
    });
  });

  describe('Error Statistics', () => {
    it('should track error statistics correctly', async () => {
      const errors = [
        new Error('Network request failed'),
        new Error('API unauthorized'),
        new Error('Validation failed'),
        new Error('Network timeout'),
        new Error('Rate limit exceeded')
      ];

      for (let i = 0; i < errors.length; i++) {
        await errorHandler.handleError(errors[i], {
          blockId: `block-${i}`,
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });
      }

      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(5);
      expect(stats.errorsByType.network).toBe(2);
      expect(stats.errorsByType.api).toBe(1);
      expect(stats.errorsByType.validation).toBe(1);
      expect(stats.errorsByType.rate_limit).toBe(1);
    });

    it('should generate error reports', async () => {
      const error = new Error('Test error for report');
      await errorHandler.handleError(error, {
        blockId: 'report-block',
        executionId: 'report-exec',
        operation: 'report-op',
        attempt: 0
      });

      const stats = errorHandler.getErrorStats();
      const report = errorHandler.createErrorReport(stats.recentErrors);
      
      expect(report).toContain('Error Report');
      expect(report).toContain('report-block');
      expect(report).toContain('Test error for report');
    });
  });

  describe('Execute with Retry', () => {
    it('should execute operation successfully on first try', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await errorHandler.executeWithRetry(mockOperation, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValue('success');
      
      const result = await errorHandler.executeWithRetry(mockOperation, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network request failed'));
      
      await expect(errorHandler.executeWithRetry(mockOperation, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op'
      })).rejects.toThrow('Network request failed');

      // Network errors have max 5 retries + initial attempt = 6 calls
      expect(mockOperation).toHaveBeenCalledTimes(6);
    });
  });

  describe('Policy Management', () => {
    it('should allow updating retry policies', () => {
      const newPolicy: RetryPolicy = {
        maxRetries: 10,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        jitter: false
      };

      errorHandler.updateRetryPolicy('network', newPolicy);
      const retrievedPolicy = errorHandler.getRetryPolicy('network');
      
      expect(retrievedPolicy).toEqual(newPolicy);
    });

    it('should calculate delays correctly', async () => {
      const error = new Error('Network request failed');
      
      const result1 = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 0
      });

      const result2 = await errorHandler.handleError(error, {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 1
      });

      expect(result1.delay).toBeGreaterThan(0);
      expect(result2.delay).toBeGreaterThan(result1.delay);
    });
  });

  describe('Error Log Management', () => {
    it('should maintain error log size limit', async () => {
      // Create more errors than the log limit
      for (let i = 0; i < 1100; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`), {
          blockId: `block-${i}`,
          executionId: 'test-exec',
          operation: 'test-op',
          attempt: 0
        });
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(1000);
    });

    it('should clear error log', async () => {
      await errorHandler.handleError(new Error('Test error'), {
        blockId: 'test-block',
        executionId: 'test-exec',
        operation: 'test-op',
        attempt: 0
      });

      let stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrorLog();
      stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });
});