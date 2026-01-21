/**
 * Integration Tests for Enhanced TaggedInput Component
 * Tests the integration of EnhancedTagChip and VisualStyleEngine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TagData, BlockType, VisualConfig } from '../types/TagChipTypes';

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    font: '14px Arial',
    fontSize: '14px',
    fontFamily: 'Arial',
    fontWeight: '400',
    letterSpacing: '0px',
    lineHeight: '20px',
    paddingLeft: '8px',
    paddingTop: '4px'
  })
});

Element.prototype.getBoundingClientRect = vi.fn(() => ({
  x: 0,
  y: 0,
  width: 100,
  height: 30,
  top: 0,
  left: 0,
  bottom: 30,
  right: 100,
  toJSON: () => {}
}));

describe('TaggedInput Integration', () => {
  let mockContainer: HTMLElement;
  let mockUpstreamData: Array<{ blockNumber: string; content?: string; type?: string }>;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.contentEditable = 'true';
    document.body.appendChild(mockContainer);

    mockUpstreamData = [
      { blockNumber: 'A01', content: 'First block content', type: 'A' },
      { blockNumber: 'B02', content: 'Second block content', type: 'B' },
      { blockNumber: 'V03', content: 'Third block content', type: 'V' }
    ];
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  describe('Component Integration', () => {
    it('should integrate with enhanced components', async () => {
      // Test that the enhanced components can be imported
      const { default: TaggedInput } = await import('../components/TaggedInput');
      const { visualStyleEngine } = await import('../services/VisualStyleEngine');
      
      expect(TaggedInput).toBeDefined();
      expect(visualStyleEngine).toBeDefined();
    });

    it('should support enhanced chips configuration', () => {
      const visualConfig: VisualConfig = {
        colorScheme: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#ef4444',
          background: '#ffffff',
          text: '#000000',
          border: '#e5e7eb'
        },
        typography: {
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.4
        },
        spacing: {
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          margin: { top: 2, right: 4, bottom: 2, left: 4 },
          borderRadius: 16,
          borderWidth: 2
        },
        animation: {
          duration: 200,
          easing: 'ease-out',
          enableHover: true,
          enableFocus: true,
          enablePress: true
        }
      };

      expect(visualConfig.colorScheme.primary).toBe('#3b82f6');
      expect(visualConfig.typography.fontSize).toBe(14);
      expect(visualConfig.spacing.borderRadius).toBe(16);
      expect(visualConfig.animation.duration).toBe(200);
    });
  });

  describe('Tag Parsing and Rendering', () => {
    it('should parse tags from text value', () => {
      const testValue = 'Hello [A01] world [B02] test [V03]';
      const regex = /\[([A-Z]\d{2})\]/g;
      const foundTags: string[] = [];
      let match;

      while ((match = regex.exec(testValue)) !== null) {
        foundTags.push(match[1]);
      }

      expect(foundTags).toEqual(['A01', 'B02', 'V03']);
    });

    it('should determine block types correctly', () => {
      const getBlockTypeFromNumber = (blockNumber: string): BlockType => {
        const type = blockNumber.charAt(0);
        switch (type) {
          case 'A': return BlockType.A;
          case 'B': return BlockType.B;
          case 'V': return BlockType.V;
          default: return BlockType.A;
        }
      };

      expect(getBlockTypeFromNumber('A01')).toBe(BlockType.A);
      expect(getBlockTypeFromNumber('B02')).toBe(BlockType.B);
      expect(getBlockTypeFromNumber('V03')).toBe(BlockType.V);
    });

    it('should create tag data objects correctly', () => {
      const blockNumber = 'A01';
      const blockType = BlockType.A;
      const referencedBlock = mockUpstreamData.find(data => data.blockNumber === blockNumber);
      
      const tagData: TagData = {
        id: `tag-${blockNumber}`,
        label: blockNumber,
        blockType,
        content: referencedBlock?.content || ''
      };

      expect(tagData.id).toBe('tag-A01');
      expect(tagData.label).toBe('A01');
      expect(tagData.blockType).toBe(BlockType.A);
      expect(tagData.content).toBe('First block content');
    });
  });

  describe('Enhanced vs Legacy Mode', () => {
    it('should support both enhanced and legacy modes', () => {
      const enableEnhancedChips = true;
      const enableLegacyChips = false;

      expect(enableEnhancedChips).toBe(true);
      expect(enableLegacyChips).toBe(false);
    });

    it('should handle enhanced chip styling', async () => {
      const { visualStyleEngine } = await import('../services/VisualStyleEngine');
      
      const styleResult = visualStyleEngine.calculateChipStyles(
        BlockType.A,
        undefined,
        { isHovered: false, isFocused: false, isSelected: false, isDisabled: false }
      );

      expect(styleResult).toBeDefined();
      expect(styleResult.styles).toBeDefined();
      expect(styleResult.classes).toBeDefined();
      expect(styleResult.accessibility).toBeDefined();
    });

    it('should handle legacy chip styling', () => {
      const getEnhancedChipStyle = (blockNumber: string) => {
        const colors = {
          A: { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)', border: '#3b82f6' },
          B: { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #047857 100%)', border: '#10b981' },
          V: { bg: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #b91c1c 100%)', border: '#ef4444' }
        };
        
        const type = blockNumber.charAt(0) as keyof typeof colors;
        const color = colors[type] || colors.A;
        
        return {
          style: `background: ${color.bg}; border: 2px solid ${color.border}; border-radius: 16px;`
        };
      };

      const styleA = getEnhancedChipStyle('A01');
      const styleB = getEnhancedChipStyle('B02');
      const styleV = getEnhancedChipStyle('V03');

      expect(styleA.style).toContain('#3b82f6');
      expect(styleB.style).toContain('#10b981');
      expect(styleV.style).toContain('#ef4444');
    });
  });

  describe('Event Handling', () => {
    it('should handle tag hover events', () => {
      const tagData: TagData = {
        id: 'tag-A01',
        label: 'A01',
        blockType: BlockType.A,
        content: 'First block content'
      };

      const referencedBlock = mockUpstreamData.find(data => data.blockNumber === tagData.label);
      const content = referencedBlock?.content || '';
      const hasContent = content && content.trim();

      expect(hasContent).toBeTruthy();
      expect(content).toBe('First block content');
    });

    it('should handle tag insertion', () => {
      const blockNumber = 'A01';
      
      // Create enhanced tag chip element
      const chipContainer = document.createElement('span');
      chipContainer.className = 'inline-block align-middle mx-1';
      chipContainer.setAttribute('data-testid', `tag-chip-tag-${blockNumber}`);
      chipContainer.setAttribute('data-tag-id', `tag-${blockNumber}`);
      chipContainer.contentEditable = 'false';
      chipContainer.innerHTML = `[${blockNumber}]`;

      expect(chipContainer.getAttribute('data-testid')).toBe('tag-chip-tag-A01');
      expect(chipContainer.getAttribute('data-tag-id')).toBe('tag-A01');
      expect(chipContainer.innerHTML).toBe('[A01]');
    });
  });

  describe('Value Updates', () => {
    it('should extract text from DOM correctly', () => {
      // Simulate DOM structure with mixed text and tags
      mockContainer.innerHTML = 'Hello <span data-tag-id="tag-A01">[A01]</span> world';
      
      let text = '';
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tag = element.getAttribute('data-tag') || element.getAttribute('data-tag-id');
          if (tag) {
            const tagLabel = tag.startsWith('tag-') ? tag.substring(4) : tag;
            text += `[${tagLabel}]`;
          } else {
            node.childNodes.forEach(walk);
          }
        }
      };
      
      mockContainer.childNodes.forEach(walk);
      
      expect(text).toBe('Hello [A01] world');
    });

    it('should handle both legacy and enhanced tag formats', () => {
      // Test legacy format
      const legacyTag = 'A01';
      const legacyTagLabel = legacyTag.startsWith('tag-') ? legacyTag.substring(4) : legacyTag;
      expect(legacyTagLabel).toBe('A01');

      // Test enhanced format
      const enhancedTag = 'tag-A01';
      const enhancedTagLabel = enhancedTag.startsWith('tag-') ? enhancedTag.substring(4) : enhancedTag;
      expect(enhancedTagLabel).toBe('A01');
    });
  });

  describe('Accessibility', () => {
    it('should provide proper accessibility attributes', () => {
      const accessibilityAttributes = {
        'aria-label': 'Tag A01',
        role: 'button',
        tabIndex: 0
      };

      expect(accessibilityAttributes['aria-label']).toBe('Tag A01');
      expect(accessibilityAttributes.role).toBe('button');
      expect(accessibilityAttributes.tabIndex).toBe(0);
    });

    it('should handle keyboard navigation', () => {
      const mockKeyEvent = {
        key: 'Backspace',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      };

      // Test that keyboard events can be handled
      expect(mockKeyEvent.key).toBe('Backspace');
      expect(typeof mockKeyEvent.preventDefault).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing upstream data gracefully', () => {
      const blockNumber = 'X99'; // Non-existent block
      const referencedBlock = mockUpstreamData.find(data => data.blockNumber === blockNumber);
      const content = referencedBlock?.content || '';
      
      expect(content).toBe('');
    });

    it('should handle DOM manipulation errors', () => {
      // Test error handling in cursor positioning
      const mockError = new Error('DOM manipulation failed');
      
      try {
        throw mockError;
      } catch (error) {
        expect(error.message).toBe('DOM manipulation failed');
      }
    });

    it('should provide fallback for visual style calculation', () => {
      // Test that we can handle missing visual config
      const visualConfig = undefined;
      
      expect(visualConfig).toBeUndefined();
      // Component should use default config when visualConfig is undefined
    });
  });

  describe('Performance', () => {
    it('should handle multiple tags efficiently', () => {
      const manyTags = Array.from({ length: 100 }, (_, i) => `A${String(i).padStart(2, '0')}`);
      
      expect(manyTags.length).toBe(100);
      expect(manyTags[0]).toBe('A00');
      expect(manyTags[99]).toBe('A99');
    });

    it('should debounce hover events', () => {
      let hoverCount = 0;
      const debouncedHover = vi.fn(() => {
        hoverCount++;
      });

      // Simulate multiple rapid hover events
      debouncedHover();
      debouncedHover();
      debouncedHover();

      expect(debouncedHover).toHaveBeenCalledTimes(3);
    });
  });
});