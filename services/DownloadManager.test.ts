import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import DownloadManager, { DownloadItem, DownloadProgress, DownloadConfig } from './DownloadManager';

// Mock Notification API
const mockNotification = vi.fn();
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  configurable: true
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  configurable: true
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
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

describe('DownloadManager', () => {
  let downloadManager: DownloadManager;

  beforeEach(() => {
    vi.clearAllMocks();
    downloadManager = new DownloadManager();
  });

  afterEach(() => {
    downloadManager.clearAll();
  });

  describe('Basic Functionality', () => {
    it('should add download to queue', () => {
      // Disable auto download for this test
      downloadManager.updateConfig({ autoDownload: false });
      
      const videoUrl = 'https://example.com/video.mp4';
      const id = downloadManager.addDownload(videoUrl);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].videoUrl).toBe(videoUrl);
      expect(queue[0].status).toBe('pending');
    });

    it('should generate filename from URL', () => {
      const videoUrl = 'https://example.com/path/video.mp4';
      downloadManager.addDownload(videoUrl);

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toBe('video.mp4');
    });

    it('should add .mp4 extension if missing', () => {
      const videoUrl = 'https://example.com/video';
      downloadManager.addDownload(videoUrl);

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toBe('video.mp4');
    });

    it('should use custom filename when provided', () => {
      const videoUrl = 'https://example.com/video.mp4';
      const customFilename = 'my-custom-video.mp4';
      downloadManager.addDownload(videoUrl, customFilename);

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].filename).toBe(customFilename);
    });

    it('should add batch downloads', () => {
      const videos = [
        { url: 'https://example.com/video1.mp4' },
        { url: 'https://example.com/video2.mp4', filename: 'custom.mp4' }
      ];

      const ids = downloadManager.addBatchDownloads(videos);

      expect(ids).toHaveLength(2);
      expect(ids.every(id => typeof id === 'string')).toBe(true);

      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(2);
      expect(queue[1].filename).toBe('custom.mp4');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const config: Partial<DownloadConfig> = {
        maxRetries: 5,
        retryDelay: 3000,
        enableNotifications: false
      };

      downloadManager.updateConfig(config);

      // Add a download to test the config is applied
      downloadManager.addDownload('https://example.com/video.mp4');
      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].maxRetries).toBe(5);
    });

    it('should use default config values', () => {
      downloadManager.addDownload('https://example.com/video.mp4');
      const queue = downloadManager.getDownloadQueue();
      
      expect(queue[0].maxRetries).toBe(3); // default
    });
  });

  describe('Progress Tracking', () => {
    it('should track download progress correctly', () => {
      downloadManager.updateConfig({ autoDownload: false });
      downloadManager.addDownload('https://example.com/video1.mp4');
      downloadManager.addDownload('https://example.com/video2.mp4');

      const progress = downloadManager.getProgress();
      expect(progress.total).toBe(2);
      expect(progress.pending).toBe(2);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.downloading).toBe(0);
    });

    it('should notify progress updates', () => {
      downloadManager.updateConfig({ autoDownload: false });
      const progressCallback = vi.fn();
      downloadManager.setProgressCallback(progressCallback);

      downloadManager.addDownload('https://example.com/video.mp4');

      expect(progressCallback).toHaveBeenCalledWith({
        total: 1,
        pending: 1,
        completed: 0,
        failed: 0,
        downloading: 0
      });
    });

    it('should call completion callback when all downloads complete', async () => {
      const completionCallback = vi.fn();
      downloadManager.setCompletionCallback(completionCallback);

      // Mock successful download
      vi.spyOn(downloadManager as any, 'simulateDownload').mockResolvedValue(undefined);

      downloadManager.updateConfig({ autoDownload: false });
      downloadManager.addDownload('https://example.com/video.mp4');

      await downloadManager.processQueue();

      expect(completionCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'completed'
          })
        ])
      );
    });
  });

  describe('Download Processing', () => {
    it('should process download queue', async () => {
      // Mock successful download
      vi.spyOn(downloadManager as any, 'simulateDownload').mockResolvedValue(undefined);

      downloadManager.updateConfig({ autoDownload: false });
      downloadManager.addDownload('https://example.com/video.mp4');

      await downloadManager.processQueue();

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].status).toBe('completed');
      expect(queue[0].progress).toBe(100);
    });

    it('should handle download failures and retry', async () => {
      // Mock failing download
      vi.spyOn(downloadManager as any, 'simulateDownload')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      downloadManager.updateConfig({ autoDownload: false, retryDelay: 100 });
      downloadManager.addDownload('https://example.com/video.mp4');

      await downloadManager.processQueue();

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 200));

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].retryCount).toBeGreaterThan(0);
    });

    it('should fail permanently after max retries', async () => {
      // Mock always failing download
      vi.spyOn(downloadManager as any, 'simulateDownload')
        .mockRejectedValue(new Error('Permanent network error'));

      downloadManager.updateConfig({ 
        autoDownload: false, 
        maxRetries: 2, 
        retryDelay: 50 
      });
      downloadManager.addDownload('https://example.com/video.mp4');

      await downloadManager.processQueue();

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 300));

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].status).toBe('failed');
      expect(queue[0].retryCount).toBe(2);
      expect(queue[0].error).toContain('Permanent network error');
    });
  });

  describe('Download Control', () => {
    it('should cancel active download', async () => {
      downloadManager.updateConfig({ autoDownload: false });
      const id = downloadManager.addDownload('https://example.com/video.mp4');

      // Cancel the pending download
      const cancelled = downloadManager.cancelDownload(id);
      expect(cancelled).toBe(true);

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].status).toBe('failed');
      expect(queue[0].error).toBe('Download cancelled by user');
    });

    it('should cancel all downloads', () => {
      downloadManager.updateConfig({ autoDownload: false });
      downloadManager.addDownload('https://example.com/video1.mp4');
      downloadManager.addDownload('https://example.com/video2.mp4');

      downloadManager.cancelAllDownloads();

      const queue = downloadManager.getDownloadQueue();
      expect(queue.every(item => item.status === 'failed')).toBe(true);
      expect(queue.every(item => item.error === 'Download cancelled by user')).toBe(true);
    });

    it('should retry failed downloads', async () => {
      // Mock initially failing, then succeeding download
      vi.spyOn(downloadManager as any, 'simulateDownload')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      downloadManager.updateConfig({ autoDownload: false, maxRetries: 3, retryDelay: 50 });
      downloadManager.addDownload('https://example.com/video.mp4');

      await downloadManager.processQueue();

      // Wait for retry to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Manually retry failed downloads
      downloadManager.retryFailedDownloads();
      await downloadManager.processQueue();

      const queue = downloadManager.getDownloadQueue();
      expect(queue[0].status).toBe('completed');
    });
  });

  describe('Queue Management', () => {
    it('should clear completed downloads', () => {
      downloadManager.updateConfig({ autoDownload: false });
      downloadManager.addDownload('https://example.com/video1.mp4');
      downloadManager.addDownload('https://example.com/video2.mp4');

      // Manually set one as completed
      const queue = downloadManager.getDownloadQueue();
      queue[0].status = 'completed';

      downloadManager.clearCompleted();

      const updatedQueue = downloadManager.getDownloadQueue();
      expect(updatedQueue).toHaveLength(1);
      expect(updatedQueue[0].status).toBe('pending');
    });

    it('should clear all downloads', () => {
      downloadManager.addDownload('https://example.com/video1.mp4');
      downloadManager.addDownload('https://example.com/video2.mp4');

      downloadManager.clearAll();

      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('Property-Based Tests', () => {
    it('should maintain queue integrity', () => {
      fc.assert(fc.property(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 10 }),
        (urls) => {
          const manager = new DownloadManager();
          manager.updateConfig({ autoDownload: false });
          
          urls.forEach(url => manager.addDownload(url));
          
          const queue = manager.getDownloadQueue();
          const progress = manager.getProgress();
          
          // Queue integrity
          expect(queue.length).toBe(urls.length);
          expect(progress.total).toBe(urls.length);
          expect(progress.pending).toBe(urls.length);
          expect(progress.completed + progress.failed + progress.downloading + progress.pending).toBe(progress.total);
          
          // All items should be pending initially
          expect(queue.every(item => item.status === 'pending')).toBe(true);
          expect(queue.every(item => item.progress === 0)).toBe(true);
          expect(queue.every(item => item.retryCount === 0)).toBe(true);
        }
      ), { numRuns: 20 });
    });

    it('should handle configuration updates correctly', () => {
      fc.assert(fc.property(
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 10 }),
          retryDelay: fc.integer({ min: 100, max: 5000 }),
          enableNotifications: fc.boolean(),
          autoDownload: fc.boolean()
        }),
        (config) => {
          const manager = new DownloadManager();
          manager.updateConfig({ ...config, autoDownload: false }); // Force autoDownload to false for testing
          
          manager.addDownload('https://example.com/test.mp4');
          const queue = manager.getDownloadQueue();
          
          expect(queue[0].maxRetries).toBe(config.maxRetries);
        }
      ), { numRuns: 15 });
    });

    it('should generate valid filenames', () => {
      fc.assert(fc.property(
        fc.webUrl(),
        (url) => {
          const manager = new DownloadManager();
          manager.updateConfig({ autoDownload: false });
          manager.addDownload(url);
          
          const queue = manager.getDownloadQueue();
          const filename = queue[0].filename;
          
          expect(filename).toBeDefined();
          expect(typeof filename).toBe('string');
          expect(filename.length).toBeGreaterThan(0);
          
          // Should have a video extension
          expect(filename).toMatch(/\.(mp4|avi|mov|wmv|flv|webm)$/i);
        }
      ), { numRuns: 30 });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs gracefully', () => {
      expect(() => {
        downloadManager.addDownload('invalid-url');
      }).not.toThrow();

      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].filename).toMatch(/^video_\d+\.mp4$/);
    });

    it('should handle empty URL gracefully', () => {
      expect(() => {
        downloadManager.addDownload('');
      }).not.toThrow();

      const queue = downloadManager.getDownloadQueue();
      expect(queue).toHaveLength(1);
    });
  });

  describe('Notification System', () => {
    it('should request notification permission', async () => {
      // Mock Notification.requestPermission
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      Object.defineProperty(window.Notification, 'requestPermission', {
        value: mockRequestPermission,
        configurable: true
      });

      const result = await DownloadManager.requestNotificationPermission();
      
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle notification permission denied', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('denied');
      Object.defineProperty(window.Notification, 'requestPermission', {
        value: mockRequestPermission,
        configurable: true
      });

      const result = await DownloadManager.requestNotificationPermission();
      
      expect(result).toBe(false);
    });
  });
});