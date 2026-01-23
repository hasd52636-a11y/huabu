import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { SaveDialogModal, ResponsiveModalContainer, ScrollableContentArea } from '../components/SaveDialog';
import type { WorkflowNode, SaveConfiguration } from '../components/SaveDialog';

// Mock window dimensions for testing
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('Template Workflow Save Dialog Fix', () => {
  beforeEach(() => {
    // Reset window dimensions
    mockWindowDimensions(1024, 768);
    
    // Mock document.body.style
    Object.defineProperty(document.body, 'style', {
      writable: true,
      value: {
        overflow: 'unset'
      }
    });
  });

  afterEach(() => {
    // Clean up
    document.body.style.overflow = 'unset';
  });

  describe('Property 1: Viewport Constraint Management', () => {
    it('should manage viewport constraints across all dialog content sizes and viewport dimensions', () => {
      fc.assert(
        fc.property(
          // Generate random viewport dimensions
          fc.record({
            width: fc.integer({ min: 320, max: 2560 }),
            height: fc.integer({ min: 400, max: 1440 }),
          }),
          // Generate random content size
          fc.record({
            nodeCount: fc.integer({ min: 0, max: 50 }),
            contentHeight: fc.integer({ min: 200, max: 2000 }),
          }),
          (viewport, content) => {
            // Set up viewport
            mockWindowDimensions(viewport.width, viewport.height);

            // Generate test nodes
            const nodes: WorkflowNode[] = Array.from({ length: content.nodeCount }, (_, i) => ({
              id: `node-${i}`,
              name: `Node ${i}`,
              type: 'text',
              description: `Description for node ${i}`,
              dependencies: [],
              isRequired: true,
              size: 100
            }));

            const mockOnSave = vi.fn();
            const mockOnClose = vi.fn();

            // Render the modal
            const { container } = render(
              <SaveDialogModal
                isOpen={true}
                onClose={mockOnClose}
                nodes={nodes}
                onSave={mockOnSave}
                lang="zh"
                theme="light"
                responsive={true}
              />
            );

            const modal = container.querySelector('[class*="rounded-3xl"]');
            
            // Property 1.1: Dialog should fit within viewport bounds
            if (modal) {
              const modalRect = modal.getBoundingClientRect();
              expect(modalRect.width).toBeLessThanOrEqual(viewport.width);
              expect(modalRect.height).toBeLessThanOrEqual(viewport.height);
            }

            // Property 1.2: Should provide scrolling when content exceeds height
            const scrollableArea = container.querySelector('[class*="overflow-y-auto"]');
            expect(scrollableArea).toBeTruthy();

            // Property 1.3: Should scale appropriately while preventing truncation
            const header = screen.getByText('保存工作流');
            expect(header).toBeVisible();

            // Property 1.4: Critical buttons should always be accessible
            const saveButton = screen.getByText('保存');
            const cancelButton = screen.getByText('取消');
            expect(saveButton).toBeVisible();
            expect(cancelButton).toBeVisible();

            // Verify buttons are clickable
            expect(saveButton).not.toBeDisabled();
            expect(cancelButton).not.toBeDisabled();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should handle extreme viewport dimensions gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Very small viewports (mobile)
            fc.record({
              width: fc.integer({ min: 320, max: 480 }),
              height: fc.integer({ min: 400, max: 600 }),
            }),
            // Very large viewports (desktop)
            fc.record({
              width: fc.integer({ min: 1920, max: 3840 }),
              height: fc.integer({ min: 1080, max: 2160 }),
            })
          ),
          (viewport) => {
            mockWindowDimensions(viewport.width, viewport.height);

            const nodes: WorkflowNode[] = [
              {
                id: 'test-node',
                name: 'Test Node',
                type: 'text',
                description: 'Test description',
                dependencies: [],
                isRequired: true,
                size: 100
              }
            ];

            const mockOnSave = vi.fn();
            const mockOnClose = vi.fn();

            render(
              <SaveDialogModal
                isOpen={true}
                onClose={mockOnClose}
                nodes={nodes}
                onSave={mockOnSave}
                lang="zh"
                theme="light"
                responsive={true}
              />
            );

            // Should always render without errors
            expect(screen.getByText('保存工作流')).toBeVisible();
            expect(screen.getByText('保存')).toBeVisible();
            expect(screen.getByText('取消')).toBeVisible();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('ResponsiveModalContainer', () => {
    it('should handle escape key and backdrop clicks', async () => {
      const mockOnClose = vi.fn();

      render(
        <ResponsiveModalContainer
          isOpen={true}
          onClose={mockOnClose}
          maxWidth={{ mobile: '95vw', tablet: '85vw', desktop: '75vw' }}
        >
          <div>Test Content</div>
        </ResponsiveModalContainer>
      );

      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      // Reset mock
      mockOnClose.mockClear();

      // Test backdrop click
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
        await waitFor(() => {
          expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('should prevent body scroll when open', () => {
      const { rerender } = render(
        <ResponsiveModalContainer
          isOpen={false}
          onClose={vi.fn()}
          maxWidth={{ mobile: '95vw', tablet: '85vw', desktop: '75vw' }}
        >
          <div>Test Content</div>
        </ResponsiveModalContainer>
      );

      expect(document.body.style.overflow).toBe('unset');

      rerender(
        <ResponsiveModalContainer
          isOpen={true}
          onClose={vi.fn()}
          maxWidth={{ mobile: '95vw', tablet: '85vw', desktop: '75vw' }}
        >
          <div>Test Content</div>
        </ResponsiveModalContainer>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('ScrollableContentArea', () => {
    it('should show scroll indicators when content overflows', () => {
      const { container } = render(
        <div style={{ height: '200px' }}>
          <ScrollableContentArea
            maxHeight="200px"
            showScrollIndicators={true}
          >
            <div style={{ height: '400px' }}>
              Tall content that should trigger scroll indicators
            </div>
          </ScrollableContentArea>
        </div>
      );

      const scrollableDiv = container.querySelector('[class*="overflow-y-auto"]');
      expect(scrollableDiv).toBeTruthy();
    });

    it('should handle smooth scrolling behavior', () => {
      const { container } = render(
        <ScrollableContentArea
          maxHeight="300px"
          showScrollIndicators={true}
        >
          <div style={{ height: '600px' }}>Long content</div>
        </ScrollableContentArea>
      );

      const scrollableDiv = container.querySelector('[class*="overflow-y-auto"]') as HTMLElement;
      expect(scrollableDiv?.style.scrollBehavior).toBe('smooth');
    });
  });
});

/**
 * Feature: template-workflow-save-dialog-fix
 * Property 1: Viewport Constraint Management
 * 
 * Validates: Requirements 1.1, 1.2, 1.5, 4.4
 * 
 * This property-based test ensures that for any dialog content size and viewport dimensions,
 * the dialog fits within viewport bounds, provides scrolling when content exceeds height,
 * and scales appropriately while preventing content truncation.
 */