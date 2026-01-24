/**
 * Download Manager Service
 * Handles automatic downloading of completed videos with retry logic and progress tracking
 * Enhanced for batch operations and directory organization
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
  executionId?: string; // For batch organization
  batchId?: string; // For grouping related downloads
}

export interface BatchDownloadConfig {
  executionId: string;
  batchId?: string;
  baseDirectory?: string;
  createSubdirectory?: boolean;
  subdirectoryName?: string;
  fileNamingPattern?: 'original' | 'sequential' | 'timestamp';
  maxConcurrentDownloads?: number;
}

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  downloading: number;
  totalSize?: number;
  downloadedSize?: number;
}

export interface BatchProgress {
  batchId: string;
  executionId: string;
  progress: DownloadProgress;
  startTime: number;
  endTime?: number;
  directory?: string;
}

export interface DownloadConfig {
  downloadPath?: string;
  maxRetries?: number;
  retryDelay?: number;
  enableNotifications?: boolean;
  autoDownload?: boolean;
  maxConcurrentDownloads?: number;
  createExecutionDirectories?: boolean;
  fileNamingPattern?: 'original' | 'sequential' | 'timestamp';
  enableSilentDownload?: boolean; // 新增：启用静默下载
  batchDownloadDelay?: number; // 新增：批量下载间隔（毫秒）
}

export class DownloadManager {
  private downloadQueue: DownloadItem[] = [];
  private activeDownloads = new Map<string, AbortController>();
  private batchProgress = new Map<string, BatchProgress>();
  private onProgressUpdate?: (progress: DownloadProgress) => void;
  private onBatchProgressUpdate?: (batchProgress: BatchProgress) => void;
  private onComplete?: (completedItems: DownloadItem[]) => void;
  private onBatchComplete?: (batchId: string, batchProgress: BatchProgress) => void;
  private config: DownloadConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    enableNotifications: true,
    autoDownload: true,
    maxConcurrentDownloads: 3,
    createExecutionDirectories: true,
    fileNamingPattern: 'original',
    enableSilentDownload: true, // 默认启用静默下载
    batchDownloadDelay: 500 // 批量下载间隔500ms
  };

  /**
   * Set progress update callback
   */
  setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.onProgressUpdate = callback;
  }

  /**
   * Set batch progress update callback
   */
  setBatchProgressCallback(callback: (batchProgress: BatchProgress) => void): void {
    this.onBatchProgressUpdate = callback;
  }

  /**
   * Set completion callback
   */
  setCompletionCallback(callback: (completedItems: DownloadItem[]) => void): void {
    this.onComplete = callback;
  }

  /**
   * Set batch completion callback
   */
  setBatchCompletionCallback(callback: (batchId: string, batchProgress: BatchProgress) => void): void {
    this.onBatchComplete = callback;
  }

  /**
   * Update download configuration
   */
  updateConfig(config: Partial<DownloadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current download configuration
   */
  getConfig(): DownloadConfig {
    return { ...this.config };
  }

  /**
   * Add video to download queue
   */
  addDownload(videoUrl: string, filename?: string, downloadPath?: string, executionId?: string, batchId?: string): string {
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
      createdAt: Date.now(),
      executionId,
      batchId
    };

    this.downloadQueue.push(item);
    this.notifyProgress();

    // Update batch progress if applicable
    if (batchId && executionId) {
      this.updateBatchProgress(batchId, executionId);
    }

    // Start download if auto-download is enabled
    if (this.config.autoDownload) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Add multiple videos to download queue
   */
  addBatchDownloads(videos: Array<{ url: string; filename?: string }>, batchConfig?: BatchDownloadConfig): string[] {
    const ids: string[] = [];
    const batchId = batchConfig?.batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const executionId = batchConfig?.executionId || `exec_${Date.now()}`;
    
    // Initialize batch progress tracking
    this.initializeBatchProgress(batchId, executionId, videos.length);

    // Determine download directory
    const downloadDirectory = this.determineDownloadDirectory(batchConfig);
    
    videos.forEach((video, index) => {
      const filename = this.generateBatchFilename(video, index, batchConfig);
      const id = this.addDownload(video.url, filename, downloadDirectory, executionId, batchId);
      ids.push(id);
    });

    return ids;
  }

  /**
   * Add downloads for a complete workflow execution
   */
  addExecutionDownloads(executionResults: Array<{ url: string; blockId: string; blockNumber: string }>, executionId: string): string[] {
    const batchConfig: BatchDownloadConfig = {
      executionId,
      batchId: `execution_${executionId}`,
      createSubdirectory: this.config.createExecutionDirectories,
      subdirectoryName: `execution_${executionId}_${new Date().toISOString().split('T')[0]}`,
      fileNamingPattern: this.config.fileNamingPattern,
      maxConcurrentDownloads: this.config.maxConcurrentDownloads
    };

    const videos = executionResults.map(result => ({
      url: result.url,
      filename: `${result.blockNumber}_${result.blockId}.mp4`
    }));

    return this.addBatchDownloads(videos, batchConfig);
  }

  /**
   * Start processing download queue
   */
  async processQueue(): Promise<void> {
    const pendingItems = this.downloadQueue.filter(item => item.status === 'pending');
    
    // Process downloads concurrently with configurable limit
    const maxConcurrent = this.config.maxConcurrentDownloads || 3;
    const chunks = this.chunkArray(pendingItems, maxConcurrent);
    
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(item => this.downloadItem(item))
      );
    }

    // Check if all downloads are complete
    this.checkCompletion();
    this.checkBatchCompletions();
  }

  /**
   * Process downloads for a specific batch with delay between downloads
   */
  async processBatch(batchId: string): Promise<void> {
    const batchItems = this.downloadQueue.filter(item => 
      item.batchId === batchId && item.status === 'pending'
    );
    
    if (batchItems.length === 0) return;

    console.log(`[DownloadManager] 开始处理批次 ${batchId}，共 ${batchItems.length} 个文件`);

    // 对于自动化批量下载，使用顺序下载避免浏览器限制
    if (this.config.enableSilentDownload) {
      // 顺序下载，每个文件之间有短暂延迟
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        console.log(`[DownloadManager] 下载进度: ${i + 1}/${batchItems.length} - ${item.filename}`);
        
        try {
          await this.downloadItem(item);
          
          // 在下载之间添加延迟，避免浏览器阻止
          if (i < batchItems.length - 1 && this.config.batchDownloadDelay && this.config.batchDownloadDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.batchDownloadDelay));
          }
        } catch (error) {
          console.error(`[DownloadManager] 下载失败: ${item.filename}`, error);
          // 继续下载其他文件，不中断整个批次
        }
      }
    } else {
      // 传统并发下载
      const maxConcurrent = this.config.maxConcurrentDownloads || 3;
      const chunks = this.chunkArray(batchItems, maxConcurrent);
      
      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map(item => this.downloadItem(item))
        );
      }
    }

    console.log(`[DownloadManager] 批次 ${batchId} 处理完成`);
    this.checkBatchCompletion(batchId);
  }

  /**
   * Download a single item
   */
  private async downloadItem(item: DownloadItem): Promise<void> {
    if (item.status !== 'pending') return;

    item.status = 'downloading';
    item.progress = 0;
    this.notifyProgress();
    
    // Update batch progress if applicable
    if (item.batchId) {
      this.updateBatchProgress(item.batchId, item.executionId);
    }

    const controller = new AbortController();
    this.activeDownloads.set(item.id, controller);

    try {
      await this.performDownload(item, controller.signal);
      
      item.status = 'completed';
      item.progress = 100;
      item.completedAt = Date.now();
      this.activeDownloads.delete(item.id);
      
      this.notifyProgress();
      
      // Update batch progress if applicable
      if (item.batchId) {
        this.updateBatchProgress(item.batchId, item.executionId);
      }
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
      console.log(`[DownloadManager] 开始下载:`, {
        filename: item.filename,
        urlType: item.videoUrl.startsWith('data:') ? 'data-url' : 'http-url',
        urlLength: item.videoUrl.length
      });
      
      let blob: Blob;
      
      if (item.videoUrl.startsWith('data:')) {
        // 处理 data URL (如 data:image/png;base64,...)
        try {
          const response = await fetch(item.videoUrl);
          blob = await response.blob();
        } catch (error) {
          console.error('[DownloadManager] Data URL 处理失败:', error);
          throw error;
        }
      } else if (item.videoUrl.startsWith('http')) {
        // 处理 HTTP URL
        try {
          const response = await fetch(item.videoUrl, { signal });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          blob = await response.blob();
        } catch (error) {
          console.error('[DownloadManager] HTTP URL 下载失败:', error);
          throw error;
        }
      } else {
        // 处理纯文本内容 - 创建文本文件
        blob = new Blob([item.videoUrl], { type: 'text/plain;charset=utf-8' });
        console.log(`[DownloadManager] 创建文本文件:`, {
          filename: item.filename,
          contentLength: item.videoUrl.length
        });
      }
      
      // 触发浏览器下载
      this.triggerBrowserDownload(blob, item.filename, item.downloadPath);
      
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Download cancelled');
      }
      console.error('[DownloadManager] 下载失败:', error);
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
   * Trigger browser download (enhanced for automation)
   */
  private triggerBrowserDownload(blob: Blob, filename: string, downloadPath?: string): void {
    const url = URL.createObjectURL(blob);
    
    // 如果启用了静默下载，尝试使用静默方法
    if (this.config.enableSilentDownload) {
      this.triggerSilentDownload(blob, filename, downloadPath);
      return;
    }
    
    // 传统下载方法
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    
    document.body.appendChild(link);
    
    // 使用 setTimeout 确保在下一个事件循环中执行，避免阻塞
    setTimeout(() => {
      link.click();
      
      // 延迟清理，确保下载开始
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 100);
    }, 0);
  }

  /**
   * 静默下载方法 - 使用Google方案（最保险、安全、简单）
   */
  private async triggerSilentDownload(blob: Blob, filename: string, downloadPath?: string): Promise<void> {
    try {
      console.log(`[DownloadManager] 静默下载: ${filename}`);
      
      // Google方案：优化的传统下载 + 时机控制
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // 设置下载属性
      link.href = url;
      link.download = filename;
      
      // Google的关键优化：完全隐藏但保持功能
      Object.assign(link.style, {
        position: 'fixed',
        left: '-99999px',
        top: '-99999px',
        width: '0',
        height: '0',
        opacity: '0',
        visibility: 'hidden',
        display: 'none'
      });
      
      // Google的属性设置
      link.setAttribute('target', '_self');
      link.setAttribute('rel', 'noopener');
      
      // 添加到DOM
      document.body.appendChild(link);
      
      // Google的时机控制：使用双重requestAnimationFrame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 直接点击，不使用事件
          link.click();
          console.log(`[DownloadManager] ✓ Google方案下载: ${filename}`);
          
          // 立即清理
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          }, 100);
        });
      });
      
    } catch (error) {
      console.warn('[DownloadManager] Google方案失败:', error);
      console.log(`[DownloadManager] 跳过下载避免弹窗: ${filename}`);
    }
  }

  /**
   * 优化的传统下载方法 - 减少用户干扰
   */
  private triggerOptimizedTraditionalDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // 设置下载属性
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    link.style.top = '-9999px';
    
    // 设置额外属性尝试减少浏览器干扰
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    
    document.body.appendChild(link);
    
    // 使用 requestAnimationFrame 确保在下一帧执行
    requestAnimationFrame(() => {
      link.click();
      
      // 延迟清理，确保下载开始
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 500);
    });
    
    console.log(`[DownloadManager] ✓ 优化传统下载: ${filename}`);
  }

  /**
   * 传统下载方法（降级方案）
   */
  private triggerTraditionalDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
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
   * Get progress for a specific batch
   */
  getBatchProgress(batchId: string): DownloadProgress {
    const batchItems = this.downloadQueue.filter(item => item.batchId === batchId);
    const total = batchItems.length;
    const completed = batchItems.filter(item => item.status === 'completed').length;
    const failed = batchItems.filter(item => item.status === 'failed').length;
    const downloading = batchItems.filter(item => item.status === 'downloading').length;
    const pending = batchItems.filter(item => item.status === 'pending').length;

    return {
      total,
      completed,
      failed,
      downloading,
      pending
    };
  }

  /**
   * Get all batch progress information
   */
  getAllBatchProgress(): BatchProgress[] {
    return Array.from(this.batchProgress.values());
  }

  /**
   * Get progress for a specific execution
   */
  getExecutionProgress(executionId: string): DownloadProgress {
    const executionItems = this.downloadQueue.filter(item => item.executionId === executionId);
    const total = executionItems.length;
    const completed = executionItems.filter(item => item.status === 'completed').length;
    const failed = executionItems.filter(item => item.status === 'failed').length;
    const downloading = executionItems.filter(item => item.status === 'downloading').length;
    const pending = executionItems.filter(item => item.status === 'pending').length;

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
   * Initialize batch progress tracking
   */
  private initializeBatchProgress(batchId: string, executionId?: string, totalItems: number = 0): void {
    const batchProgress: BatchProgress = {
      batchId,
      executionId: executionId || '',
      progress: {
        total: totalItems,
        completed: 0,
        failed: 0,
        downloading: 0,
        pending: totalItems
      },
      startTime: Date.now()
    };

    this.batchProgress.set(batchId, batchProgress);
  }

  /**
   * Update batch progress
   */
  private updateBatchProgress(batchId: string, executionId?: string): void {
    const progress = this.getBatchProgress(batchId);
    const existing = this.batchProgress.get(batchId);

    if (existing) {
      existing.progress = progress;
      existing.executionId = executionId || existing.executionId;
      
      // Set end time if all items are complete
      if (progress.pending === 0 && progress.downloading === 0) {
        existing.endTime = Date.now();
      }

      this.batchProgress.set(batchId, existing);

      // Notify batch progress update
      if (this.onBatchProgressUpdate) {
        this.onBatchProgressUpdate(existing);
      }
    }
  }

  /**
   * Determine download directory based on batch configuration
   */
  private determineDownloadDirectory(batchConfig?: BatchDownloadConfig): string | undefined {
    if (!batchConfig) return this.config.downloadPath;

    let directory = batchConfig.baseDirectory || this.config.downloadPath;

    if (batchConfig.createSubdirectory && batchConfig.subdirectoryName) {
      directory = directory ? `${directory}/${batchConfig.subdirectoryName}` : batchConfig.subdirectoryName;
    }

    return directory;
  }

  /**
   * Generate filename for batch downloads
   */
  private generateBatchFilename(video: { url: string; filename?: string }, index: number, batchConfig?: BatchDownloadConfig): string {
    if (video.filename) return video.filename;

    const baseFilename = this.generateFilename(video.url);
    const pattern = batchConfig?.fileNamingPattern || this.config.fileNamingPattern;

    switch (pattern) {
      case 'sequential':
        const paddedIndex = (index + 1).toString().padStart(3, '0');
        return `${paddedIndex}_${baseFilename}`;
      
      case 'timestamp':
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${timestamp}_${baseFilename}`;
      
      case 'original':
      default:
        return baseFilename;
    }
  }

  /**
   * Check batch completions
   */
  private checkBatchCompletions(): void {
    for (const [batchId, batchProgress] of this.batchProgress.entries()) {
      this.checkBatchCompletion(batchId);
    }
  }

  /**
   * Check if a specific batch is complete
   */
  private checkBatchCompletion(batchId: string): void {
    const progress = this.getBatchProgress(batchId);
    const batchInfo = this.batchProgress.get(batchId);
    
    if (!batchInfo) return;

    const allComplete = progress.pending === 0 && progress.downloading === 0;
    
    if (allComplete && progress.total > 0 && !batchInfo.endTime) {
      batchInfo.endTime = Date.now();
      batchInfo.progress = progress;
      
      this.batchProgress.set(batchId, batchInfo);

      // Notify batch completion
      if (this.onBatchComplete) {
        this.onBatchComplete(batchId, batchInfo);
      }

      // Show notification if enabled
      if (this.config.enableNotifications && progress.completed > 0) {
        this.showBatchCompletionNotification(batchId, progress.completed, progress.failed);
      }
    }
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
   * Show batch completion notification
   */
  private showBatchCompletionNotification(batchId: string, completed: number, failed: number): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const message = failed > 0 
        ? `Batch ${batchId}: ${completed} videos downloaded, ${failed} failed`
        : `Batch ${batchId}: ${completed} videos downloaded successfully`;
        
      new Notification('Batch Download Complete', {
        body: message,
        icon: '/favicon.ico'
      });
    } else {
      // Fallback to console log
      console.log(`Batch ${batchId} complete: ${completed} videos downloaded, ${failed} failed`);
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

  /**
   * Cancel downloads for a specific batch
   */
  cancelBatch(batchId: string): void {
    const batchItems = this.downloadQueue.filter(item => item.batchId === batchId);
    
    batchItems.forEach(item => {
      this.cancelDownload(item.id);
    });

    // Update batch progress
    this.updateBatchProgress(batchId);
  }

  /**
   * Retry failed downloads in a batch
   */
  retryBatch(batchId: string): void {
    const failedItems = this.downloadQueue.filter(item => 
      item.batchId === batchId && 
      item.status === 'failed' && 
      item.retryCount < item.maxRetries
    );
    
    failedItems.forEach(item => {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
    });
    
    if (failedItems.length > 0) {
      this.processBatch(batchId);
    }
  }

  /**
   * Clear completed downloads from a batch
   */
  clearBatchCompleted(batchId: string): void {
    this.downloadQueue = this.downloadQueue.filter(item => 
      !(item.batchId === batchId && item.status === 'completed')
    );
    
    this.updateBatchProgress(batchId);
    this.notifyProgress();
  }

  /**
   * Get downloads for a specific batch
   */
  getBatchDownloads(batchId: string): DownloadItem[] {
    return this.downloadQueue.filter(item => item.batchId === batchId);
  }

  /**
   * Get downloads for a specific execution
   */
  getExecutionDownloads(executionId: string): DownloadItem[] {
    return this.downloadQueue.filter(item => item.executionId === executionId);
  }
}

export default DownloadManager;