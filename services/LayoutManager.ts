/**
 * Layout Manager
 * Manages multi-line layout and positioning for tag chips
 */

export interface TagPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
  indexInLine: number;
}

export interface LayoutLine {
  y: number;
  height: number;
  width: number;
  tags: TagPosition[];
}

export interface LayoutConfig {
  containerWidth: number;
  lineHeight: number;
  tagSpacing: number;
  lineSpacing: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface LayoutResult {
  lines: LayoutLine[];
  totalHeight: number;
  totalWidth: number;
  tagPositions: Map<string, TagPosition>;
}

export interface TagDimensions {
  id: string;
  width: number;
  height: number;
  minWidth?: number;
  maxWidth?: number;
}

export class LayoutManager {
  private config: LayoutConfig;
  private lastLayout: LayoutResult | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;

  constructor(config: LayoutConfig) {
    this.config = { ...config };
    this.setupResizeObserver();
  }

  /**
   * Calculate layout for given tag dimensions
   */
  public calculateLayout(tags: TagDimensions[]): LayoutResult {
    const lines: LayoutLine[] = [];
    const tagPositions = new Map<string, TagPosition>();
    
    let currentLine: LayoutLine = {
      y: this.config.padding.top,
      height: this.config.lineHeight,
      width: 0,
      tags: []
    };
    
    let currentX = this.config.padding.left;
    const availableWidth = this.config.containerWidth - this.config.padding.left - this.config.padding.right;

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const tagWidth = this.calculateTagWidth(tag);
      const tagHeight = tag.height || this.config.lineHeight;
      
      // Check if tag fits on current line
      const needsNewLine = currentX + tagWidth > this.config.padding.left + availableWidth && currentLine.tags.length > 0;
      
      if (needsNewLine) {
        // Finalize current line
        lines.push(currentLine);
        
        // Start new line
        currentLine = {
          y: currentLine.y + currentLine.height + this.config.lineSpacing,
          height: this.config.lineHeight,
          width: 0,
          tags: []
        };
        currentX = this.config.padding.left;
      }

      // Add tag to current line
      const tagPosition: TagPosition = {
        x: currentX,
        y: currentLine.y,
        width: tagWidth,
        height: tagHeight,
        lineIndex: lines.length,
        indexInLine: currentLine.tags.length
      };

      currentLine.tags.push(tagPosition);
      tagPositions.set(tag.id, tagPosition);
      
      // Update line dimensions
      currentLine.height = Math.max(currentLine.height, tagHeight);
      currentLine.width = currentX + tagWidth - this.config.padding.left;
      
      // Move to next position
      currentX += tagWidth + this.config.tagSpacing;
    }

    // Add final line if it has tags
    if (currentLine.tags.length > 0) {
      lines.push(currentLine);
    }

    // Calculate total dimensions
    const totalHeight = lines.length > 0 
      ? lines[lines.length - 1].y + lines[lines.length - 1].height + this.config.padding.bottom
      : this.config.padding.top + this.config.padding.bottom;
    
    const totalWidth = Math.max(
      ...lines.map(line => line.width + this.config.padding.left + this.config.padding.right),
      this.config.containerWidth
    );

    const result: LayoutResult = {
      lines,
      totalHeight,
      totalWidth,
      tagPositions
    };

    this.lastLayout = result;
    return result;
  }

  /**
   * Handle reflow when container size changes
   */
  public handleReflow(newContainerWidth: number, tags: TagDimensions[]): LayoutResult {
    const oldWidth = this.config.containerWidth;
    this.config.containerWidth = newContainerWidth;
    
    // Only recalculate if width actually changed
    if (oldWidth !== newContainerWidth) {
      return this.calculateLayout(tags);
    }
    
    return this.lastLayout || this.calculateLayout(tags);
  }

  /**
   * Calculate optimal tag width considering constraints
   */
  private calculateTagWidth(tag: TagDimensions): number {
    let width = tag.width;
    
    if (tag.minWidth && width < tag.minWidth) {
      width = tag.minWidth;
    }
    
    if (tag.maxWidth && width > tag.maxWidth) {
      width = tag.maxWidth;
    }
    
    return width;
  }

  /**
   * Get position for specific tag
   */
  public getTagPosition(tagId: string): TagPosition | null {
    return this.lastLayout?.tagPositions.get(tagId) || null;
  }

  /**
   * Get line information for specific line index
   */
  public getLineInfo(lineIndex: number): LayoutLine | null {
    return this.lastLayout?.lines[lineIndex] || null;
  }

  /**
   * Get all tags on specific line
   */
  public getTagsOnLine(lineIndex: number): TagPosition[] {
    const line = this.getLineInfo(lineIndex);
    return line ? line.tags : [];
  }

  /**
   * Find tag at specific coordinates
   */
  public getTagAtPosition(x: number, y: number): string | null {
    if (!this.lastLayout) return null;

    for (const [tagId, position] of this.lastLayout.tagPositions) {
      if (
        x >= position.x &&
        x <= position.x + position.width &&
        y >= position.y &&
        y <= position.y + position.height
      ) {
        return tagId;
      }
    }
    
    return null;
  }

  /**
   * Calculate vertical spacing consistency
   */
  public calculateVerticalSpacing(): number[] {
    if (!this.lastLayout || this.lastLayout.lines.length < 2) {
      return [];
    }

    const spacings: number[] = [];
    for (let i = 1; i < this.lastLayout.lines.length; i++) {
      const prevLine = this.lastLayout.lines[i - 1];
      const currentLine = this.lastLayout.lines[i];
      const spacing = currentLine.y - (prevLine.y + prevLine.height);
      spacings.push(spacing);
    }

    return spacings;
  }

  /**
   * Optimize layout for performance
   */
  public optimizeLayout(tags: TagDimensions[]): LayoutResult {
    // Use memoization for repeated calculations
    const cacheKey = this.generateLayoutCacheKey(tags);
    
    // For now, just calculate normally
    // In future, could add caching logic here
    return this.calculateLayout(tags);
  }

  /**
   * Generate cache key for layout memoization
   */
  private generateLayoutCacheKey(tags: TagDimensions[]): string {
    const tagData = tags.map(tag => `${tag.id}:${tag.width}:${tag.height}`).join('|');
    return `${this.config.containerWidth}:${tagData}`;
  }

  /**
   * Setup resize observer for container
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          if (newWidth !== this.config.containerWidth) {
            this.config.containerWidth = newWidth;
            // Trigger reflow event if needed
            this.onContainerResize?.(newWidth);
          }
        }
      });
    }
  }

  /**
   * Observe container for size changes
   */
  public observeContainer(container: HTMLElement): void {
    this.container = container;
    if (this.resizeObserver) {
      this.resizeObserver.observe(container);
    }
  }

  /**
   * Stop observing container
   */
  public unobserveContainer(): void {
    if (this.resizeObserver && this.container) {
      this.resizeObserver.unobserve(this.container);
    }
    this.container = null;
  }

  /**
   * Callback for container resize (can be overridden)
   */
  public onContainerResize?: (newWidth: number) => void;

  /**
   * Update layout configuration
   */
  public updateConfig(newConfig: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear cached layout to force recalculation
    this.lastLayout = null;
  }

  /**
   * Get current configuration
   */
  public getConfig(): LayoutConfig {
    return { ...this.config };
  }

  /**
   * Get last calculated layout
   */
  public getLastLayout(): LayoutResult | null {
    return this.lastLayout;
  }

  /**
   * Check if layout needs recalculation
   */
  public needsRecalculation(tags: TagDimensions[]): boolean {
    if (!this.lastLayout) return true;
    
    // Check if tag count changed
    if (this.lastLayout.tagPositions.size !== tags.length) return true;
    
    // Check if any tag dimensions changed
    for (const tag of tags) {
      const position = this.lastLayout.tagPositions.get(tag.id);
      if (!position || position.width !== this.calculateTagWidth(tag)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate responsive breakpoints
   */
  public calculateBreakpoints(tags: TagDimensions[]): number[] {
    const breakpoints: number[] = [];
    
    // Calculate minimum width needed for different numbers of tags per line
    let minWidth = this.config.padding.left + this.config.padding.right;
    
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const tagWidth = this.calculateTagWidth(tag);
      
      if (i === 0) {
        minWidth += tagWidth;
      } else {
        minWidth += this.config.tagSpacing + tagWidth;
      }
      
      breakpoints.push(minWidth);
    }
    
    return breakpoints;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.container = null;
    this.lastLayout = null;
    this.onContainerResize = undefined;
  }
}