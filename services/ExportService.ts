import { Block, ExportLayout } from '../types';

export interface ExportOptions {
  layout?: ExportLayout;
  quality?: number;
  padding?: number;
  frameWidth?: number;
  backgroundColor?: string;
  includeLabels?: boolean;
  labelPrefix?: string;
}

export interface LayoutGrid {
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
}

export class ExportService {
  private static readonly CORS_PROXIES = [
    'https://cors.bridged.cc/',
    'https://api.allorigins.win/raw?url=',
    'https://proxy.cors.sh/?url='
  ];

  private static readonly DEFAULT_OPTIONS: Required<ExportOptions> = {
    layout: '2x2',
    quality: 0.9,
    padding: 20,
    frameWidth: 400,
    backgroundColor: '#ffffff',
    includeLabels: true,
    labelPrefix: 'SC'
  };

  /**
   * 导出分镜图为JPEG文件
   * Export storyboard as JPEG file
   */
  async exportStoryboard(blocks: Block[], options: ExportOptions = {}): Promise<string> {
    const opts = { ...ExportService.DEFAULT_OPTIONS, ...options };
    
    if (blocks.length === 0) {
      throw new Error('No blocks provided for export');
    }

    // 验证所有块都有图像内容
    // Validate all blocks have image content
    const imageBlocks = blocks.filter(block => 
      block.type === 'image' && block.content && block.content.startsWith('http')
    );

    if (imageBlocks.length === 0) {
      throw new Error('No image blocks found for export');
    }

    // 生成布局网格
    // Generate layout grid
    const grid = this.generateLayoutGrid(imageBlocks, opts.layout, opts);

    // 渲染到画布
    // Render to canvas
    const canvas = await this.renderToCanvas(imageBlocks, grid, opts);

    // 转换为数据URL
    // Convert to data URL
    return canvas.toDataURL('image/jpeg', opts.quality);
  }

  /**
   * 生成布局网格配置
   * Generate layout grid configuration
   */
  private generateLayoutGrid(blocks: Block[], layout: ExportLayout, options: ExportOptions): LayoutGrid {
    const frameCount = blocks.length;
    const padding = options.padding || ExportService.DEFAULT_OPTIONS.padding;
    const frameWidth = options.frameWidth || ExportService.DEFAULT_OPTIONS.frameWidth;
    
    // 根据布局类型确定网格尺寸
    // Determine grid dimensions based on layout type
    let cols: number, rows: number;
    
    switch (layout) {
      case '2x2':
        cols = 2;
        rows = 2;
        break;
      case '2x3':
        cols = 2;
        rows = 3;
        break;
      case '3x3':
        cols = 3;
        rows = 3;
        break;
      case '4x3':
        cols = 4;
        rows = 3;
        break;
      case 'main-2x2':
      case 'main-2x3':
      case 'main-3x3':
      case 'main-4x3':
        // 主要布局暂时使用标准网格
        // Main layouts use standard grid for now
        const mainLayout = layout.replace('main-', '') as ExportLayout;
        return this.generateLayoutGrid(blocks, mainLayout, options);
      default:
        // 自动确定最佳布局
        // Auto-determine best layout
        if (frameCount <= 2) {
          cols = frameCount;
          rows = 1;
        } else if (frameCount <= 4) {
          cols = 2;
          rows = Math.ceil(frameCount / 2);
        } else if (frameCount <= 6) {
          cols = 3;
          rows = Math.ceil(frameCount / 3);
        } else {
          cols = Math.ceil(Math.sqrt(frameCount));
          rows = Math.ceil(frameCount / cols);
        }
    }

    // 计算帧高度（假设16:9比例）
    // Calculate frame height (assuming 16:9 ratio)
    const frameHeight = Math.round(frameWidth * 9 / 16);

    // 计算画布尺寸
    // Calculate canvas dimensions
    const canvasWidth = frameWidth * cols + padding * (cols + 1);
    const canvasHeight = frameHeight * rows + padding * (rows + 1);

    return {
      cols,
      rows,
      frameWidth,
      frameHeight,
      canvasWidth,
      canvasHeight,
      padding
    };
  }

  /**
   * 渲染块到画布
   * Render blocks to canvas
   */
  private async renderToCanvas(blocks: Block[], grid: LayoutGrid, options: ExportOptions): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // 设置画布尺寸
    // Set canvas dimensions
    canvas.width = grid.canvasWidth;
    canvas.height = grid.canvasHeight;

    // 填充背景色
    // Fill background color
    ctx.fillStyle = options.backgroundColor || ExportService.DEFAULT_OPTIONS.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 按位置排序块（从左到右，从上到下）
    // Sort blocks by position (left to right, top to bottom)
    const sortedBlocks = [...blocks].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y;
      return a.x - b.x;
    });

    // 加载并绘制所有图像
    // Load and draw all images
    const imagePromises = sortedBlocks.map(async (block, index) => {
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      
      const x = grid.padding + col * (grid.frameWidth + grid.padding);
      const y = grid.padding + row * (grid.frameHeight + grid.padding);

      try {
        const success = await this.loadAndDrawImage(
          ctx,
          block.content,
          x,
          y,
          grid.frameWidth,
          grid.frameHeight
        );

        if (success) {
          // 绘制边框
          // Draw border
          ctx.strokeStyle = '#0000ff';
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, grid.frameWidth, grid.frameHeight);

          // 绘制标签
          // Draw label
          if (options.includeLabels) {
            const labelText = `${options.labelPrefix || 'SC'}-${String(index + 1).padStart(2, '0')}`;
            this.drawLabel(ctx, labelText, x + 10, y + 10);
          }
        } else {
          // 绘制占位符
          // Draw placeholder
          this.drawPlaceholder(ctx, x, y, grid.frameWidth, grid.frameHeight, index + 1, options);
        }
      } catch (error) {
        console.error(`Failed to draw block ${block.id}:`, error);
        // 绘制错误占位符
        // Draw error placeholder
        this.drawPlaceholder(ctx, x, y, grid.frameWidth, grid.frameHeight, index + 1, options);
      }
    });

    await Promise.all(imagePromises);
    return canvas;
  }

  /**
   * 加载并绘制图像（支持CORS代理）
   * Load and draw image (with CORS proxy support)
   */
  private async loadAndDrawImage(
    ctx: CanvasRenderingContext2D,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    proxyIndex: number = 0
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      
      // 设置CORS属性
      // Set CORS attribute
      if (!url.startsWith('data:')) {
        img.crossOrigin = "anonymous";
      }

      // 设置超时
      // Set timeout
      const timeout = setTimeout(() => {
        console.warn(`Image load timeout (attempt ${proxyIndex + 1}): ${url.substring(0, 50)}`);
        
        // 尝试下一个代理
        // Try next proxy
        if (proxyIndex < ExportService.CORS_PROXIES.length) {
          console.log(`Retrying with CORS proxy ${proxyIndex + 1}/${ExportService.CORS_PROXIES.length}...`);
          this.loadAndDrawImage(ctx, url, x, y, width, height, proxyIndex + 1).then(resolve);
        } else {
          console.warn(`All ${ExportService.CORS_PROXIES.length + 1} attempts failed for: ${url.substring(0, 50)}`);
          resolve(false);
        }
      }, 30000); // 30 seconds timeout

      img.onload = () => {
        clearTimeout(timeout);
        try {
          if (img.width > 0 && img.height > 0) {
            ctx.drawImage(img, x, y, width, height);
            const method = proxyIndex === 0 ? 'direct' : `proxy ${proxyIndex}`;
            console.log(`Image drawn successfully (${method}): ${url.substring(0, 50)}`);
            resolve(true);
          } else {
            console.warn('Image loaded but has zero dimensions');
            resolve(false);
          }
        } catch (e) {
          console.error('Failed to draw image on canvas:', e);
          resolve(false);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`Image load failed (attempt ${proxyIndex + 1}): ${url.substring(0, 50)}`);
        
        // 尝试下一个代理
        // Try next proxy
        if (proxyIndex < ExportService.CORS_PROXIES.length) {
          console.log(`Retrying with CORS proxy ${proxyIndex + 1}/${ExportService.CORS_PROXIES.length}...`);
          this.loadAndDrawImage(ctx, url, x, y, width, height, proxyIndex + 1).then(resolve);
        } else {
          console.warn(`All ${ExportService.CORS_PROXIES.length + 1} attempts failed for: ${url.substring(0, 50)}`);
          resolve(false);
        }
      };

      // 使用直接URL或代理URL
      // Use direct URL or proxy URL
      let loadUrl: string;
      if (proxyIndex === 0) {
        loadUrl = url;
      } else {
        loadUrl = this.getCorsProxyUrl(url, proxyIndex - 1);
      }

      console.log(`Loading image (attempt ${proxyIndex + 1}): ${loadUrl.substring(0, 80)}...`);
      img.src = loadUrl;
    });
  }

  /**
   * 获取CORS代理URL
   * Get CORS proxy URL
   */
  private getCorsProxyUrl(url: string, proxyIndex: number): string {
    if (proxyIndex >= ExportService.CORS_PROXIES.length) return url;
    
    const proxy = ExportService.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins')) {
      return `${proxy}${encodeURIComponent(url)}`;
    }
    if (proxy.includes('cors.sh')) {
      return `${proxy}${encodeURIComponent(url)}`;
    }
    return `${proxy}${url}`;
  }

  /**
   * 绘制标签
   * Draw label
   */
  private drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    // 标签背景
    // Label background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y, 60, 28);
    
    // 标签文字
    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px Inter';
    ctx.fillText(text, x + 8, y + 20);
  }

  /**
   * 绘制占位符
   * Draw placeholder
   */
  private drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    index: number,
    options: ExportOptions
  ): void {
    // 占位符背景
    // Placeholder background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x, y, width, height);
    
    // 边框
    // Border
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // 错误消息
    // Error message
    ctx.fillStyle = '#999999';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Image Failed', x + 10, y + height / 2 - 10);
    ctx.font = '12px Arial';
    ctx.fillText('to Load', x + 10, y + height / 2 + 10);
    
    // 标签
    // Label
    if (options.includeLabels) {
      const labelText = `${options.labelPrefix || 'SC'}-${String(index).padStart(2, '0')}`;
      this.drawLabel(ctx, labelText, x + 10, y + 10);
    }
  }

  /**
   * 下载数据URL为文件
   * Download data URL as file
   */
  static downloadDataUrl(dataUrl: string, filename?: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `Storyboard_Export_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * 获取支持的导出布局列表
   * Get list of supported export layouts
   */
  static getSupportedLayouts(): ExportLayout[] {
    return ['2x2', '2x3', '3x3', '4x3', 'main-2x2', 'main-2x3', 'main-3x3', 'main-4x3'];
  }

  /**
   * 验证导出布局
   * Validate export layout
   */
  static isValidLayout(layout: string): layout is ExportLayout {
    return ExportService.getSupportedLayouts().includes(layout as ExportLayout);
  }
}

export default ExportService;