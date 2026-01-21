/**
 * Accessibility Manager
 * Provides comprehensive ARIA support and screen reader compatibility for tag chips
 */

export interface AccessibilityConfig {
  enableScreenReaderSupport: boolean;
  enableKeyboardOnlyOperation: boolean;
  announceChanges: boolean;
  useAriaLiveRegions: boolean;
  customAriaLabels: Record<string, string>;
}

export interface AriaAttributes {
  role: string;
  'aria-label': string;
  'aria-describedby'?: string;
  'aria-expanded'?: string;
  'aria-selected'?: string;
  'aria-pressed'?: string;
  'aria-disabled'?: string;
  'aria-live'?: string;
  'aria-atomic'?: string;
  'aria-relevant'?: string;
  tabindex?: string;
}

export interface AccessibilityState {
  isSelected: boolean;
  isExpanded: boolean;
  isPressed: boolean;
  isDisabled: boolean;
  hasDescription: boolean;
  liveRegionId?: string;
}

export class AccessibilityManager {
  private config: AccessibilityConfig;
  private elementStates = new Map<string, AccessibilityState>();
  private liveRegions = new Map<string, HTMLElement>();
  private descriptionElements = new Map<string, HTMLElement>();
  private announceQueue: string[] = [];
  private isAnnouncing = false;

  constructor(config?: Partial<AccessibilityConfig>) {
    this.config = {
      enableScreenReaderSupport: true,
      enableKeyboardOnlyOperation: true,
      announceChanges: true,
      useAriaLiveRegions: true,
      customAriaLabels: {},
      ...config
    };

    this.setupGlobalLiveRegion();
  }

  /**
   * Initialize accessibility for an element
   */
  public initializeElement(
    element: HTMLElement, 
    elementId: string, 
    options: {
      label?: string;
      description?: string;
      role?: string;
      hasPopup?: boolean;
    } = {}
  ): void {
    // Initialize accessibility state
    this.elementStates.set(elementId, {
      isSelected: false,
      isExpanded: false,
      isPressed: false,
      isDisabled: false,
      hasDescription: !!options.description
    });

    // Set basic ARIA attributes
    const ariaAttributes = this.calculateAriaAttributes(elementId, options);
    this.applyAriaAttributes(element, ariaAttributes);

    // Create description element if needed
    if (options.description) {
      this.createDescriptionElement(elementId, options.description);
    }

    // Set up keyboard accessibility
    if (this.config.enableKeyboardOnlyOperation) {
      this.setupKeyboardAccessibility(element, elementId);
    }

    // Announce element creation if needed
    if (this.config.announceChanges) {
      this.announceElementCreation(elementId, options.label || element.textContent || 'Tag chip');
    }
  }

  /**
   * Calculate ARIA attributes for an element
   */
  private calculateAriaAttributes(
    elementId: string, 
    options: { label?: string; description?: string; role?: string; hasPopup?: boolean }
  ): AriaAttributes {
    const state = this.elementStates.get(elementId);
    const customLabel = this.config.customAriaLabels[elementId];
    
    const attributes: AriaAttributes = {
      role: options.role || 'button',
      'aria-label': customLabel || options.label || 'Tag chip',
      tabindex: this.config.enableKeyboardOnlyOperation ? '0' : '-1'
    };

    if (options.description) {
      attributes['aria-describedby'] = `${elementId}-description`;
    }

    if (state) {
      if (options.hasPopup) {
        attributes['aria-expanded'] = state.isExpanded ? 'true' : 'false';
      }
      
      attributes['aria-selected'] = state.isSelected ? 'true' : 'false';
      attributes['aria-pressed'] = state.isPressed ? 'true' : 'false';
      
      if (state.isDisabled) {
        attributes['aria-disabled'] = 'true';
        attributes.tabindex = '-1';
      }
    }

    return attributes;
  }

  /**
   * Apply ARIA attributes to element
   */
  private applyAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        element.setAttribute(key, value);
      }
    });
  }

  /**
   * Create description element for detailed information
   */
  private createDescriptionElement(elementId: string, description: string): void {
    const descElement = document.createElement('div');
    descElement.id = `${elementId}-description`;
    descElement.className = 'sr-only'; // Screen reader only
    descElement.textContent = description;
    descElement.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    document.body.appendChild(descElement);
    this.descriptionElements.set(elementId, descElement);
  }

  /**
   * Setup keyboard accessibility
   */
  private setupKeyboardAccessibility(element: HTMLElement, elementId: string): void {
    // Ensure element is focusable
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Add keyboard event handling
    element.addEventListener('keydown', (e) => {
      this.handleKeyboardInteraction(e, elementId);
    });

    // Add focus/blur handling for announcements
    element.addEventListener('focus', () => {
      this.handleFocus(elementId);
    });

    element.addEventListener('blur', () => {
      this.handleBlur(elementId);
    });
  }

  /**
   * Handle keyboard interactions
   */
  private handleKeyboardInteraction(event: KeyboardEvent, elementId: string): void {
    const element = event.target as HTMLElement;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateElement(elementId);
        break;
        
      case 'Escape':
        event.preventDefault();
        this.deactivateElement(elementId);
        element.blur();
        break;
    }
  }

  /**
   * Handle focus events
   */
  private handleFocus(elementId: string): void {
    const state = this.elementStates.get(elementId);
    if (state && this.config.announceChanges) {
      const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (element) {
        const label = element.getAttribute('aria-label') || element.textContent || 'Tag chip';
        this.announceToScreenReader(`${label} focused`);
      }
    }
  }

  /**
   * Handle blur events
   */
  private handleBlur(elementId: string): void {
    // Update pressed state when losing focus
    this.updateElementState(elementId, { isPressed: false });
  }

  /**
   * Activate element (simulate click)
   */
  private activateElement(elementId: string): void {
    this.updateElementState(elementId, { isPressed: true });
    
    // Dispatch activation event
    const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    if (element) {
      element.dispatchEvent(new CustomEvent('tagChipActivate', {
        detail: { elementId, source: 'keyboard' },
        bubbles: true
      }));
      
      if (this.config.announceChanges) {
        const label = element.getAttribute('aria-label') || 'Tag chip';
        this.announceToScreenReader(`${label} activated`);
      }
    }

    // Reset pressed state after short delay
    setTimeout(() => {
      this.updateElementState(elementId, { isPressed: false });
    }, 100);
  }

  /**
   * Deactivate element
   */
  private deactivateElement(elementId: string): void {
    this.updateElementState(elementId, { 
      isPressed: false, 
      isSelected: false, 
      isExpanded: false 
    });
  }

  /**
   * Update element accessibility state
   */
  public updateElementState(elementId: string, updates: Partial<AccessibilityState>): void {
    const currentState = this.elementStates.get(elementId);
    if (!currentState) return;

    const newState = { ...currentState, ...updates };
    this.elementStates.set(elementId, newState);

    // Update ARIA attributes on the element
    const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    if (element) {
      this.refreshAriaAttributes(element, elementId);
    }

    // Announce state changes if needed
    if (this.config.announceChanges) {
      this.announceStateChanges(elementId, updates);
    }
  }

  /**
   * Refresh ARIA attributes on element
   */
  private refreshAriaAttributes(element: HTMLElement, elementId: string): void {
    const state = this.elementStates.get(elementId);
    if (!state) return;

    // Update dynamic ARIA attributes
    element.setAttribute('aria-selected', state.isSelected ? 'true' : 'false');
    element.setAttribute('aria-pressed', state.isPressed ? 'true' : 'false');
    
    if (element.hasAttribute('aria-expanded')) {
      element.setAttribute('aria-expanded', state.isExpanded ? 'true' : 'false');
    }
    
    if (state.isDisabled) {
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('tabindex', '-1');
    } else {
      element.removeAttribute('aria-disabled');
      element.setAttribute('tabindex', '0');
    }
  }

  /**
   * Announce state changes to screen readers
   */
  private announceStateChanges(elementId: string, changes: Partial<AccessibilityState>): void {
    const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    if (!element) return;

    const label = element.getAttribute('aria-label') || 'Tag chip';
    const announcements: string[] = [];

    if (changes.isSelected !== undefined) {
      announcements.push(`${label} ${changes.isSelected ? 'selected' : 'deselected'}`);
    }

    if (changes.isExpanded !== undefined) {
      announcements.push(`${label} ${changes.isExpanded ? 'expanded' : 'collapsed'}`);
    }

    if (changes.isDisabled !== undefined) {
      announcements.push(`${label} ${changes.isDisabled ? 'disabled' : 'enabled'}`);
    }

    announcements.forEach(announcement => {
      this.announceToScreenReader(announcement);
    });
  }

  /**
   * Setup global live region for announcements
   */
  private setupGlobalLiveRegion(): void {
    if (!this.config.useAriaLiveRegions) return;

    const liveRegion = document.createElement('div');
    liveRegion.id = 'tag-chip-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    document.body.appendChild(liveRegion);
    this.liveRegions.set('global', liveRegion);
  }

  /**
   * Announce to screen reader
   */
  public announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.enableScreenReaderSupport) return;

    // Add to queue
    this.announceQueue.push(message);

    // Process queue if not already processing
    if (!this.isAnnouncing) {
      this.processAnnounceQueue(priority);
    }
  }

  /**
   * Process announcement queue
   */
  private processAnnounceQueue(priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.announceQueue.length === 0) {
      this.isAnnouncing = false;
      return;
    }

    this.isAnnouncing = true;
    const message = this.announceQueue.shift()!;

    if (this.config.useAriaLiveRegions) {
      const liveRegion = this.liveRegions.get('global');
      if (liveRegion) {
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
          liveRegion.textContent = '';
          this.processAnnounceQueue(priority);
        }, 1000);
      }
    } else {
      // Fallback: create temporary announcement element
      this.createTemporaryAnnouncement(message, priority);
    }
  }

  /**
   * Create temporary announcement element
   */
  private createTemporaryAnnouncement(message: string, priority: 'polite' | 'assertive'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    document.body.appendChild(announcer);

    setTimeout(() => {
      announcer.textContent = message;
      setTimeout(() => {
        document.body.removeChild(announcer);
        this.processAnnounceQueue(priority);
      }, 1000);
    }, 100);
  }

  /**
   * Announce element creation
   */
  private announceElementCreation(elementId: string, label: string): void {
    this.announceToScreenReader(`${label} tag chip added`);
  }

  /**
   * Update element description
   */
  public updateElementDescription(elementId: string, description: string): void {
    const descElement = this.descriptionElements.get(elementId);
    if (descElement) {
      descElement.textContent = description;
    } else {
      this.createDescriptionElement(elementId, description);
      
      // Update aria-describedby on the main element
      const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
      if (element) {
        element.setAttribute('aria-describedby', `${elementId}-description`);
      }
    }
  }

  /**
   * Set custom ARIA label
   */
  public setCustomAriaLabel(elementId: string, label: string): void {
    this.config.customAriaLabels[elementId] = label;
    
    const element = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
    if (element) {
      element.setAttribute('aria-label', label);
    }
  }

  /**
   * Check ARIA compliance
   */
  public checkAriaCompliance(element: HTMLElement): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check required attributes
    if (!element.hasAttribute('role')) {
      issues.push('Missing role attribute');
    }

    if (!element.hasAttribute('aria-label') && !element.textContent?.trim()) {
      issues.push('Missing accessible name (aria-label or text content)');
    }

    if (this.config.enableKeyboardOnlyOperation && !element.hasAttribute('tabindex')) {
      issues.push('Missing tabindex for keyboard accessibility');
    }

    // Check for proper ARIA usage
    const role = element.getAttribute('role');
    if (role === 'button') {
      if (!element.hasAttribute('aria-pressed')) {
        recommendations.push('Consider adding aria-pressed for toggle buttons');
      }
    }

    // Check for description
    if (element.hasAttribute('aria-describedby')) {
      const descId = element.getAttribute('aria-describedby');
      if (!document.getElementById(descId!)) {
        issues.push(`Referenced description element ${descId} not found`);
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get accessibility state
   */
  public getAccessibilityState(elementId: string): AccessibilityState | null {
    return this.elementStates.get(elementId) || null;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup element
   */
  public cleanupElement(elementId: string): void {
    // Remove description element
    const descElement = this.descriptionElements.get(elementId);
    if (descElement && descElement.parentNode) {
      descElement.parentNode.removeChild(descElement);
      this.descriptionElements.delete(elementId);
    }

    // Clear state
    this.elementStates.delete(elementId);

    // Remove custom label
    delete this.config.customAriaLabels[elementId];
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    // Remove all description elements
    this.descriptionElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    // Remove live regions
    this.liveRegions.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    // Clear all data
    this.elementStates.clear();
    this.descriptionElements.clear();
    this.liveRegions.clear();
    this.announceQueue = [];
    this.isAnnouncing = false;
  }
}