/**
 * Property-Based Tests for Tag Chip Visual Consistency
 * Feature: tag-chip-enhancement, Property 17: Consistent Spacing and Alignment
 * Feature: tag-chip-enhancement, Property 18: Responsive Visual Consistency
 * Validates: Requirements 1.3, 1.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  VisualStyleEngine, 
  StyleCalculationResult, 
  SpacingCalculation 
} from '../services/VisualStyleEngine';
import { 
  BlockType, 
  VisualConfig, 
  ColorScheme, 
  Typography, 
  AnimationConfig, 
  Padding 
} from '../types/TagChipTypes';

describe('Tag Chip Visual Consistency Properties', () => {
  let styleEngine: VisualStyleEngine;

  beforeEach(() => {
    styleEngine = new VisualStyleEngine();
  });

  afterEach(() => {
    styleEngine.destroy();
  });

  // Custom generators for property testing
  const blockTypeGen = fc.constantFrom(BlockType.A, BlockType.B, BlockType.V);
  
  const paddingGen = fc.record({
    x: fc.integer({ min: 4, max: 24 }),
    y: fc.integer({ min: 2, max: 16 })
  });

  const typographyGen = fc.record({
    fontSize: fc.constantFrom('0.75rem', '0.875rem', '1rem', '1.125rem'),
    fontWeight: fc.constantFrom('400', '500', '600', '700'),
    fontFamily: fc.constantFrom('system-ui', 'Arial', 'Helvetica'),
    lineHeight: fc.integer({ min: 12, max: 18 }).map(x => x / 10), // 生成1.2到1.8之间的值
    letterSpacing: fc.option(fc.constantFrom('0', '0.025em', '0.05em'))
  });

  const animationConfigGen = fc.record({
    duration: fc.integer({ min: 100, max: 500 }),
    easing: fc.constantFrom('ease', 'ease-in', 'ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)'),
    hoverScale: fc.integer({ min: 100, max: 110 }).map(x => x / 100), // 生成1.0到1.1之间的值
    focusScale: fc.integer({ min: 100, max: 105 }).map(x => x / 100) // 生成1.0到1.05之间的值
  });

  const visualConfigGen = fc.record({
    borderRadius: fc.integer({ min: 4, max: 20 }),
    padding: paddingGen,
    typography: typographyGen,
    animations: animationConfigGen
  });

  const chipStateGen = fc.record({
    isHovered: fc.boolean(),
    isFocused: fc.boolean(),
    isSelected: fc.boolean(),
    isDisabled: fc.boolean()
  });

  const viewportSizeGen = fc.record({
    width: fc.integer({ min: 320, max: 1920 }),
    height: fc.integer({ min: 568, max: 1080 })
  });

  // Property 17: Consistent Spacing and Alignment
  describe('Property 17: Consistent Spacing and Alignment', () => {
    it('should maintain consistent spacing between chips regardless of content or block type', () => {
      fc.assert(
        fc.property(
          fc.array(blockTypeGen, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 200, max: 800 }),
          visualConfigGen,
          (blockTypes: BlockType[], containerWidth: number, config: Partial<VisualConfig>) => {
            const spacing = styleEngine.calculateSpacing(blockTypes.length, containerWidth, config);
            
            // Test 1: Spacing should be consistent and positive
            expect(spacing.chipSpacing).toBeGreaterThan(0);
            expect(spacing.lineSpacing).toBeGreaterThan(0);
            expect(spacing.containerPadding.x).toBeGreaterThan(0);
            expect(spacing.containerPadding.y).toBeGreaterThan(0);
            
            // Test 2: Spacing should be within reasonable bounds
            expect(spacing.chipSpacing).toBeLessThanOrEqual(32);
            expect(spacing.chipSpacing).toBeGreaterThanOrEqual(4);
            
            // Test 3: Alignment offset should be non-negative
            expect(spacing.alignmentOffset).toBeGreaterThanOrEqual(0);
            
            // Test 4: Calculate styles for each block type and verify consistency
            const styles = blockTypes.map(blockType => 
              styleEngine.calculateChipStyles(blockType, config)
            );
            
            // All chips should have the same padding structure
            const firstPadding = styles[0].styles.padding;
            styles.forEach(style => {
              expect(style.styles.padding).toBe(firstPadding);
            });
            
            // All chips should have the same border radius
            const firstBorderRadius = styles[0].styles.borderRadius;
            styles.forEach(style => {
              expect(style.styles.borderRadius).toBe(firstBorderRadius);
            });
            
            // All chips should have consistent typography
            const firstFontSize = styles[0].styles.fontSize;
            const firstLineHeight = styles[0].styles.lineHeight;
            styles.forEach(style => {
              expect(style.styles.fontSize).toBe(firstFontSize);
              expect(style.styles.lineHeight).toBe(firstLineHeight);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent alignment across different chip sequences', () => {
      fc.assert(
        fc.property(
          fc.array(blockTypeGen, { minLength: 1, maxLength: 5 }),
          fc.array(blockTypeGen, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 300, max: 600 }),
          (sequence1: BlockType[], sequence2: BlockType[], containerWidth: number) => {
            const spacing1 = styleEngine.calculateSpacing(sequence1.length, containerWidth);
            const spacing2 = styleEngine.calculateSpacing(sequence2.length, containerWidth);
            
            // Test: Container padding should be consistent regardless of chip count
            expect(spacing1.containerPadding.x).toBe(spacing2.containerPadding.x);
            expect(spacing1.containerPadding.y).toBe(spacing2.containerPadding.y);
            
            // Test: Line spacing should be consistent
            expect(spacing1.lineSpacing).toBe(spacing2.lineSpacing);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Property 18: Responsive Visual Consistency
  describe('Property 18: Responsive Visual Consistency', () => {
    it('should maintain visual consistency across different viewport sizes', () => {
      fc.assert(
        fc.property(
          blockTypeGen,
          visualConfigGen,
          chipStateGen,
          viewportSizeGen,
          (blockType: BlockType, config: Partial<VisualConfig>, state: any, viewport: any) => {
            // Mock viewport dimensions
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: viewport.width
            });
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: viewport.height
            });

            const styleResult = styleEngine.calculateChipStyles(blockType, config, state);
            
            // Test 1: All responsive variants should exist
            expect(styleResult.responsive.mobile).toBeDefined();
            expect(styleResult.responsive.tablet).toBeDefined();
            expect(styleResult.responsive.desktop).toBeDefined();
            
            // Test 2: Mobile styles should be smaller but readable
            const mobileStyles = styleResult.responsive.mobile;
            const desktopStyles = styleResult.responsive.desktop;
            
            expect(parseFloat(mobileStyles.fontSize as string)).toBeLessThanOrEqual(
              parseFloat(desktopStyles.fontSize as string)
            );
            
            // Test 3: All variants should maintain core visual properties
            [styleResult.responsive.mobile, styleResult.responsive.tablet, styleResult.responsive.desktop]
              .forEach(responsiveStyle => {
                expect(responsiveStyle.display).toBe('inline-flex');
                expect(responsiveStyle.alignItems).toBe('center');
                expect(responsiveStyle.justifyContent).toBe('center');
                expect(responsiveStyle.cursor).toBeDefined();
                expect(responsiveStyle.userSelect).toBe('none');
                expect(responsiveStyle.transition).toBeDefined();
              });
            
            // Test 4: Color consistency across responsive variants
            const baseColor = desktopStyles.color;
            expect(styleResult.responsive.mobile.color).toBe(baseColor);
            expect(styleResult.responsive.tablet.color).toBe(baseColor);
            
            // Test 5: Border radius should scale appropriately
            const mobileBorderRadius = parseFloat(mobileStyles.borderRadius as string);
            const desktopBorderRadius = parseFloat(desktopStyles.borderRadius as string);
            expect(mobileBorderRadius).toBeLessThanOrEqual(desktopBorderRadius);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain readability across all viewport sizes', () => {
      fc.assert(
        fc.property(
          blockTypeGen,
          viewportSizeGen,
          (blockType: BlockType, viewport: any) => {
            // Mock viewport
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: viewport.width
            });

            const styleResult = styleEngine.calculateChipStyles(blockType);
            
            // Test: Minimum font size for readability
            const mobileSize = parseFloat(styleResult.responsive.mobile.fontSize as string);
            const tabletSize = parseFloat(styleResult.responsive.tablet.fontSize as string);
            const desktopSize = parseFloat(styleResult.responsive.desktop.fontSize as string);
            
            // All sizes should be at least 12px (0.75rem)
            expect(mobileSize).toBeGreaterThanOrEqual(0.75);
            expect(tabletSize).toBeGreaterThanOrEqual(0.75);
            expect(desktopSize).toBeGreaterThanOrEqual(0.75);
            
            // Sizes should be in logical order
            expect(mobileSize).toBeLessThanOrEqual(tabletSize);
            expect(tabletSize).toBeLessThanOrEqual(desktopSize);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle extreme viewport sizes gracefully', () => {
      fc.assert(
        fc.property(
          blockTypeGen,
          fc.constantFrom(
            { width: 320, height: 568 }, // Small mobile
            { width: 1920, height: 1080 }, // Large desktop
            { width: 768, height: 1024 }, // Tablet portrait
            { width: 1024, height: 768 }  // Tablet landscape
          ),
          (blockType: BlockType, viewport: any) => {
            // Mock viewport
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: viewport.width
            });
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: viewport.height
            });

            // Create a new style engine instance to pick up the new viewport size
            const testStyleEngine = new VisualStyleEngine();
            
            const styleResult = testStyleEngine.calculateChipStyles(blockType);
            const spacing = testStyleEngine.calculateSpacing(5, viewport.width);
            
            // Test 1: Styles should be generated without errors
            expect(styleResult.styles).toBeDefined();
            expect(styleResult.responsive).toBeDefined();
            
            // Test 2: Spacing should adapt to viewport
            expect(spacing.chipSpacing).toBeGreaterThan(0);
            expect(spacing.containerPadding.x).toBeGreaterThan(0);
            
            // Test 3: Container padding should be smaller on mobile
            if (viewport.width < 768) {
              expect(spacing.containerPadding.x).toBe(12); // 移动设备应该是12
            } else {
              expect(spacing.containerPadding.x).toBe(16); // 桌面设备应该是16
            }
            
            // Cleanup
            testStyleEngine.destroy();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Additional consistency tests
  describe('Visual Configuration Validation', () => {
    it('should validate configuration and provide meaningful feedback', () => {
      fc.assert(
        fc.property(
          visualConfigGen,
          (config: Partial<VisualConfig>) => {
            // Create a complete config by merging with defaults
            const completeConfig: VisualConfig = {
              colorScheme: {
                primary: '#3b82f6',
                secondary: '#1d4ed8',
                text: '#ffffff',
                border: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                hover: 'rgba(59, 130, 246, 0.2)',
                focus: 'rgba(59, 130, 246, 0.3)'
              },
              borderRadius: config.borderRadius || 12,
              padding: config.padding || { x: 12, y: 6 },
              typography: config.typography || {
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'system-ui',
                lineHeight: 1.4
              },
              animations: config.animations || {
                duration: 200,
                easing: 'ease',
                hoverScale: 1.05,
                focusScale: 1.02
              }
            };

            const validation = styleEngine.validateConfiguration(completeConfig);
            
            // Test: Validation should always return a result
            expect(validation).toBeDefined();
            expect(validation.isValid).toBeDefined();
            expect(Array.isArray(validation.errors)).toBe(true);
            expect(Array.isArray(validation.warnings)).toBe(true);
            
            // Test: If there are errors, isValid should be false
            if (validation.errors.length > 0) {
              expect(validation.isValid).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate consistent CSS custom properties', () => {
      fc.assert(
        fc.property(
          visualConfigGen,
          (config: Partial<VisualConfig>) => {
            const completeConfig: VisualConfig = {
              colorScheme: {
                primary: '#3b82f6',
                secondary: '#1d4ed8',
                text: '#ffffff',
                border: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                hover: 'rgba(59, 130, 246, 0.2)',
                focus: 'rgba(59, 130, 246, 0.3)'
              },
              borderRadius: config.borderRadius || 12,
              padding: config.padding || { x: 12, y: 6 },
              typography: config.typography || {
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'system-ui',
                lineHeight: 1.4
              },
              animations: config.animations || {
                duration: 200,
                easing: 'ease',
                hoverScale: 1.05,
                focusScale: 1.02
              }
            };

            const cssProps = styleEngine.generateCSSCustomProperties(completeConfig);
            
            // Test: All expected properties should be present
            const expectedProps = [
              '--tag-chip-border-radius',
              '--tag-chip-padding-x',
              '--tag-chip-padding-y',
              '--tag-chip-font-size',
              '--tag-chip-font-weight',
              '--tag-chip-font-family',
              '--tag-chip-line-height',
              '--tag-chip-animation-duration',
              '--tag-chip-animation-easing',
              '--tag-chip-hover-scale',
              '--tag-chip-focus-scale'
            ];
            
            expectedProps.forEach(prop => {
              expect(cssProps[prop]).toBeDefined();
              expect(typeof cssProps[prop]).toBe('string');
            });
            
            // Test: Values should match configuration
            expect(cssProps['--tag-chip-border-radius']).toBe(`${completeConfig.borderRadius}px`);
            expect(cssProps['--tag-chip-padding-x']).toBe(`${completeConfig.padding.x}px`);
            expect(cssProps['--tag-chip-padding-y']).toBe(`${completeConfig.padding.y}px`);
            expect(cssProps['--tag-chip-font-size']).toBe(completeConfig.typography.fontSize);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // State consistency tests
  describe('State-based Visual Consistency', () => {
    it('should apply state changes consistently across all block types', () => {
      fc.assert(
        fc.property(
          fc.array(blockTypeGen, { minLength: 2, maxLength: 3 }),
          chipStateGen,
          (blockTypes: BlockType[], state: any) => {
            const styleResults = blockTypes.map(blockType =>
              styleEngine.calculateChipStyles(blockType, undefined, state)
            );
            
            // Test: All chips should have consistent state-based transformations
            if (state.isHovered) {
              styleResults.forEach(result => {
                expect(result.styles.transform).toContain('scale');
                expect(result.styles.boxShadow).toBeDefined();
                expect(result.classes).toContain('tag-chip-hovered');
              });
            }
            
            if (state.isFocused) {
              styleResults.forEach(result => {
                expect(result.styles.outline).toBeDefined();
                expect(result.styles.outlineOffset).toBeDefined();
                expect(result.classes).toContain('tag-chip-focused');
              });
            }
            
            if (state.isSelected) {
              styleResults.forEach(result => {
                expect(result.styles.boxShadow).toContain('0 0 0 3px');
                expect(result.classes).toContain('tag-chip-selected');
              });
            }
            
            if (state.isDisabled) {
              styleResults.forEach(result => {
                expect(result.styles.opacity).toBe(0.5);
                expect(result.styles.cursor).toBe('not-allowed');
                expect(result.classes).toContain('tag-chip-disabled');
                expect(result.accessibility.tabIndex).toBe(-1);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});