/**
 * Multi-Image Edit Manager
 * 
 * 功能：
 * - 管理多图编辑操作
 * - 输入验证和限制
 * - 批量图像编辑（与视频批处理分离）
 * - 编辑历史管理
 * - 与现有系统集成
 */

import { ShenmaService, ShenmaImageEditOptions } from './shenmaService';
import { ImageBatchProcessor } from './ImageBatchProcessor';
import { CanvasLayoutManager } from './CanvasLayoutManager';
import { errorHandlingService, ErrorRecoveryOptions } from './ErrorHandlingService';
import { 
  ImageInput, 
  EditResult, 
  BatchEditOperation, 
  EditOperation, 
  ImageEditSession,
  EditPreset,
  Block,
  LayoutPosition
} from '../types';

export class MultiImageEditManager {
  private shenmaService: ShenmaService;
  private imageProcessor: ImageBatchProcessor;
  private canvasLayoutManager: CanvasLayoutManager;
  private currentSession: ImageEditSession | null = null;
  private activeBatchOperations: Map<string, BatchEditOperation> = new Map();
  
  // Error handling configuration
  private readonly DEFAULT_RETRY_OPTIONS: ErrorRecoveryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToCache: true,
    notifyUser: true
  };

  // Task 10: Concurrency control and resource optimization
  private readonly MAX_CONCURRENT_OPERATIONS = 3;
  private currentConcurrentOperations = 0;
  private operationQueue: Array<() => Promise<any>> = [];
  private imageCache: Map<string, { data: string; timestamp: number }> = new Map();
  private readonly CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30分钟缓存过期

  private readonly STORAGE_KEYS = {
    editHistory: 'multi_image_edit_history',
    editSession: 'current_edit_session',
    errorLog: 'multi_image_edit_errors'
  };

  constructor(
    shenmaService: ShenmaService,
    imageProcessor: ImageBatchProcessor,
    canvasLayoutManager: CanvasLayoutManager
  ) {
    this.shenmaService = shenmaService;
    this.imageProcessor = imageProcessor;
    this.canvasLayoutManager = canvasLayoutManager;
    
    // Initialize error handling
    this.initializeErrorHandling();
  }

  /**
   * 初始化错误处理
   */
  private async initializeErrorHandling(): Promise<void> {
    try {
      // 检查存储损坏
      const corruption = errorHandlingService.detectStorageCorruption();
      if (corruption.isCorrupted) {
        console.warn('[MultiImageEditManager] Storage corruption detected:', corruption.errors);
        await this.recoverFromStorageCorruption(corruption.corruptedKeys);
      }

      // 检查存储配额
      const quota = await errorHandlingService.checkStorageQuota();
      if (quota.percentage > 90) {
        console.warn('[MultiImageEditManager] Storage quota nearly full:', quota);
        await this.cleanupOldEditHistory();
      }

      // 恢复中断的编辑会话
      await this.recoverInterruptedSession();
      
    } catch (error) {
      console.error('[MultiImageEditManager] Failed to initialize error handling:', error);
      this.logError('initialization_failed', error);
    }
  }

  /**
   * 验证图像输入
   */
  validateImages(images: ImageInput[]): {
    valid: ImageInput[];
    invalid: ImageInput[];
    errors: string[];
  } {
    const valid: ImageInput[] = [];
    const invalid: ImageInput[] = [];
    const errors: string[] = [];

    // 检查数量限制
    if (images.length > 5) {
      errors.push('Maximum 5 images allowed for multi-image editing');
      return { valid: [], invalid: images, errors };
    }

    if (images.length === 0) {
      errors.push('At least one image is required');
      return { valid: [], invalid: images, errors };
    }

    // 验证每个图像
    images.forEach((image, index) => {
      const imageErrors: string[] = [];

      // 验证图像源
      if (!image.source) {
        imageErrors.push(`Image ${index + 1}: No source provided`);
      } else if (typeof image.source === 'string') {
        // 验证URL或base64格式
        if (!image.source.startsWith('data:') && !image.source.startsWith('http')) {
          imageErrors.push(`Image ${index + 1}: Invalid URL or base64 format`);
        }
      } else if (!(image.source instanceof File)) {
        imageErrors.push(`Image ${index + 1}: Invalid file type`);
      } else {
        // 验证文件类型
        const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!validTypes.includes(image.source.type)) {
          imageErrors.push(`Image ${index + 1}: Unsupported format (${image.source.type}). Supported: PNG, JPEG, WebP`);
        }

        // 验证文件大小（5MB限制）
        if (image.source.size > 5 * 1024 * 1024) {
          imageErrors.push(`Image ${index + 1}: File too large (${Math.round(image.source.size / 1024 / 1024)}MB). Maximum: 5MB`);
        }
      }

      // 验证权重
      if (image.weight !== undefined && (image.weight < 0 || image.weight > 1)) {
        imageErrors.push(`Image ${index + 1}: Weight must be between 0 and 1`);
      }

      // 验证角色
      if (image.role && !['primary', 'reference', 'style'].includes(image.role)) {
        imageErrors.push(`Image ${index + 1}: Invalid role. Must be 'primary', 'reference', or 'style'`);
      }

      if (imageErrors.length === 0) {
        valid.push(image);
      } else {
        invalid.push(image);
        errors.push(...imageErrors);
      }
    });

    return { valid, invalid, errors };
  }

  /**
   * 主要的多图编辑方法（带错误处理）
   */
  async editWithMultipleImages(
    prompt: string,
    images: ImageInput[],
    options: ShenmaImageEditOptions = {}
  ): Promise<EditResult> {
    // Task 10: 使用并发控制
    return this.executeWithConcurrencyControl(
      async () => {
        console.log('[MultiImageEditManager] Starting multi-image editing');
        console.log(`[MultiImageEditManager] Processing ${images.length} images`);

        const startTime = Date.now();

        // 验证输入
        const validation = this.validateImages(images);
        if (validation.errors.length > 0) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // 使用验证后的图像
        const validImages = validation.valid;

        // Task 10: 检查缓存
        const cacheKey = this.generateCacheKey(prompt, validImages, options);
        const cachedResult = this.getCachedImage(cacheKey);
        if (cachedResult) {
          console.log('[MultiImageEditManager] ✓ Using cached result');
          return {
            resultImage: cachedResult,
            metadata: {
              operation: 'multi_image_edit',
              timestamp: Date.now(),
              inputCount: validImages.length,
              processingTime: Date.now() - startTime,
              fromCache: true
            }
          };
        }

        // 准备图像源数组
        const imageSources = validImages.map(img => img.source);

        // 设置图像权重（如果提供）
        if (validImages.some(img => img.weight !== undefined)) {
          options.imageWeights = validImages.map(img => img.weight || 1.0);
        }

        // 根据图像角色设置合成模式
        if (!options.compositionMode) {
          const hasStyleImage = validImages.some(img => img.role === 'style');
          const hasReferenceImage = validImages.some(img => img.role === 'reference');
          
          if (hasStyleImage) {
            options.compositionMode = 'style_transfer';
          } else if (hasReferenceImage) {
            options.compositionMode = 'reference';
          } else {
            options.compositionMode = 'blend';
          }
        }

        // 调用扩展的ShenmaService方法
        const resultImage = await this.shenmaService.editMultipleImages(
          prompt,
          imageSources,
          options
        );

        const processingTime = Date.now() - startTime;

        // Task 8: 确保输出格式一致性
        const consistentResultImage = await this.ensureOutputFormatConsistency(resultImage, options);

        // Task 10: 缓存结果
        this.setCachedImage(cacheKey, consistentResultImage);

        const editResult: EditResult = {
          resultImage: consistentResultImage,
          metadata: {
            operation: 'multi_image_edit',
            timestamp: Date.now(),
            inputCount: validImages.length,
            processingTime
          }
        };

        // 保存到编辑历史
        this.saveEditToHistory({
          id: `edit_${Date.now()}`,
          type: 'multi_edit',
          inputs: validImages,
          result: editResult,
          timestamp: Date.now()
        });

        console.log(`[MultiImageEditManager] ✓ Multi-image editing completed in ${processingTime}ms`);
        return editResult;
      },
      'multi_image_edit'
    );
  }

  /**
   * 编辑多张图片并集成到画布
   */
  async editImagesWithCanvasIntegration(
    images: ImageInput[],
    prompt: string,
    options: ShenmaImageEditOptions,
    canvasBlocks: Block[],
    layoutPreference: 'replace' | 'beside' | 'below' = 'beside'
  ): Promise<{
    results: EditResult[];
    newBlocks: Block[];
    layoutPositions: LayoutPosition[];
    canvasExpansion?: { width: number; height: number };
  }> {
    console.log('[MultiImageEditManager] Starting canvas-integrated edit operation');
    
    // 验证输入
    const validation = this.validateImages(images);
    if (validation.valid.length === 0) {
      throw new Error('No valid images provided for editing');
    }

    // 执行编辑操作
    const results = await this.editMultipleImages(validation.valid, prompt, options);
    
    // 创建源块引用（用于布局计算）
    const sourceBlocks = this.createSourceBlockReferences(validation.valid);
    
    // 计算布局位置
    const layoutPositions = this.canvasLayoutManager.calculateEditedImageLayout(
      sourceBlocks,
      results,
      canvasBlocks,
      layoutPreference
    );
    
    // 创建新的图片块
    const newBlocks = this.canvasLayoutManager.createEditedImageBlocks(
      results,
      layoutPositions,
      sourceBlocks
    );
    
    // 检查是否需要扩展画布
    const currentCanvasSize = this.calculateCurrentCanvasSize(canvasBlocks);
    const canvasExpansion = this.canvasLayoutManager.expandCanvasIfNeeded(
      layoutPositions,
      currentCanvasSize
    );
    
    // 保存到编辑会话
    if (this.currentSession) {
      const operation: EditOperation = {
        id: Date.now().toString(),
        type: 'multi_edit',
        inputs: validation.valid,
        result: results[0], // Primary result
        timestamp: Date.now()
      };
      
      this.currentSession.operations.push(operation);
      this.currentSession.history.push(operation);
      this.saveSession();
    }
    
    console.log('[MultiImageEditManager] ✓ Canvas integration completed');
    
    return {
      results,
      newBlocks,
      layoutPositions,
      canvasExpansion: canvasExpansion.needsExpansion ? canvasExpansion : undefined
    };
  }

  /**
   * 创建源块引用（用于布局计算）
   */
  private createSourceBlockReferences(images: ImageInput[]): Block[] {
    return images.map((image, index) => ({
      id: `temp_source_${index}`,
      type: 'image' as const,
      x: 100 + index * 50, // 临时位置
      y: 100,
      width: 300, // 默认尺寸
      height: 300,
      content: typeof image.source === 'string' ? image.source : '',
      status: 'idle' as const,
      number: `S${index + 1}`,
      aspectRatio: '1:1' as const
    }));
  }

  /**
   * 计算当前画布尺寸
   */
  private calculateCurrentCanvasSize(blocks: Block[]): { width: number; height: number } {
    if (blocks.length === 0) {
      return { width: 1200, height: 800 }; // 默认画布尺寸
    }
    
    let maxX = 0;
    let maxY = 0;
    
    for (const block of blocks) {
      maxX = Math.max(maxX, block.x + block.width);
      maxY = Math.max(maxY, block.y + block.height);
    }
    
    return {
      width: Math.max(maxX + 200, 1200), // 添加边距
      height: Math.max(maxY + 200, 800)
    };
  }

  /**
   * 编辑多张图片（内部方法）
   */
  private async editMultipleImages(
    images: ImageInput[],
    prompt: string,
    options: ShenmaImageEditOptions
  ): Promise<EditResult[]> {
    // 简化版本，返回单个结果
    const result = await this.editWithMultipleImages(prompt, images, options);
    return [result];
  }

  /**
   * 保存编辑会话
   */
  private saveSession(): void {
    if (this.currentSession) {
      try {
        localStorage.setItem('current_edit_session', JSON.stringify(this.currentSession));
      } catch (error) {
        console.warn('Failed to save edit session:', error);
      }
    }
  }

  /**
   * 生成图像变体
   */
  async generateImageVariations(
    sourceImage: string,
    count: number = 4,
    options: Omit<ShenmaImageEditOptions, 'compositionMode' | 'imageWeights'> = {}
  ): Promise<string[]> {
    console.log('[MultiImageEditManager] Starting image variation generation');
    console.log(`[MultiImageEditManager] Generating ${count} variations`);

    // 验证变体数量
    if (count < 2 || count > 8) {
      throw new Error('Variation count must be between 2 and 8');
    }

    try {
      const variations = await this.shenmaService.generateImageVariations(
        sourceImage,
        count,
        options
      );

      // Task 8: 确保所有变体的输出格式一致性
      const consistentVariations = await Promise.all(
        variations.map(variation => this.ensureOutputFormatConsistency(variation, options))
      );

      // 保存到编辑历史
      const editResult: EditResult = {
        resultImage: JSON.stringify(consistentVariations),
        metadata: {
          operation: 'image_variations',
          timestamp: Date.now(),
          inputCount: 1,
          processingTime: 0 // 由ShenmaService计算
        }
      };

      this.saveEditToHistory({
        id: `variations_${Date.now()}`,
        type: 'variation',
        inputs: [{ source: sourceImage }],
        result: editResult,
        timestamp: Date.now()
      });

      console.log(`[MultiImageEditManager] ✓ Generated ${consistentVariations.length} variations`);
      return consistentVariations;

    } catch (error) {
      console.error('[MultiImageEditManager] Variation generation failed:', error);
      throw error;
    }
  }

  /**
   * 批量图像编辑（与视频批处理分离，带错误恢复）
   */
  async batchEditImages(
    operations: BatchEditOperation[],
    maxConcurrent: number = 3
  ): Promise<{ successful: EditResult[]; failed: { operation: BatchEditOperation; error: string }[] }> {
    console.log('[MultiImageEditManager] Starting batch image editing');
    console.log(`[MultiImageEditManager] Processing ${operations.length} operations with max ${maxConcurrent} concurrent`);

    const successful: EditResult[] = [];
    const failed: { operation: BatchEditOperation; error: string }[] = [];

    // Task 10: 使用内置的并发控制，但允许批量操作指定自己的并发数
    const originalMaxConcurrent = this.MAX_CONCURRENT_OPERATIONS;
    
    // 分批处理以控制并发
    for (let i = 0; i < operations.length; i += maxConcurrent) {
      const batch = operations.slice(i, i + maxConcurrent);
      console.log(`[MultiImageEditManager] Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(operations.length / maxConcurrent)}`);

      const batchPromises = batch.map(async (operation) => {
        try {
          // 标记操作为活跃状态
          this.activeBatchOperations.set(operation.id, operation);

          // Task 10: 使用并发控制的编辑方法
          const result = await this.editWithMultipleImages(operation.prompt, operation.images, operation.options);

          successful.push(result);
          return { success: true, operation, result };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // 处理批量错误
          const remainingOperations = operations.slice(i + batch.indexOf(operation) + 1);
          const errorHandling = await this.handleBatchError(operation, error as Error, remainingOperations);
          
          failed.push({ operation, error: errorMessage });
          return { success: false, operation, error: errorMessage };
        } finally {
          // 清理活跃操作
          this.activeBatchOperations.delete(operation.id);
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      
      // 检查是否需要停止处理
      const hasSystemError = batchResults.some(result => 
        !result.success && this.classifyError(new Error(result.error)) === 'system'
      );
      
      if (hasSystemError) {
        console.error('[MultiImageEditManager] System error detected, stopping batch processing');
        break;
      }
    }

    console.log(`[MultiImageEditManager] ✓ Batch editing completed: ${successful.length} successful, ${failed.length} failed`);

    return { successful, failed };
  }

  /**
   * 保存编辑历史（最多保存5个操作，带自动清理）
   */
  private saveEditToHistory(operation: EditOperation): void {
    try {
      // 从浏览器存储加载现有历史
      const existingHistory = localStorage.getItem(this.STORAGE_KEYS.editHistory);
      let history: EditOperation[] = existingHistory ? JSON.parse(existingHistory) : [];

      // 添加新操作到历史开头
      history.unshift(operation);

      // 限制历史记录数量为5
      if (history.length > 5) {
        history = history.slice(0, 5);
      }

      // 保存回浏览器存储
      localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify(history));

      console.log(`[MultiImageEditManager] Saved edit operation to history (${history.length} total)`);
      
      // 检查存储使用情况
      this.checkHistoryStorageUsage();
      
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to save edit history:', error);
      this.logError('history_save_failed', error);
    }
  }

  /**
   * 获取编辑历史（带错误处理）
   */
  getEditHistory(): EditOperation[] {
    try {
      const existingHistory = localStorage.getItem(this.STORAGE_KEYS.editHistory);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // 验证历史数据完整性
      return history.filter((operation: any) => 
        operation && 
        operation.id && 
        operation.type && 
        operation.timestamp &&
        operation.result
      );
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to load edit history:', error);
      this.logError('history_load_failed', error);
      
      // 如果历史损坏，重置为空数组
      try {
        localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify([]));
      } catch (resetError) {
        console.error('[MultiImageEditManager] Failed to reset history:', resetError);
      }
      
      return [];
    }
  }

  /**
   * 撤销上一次编辑（一步撤销，带验证）
   */
  undoLastEdit(): { success: boolean; result?: EditResult; error?: string } {
    try {
      const history = this.getEditHistory();
      if (history.length === 0) {
        return { success: false, error: 'No operations to undo' };
      }

      // 获取上一次操作
      const lastOperation = history[0];
      
      // 验证操作是否可以撤销
      if (!this.canUndoOperation(lastOperation)) {
        return { success: false, error: 'Operation cannot be undone' };
      }
      
      // 从历史中移除最后一个操作
      const updatedHistory = history.slice(1);
      localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify(updatedHistory));
      
      console.log('[MultiImageEditManager] ✓ Undo last edit operation');
      
      return { 
        success: true, 
        result: lastOperation.result 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[MultiImageEditManager] Failed to undo last edit:', error);
      this.logError('undo_failed', error);
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 检查操作是否可以撤销
   */
  private canUndoOperation(operation: EditOperation): boolean {
    // 检查操作是否太旧（超过1小时）
    const operationAge = Date.now() - operation.timestamp;
    if (operationAge > 60 * 60 * 1000) {
      return false;
    }
    
    // 检查操作类型是否支持撤销
    const undoableTypes = ['multi_edit', 'variation'];
    return undoableTypes.includes(operation.type);
  }

  /**
   * 获取历史统计信息
   */
  getHistoryStatistics(): {
    totalOperations: number;
    operationsByType: Record<string, number>;
    averageProcessingTime: number;
    oldestOperation?: number;
    newestOperation?: number;
    storageUsage: number;
  } {
    try {
      const history = this.getEditHistory();
      
      if (history.length === 0) {
        return {
          totalOperations: 0,
          operationsByType: {},
          averageProcessingTime: 0,
          storageUsage: 0
        };
      }
      
      const operationsByType: Record<string, number> = {};
      let totalProcessingTime = 0;
      let validProcessingTimes = 0;
      
      history.forEach(operation => {
        // 统计操作类型
        operationsByType[operation.type] = (operationsByType[operation.type] || 0) + 1;
        
        // 统计处理时间
        if (operation.result.metadata.processingTime) {
          totalProcessingTime += operation.result.metadata.processingTime;
          validProcessingTimes++;
        }
      });
      
      const averageProcessingTime = validProcessingTimes > 0 
        ? totalProcessingTime / validProcessingTimes 
        : 0;
      
      // 计算存储使用量
      const historyData = localStorage.getItem(this.STORAGE_KEYS.editHistory) || '';
      const storageUsage = new Blob([historyData]).size;
      
      return {
        totalOperations: history.length,
        operationsByType,
        averageProcessingTime,
        oldestOperation: history.length > 0 ? Math.min(...history.map(op => op.timestamp)) : undefined,
        newestOperation: history.length > 0 ? Math.max(...history.map(op => op.timestamp)) : undefined,
        storageUsage
      };
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to get history statistics:', error);
      return {
        totalOperations: 0,
        operationsByType: {},
        averageProcessingTime: 0,
        storageUsage: 0
      };
    }
  }

  /**
   * 创建历史快照（用于比较）
   */
  createHistorySnapshot(): {
    id: string;
    timestamp: number;
    operations: EditOperation[];
    metadata: {
      totalOperations: number;
      storageSize: number;
    };
  } {
    const history = this.getEditHistory();
    const historyData = localStorage.getItem(this.STORAGE_KEYS.editHistory) || '';
    
    return {
      id: `snapshot_${Date.now()}`,
      timestamp: Date.now(),
      operations: [...history], // 深拷贝
      metadata: {
        totalOperations: history.length,
        storageSize: new Blob([historyData]).size
      }
    };
  }

  /**
   * 检查历史存储使用情况
   */
  private checkHistoryStorageUsage(): void {
    try {
      const historyData = localStorage.getItem(this.STORAGE_KEYS.editHistory) || '';
      const sizeInBytes = new Blob([historyData]).size;
      const sizeInKB = sizeInBytes / 1024;
      
      // 如果历史数据超过100KB，触发清理
      if (sizeInKB > 100) {
        console.warn(`[MultiImageEditManager] History storage usage high: ${sizeInKB.toFixed(2)}KB`);
        this.cleanupOldEditHistory();
      }
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to check history storage usage:', error);
    }
  }

  /**
   * 清理编辑历史
   */
  clearEditHistory(): void {
    try {
      localStorage.removeItem('multi_image_edit_history');
      console.log('[MultiImageEditManager] Edit history cleared');
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to clear edit history:', error);
    }
  }

  /**
   * 获取默认编辑预设
   */
  getDefaultPresets(): EditPreset[] {
    return [
      {
        id: 'style_transfer',
        name: 'Style Transfer',
        description: 'Apply the style of one image to another',
        options: {
          compositionMode: 'style_transfer',
          guidanceScale: 7.5,
          steps: 20
        },
        category: 'style_transfer'
      },
      {
        id: 'image_blend',
        name: 'Image Blending',
        description: 'Blend multiple images together',
        options: {
          compositionMode: 'blend',
          guidanceScale: 5.0,
          steps: 15
        },
        category: 'composition'
      },
      {
        id: 'reference_edit',
        name: 'Reference-based Edit',
        description: 'Edit image using reference images',
        options: {
          compositionMode: 'reference',
          guidanceScale: 8.0,
          steps: 25
        },
        category: 'enhancement'
      }
    ];
  }

  /**
   * 获取当前活跃的批量操作状态
   */
  getActiveBatchOperations(): BatchEditOperation[] {
    return Array.from(this.activeBatchOperations.values());
  }

  /**
   * 取消批量操作
   */
  cancelBatchOperation(operationId: string): boolean {
    if (this.activeBatchOperations.has(operationId)) {
      this.activeBatchOperations.delete(operationId);
      console.log(`[MultiImageEditManager] Cancelled batch operation: ${operationId}`);
      return true;
    }
    return false;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.activeBatchOperations.clear();
    this.currentSession = null;
    
    // Task 10: 清理并发控制和缓存资源
    this.clearOperationQueue();
    this.clearImageCache();
    this.optimizeResources();
    
    console.log('[MultiImageEditManager] Resources cleaned up');
  }

  // ==================== Task 8: Output Format Consistency ====================

  /**
   * 确保输出格式一致性 - 处理分辨率、格式和质量
   */
  async ensureOutputFormatConsistency(
    resultImage: string,
    options: ShenmaImageEditOptions = {}
  ): Promise<string> {
    console.log('[MultiImageEditManager] Ensuring output format consistency');
    
    try {
      // 1. 处理分辨率支持 (1K, 2K, 4K)
      const processedImage = await this.processImageResolution(resultImage, options.imageSize);
      
      // 2. 处理输出格式 (URL/base64)
      const formattedImage = await this.processOutputFormat(processedImage, options.responseFormat);
      
      // 3. 应用质量预设
      const qualityProcessedImage = await this.applyQualityPreset(formattedImage, options);
      
      // 4. 保持宽高比一致性
      const aspectRatioProcessedImage = await this.ensureAspectRatioConsistency(
        qualityProcessedImage, 
        options.aspectRatio
      );
      
      // 5. 添加元数据
      const finalImage = await this.addImageMetadata(aspectRatioProcessedImage, options);
      
      console.log('[MultiImageEditManager] ✓ Output format consistency ensured');
      return finalImage;
      
    } catch (error) {
      console.error('[MultiImageEditManager] Output format consistency failed:', error);
      // 如果处理失败，返回原始图像
      return resultImage;
    }
  }

  /**
   * 处理图像分辨率 - 支持现有的1K, 2K, 4K分辨率
   */
  private async processImageResolution(
    imageData: string,
    targetSize?: '1K' | '2K' | '4K'
  ): Promise<string> {
    if (!targetSize) {
      return imageData; // 如果没有指定分辨率，返回原图
    }
    
    console.log(`[MultiImageEditManager] Processing image resolution: ${targetSize}`);
    
    // 分辨率映射
    const resolutionMap = {
      '1K': { width: 1024, height: 1024 },
      '2K': { width: 2048, height: 2048 },
      '4K': { width: 4096, height: 4096 }
    };
    
    const targetResolution = resolutionMap[targetSize];
    
    try {
      // 如果是URL，先转换为base64进行处理
      let processableImage = imageData;
      if (imageData.startsWith('http')) {
        const base64 = await this.urlToBase64(imageData);
        if (base64) {
          processableImage = base64;
        }
      }
      
      // 使用Canvas调整分辨率
      const resizedImage = await this.resizeImageToResolution(
        processableImage, 
        targetResolution.width, 
        targetResolution.height
      );
      
      console.log(`[MultiImageEditManager] ✓ Image resized to ${targetSize}`);
      return resizedImage;
      
    } catch (error) {
      console.warn('[MultiImageEditManager] Resolution processing failed, using original:', error);
      return imageData;
    }
  }

  /**
   * 处理输出格式 - URL或base64
   */
  private async processOutputFormat(
    imageData: string,
    responseFormat?: 'url' | 'b64_json'
  ): Promise<string> {
    if (!responseFormat) {
      return imageData; // 保持原格式
    }
    
    console.log(`[MultiImageEditManager] Processing output format: ${responseFormat}`);
    
    try {
      if (responseFormat === 'b64_json' && imageData.startsWith('http')) {
        // 将URL转换为base64
        const base64 = await this.urlToBase64(imageData);
        return base64 || imageData;
      } else if (responseFormat === 'url' && imageData.startsWith('data:')) {
        // base64转URL需要上传到服务器，这里暂时保持base64格式
        console.log('[MultiImageEditManager] URL format requested but base64 provided, keeping base64');
        return imageData;
      }
      
      return imageData;
      
    } catch (error) {
      console.warn('[MultiImageEditManager] Output format processing failed:', error);
      return imageData;
    }
  }

  /**
   * 应用质量预设 - draft, standard, high
   */
  private async applyQualityPreset(
    imageData: string,
    options: ShenmaImageEditOptions
  ): Promise<string> {
    // 根据其他参数推断质量级别
    let qualityLevel: 'draft' | 'standard' | 'high' = 'standard';
    
    if (options.steps && options.steps <= 10) {
      qualityLevel = 'draft';
    } else if (options.steps && options.steps >= 30) {
      qualityLevel = 'high';
    }
    
    if (options.guidanceScale && options.guidanceScale >= 10) {
      qualityLevel = 'high';
    }
    
    console.log(`[MultiImageEditManager] Applying quality preset: ${qualityLevel}`);
    
    // 质量预设配置
    const qualityPresets = {
      draft: { compression: 0.7, maxSize: 1024 },
      standard: { compression: 0.85, maxSize: 2048 },
      high: { compression: 0.95, maxSize: 4096 }
    };
    
    const preset = qualityPresets[qualityLevel];
    
    try {
      // 如果是base64图像，应用压缩
      if (imageData.startsWith('data:')) {
        const compressedImage = await this.compressImage(imageData, preset.compression, preset.maxSize);
        console.log(`[MultiImageEditManager] ✓ Applied ${qualityLevel} quality preset`);
        return compressedImage;
      }
      
      return imageData;
      
    } catch (error) {
      console.warn('[MultiImageEditManager] Quality preset application failed:', error);
      return imageData;
    }
  }

  /**
   * 确保宽高比一致性
   */
  private async ensureAspectRatioConsistency(
    imageData: string,
    aspectRatio?: string
  ): Promise<string> {
    if (!aspectRatio) {
      return imageData; // 如果没有指定宽高比，保持原样
    }
    
    console.log(`[MultiImageEditManager] Ensuring aspect ratio consistency: ${aspectRatio}`);
    
    // 支持的宽高比映射
    const aspectRatioMap: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1, height: 1 },
      '4:3': { width: 4, height: 3 },
      '16:9': { width: 16, height: 9 },
      '9:16': { width: 9, height: 16 },
      '4:5': { width: 4, height: 5 },
      '5:4': { width: 5, height: 4 },
      '2:3': { width: 2, height: 3 },
      '3:2': { width: 3, height: 2 },
      '21:9': { width: 21, height: 9 }
    };
    
    const targetRatio = aspectRatioMap[aspectRatio];
    if (!targetRatio) {
      console.warn(`[MultiImageEditManager] Unsupported aspect ratio: ${aspectRatio}`);
      return imageData;
    }
    
    try {
      // 如果是base64图像，调整宽高比
      if (imageData.startsWith('data:')) {
        const adjustedImage = await this.adjustImageAspectRatio(imageData, targetRatio);
        console.log(`[MultiImageEditManager] ✓ Adjusted to ${aspectRatio} aspect ratio`);
        return adjustedImage;
      }
      
      return imageData;
      
    } catch (error) {
      console.warn('[MultiImageEditManager] Aspect ratio adjustment failed:', error);
      return imageData;
    }
  }

  /**
   * 添加图像元数据
   */
  private async addImageMetadata(
    imageData: string,
    options: ShenmaImageEditOptions
  ): Promise<string> {
    console.log('[MultiImageEditManager] Adding image metadata');
    
    // 创建元数据对象
    const metadata = {
      generatedAt: Date.now(),
      model: options.model || 'nano-banana',
      aspectRatio: options.aspectRatio || '16:9',
      imageSize: options.imageSize || '2K',
      seed: options.seed,
      guidanceScale: options.guidanceScale,
      steps: options.steps,
      compositionMode: options.compositionMode,
      version: '1.0'
    };
    
    // 如果是base64图像，可以在注释中添加元数据
    if (imageData.startsWith('data:')) {
      // 对于base64图像，我们将元数据存储在localStorage中，使用图像hash作为key
      try {
        const imageHash = await this.generateImageHash(imageData);
        const metadataKey = `image_metadata_${imageHash}`;
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
        console.log('[MultiImageEditManager] ✓ Metadata stored for image');
      } catch (error) {
        console.warn('[MultiImageEditManager] Failed to store metadata:', error);
      }
    }
    
    return imageData;
  }

  /**
   * 使用Canvas调整图像分辨率
   */
  private async resizeImageToResolution(
    imageData: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // 使用高质量缩放
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 绘制调整后的图像
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // 转换为base64
          const resizedImage = canvas.toDataURL('image/png', 0.95);
          resolve(resizedImage);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };
      
      img.src = imageData;
    });
  }

  /**
   * 压缩图像
   */
  private async compressImage(
    imageData: string,
    quality: number,
    maxSize: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          
          // 计算压缩后的尺寸
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // 使用指定质量压缩
          const compressedImage = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedImage);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = imageData;
    });
  }

  /**
   * 调整图像宽高比
   */
  private async adjustImageAspectRatio(
    imageData: string,
    targetRatio: { width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          
          // 计算目标尺寸，保持图像不变形
          const currentRatio = img.width / img.height;
          const targetRatioValue = targetRatio.width / targetRatio.height;
          
          let canvasWidth = img.width;
          let canvasHeight = img.height;
          let drawX = 0;
          let drawY = 0;
          let drawWidth = img.width;
          let drawHeight = img.height;
          
          if (currentRatio > targetRatioValue) {
            // 当前图像更宽，需要裁剪宽度
            canvasWidth = img.height * targetRatioValue;
            drawX = (img.width - canvasWidth) / 2;
            drawWidth = canvasWidth;
          } else if (currentRatio < targetRatioValue) {
            // 当前图像更高，需要裁剪高度
            canvasHeight = img.width / targetRatioValue;
            drawY = (img.height - canvasHeight) / 2;
            drawHeight = canvasHeight;
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // 绘制裁剪后的图像
          ctx.drawImage(
            img,
            drawX, drawY, drawWidth, drawHeight,
            0, 0, canvasWidth, canvasHeight
          );
          
          const adjustedImage = canvas.toDataURL('image/png', 0.95);
          resolve(adjustedImage);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for aspect ratio adjustment'));
      };
      
      img.src = imageData;
    });
  }

  /**
   * 生成图像哈希用于元数据存储
   */
  private async generateImageHash(imageData: string): Promise<string> {
    try {
      // 使用简单的哈希算法
      const encoder = new TextEncoder();
      const data = encoder.encode(imageData.substring(0, 1000)); // 使用前1000个字符
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 16); // 使用前16个字符作为短哈希
    } catch (error) {
      // 如果crypto API不可用，使用简单的字符串哈希
      let hash = 0;
      for (let i = 0; i < Math.min(imageData.length, 1000); i++) {
        const char = imageData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * URL转base64工具函数
   */
  private async urlToBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
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
          console.error("[MultiImageEditManager] Canvas conversion failed", err);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error("[MultiImageEditManager] Image load failed for URL:", url);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * 获取图像元数据
   */
  async getImageMetadata(imageData: string): Promise<any | null> {
    try {
      const imageHash = await this.generateImageHash(imageData);
      const metadataKey = `image_metadata_${imageHash}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (metadataStr) {
        return JSON.parse(metadataStr);
      }
      
      return null;
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to get image metadata:', error);
      return null;
    }
  }

  /**
   * 清理图像元数据
   */
  cleanupImageMetadata(): void {
    try {
      const keys = Object.keys(localStorage);
      const metadataKeys = keys.filter(key => key.startsWith('image_metadata_'));
      
      // 只保留最近100个元数据记录
      if (metadataKeys.length > 100) {
        const sortedKeys = metadataKeys.sort((a, b) => {
          const aData = localStorage.getItem(a);
          const bData = localStorage.getItem(b);
          if (!aData || !bData) return 0;
          
          try {
            const aTime = JSON.parse(aData).generatedAt || 0;
            const bTime = JSON.parse(bData).generatedAt || 0;
            return bTime - aTime; // 降序排列
          } catch {
            return 0;
          }
        });
        
        // 删除旧的元数据
        const keysToDelete = sortedKeys.slice(100);
        keysToDelete.forEach(key => localStorage.removeItem(key));
        
        console.log(`[MultiImageEditManager] Cleaned up ${keysToDelete.length} old metadata records`);
      }
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to cleanup image metadata:', error);
    }
  }

  // ==================== Task 10: Concurrency Control and Resource Optimization ====================

  /**
   * 执行带并发控制的操作
   */
  private async executeWithConcurrencyControl<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // 如果当前并发数已达上限，加入队列等待
    if (this.currentConcurrentOperations >= this.MAX_CONCURRENT_OPERATIONS) {
      console.log(`[MultiImageEditManager] Operation ${operationName} queued (${this.operationQueue.length + 1} in queue)`);
      
      return new Promise((resolve, reject) => {
        this.operationQueue.push(async () => {
          try {
            const result = await this.executeOperation(operation, operationName);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.executeOperation(operation, operationName);
  }

  /**
   * 执行单个操作
   */
  private async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.currentConcurrentOperations++;
    console.log(`[MultiImageEditManager] Starting ${operationName} (${this.currentConcurrentOperations}/${this.MAX_CONCURRENT_OPERATIONS} concurrent)`);

    try {
      const result = await operation();
      return result;
    } finally {
      this.currentConcurrentOperations--;
      console.log(`[MultiImageEditManager] Completed ${operationName} (${this.currentConcurrentOperations}/${this.MAX_CONCURRENT_OPERATIONS} concurrent)`);
      
      // 处理队列中的下一个操作
      this.processQueue();
    }
  }

  /**
   * 处理操作队列
   */
  private processQueue(): void {
    if (this.operationQueue.length > 0 && this.currentConcurrentOperations < this.MAX_CONCURRENT_OPERATIONS) {
      const nextOperation = this.operationQueue.shift();
      if (nextOperation) {
        console.log(`[MultiImageEditManager] Processing queued operation (${this.operationQueue.length} remaining)`);
        nextOperation().catch(error => {
          console.error('[MultiImageEditManager] Queued operation failed:', error);
        });
      }
    }
  }

  /**
   * 获取缓存的图像
   */
  private getCachedImage(cacheKey: string): string | null {
    const cached = this.imageCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.imageCache.delete(cacheKey);
      console.log(`[MultiImageEditManager] Cache expired for key: ${cacheKey}`);
      return null;
    }

    console.log(`[MultiImageEditManager] Cache hit for key: ${cacheKey}`);
    return cached.data;
  }

  /**
   * 缓存图像
   */
  private setCachedImage(cacheKey: string, imageData: string): void {
    // 限制缓存大小，最多保存50个图像
    if (this.imageCache.size >= 50) {
      // 删除最旧的缓存项
      const oldestKey = Array.from(this.imageCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.imageCache.delete(oldestKey);
      console.log(`[MultiImageEditManager] Removed oldest cache entry: ${oldestKey}`);
    }

    this.imageCache.set(cacheKey, {
      data: imageData,
      timestamp: Date.now()
    });

    console.log(`[MultiImageEditManager] Cached image with key: ${cacheKey} (${this.imageCache.size}/50)`);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(prompt: string, images: ImageInput[], options: ShenmaImageEditOptions): string {
    const imageHashes = images.map(img => {
      if (typeof img.source === 'string') {
        return img.source.substring(0, 50); // 使用前50个字符
      }
      return `file_${img.source.name}_${img.source.size}`;
    }).join('|');

    const optionsStr = JSON.stringify({
      model: options.model,
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
      compositionMode: options.compositionMode,
      guidanceScale: options.guidanceScale,
      steps: options.steps
    });

    return `${prompt.substring(0, 100)}_${imageHashes}_${optionsStr}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.imageCache.entries()) {
      if (now - cached.timestamp > this.CACHE_EXPIRY_MS) {
        this.imageCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[MultiImageEditManager] Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 获取资源使用统计
   */
  getResourceUsageStats(): {
    concurrentOperations: number;
    maxConcurrentOperations: number;
    queuedOperations: number;
    cacheSize: number;
    maxCacheSize: number;
    cacheHitRate: number;
  } {
    return {
      concurrentOperations: this.currentConcurrentOperations,
      maxConcurrentOperations: this.MAX_CONCURRENT_OPERATIONS,
      queuedOperations: this.operationQueue.length,
      cacheSize: this.imageCache.size,
      maxCacheSize: 50,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 这里可以实现更复杂的缓存命中率计算
    // 目前返回一个估算值
    return this.imageCache.size > 0 ? 0.75 : 0;
  }

  /**
   * 优化资源使用
   */
  optimizeResources(): void {
    console.log('[MultiImageEditManager] Optimizing resources...');
    
    // 清理过期缓存
    this.cleanupExpiredCache();
    
    // 清理图像元数据
    this.cleanupImageMetadata();
    
    // 清理旧的编辑历史
    this.cleanupOldEditHistory();
    
    console.log('[MultiImageEditManager] ✓ Resource optimization completed');
  }

  /**
   * 获取进度指示器数据
   */
  getProgressIndicator(): {
    activeOperations: Array<{
      id: string;
      type: string;
      progress: number;
      startTime: number;
    }>;
    queueLength: number;
    estimatedWaitTime: number;
  } {
    const activeOperations = Array.from(this.activeBatchOperations.values()).map(op => ({
      id: op.id,
      type: 'batch_edit',
      progress: 0, // 这里可以实现更详细的进度跟踪
      startTime: Date.now()
    }));

    // 估算等待时间（基于平均操作时间）
    const averageOperationTime = 10000; // 10秒估算
    const estimatedWaitTime = this.operationQueue.length * averageOperationTime;

    return {
      activeOperations,
      queueLength: this.operationQueue.length,
      estimatedWaitTime
    };
  }

  /**
   * 强制清空操作队列
   */
  clearOperationQueue(): void {
    const queueLength = this.operationQueue.length;
    this.operationQueue = [];
    console.log(`[MultiImageEditManager] Cleared operation queue (${queueLength} operations cancelled)`);
  }

  /**
   * 清空图像缓存
   */
  clearImageCache(): void {
    const cacheSize = this.imageCache.size;
    this.imageCache.clear();
    console.log(`[MultiImageEditManager] Cleared image cache (${cacheSize} entries removed)`);
  }

  // ==================== Error Handling and Recovery Methods ====================

  /**
   * 执行带有错误处理和重试的操作
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: Partial<ErrorRecoveryOptions> = {}
  ): Promise<T> {
    const retryOptions = { ...this.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        console.log(`[MultiImageEditManager] Executing ${operationName} (attempt ${attempt}/${retryOptions.maxRetries})`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[MultiImageEditManager] ✓ ${operationName} succeeded on retry ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[MultiImageEditManager] ${operationName} failed on attempt ${attempt}:`, error);
        
        this.logError(`${operationName}_attempt_${attempt}`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < retryOptions.maxRetries) {
          const delay = retryOptions.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`[MultiImageEditManager] Retrying ${operationName} in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    // 所有重试都失败了
    console.error(`[MultiImageEditManager] ${operationName} failed after ${retryOptions.maxRetries} attempts`);
    
    if (retryOptions.fallbackToCache) {
      const cachedResult = await this.tryGetCachedResult<T>(operationName);
      if (cachedResult) {
        console.log(`[MultiImageEditManager] ✓ Using cached result for ${operationName}`);
        return cachedResult;
      }
    }

    throw lastError || new Error(`${operationName} failed after all retries`);
  }

  /**
   * 批量操作的错误恢复
   */
  private async handleBatchError(
    operation: BatchEditOperation,
    error: Error,
    remainingOperations: BatchEditOperation[]
  ): Promise<{ shouldContinue: boolean; modifiedOperations?: BatchEditOperation[] }> {
    console.log('[MultiImageEditManager] Handling batch error:', error.message);
    
    this.logError('batch_operation_failed', error, {
      operationId: operation.id,
      remainingCount: remainingOperations.length
    });

    // 分析错误类型
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'network':
        // 网络错误：减少并发数，继续处理
        console.log('[MultiImageEditManager] Network error detected, reducing concurrency');
        return { shouldContinue: true };
        
      case 'rate_limit':
        // 速率限制：增加延迟，继续处理
        console.log('[MultiImageEditManager] Rate limit detected, adding delay');
        await this.delay(5000); // 等待5秒
        return { shouldContinue: true };
        
      case 'validation':
        // 验证错误：跳过当前操作，继续处理其他
        console.log('[MultiImageEditManager] Validation error, skipping operation');
        return { shouldContinue: true };
        
      case 'system':
        // 系统错误：停止批量处理
        console.error('[MultiImageEditManager] System error, stopping batch processing');
        return { shouldContinue: false };
        
      default:
        // 未知错误：尝试继续，但记录警告
        console.warn('[MultiImageEditManager] Unknown error type, attempting to continue');
        return { shouldContinue: true };
    }
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: Error): 'network' | 'rate_limit' | 'validation' | 'system' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
      return 'rate_limit';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
      return 'validation';
    }
    
    if (message.includes('internal server') || message.includes('500') || message.includes('503')) {
      return 'system';
    }
    
    return 'unknown';
  }

  /**
   * 从存储损坏中恢复
   */
  private async recoverFromStorageCorruption(corruptedKeys: string[]): Promise<void> {
    console.log('[MultiImageEditManager] Recovering from storage corruption:', corruptedKeys);
    
    for (const key of corruptedKeys) {
      if (key === this.STORAGE_KEYS.editHistory) {
        // 重置编辑历史
        localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify([]));
        console.log('[MultiImageEditManager] ✓ Reset edit history');
      } else if (key === this.STORAGE_KEYS.editSession) {
        // 清除损坏的会话
        localStorage.removeItem(this.STORAGE_KEYS.editSession);
        console.log('[MultiImageEditManager] ✓ Cleared corrupted session');
      } else if (key === this.STORAGE_KEYS.errorLog) {
        // 重置错误日志
        localStorage.setItem(this.STORAGE_KEYS.errorLog, JSON.stringify([]));
        console.log('[MultiImageEditManager] ✓ Reset error log');
      }
    }
  }

  /**
   * 清理旧的编辑历史
   */
  private async cleanupOldEditHistory(): Promise<void> {
    try {
      const history = this.getEditHistory();
      if (history.length > 3) {
        // 只保留最近3个操作
        const recentHistory = history.slice(0, 3);
        localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify(recentHistory));
        console.log(`[MultiImageEditManager] ✓ Cleaned up ${history.length - 3} old edit operations`);
      }
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to cleanup edit history:', error);
      // 如果清理失败，直接重置
      localStorage.setItem(this.STORAGE_KEYS.editHistory, JSON.stringify([]));
    }
  }

  /**
   * 恢复中断的编辑会话
   */
  private async recoverInterruptedSession(): Promise<void> {
    try {
      const sessionData = localStorage.getItem(this.STORAGE_KEYS.editSession);
      if (sessionData) {
        const session: ImageEditSession = JSON.parse(sessionData);
        
        // 检查会话是否太旧（超过1小时）
        const sessionAge = Date.now() - session.createdAt;
        if (sessionAge > 60 * 60 * 1000) {
          console.log('[MultiImageEditManager] Session too old, discarding');
          localStorage.removeItem(this.STORAGE_KEYS.editSession);
          return;
        }
        
        this.currentSession = session;
        console.log('[MultiImageEditManager] ✓ Recovered interrupted session');
      }
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to recover session:', error);
      localStorage.removeItem(this.STORAGE_KEYS.editSession);
    }
  }

  /**
   * 尝试获取缓存结果
   */
  private async tryGetCachedResult<T>(operationName: string): Promise<T | null> {
    try {
      // 这里可以实现更复杂的缓存逻辑
      // 目前返回null，表示没有缓存
      return null;
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to get cached result:', error);
      return null;
    }
  }

  /**
   * 记录错误
   */
  private logError(type: string, error: Error | unknown, context?: any): void {
    try {
      const errorLog = {
        type,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: Date.now()
      };

      const existingLogs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.errorLog) || '[]');
      existingLogs.unshift(errorLog);
      
      // 只保留最近50个错误
      if (existingLogs.length > 50) {
        existingLogs.splice(50);
      }
      
      localStorage.setItem(this.STORAGE_KEYS.errorLog, JSON.stringify(existingLogs));
    } catch (logError) {
      console.warn('[MultiImageEditManager] Failed to log error:', logError);
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): {
    total: number;
    byType: Record<string, number>;
    recent: Array<{ type: string; message: string; timestamp: number }>;
  } {
    try {
      const errorLogs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.errorLog) || '[]');
      
      const byType: Record<string, number> = {};
      errorLogs.forEach((log: any) => {
        byType[log.type] = (byType[log.type] || 0) + 1;
      });
      
      const recent = errorLogs.slice(0, 10).map((log: any) => ({
        type: log.type,
        message: log.message,
        timestamp: log.timestamp
      }));
      
      return {
        total: errorLogs.length,
        byType,
        recent
      };
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to get error statistics:', error);
      return { total: 0, byType: {}, recent: [] };
    }
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.errorLog);
      console.log('[MultiImageEditManager] Error log cleared');
    } catch (error) {
      console.warn('[MultiImageEditManager] Failed to clear error log:', error);
    }
  }
}

export default MultiImageEditManager;