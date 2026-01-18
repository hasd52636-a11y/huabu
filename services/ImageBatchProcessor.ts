/**
 * 批量图片处理器
 * 
 * 功能：
 * - 解析多图API响应
 * - 并发下载和处理图片
 * - 生成新的Block数据
 * - 状态管理和错误处理
 */

import { Block, ProcessedImage, LayoutPosition } from '../types';

export class ImageBatchProcessor {
  private readonly MAX_CONCURRENT_DOWNLOADS = 3;
  private readonly DOWNLOAD_TIMEOUT = 30000; // 30秒超时

  /**
   * 处理多图API响应
   */
  async processMultiImageResponse(
    response: string,
    sourceBlockId: string
  ): Promise<ProcessedImage[]> {
    console.log('[ImageBatchProcessor] Processing multi-image response');
    
    try {
      // 尝试解析JSON格式的多图响应
      const parsedResponse = JSON.parse(response);
      
      if (parsedResponse.type === 'multiple_images' && Array.isArray(parsedResponse.images)) {
        console.log(`[ImageBatchProcessor] Found ${parsedResponse.images.length} images in response`);
        return await this.downloadImagesConcurrently(parsedResponse.images);
      }
    } catch (parseError) {
      console.log('[ImageBatchProcessor] Response is not JSON, treating as single image');
    }

    // 处理单张图片响应（向后兼容）
    return [{
      url: response,
      base64: response.startsWith('data:') ? response : undefined,
      index: 0,
      status: 'ready'
    }];
  }

  /**
   * 并发下载图片
   */
  async downloadImagesConcurrently(
    imageUrls: string[],
    maxConcurrent: number = this.MAX_CONCURRENT_DOWNLOADS
  ): Promise<ProcessedImage[]> {
    console.log(`[ImageBatchProcessor] Downloading ${imageUrls.length} images with max ${maxConcurrent} concurrent`);
    
    const processedImages: ProcessedImage[] = [];
    
    // 分批处理，避免过多并发请求
    for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
      const batch = imageUrls.slice(i, i + maxConcurrent);
      console.log(`[ImageBatchProcessor] Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(imageUrls.length / maxConcurrent)}`);
      
      const batchPromises = batch.map(async (url, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          const processedImage = await this.downloadAndProcessImage(url, globalIndex);
          return processedImage;
        } catch (error) {
          console.error(`[ImageBatchProcessor] Failed to process image ${globalIndex}:`, error);
          
          return {
            url,
            index: globalIndex,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Download failed'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedImages.push(...batchResults);
    }

    const successCount = processedImages.filter(img => img.status === 'ready').length;
    console.log(`[ImageBatchProcessor] ✓ Processed ${successCount}/${imageUrls.length} images successfully`);
    
    return processedImages;
  }

  /**
   * 下载并处理单张图片
   */
  private async downloadAndProcessImage(url: string, index: number): Promise<ProcessedImage> {
    console.log(`[ImageBatchProcessor] Downloading image ${index}: ${url.substring(0, 50)}...`);
    
    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Download timeout')), this.DOWNLOAD_TIMEOUT);
      });

      // 下载图片并转换为base64
      const downloadPromise = this.urlToBase64(url);
      
      const base64 = await Promise.race([downloadPromise, timeoutPromise]);
      
      if (!base64) {
        throw new Error('Failed to convert image to base64');
      }

      return {
        url,
        base64,
        index,
        status: 'ready'
      };
    } catch (error) {
      console.error(`[ImageBatchProcessor] Error processing image ${index}:`, error);
      throw error;
    }
  }

  /**
   * 将URL转换为base64
   */
  private async urlToBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const timeout = setTimeout(() => {
        console.warn('[ImageBatchProcessor] Image load timeout:', url);
        resolve(null);
      }, this.DOWNLOAD_TIMEOUT);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (err) {
          console.error("[ImageBatchProcessor] Canvas conversion failed", err);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.error("[ImageBatchProcessor] Image load failed for URL:", url);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * 生成新的图片Block数据
   */
  generateImageBlockData(
    processedImages: ProcessedImage[],
    sourceBlock: Block,
    layoutPositions: LayoutPosition[]
  ): Block[] {
    console.log('[ImageBatchProcessor] Generating block data for', processedImages.length, 'images');
    
    const newBlocks: Block[] = [];
    
    for (let i = 0; i < processedImages.length; i++) {
      const image = processedImages[i];
      const position = layoutPositions[i];
      
      if (!position) {
        console.warn(`[ImageBatchProcessor] No position found for image ${i}`);
        continue;
      }

      if (image.status !== 'ready') {
        console.warn(`[ImageBatchProcessor] Skipping image ${i} due to error:`, image.error);
        continue;
      }

      // 生成新的Block ID和编号
      const newBlockId = `${sourceBlock.id}-${i + 1}`;
      const newBlockNumber = `${sourceBlock.number}-${i + 1}`;

      const newBlock: Block = {
        id: newBlockId,
        type: 'image',
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        content: image.base64 || image.url,
        status: 'idle',
        number: newBlockNumber,
        aspectRatio: sourceBlock.aspectRatio,
        
        // 继承源模块的提示词
        originalPrompt: sourceBlock.originalPrompt,
        
        // 图片元数据
        imageMetadata: {
          ...sourceBlock.imageMetadata,
          generatedAt: Date.now()
        },
        
        // 多图关联信息
        multiImageGroupId: sourceBlock.multiImageGroupId || sourceBlock.id,
        multiImageIndex: i,
        isMultiImageSource: false
      };

      newBlocks.push(newBlock);
    }

    console.log(`[ImageBatchProcessor] ✓ Generated ${newBlocks.length} block data objects`);
    return newBlocks;
  }

  /**
   * 验证图片数据
   */
  validateImageData(processedImages: ProcessedImage[]): {
    valid: ProcessedImage[];
    invalid: ProcessedImage[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      errors: string[];
    };
  } {
    const valid: ProcessedImage[] = [];
    const invalid: ProcessedImage[] = [];
    const errors: string[] = [];

    for (const image of processedImages) {
      if (image.status === 'ready' && (image.base64 || image.url)) {
        valid.push(image);
      } else {
        invalid.push(image);
        if (image.error) {
          errors.push(`Image ${image.index}: ${image.error}`);
        }
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: processedImages.length,
        valid: valid.length,
        invalid: invalid.length,
        errors
      }
    };
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(processedImages: ProcessedImage[]): {
    totalImages: number;
    successfulImages: number;
    failedImages: number;
    successRate: number;
    averageSize?: number;
  } {
    const totalImages = processedImages.length;
    const successfulImages = processedImages.filter(img => img.status === 'ready').length;
    const failedImages = totalImages - successfulImages;
    const successRate = totalImages > 0 ? (successfulImages / totalImages) * 100 : 0;

    // 计算平均文件大小（如果有base64数据）
    const imagesWithData = processedImages.filter(img => img.base64);
    const averageSize = imagesWithData.length > 0 
      ? imagesWithData.reduce((sum, img) => sum + (img.base64?.length || 0), 0) / imagesWithData.length
      : undefined;

    return {
      totalImages,
      successfulImages,
      failedImages,
      successRate,
      averageSize
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理可能的内存引用
    console.log('[ImageBatchProcessor] Resources cleaned up');
  }
}

export default ImageBatchProcessor;