/**
 * Test setup for tag chip enhancement system
 * Configures testing environment for property-based testing
 */

import { beforeEach, afterEach } from 'vitest';

// Mock DOM APIs that might not be available in test environment
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: () => ({
    rangeCount: 0,
    getRangeAt: () => null,
    removeAllRanges: () => {},
    addRange: () => {},
  }),
});

Object.defineProperty(document, 'createRange', {
  writable: true,
  value: () => ({
    selectNodeContents: () => {},
    collapse: () => {},
    setStartAfter: () => {},
    setEndAfter: () => {},
    deleteContents: () => {},
    insertNode: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Setup and cleanup for each test
beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});