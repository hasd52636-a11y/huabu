/**
 * React Hook for Theme Management
 * Provides easy access to theme service functionality in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { themeService, ThemeMode, ComponentSize, AnimationSpeed } from '../services/ThemeService';
import { COLORS, ANIMATIONS, SIZING } from '../constants';

export interface UseThemeReturn {
  // Theme state
  theme: ThemeMode;
  isDark: boolean;
  isLight: boolean;
  
  // Theme actions
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  
  // Responsive state
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: string;
  screenWidth: number;
  screenHeight: number;
  
  // Style helpers
  getThemeClasses: (baseClasses: string) => string;
  getComponentStyles: (component: 'button' | 'modal', size?: ComponentSize) => React.CSSProperties;
  getAnimationStyles: (type?: 'hover' | 'active' | 'focus', speed?: AnimationSpeed) => React.CSSProperties;
  getResponsiveStyles: (styles: Record<string, React.CSSProperties>) => React.CSSProperties;
  getFloatingMenuStyles: () => React.CSSProperties;
  getGoldenGradient: () => string;
  getContrastTextColor: (backgroundColor: string) => string;
  
  // Utility functions
  matchesBreakpoint: (breakpoint: string) => boolean;
  
  // Constants
  colors: typeof COLORS;
  animations: typeof ANIMATIONS;
  sizing: typeof SIZING;
}

/**
 * Custom hook for theme management and responsive design
 */
export const useTheme = (): UseThemeReturn => {
  const [theme, setThemeState] = useState<ThemeMode>(themeService.getTheme());
  const [responsiveConfig, setResponsiveConfig] = useState(themeService.getResponsiveConfig());

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setThemeState(newTheme);
    });

    return unsubscribe;
  }, []);

  // Subscribe to responsive changes
  useEffect(() => {
    const handleResize = () => {
      setResponsiveConfig(themeService.getResponsiveConfig());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme actions
  const setTheme = useCallback((newTheme: ThemeMode) => {
    themeService.setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    themeService.toggleTheme();
  }, []);

  // Style helpers
  const getThemeClasses = useCallback((baseClasses: string) => {
    return themeService.getThemeClasses(baseClasses);
  }, [theme]);

  const getComponentStyles = useCallback((component: 'button' | 'modal', size: ComponentSize = 'md') => {
    return themeService.getComponentStyles(component, size);
  }, [theme]);

  const getAnimationStyles = useCallback((type: 'hover' | 'active' | 'focus' = 'hover', speed: AnimationSpeed = 'normal') => {
    return themeService.getAnimationStyles(type, speed);
  }, []);

  const getResponsiveStyles = useCallback((styles: Record<string, React.CSSProperties>) => {
    return themeService.getResponsiveStyles(styles);
  }, [responsiveConfig]);

  const getFloatingMenuStyles = useCallback(() => {
    return themeService.getFloatingMenuStyles();
  }, [theme]);

  const getGoldenGradient = useCallback(() => {
    return themeService.getGoldenGradient();
  }, []);

  const getContrastTextColor = useCallback((backgroundColor: string) => {
    return themeService.getContrastTextColor(backgroundColor);
  }, [theme]);

  const matchesBreakpoint = useCallback((breakpoint: string) => {
    return themeService.matchesBreakpoint(breakpoint as keyof typeof COLORS.breakpoints);
  }, []);

  // Memoized computed values
  const isDark = useMemo(() => theme === 'dark', [theme]);
  const isLight = useMemo(() => theme === 'light', [theme]);

  return {
    // Theme state
    theme,
    isDark,
    isLight,
    
    // Theme actions
    setTheme,
    toggleTheme,
    
    // Responsive state
    isMobile: responsiveConfig.isMobile,
    isTablet: responsiveConfig.isTablet,
    isDesktop: responsiveConfig.isDesktop,
    breakpoint: responsiveConfig.breakpoint,
    screenWidth: responsiveConfig.screenWidth,
    screenHeight: responsiveConfig.screenHeight,
    
    // Style helpers
    getThemeClasses,
    getComponentStyles,
    getAnimationStyles,
    getResponsiveStyles,
    getFloatingMenuStyles,
    getGoldenGradient,
    getContrastTextColor,
    
    // Utility functions
    matchesBreakpoint,
    
    // Constants
    colors: COLORS,
    animations: ANIMATIONS,
    sizing: SIZING
  };
};

/**
 * Hook for getting theme-aware button styles
 */
export const useButtonStyles = (variant: 'primary' | 'secondary' | 'golden' = 'primary', size: ComponentSize = 'md') => {
  const { theme, getComponentStyles, getAnimationStyles } = useTheme();
  
  return useMemo(() => {
    const baseStyles = getComponentStyles('button', size);
    const hoverStyles = getAnimationStyles('hover');
    
    const variantStyles = {
      primary: {
        backgroundColor: theme === 'dark' ? COLORS.theme.dark.primary : COLORS.theme.light.primary,
        color: theme === 'dark' ? COLORS.theme.dark.text.primary : COLORS.theme.light.text.primary,
        borderColor: theme === 'dark' ? COLORS.theme.dark.border.medium : COLORS.theme.light.border.medium
      },
      secondary: {
        backgroundColor: theme === 'dark' ? COLORS.theme.dark.secondary : COLORS.theme.light.secondary,
        color: theme === 'dark' ? COLORS.theme.dark.text.secondary : COLORS.theme.light.text.secondary,
        borderColor: theme === 'dark' ? COLORS.theme.dark.border.light : COLORS.theme.light.border.light
      },
      golden: {
        background: COLORS.gold.gradient,
        color: 'white',
        borderColor: COLORS.gold.accent,
        boxShadow: `${theme === 'dark' ? COLORS.theme.dark.shadow.md : COLORS.theme.light.shadow.md}, 0 0 20px ${COLORS.gold.glow}`
      }
    };
    
    return {
      ...baseStyles,
      ...variantStyles[variant],
      ':hover': {
        ...hoverStyles,
        ...(variant === 'golden' && {
          boxShadow: `${theme === 'dark' ? COLORS.theme.dark.shadow.lg : COLORS.theme.light.shadow.lg}, 0 0 30px ${COLORS.gold.glow}`
        })
      }
    };
  }, [theme, variant, size, getComponentStyles, getAnimationStyles]);
};

/**
 * Hook for getting theme-aware modal styles
 */
export const useModalStyles = () => {
  const { getComponentStyles, getFloatingMenuStyles } = useTheme();
  
  return useMemo(() => {
    const modalStyles = getComponentStyles('modal');
    const floatingStyles = getFloatingMenuStyles();
    
    return {
      overlay: {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SIZING.modal.padding,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)'
      },
      content: {
        ...modalStyles,
        ...floatingStyles,
        animation: 'modal-slide-up 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    };
  }, [getComponentStyles, getFloatingMenuStyles]);
};

/**
 * Hook for responsive design utilities
 */
export const useResponsive = () => {
  const { isMobile, isTablet, isDesktop, breakpoint, matchesBreakpoint, getResponsiveStyles } = useTheme();
  
  const getResponsiveValue = useCallback(<T>(values: Partial<Record<keyof typeof COLORS.breakpoints, T>>): T | undefined => {
    const breakpointOrder: (keyof typeof COLORS.breakpoints)[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoint as keyof typeof COLORS.breakpoints);
    
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    
    return undefined;
  }, [breakpoint]);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    matchesBreakpoint,
    getResponsiveStyles,
    getResponsiveValue
  };
};

export default useTheme;