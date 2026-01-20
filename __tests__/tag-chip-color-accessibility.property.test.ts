/**
 * Property-Based Tests for Tag Chip Color Accessibility
 * Feature: tag-chip-enhancement, Property 1: Color Accessibility and Distinction
 * Validates: Requirements 1.2, 1.4, 6.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  getEnhancedChipColor, 
  getChipColor, 
  checkContrastRatio, 
  validateColorAccessibility,
  TAG_CHIP_COLOR_SCHEMES,
  DEFAULT_COLOR_SCHEME 
} from '../utils/TagChipColorUtils';
import { BlockType } from '../types/TagChipTypes';

describe('Tag Chip Color Accessibility Properties', () => {
  
  // Property 1: Color Accessibility and Distinction
  it('Property 1: All block types should have visually distinct and accessible colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('A', 'B', 'V'),
        fc.integer({ min: 1, max: 99 }),
        (blockPrefix: string, blockNumber: number) => {
          const blockId = `${blockPrefix}${blockNumber.toString().padStart(2, '0')}`;
          const colorScheme = getEnhancedChipColor(blockId);
          
          // Test 1: Color scheme should exist and be valid
          expect(colorScheme).toBeDefined();
          expect(colorScheme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(colorScheme.text).toMatch(/^#[0-9a-fA-F]{6}$/);
          
          // Test 2: Contrast ratio should meet WCAG 2.1 AA requirements (4.5:1)
          const contrastRatio = checkContrastRatio(colorScheme.text, colorScheme.primary);
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
          
          // Test 3: Colors should be distinct from other block types
          const otherBlockTypes = ['A', 'B', 'V'].filter(type => type !== blockPrefix);
          otherBlockTypes.forEach(otherType => {
            const otherBlockId = `${otherType}01`;
            const otherColorScheme = getEnhancedChipColor(otherBlockId);
            expect(colorScheme.primary).not.toBe(otherColorScheme.primary);
          });
          
          // Test 4: Gradient should be properly configured
          if (colorScheme.gradient) {
            expect(colorScheme.gradient.from).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(colorScheme.gradient.to).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(['horizontal', 'vertical', 'diagonal']).toContain(colorScheme.gradient.direction);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1a: Legacy getChipColor function should maintain backward compatibility', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('A', 'B', 'V'),
        fc.integer({ min: 1, max: 99 }),
        (blockPrefix: string, blockNumber: number) => {
          const blockId = `${blockPrefix}${blockNumber.toString().padStart(2, '0')}`;
          const legacyClasses = getChipColor(blockId);
          
          // Test: Should return valid Tailwind CSS classes
          expect(legacyClasses).toContain('bg-');
          expect(legacyClasses).toContain('text-');
          expect(legacyClasses).toContain('border-');
          expect(legacyClasses).toContain('hover:');
          
          // Test: Different block types should have different classes
          const expectedColors = {
            'A': 'blue',
            'B': 'emerald', 
            'V': 'red'
          };
          
          expect(legacyClasses).toContain(expectedColors[blockPrefix as keyof typeof expectedColors]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 1b: Unknown block types should fallback to default color scheme', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => !s.startsWith('A') && !s.startsWith('B') && !s.startsWith('V')),
        (unknownBlockId: string) => {
          const colorScheme = getEnhancedChipColor(unknownBlockId);
          
          // Should return default color scheme
          expect(colorScheme).toEqual(DEFAULT_COLOR_SCHEME);
          
          // Default scheme should also meet accessibility requirements
          const contrastRatio = checkContrastRatio(colorScheme.text, colorScheme.primary);
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 1c: All predefined color schemes should meet accessibility standards', () => {
    // Test all predefined color schemes
    Object.entries(TAG_CHIP_COLOR_SCHEMES).forEach(([blockType, colorScheme]) => {
      const contrastRatio = checkContrastRatio(colorScheme.text, colorScheme.primary);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      
      // Test hover state contrast
      const hoverContrastRatio = checkContrastRatio(colorScheme.text, colorScheme.hover);
      expect(hoverContrastRatio).toBeGreaterThanOrEqual(3.0); // Slightly lower for hover states
    });
    
    // Validate using the utility function
    expect(validateColorAccessibility()).toBe(true);
  });

  it('Property 1d: Color schemes should have consistent structure', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(BlockType.A, BlockType.B, BlockType.V),
        (blockType: BlockType) => {
          const colorScheme = TAG_CHIP_COLOR_SCHEMES[blockType];
          
          // Test: All required properties should exist
          expect(colorScheme.primary).toBeDefined();
          expect(colorScheme.secondary).toBeDefined();
          expect(colorScheme.text).toBeDefined();
          expect(colorScheme.border).toBeDefined();
          expect(colorScheme.background).toBeDefined();
          expect(colorScheme.hover).toBeDefined();
          expect(colorScheme.focus).toBeDefined();
          
          // Test: Gradient should be properly configured
          expect(colorScheme.gradient).toBeDefined();
          expect(colorScheme.gradient?.from).toBeDefined();
          expect(colorScheme.gradient?.to).toBeDefined();
          expect(colorScheme.gradient?.direction).toBeDefined();
        }
      ),
      { numRuns: 10 }
    );
  });
});