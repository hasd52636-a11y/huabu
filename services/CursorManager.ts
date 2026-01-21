/**
 * Cursor Management Service for Enhanced Tag Chips
 * Provides precise cursor positioning and selection management in contentEditable contexts
 */

export interface CursorPosition {
  offset: number;
  container: Node;
}

export interface SelectionContext {
  range: Range | null;
  text: string;
  startOffset: number;
  endOffset: number;
  isCollapsed: boolean;
}

export interface CursorState {
  position: CursorPosition | null;
  selection: SelectionContext | null;
  timestamp: number;
}

export class CursorManager {
  private element: HTMLElement | null = null;
  private savedStates: CursorState[] = [];
  private maxHistorySize = 50;

  /**
   * Initialize the cursor manager with a target element
   */
  initialize(element: HTMLElement): void {
    this.element = element;
  }

  /**
   * Get current cursor position
   */
  getCurrentPosition(): number {
    if (!this.element) return 0;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    return this.calculateTextOffset(range.startContainer, range.startOffset);
  }

  /**
   * Set cursor position by text offset
   */
  setPosition(position: number): void {
    if (!this.element) return;

    try {
      const { container, offset } = this.findNodeAtOffset(position);
      const range = document.createRange();
      range.setStart(container, offset);
      range.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn('Failed to set cursor position:', error);
      this.fallbackToEnd();
    }
  }
  /**
   * Save current selection state
   */
  saveSelection(): Range | null {
    if (!this.element) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const clonedRange = range.cloneRange();
    
    // Save state to history
    this.saveState();
    
    return clonedRange;
  }

  /**
   * Restore selection from saved range
   */
  restoreSelection(range: Range): void {
    if (!range) return;

    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn('Failed to restore selection:', error);
    }
  }

  /**
   * Insert content at current cursor position
   */
  insertAtCursor(content: string): void {
    if (!this.element) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.fallbackToEnd();
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      
      // Save state before insertion
      this.saveState();
      
      // Delete selected content if any
      range.deleteContents();
      
      // Insert new content
      const textNode = document.createTextNode(content);
      range.insertNode(textNode);
      
      // Position cursor after inserted content
      range.setStartAfter(textNode);
      range.collapse(true);
      
      selection.removeAllRanges();
      selection.addRange(range);
      
    } catch (error) {
      console.warn('Failed to insert at cursor:', error);
      this.fallbackInsert(content);
    }
  }

  /**
   * Get current selection context
   */
  getSelectionContext(): SelectionContext {
    const defaultContext: SelectionContext = {
      range: null,
      text: '',
      startOffset: 0,
      endOffset: 0,
      isCollapsed: true
    };

    if (!this.element) return defaultContext;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return defaultContext;

    const range = selection.getRangeAt(0);
    
    return {
      range: range.cloneRange(),
      text: range.toString(),
      startOffset: this.calculateTextOffset(range.startContainer, range.startOffset),
      endOffset: this.calculateTextOffset(range.endContainer, range.endOffset),
      isCollapsed: range.collapsed
    };
  }
  /**
   * Undo last cursor operation
   */
  undo(): boolean {
    if (this.savedStates.length === 0) return false;

    const lastState = this.savedStates.pop();
    if (!lastState || !lastState.selection?.range) return false;

    try {
      this.restoreSelection(lastState.selection.range);
      return true;
    } catch (error) {
      console.warn('Failed to undo cursor operation:', error);
      return false;
    }
  }

  /**
   * Clear cursor history
   */
  clearHistory(): void {
    this.savedStates = [];
  }

  /**
   * Get cursor history size
   */
  getHistorySize(): number {
    return this.savedStates.length;
  }

  /**
   * Check if cursor is at start of element
   */
  isAtStart(): boolean {
    return this.getCurrentPosition() === 0;
  }

  /**
   * Check if cursor is at end of element
   */
  isAtEnd(): boolean {
    if (!this.element) return true;
    const textLength = this.getTextLength();
    return this.getCurrentPosition() >= textLength;
  }

  /**
   * Move cursor to start of element
   */
  moveToStart(): void {
    this.setPosition(0);
  }

  /**
   * Move cursor to end of element
   */
  moveToEnd(): void {
    if (!this.element) return;
    const textLength = this.getTextLength();
    this.setPosition(textLength);
  }

  /**
   * Move cursor by relative offset
   */
  moveBy(offset: number): void {
    const currentPosition = this.getCurrentPosition();
    const newPosition = Math.max(0, currentPosition + offset);
    this.setPosition(newPosition);
  }

  /**
   * Select text range
   */
  selectRange(start: number, end: number): void {
    if (!this.element) return;

    try {
      const startNode = this.findNodeAtOffset(start);
      const endNode = this.findNodeAtOffset(end);
      
      const range = document.createRange();
      range.setStart(startNode.container, startNode.offset);
      range.setEnd(endNode.container, endNode.offset);
      
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn('Failed to select range:', error);
    }
  }
  /**
   * Private helper methods
   */

  /**
   * Calculate text offset from node and offset
   */
  private calculateTextOffset(node: Node, offset: number): number {
    if (!this.element) return 0;

    let textOffset = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let currentNode = walker.nextNode();
    while (currentNode && currentNode !== node) {
      textOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    if (currentNode === node) {
      textOffset += offset;
    }

    return textOffset;
  }

  /**
   * Find node and offset at text position
   */
  private findNodeAtOffset(position: number): CursorPosition {
    if (!this.element) {
      throw new Error('Element not initialized');
    }

    let currentOffset = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node = walker.nextNode();
    while (node) {
      const nodeLength = node.textContent?.length || 0;
      
      if (currentOffset + nodeLength >= position) {
        return {
          container: node,
          offset: position - currentOffset
        };
      }
      
      currentOffset += nodeLength;
      node = walker.nextNode();
    }

    // If position is beyond text, return end of last text node
    if (node) {
      return {
        container: node,
        offset: node.textContent?.length || 0
      };
    }

    // Fallback to element itself
    return {
      container: this.element,
      offset: 0
    };
  }

  /**
   * Get total text length
   */
  private getTextLength(): number {
    if (!this.element) return 0;
    return this.element.textContent?.length || 0;
  }

  /**
   * Save current state to history
   */
  private saveState(): void {
    const selectionContext = this.getSelectionContext();
    const state: CursorState = {
      position: selectionContext.range ? {
        container: selectionContext.range.startContainer,
        offset: selectionContext.range.startOffset
      } : null,
      selection: selectionContext,
      timestamp: Date.now()
    };

    this.savedStates.push(state);

    // Limit history size
    if (this.savedStates.length > this.maxHistorySize) {
      this.savedStates.shift();
    }
  }
  /**
   * Fallback to end of element when positioning fails
   */
  private fallbackToEnd(): void {
    if (!this.element) return;

    try {
      const range = document.createRange();
      range.selectNodeContents(this.element);
      range.collapse(false);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn('Fallback positioning failed:', error);
    }
  }

  /**
   * Fallback insert method when cursor insertion fails
   */
  private fallbackInsert(content: string): void {
    if (!this.element) return;

    try {
      // Append to end of element
      const textNode = document.createTextNode(content);
      this.element.appendChild(textNode);

      // Position cursor after inserted content
      const range = document.createRange();
      range.setStartAfter(textNode);
      range.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn('Fallback insert failed:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.element = null;
    this.savedStates = [];
  }
}

// Singleton instance for global use
export const cursorManager = new CursorManager();