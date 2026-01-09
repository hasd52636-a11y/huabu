/**
 * Download Manager Service
 * Handles automatic downloading of completed videos with retry logic and progress tracking
 */

export interface DownloadItem {
  id: string;
  videoUrl: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  downloadPath?: string;
  createdAt: number;
  completedAt?: number;
}

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  downloading: number;
}

export interface DownloadConfig {
  downloadPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
  autoDownload?: boolean;
}

export class DownloadManager {
  private downloadQueue: DownloadItem[] = [];
  private activeDownloads = new Map<string, AbortController>();
  private onProgressUpdate?: (progress: DownloadProgress) => void;
  private onComplete?: (completedItems: DownloadItem[]) => void;
  private config: DownloadConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    enableNotifications: true,
    autoDownload: true
  };

  /**
   * Set progress update callback
   */
  setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.onProgressUpdate = callback;
  }

  /**
   * Set completion callback
   */
  setCompletionCallback(callback: (completedItems: DownloadItem[]) => void): void {
    this.onComplete = callback;
  }

  /**
   * Update download configuration
   */
  updateConfig(config: Partial<DownloadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add video to download queue
   */
  addDownload(videoUrl: string, filename?: string, downloadPath?: string): string {
    const id = `download_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const item: DownloadItem = {
      id,
      videoUrl,
      filename: filename || this.generateFilename(videoUrl),
      status: 'pending',
      progress: 0,
      retryCount: 0,
      maxRetries: this.config.maxRetries || 3,
      downloadPath: downloadPath || this.config.downloadPath,
      createdAt: Date.now()
    };

    this.downloadQueue.push(item);
    this.notifyProgress();

    // Start download if auto-download is enabled
    if (this.config.autoDownload) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Add multiple videos to download queue
   */
  addBatchDownloads(videos: Array<{ url: string; filename?: string }>): string[] {
    const ids: string[] = [];
    
    videos.forEach(video => {
      const id = this.addDownload(video.url, video.filename);
      ids.push(id);
    });

    return ids;
  }

  /**
   * Start processing download queue
   */
  async processQueue(): Promise<void> {
    const pendingItems = this.downloadQueue.filter(item => item.status === 'pending');
    
    // Process downloads concurrently (max 3 at a time)
    const maxConcurrent = 3;
    const chunks = this.chunkArray(pendingItems, maxConcurrent);
    
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(item => this.downloadItem(item))
      );
    }

    // Check if all downloads are complete
    this.checkCompletion();
  }

  /**
   * Download a single item
   */
  private async downloadItem(item: DownloadItem): Promise<void> {
    if (item.status !== 'pending') return;

    item.status = 'downloading';
    item.progress = 0;
    this.notifyProgress();

    const controller = new AbortController();
    this.activeDownloads.set(item.id, controller);

    try {
      await this.performDownload(item, controller.signal);
      
      item.status = 'completed';
      item.progress = 100;
      item.completedAt = Date.now();
      this.activeDownloads.delete(item.id);
      
      this.notifyProgress();
    } catch (error) {
      this.activeDownloads.delete(item.id);
      await this.handleDownloadError(item, error);
    }
  }

  /**
   * Perform the actual download
   */
  private async performDownload(item: DownloadItem, signal: AbortSignal): Promise<void> {
    try {
      // In a real implementation, this would use the browser's download API
      // For now, we'll simulate the download process
      await this.simulateDownload(item, signal);
      
      // In a real browser environment, you would use:
      // const response = await fetch(item.videoUrl, { signal });
      // const blob = await response.blob();
      // this.triggerBrowserDownload(blob, item.filename, item.downloadPath);
      
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Download cancelled');
      }
      throw error;
    }
  }

  /**
   * Simulate download for testing purposes
   */
  private async simulateDownload(item: DownloadItem, signal: AbortSignal): Promise<void> {
    const totalSteps = 10;
    
    for (let step = 0; step <= totalSteps; step++) {
      if (signal.aborted) {
        throw new Error('Download cancelled');
      }
      
      // Simulate download progress
      item.progress = Math.round((step / totalSteps) * 100);
      this.notifyProgress();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // Simulate occasional failures for testing
      if (step === 5 && Math.random() < 0.1) {
        throw new Error('Network error during download');
      }
    }
  }

  /**
   * Trigger browser download (real implementation)
   */
  private triggerBrowserDownload(blob: Blob, filename: string, downloadPath?: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // If download path is specified, we can't directly control it in browsers
    // This would require a browser extension or native app integration
    if (downloadPath) {
      console.log(`Download path specified: ${downloadPath}/${filename}`);
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Handle download errors and retry logic
   */
  private async handleDownloadError(item: DownloadItem, error: any): Promise<void> {
    item.error = error instanceof Error ? error.message : 'Unknown download error';
    item.retryCount++;

    if (item.retryCount < item.maxRetries) {
      // Schedule retry
      item.status = 'pending';
      item.progress = 0;
      
      setTimeout(() => {
        this.downloadItem(item);
      }, this.config.retryDelay || 2000);
      
      console.log(`Download retry ${item.retryCount}/${item.maxRetries} for ${item.filename}`);
    } else {
      // Max retries reached
      item.status = 'failed';
      item.progress = 0;
      console.error(`Download failed permanently for ${item.filename}:`, item.error);
    }

    this.notifyProgress();
  }

  /**
   * Cancel a download
   */
  cancelDownload(id: string): boolean {
    const controller = this.activeDownloads.get(id);
    const item = this.downloadQueue.find(item => item.id === id);
    
    if (controller) {
      // Cancel active download
      controller.abort();
      this.activeDownloads.delete(id);
      
      if (item) {
        item.status = 'failed';
        item.error = 'Download cancelled by user';
        this.notifyProgress();
      }
      
      return true;
    } else if (item && item.status === 'pending') {
      // Cancel pending download
      item.status = 'failed';
      item.error = 'Download cancelled by user';
      this.notifyProgress();
      return true;
    }
    
    return false;
  }

  /**
   * Cancel all active downloads
   */
  cancelAllDownloads(): void {
    // Cancel active downloads
    this.activeDownloads.forEach((controller, id) => {
      controller.abort();
      const item = this.downloadQueue.find(item => item.id === id);
      if (item) {
        item.status = 'failed';
        item.error = 'Download cancelled by user';
      }
    });
    
    // Also cancel pending downloads
    this.downloadQueue.forEach(item => {
      if (item.status === 'pending') {
        item.status = 'failed';
        item.error = 'Download cancelled by user';
      }
    });
    
    this.activeDownloads.clear();
    this.notifyProgress();
  }

  /**
   * Retry failed downloads
   */
  retryFailedDownloads(): void {
    const failedItems = this.downloadQueue.filter(item => 
      item.status === 'failed' && item.retryCount < item.maxRetries
    );
    
    failedItems.forEach(item => {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
    });
    
    if (failedItems.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get current download progress
   */
  getProgress(): DownloadProgress {
    const total = this.downloadQueue.length;
    const completed = this.downloadQueue.filter(item => item.status === 'completed').length;
    const failed = this.downloadQueue.filter(item => item.status === 'failed').length;
    const downloading = this.downloadQueue.filter(item => item.status === 'downloading').length;
    const pending = this.downloadQueue.filter(item => item.status === 'pending').length;

    return {
      total,
      completed,
      failed,
      downloading,
      pending
    };
  }

  /**
   * Get download queue
   */
  getDownloadQueue(): DownloadItem[] {
    return [...this.downloadQueue];
  }

  /**
   * Clear completed downloads from queue
   */
  clearCompleted(): void {
    this.downloadQueue = this.downloadQueue.filter(item => item.status !== 'completed');
    this.notifyProgress();
  }

  /**
   * Clear all downloads from queue
   */
  clearAll(): void {
    this.cancelAllDownloads();
    this.downloadQueue = [];
    this.notifyProgress();
  }

  /**
   * Generate filename from URL
   */
  private generateFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'video';
      
      // Ensure it has a video extension
      if (!filename.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
        return `${filename}.mp4`;
      }
      
      return filename;
    } catch {
      return `video_${Date.now()}.mp4`;
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Notify progress update
   */
  private notifyProgress(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.getProgress());
    }
  }

  /**
   * Check if all downloads are complete and notify
   */
  private checkCompletion(): void {
    const progress = this.getProgress();
    const allComplete = progress.pending === 0 && progress.downloading === 0;
    
    if (allComplete && progress.total > 0) {
      const completedItems = this.downloadQueue.filter(item => item.status === 'completed');
      
      if (this.onComplete) {
        this.onComplete(completedItems);
      }
      
      // Show notification if enabled
      if (this.config.enableNotifications && completedItems.length > 0) {
        this.showCompletionNotification(completedItems.length, progress.failed);
      }
    }
  }

  /**
   * Show completion notification
   */
  private showCompletionNotification(completed: number, failed: number): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const message = failed > 0 
        ? `${completed} videos downloaded, ${failed} failed`
        : `${completed} videos downloaded successfully`;
        
      new Notification('Batch Video Download Complete', {
        body: message,
        icon: '/favicon.ico'
      });
    } else {
      // Fallback to console log
      console.log(`Download complete: ${completed} videos downloaded, ${failed} failed`);
    }
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

export default DownloadManager;