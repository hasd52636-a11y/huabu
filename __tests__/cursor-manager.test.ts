/**
 * Unit Tests for Cursor Manager
 * Tests cursor positioning, navigation, and event handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CursorManager } from '../services/CursorManager';

describe('CursorManager', () => {
  let cursorManager: CursorManager;
  let mockElement: HTMLElement;

  beforeEach(() => {
    cursorManager = new CursorManager();
    
    // Create mock element
    mockElement = document.createElement('div');
    mockElement.contentEditable = 'true';
    mockElement.innerHTML = 'Hello world test content';
    document.body.appendChild(mockElement);
    
    cursorManager.initialize(mockElement);
  });

  afterEach(() => {
    cursorManager.destroy();
    document.body.removeChild(mockElement);
  });

  describe('Initialization', () => {
    it('should initialize with element', () => {
      const newManager = new CursorManager();
      const element = document.createElement('div');
      
      newManager.initialize(element);
      
      // Test that manager is initialized (no direct way to test private element)
      expect(newManager.getCurrentPosition()).toBe(0);
      
      newManager.destroy();
    });
  });

  describe('Position Management', () => {
    it('should get current position', () => {
      const position = cursorManager.getCurrentPosition();
      expect(position).toBeGreaterThanOrEqual(0);
    });

    it('should set position', () => {
      cursorManager.setPosition(5);
      const position = cursorManager.getCurrentPosition();
      expect(position).toBe(5);
    });

    it('should handle invalid positions gracefully', () => {
      // Should not throw error
      expect(() => {
        cursorManager.setPosition(-1);
      }).not.toThrow();
      
      expect(() => {
        cursorManager.setPosition(1000);
      }).not.toThrow();
    });
  });

  describe('Selection Management', () => {
    it('should save and restore selection', () => {
      cursorManager.setPosition(3);
      const savedRange = cursorManager.saveSelection();
      
      expect(savedRange).toBeTruthy();
      
      // Move cursor elsewhere
      cursorManager.setPosition(8);
      
      // Restore selection
      if (savedRange) {
        cursorManager.restoreSelection(savedRange);
        expect(cursorManager.getCurrentPosition()).toBe(3);
      }
    });

    it('should get selection context', () => {
      cursorManager.setPosition(5);
      const context = cursorManager.getSelectionContext();
      
      expect(context).toBeDefined();
      expect(context.startOffset).toBe(5);
      expect(context.endOffset).toBe(5);
      expect(context.isCollapsed).toBe(true);
    });
  });

  describe('Content Insertion', () => {
    it('should insert content at cursor', () => {
      const originalContent = mockElement.textContent || '';
      cursorManager.setPosition(5);
      
      cursorManager.insertAtCursor(' inserted');
      
      const newContent = mockElement.textContent || '';
      expect(newContent).toContain('inserted');
      expect(newContent.length).toBeGreaterThan(originalContent.length);
    });
  });

  describe('History Management', () => {
    it('should maintain history', () => {
      expect(cursorManager.getHistorySize()).toBe(0);
      
      cursorManager.saveSelection();
      expect(cursorManager.getHistorySize()).toBe(1);
      
      cursorManager.clearHistory();
      expect(cursorManager.getHistorySize()).toBe(0);
    });

    it('should undo operations', () => {
      cursorManager.setPosition(3);
      cursorManager.saveSelection();
      
      cursorManager.setPosition(8);
      
      const undoResult = cursorManager.undo();
      expect(undoResult).toBe(true);
    });
  });

  describe('Navigation Methods', () => {
    it('should detect start and end positions', () => {
      cursorManager.moveToStart();
      expect(cursorManager.isAtStart()).toBe(true);
      expect(cursorManager.isAtEnd()).toBe(false);
      
      cursorManager.moveToEnd();
      expect(cursorManager.isAtStart()).toBe(false);
      expect(cursorManager.isAtEnd()).toBe(true);
    });

    it('should move by relative offset', () => {
      cursorManager.setPosition(5);
      cursorManager.moveBy(3);
      expect(cursorManager.getCurrentPosition()).toBe(8);
      
      cursorManager.moveBy(-2);
      expect(cursorManager.getCurrentPosition()).toBe(6);
    });

    it('should not move beyond boundaries', () => {
      cursorManager.moveBy(-100); // Should not go below 0
      expect(cursorManager.getCurrentPosition()).toBe(0);
    });
  });

  describe('Range Selection', () => {
    it('should select text range', () => {
      cursorManager.selectRange(2, 7);
      const context = cursorManager.getSelectionContext();
      
      expect(context.startOffset).toBe(2);
      expect(context.endOffset).toBe(7);
      expect(context.isCollapsed).toBe(false);
      expect(context.text.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle uninitialized state', () => {
      const uninitializedManager = new CursorManager();
      
      expect(uninitializedManager.getCurrentPosition()).toBe(0);
      expect(() => uninitializedManager.setPosition(5)).not.toThrow();
      expect(uninitializedManager.saveSelection()).toBeNull();
      
      uninitializedManager.destroy();
    });

    it('should handle DOM manipulation errors gracefully', () => {
      // Remove element from DOM to simulate error conditions
      document.body.removeChild(mockElement);
      
      expect(() => {
        cursorManager.setPosition(5);
        cursorManager.insertAtCursor('test');
        cursorManager.selectRange(0, 5);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      cursorManager.saveSelection();
      expect(cursorManager.getHistorySize()).toBeGreaterThan(0);
      
      cursorManager.destroy();
      expect(cursorManager.getHistorySize()).toBe(0);
      expect(cursorManager.getCurrentPosition()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const emptyElement = document.createElement('div');
      emptyElement.contentEditable = 'true';
      document.body.appendChild(emptyElement);
      
      const emptyManager = new CursorManager();
      emptyManager.initialize(emptyElement);
      
      expect(emptyManager.getCurrentPosition()).toBe(0);
      expect(emptyManager.isAtStart()).toBe(true);
      expect(emptyManager.isAtEnd()).toBe(true);
      
      emptyManager.destroy();
      document.body.removeChild(emptyElement);
    });

    it('should handle complex DOM structure', () => {
      const complexElement = document.createElement('div');
      complexElement.contentEditable = 'true';
      complexElement.innerHTML = 'Text <span>with</span> <strong>nested</strong> elements';
      document.body.appendChild(complexElement);
      
      const complexManager = new CursorManager();
      complexManager.initialize(complexElement);
      
      expect(() => {
        complexManager.setPosition(10);
        complexManager.insertAtCursor(' inserted');
        complexManager.selectRange(5, 15);
      }).not.toThrow();
      
      complexManager.destroy();
      document.body.removeChild(complexElement);
    });
  });
});