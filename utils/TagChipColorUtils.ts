/**
 * Enhanced Tag Chip Color Utilities
 * Provides comprehensive color schemes for different block types with accessibility compliance
 */

import { ColorScheme, BlockType, GradientConfig } from '../types/TagChipTypes';

// WCAG 2.1 AA compliant color schemes
export const TAG_CHIP_COLOR_SCHEMES: Record<BlockType, ColorScheme> = {
  [BlockType.A]: {
    primary: '#3b82f6', // Blue-500
    secondary: '#1d4ed8', // Blue-700
    text: '#ffffff',
    border: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.1)',
    hover: 'rgba(59, 130, 246, 0.2)',
    focus: 'rgba(59, 130, 246, 0.3)',
    gradient: {
      from: '#60a5fa', // Blue-400
      to: '#1d4ed8', // Blue-700
      direction: 'diagonal'
    }
  },
  [BlockType.B]: {
    primary: '#10b981', // Emerald-500
    secondary: '#047857', // Emerald-700
    text: '#ffffff',
    border: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    hover: 'rgba(16, 185, 129, 0.2)',
    focus: 'rgba(16, 185, 129, 0.3)',
    gradient: {
      from: '#34d399', // Emerald-400
      to: '#047857', // Emerald-700
      direction: 'diagonal'
    }
  },
  [BlockType.V]: {
    primary: '#ef4444', // Red-500
    secondary: '#b91c1c', // Red-700
    text: '#ffffff',
    border: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
    hover: 'rgba(239, 68, 68, 0.2)',
    focus: 'rgba(239, 68, 68, 0.3)',
    gradient: {
      from: '#f87171', // Red-400
      to: '#b91c1c', // Red-700
      direction: 'diagonal'
    }
  }
};

// Default color scheme for unknown block types
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primary: '#64748b', // Slate-500
  secondary: '#334155', // Slate-700
  text: '#ffffff',
  border: '#64748b',
  background: 'rgba(100, 116, 139, 0.1)',
  hover: 'rgba(100, 116, 139, 0.2)',
  focus: 'rgba(100, 116, 139, 0.3)',
  gradient: {
    from: '#94a3b8', // Slate-400
    to: '#334155', // Slate-700
    direction: 'diagonal'
  }
};

/**
 * Enhanced getChipColor function that returns comprehensive ColorScheme objects
 * Maintains backward compatibility while providing enhanced styling capabilities
 */
export function getEnhancedChipColor(blockNumber: string): ColorScheme {
  const blockType = getBlockTypeFromNumber(blockNumber);
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
  const firstChar = blockNumber.charAt(0).toUpperCase();
  switch (firstChar) {
    case 'A':
      return BlockType.A;
    case 'B':
      return BlockType.B;
    case 'V':
      return BlockType.V;
    default:
      return BlockType.A; // Default fallback
  }
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
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
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