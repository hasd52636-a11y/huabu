/**
 * Enhanced Tag Chip Color Utilities
 * Provides comprehensive color schemes for different block types with accessibility compliance
 */

import { ColorScheme, BlockType, GradientConfig } from '../types/TagChipTypes';

// WCAG 2.1 AA compliant color schemes with improved contrast ratios
export const TAG_CHIP_COLOR_SCHEMES: Record<BlockType, ColorScheme> = {
  [BlockType.A]: {
    primary: '#1e40af', // Blue-800 (higher contrast)
    secondary: '#1e3a8a', // Blue-900
    text: '#ffffff',
    border: '#1e40af',
    background: 'rgba(30, 64, 175, 0.1)',
    hover: '#1d4ed8', // Blue-700 (solid color for better contrast testing)
    focus: '#3b82f6', // Blue-500 (solid color for better contrast testing)
    gradient: {
      from: '#3b82f6', // Blue-500
      to: '#1e3a8a', // Blue-900
      direction: 'diagonal'
    }
  },
  [BlockType.B]: {
    primary: '#047857', // Emerald-700 (higher contrast)
    secondary: '#064e3b', // Emerald-800
    text: '#ffffff',
    border: '#047857',
    background: 'rgba(4, 120, 87, 0.1)',
    hover: '#059669', // Emerald-600 (solid color for better contrast testing)
    focus: '#10b981', // Emerald-500 (solid color for better contrast testing)
    gradient: {
      from: '#10b981', // Emerald-500
      to: '#064e3b', // Emerald-800
      direction: 'diagonal'
    }
  },
  [BlockType.V]: {
    primary: '#b91c1c', // Red-700 (higher contrast)
    secondary: '#991b1b', // Red-800
    text: '#ffffff',
    border: '#b91c1c',
    background: 'rgba(185, 28, 28, 0.1)',
    hover: '#dc2626', // Red-600 (solid color for better contrast testing)
    focus: '#ef4444', // Red-500 (solid color for better contrast testing)
    gradient: {
      from: '#ef4444', // Red-500
      to: '#991b1b', // Red-800
      direction: 'diagonal'
    }
  }
};

// Default color scheme for unknown block types with improved contrast
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primary: '#374151', // Gray-700 (higher contrast)
  secondary: '#1f2937', // Gray-800
  text: '#ffffff',
  border: '#374151',
  background: 'rgba(55, 65, 81, 0.1)',
  hover: '#4b5563', // Gray-600 (solid color for better contrast testing)
  focus: '#6b7280', // Gray-500 (solid color for better contrast testing)
  gradient: {
    from: '#6b7280', // Gray-500
    to: '#1f2937', // Gray-800
    direction: 'diagonal'
  }
};

/**
 * Enhanced getChipColor function that returns comprehensive ColorScheme objects
 * Maintains backward compatibility while providing enhanced styling capabilities
 */
export function getEnhancedChipColor(blockNumber: string): ColorScheme {
  const blockType = getBlockTypeFromNumber(blockNumber);
  
  // Handle unknown block types explicitly
  if (blockType === 'UNKNOWN' as BlockType) {
    return DEFAULT_COLOR_SCHEME;
  }
  
  return TAG_CHIP_COLOR_SCHEMES[blockType] || DEFAULT_COLOR_SCHEME;
}

/**
 * Legacy getChipColor function for backward compatibility
 * Returns Tailwind CSS classes as before
 */
export function getChipColor(blockNumber: string): string {
  if (blockNumber.startsWith('A')) {
    return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20';
  }
  if (blockNumber.startsWith('B')) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20';
  }
  if (blockNumber.startsWith('V')) {
    return 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20';
  }
  return 'bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20';
}

/**
 * Extract block type from block number
 */
function getBlockTypeFromNumber(blockNumber: string): BlockType {
  // Only match exact patterns like A01, B02, V03
  if (/^A\d{2}$/i.test(blockNumber)) {
    return BlockType.A;
  }
  if (/^B\d{2}$/i.test(blockNumber)) {
    return BlockType.B;
  }
  if (/^V\d{2}$/i.test(blockNumber)) {
    return BlockType.V;
  }
  
  // For any other pattern, return unknown
  return 'UNKNOWN' as BlockType;
}

/**
 * Generate CSS gradient string from GradientConfig
 */
export function generateGradientCSS(gradient: GradientConfig): string {
  const direction = gradient.direction === 'horizontal' ? 'to right' :
                   gradient.direction === 'vertical' ? 'to bottom' :
                   'to bottom right'; // diagonal
  
  return `linear-gradient(${direction}, ${gradient.from}, ${gradient.to})`;
}

/**
 * Check if color meets WCAG 2.1 AA contrast requirements
 */
export function checkContrastRatio(foreground: string, background: string): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  const getLuminance = (color: string): number => {
    // This is a simplified version - use a proper color library in production
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate contrast ratio between two colors (alias for checkContrastRatio)
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  return checkContrastRatio(foreground, background);
}

/**
 * Check if color combination is WCAG compliant
 */
export function isWCAGCompliant(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Validate that all color schemes meet accessibility requirements
 */
export function validateColorAccessibility(): boolean {
  for (const [blockType, colorScheme] of Object.entries(TAG_CHIP_COLOR_SCHEMES)) {
    const contrastRatio = checkContrastRatio(colorScheme.text, colorScheme.primary);
    if (contrastRatio < 4.5) {
      console.warn(`Color scheme for ${blockType} does not meet WCAG 2.1 AA requirements. Contrast ratio: ${contrastRatio}`);
      return false;
    }
  }
  return true;
}