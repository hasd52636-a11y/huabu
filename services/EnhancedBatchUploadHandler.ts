/**
 * EnhancedBatchUploadHandler - 增强的批量上传处理器
 * 从AUTOCANVAS智慧画布项目移植，提供更强大的批量上传功能
 */

import { BlockType } from '../types';

export interface BatchUploadItem {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video';
  originalName: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

export interface BatchUploadInput {
  blockType: BlockType;
  targetBlockId: string;
  items: BatchUploadItem[];
  metadata: {
    totalCount: number;
    sourceType: 'files' | 'folder' | 'text-with-separators';
    originalFileName?: string;
  };
}

export interface BatchUploadValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchUploadProgress {
  total: number;
  processed: number;
  completed: number;
  failed: number;
  currentItem?: string;
}

export class EnhancedBatchUploadHandler {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_BATCH_SIZE = 100; // 最大批量数量
  private static readonly SUPPORTED_TEXT_FORMATS = ['.txt', '.md', '.js', '.ts', '.tsx', '.json', '.css', '.html', '.doc', '.docx'];
  private static readonly SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  private static readonly SUPPORTED_VIDEO_FORMATS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];

  /**
   * 处理批量文件上传
   */
  static async processBatchUpload(
    files: FileList, 
    blockType: BlockType, 
    targetBlockId: string,
    onProgress?: (progress: BatchUploadProgress) => void
  ): Promise<BatchUploadInput> {
    const items: BatchUploadItem[] = [];
    const fileArray = Array.from(files);
    
    let processed = 0;
    let completed = 0;
    let failed = 0;

    for (const file of fileArray) {
      try {
        onProgress?.({
          total: fileArray.length,
          processed,
          completed,
          failed,
          currentItem: file.name
        });

        const item = await this.processFile(file, blockType);
        items.push(item);
        
        if (item.status === 'completed') {
          completed++;
        } else if (item.status === 'failed') {
          failed++;
        }
      } catch (error) {
        const errorItem: BatchUploadItem = {
          id: crypto.randomUUID(),
          content: '',
          type: this.getFileType(file.name),
          originalName: file.name,
          size: file.size,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误'
        };
        items.push(errorItem);
        failed++;
      }
      
      processed++;
    }

    onProgress?.({
      total: fileArray.length,
      processed,
      completed,
      failed
    });

    return {
      blockType,
      targetBlockId,
      items,
      metadata: {
        totalCount: items.length,
        sourceType: 'files'
      }
    };
  }

  /**
   * 处理文件夹上传
   */
  static async processFolderUpload(
    files: FileList,
    blockType: BlockType,
    targetBlockId: string,
    onProgress?: (progress: BatchUploadProgress) => void
  ): Promise<BatchUploadInput> {
    // 文件夹上传的处理逻辑与批量文件上传类似
    return this.processBatchUpload(files, blockType, targetBlockId, onProgress);
  }

  /**
   * 处理单个文件
   */
  private static async processFile(file: File, blockType: BlockType): Promise<BatchUploadItem> {
    const item: BatchUploadItem = {
      id: crypto.randomUUID(),
      content: '',
      type: this.getFileType(file.name),
      originalName: file.name,
      size: file.size,
      status: 'processing'
    };

    // 验证文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      item.status = 'failed';
      item.error = `文件大小超过限制 (${this.formatFileSize(file.size)} > ${this.formatFileSize(this.MAX_FILE_SIZE)})`;
      return item;
    }

    // 验证文件类型
    if (!this.isValidFileType(file.name, blockType)) {
      item.status = 'failed';
      item.error = `不支持的文件类型: ${this.getFileExtension(file.name)}`;
      return item;
    }

    try {
      // 根据文件类型处理内容
      if (blockType === 'text' || item.type === 'text') {
        item.content = await this.readTextFile(file);
      } else if (blockType === 'image' || item.type === 'image') {
        const result = await this.readImageFile(file);
        item.content = result.content;
        item.metadata = result.metadata;
      } else if (blockType === 'video' || item.type === 'video') {
        const result = await this.readVideoFile(file);
        item.content = result.content;
        item.metadata = result.metadata;
      }

      item.status = 'completed';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : '文件处理失败';
    }

    return item;
  }

  /**
   * 读取文本文件
   */
  private static readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 读取图片文件
   */
  private static readImageFile(file: File): Promise<{ content: string; metadata: any }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // 创建图片元素获取尺寸信息
        const img = new Image();
        img.onload = () => {
          resolve({
            content,
            metadata: {
              width: img.width,
              height: img.height,
              format: this.getFileExtension(file.name).toUpperCase()
            }
          });
        };
        img.onerror = () => {
          // 即使无法获取尺寸信息，也返回内容
          resolve({
            content,
            metadata: {
              format: this.getFileExtension(file.name).toUpperCase()
            }
          });
        };
        img.src = content;
      };
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 读取视频文件
   */
  private static readVideoFile(file: File): Promise<{ content: string; metadata: any }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // 创建视频元素获取元信息
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({
            content,
            metadata: {
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              format: this.getFileExtension(file.name).toUpperCase()
            }
          });
        };
        video.onerror = () => {
          // 即使无法获取元信息，也返回内容
          resolve({
            content,
            metadata: {
              format: this.getFileExtension(file.name).toUpperCase()
            }
          });
        };
        video.src = content;
      };
      reader.onerror = () => reject(new Error('视频读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 验证批量上传输入
   */
  static validateBatchInput(input: BatchUploadInput): BatchUploadValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查项目数量
    if (input.items.length === 0) {
      errors.push('没有有效的上传项目');
    }

    if (input.items.length > this.MAX_BATCH_SIZE) {
      errors.push(`批量上传项目数量超过限制 (${input.items.length} > ${this.MAX_BATCH_SIZE})`);
    }

    // 检查失败项目
    const failedItems = input.items.filter(item => item.status === 'failed');
    if (failedItems.length > 0) {
      warnings.push(`${failedItems.length} 个项目处理失败`);
    }

    // 检查文件大小
    const totalSize = input.items.reduce((sum, item) => sum + item.size, 0);
    if (totalSize > this.MAX_FILE_SIZE * 10) { // 总大小限制
      warnings.push(`总文件大小较大 (${this.formatFileSize(totalSize)})`);
    }

    // 检查类型一致性
    const inconsistentTypes = input.items.filter(item => 
      item.type !== input.blockType && item.status === 'completed'
    );
    if (inconsistentTypes.length > 0) {
      warnings.push(`${inconsistentTypes.length} 个项目类型与目标块类型不匹配`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 解析带分隔符的文本内容
   */
  static parseTextWithSeparators(content: string, fileName: string): BatchUploadItem[] {
    const separator = '******';
    const parts = content.split(separator).filter(part => part.trim());
    
    return parts.map((part, index) => ({
      id: crypto.randomUUID(),
      content: part.trim(),
      type: 'text' as const,
      originalName: `${fileName}_part_${index + 1}`,
      size: new Blob([part]).size,
      status: 'completed' as const
    }));
  }

  /**
   * 获取文件类型
   */
  private static getFileType(fileName: string): 'text' | 'image' | 'video' {
    const ext = this.getFileExtension(fileName);
    
    if (this.SUPPORTED_IMAGE_FORMATS.includes(ext)) {
      return 'image';
    } else if (this.SUPPORTED_VIDEO_FORMATS.includes(ext)) {
      return 'video';
    } else {
      return 'text';
    }
  }

  /**
   * 获取文件扩展名
   */
  private static getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  /**
   * 验证文件类型是否有效
   */
  private static isValidFileType(fileName: string, blockType: BlockType): boolean {
    const ext = this.getFileExtension(fileName);
    
    switch (blockType) {
      case 'text':
        return this.SUPPORTED_TEXT_FORMATS.includes(ext);
      case 'image':
        return this.SUPPORTED_IMAGE_FORMATS.includes(ext);
      case 'video':
        return this.SUPPORTED_VIDEO_FORMATS.includes(ext);
      default:
        return false;
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取支持的文件格式列表
   */
  static getSupportedFormats(blockType: BlockType): string[] {
    switch (blockType) {
      case 'text':
        return [...this.SUPPORTED_TEXT_FORMATS];
      case 'image':
        return [...this.SUPPORTED_IMAGE_FORMATS];
      case 'video':
        return [...this.SUPPORTED_VIDEO_FORMATS];
      default:
        return [];
    }
  }
}

// 文本批量处理器（保持向后兼容）
export class TextBatchProcessor {
  static parseTextWithSeparators(content: string, fileName: string): BatchUploadItem[] {
    return EnhancedBatchUploadHandler.parseTextWithSeparators(content, fileName);
  }
}

// 导出兼容性别名
export const BatchUploadHandler = EnhancedBatchUploadHandler;