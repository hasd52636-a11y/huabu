import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import BatchProcessor, { ProgressState, BatchInputSource } from './BatchProcessor';
import VideoStatusManager from './VideoStatusManager';
import type { BatchScript, BatchConfig, VideoItem, Block, ProviderSettings } from '../types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2, 9))
  }
});

describe('Batch Processing System Property Tests', () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new BatchProcessor();
  });

  afterEach(() => {
    processor.stopProcessing();
  });

  describe('Property 5: Enhanced Batch Processing with Minimization Support', () => {
    it('should maintain progress state integrity during processing', async () => {
      const blocks: Block[] = [
        {
          id: 'block1',
          type: 'text',
          content: 'Valid content for video generation',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        },
        {
          id: 'block2',
          type: 'image',
          content: 'Another valid content',
          x: 100,
          y: 100,
          width: 200,
          height: 150
        }
      ];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'blocks',
        blocks: blocks
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      let progressUpdates: ProgressState[] = [];
      processor.setProgressCallback((progress) => {
        progressUpdates.push({ ...progress });
      });

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const initialProgress = processor.getProgressState();
      
      // Property 2: Progress State Integrity
      expect(initialProgress.total).toBe(blocks.length);
      expect(initialProgress.completed + initialProgress.failed + initialProgress.pending).toBe(initialProgress.total);
      expect(initialProgress.isProcessing).toBe(true);
      expect(initialProgress.pending).toBe(blocks.length);
      expect(initialProgress.completed).toBe(0);
      expect(initialProgress.failed).toBe(0);
    });

    it('should handle file-based input correctly', async () => {
      const prompts = [
        'Generate a video of a beautiful sunset',
        'Create a video showing ocean waves',
        'Make a video of a forest scene'
      ];

      const config: BatchConfig = {
        videoDuration: 15,
        processingInterval: 2000,
        videoOrientation: 'portrait',
        maxRetries: 2
      };

      const inputSource: BatchInputSource = {
        type: 'file',
        filePrompts: prompts
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const progress = processor.getProgressState();
      
      expect(progress.total).toBe(prompts.length);
      expect(progress.pending).toBe(prompts.length);
      expect(progress.isProcessing).toBe(true);
    });

    it('should filter out invalid content correctly', async () => {
      const blocks: Block[] = [
        {
          id: 'valid1',
          type: 'text',
          content: 'Valid content',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        },
        {
          id: 'invalid1',
          type: 'text',
          content: '   ', // Only whitespace
          x: 0,
          y: 0,
          width: 100,
          height: 100
        },
        {
          id: 'invalid2',
          type: 'text',
          content: '', // Empty
          x: 0,
          y: 0,
          width: 100,
          height: 100
        },
        {
          id: 'valid2',
          type: 'text',
          content: 'Another valid content',
          x: 0,
          y: 0,
          width: 100,
          height: 100
        }
      ];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'blocks',
        blocks: blocks
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const progress = processor.getProgressState();
      
      // Should only process the 2 valid blocks
      expect(progress.total).toBe(2);
      expect(progress.pending).toBe(2);
    });

    it('should filter out invalid prompts correctly', async () => {
      const prompts = [
        'Valid prompt for video generation',
        '   ', // Only whitespace
        '', // Empty
        'abc', // Too short (less than 5 chars)
        'Another valid prompt for testing'
      ];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'file',
        filePrompts: prompts
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const progress = processor.getProgressState();
      
      // Should only process the 2 valid prompts
      expect(progress.total).toBe(2);
      expect(progress.pending).toBe(2);
    });

    it('should maintain minimization state consistency', () => {
      fc.assert(fc.property(
        fc.boolean(),
        (isMinimized) => {
          processor.setMinimized(isMinimized);
          const progress = processor.getProgressState();
          
          // Property 6: Minimization State Consistency
          expect(progress.isMinimized).toBe(isMinimized);
        }
      ), { numRuns: 10 });
    });

    it('should save and restore processing state correctly', () => {
      fc.assert(fc.property(
        fc.record({
          total: fc.integer({ min: 1, max: 20 }),
          completed: fc.integer({ min: 0, max: 10 }),
          failed: fc.integer({ min: 0, max: 5 }),
          isProcessing: fc.boolean(),
          isMinimized: fc.boolean()
        }),
        (mockState) => {
          // Mock localStorage behavior
          let storedValue: string | null = null;
          mockLocalStorage.setItem.mockImplementation((key, value) => {
            if (key === 'batch_processing_enhanced_state') {
              storedValue = value;
            }
          });
          mockLocalStorage.getItem.mockImplementation((key) => {
            if (key === 'batch_processing_enhanced_state') {
              return storedValue;
            }
            return null;
          });

          // Set up processor state
          (processor as any).progressState = {
            ...mockState,
            pending: mockState.total - mockState.completed - mockState.failed
          };
          (processor as any).currentConfig = {
            videoDuration: 10,
            processingInterval: 3000,
            videoOrientation: 'landscape' as const
          };
          (processor as any).processingState = {
            id: 'test-batch',
            items: [],
            total: mockState.total,
            completed: mockState.completed,
            failed: mockState.failed,
            pending: mockState.total - mockState.completed - mockState.failed,
            status: 'processing',
            startedAt: Date.now()
          };

          // Save state
          (processor as any).saveProcessingState();

          // Create new processor and load state
          const newProcessor = new BatchProcessor();
          const loaded = newProcessor.loadProcessingState();

          expect(loaded).toBe(true);
          
          const loadedProgress = newProcessor.getProgressState();
          expect(loadedProgress.total).toBe(mockState.total);
          expect(loadedProgress.completed).toBe(mockState.completed);
          expect(loadedProgress.failed).toBe(mockState.failed);
          expect(loadedProgress.isProcessing).toBe(mockState.isProcessing);
          expect(loadedProgress.isMinimized).toBe(mockState.isMinimized);
        }
      ), { numRuns: 15 });
    });

    it('should apply global prompt correctly', () => {
      const originalPrompt = "Generate a video of a cat";
      const referenceImage = "https://example.com/cat.jpg";
      
      const enhancedPrompt = (processor as any).applyGlobalPrompt(originalPrompt, referenceImage);
      
      expect(enhancedPrompt).toContain("全局指令：参考锁定视频中出现的所有角色或产品");
      expect(enhancedPrompt).toContain(originalPrompt);
      // Reference image is stored separately, not in the prompt text
      expect(enhancedPrompt).not.toContain(referenceImage);
    });

    it('should handle pause and resume correctly', async () => {
      const blocks: Block[] = [{
        id: 'test-block',
        type: 'text',
        content: 'Test content',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      }];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessing(blocks, config, videoSettings);
      
      expect(processor.getProgressState().isProcessing).toBe(true);
      
      processor.pauseProcessing();
      expect(processor.getProgressState().isProcessing).toBe(false);
      
      processor.resumeProcessing();
      expect(processor.getProgressState().isProcessing).toBe(true);
    });
  });

  describe('Property 2: 批量处理系统一致性', () => {
    it('should maintain script status consistency', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 }),
          videoUrl: fc.option(fc.webUrl()),
          error: fc.option(fc.string({ maxLength: 100 }))
        }), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('pending', 'processing', 'completed', 'failed'),
        fc.integer({ min: 0, max: 100 }),
        (scripts, scriptId, newStatus, newProgress) => {
          // Ensure at least one script has the target ID
          const testScripts = [
            ...scripts,
            {
              id: scriptId,
              status: 'pending' as const,
              progress: 0,
              videoUrl: undefined,
              error: undefined
            }
          ];

          const updatedScripts = BatchProcessor.updateScriptStatus(
            testScripts,
            scriptId,
            newStatus,
            newProgress
          );

          // Find the updated script
          const updatedScript = updatedScripts.find(s => s.id === scriptId);
          expect(updatedScript).toBeDefined();
          expect(updatedScript!.status).toBe(newStatus);
          expect(updatedScript!.progress).toBe(newProgress);

          // Other scripts should remain unchanged
          const otherScripts = updatedScripts.filter(s => s.id !== scriptId);
          const originalOtherScripts = testScripts.filter(s => s.id !== scriptId);
          expect(otherScripts).toEqual(originalOtherScripts);
        }
      ), { numRuns: 30 });
    });

    it('should correctly calculate batch statistics', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 })
        }), { minLength: 0, maxLength: 20 }),
        (scripts) => {
          const stats = BatchProcessor.calculateStats(scripts);

          // Verify totals match
          expect(stats.total).toBe(scripts.length);
          expect(stats.completed + stats.failed + stats.processing + stats.pending).toBe(scripts.length);

          // Verify individual counts
          expect(stats.completed).toBe(scripts.filter(s => s.status === 'completed').length);
          expect(stats.failed).toBe(scripts.filter(s => s.status === 'failed').length);
          expect(stats.processing).toBe(scripts.filter(s => s.status === 'processing').length);
          expect(stats.pending).toBe(scripts.filter(s => s.status === 'pending').length);
        }
      ), { numRuns: 50 });
    });

    it('should find next pending script correctly', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 })
        }), { minLength: 0, maxLength: 10 }),
        (scripts) => {
          const nextPending = BatchProcessor.getNextPendingScript(scripts);
          const pendingScripts = scripts.filter(s => s.status === 'pending');

          if (pendingScripts.length === 0) {
            expect(nextPending).toBeUndefined();
          } else {
            expect(nextPending).toBeDefined();
            expect(nextPending!.status).toBe('pending');
            expect(pendingScripts).toContain(nextPending);
          }
        }
      ), { numRuns: 30 });
    });

    it('should handle retry logic correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 }),
          retryCount: fc.option(fc.integer({ min: 0, max: 5 }))
        }),
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 5 })
        }),
        (script, config) => {
          const shouldRetry = BatchProcessor.shouldRetry(script as BatchScript, config as BatchConfig);
          const retryCount = (script as any).retryCount || 0;

          expect(shouldRetry).toBe(retryCount < config.maxRetries);
        }
      ), { numRuns: 30 });
    });

    it('should reset script for retry correctly', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 }),
          error: fc.option(fc.string({ maxLength: 100 })),
          retryCount: fc.option(fc.integer({ min: 0, max: 3 }))
        }), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (scripts, scriptId) => {
          // Ensure at least one script has the target ID
          const testScripts = [
            ...scripts,
            {
              id: scriptId,
              status: 'failed' as const,
              progress: 50,
              error: 'Test error',
              retryCount: 1
            }
          ];

          const resetScripts = BatchProcessor.resetScriptForRetry(testScripts, scriptId);
          const resetScript = resetScripts.find(s => s.id === scriptId);

          expect(resetScript).toBeDefined();
          expect(resetScript!.status).toBe('pending');
          expect(resetScript!.progress).toBe(0);
          expect(resetScript!.error).toBeUndefined();
          expect((resetScript as any).retryCount).toBe(2); // Original 1 + 1
        }
      ), { numRuns: 20 });
    });

    it('should save and load batch state correctly', () => {
      fc.assert(fc.property(
        fc.record({
          scripts: fc.array(fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            status: fc.constantFrom('pending', 'processing', 'completed', 'failed'),
            progress: fc.integer({ min: 0, max: 100 })
          }), { maxLength: 5 }),
          config: fc.record({
            maxRetries: fc.integer({ min: 1, max: 5 }),
            interval: fc.integer({ min: 1000, max: 10000 })
          })
        }),
        (state) => {
          // Mock localStorage behavior
          let storedValue: string | null = null;
          mockLocalStorage.setItem.mockImplementation((key, value) => {
            if (key === 'batch_processing_state') {
              storedValue = value;
            }
          });
          mockLocalStorage.getItem.mockImplementation((key) => {
            if (key === 'batch_processing_state') {
              return storedValue;
            }
            return null;
          });

          // Save state
          BatchProcessor.saveBatchState(state);
          expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'batch_processing_state',
            JSON.stringify(state)
          );

          // Load state
          const loadedState = BatchProcessor.loadBatchState();
          expect(loadedState).toEqual(state);
        }
      ), { numRuns: 20 });
    });

    it('should format error messages correctly', () => {
      fc.assert(fc.property(
        fc.string({ maxLength: 100 }),
        fc.constantFrom('zh', 'en'),
        (error, lang) => {
          const formatted = BatchProcessor.formatErrorMessage(error, lang);

          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(0);

          if (lang === 'zh') {
            if (error.includes('timeout')) {
              expect(formatted).toBe('超时错误');
            } else if (error.includes('network')) {
              expect(formatted).toBe('网络错误');
            } else if (error.includes('api')) {
              expect(formatted).toBe('API 错误');
            } else {
              expect(formatted).toBe(`错误: ${error}`);
            }
          } else {
            if (error.includes('timeout')) {
              expect(formatted).toBe('Timeout error');
            } else if (error.includes('network')) {
              expect(formatted).toBe('Network error');
            } else if (error.includes('api')) {
              expect(formatted).toBe('API error');
            } else {
              expect(formatted).toBe(`Error: ${error}`);
            }
          }
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 3: 视频状态管理完整性', () => {
    let statusManager: VideoStatusManager;

    beforeEach(() => {
      statusManager = new VideoStatusManager();
    });

    it('should create video items with correct structure', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 5 })
        }),
        (sceneId, visualPrompt, videoPrompt, config) => {
          const videoItem = statusManager.createVideoItem(sceneId, visualPrompt, videoPrompt, config);

          expect(videoItem.id).toBeDefined();
          expect(typeof videoItem.id).toBe('string');
          expect(videoItem.sceneId).toBe(sceneId);
          expect(videoItem.visualPrompt).toBe(visualPrompt);
          expect(videoItem.videoPrompt).toBe(videoPrompt);
          expect(videoItem.prompt).toBe(visualPrompt);
          expect(videoItem.status).toBe('pending');
          expect(videoItem.progress).toBe(0);
          expect(videoItem.retryCount).toBe(0);
          expect(videoItem.maxRetries).toBe(config.maxRetries);
          expect(videoItem.createdAt).toBeGreaterThan(0);
          expect(videoItem.updatedAt).toBeGreaterThan(0);
          expect(videoItem.x).toBe(0);
          expect(videoItem.y).toBe(0);
          expect(videoItem.width).toBe(380);
          expect(videoItem.height).toBe(214);
        }
      ), { numRuns: 30 });
    });

    it('should update video item status correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'generating', 'completed', 'failed'),
          progress: fc.integer({ min: 0, max: 100 }),
          createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          updatedAt: fc.integer({ min: 1000000000000, max: Date.now() })
        }),
        fc.constantFrom('pending', 'generating', 'completed', 'failed'),
        fc.option(fc.record({
          progress: fc.integer({ min: 0, max: 100 }),
          videoUrl: fc.webUrl(),
          error: fc.string({ maxLength: 100 })
        })),
        (originalItem, newStatus, updates) => {
          const updatedItem = statusManager.updateVideoItem(
            originalItem as VideoItem,
            newStatus,
            updates || {}
          );

          expect(updatedItem.status).toBe(newStatus);
          expect(updatedItem.updatedAt).toBeGreaterThanOrEqual(originalItem.updatedAt);
          expect(updatedItem.id).toBe(originalItem.id);

          if (updates) {
            Object.keys(updates).forEach(key => {
              expect((updatedItem as any)[key]).toBe((updates as any)[key]);
            });
          }
        }
      ), { numRuns: 30 });
    });

    it('should mark video as failed correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending', 'generating'),
          progress: fc.integer({ min: 0, max: 100 })
        }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (item, errorMessage) => {
          const error = new Error(errorMessage);
          const failedItem = statusManager.markAsFailed(item as VideoItem, error);

          expect(failedItem.status).toBe('failed');
          expect(failedItem.errorMessage).toBe(errorMessage);
          expect(failedItem.error).toBe(errorMessage);
          expect(failedItem.progress).toBe(0);
        }
      ), { numRuns: 20 });
    });

    it('should mark video as success correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('generating'),
          progress: fc.integer({ min: 0, max: 99 })
        }),
        fc.webUrl(),
        (item, videoUrl) => {
          const successItem = statusManager.markAsSuccess(item as VideoItem, videoUrl);

          expect(successItem.status).toBe('completed');
          expect(successItem.videoUrl).toBe(videoUrl);
          expect(successItem.progress).toBe(100);
          expect(successItem.completedAt).toBeDefined();
          expect(successItem.completedAt).toBeGreaterThan(0);
        }
      ), { numRuns: 20 });
    });

    it('should mark video as generating correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('pending'),
          progress: fc.integer({ min: 0, max: 0 })
        }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (item, taskId) => {
          const generatingItem = statusManager.markAsGenerating(item as VideoItem, taskId);

          expect(generatingItem.status).toBe('generating');
          expect(generatingItem.taskId).toBe(taskId);
          expect(generatingItem.progress).toBe(10);
        }
      ), { numRuns: 20 });
    });

    it('should update progress correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('generating'),
          progress: fc.integer({ min: 0, max: 50 })
        }),
        fc.integer({ min: 0, max: 150 }),
        (item, newProgress) => {
          const updatedItem = statusManager.updateProgress(item as VideoItem, newProgress);

          expect(updatedItem.progress).toBe(Math.min(newProgress, 99));
          expect(updatedItem.status).toBe(item.status);
        }
      ), { numRuns: 30 });
    });

    it('should prepare for retry correctly', () => {
      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('failed'),
          progress: fc.integer({ min: 0, max: 100 }),
          retryCount: fc.option(fc.integer({ min: 0, max: 3 })),
          error: fc.option(fc.string({ maxLength: 100 }))
        }),
        (item) => {
          const retryItem = statusManager.prepareForRetry(item as VideoItem);

          expect(retryItem.status).toBe('pending');
          expect(retryItem.retryCount).toBe((item.retryCount || 0) + 1);
          expect(retryItem.lastRetryAt).toBeDefined();
          expect(retryItem.errorMessage).toBeUndefined();
          expect(retryItem.error).toBeUndefined();
          expect(retryItem.progress).toBe(0);
        }
      ), { numRuns: 20 });
    });

    it('should determine retry eligibility correctly', () => {
      fc.assert(fc.property(
        fc.record({
          retryCount: fc.option(fc.integer({ min: 0, max: 5 })),
          maxRetries: fc.option(fc.integer({ min: 1, max: 5 }))
        }),
        (item) => {
          const shouldRetry = statusManager.shouldRetry(item as VideoItem);
          const retryCount = item.retryCount || 0;
          const maxRetries = item.maxRetries || 3;

          expect(shouldRetry).toBe(retryCount < maxRetries);
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 4: 批量处理错误处理', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw errors
      expect(() => {
        BatchProcessor.saveBatchState({ test: 'data' });
      }).not.toThrow();

      expect(() => {
        const result = BatchProcessor.loadBatchState();
        expect(result).toBeNull();
      }).not.toThrow();
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json {');

      const result = BatchProcessor.loadBatchState();
      expect(result).toBeNull();
    });
  });

  describe('Global Prompt Integration', () => {
    it('should apply global prompt when reference image is available', async () => {
      const blocks: Block[] = [
        {
          id: 'block1',
          type: 'text',
          content: 'Generate a beautiful landscape video',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          status: 'idle',
          number: '1'
        }
      ];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'blocks',
        blocks: blocks,
        selectedFrames: [
          {
            id: 'frame1',
            imageUrl: 'https://example.com/reference.jpg',
            prompt: 'Reference frame'
          }
        ]
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const state = processor.getProcessingStatus();
      expect(state).toBeDefined();
      expect(state!.items).toHaveLength(1);
      
      const videoItem = state!.items[0];
      expect(videoItem.prompt).toContain('全局指令：参考锁定视频中出现的所有角色或产品');
      expect(videoItem.prompt).toContain('Generate a beautiful landscape video');
      expect(videoItem.referenceImage).toBe('https://example.com/reference.jpg');
    });

    it('should not apply global prompt when no reference image is available', async () => {
      const blocks: Block[] = [
        {
          id: 'block1',
          type: 'text',
          content: 'Generate a simple video',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          status: 'idle',
          number: '1'
        }
      ];

      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'landscape',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'blocks',
        blocks: blocks
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const state = processor.getProcessingStatus();
      expect(state).toBeDefined();
      expect(state!.items).toHaveLength(1);
      
      const videoItem = state!.items[0];
      expect(videoItem.prompt).not.toContain('全局指令：参考锁定视频中出现的所有角色或产品');
      expect(videoItem.prompt).toContain('Generate a simple video');
      expect(videoItem.referenceImage).toBeUndefined();
    });

    it('should apply global prompt for file-based input with reference image', async () => {
      const config: BatchConfig = {
        videoDuration: 10,
        processingInterval: 3000,
        videoOrientation: 'portrait',
        maxRetries: 3
      };

      const inputSource: BatchInputSource = {
        type: 'file',
        filePrompts: [
          'Create a video of a dancing character',
          'Show the character in different poses'
        ],
        selectedFrames: [
          {
            id: 'frame1',
            imageUrl: 'https://example.com/character.jpg',
            prompt: 'Character reference'
          }
        ]
      };

      const videoSettings: ProviderSettings = {
        provider: 'google',
        modelId: 'veo-3.1-fast-generate-preview'
      };

      // Mock the processing to avoid actual API calls
      vi.spyOn(processor as any, 'simulateVideoGeneration').mockResolvedValue(undefined);

      await processor.startBatchProcessingEnhanced(inputSource, config, videoSettings);

      const state = processor.getProcessingStatus();
      expect(state).toBeDefined();
      expect(state!.items).toHaveLength(2);
      
      state!.items.forEach(videoItem => {
        expect(videoItem.prompt).toContain('全局指令：参考锁定视频中出现的所有角色或产品');
        expect(videoItem.referenceImage).toBe('https://example.com/character.jpg');
      });

      expect(state!.items[0].prompt).toContain('Create a video of a dancing character');
      expect(state!.items[1].prompt).toContain('Show the character in different poses');
    });
  });
});