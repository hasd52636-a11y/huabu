/**
 * Hover Preview System
 * Manages hover preview functionality for tag chips with viewport boundary detection
 */

export interface PreviewPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export interface HoverPreviewConfig {
  showDelay: number;
  hideDelay: number;
  offset: number;
  maxWidth: number;
  zIndex: number;
}

export interface PreviewContent {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class HoverPreviewSystem {
  private previewElement: HTMLElement | null = null;
  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private currentTarget: HTMLElement | null = null;
  private isVisible = false;

  private config: HoverPreviewConfig = {
    showDelay: 300,
    hideDelay: 100,
    offset: 8,
    maxWidth: 300,
    zIndex: 1000
  };

  constructor(config?: Partial<HoverPreviewConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.createPreviewElement();
  }

  /**
   * Create the preview element and add to DOM
   */
  private createPreviewElement(): void {
    this.previewElement = document.createElement('div');
    this.previewElement.className = 'tag-chip-hover-preview';
    this.previewElement.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      line-height: 1.4;
      max-width: ${this.config.maxWidth}px;
      z-index: ${this.config.zIndex};
      pointer-events: none;
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      word-wrap: break-word;
    `;
    
    // Add ARIA attributes for accessibility
    this.previewElement.setAttribute('role', 'tooltip');
    this.previewElement.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(this.previewElement);
  }

  /**
   * Show preview for target element with debounced timing
   */
  public show(target: HTMLElement, content: PreviewContent): void {
    // Clear any existing timers
    this.clearTimers();
    
    // If already showing for same target, don't restart
    if (this.currentTarget === target && this.isVisible) {
      return;
    }

    this.currentTarget = target;

    this.showTimer = window.setTimeout(() => {
      this.displayPreview(target, content);
    }, this.config.showDelay);
  }

  /**
   * Hide preview with debounced timing
   */
  public hide(): void {
    this.clearTimers();
    
    if (!this.isVisible) {
      return;
    }

    this.hideTimer = window.setTimeout(() => {
      this.hidePreview();
    }, this.config.hideDelay);
  }

  /**
   * Immediately hide preview without delay
   */
  public hideImmediate(): void {
    this.clearTimers();
    this.hidePreview();
  }

  /**
   * Display the preview at calculated position
   */
  private displayPreview(target: HTMLElement, content: PreviewContent): void {
    if (!this.previewElement) return;

    // Set content
    this.setPreviewContent(content);
    
    // Calculate and set position
    const position = this.calculatePosition(target);
    this.setPreviewPosition(position);
    
    // Show preview
    this.previewElement.style.opacity = '1';
    this.previewElement.style.transform = 'translateY(0)';
    this.previewElement.setAttribute('aria-hidden', 'false');
    
    this.isVisible = true;
  }

  /**
   * Hide the preview
   */
  private hidePreview(): void {
    if (!this.previewElement) return;

    this.previewElement.style.opacity = '0';
    this.previewElement.style.transform = 'translateY(-4px)';
    this.previewElement.setAttribute('aria-hidden', 'true');
    
    this.isVisible = false;
    this.currentTarget = null;
  }

  /**
   * Set preview content with proper formatting
   */
  private setPreviewContent(content: PreviewContent): void {
    if (!this.previewElement) return;

    let html = `<div class="preview-title" style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(content.title)}</div>`;
    
    if (content.description) {
      html += `<div class="preview-description" style="color: #64748b; font-size: 13px;">${this.escapeHtml(content.description)}</div>`;
    }
    
    if (content.metadata) {
      const metadataEntries = Object.entries(content.metadata);
      if (metadataEntries.length > 0) {
        html += `<div class="preview-metadata" style="margin-top: 8px; font-size: 12px; color: #94a3b8;">`;
        metadataEntries.forEach(([key, value]) => {
          html += `<div>${this.escapeHtml(key)}: ${this.escapeHtml(String(value))}</div>`;
        });
        html += `</div>`;
      }
    }

    this.previewElement.innerHTML = html;
  }

  /**
   * Calculate optimal position with viewport boundary detection
   */
  private calculatePosition(target: HTMLElement): PreviewPosition {
    if (!this.previewElement) {
      return { x: 0, y: 0, placement: 'top' };
    }

    const targetRect = target.getBoundingClientRect();
    const previewRect = this.previewElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    // Try different placements in order of preference
    const placements: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'right', 'left'];
    
    for (const placement of placements) {
      const position = this.calculatePositionForPlacement(targetRect, previewRect, placement, viewport);
      if (this.isPositionInViewport(position, previewRect, viewport)) {
        return { ...position, placement };
      }
    }

    // Fallback to top placement if none fit perfectly
    const fallbackPosition = this.calculatePositionForPlacement(targetRect, previewRect, 'top', viewport);
    return { ...fallbackPosition, placement: 'top' };
  }

  /**
   * Calculate position for specific placement
   */
  private calculatePositionForPlacement(
    targetRect: DOMRect,
    previewRect: DOMRect,
    placement: 'top' | 'bottom' | 'left' | 'right',
    viewport: { scrollX: number; scrollY: number }
  ): { x: number; y: number } {
    const offset = this.config.offset;
    
    switch (placement) {
      case 'top':
        return {
          x: targetRect.left + viewport.scrollX + (targetRect.width - previewRect.width) / 2,
          y: targetRect.top + viewport.scrollY - previewRect.height - offset
        };
      
      case 'bottom':
        return {
          x: targetRect.left + viewport.scrollX + (targetRect.width - previewRect.width) / 2,
          y: targetRect.bottom + viewport.scrollY + offset
        };
      
      case 'left':
        return {
          x: targetRect.left + viewport.scrollX - previewRect.width - offset,
          y: targetRect.top + viewport.scrollY + (targetRect.height - previewRect.height) / 2
        };
      
      case 'right':
        return {
          x: targetRect.right + viewport.scrollX + offset,
          y: targetRect.top + viewport.scrollY + (targetRect.height - previewRect.height) / 2
        };
    }
  }

  /**
   * Check if position fits within viewport
   */
  private isPositionInViewport(
    position: { x: number; y: number },
    previewRect: DOMRect,
    viewport: { width: number; height: number; scrollX: number; scrollY: number }
  ): boolean {
    const margin = 8; // Minimum margin from viewport edge
    
    return (
      position.x >= viewport.scrollX + margin &&
      position.x + previewRect.width <= viewport.scrollX + viewport.width - margin &&
      position.y >= viewport.scrollY + margin &&
      position.y + previewRect.height <= viewport.scrollY + viewport.height - margin
    );
  }

  /**
   * Set preview position
   */
  private setPreviewPosition(position: { x: number; y: number }): void {
    if (!this.previewElement) return;

    this.previewElement.style.left = `${position.x}px`;
    this.previewElement.style.top = `${position.y}px`;
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if preview is currently visible
   */
  public isPreviewVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current target element
   */
  public getCurrentTarget(): HTMLElement | null {
    return this.currentTarget;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<HoverPreviewConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.previewElement) {
      this.previewElement.style.maxWidth = `${this.config.maxWidth}px`;
      this.previewElement.style.zIndex = `${this.config.zIndex}`;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clearTimers();
    
    if (this.previewElement && this.previewElement.parentNode) {
      this.previewElement.parentNode.removeChild(this.previewElement);
    }
    
    this.previewElement = null;
    this.currentTarget = null;
    this.isVisible = false;
  }
}