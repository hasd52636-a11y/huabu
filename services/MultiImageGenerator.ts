/**
 * 多图生成核心服务 - 增强版
 * 
 * 功能：
 * - 集成神马API的多图生成功能
 * - 处理多图配置验证
 * - 管理多图生成状态
 * - 提供错误处理和恢复策略
 * - 图像一致性验证和质量评估
 * - 智能布局优化和画布投射
 * - 批量处理和进度跟踪
 */

import { ShenmaService } from './shenmaService';
import { 
  MultiImageConfig, 
  GenerationProgress, 
  ProcessedImage, 
  ErrorRecoveryAction,
  ImageSet,
  ConsistencyReport,
  ConsistencyIssue,
  LayoutResult,
  LayoutPosition,
  Dimensions
} from '../types';

export class MultiImageGenerator {
  private shenmaService: ShenmaService;
  private activeGenerations: Map<string, GenerationProgress> = new Map();

  constructor(shenmaService: ShenmaService) {
    this.shenmaService = shenmaService;
  }

  /**
   * 验证多图生成配置
   */
  validateConfig(config: MultiImageConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证数量范围
    if (config.count < 2 || config.count > 10) {
      errors.push('生成数量必须在2-10张之间');
    }

    // 验证模型支持
    const supportedModels = ['nano-banana', 'nano-banana-hd', 'nano-banana-2'];
    if (config.model && !supportedModels.includes(config.model)) {
      errors.push(`不支持的模型: ${config.model}`);
    }

    // 验证图片尺寸
    const supportedSizes = ['1K', '2K', '4K'];
    if (config.imageSize && !supportedSizes.includes(config.imageSize)) {
      errors.push(`不支持的图片尺寸: ${config.imageSize}`);
    }

    // 验证宽高比
    const supportedRatios = ['16:9', '9:16', '1:1', '4:3', '4:5', '5:4', '2:3', '3:2', '21:9'];
    if (config.aspectRatio && !supportedRatios.includes(config.aspectRatio)) {
      errors.push(`不支持的宽高比: ${config.aspectRatio}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成多张图片 - 增强版本
   * 支持图像一致性验证和布局优化
   */
  async generateImageSet(
    sourceBlockId: string,
    prompt: string,
    config: MultiImageConfig,
    canvasSize?: Dimensions,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<ImageSet> {
    console.log('[MultiImageGenerator] Starting enhanced multi-image generation');
    console.log('[MultiImageGenerator] Config:', config);

    // 验证配置
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 初始化进度状态
    const progress: GenerationProgress = {
      sourceBlockId,
      totalCount: config.count,
      completedCount: 0,
      status: 'generating'
    };

    this.activeGenerations.set(sourceBlockId, progress);
    onProgress?.(progress);

    const startTime = Date.now();

    try {
      // 调用神马API生成多图
      const response = await this.shenmaService.generateImage(prompt, {
        count: config.count,
        aspectRatio: (config.aspectRatio || '16:9') as '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '5:4' | '2:3' | '3:2' | '21:9',
        imageSize: config.imageSize,
        model: config.model || 'nano-banana'
      });

      // 更新进度状态
      progress.status = 'processing';
      onProgress?.(progress);

      // 处理API响应
      const processedImages = await this.processMultiImageResponse(response, sourceBlockId);

      // 验证图像一致性
      const consistencyReport = await this.validateImageConsistency(processedImages);

      // 优化布局
      const layoutResult = canvasSize 
        ? this.optimizeImageLayout(processedImages, canvasSize)
        : this.createDefaultLayout(processedImages, config);

      // 计算生成时间
      const generationTime = Date.now() - startTime;

      // 创建ImageSet
      const imageSet: ImageSet = {
        images: processedImages,
        metadata: {
          totalCount: config.count,
          successCount: processedImages.filter(img => img.status === 'ready').length,
          failedCount: processedImages.filter(img => img.status === 'error').length,
          averageGenerationTime: generationTime / processedImages.length,
          consistencyScore: consistencyReport.overallScore
        },
        layout: layoutResult
      };

      // 更新完成状态
      progress.status = 'completed';
      progress.completedCount = imageSet.metadata.successCount;
      onProgress?.(progress);

      console.log(`[MultiImageGenerator] ✓ Generated ${imageSet.metadata.successCount} images successfully`);
      console.log(`[MultiImageGenerator] Consistency Score: ${consistencyReport.overallScore.toFixed(2)}`);
      
      return imageSet;

    } catch (error) {
      console.error('[MultiImageGenerator] Generation failed:', error);
      
      // 更新错误状态
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(progress);

      // 尝试错误恢复
      const recoveryAction = await this.handleGenerationError(error as Error, config);
      throw new Error(`${progress.error}\n建议: ${recoveryAction.message}`);
    } finally {
      // 清理状态
      this.activeGenerations.delete(sourceBlockId);
    }
  }

  /**
   * 验证图像一致性
   * 分析生成的图像在风格、色彩、构图等方面的一致性
   */
  async validateImageConsistency(images: ProcessedImage[]): Promise<ConsistencyReport> {
    console.log('[MultiImageGenerator] Validating image consistency');

    const readyImages = images.filter(img => img.status === 'ready');
    
    if (readyImages.length < 2) {
      return {
        overallScore: 1.0,
        styleConsistency: 1.0,
        colorConsistency: 1.0,
        compositionConsistency: 1.0,
        recommendations: [],
        issues: []
      };
    }

    try {
      // 分析图像特征
      const imageFeatures = await Promise.all(
        readyImages.map(img => this.extractImageFeatures(img))
      );

      // 计算一致性分数
      const styleConsistency = this.calculateStyleConsistency(imageFeatures);
      const colorConsistency = this.calculateColorConsistency(imageFeatures);
      const compositionConsistency = this.calculateCompositionConsistency(imageFeatures);

      // 计算总体分数
      const overallScore = (styleConsistency + colorConsistency + compositionConsistency) / 3;

      // 生成问题报告和建议
      const issues = this.identifyConsistencyIssues(imageFeatures, {
        styleConsistency,
        colorConsistency,
        compositionConsistency
      });

      const recommendations = this.generateConsistencyRecommendations(issues, overallScore);

      return {
        overallScore,
        styleConsistency,
        colorConsistency,
        compositionConsistency,
        recommendations,
        issues
      };

    } catch (error) {
      console.error('[MultiImageGenerator] Consistency validation failed:', error);
      
      // 返回默认报告
      return {
        overallScore: 0.7, // 假设中等一致性
        styleConsistency: 0.7,
        colorConsistency: 0.7,
        compositionConsistency: 0.7,
        recommendations: ['无法完成详细一致性分析，建议手动检查图像质量'],
        issues: [{
          type: 'quality_difference',
          severity: 'low',
          affectedImages: images.map((_, i) => i),
          description: '无法自动分析图像一致性',
          suggestion: '请手动检查生成的图像是否符合预期'
        }]
      };
    }
  }

  /**
   * 优化图像布局
   * 根据画布尺寸和图像数量计算最佳布局
   */
  optimizeImageLayout(images: ProcessedImage[], canvasSize: Dimensions): LayoutResult {
    console.log('[MultiImageGenerator] Optimizing image layout');

    const imageCount = images.length;
    const { width: canvasWidth, height: canvasHeight } = canvasSize;

    // 计算最佳网格布局
    const gridLayout = this.calculateOptimalGrid(imageCount, canvasSize);
    
    // 计算图像尺寸和间距
    const spacing = Math.min(canvasWidth, canvasHeight) * 0.02; // 2% of smaller dimension
    const availableWidth = canvasWidth - (gridLayout.cols + 1) * spacing;
    const availableHeight = canvasHeight - (gridLayout.rows + 1) * spacing;
    
    const imageWidth = availableWidth / gridLayout.cols;
    const imageHeight = availableHeight / gridLayout.rows;

    // 生成位置信息
    const positions: LayoutPosition[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      const row = Math.floor(i / gridLayout.cols);
      const col = i % gridLayout.cols;
      
      const x = spacing + col * (imageWidth + spacing);
      const y = spacing + row * (imageHeight + spacing);
      
      positions.push({
        x,
        y,
        width: imageWidth,
        height: imageHeight,
        index: i
      });
    }

    // 计算布局效率和视觉平衡
    const totalImageArea = imageCount * imageWidth * imageHeight;
    const totalCanvasArea = canvasWidth * canvasHeight;
    const efficiency = totalImageArea / totalCanvasArea;
    
    // 简单的视觉平衡计算（基于位置分布）
    const visualBalance = this.calculateVisualBalance(positions, canvasSize);

    return {
      positions,
      canvasSize,
      spacing,
      arrangement: 'grid',
      metadata: {
        totalArea: totalImageArea,
        efficiency,
        visualBalance
      }
    };
  }

  /**
   * 处理多图API响应
   */
  private async processMultiImageResponse(
    response: string,
    sourceBlockId: string
  ): Promise<ProcessedImage[]> {
    try {
      // 尝试解析JSON格式的多图响应
      const parsedResponse = JSON.parse(response);
      
      if (parsedResponse.type === 'multiple_images' && parsedResponse.images) {
        const imageUrls = parsedResponse.images;
        console.log(`[MultiImageGenerator] Processing ${imageUrls.length} images`);

        // 并发下载和处理图片
        const processedImages = await this.downloadImagesConcurrently(imageUrls);
        return processedImages;
      }
    } catch (parseError) {
      // 如果不是JSON格式，可能是单张图片的base64
      console.log('[MultiImageGenerator] Response is not multi-image JSON, treating as single image');
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
  private async downloadImagesConcurrently(
    imageUrls: string[],
    maxConcurrent: number = 3
  ): Promise<ProcessedImage[]> {
    const processedImages: ProcessedImage[] = [];
    
    // 分批处理，避免过多并发请求
    for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
      const batch = imageUrls.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (url, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          // 将URL转换为base64
          const base64 = await this.urlToBase64(url);
          
          return {
            url,
            base64: base64 || url,
            index: globalIndex,
            status: 'ready' as const
          };
        } catch (error) {
          console.error(`[MultiImageGenerator] Failed to process image ${globalIndex}:`, error);
          
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

    return processedImages;
  }

  /**
   * 将URL转换为base64
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
          console.error("[MultiImageGenerator] Canvas conversion failed", err);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error("[MultiImageGenerator] Image load failed for URL:", url);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * 错误处理和恢复策略
   */
  private async handleGenerationError(
    error: Error,
    config: MultiImageConfig
  ): Promise<ErrorRecoveryAction> {
    const errorMessage = error.message.toLowerCase();

    // API限制错误
    if (errorMessage.includes('limit') || errorMessage.includes('quota')) {
      return {
        type: 'reduce_count',
        suggestedCount: Math.max(2, Math.floor(config.count / 2)),
        message: `生成数量超出限制，建议减少到 ${Math.max(2, Math.floor(config.count / 2))} 张`
      };
    }

    // 网络超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return {
        type: 'retry',
        retryDelay: 5000,
        message: '网络超时，5秒后自动重试'
      };
    }

    // 模型不支持错误
    if (errorMessage.includes('model') || errorMessage.includes('not supported')) {
      return {
        type: 'manual_retry',
        message: '当前模型不支持多图生成，请尝试使用 nano-banana 模型'
      };
    }

    // 通用错误
    return {
      type: 'manual_retry',
      message: '生成失败，请检查网络连接和API配置后重试'
    };
  }

  /**
   * 获取生成进度
   */
  getGenerationProgress(sourceBlockId: string): GenerationProgress | null {
    return this.activeGenerations.get(sourceBlockId) || null;
  }

  /**
   * 取消生成
   */
  cancelGeneration(sourceBlockId: string): void {
    const progress = this.activeGenerations.get(sourceBlockId);
    if (progress) {
      progress.status = 'error';
      progress.error = 'User cancelled';
      this.activeGenerations.delete(sourceBlockId);
      console.log(`[MultiImageGenerator] Generation cancelled for block: ${sourceBlockId}`);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.activeGenerations.clear();
    console.log('[MultiImageGenerator] Resources cleaned up');
  }

  // ===== 私有辅助方法 =====

  /**
   * 提取图像特征用于一致性分析
   */
  private async extractImageFeatures(image: ProcessedImage): Promise<any> {
    // 这里实现图像特征提取逻辑
    // 在实际应用中，可以使用Canvas API或图像处理库
    return new Promise((resolve) => {
      if (!image.base64) {
        resolve({
          dominantColors: ['#000000'],
          brightness: 0.5,
          contrast: 0.5,
          saturation: 0.5,
          complexity: 0.5
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dominantColors: ['#000000'],
              brightness: 0.5,
              contrast: 0.5,
              saturation: 0.5,
              complexity: 0.5
            });
            return;
          }

          canvas.width = 100; // 缩小尺寸以提高分析速度
          canvas.height = 100;
          ctx.drawImage(img, 0, 0, 100, 100);

          const imageData = ctx.getImageData(0, 0, 100, 100);
          const features = this.analyzeImageData(imageData);
          resolve(features);
        } catch (error) {
          console.error('[MultiImageGenerator] Feature extraction failed:', error);
          resolve({
            dominantColors: ['#000000'],
            brightness: 0.5,
            contrast: 0.5,
            saturation: 0.5,
            complexity: 0.5
          });
        }
      };

      img.onerror = () => {
        resolve({
          dominantColors: ['#000000'],
          brightness: 0.5,
          contrast: 0.5,
          saturation: 0.5,
          complexity: 0.5
        });
      };

      img.src = image.base64;
    });
  }

  /**
   * 分析图像数据
   */
  private analyzeImageData(imageData: ImageData): any {
    const data = imageData.data;
    const pixels = data.length / 4;
    
    let totalR = 0, totalG = 0, totalB = 0;
    let minBrightness = 255, maxBrightness = 0;
    const colorCounts: { [key: string]: number } = {};

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalR += r;
      totalG += g;
      totalB += b;

      const brightness = (r + g + b) / 3;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);

      // 简化颜色到最近的16色
      const simplifiedColor = this.simplifyColor(r, g, b);
      colorCounts[simplifiedColor] = (colorCounts[simplifiedColor] || 0) + 1;
    }

    const avgR = totalR / pixels;
    const avgG = totalG / pixels;
    const avgB = totalB / pixels;
    const avgBrightness = (avgR + avgG + avgB) / 3;
    const contrast = (maxBrightness - minBrightness) / 255;

    // 计算饱和度
    const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);

    // 获取主要颜色
    const dominantColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([color]) => color);

    // 计算复杂度（基于颜色多样性）
    const uniqueColors = Object.keys(colorCounts).length;
    const complexity = Math.min(uniqueColors / 16, 1);

    return {
      dominantColors,
      brightness: avgBrightness / 255,
      contrast,
      saturation: saturation / 255,
      complexity
    };
  }

  /**
   * 简化颜色到最近的基础色
   */
  private simplifyColor(r: number, g: number, b: number): string {
    const threshold = 64;
    const sr = Math.floor(r / threshold) * threshold;
    const sg = Math.floor(g / threshold) * threshold;
    const sb = Math.floor(b / threshold) * threshold;
    return `rgb(${sr},${sg},${sb})`;
  }

  /**
   * 计算风格一致性
   */
  private calculateStyleConsistency(features: any[]): number {
    if (features.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const similarity = this.calculateFeatureSimilarity(features[i], features[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  /**
   * 计算色彩一致性
   */
  private calculateColorConsistency(features: any[]): number {
    if (features.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const colorSimilarity = this.calculateColorSimilarity(
          features[i].dominantColors,
          features[j].dominantColors
        );
        totalSimilarity += colorSimilarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  /**
   * 计算构图一致性
   */
  private calculateCompositionConsistency(features: any[]): number {
    if (features.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const complexitySimilarity = 1 - Math.abs(features[i].complexity - features[j].complexity);
        const contrastSimilarity = 1 - Math.abs(features[i].contrast - features[j].contrast);
        const compositionSimilarity = (complexitySimilarity + contrastSimilarity) / 2;
        
        totalSimilarity += compositionSimilarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  /**
   * 计算特征相似度
   */
  private calculateFeatureSimilarity(features1: any, features2: any): number {
    const brightnessSimilarity = 1 - Math.abs(features1.brightness - features2.brightness);
    const saturationSimilarity = 1 - Math.abs(features1.saturation - features2.saturation);
    const complexitySimilarity = 1 - Math.abs(features1.complexity - features2.complexity);
    
    return (brightnessSimilarity + saturationSimilarity + complexitySimilarity) / 3;
  }

  /**
   * 计算颜色相似度
   */
  private calculateColorSimilarity(colors1: string[], colors2: string[]): number {
    const commonColors = colors1.filter(color => colors2.includes(color));
    const totalUniqueColors = new Set([...colors1, ...colors2]).size;
    
    return totalUniqueColors > 0 ? commonColors.length / totalUniqueColors : 1.0;
  }

  /**
   * 识别一致性问题
   */
  private identifyConsistencyIssues(
    features: any[], 
    scores: { styleConsistency: number; colorConsistency: number; compositionConsistency: number }
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    if (scores.styleConsistency < 0.7) {
      issues.push({
        type: 'style_mismatch',
        severity: scores.styleConsistency < 0.5 ? 'high' : 'medium',
        affectedImages: features.map((_, i) => i),
        description: '图像风格存在明显差异',
        suggestion: '尝试使用更具体的风格描述词，或调整生成模型'
      });
    }

    if (scores.colorConsistency < 0.6) {
      issues.push({
        type: 'color_deviation',
        severity: scores.colorConsistency < 0.4 ? 'high' : 'medium',
        affectedImages: features.map((_, i) => i),
        description: '图像色彩搭配不够统一',
        suggestion: '在提示词中添加具体的色彩要求，如"暖色调"或"蓝色主题"'
      });
    }

    if (scores.compositionConsistency < 0.6) {
      issues.push({
        type: 'composition_variance',
        severity: scores.compositionConsistency < 0.4 ? 'high' : 'medium',
        affectedImages: features.map((_, i) => i),
        description: '图像构图复杂度差异较大',
        suggestion: '使用更统一的构图描述，如"简洁构图"或"对称布局"'
      });
    }

    return issues;
  }

  /**
   * 生成一致性建议
   */
  private generateConsistencyRecommendations(issues: ConsistencyIssue[], overallScore: number): string[] {
    const recommendations: string[] = [];

    if (overallScore >= 0.8) {
      recommendations.push('图像一致性良好，可以直接使用');
    } else if (overallScore >= 0.6) {
      recommendations.push('图像一致性中等，建议检查并调整不符合要求的图像');
    } else {
      recommendations.push('图像一致性较低，建议重新生成或调整提示词');
    }

    // 基于具体问题添加建议
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push('发现严重一致性问题，强烈建议重新生成');
    }

    if (issues.some(issue => issue.type === 'style_mismatch')) {
      recommendations.push('添加更具体的风格描述词，如"卡通风格"、"写实风格"等');
    }

    if (issues.some(issue => issue.type === 'color_deviation')) {
      recommendations.push('在提示词中明确指定色彩方案或色调');
    }

    return recommendations;
  }

  /**
   * 计算最佳网格布局
   */
  private calculateOptimalGrid(imageCount: number, canvasSize: Dimensions): { rows: number; cols: number } {
    const aspectRatio = canvasSize.width / canvasSize.height;
    
    // 尝试不同的行列组合，找到最接近画布宽高比的布局
    let bestLayout = { rows: 1, cols: imageCount };
    let bestRatioDiff = Infinity;

    for (let cols = 1; cols <= imageCount; cols++) {
      const rows = Math.ceil(imageCount / cols);
      const layoutRatio = cols / rows;
      const ratioDiff = Math.abs(layoutRatio - aspectRatio);
      
      if (ratioDiff < bestRatioDiff) {
        bestRatioDiff = ratioDiff;
        bestLayout = { rows, cols };
      }
    }

    return bestLayout;
  }

  /**
   * 创建默认布局
   */
  private createDefaultLayout(images: ProcessedImage[], config: MultiImageConfig): LayoutResult {
    const imageCount = images.length;
    const defaultCanvasSize: Dimensions = { width: 1200, height: 800 };
    
    return this.optimizeImageLayout(images, defaultCanvasSize);
  }

  /**
   * 计算视觉平衡
   */
  private calculateVisualBalance(positions: LayoutPosition[], canvasSize: Dimensions): number {
    if (positions.length === 0) return 1.0;

    // 计算重心
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    let totalX = 0, totalY = 0;
    positions.forEach(pos => {
      totalX += pos.x + pos.width / 2;
      totalY += pos.y + pos.height / 2;
    });
    
    const avgX = totalX / positions.length;
    const avgY = totalY / positions.length;
    
    // 计算偏离中心的程度
    const deviationX = Math.abs(avgX - centerX) / centerX;
    const deviationY = Math.abs(avgY - centerY) / centerY;
    
    // 平衡分数：偏离越小，平衡越好
    const balance = 1 - (deviationX + deviationY) / 2;
    return Math.max(0, Math.min(1, balance));
  }

  /**
   * 生成多张图片 - 向后兼容方法
   * 保持与现有代码的兼容性
   */
  async generateMultipleImages(
    sourceBlockId: string,
    prompt: string,
    config: MultiImageConfig,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<ProcessedImage[]> {
    const imageSet = await this.generateImageSet(sourceBlockId, prompt, config, undefined, onProgress);
    return imageSet.images;
  }
}

export default MultiImageGenerator;