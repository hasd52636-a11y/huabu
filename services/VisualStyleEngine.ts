/**
 * Visual Style Engine for Enhanced Tag Chips
 * Provides comprehensive styling capabilities with responsive design and accessibility compliance
 */

import { 
  VisualConfig, 
  ColorScheme, 
  GradientConfig, 
  Typography, 
  AnimationConfig, 
  Padding,
  BlockType 
} from '../types/TagChipTypes';
import { generateGradientCSS, TAG_CHIP_COLOR_SCHEMES, DEFAULT_COLOR_SCHEME } from '../utils/TagChipColorUtils';

export interface StyleCalculationResult {
  styles: React.CSSProperties;
  classes: string[];
  accessibility: AccessibilityAttributes;
  responsive: ResponsiveStyles;
}

export interface AccessibilityAttributes {
  'aria-label': string;
  'aria-describedby'?: string;
  role: string;
  tabIndex: number;
}

export interface ResponsiveStyles {
  mobile: React.CSSProperties;
  tablet: React.CSSProperties;
  desktop: React.CSSProperties;
}

export interface SpacingCalculation {
  chipSpacing: number;
  lineSpacing: number;
  containerPadding: Padding;
  alignmentOffset: number;
}

export class VisualStyleEngine {
  private defaultConfig: VisualConfig;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;

  constructor() {
    this.defaultConfig = this.createDefaultVisualConfig();
    this.updateViewportDimensions();
    
    // Listen for viewport changes
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleViewportChange.bind(this));
    }
  }

  /**
   * Calculate comprehensive styles for a tag chip
   */
  calculateChipStyles(
    blockType: BlockType,
    config?: Partial<VisualConfig>,
    state?: {
      isHovered?: boolean;
      isFocused?: boolean;
      isSelected?: boolean;
      isDisabled?: boolean;
    }
  ): StyleCalculationResult {
    const mergedConfig = this.mergeConfigs(this.defaultConfig, config);
    const colorScheme = TAG_CHIP_COLOR_SCHEMES[blockType] || DEFAULT_COLOR_SCHEME;
    
    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: `${mergedConfig.borderRadius}px`,
      padding: `${mergedConfig.padding.y}px ${mergedConfig.padding.x}px`,
      fontSize: mergedConfig.typography.fontSize,
      fontWeight: mergedConfig.typography.fontWeight,
      fontFamily: mergedConfig.typography.fontFamily,
      lineHeight: mergedConfig.typography.lineHeight,
      letterSpacing: mergedConfig.typography.letterSpacing,
      border: `2px solid ${colorScheme.border}`,
      backgroundColor: colorScheme.background,
      color: colorScheme.text,
      cursor: 'pointer',
      userSelect: 'none',
      transition: `all ${mergedConfig.animations.duration}ms ${mergedConfig.animations.easing}`,
      position: 'relative',
      overflow: 'hidden'
    };

    // Apply gradient if configured
    if (colorScheme.gradient) {
      baseStyles.background = generateGradientCSS(colorScheme.gradient);
    }

    // Apply state-specific styles
    if (state?.isHovered) {
      baseStyles.backgroundColor = colorScheme.hover;
      baseStyles.transform = `scale(${mergedConfig.animations.hoverScale})`;
      baseStyles.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }

    if (state?.isFocused) {
      baseStyles.backgroundColor = colorScheme.focus;
      baseStyles.transform = `scale(${mergedConfig.animations.focusScale})`;
      baseStyles.outline = `2px solid ${colorScheme.primary}`;
      baseStyles.outlineOffset = '2px';
    }

    if (state?.isSelected) {
      baseStyles.backgroundColor = colorScheme.primary;
      baseStyles.borderColor = colorScheme.secondary;
      baseStyles.boxShadow = `0 0 0 3px ${colorScheme.primary}33`;
    }

    if (state?.isDisabled) {
      baseStyles.opacity = 0.5;
      baseStyles.cursor = 'not-allowed';
      baseStyles.pointerEvents = 'none';
    }

    // Generate CSS classes for utility-based styling
    const classes = this.generateUtilityClasses(blockType, state);

    // Accessibility attributes
    const accessibility: AccessibilityAttributes = {
      'aria-label': `Tag chip ${blockType}`,
      role: 'button',
      tabIndex: state?.isDisabled ? -1 : 0
    };

    // Responsive styles
    const responsive = this.calculateResponsiveStyles(baseStyles, mergedConfig);

    return {
      styles: baseStyles,
      classes,
      accessibility,
      responsive
    };
  }

  /**
   * Calculate spacing and alignment for multiple tag chips
   */
  calculateSpacing(
    chipCount: number,
    containerWidth: number,
    config?: Partial<VisualConfig>
  ): SpacingCalculation {
    const mergedConfig = this.mergeConfigs(this.defaultConfig, config);
    
    // Base spacing calculations
    const baseChipWidth = 60; // Estimated average chip width
    const totalChipWidth = chipCount * baseChipWidth;
    const availableSpace = containerWidth - totalChipWidth;
    
    // Calculate optimal spacing
    const chipSpacing = Math.max(8, Math.min(16, availableSpace / (chipCount + 1)));
    const lineSpacing = mergedConfig.typography.lineHeight * 1.5;
    
    // Container padding based on viewport size
    const containerPadding: Padding = {
      x: this.viewportWidth < 768 ? 12 : 16,
      y: this.viewportWidth < 768 ? 8 : 12
    };

    // Alignment offset for centering
    const alignmentOffset = (availableSpace - (chipSpacing * (chipCount - 1))) / 2;

    return {
      chipSpacing,
      lineSpacing,
      containerPadding,
      alignmentOffset: Math.max(0, alignmentOffset)
    };
  }

  /**
   * Generate responsive styles for different viewport sizes
   */
  private calculateResponsiveStyles(
    baseStyles: React.CSSProperties,
    config: VisualConfig
  ): ResponsiveStyles {
    return {
      mobile: {
        ...baseStyles,
        fontSize: '0.75rem',
        padding: '4px 8px',
        borderRadius: `${config.borderRadius * 0.8}px`
      },
      tablet: {
        ...baseStyles,
        fontSize: '0.875rem',
        padding: '6px 12px',
        borderRadius: `${config.borderRadius * 0.9}px`
      },
      desktop: baseStyles
    };
  }

  /**
   * Generate utility CSS classes for framework integration
   */
  private generateUtilityClasses(
    blockType: BlockType,
    state?: {
      isHovered?: boolean;
      isFocused?: boolean;
      isSelected?: boolean;
      isDisabled?: boolean;
    }
  ): string[] {
    const classes = ['tag-chip', `tag-chip-${blockType.toLowerCase()}`];
    
    if (state?.isHovered) classes.push('tag-chip-hovered');
    if (state?.isFocused) classes.push('tag-chip-focused');
    if (state?.isSelected) classes.push('tag-chip-selected');
    if (state?.isDisabled) classes.push('tag-chip-disabled');
    
    // Responsive classes
    classes.push('tag-chip-responsive');
    
    return classes;
  }

  /**
   * Create default visual configuration
   */
  private createDefaultVisualConfig(): VisualConfig {
    return {
      colorScheme: DEFAULT_COLOR_SCHEME,
      borderRadius: 12,
      padding: { x: 12, y: 6 },
      typography: {
        fontSize: '0.875rem',
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.4,
        letterSpacing: '0.025em'
      },
      animations: {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        hoverScale: 1.05,
        focusScale: 1.02
      }
    };
  }

  /**
   * Merge configuration objects with deep merging
   */
  private mergeConfigs(
    defaultConfig: VisualConfig,
    userConfig?: Partial<VisualConfig>
  ): VisualConfig {
    if (!userConfig) return defaultConfig;

    return {
      colorScheme: { ...defaultConfig.colorScheme, ...userConfig.colorScheme },
      borderRadius: userConfig.borderRadius ?? defaultConfig.borderRadius,
      padding: { ...defaultConfig.padding, ...userConfig.padding },
      typography: { ...defaultConfig.typography, ...userConfig.typography },
      animations: { ...defaultConfig.animations, ...userConfig.animations }
    };
  }

  /**
   * Update viewport dimensions for responsive calculations
   */
  private updateViewportDimensions(): void {
    if (typeof window !== 'undefined') {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
    }
  }

  /**
   * Handle viewport changes for responsive updates
   */
  private handleViewportChange(): void {
    this.updateViewportDimensions();
  }

  /**
   * Validate visual configuration for accessibility compliance
   */
  validateConfiguration(config: VisualConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum font size for accessibility
    const fontSize = parseFloat(config.typography.fontSize);
    if (fontSize < 12) {
      errors.push('Font size must be at least 12px for accessibility compliance');
    }

    // Check minimum padding for touch targets
    if (config.padding.x < 8 || config.padding.y < 4) {
      warnings.push('Padding may be too small for comfortable touch interaction');
    }

    // Check border radius for usability
    if (config.borderRadius > 20) {
      warnings.push('Large border radius may affect visual consistency');
    }

    // Check animation duration for accessibility
    if (config.animations.duration > 500) {
      warnings.push('Long animation duration may affect user experience');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate CSS custom properties for theme integration
   */
  generateCSSCustomProperties(config: VisualConfig): Record<string, string> {
    return {
      '--tag-chip-border-radius': `${config.borderRadius}px`,
      '--tag-chip-padding-x': `${config.padding.x}px`,
      '--tag-chip-padding-y': `${config.padding.y}px`,
      '--tag-chip-font-size': config.typography.fontSize,
      '--tag-chip-font-weight': config.typography.fontWeight,
      '--tag-chip-font-family': config.typography.fontFamily,
      '--tag-chip-line-height': config.typography.lineHeight.toString(),
      '--tag-chip-letter-spacing': config.typography.letterSpacing || '0',
      '--tag-chip-animation-duration': `${config.animations.duration}ms`,
      '--tag-chip-animation-easing': config.animations.easing,
      '--tag-chip-hover-scale': config.animations.hoverScale.toString(),
      '--tag-chip-focus-scale': config.animations.focusScale.toString()
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleViewportChange.bind(this));
    }
  }
}

// Singleton instance for global use
export const visualStyleEngine = new VisualStyleEngine();