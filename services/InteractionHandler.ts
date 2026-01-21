/**
 * Enhanced Interaction Handler
 * Manages click feedback, keyboard navigation, and accessibility for tag chips
 */

export interface InteractionConfig {
  clickFeedbackDuration: number;
  keyboardNavigationEnabled: boolean;
  focusIndicatorStyle: string;
  tabOrder: 'sequential' | 'spatial';
}

export interface InteractionState {
  isPressed: boolean;
  isFocused: boolean;
  isHovered: boolean;
  isSelected: boolean;
  lastInteractionTime: number;
}

export interface KeyboardNavigationResult {
  success: boolean;
  targetElement: HTMLElement | null;
  direction: 'next' | 'previous' | 'up' | 'down' | 'none';
}

export class InteractionHandler {
  private config: InteractionConfig;
  private interactionStates = new Map<string, InteractionState>();
  private focusedElement: HTMLElement | null = null;
  private tabOrderElements: HTMLElement[] = [];
  private eventListeners = new Map<HTMLElement, Map<string, EventListener>>();

  constructor(config?: Partial<InteractionConfig>) {
    this.config = {
      clickFeedbackDuration: 50,
      keyboardNavigationEnabled: true,
      focusIndicatorStyle: 'outline: 2px solid #3b82f6; outline-offset: 2px;',
      tabOrder: 'sequential',
      ...config
    };
  }

  /**
   * Initialize interaction handling for an element
   */
  public initializeElement(element: HTMLElement, elementId: string): void {
    // Initialize interaction state
    this.interactionStates.set(elementId, {
      isPressed: false,
      isFocused: false,
      isHovered: false,
      isSelected: false,
      lastInteractionTime: 0
    });

    // Set up event listeners
    this.setupEventListeners(element, elementId);
    
    // Add to tab order if keyboard navigation is enabled
    if (this.config.keyboardNavigationEnabled) {
      this.addToTabOrder(element);
    }
  }

  /**
   * Setup event listeners for an element
   */
  private setupEventListeners(element: HTMLElement, elementId: string): void {
    const listeners = new Map<string, EventListener>();

    // Click handling with timing requirements
    const clickHandler = (e: Event) => {
      this.handleClick(element, elementId, e);
    };

    // Mouse events
    const mouseEnterHandler = () => {
      this.updateInteractionState(elementId, { isHovered: true });
      this.applyVisualFeedback(element, elementId);
    };

    const mouseLeaveHandler = () => {
      this.updateInteractionState(elementId, { isHovered: false });
      this.applyVisualFeedback(element, elementId);
    };

    const mouseDownHandler = () => {
      this.updateInteractionState(elementId, { isPressed: true });
      this.applyVisualFeedback(element, elementId);
    };

    const mouseUpHandler = () => {
      this.updateInteractionState(elementId, { isPressed: false });
      this.applyVisualFeedback(element, elementId);
    };

    // Focus events
    const focusHandler = () => {
      this.handleFocus(element, elementId);
    };

    const blurHandler = () => {
      this.handleBlur(element, elementId);
    };

    // Keyboard events
    const keyDownHandler = (e: KeyboardEvent) => {
      this.handleKeyDown(element, elementId, e);
    };

    // Add listeners
    element.addEventListener('click', clickHandler);
    element.addEventListener('mouseenter', mouseEnterHandler);
    element.addEventListener('mouseleave', mouseLeaveHandler);
    element.addEventListener('mousedown', mouseDownHandler);
    element.addEventListener('mouseup', mouseUpHandler);
    element.addEventListener('focus', focusHandler);
    element.addEventListener('blur', blurHandler);
    element.addEventListener('keydown', keyDownHandler);

    // Store listeners for cleanup
    listeners.set('click', clickHandler);
    listeners.set('mouseenter', mouseEnterHandler);
    listeners.set('mouseleave', mouseLeaveHandler);
    listeners.set('mousedown', mouseDownHandler);
    listeners.set('mouseup', mouseUpHandler);
    listeners.set('focus', focusHandler);
    listeners.set('blur', blurHandler);
    listeners.set('keydown', keyDownHandler);

    this.eventListeners.set(element, listeners);
  }

  /**
   * Handle click with timing requirements (50ms feedback)
   */
  private handleClick(element: HTMLElement, elementId: string, event: Event): void {
    const startTime = performance.now();
    
    // Update interaction state
    this.updateInteractionState(elementId, { 
      lastInteractionTime: startTime,
      isPressed: true 
    });

    // Apply immediate visual feedback
    this.applyClickFeedback(element, elementId);

    // Ensure feedback duration meets 50ms requirement
    setTimeout(() => {
      this.updateInteractionState(elementId, { isPressed: false });
      this.removeClickFeedback(element, elementId);
      
      // Verify timing requirement
      const duration = performance.now() - startTime;
      if (duration < this.config.clickFeedbackDuration) {
        console.warn(`Click feedback duration (${duration}ms) below requirement (${this.config.clickFeedbackDuration}ms)`);
      }
    }, this.config.clickFeedbackDuration);

    // Dispatch custom event for integration
    element.dispatchEvent(new CustomEvent('tagChipClick', {
      detail: { elementId, timestamp: startTime },
      bubbles: true
    }));
  }

  /**
   * Apply click feedback visual effects
   */
  private applyClickFeedback(element: HTMLElement, elementId: string): void {
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease-out';
    element.classList.add('tag-chip-pressed');
  }

  /**
   * Remove click feedback visual effects
   */
  private removeClickFeedback(element: HTMLElement, elementId: string): void {
    element.style.transform = '';
    element.classList.remove('tag-chip-pressed');
  }

  /**
   * Handle focus events
   */
  private handleFocus(element: HTMLElement, elementId: string): void {
    this.focusedElement = element;
    this.updateInteractionState(elementId, { isFocused: true });
    this.applyFocusIndicator(element);
    this.applyVisualFeedback(element, elementId);

    // Announce to screen readers
    this.announceToScreenReader(element, 'focused');
  }

  /**
   * Handle blur events
   */
  private handleBlur(element: HTMLElement, elementId: string): void {
    if (this.focusedElement === element) {
      this.focusedElement = null;
    }
    this.updateInteractionState(elementId, { isFocused: false });
    this.removeFocusIndicator(element);
    this.applyVisualFeedback(element, elementId);
  }

  /**
   * Apply focus indicator
   */
  private applyFocusIndicator(element: HTMLElement): void {
    element.style.cssText += this.config.focusIndicatorStyle;
    element.classList.add('tag-chip-focused');
  }

  /**
   * Remove focus indicator
   */
  private removeFocusIndicator(element: HTMLElement): void {
    // Remove focus-specific styles
    const styles = this.config.focusIndicatorStyle.split(';');
    styles.forEach(style => {
      const [property] = style.split(':');
      if (property) {
        element.style.removeProperty(property.trim());
      }
    });
    element.classList.remove('tag-chip-focused');
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(element: HTMLElement, elementId: string, event: KeyboardEvent): void {
    if (!this.config.keyboardNavigationEnabled) return;

    let handled = false;
    let navigationResult: KeyboardNavigationResult = {
      success: false,
      targetElement: null,
      direction: 'none'
    };

    switch (event.key) {
      case 'Enter':
      case ' ':
        // Activate element
        event.preventDefault();
        this.handleClick(element, elementId, event);
        handled = true;
        break;

      case 'Tab':
        // Let browser handle tab navigation, but track it
        navigationResult = {
          success: true,
          targetElement: this.getNextTabElement(element, !event.shiftKey),
          direction: event.shiftKey ? 'previous' : 'next'
        };
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigationResult = this.navigateToNext(element);
        handled = true;
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigationResult = this.navigateToPrevious(element);
        handled = true;
        break;

      case 'Home':
        event.preventDefault();
        navigationResult = this.navigateToFirst();
        handled = true;
        break;

      case 'End':
        event.preventDefault();
        navigationResult = this.navigateToLast();
        handled = true;
        break;

      case 'Escape':
        event.preventDefault();
        element.blur();
        handled = true;
        break;
    }

    if (handled || navigationResult.success) {
      // Dispatch navigation event
      element.dispatchEvent(new CustomEvent('tagChipNavigation', {
        detail: { 
          elementId, 
          key: event.key, 
          navigationResult,
          handled 
        },
        bubbles: true
      }));
    }
  }

  /**
   * Navigate to next element
   */
  private navigateToNext(currentElement: HTMLElement): KeyboardNavigationResult {
    const currentIndex = this.tabOrderElements.indexOf(currentElement);
    if (currentIndex === -1) return { success: false, targetElement: null, direction: 'next' };

    const nextIndex = (currentIndex + 1) % this.tabOrderElements.length;
    const nextElement = this.tabOrderElements[nextIndex];
    
    if (nextElement) {
      nextElement.focus();
      return { success: true, targetElement: nextElement, direction: 'next' };
    }

    return { success: false, targetElement: null, direction: 'next' };
  }

  /**
   * Navigate to previous element
   */
  private navigateToPrevious(currentElement: HTMLElement): KeyboardNavigationResult {
    const currentIndex = this.tabOrderElements.indexOf(currentElement);
    if (currentIndex === -1) return { success: false, targetElement: null, direction: 'previous' };

    const prevIndex = currentIndex === 0 ? this.tabOrderElements.length - 1 : currentIndex - 1;
    const prevElement = this.tabOrderElements[prevIndex];
    
    if (prevElement) {
      prevElement.focus();
      return { success: true, targetElement: prevElement, direction: 'previous' };
    }

    return { success: false, targetElement: null, direction: 'previous' };
  }

  /**
   * Navigate to first element
   */
  private navigateToFirst(): KeyboardNavigationResult {
    const firstElement = this.tabOrderElements[0];
    if (firstElement) {
      firstElement.focus();
      return { success: true, targetElement: firstElement, direction: 'next' };
    }
    return { success: false, targetElement: null, direction: 'next' };
  }

  /**
   * Navigate to last element
   */
  private navigateToLast(): KeyboardNavigationResult {
    const lastElement = this.tabOrderElements[this.tabOrderElements.length - 1];
    if (lastElement) {
      lastElement.focus();
      return { success: true, targetElement: lastElement, direction: 'previous' };
    }
    return { success: false, targetElement: null, direction: 'previous' };
  }

  /**
   * Get next tab element
   */
  private getNextTabElement(currentElement: HTMLElement, forward: boolean): HTMLElement | null {
    const currentIndex = this.tabOrderElements.indexOf(currentElement);
    if (currentIndex === -1) return null;

    if (forward) {
      return this.tabOrderElements[currentIndex + 1] || null;
    } else {
      return this.tabOrderElements[currentIndex - 1] || null;
    }
  }

  /**
   * Add element to tab order
   */
  private addToTabOrder(element: HTMLElement): void {
    if (!this.tabOrderElements.includes(element)) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      this.tabOrderElements.push(element);
      this.sortTabOrder();
    }
  }

  /**
   * Remove element from tab order
   */
  public removeFromTabOrder(element: HTMLElement): void {
    const index = this.tabOrderElements.indexOf(element);
    if (index !== -1) {
      this.tabOrderElements.splice(index, 1);
      element.removeAttribute('tabindex');
    }
  }

  /**
   * Sort tab order elements
   */
  private sortTabOrder(): void {
    if (this.config.tabOrder === 'spatial') {
      // Sort by position (top to bottom, left to right)
      this.tabOrderElements.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        
        if (Math.abs(rectA.top - rectB.top) < 10) {
          // Same row, sort by left position
          return rectA.left - rectB.left;
        }
        // Different rows, sort by top position
        return rectA.top - rectB.top;
      });
    }
    // Sequential order uses DOM order (default)
  }

  /**
   * Update interaction state
   */
  private updateInteractionState(elementId: string, updates: Partial<InteractionState>): void {
    const currentState = this.interactionStates.get(elementId);
    if (currentState) {
      this.interactionStates.set(elementId, { ...currentState, ...updates });
    }
  }

  /**
   * Apply visual feedback based on interaction state
   */
  private applyVisualFeedback(element: HTMLElement, elementId: string): void {
    const state = this.interactionStates.get(elementId);
    if (!state) return;

    // Remove existing state classes
    element.classList.remove('tag-chip-hovered', 'tag-chip-pressed', 'tag-chip-focused');

    // Apply current state classes
    if (state.isHovered) element.classList.add('tag-chip-hovered');
    if (state.isPressed) element.classList.add('tag-chip-pressed');
    if (state.isFocused) element.classList.add('tag-chip-focused');
  }

  /**
   * Announce to screen reader
   */
  private announceToScreenReader(element: HTMLElement, action: string): void {
    const announcement = element.getAttribute('aria-label') || element.textContent || 'Tag chip';
    
    // Create temporary announcement element
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      announcer.textContent = `${announcement} ${action}`;
      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    }, 100);
  }

  /**
   * Get interaction state for element
   */
  public getInteractionState(elementId: string): InteractionState | null {
    return this.interactionStates.get(elementId) || null;
  }

  /**
   * Check event handling integrity
   */
  public checkEventIntegrity(element: HTMLElement): boolean {
    const listeners = this.eventListeners.get(element);
    if (!listeners) return false;

    const requiredEvents = ['click', 'mouseenter', 'mouseleave', 'focus', 'blur', 'keydown'];
    return requiredEvents.every(event => listeners.has(event));
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): InteractionConfig {
    return { ...this.config };
  }

  /**
   * Cleanup element
   */
  public cleanupElement(element: HTMLElement, elementId: string): void {
    // Remove event listeners
    const listeners = this.eventListeners.get(element);
    if (listeners) {
      listeners.forEach((listener, eventType) => {
        element.removeEventListener(eventType, listener);
      });
      this.eventListeners.delete(element);
    }

    // Remove from tab order
    this.removeFromTabOrder(element);

    // Clear interaction state
    this.interactionStates.delete(elementId);

    // Clear focus if this element was focused
    if (this.focusedElement === element) {
      this.focusedElement = null;
    }
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    // Cleanup all elements
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach((listener, eventType) => {
        element.removeEventListener(eventType, listener);
      });
    });

    // Clear all data
    this.eventListeners.clear();
    this.interactionStates.clear();
    this.tabOrderElements = [];
    this.focusedElement = null;
  }
}