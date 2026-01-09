import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import ErrorHandler, { ErrorInfo, RetryConfig, ErrorLog } from './ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('Error Processing', () => {
    it('should process network errors correctly', () => {
      const networkError = new Error('Network connection failed');
      const errorInfo = errorHandler.processError(networkError);

      expect(errorInfo.code).toBe('NETWORK_ERROR');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toBe('网络连接失败，请检查网络连接');
      expect(errorInfo.suggestedAction).toBe('请检查网络连接后重试');
    });

    it('should process timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out');
      const errorInfo = errorHandler.processError(timeoutError);

      expect(errorInfo.code).toBe('TIMEOUT_ERROR');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toBe('请求超时，服务器响应缓慢');
    });

    it('should process API errors correctly', () => {
      const apiError = new Error('Internal server error 500');
      const errorInfo = errorHandler.processError(apiError);

      expect(errorInfo.code).toBe('API_ERROR');
      expect(errorInfo.retryable).toBe(true); // 500 is retryable
      expect(errorInfo.userMessage).toBe('API 服务出现问题');
    });

    it('should process rate limit errors correctly', () => {
      const rateLimitError = new Error('Too many requests - rate limit exceeded');
      const errorInfo = errorHandler.processError(rateLimitError);

      expect(errorInfo.code).toBe('RATE_LIMIT_ERROR');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toBe('API 调用频率过高，已达到限制');
    });

    it('should process authentication errors correctly', () => {
      const authError = new Error('Unauthorized - invalid API key');
      const errorInfo = errorHandler.processError(authError);

      expect(errorInfo.code).toBe('AUTH_ERROR');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toBe('API 密钥无效或已过期');
    });

    it('should process file parsing errors correctly', () => {
      const parseError = new Error('Invalid file format - parse error');
      const errorInfo = errorHandler.processError(parseError);

      expect(errorInfo.code).toBe('FILE_PARSING_ERROR');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toBe('文件格式错误或内容无效');
    });

    it('should process download errors correctly', () => {
      const downloadError = new Error('Download failed - network error');
      const errorInfo = errorHandler.processError(downloadError);

      expect(errorInfo.code).toBe('DOWNLOAD_ERROR');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toBe('视频下载失败');
    });

    it('should process storage errors correctly', () => {
      const storageError = new Error('No space left on device - ENOSPC');
      const errorInfo = errorHandler.processError(storageError);

      expect(errorInfo.code).toBe('STORAGE_ERROR');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toBe('本地存储空间不足或权限不够');
    });

    it('should process unknown errors correctly', () => {
      const unknownError = new Error('Some random error message');
      const errorInfo = errorHandler.processError(unknownError);

      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.userMessage).toBe('发生未知错误');
    });

    it('should handle string errors', () => {
      const errorInfo = errorHandler.processError('Network connection failed');

      expect(errorInfo.code).toBe('NETWORK_ERROR');
      expect(errorInfo.message).toBe('Network connection failed');
    });

    it('should include context in error logs', () => {
      const context = { userId: '123', action: 'video_generation' };
      errorHandler.processError('Test error', context);

      const logs = errorHandler.getErrorLogs();
      expect(logs[0].context).toEqual(context);
    });
  });

  describe('Retry Logic', () => {
    it('should check if error is retryable', () => {
      expect(errorHandler.isRetryable('NETWORK_ERROR')).toBe(true);
      expect(errorHandler.isRetryable('TIMEOUT_ERROR')).toBe(true);
      expect(errorHandler.isRetryable('AUTH_ERROR')).toBe(false);
      expect(errorHandler.isRetryable('UNKNOWN_ERROR')).toBe(false);
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay1 = errorHandler.calculateRetryDelay(0);
      const delay2 = errorHandler.calculateRetryDelay(1);
      const delay3 = errorHandler.calculateRetryDelay(2);

      expect(delay1).toBe(1000); // base delay
      expect(delay2).toBe(2000); // base * 2^1
      expect(delay3).toBe(4000); // base * 2^2
    });

    it('should respect maximum delay', () => {
      errorHandler.updateRetryConfig({ maxDelay: 5000 });
      const delay = errorHandler.calculateRetryDelay(10); // Would be very large

      expect(delay).toBe(5000);
    });

    it('should determine if should retry', () => {
      expect(errorHandler.shouldRetry('NETWORK_ERROR', 0)).toBe(true);
      expect(errorHandler.shouldRetry('NETWORK_ERROR', 2)).toBe(true);
      expect(errorHandler.shouldRetry('NETWORK_ERROR', 3)).toBe(false); // max retries reached
      expect(errorHandler.shouldRetry('AUTH_ERROR', 0)).toBe(false); // not retryable
    });

    it('should update retry configuration', () => {
      const newConfig: Partial<RetryConfig> = {
        maxRetries: 5,
        baseDelay: 2000
      };

      errorHandler.updateRetryConfig(newConfig);

      expect(errorHandler.shouldRetry('NETWORK_ERROR', 4)).toBe(true);
      expect(errorHandler.calculateRetryDelay(0)).toBe(2000);
    });
  });

  describe('User Messages', () => {
    it('should get user-friendly message in Chinese', () => {
      const message = errorHandler.getUserMessage('Network connection failed', 'zh');
      expect(message).toBe('网络连接失败，请检查网络连接');
    });

    it('should get user-friendly message in English', () => {
      const message = errorHandler.getUserMessage('Network connection failed', 'en');
      expect(message).toBe('Network connection failed, please check your network connection');
    });

    it('should get suggested action in Chinese', () => {
      const action = errorHandler.getSuggestedAction('Network connection failed', 'zh');
      expect(action).toBe('请检查网络连接后重试');
    });

    it('should get suggested action in English', () => {
      const action = errorHandler.getSuggestedAction('Network connection failed', 'en');
      expect(action).toBe('Please check your network connection and retry');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with unique IDs', () => {
      errorHandler.processError('Error 1');
      errorHandler.processError('Error 2');

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    it('should limit error logs to 100 entries', () => {
      // Add 150 errors
      for (let i = 0; i < 150; i++) {
        errorHandler.processError(`Error ${i}`);
      }

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(100);
    });

    it('should mark errors as resolved', () => {
      errorHandler.processError('Test error');
      const logs = errorHandler.getErrorLogs();
      const errorId = logs[0].id;

      const marked = errorHandler.markErrorResolved(errorId);
      expect(marked).toBe(true);

      const updatedLogs = errorHandler.getErrorLogs();
      expect(updatedLogs[0].resolved).toBe(true);
      expect(updatedLogs[0].resolvedAt).toBeDefined();
    });

    it('should return false when marking non-existent error as resolved', () => {
      const marked = errorHandler.markErrorResolved('non-existent-id');
      expect(marked).toBe(false);
    });

    it('should clear error logs', () => {
      errorHandler.processError('Error 1');
      errorHandler.processError('Error 2');

      errorHandler.clearErrorLogs();

      const logs = errorHandler.getErrorLogs();
      expect(logs).toHaveLength(0);
    });

    it('should limit returned logs when specified', () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.processError(`Error ${i}`);
      }

      const logs = errorHandler.getErrorLogs(5);
      expect(logs).toHaveLength(5);
    });
  });

  describe('Error Statistics', () => {
    it('should calculate error statistics correctly', () => {
      errorHandler.processError('Network error');
      errorHandler.processError('API error');
      errorHandler.processError('Network error');

      const logs = errorHandler.getErrorLogs();
      errorHandler.markErrorResolved(logs[0].id);

      const stats = errorHandler.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(2);
      expect(stats.byType['NETWORK_ERROR']).toBe(2);
      expect(stats.byType['API_ERROR']).toBe(1);
      expect(stats.recentErrors).toBe(3); // All are recent
    });

    it('should count recent errors correctly', () => {
      // Mock Date.now to simulate old errors
      const originalNow = Date.now;
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      
      vi.spyOn(Date, 'now').mockReturnValue(twoHoursAgo);
      errorHandler.processError('Old error');
      
      Date.now = originalNow;
      errorHandler.processError('Recent error');

      const stats = errorHandler.getErrorStats();
      expect(stats.recentErrors).toBe(1); // Only the recent one
    });
  });

  describe('Property-Based Tests', () => {
    it('should handle any error message without crashing', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          expect(() => {
            const errorInfo = errorHandler.processError(errorMessage);
            expect(errorInfo).toBeDefined();
            expect(errorInfo.code).toBeDefined();
            expect(errorInfo.message).toBe(errorMessage);
            expect(errorInfo.timestamp).toBeGreaterThan(0);
            expect(typeof errorInfo.retryable).toBe('boolean');
            expect(errorInfo.userMessage).toBeDefined();
          }).not.toThrow();
        }
      ), { numRuns: 50 });
    });

    it('should maintain consistent retry logic', () => {
      fc.assert(fc.property(
        fc.constantFrom('NETWORK_ERROR', 'TIMEOUT_ERROR', 'AUTH_ERROR', 'UNKNOWN_ERROR'),
        fc.integer({ min: 0, max: 10 }),
        (errorCode, retryCount) => {
          const isRetryable = errorHandler.isRetryable(errorCode);
          const shouldRetry = errorHandler.shouldRetry(errorCode, retryCount);
          
          if (!isRetryable) {
            expect(shouldRetry).toBe(false);
          } else {
            expect(shouldRetry).toBe(retryCount < 3); // default max retries
          }
        }
      ), { numRuns: 30 });
    });

    it('should calculate exponential backoff correctly', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 5 }),
        (retryCount) => {
          const delay = errorHandler.calculateRetryDelay(retryCount);
          const expectedDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          
          expect(delay).toBe(expectedDelay);
          expect(delay).toBeGreaterThan(0);
          expect(delay).toBeLessThanOrEqual(30000);
        }
      ), { numRuns: 20 });
    });

    it('should maintain error log integrity', () => {
      fc.assert(fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 20 }),
        (errorMessages) => {
          const handler = new ErrorHandler();
          
          errorMessages.forEach(message => handler.processError(message));
          
          const logs = handler.getErrorLogs();
          expect(logs.length).toBe(Math.min(errorMessages.length, 100));
          
          // Check that all logs have unique IDs
          const ids = logs.map(log => log.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
          
          // Check that all logs have required fields
          logs.forEach(log => {
            expect(log.id).toBeDefined();
            expect(log.error).toBeDefined();
            expect(log.context).toBeDefined();
            expect(typeof log.resolved).toBe('boolean');
          });
        }
      ), { numRuns: 15 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error message', () => {
      const errorInfo = errorHandler.processError('');
      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.message).toBe('');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      expect(() => {
        errorHandler.processError(longMessage);
      }).not.toThrow();
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = '特殊字符 🚀 <script>alert("test")</script>';
      const errorInfo = errorHandler.processError(specialMessage);
      expect(errorInfo.message).toBe(specialMessage);
    });

    it('should handle null context gracefully', () => {
      expect(() => {
        errorHandler.processError('Test error', null as any);
      }).not.toThrow();
    });
  });
});