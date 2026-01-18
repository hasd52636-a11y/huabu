/**
 * 画布布局管理器
 * 
 * 功能：
 * - 智能计算多图模块布局位置
 * - 避免与现有模块重叠
 * - 支持网格、水平、垂直布局
 * - 自动扩展画布大小
 * - 支持编辑后图片的布局管理
 */

import { Block, LayoutPosition, EditResult } from '../types';

export class CanvasLayoutManager {
  private readonly DEFAULT_SPACING = 100; // 默认模块间距
  private readonly MIN_SPACING = 50;      // 最小间距
  private readonly CANVAS_PADDING = 200;  // 画布边距

  /**
   * 计算多图布局位置
   */
  calculateMultiImageLayout(
    sourceBlock: Block,
    imageCount: number,
    canvasBlocks: Block[],
    layoutPreference: 'grid' | 'horizontal' | 'vertical' = 'grid'
  ): LayoutPosition[] {
    console.log('[CanvasLayoutManager] Calculating layout for', imageCount, 'images');
    console.log('[CanvasLayoutManager] Layout preference:', layoutPreference);

    const blockSize = {
      width: sourceBlock.width,
      height: sourceBlock.height
    };

    // 根据布局偏好计算位置
    let positions: LayoutPosition[];
    
    switch (layoutPreference) {
      case 'horizontal':
        positions = this.calculateHorizontalLayout(sourceBlock, imageCount, blockSize);
        break;
      case 'vertical':
        positions = this.calculateVerticalLayout(sourceBlock, imageCount, blockSize);
        break;
      case 'grid':
      default:
        positions = this.calculateGridLayout(sourceBlock, imageCount, blockSize);
        break;
    }

    // 检测并解决重叠问题
    const adjustedPositions = this.resolveOverlaps(positions, canvasBlocks);

    console.log('[CanvasLayoutManager] ✓ Layout calculated successfully');
    return adjustedPositions;
  }

  /**
   * 网格布局算法
   */
  private calculateGridLayout(
    sourceBlock: Block,
    imageCount: number,
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const cols = Math.ceil(Math.sqrt(imageCount));
    const rows = Math.ceil(imageCount / cols);
    
    const spacing = this.DEFAULT_SPACING;
    const startX = sourceBlock.x + sourceBlock.width + spacing;
    const startY = sourceBlock.y - (rows * (blockSize.height + spacing)) / 2;
    
    const positions: LayoutPosition[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      positions.push({
        x: startX + col * (blockSize.width + spacing),
        y: startY + row * (blockSize.height + spacing),
        width: blockSize.width,
        height: blockSize.height,
        index: i
      });
    }
    
    return positions;
  }

  /**
   * 水平布局算法
   */
  private calculateHorizontalLayout(
    sourceBlock: Block,
    imageCount: number,
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const spacing = this.DEFAULT_SPACING;
    const startX = sourceBlock.x + sourceBlock.width + spacing;
    const startY = sourceBlock.y;
    
    const positions: LayoutPosition[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      positions.push({
        x: startX + i * (blockSize.width + spacing),
        y: startY,
        width: blockSize.width,
        height: blockSize.height,
        index: i
      });
    }
    
    return positions;
  }

  /**
   * 垂直布局算法
   */
  private calculateVerticalLayout(
    sourceBlock: Block,
    imageCount: number,
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const spacing = this.DEFAULT_SPACING;
    const startX = sourceBlock.x + sourceBlock.width + spacing;
    const startY = sourceBlock.y - (imageCount * (blockSize.height + spacing)) / 2;
    
    const positions: LayoutPosition[] = [];
    
    for (let i = 0; i < imageCount; i++) {
      positions.push({
        x: startX,
        y: startY + i * (blockSize.height + spacing),
        width: blockSize.width,
        height: blockSize.height,
        index: i
      });
    }
    
    return positions;
  }

  /**
   * 检测并解决重叠问题
   */
  private resolveOverlaps(
    positions: LayoutPosition[],
    existingBlocks: Block[]
  ): LayoutPosition[] {
    const adjustedPositions = [...positions];
    
    for (let i = 0; i < adjustedPositions.length; i++) {
      const position = adjustedPositions[i];
      let attempts = 0;
      const maxAttempts = 20;
      
      while (this.hasOverlap(position, existingBlocks, adjustedPositions.slice(0, i)) && attempts < maxAttempts) {
        // 尝试向右移动
        position.x += this.DEFAULT_SPACING;
        
        // 如果移动太远，尝试向下移动并重置X位置
        if (attempts > 10) {
          position.y += this.DEFAULT_SPACING;
          position.x = positions[0].x; // 重置到初始X位置
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.warn(`[CanvasLayoutManager] Could not resolve overlap for position ${i}`);
      }
    }
    
    return adjustedPositions;
  }

  /**
   * 检测是否有重叠
   */
  private hasOverlap(
    position: LayoutPosition,
    existingBlocks: Block[],
    previousPositions: LayoutPosition[] = []
  ): boolean {
    const buffer = this.MIN_SPACING;
    
    // 检查与现有模块的重叠
    for (const block of existingBlocks) {
      if (this.isOverlapping(position, block, buffer)) {
        return true;
      }
    }
    
    // 检查与之前位置的重叠
    for (const prevPos of previousPositions) {
      if (this.isOverlapping(position, prevPos, buffer)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 判断两个矩形是否重叠
   */
  private isOverlapping(
    pos1: LayoutPosition,
    pos2: { x: number; y: number; width: number; height: number },
    buffer: number = 0
  ): boolean {
    return !(
      pos1.x + pos1.width + buffer <= pos2.x ||
      pos2.x + pos2.width + buffer <= pos1.x ||
      pos1.y + pos1.height + buffer <= pos2.y ||
      pos2.y + pos2.height + buffer <= pos1.y
    );
  }

  /**
   * 计算最佳间距
   */
  findOptimalSpacing(
    sourcePosition: { x: number; y: number },
    blockSize: { width: number; height: number },
    existingBlocks: Block[]
  ): number {
    let spacing = this.DEFAULT_SPACING;
    const maxSpacing = 300;
    
    // 检查是否有足够空间
    while (spacing <= maxSpacing) {
      const testPosition = {
        x: sourcePosition.x + blockSize.width + spacing,
        y: sourcePosition.y,
        width: blockSize.width,
        height: blockSize.height,
        index: 0
      };
      
      if (!this.hasOverlap(testPosition, existingBlocks)) {
        return spacing;
      }
      
      spacing += 50;
    }
    
    return maxSpacing;
  }

  /**
   * 检查是否需要扩展画布
   */
  expandCanvasIfNeeded(
    newPositions: LayoutPosition[],
    currentCanvasSize: { width: number; height: number }
  ): { width: number; height: number; needsExpansion: boolean } {
    let maxX = currentCanvasSize.width;
    let maxY = currentCanvasSize.height;
    let minX = 0;
    let minY = 0;
    
    for (const pos of newPositions) {
      const rightEdge = pos.x + pos.width + this.CANVAS_PADDING;
      const bottomEdge = pos.y + pos.height + this.CANVAS_PADDING;
      const leftEdge = pos.x - this.CANVAS_PADDING;
      const topEdge = pos.y - this.CANVAS_PADDING;
      
      if (rightEdge > maxX) {
        maxX = rightEdge;
      }
      
      if (bottomEdge > maxY) {
        maxY = bottomEdge;
      }
      
      if (leftEdge < minX) {
        minX = leftEdge;
      }
      
      if (topEdge < minY) {
        minY = topEdge;
      }
    }
    
    const needsExpansion = maxX > currentCanvasSize.width || maxY > currentCanvasSize.height || minX < 0 || minY < 0;
    
    if (needsExpansion) {
      console.log('[CanvasLayoutManager] Canvas expansion needed:', {
        from: currentCanvasSize,
        to: { width: Math.max(maxX, currentCanvasSize.width), height: Math.max(maxY, currentCanvasSize.height) },
        bounds: { minX, minY, maxX, maxY }
      });
    }
    
    return {
      width: Math.max(maxX, currentCanvasSize.width),
      height: Math.max(maxY, currentCanvasSize.height),
      needsExpansion
    };
  }

  /**
   * 获取布局统计信息
   */
  getLayoutStats(positions: LayoutPosition[]): {
    totalArea: number;
    boundingBox: { width: number; height: number };
    density: number;
  } {
    if (positions.length === 0) {
      return { totalArea: 0, boundingBox: { width: 0, height: 0 }, density: 0 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let totalArea = 0;
    
    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
      totalArea += pos.width * pos.height;
    }
    
    const boundingBox = {
      width: maxX - minX,
      height: maxY - minY
    };
    
    const boundingArea = boundingBox.width * boundingBox.height;
    const density = boundingArea > 0 ? totalArea / boundingArea : 0;
    
    return {
      totalArea,
      boundingBox,
      density
    };
  }

  /**
   * 为编辑后的图片计算布局位置
   * 支持单图编辑和多图编辑结果
   */
  calculateEditedImageLayout(
    sourceBlocks: Block[],
    editResults: EditResult[],
    canvasBlocks: Block[],
    layoutPreference: 'replace' | 'beside' | 'below' = 'beside'
  ): LayoutPosition[] {
    console.log('[CanvasLayoutManager] Calculating edited image layout');
    console.log('[CanvasLayoutManager] Source blocks:', sourceBlocks.length);
    console.log('[CanvasLayoutManager] Edit results:', editResults.length);
    console.log('[CanvasLayoutManager] Layout preference:', layoutPreference);

    if (sourceBlocks.length === 0 || editResults.length === 0) {
      return [];
    }

    const primarySource = sourceBlocks[0];
    const blockSize = {
      width: primarySource.width,
      height: primarySource.height
    };

    let positions: LayoutPosition[];

    switch (layoutPreference) {
      case 'replace':
        positions = this.calculateReplaceLayout(sourceBlocks, editResults, blockSize);
        break;
      case 'below':
        positions = this.calculateBelowLayout(primarySource, editResults.length, blockSize);
        break;
      case 'beside':
      default:
        positions = this.calculateBesideLayout(primarySource, editResults.length, blockSize);
        break;
    }

    // 检测并解决重叠问题
    const adjustedPositions = this.resolveOverlaps(positions, canvasBlocks);

    console.log('[CanvasLayoutManager] ✓ Edited image layout calculated successfully');
    return adjustedPositions;
  }

  /**
   * 替换布局：编辑结果替换原始图片位置
   */
  private calculateReplaceLayout(
    sourceBlocks: Block[],
    editResults: EditResult[],
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const positions: LayoutPosition[] = [];
    
    // 如果只有一个结果，替换主要源图片
    if (editResults.length === 1) {
      const primarySource = sourceBlocks[0];
      positions.push({
        x: primarySource.x,
        y: primarySource.y,
        width: blockSize.width,
        height: blockSize.height,
        index: 0
      });
    } else {
      // 多个结果时，使用网格布局替换源图片区域
      const primarySource = sourceBlocks[0];
      const cols = Math.ceil(Math.sqrt(editResults.length));
      const spacing = this.MIN_SPACING;
      
      for (let i = 0; i < editResults.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        positions.push({
          x: primarySource.x + col * (blockSize.width + spacing),
          y: primarySource.y + row * (blockSize.height + spacing),
          width: blockSize.width,
          height: blockSize.height,
          index: i
        });
      }
    }
    
    return positions;
  }

  /**
   * 旁边布局：编辑结果放在源图片旁边
   */
  private calculateBesideLayout(
    sourceBlock: Block,
    resultCount: number,
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const spacing = this.DEFAULT_SPACING;
    const startX = sourceBlock.x + sourceBlock.width + spacing;
    
    if (resultCount === 1) {
      // 单个结果，直接放在旁边
      return [{
        x: startX,
        y: sourceBlock.y,
        width: blockSize.width,
        height: blockSize.height,
        index: 0
      }];
    } else {
      // 多个结果，使用垂直布局
      return this.calculateVerticalLayout(sourceBlock, resultCount, blockSize);
    }
  }

  /**
   * 下方布局：编辑结果放在源图片下方
   */
  private calculateBelowLayout(
    sourceBlock: Block,
    resultCount: number,
    blockSize: { width: number; height: number }
  ): LayoutPosition[] {
    const spacing = this.DEFAULT_SPACING;
    const startY = sourceBlock.y + sourceBlock.height + spacing;
    
    if (resultCount === 1) {
      // 单个结果，直接放在下方
      return [{
        x: sourceBlock.x,
        y: startY,
        width: blockSize.width,
        height: blockSize.height,
        index: 0
      }];
    } else {
      // 多个结果，使用水平布局
      const positions: LayoutPosition[] = [];
      
      for (let i = 0; i < resultCount; i++) {
        positions.push({
          x: sourceBlock.x + i * (blockSize.width + spacing),
          y: startY,
          width: blockSize.width,
          height: blockSize.height,
          index: i
        });
      }
      
      return positions;
    }
  }

  /**
   * 创建编辑后的图片块
   */
  createEditedImageBlocks(
    editResults: EditResult[],
    positions: LayoutPosition[],
    sourceBlocks: Block[]
  ): Block[] {
    const newBlocks: Block[] = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < editResults.length && i < positions.length; i++) {
      const result = editResults[i];
      const position = positions[i];
      const sourceBlock = sourceBlocks[0]; // Use primary source as template
      
      const newBlock: Block = {
        id: `edited_${timestamp}_${i}`,
        type: 'image',
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        content: result.resultImage,
        status: 'idle',
        number: this.generateBlockNumber(newBlocks.length + 1),
        aspectRatio: sourceBlock.aspectRatio,
        
        // Metadata for edited images
        originalPrompt: `Edited from ${sourceBlocks.map(b => b.number).join(', ')}`,
        imageMetadata: {
          width: position.width,
          height: position.height,
          aspectRatio: sourceBlock.aspectRatio,
          model: 'nano-banana', // Default model
          generatedAt: result.metadata.timestamp,
          fileSize: 0 // Will be calculated when image loads
        }
      };
      
      newBlocks.push(newBlock);
    }
    
    console.log('[CanvasLayoutManager] ✓ Created', newBlocks.length, 'edited image blocks');
    return newBlocks;
  }

  /**
   * 生成块编号
   */
  private generateBlockNumber(index: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    let num = index - 1;
    
    do {
      result = letters[num % 26] + result;
      num = Math.floor(num / 26);
    } while (num > 0);
    
    return result + '01'; // Default to 01 suffix
  }

  /**
   * 检查编辑结果是否需要特殊布局处理
   */
  shouldUseSpecialLayout(
    sourceBlocks: Block[],
    editResults: EditResult[]
  ): {
    useSpecial: boolean;
    reason: string;
    suggestedLayout: 'replace' | 'beside' | 'below';
  } {
    // 单图编辑 -> 建议替换
    if (sourceBlocks.length === 1 && editResults.length === 1) {
      return {
        useSpecial: true,
        reason: 'Single image edit - replace original',
        suggestedLayout: 'replace'
      };
    }
    
    // 多图输入，单个结果 -> 建议放在旁边
    if (sourceBlocks.length > 1 && editResults.length === 1) {
      return {
        useSpecial: true,
        reason: 'Multi-image input, single result - place beside',
        suggestedLayout: 'beside'
      };
    }
    
    // 多个结果 -> 建议网格布局
    if (editResults.length > 1) {
      return {
        useSpecial: true,
        reason: 'Multiple results - use grid layout',
        suggestedLayout: 'beside'
      };
    }
    
    return {
      useSpecial: false,
      reason: 'Standard layout is sufficient',
      suggestedLayout: 'beside'
    };
  }
}

export default CanvasLayoutManager;