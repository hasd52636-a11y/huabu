import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DownloadManager, { DownloadItem, DownloadProgress, BatchDownloadConfig, BatchProgress } from './DownloadManager';

// Mock Notification API
const mockNotification = vi.fn();
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  configurable: true
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-url'),
  configurable: true
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  configurable: true
});

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
    style: {}
  })),
  configurable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
  configurable: true
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
  configurable: true
});

describe('Enhanced DownloadManager', () => {
  let downloadManager: DownloadManager;
  let progressCallback: ReturnType<typeof vi.fn>;
  let batchProgressCallback: ReturnType<typeof vi.fn>;
  let completionCallback: ReturnType<typeof vi.fn>;
  let batchCompletionCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    downloadManager = new DownloadManager();
    progressCallback = vi.fn();
    batchProgressCallback = vi.fn();
    completionCallback = vi.fn();
    batchCompletionCallback = vi.fn();
    
    downloadManager.setProgressCallback(progressCallback);
    downloadManager.setBatchProgressCallback(batchProgressCallback);
    downloadManager.setCompletionCallback(completionCallback);
    downloadManager.setBatchCompletionCallback(batchCompletionCallback);
    
    // Configure for testing - disable auto download to control test flow
    downloadManager.updateConfig({
      autoDownload: false,
      maxConcurrentDownloads: 1
    });
    
    // Mock timers for testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    downloadManager.cancelAllDownloads();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create download manager instance', () => {
      expect(downloadManager).toBeDefined();
    });

    it('should add single download with execution and batch IDs', () => {
      const videoUrl = 'https://example.com/video.mp4';
      const executionId = 'exec_123';
      const batchId = 'batch_456';
      
      const downloadId = downloadManager.addDownload(videoUrl, 'test.mp4', '/downloads', executionId, batchId);
      
      expect(downloadId).toBeDefined();
      expect(downloadId).toMatch(/^download_/);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].executionId).toBe(executionId);
      expect(queue[0].batchId).toBe(batchId);
    });

    it('should add batch downloads with configuration', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4', filename: 'video1.mp4' },
        { url: 'https://example.com/video2.mp4', filename: 'video2.mp4' },
        { url: 'https://example.com/video3.mp4', filename: 'video3.mp4' }
      ];

      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456',
        createSubdirectory: true,
        subdirectoryName: 'test_batch',
        fileNamingPattern: 'sequential'
      };

      const downloadIds = downloadManager.addBatchDownloads(videos, batchConfig);
      
      expect(downloadIds).toHaveLength(3);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(3);
      
      queue.forEach(item => {
        expect(item.executionId).toBe('exec_123');
        expect(item.batchId).toBe('batch_456');
      });
    });

    it('should add execution downloads with proper organization', () => {
      const executionResults = [
        { url: 'https://example.com/video1.mp4', blockId: 'block1', blockNumber: 'A01' },
        { url: 'https://example.com/video2.mp4', blockId: 'block2', blockNumber: 'A02' },
        { url: 'https://example.com/video3.mp4', blockId: 'block3', blockNumber: 'A03' }
      ];

      const executionId = 'exec_789';
      const downloadIds = downloadManager.addExecutionDownloads(executionResults, executionId);
      
      expect(downloadIds).toHaveLength(3);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(3);
      
      queue.forEach((item, index) => {
        expect(item.executionId).toBe(executionId);
        expect(item.batchId).toBe(`execution_${executionId}`);
        expect(item.filename).toBe(`${executionResults[index].blockNumber}_${executionResults[index].blockId}.mp4`);
      });
    });
  });

  describe('Progress tracking', () => {
    it('should track overall progress correctly', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' },
        { url: 'https://example.com/video3.mp4' }
      ];

      downloadManager.addBatchDownloads(videos);
      
      const progress = downloadManager.getProgress();
      expect(progress.total).toBe(3);
      expect(progress.pending).toBe(3);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.downloading).toBe(0);
    });

    it('should track batch progress separately', () => {
      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456'
      };

      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' }
      ];

      downloadManager.addBatchDownloads(videos, batchConfig);
      
      const batchProgress = downloadManager.getBatchProgress('batch_456');
      expect(batchProgress.total).toBe(2);
      expect(batchProgress.pending).toBe(2);
      expect(batchProgress.completed).toBe(0);
    });

    it('should track execution progress separately', () => {
      const executionResults = [
        { url: 'https://example.com/video1.mp4', blockId: 'block1', blockNumber: 'A01' },
        { url: 'https://example.com/video2.mp4', blockId: 'block2', blockNumber: 'A02' }
      ];

      const executionId = 'exec_789';
      downloadManager.addExecutionDownloads(executionResults, executionId);
      
      const executionProgress = downloadManager.getExecutionProgress(executionId);
      expect(executionProgress.total).toBe(2);
      expect(executionProgress.pending).toBe(2);
      expect(executionProgress.completed).toBe(0);
    });

    it('should get all batch progress information', () => {
      const batchConfig1: BatchDownloadConfig = {
        executionId: 'exec_1',
        batchId: 'batch_1'
      };

      const batchConfig2: BatchDownloadConfig = {
        executionId: 'exec_2',
        batchId: 'batch_2'
      };

      downloadManager.addBatchDownloads([{ url: 'https://example.com/video1.mp4' }], batchConfig1);
      downloadManager.addBatchDownloads([{ url: 'https://example.com/video2.mp4' }], batchConfig2);
      
      const allBatchProgress = downloadManager.getAllBatchProgress();
      expect(allBatchProgress).toHaveLength(2);
      expect(allBatchProgress.map(bp => bp.batchId)).toContain('batch_1');
      expect(allBatchProgress.map(bp => bp.batchId)).toContain('batch_2');
    });
  });

  describe('Batch management', () => {
    it('should cancel entire batch', () => {
      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456'
      };

      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' }
      ];

      downloadManager.addBatchDownloads(videos, batchConfig);
      downloadManager.cancelBatch('batch_456');
      
      const batchItems = downloadManager.getBatchDownloads('batch_456');
      batchItems.forEach(item => {
        expect(item.status).toBe('failed');
        expect(item.error).toBe('Download cancelled by user');
      });
    });

    it('should get downloads for specific batch', () => {
      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456'
      };

      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' }
      ];

      downloadManager.addBatchDownloads(videos, batchConfig);
      
      const batchDownloads = downloadManager.getBatchDownloads('batch_456');
      expect(batchDownloads).toHaveLength(2);
      batchDownloads.forEach(item => {
        expect(item.batchId).toBe('batch_456');
      });
    });

    it('should get downloads for specific execution', () => {
      const executionResults = [
        { url: 'https://example.com/video1.mp4', blockId: 'block1', blockNumber: 'A01' },
        { url: 'https://example.com/video2.mp4', blockId: 'block2', blockNumber: 'A02' }
      ];

      const executionId = 'exec_789';
      downloadManager.addExecutionDownloads(executionResults, executionId);
      
      const executionDownloads = downloadManager.getExecutionDownloads(executionId);
      expect(executionDownloads).toHaveLength(2);
      executionDownloads.forEach(item => {
        expect(item.executionId).toBe(executionId);
      });
    });

    it('should clear completed downloads from batch', () => {
      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456'
      };

      downloadManager.addBatchDownloads([{ url: 'https://example.com/video1.mp4' }], batchConfig);
      
      // Manually mark as completed for testing
      const queue = downloadManager.getDownloadQueue();
      queue[0].status = 'completed';
      
      downloadManager.clearBatchCompleted('batch_456');
      
      const remainingItems = downloadManager.getBatchDownloads('batch_456');
      expect(remainingItems).toHaveLength(0);
    });
  });

  describe('File naming patterns', () => {
    it('should apply sequential naming pattern', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' },
        { url: 'https://example.com/video3.mp4' }
      ];

      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456',
        fileNamingPattern: 'sequential'
      };

      downloadManager.addBatchDownloads(videos, batchConfig);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toBe('001_video1.mp4');
      expect(queue[1].filename).toBe('002_video2.mp4');
      expect(queue[2].filename).toBe('003_video3.mp4');
    });

    it('should apply timestamp naming pattern', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4' }
      ];

      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456',
        fileNamingPattern: 'timestamp'
      };

      downloadManager.addBatchDownloads(videos, batchConfig);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_video1\.mp4$/);
    });

    it('should use original naming pattern by default', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4', filename: 'custom.mp4' }
      ];

      const batchConfig: BatchDownloadConfig = {
        executionId: 'exec_123',
        batchId: 'batch_456',
        fileNamingPattern: 'original'
      };

      downloadManager.addBatchDownloads(videos, batchConfig);
      
      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toBe('custom.mp4');
    });
  });

  describe('Configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxConcurrentDownloads: 5,
        createExecutionDirectories: false,
        fileNamingPattern: 'timestamp' as const
      };

      downloadManager.updateConfig(newConfig);
      
      // Test that configuration is applied by checking behavior
      const executionResults = [
        { url: 'https://example.com/video1.mp4', blockId: 'block1', blockNumber: 'A01' }
      ];

      downloadManager.addExecutionDownloads(executionResults, 'exec_test');
      
      // The configuration should be reflected in the download behavior
      expect(downloadManager.getDownloadQueue()).toHaveLength(1);
    });
  });

  describe('Property 7: Download Organization Consistency', () => {
    /**
     * Property 7: Download Organization Consistency
     * For any completed workflow execution, all generated files should be downloaded 
     * to the specified directory with consistent naming and organization structure.
     */
    it('should organize downloads consistently for workflow executions', () => {
      // Test multiple execution scenarios
      const testCases = [
        {
          name: 'Single execution with multiple files',
          executionResults: [
            { url: 'https://example.com/video1.mp4', blockId: 'block1', blockNumber: 'A01' },
            { url: 'https://example.com/video2.mp4', blockId: 'block2', blockNumber: 'A02' },
            { url: 'https://example.com/video3.mp4', blockId: 'block3', blockNumber: 'A03' }
          ],
          executionId: 'exec_single'
        },
        {
          name: 'Multiple executions with different file counts',
          executionResults: [
            { url: 'https://example.com/video4.mp4', blockId: 'block4', blockNumber: 'B01' },
            { url: 'https://example.com/video5.mp4', blockId: 'block5', blockNumber: 'B02' }
          ],
          executionId: 'exec_multi'
        }
      ];

      testCases.forEach(testCase => {
        const downloadIds = downloadManager.addExecutionDownloads(testCase.executionResults, testCase.executionId);
        
        // Verify all downloads have consistent organization
        const executionDownloads = downloadManager.getExecutionDownloads(testCase.executionId);
        
        expect(executionDownloads).toHaveLength(testCase.executionResults.length);
        
        executionDownloads.forEach((download, index) => {
          // Verify execution ID consistency
          expect(download.executionId).toBe(testCase.executionId);
          
          // Verify batch ID follows execution pattern
          expect(download.batchId).toBe(`execution_${testCase.executionId}`);
          
          // Verify filename follows block pattern
          const expectedFilename = `${testCase.executionResults[index].blockNumber}_${testCase.executionResults[index].blockId}.mp4`;
          expect(download.filename).toBe(expectedFilename);
          
          // Verify download is properly queued
          expect(download.status).toBe('pending');
          expect(download.progress).toBe(0);
        });
        
        // Verify batch progress tracking
        const batchProgress = downloadManager.getBatchProgress(`execution_${testCase.executionId}`);
        expect(batchProgress.total).toBe(testCase.executionResults.length);
        expect(batchProgress.pending).toBe(testCase.executionResults.length);
        expect(batchProgress.completed).toBe(0);
        
        // Verify execution progress tracking
        const executionProgress = downloadManager.getExecutionProgress(testCase.executionId);
        expect(executionProgress.total).toBe(testCase.executionResults.length);
        expect(executionProgress.pending).toBe(testCase.executionResults.length);
      });
    });

    it('should maintain directory structure consistency across batches', () => {
      // Test different batch configurations
      const batchConfigs = [
        {
          executionId: 'exec_dir1',
          batchId: 'batch_dir1',
          createSubdirectory: true,
          subdirectoryName: 'execution_2024_01_01',
          fileNamingPattern: 'sequential' as const
        },
        {
          executionId: 'exec_dir2',
          batchId: 'batch_dir2',
          createSubdirectory: true,
          subdirectoryName: 'execution_2024_01_02',
          fileNamingPattern: 'timestamp' as const
        },
        {
          executionId: 'exec_dir3',
          batchId: 'batch_dir3',
          createSubdirectory: false,
          fileNamingPattern: 'original' as const
        }
      ];

      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4' }
      ];

      batchConfigs.forEach(config => {
        downloadManager.addBatchDownloads(videos, config);
        
        const batchDownloads = downloadManager.getBatchDownloads(config.batchId);
        
        // Verify consistent batch organization
        expect(batchDownloads).toHaveLength(2);
        
        batchDownloads.forEach(download => {
          expect(download.executionId).toBe(config.executionId);
          expect(download.batchId).toBe(config.batchId);
          
          // Verify filename pattern consistency
          switch (config.fileNamingPattern) {
            case 'sequential':
              expect(download.filename).toMatch(/^\d{3}_video\d\.mp4$/);
              break;
            case 'timestamp':
              expect(download.filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_video\d\.mp4$/);
              break;
            case 'original':
              expect(download.filename).toMatch(/^video\d\.mp4$/);
              break;
          }
        });
        
        // Verify batch progress consistency
        const batchProgress = downloadManager.getBatchProgress(config.batchId);
        expect(batchProgress.total).toBe(2);
        expect(batchProgress.pending).toBe(2);
      });
    });

    it('should handle concurrent batch operations consistently', () => {
      // Test multiple concurrent batches
      const concurrentBatches = [
        {
          batchId: 'concurrent_1',
          executionId: 'exec_concurrent_1',
          videos: [
            { url: 'https://example.com/c1_video1.mp4' },
            { url: 'https://example.com/c1_video2.mp4' }
          ]
        },
        {
          batchId: 'concurrent_2',
          executionId: 'exec_concurrent_2',
          videos: [
            { url: 'https://example.com/c2_video1.mp4' },
            { url: 'https://example.com/c2_video2.mp4' },
            { url: 'https://example.com/c2_video3.mp4' }
          ]
        },
        {
          batchId: 'concurrent_3',
          executionId: 'exec_concurrent_3',
          videos: [
            { url: 'https://example.com/c3_video1.mp4' }
          ]
        }
      ];

      // Add all batches concurrently
      const allDownloadIds: string[] = [];
      concurrentBatches.forEach(batch => {
        const config: BatchDownloadConfig = {
          executionId: batch.executionId,
          batchId: batch.batchId,
          fileNamingPattern: 'sequential'
        };
        
        const downloadIds = downloadManager.addBatchDownloads(batch.videos, config);
        allDownloadIds.push(...downloadIds);
      });

      // Verify each batch maintains its organization
      concurrentBatches.forEach(batch => {
        const batchDownloads = downloadManager.getBatchDownloads(batch.batchId);
        const executionDownloads = downloadManager.getExecutionDownloads(batch.executionId);
        
        // Verify batch isolation
        expect(batchDownloads).toHaveLength(batch.videos.length);
        expect(executionDownloads).toHaveLength(batch.videos.length);
        
        // Verify no cross-contamination between batches
        batchDownloads.forEach(download => {
          expect(download.batchId).toBe(batch.batchId);
          expect(download.executionId).toBe(batch.executionId);
        });
        
        // Verify progress tracking isolation
        const batchProgress = downloadManager.getBatchProgress(batch.batchId);
        expect(batchProgress.total).toBe(batch.videos.length);
        
        const executionProgress = downloadManager.getExecutionProgress(batch.executionId);
        expect(executionProgress.total).toBe(batch.videos.length);
      });

      // Verify overall consistency
      const totalProgress = downloadManager.getProgress();
      const expectedTotal = concurrentBatches.reduce((sum, batch) => sum + batch.videos.length, 0);
      expect(totalProgress.total).toBe(expectedTotal);
      expect(totalProgress.pending).toBe(expectedTotal);
      
      const allBatchProgress = downloadManager.getAllBatchProgress();
      expect(allBatchProgress).toHaveLength(3);
    });
  });
});