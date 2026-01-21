/**
 * Enhanced Tag Chip Component
 * Provides comprehensive tag chip functionality with visual enhancements,
 * accessibility compliance, and responsive design
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EnhancedTagChipProps, TagData, BlockType } from '../types/TagChipTypes';
import { visualStyleEngine } from '../services/VisualStyleEngine';

const EnhancedTagChip: React.FC<EnhancedTagChipProps> = ({
  tag,
  blockType,
  onHover,
  onHoverEnd,
  onClick,
  visualConfig,
  isSelected = false,
  isFocused = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate styles using VisualStyleEngine
  const styleResult = visualStyleEngine.calculateChipStyles(
    blockType,
    visualConfig,
    {
      isHovered,
      isFocused,
      isSelected,
      isDisabled: false
    }
  );

  // Handle mouse enter with debouncing
  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set hover state immediately for visual feedback
    setIsHovered(true);

    // Debounce the hover callback to prevent excessive calls
    hoverTimeoutRef.current = setTimeout(() => {
      onHover(tag, event.nativeEvent);
    }, 50); // Small delay to prevent flickering
  }, [tag, onHover]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    setIsHovered(false);
    onHoverEnd();
  }, [onHoverEnd]);

  // Handle click with visual feedback
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Provide immediate visual feedback
    setIsPressed(true);
    
    // Reset pressed state after animation
    setTimeout(() => setIsPressed(false), 150);

    // Call onClick handler if provided
    if (onClick) {
      onClick(tag);
    }
  }, [tag, onClick]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ': // Space key
        event.preventDefault();
        handleClick(event as any);
        break;
      case 'Escape':
        // Remove focus on escape
        if (chipRef.current) {
          chipRef.current.blur();
        }
        break;
    }
  }, [handleClick]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Generate CSS custom properties for dynamic styling
  const cssCustomProperties = visualConfig 
    ? visualStyleEngine.generateCSSCustomProperties(visualConfig)
    : {};

  // Combine all CSS classes
  const allClasses = [
    'enhanced-tag-chip',
    ...styleResult.classes,
    className,
    isPressed ? 'enhanced-tag-chip-pressed' : ''
  ].filter(Boolean).join(' ');

  // Apply pressed state styling
  const finalStyles = {
    ...styleResult.styles,
    ...(isPressed && {
      transform: `${styleResult.styles.transform || ''} scale(0.95)`,
      transition: 'all 0.1s ease-out'
    }),
    ...cssCustomProperties
  };

  return (
    <button
      ref={chipRef}
      className={allClasses}
      style={finalStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={styleResult.accessibility['aria-label']}
      aria-describedby={styleResult.accessibility['aria-describedby']}
      role={styleResult.accessibility.role}
      tabIndex={styleResult.accessibility.tabIndex}
      data-block-type={blockType}
      data-tag-id={tag.id}
      data-testid={`tag-chip-${tag.id}`}
    >
      {/* Main content */}
      <span className="enhanced-tag-chip-content">
        {tag.label}
      </span>

      {/* Visual enhancement overlay for gradient effects */}
      {visualConfig?.colorScheme?.gradient && (
        <div 
          className="enhanced-tag-chip-gradient-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(${
              visualConfig.colorScheme.gradient.direction === 'horizontal' ? 'to right' :
              visualConfig.colorScheme.gradient.direction === 'vertical' ? 'to bottom' :
              'to bottom right'
            }, ${visualConfig.colorScheme.gradient.from}, ${visualConfig.colorScheme.gradient.to})`,
            opacity: isHovered ? 0.8 : 0.6,
            borderRadius: 'inherit',
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Focus indicator for accessibility */}
      {isFocused && (
        <div
          className="enhanced-tag-chip-focus-indicator"
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            border: `2px solid ${styleResult.styles.color}`,
            borderRadius: `calc(${styleResult.styles.borderRadius} + 2px)`,
            opacity: 0.7,
            pointerEvents: 'none',
            animation: 'enhanced-tag-chip-focus-pulse 2s infinite'
          }}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div
          className="enhanced-tag-chip-selection-indicator"
          style={{
            position: 'absolute',
            top: -1,
            right: -1,
            width: 8,
            height: 8,
            backgroundColor: styleResult.styles.color,
            borderRadius: '50%',
            border: '1px solid white',
            pointerEvents: 'none'
          }}
        />
      )}
    </button>
  );
};

// CSS animations (to be included in global styles or CSS-in-JS)
const globalStyles = `
  @keyframes enhanced-tag-chip-focus-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .enhanced-tag-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    cursor: pointer;
    user-select: none;
    font-family: inherit;
    text-decoration: none;
    white-space: nowrap;
    vertical-align: middle;
  }

  .enhanced-tag-chip:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .enhanced-tag-chip-content {
    position: relative;
    z-index: 1;
    font-weight: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  .enhanced-tag-chip-pressed {
    transition: all 0.1s ease-out !important;
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .enhanced-tag-chip {
      font-size: 0.75rem;
      padding: 4px 8px;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    .enhanced-tag-chip {
      font-size: 0.875rem;
      padding: 6px 12px;
    }
  }

  @media (min-width: 1025px) {
    .enhanced-tag-chip {
      font-size: 1rem;
      padding: 8px 16px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .enhanced-tag-chip {
      border: 2px solid currentColor !important;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .enhanced-tag-chip,
    .enhanced-tag-chip * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Focus visible for keyboard navigation */
  .enhanced-tag-chip:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

// Inject global styles (in a real app, this would be in a CSS file)
if (typeof document !== 'undefined' && !document.getElementById('enhanced-tag-chip-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'enhanced-tag-chip-styles';
  styleElement.textContent = globalStyles;
  document.head.appendChild(styleElement);
}

export default React.memo(EnhancedTagChip);