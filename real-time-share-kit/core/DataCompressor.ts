/**
 * 数据压缩工具
 * 专门针对画布数据进行优化压缩
 */

export class DataCompressor {
  
  /**
   * 压缩画布数据
   */
  static compressCanvasData(data: any): any {
    if (!data) return data;
    
    const compressed = { ...data };
    
    // 压缩blocks数组
    if (compressed.blocks && Array.isArray(compressed.blocks)) {
      compressed.blocks = compressed.blocks.map(block => this.compressBlock(block));
    }
    
    // 压缩connections数组
    if (compressed.connections && Array.isArray(compressed.connections)) {
      compressed.connections = compressed.connections.map(conn => this.compressConnection(conn));
    }
    
    // 数值精度优化
    if (typeof compressed.zoom === 'number') {
      compressed.zoom = Math.round(compressed.zoom * 100) / 100; // 保留2位小数
    }
    
    if (compressed.pan) {
      compressed.pan.x = Math.round(compressed.pan.x);
      compressed.pan.y = Math.round(compressed.pan.y);
    }
    
    return compressed;
  }
  
  /**
   * 压缩单个block
   */
  private static compressBlock(block: any): any {
    const compressed: any = {
      id: block.id,
      type: block.type,
      x: Math.round(block.x),
      y: Math.round(block.y),
      width: Math.round(block.width),
      height: Math.round(block.height)
    };
    
    // 只包含必要的属性
    if (block.content) compressed.content = block.content;
    if (block.fontSize && block.fontSize !== 14) compressed.fontSize = block.fontSize;
    if (block.textColor && block.textColor !== '#000000') compressed.textColor = block.textColor;
    if (block.number) compressed.number = block.number;
    
    // 压缩状态信息
    if (block.status && block.status !== 'idle') compressed.status = block.status;
    
    return compressed;
  }
  
  /**
   * 压缩连接
   */
  private static compressConnection(connection: any): any {
    return {
      id: connection.id,
      fromId: connection.fromId,
      toId: connection.toId,
      // 只保留必要属性
      ...(connection.instruction && { instruction: connection.instruction })
    };
  }
  
  /**
   * 解压缩数据
   */
  static decompressCanvasData(compressed: any): any {
    if (!compressed) return compressed;
    
    const decompressed = { ...compressed };
    
    // 解压缩时恢复默认值
    if (decompressed.blocks && Array.isArray(decompressed.blocks)) {
      decompressed.blocks = decompressed.blocks.map(block => this.decompressBlock(block));
    }
    
    if (decompressed.connections && Array.isArray(decompressed.connections)) {
      decompressed.connections = decompressed.connections.map(conn => this.decompressConnection(conn));
    }
    
    return decompressed;
  }
  
  /**
   * 解压缩block
   */
  private static decompressBlock(block: any): any {
    return {
      ...block,
      fontSize: block.fontSize || 14,
      textColor: block.textColor || '#000000',
      status: block.status || 'idle',
      // 恢复其他默认属性
      originalPrompt: block.originalPrompt || '',
      aspectRatio: block.aspectRatio || null,
      multiImageGroupId: block.multiImageGroupId || null,
      multiImageIndex: block.multiImageIndex || null,
      isMultiImageSource: block.isMultiImageSource || false,
      character: block.character || null,
      backgroundColor: block.backgroundColor || 'transparent'
    };
  }
  
  /**
   * 解压缩connection
   */
  private static decompressConnection(connection: any): any {
    return {
      ...connection,
      instruction: connection.instruction || '',
      status: connection.status || 'idle'
    };
  }
  
  /**
   * 计算压缩率
   */
  static calculateCompressionRatio(original: any, compressed: any): number {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = JSON.stringify(compressed).length;
    return Math.round((1 - compressedSize / originalSize) * 100);
  }
  
  /**
   * 智能压缩：根据数据大小选择压缩策略
   */
  static smartCompress(data: any): { data: any; compressionInfo: string } {
    const originalSize = JSON.stringify(data).length;
    
    // 小数据不压缩
    if (originalSize < 1024) {
      return {
        data,
        compressionInfo: `原始数据 (${originalSize}字节)`
      };
    }
    
    // 应用压缩
    const compressed = this.compressCanvasData(data);
    const compressedSize = JSON.stringify(compressed).length;
    const ratio = this.calculateCompressionRatio(data, compressed);
    
    return {
      data: compressed,
      compressionInfo: `压缩 ${ratio}% (${originalSize}→${compressedSize}字节)`
    };
  }
  
  /**
   * 移除重复数据
   */
  static deduplicateBlocks(blocks: any[]): any[] {
    const seen = new Set();
    return blocks.filter(block => {
      const key = `${block.type}-${block.content}-${block.x}-${block.y}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * 优化数组数据
   */
  static optimizeArrays(data: any): any {
    const optimized = { ...data };
    
    if (optimized.blocks) {
      // 移除重复blocks
      optimized.blocks = this.deduplicateBlocks(optimized.blocks);
      
      // 按ID排序，提高压缩效率
      optimized.blocks.sort((a, b) => a.id.localeCompare(b.id));
    }
    
    if (optimized.connections) {
      // 移除无效连接
      optimized.connections = optimized.connections.filter(conn => 
        conn.fromId && conn.toId && 
        optimized.blocks?.some((b: any) => b.id === conn.fromId) &&
        optimized.blocks?.some((b: any) => b.id === conn.toId)
      );
    }
    
    return optimized;
  }
}