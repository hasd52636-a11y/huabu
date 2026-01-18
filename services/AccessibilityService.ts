/**
 * Accessibility Service
 * 
 * Provides comprehensive accessibility enhancements including:
 * - Keyboard navigation support
 * - Screen reader compatibility
 * - High contrast mode
 * - WCAG 2.1 AA compliance
 * 
 * Requirements: 5.6
 */

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableFocusIndicators: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  announceChanges: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: string;
  description: string;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  role?: string;
  ariaLabel?: string;
}

export class AccessibilityService {
  private config: AccessibilityConfig;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private focusableElements: FocusableElement[] = [];
  private currentFocusIndex = -1;
  private announcer: HTMLElement | null = null;
  private observers: MutationObserver[] = [];

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableKeyboardNavigation: true,
      enableScreenReader: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      enableFocusIndicators: true,
      fontSize: 'medium',
      announceChanges: true,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize accessibility service
   */
  private initialize(): void {
    this.setupScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupHighContrastMode();
    this.setupReducedMotion();
    this.setupDefaultShortcuts();
    this.observeAccessibilityChanges();
  }

  /**
   * Setup screen reader announcer
   */
  private setupScreenReaderAnnouncer(): void {
    if (!this.config.enableScreenReader || typeof document === 'undefined') return;

    try {
      this.announcer = document.createElement('div');
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.className = 'sr-only';
      this.announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      
      if (document.body && document.body.appendChild) {
        document.body.appendChild(this.announcer);
      }
    } catch (error) {
      // Silently fail in test environments
      console.warn('Failed to set up screen reader announcer:', error);
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer || !this.config.announceChanges) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNavigation || typeof document === 'undefined') return;

    try {
      document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
      document.addEventListener('focusin', this.handleFocusIn.bind(this));
      document.addEventListener('focusout', this.handleFocusOut.bind(this));
    } catch (error) {
      // Silently fail in test environments
      console.warn('Failed to set up keyboard navigation:', error);
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      event.preventDefault();
      this.executeShortcut(shortcut);
      return;
    }

    // Handle Tab navigation
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }

    // Handle Arrow key navigation for custom components
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.handleArrowNavigation(event);
    }

    // Handle Enter/Space for activation
    if (event.key === 'Enter' || event.key === ' ') {
      this.handleActivation(event);
    }

    // Handle Escape for closing modals/menus
    if (event.key === 'Escape') {
      this.handleEscape(event);
    }
  }

  /**
   * Handle Tab navigation
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.findIndex(el => el.element === document.activeElement);
    
    if (event.shiftKey) {
      // Shift+Tab - go backwards
      const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      focusableElements[prevIndex].element.focus();
    } else {
      // Tab - go forwards
      const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
      focusableElements[nextIndex].element.focus();
    }

    event.preventDefault();
  }

  /**
   * Handle arrow key navigation
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const container = target.closest('[role="menu"], [role="menubar"], [role="tablist"], [role="grid"]');
    
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[role="menuitem"], [role="tab"], [role="gridcell"]')) as HTMLElement[];
    const currentIndex = items.indexOf(target);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
    }

    if (nextIndex !== currentIndex) {
      items[nextIndex].focus();
      event.preventDefault();
    }
  }

  /**
   * Handle activation (Enter/Space)
   */
  private handleActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') {
      target.click();
      event.preventDefault();
    }
  }

  /**
   * Handle Escape key
   */
  private handleEscape(event: KeyboardEvent): void {
    // Close any open modals or menus
    const modal = document.querySelector('[role="dialog"]:not([hidden])') as HTMLElement;
    const menu = document.querySelector('[role="menu"]:not([hidden])') as HTMLElement;
    
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="关闭"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
        event.preventDefault();
      }
    } else if (menu) {
      menu.style.display = 'none';
      event.preventDefault();
    }
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    if (!this.config.enableFocusIndicators) return;

    // Add focus styles
    const style = document.createElement('style');
    style.textContent = `
      .accessibility-focus-visible {
        outline: 3px solid #F59E0B !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }
      
      .accessibility-focus-visible:focus {
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.5) !important;
      }
      
      /* High contrast focus indicators */
      @media (prefers-contrast: high) {
        .accessibility-focus-visible {
          outline: 4px solid #000 !important;
          background-color: #FFFF00 !important;
          color: #000 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Handle focus in
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && this.config.enableFocusIndicators) {
      target.classList.add('accessibility-focus-visible');
    }
  }

  /**
   * Handle focus out
   */
  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target) {
      target.classList.remove('accessibility-focus-visible');
    }
  }

  /**
   * Setup high contrast mode
   */
  private setupHighContrastMode(): void {
    if (this.config.enableHighContrast) {
      this.enableHighContrast();
    }

    // Listen for system preference changes (only if matchMedia is available)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.enableHighContrast();
        } else {
          this.disableHighContrast();
        }
      });
    }
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast(): void {
    document.documentElement.classList.add('accessibility-high-contrast');
    
    const style = document.createElement('style');
    style.id = 'accessibility-high-contrast-styles';
    style.textContent = `
      .accessibility-high-contrast {
        filter: contrast(150%) !important;
      }
      
      .accessibility-high-contrast * {
        background-color: #000 !important;
        color: #FFFF00 !important;
        border-color: #FFFF00 !important;
      }
      
      .accessibility-high-contrast button,
      .accessibility-high-contrast [role="button"] {
        background-color: #FFFF00 !important;
        color: #000 !important;
        border: 2px solid #000 !important;
      }
      
      .accessibility-high-contrast button:hover,
      .accessibility-high-contrast [role="button"]:hover {
        background-color: #FFF !important;
        color: #000 !important;
      }
    `;
    document.head.appendChild(style);
    
    this.announce('高对比度模式已启用', 'assertive');
  }

  /**
   * Disable high contrast mode
   */
  disableHighContrast(): void {
    document.documentElement.classList.remove('accessibility-high-contrast');
    const style = document.getElementById('accessibility-high-contrast-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Setup reduced motion
   */
  private setupReducedMotion(): void {
    if (this.config.enableReducedMotion) {
      this.enableReducedMotion();
    }

    // Listen for system preference changes (only if matchMedia is available)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.enableReducedMotion();
        } else {
          this.disableReducedMotion();
        }
      });
    }
  }

  /**
   * Enable reduced motion
   */
  enableReducedMotion(): void {
    document.documentElement.classList.add('accessibility-reduced-motion');
    
    const style = document.createElement('style');
    style.id = 'accessibility-reduced-motion-styles';
    style.textContent = `
      .accessibility-reduced-motion *,
      .accessibility-reduced-motion *::before,
      .accessibility-reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    this.announce('减少动画模式已启用', 'polite');
  }

  /**
   * Disable reduced motion
   */
  disableReducedMotion(): void {
    document.documentElement.classList.remove('accessibility-reduced-motion');
    const style = document.getElementById('accessibility-reduced-motion-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Setup default keyboard shortcuts
   */
  private setupDefaultShortcuts(): void {
    this.addShortcut({
      key: 'h',
      ctrlKey: true,
      action: 'toggleHighContrast',
      description: '切换高对比度模式'
    });

    this.addShortcut({
      key: 'm',
      ctrlKey: true,
      action: 'toggleReducedMotion',
      description: '切换减少动画模式'
    });

    this.addShortcut({
      key: '/',
      ctrlKey: true,
      action: 'showShortcuts',
      description: '显示键盘快捷键帮助'
    });

    this.addShortcut({
      key: 'Escape',
      action: 'closeModal',
      description: '关闭模态框或菜单'
    });
  }

  /**
   * Add keyboard shortcut
   */
  addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey({
      key: shortcut.key,
      ctrlKey: shortcut.ctrlKey || false,
      shiftKey: shortcut.shiftKey || false,
      altKey: shortcut.altKey || false
    } as KeyboardEvent);
    
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    parts.push(event.key);
    return parts.join('+');
  }

  /**
   * Execute shortcut action
   */
  private executeShortcut(shortcut: KeyboardShortcut): void {
    switch (shortcut.action) {
      case 'toggleHighContrast':
        this.toggleHighContrast();
        break;
      case 'toggleReducedMotion':
        this.toggleReducedMotion();
        break;
      case 'showShortcuts':
        this.showShortcutsHelp();
        break;
      case 'closeModal':
        this.handleEscape({ key: 'Escape' } as KeyboardEvent);
        break;
      default:
        // Custom action - emit event
        document.dispatchEvent(new CustomEvent('accessibility-shortcut', {
          detail: { action: shortcut.action, shortcut }
        }));
    }
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast(): void {
    this.config.enableHighContrast = !this.config.enableHighContrast;
    if (this.config.enableHighContrast) {
      this.enableHighContrast();
    } else {
      this.disableHighContrast();
    }
  }

  /**
   * Toggle reduced motion mode
   */
  toggleReducedMotion(): void {
    this.config.enableReducedMotion = !this.config.enableReducedMotion;
    if (this.config.enableReducedMotion) {
      this.enableReducedMotion();
    } else {
      this.disableReducedMotion();
    }
  }

  /**
   * Show shortcuts help
   */
  showShortcutsHelp(): void {
    const shortcuts = Array.from(this.shortcuts.values());
    const helpText = shortcuts.map(s => 
      `${s.key}${s.ctrlKey ? ' + Ctrl' : ''}${s.shiftKey ? ' + Shift' : ''}${s.altKey ? ' + Alt' : ''}: ${s.description}`
    ).join('\n');
    
    this.announce(`键盘快捷键帮助: ${helpText}`, 'assertive');
  }

  /**
   * Get focusable elements
   */
  private getFocusableElements(): FocusableElement[] {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="menuitem"]:not([disabled])',
      '[role="tab"]:not([disabled])'
    ];

    const elements = document.querySelectorAll(selectors.join(', ')) as NodeListOf<HTMLElement>;
    
    return Array.from(elements)
      .filter(el => this.isVisible(el))
      .map(el => ({
        element: el,
        tabIndex: parseInt(el.getAttribute('tabindex') || '0'),
        role: el.getAttribute('role') || undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined
      }))
      .sort((a, b) => a.tabIndex - b.tabIndex);
  }

  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Observe accessibility changes
   */
  private observeAccessibilityChanges(): void {
    // Only observe if we have a proper DOM environment
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') {
      return;
    }

    try {
      // Observe DOM changes to update focusable elements
      const observer = new MutationObserver(() => {
        this.focusableElements = this.getFocusableElements();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'tabindex', 'role', 'aria-label']
      });

      this.observers.push(observer);
    } catch (error) {
      // Silently fail in test environments
      console.warn('Failed to set up accessibility observer:', error);
    }
  }

  /**
   * Enhance element accessibility
   */
  enhanceElement(element: HTMLElement, options: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    tabIndex?: number;
    keyboardHandler?: (event: KeyboardEvent) => void;
  }): void {
    if (options.role) {
      element.setAttribute('role', options.role);
    }

    if (options.ariaLabel) {
      element.setAttribute('aria-label', options.ariaLabel);
    }

    if (options.ariaDescribedBy) {
      element.setAttribute('aria-describedby', options.ariaDescribedBy);
    }

    if (options.tabIndex !== undefined) {
      element.setAttribute('tabindex', options.tabIndex.toString());
    }

    if (options.keyboardHandler) {
      element.addEventListener('keydown', options.keyboardHandler);
    }

    // Ensure element is focusable if it has interactive role
    if (options.role && ['button', 'menuitem', 'tab'].includes(options.role)) {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    }
  }

  /**
   * Set font size
   */
  setFontSize(size: AccessibilityConfig['fontSize']): void {
    this.config.fontSize = size;
    
    const sizeMap = {
      'small': '0.875rem',
      'medium': '1rem',
      'large': '1.125rem',
      'extra-large': '1.25rem'
    };

    document.documentElement.style.fontSize = sizeMap[size];
    this.announce(`字体大小已设置为${size}`, 'polite');
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Re-apply settings
    if (updates.enableHighContrast !== undefined) {
      if (updates.enableHighContrast) {
        this.enableHighContrast();
      } else {
        this.disableHighContrast();
      }
    }

    if (updates.enableReducedMotion !== undefined) {
      if (updates.enableReducedMotion) {
        this.enableReducedMotion();
      } else {
        this.disableReducedMotion();
      }
    }

    if (updates.fontSize) {
      this.setFontSize(updates.fontSize);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyboardNavigation);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Remove announcer
    if (this.announcer) {
      this.announcer.remove();
      this.announcer = null;
    }

    // Remove styles
    const styles = ['accessibility-high-contrast-styles', 'accessibility-reduced-motion-styles'];
    styles.forEach(id => {
      const style = document.getElementById(id);
      if (style) style.remove();
    });

    // Clear shortcuts
    this.shortcuts.clear();
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();