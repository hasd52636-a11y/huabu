/**
 * BatchDownloadService - 批量下载服务
 * 从AUTOCANVAS智慧画布项目移植，增强批量下载功能
 */

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  type: 'image' | 'video' | 'text';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface BatchDownloadOptions {
  maxConcurrent?: number;
  retryAttempts?: number;
  downloadPath?: string;
  onProgress?: (item: DownloadItem, overall: { completed: number; total: number }) => void;
  onComplete?: (results: DownloadItem[]) => void;
  onError?: (error: Error, item: DownloadItem) => void;
}

export class BatchDownloadService {
  private downloadQueue: DownloadItem[] = [];
  private activeDownloads = new Map<string, AbortController>();
  private maxConcurrent = 3;
  private retryAttempts = 3;

  /**
   * 添加下载项到队列
   */
  addDownloadItem(url: string, filename: string, type: 'image' | 'video' | 'text'): string {
    const item: DownloadItem = {
      id: crypto.randomUUID(),
      url,
      filename,
      type,
      status: 'pending',
      progress: 0
    };
    
    this.downloadQueue.push(item);
    return item.id;
  }

  /**
   * 添加文本内容下载项到队列
   * 将文本内容转换为Blob URL，下载完成后自动清理
   */
  addTextDownloadItem(textContent: string, filename: string): string {
    // 将文本内容转换为Blob URL
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载项，添加清理标记
    const item: DownloadItem & { blobUrl?: string } = {
      id: crypto.randomUUID(),
      url,
      filename,
      type: 'text',
      status: 'pending',
      progress: 0,
      blobUrl: url // 保存blobUrl以便后续清理
    };
    
    this.downloadQueue.push(item as DownloadItem);
    return item.id;
  }

  /**
   * 开始批量下载
   */
  async startBatchDownload(options: BatchDownloadOptions = {}): Promise<DownloadItem[]> {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.retryAttempts = options.retryAttempts || 3;

    const results: DownloadItem[] = [];
    const activePromises: Promise<void>[] = [];

    for (const item of this.downloadQueue) {
      if (activePromises.length >= this.maxConcurrent) {
        await Promise.race(activePromises);
      }

      const downloadPromise = this.downloadItem(item, options)
        .then(() => {
          results.push(item);
          options.onProgress?.(item, { 
            completed: results.length, 
            total: this.downloadQueue.length 
          });
        })
        .catch((error) => {
          item.status = 'failed';
          item.error = error.message;
          results.push(item);
          options.onError?.(error, item);
        })
        .finally(() => {
          const index = activePromises.indexOf(downloadPromise);
          if (index > -1) {
            activePromises.splice(index, 1);
          }
        });

      activePromises.push(downloadPromise);
    }

    // 等待所有下载完成
    await Promise.all(activePromises);
    
    options.onComplete?.(results);
    return results;
  }

  /**
   * 下载单个项目
   */
  private async downloadItem(item: DownloadItem, options: BatchDownloadOptions): Promise<void> {
    const controller = new AbortController();
    this.activeDownloads.set(item.id, controller);

    let attempts = 0;
    
    while (attempts < this.retryAttempts) {
      try {
        item.status = 'downloading';
        
        const response = await fetch(item.url, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            if (total > 0) {
              item.progress = Math.round((loaded / total) * 100);
            }
          }
        }

        // 合并所有chunks
        const blob = new Blob(chunks);
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.filename;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理
        URL.revokeObjectURL(url);
        
        // 如果是text类型且使用了blobUrl，额外清理
        const itemWithBlobUrl = item as DownloadItem & { blobUrl?: string };
        if (item.type === 'text' && itemWithBlobUrl.blobUrl) {
          try {
            URL.revokeObjectURL(itemWithBlobUrl.blobUrl);
            delete itemWithBlobUrl.blobUrl;
          } catch (e) {
            console.warn('Failed to revoke blob URL:', e);
          }
        }
        
        item.status = 'completed';
        item.progress = 100;
        break;

      } catch (error) {
        attempts++;
        
        // 如果是text类型且使用了blobUrl，在失败时也要清理
        if (attempts >= this.retryAttempts) {
          const itemWithBlobUrl = item as DownloadItem & { blobUrl?: string };
          if (item.type === 'text' && itemWithBlobUrl.blobUrl) {
            try {
              URL.revokeObjectURL(itemWithBlobUrl.blobUrl);
              delete itemWithBlobUrl.blobUrl;
            } catch (e) {
              console.warn('Failed to revoke blob URL on error:', e);
            }
          }
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    this.activeDownloads.delete(item.id);
  }

  /**
   * 取消下载
   */
  cancelDownload(itemId: string): void {
    const controller = this.activeDownloads.get(itemId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(itemId);
    }

    const item = this.downloadQueue.find(i => i.id === itemId);
    if (item) {
      item.status = 'failed';
      item.error = 'Cancelled by user';
    }
  }

  /**
   * 取消所有下载
   */
  cancelAllDownloads(): void {
    for (const controller of this.activeDownloads.values()) {
      controller.abort();
    }
    this.activeDownloads.clear();

    for (const item of this.downloadQueue) {
      if (item.status === 'downloading' || item.status === 'pending') {
        item.status = 'failed';
        item.error = 'Cancelled by user';
      }
    }
  }

  /**
   * 清空下载队列
   */
  clearQueue(): void {
    this.cancelAllDownloads();
    this.downloadQueue = [];
  }

  /**
   * 获取下载状态
   */
  getDownloadStatus(): {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.downloadQueue.length,
      pending: this.downloadQueue.filter(i => i.status === 'pending').length,
      downloading: this.downloadQueue.filter(i => i.status === 'downloading').length,
      completed: this.downloadQueue.filter(i => i.status === 'completed').length,
      failed: this.downloadQueue.filter(i => i.status === 'failed').length
    };
  }
}

// 单例实例
export const batchDownloadService = new BatchDownloadService();