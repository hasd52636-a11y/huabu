/**
 * ThumbnailGenerator - 缩略图生成服务
 * 
 * 功能：
 * - 为图片和视频生成缩略图
 * - 缓存和优化缩略图
 * - 处理不同媒体格式
 * - 提供错误处理和回退机制
 */

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ThumbnailGenerator {
  private cache: Map<string, string>;
  private readonly defaultOptions: Required<ThumbnailOptions> = {
    width: 200,
    height: 200,
    quality: 0.8,
    format: 'jpeg'
  };

  constructor() {
    this.cache = new Map();
  }

  /**
   * 生成图片缩略图
   */
  async generateImageThumbnail(
    imageUrl: string, 
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = `img_${imageUrl}_${opts.width}x${opts.height}_${opts.quality}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // 处理跨域图片
      
      const thumbnail = await new Promise<string>((resolve, reject) => {
        img.onload = () => {
          try {
            // 计算缩略图尺寸，保持宽高比
            const { width: thumbWidth, height: thumbHeight } = this.calculateThumbnailSize(
              img.width, 
              img.height, 
              opts.width, 
              opts.height
            );

            canvas.width = thumbWidth;
            canvas.height = thumbHeight;

            // 绘制缩略图
            ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

            // 转换为Base64
            const mimeType = `image/${opts.format}`;
            const dataUrl = canvas.toDataURL(mimeType, opts.quality);
            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };

        // 设置超时
        setTimeout(() => {
          reject(new Error('图片加载超时'));
        }, 10000);

        img.src = imageUrl;
      });

      // 缓存结果
      this.cache.set(cacheKey, thumbnail);
      return thumbnail;

    } catch (error) {
      console.error('[ThumbnailGenerator] Image thumbnail generation failed:', error);
      
      // 返回默认图片缩略图
      return this.generateDefaultImageThumbnail(opts);
    }
  }

  /**
   * 生成视频缩略图
   */
  async generateVideoThumbnail(
    videoUrl: string, 
    options: ThumbnailOptions = {},
    seekTime: number = 1
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = `vid_${videoUrl}_${opts.width}x${opts.height}_${seekTime}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }

      video.crossOrigin = 'anonymous';
      video.muted = true; // 静音以避免自动播放限制

      const thumbnail = await new Promise<string>((resolve, reject) => {
        let hasResolved = false;

        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };

        const onLoadedData = () => {
          if (hasResolved) return;
          
          try {
            // 设置视频时间点
            video.currentTime = Math.min(seekTime, video.duration || seekTime);
          } catch (error) {
            cleanup();
            reject(error);
          }
        };

        const onSeeked = () => {
          if (hasResolved) return;
          hasResolved = true;
          cleanup();

          try {
            // 计算缩略图尺寸
            const { width: thumbWidth, height: thumbHeight } = this.calculateThumbnailSize(
              video.videoWidth, 
              video.videoHeight, 
              opts.width, 
              opts.height
            );

            canvas.width = thumbWidth;
            canvas.height = thumbHeight;

            // 绘制视频帧
            ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);

            // 转换为Base64
            const mimeType = `image/${opts.format}`;
            const dataUrl = canvas.toDataURL(mimeType, opts.quality);
            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        };

        const onError = () => {
          if (hasResolved) return;
          hasResolved = true;
          cleanup();
          reject(new Error('视频加载失败'));
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);

        // 设置超时
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            cleanup();
            reject(new Error('视频缩略图生成超时'));
          }
        }, 15000);

        video.src = videoUrl;
      });

      // 缓存结果
      this.cache.set(cacheKey, thumbnail);
      return thumbnail;

    } catch (error) {
      console.error('[ThumbnailGenerator] Video thumbnail generation failed:', error);
      
      // 返回默认视频缩略图
      return this.generateDefaultVideoThumbnail(opts);
    }
  }

  /**
   * 计算缩略图尺寸，保持宽高比
   */
  private calculateThumbnailSize(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth === 0 || originalHeight === 0) {
      return { width: maxWidth, height: maxHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    let width = maxWidth;
    let height = maxHeight;

    if (aspectRatio > 1) {
      // 宽图
      height = width / aspectRatio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    } else {
      // 高图
      width = height * aspectRatio;
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
    }

    return { 
      width: Math.round(width), 
      height: Math.round(height) 
    };
  }

  /**
   * 生成默认图片缩略图
   */
  private generateDefaultImageThumbnail(options: Required<ThumbnailOptions>): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }

    canvas.width = options.width;
    canvas.height = options.height;

    // 绘制默认图片图标
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, options.width, options.height);
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = `${Math.min(options.width, options.height) * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼️', options.width / 2, options.height / 2);

    return canvas.toDataURL(`image/${options.format}`, options.quality);
  }

  /**
   * 生成默认视频缩略图
   */
  private generateDefaultVideoThumbnail(options: Required<ThumbnailOptions>): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }

    canvas.width = options.width;
    canvas.height = options.height;

    // 绘制默认视频图标
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, options.width, options.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.min(options.width, options.height) * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎬', options.width / 2, options.height / 2);

    return canvas.toDataURL(`image/${options.format}`, options.quality);
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[ThumbnailGenerator] Cache cleared');
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): { size: number; memoryUsage: number } {
    let memoryUsage = 0;
    this.cache.forEach(thumbnail => {
      // 估算Base64字符串的内存使用
      memoryUsage += thumbnail.length * 2; // 每个字符大约2字节
    });

    return {
      size: this.cache.size,
      memoryUsage
    };
  }

  /**
   * 清理过大的缓存
   */
  public cleanupCache(maxSize: number = 50): void {
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries());
      const toDelete = entries.slice(0, this.cache.size - maxSize);
      
      toDelete.forEach(([key]) => {
        this.cache.delete(key);
      });

      console.log(`[ThumbnailGenerator] Cleaned up ${toDelete.length} cache entries`);
    }
  }

  /**
   * 批量生成缩略图
   */
  public async generateBatch(
    items: Array<{ url: string; type: 'image' | 'video' }>,
    options: ThumbnailOptions = {}
  ): Promise<Array<{ url: string; thumbnail: string; error?: string }>> {
    const results = await Promise.allSettled(
      items.map(async item => {
        try {
          const thumbnail = item.type === 'image' 
            ? await this.generateImageThumbnail(item.url, options)
            : await this.generateVideoThumbnail(item.url, options);
          
          return { url: item.url, thumbnail };
        } catch (error) {
          return { 
            url: item.url, 
            thumbnail: item.type === 'image' 
              ? this.generateDefaultImageThumbnail({ ...this.defaultOptions, ...options })
              : this.generateDefaultVideoThumbnail({ ...this.defaultOptions, ...options }),
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        url: '',
        thumbnail: '',
        error: '生成失败'
      }
    );
  }
}

// 单例实例
export const thumbnailGenerator = new ThumbnailGenerator();