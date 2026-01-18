/**
 * Enhanced Theme Service for Canvas Intelligent Creative Platform
 * Provides consistent theming, responsive design utilities, and animation helpers
 */

import { COLORS, ANIMATIONS, SIZING } from '../constants';

export type ThemeMode = 'light' | 'dark';
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';
export type AnimationSpeed = 'fast' | 'normal' | 'slow';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  borderRadius: string;
  shadows: boolean;
  animations: boolean;
  reducedMotion: boolean;
}

export interface ResponsiveConfig {
  breakpoint: keyof typeof COLORS.breakpoints;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

class ThemeService {
  private currentTheme: ThemeMode = 'light';
  private config: ThemeConfig;
  private responsiveConfig: ResponsiveConfig;
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private listeners: Set<(theme: ThemeMode) => void> = new Set();

  constructor() {
    this.config = this.getDefaultConfig();
    this.responsiveConfig = this.getResponsiveConfig();
    this.initializeMediaQueries();
    this.detectSystemTheme();
  }

  /**
   * Get default theme configuration
   */
  private getDefaultConfig(): ThemeConfig {
    // Safe check for browser environment
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

    return {
      mode: 'light',
      primaryColor: COLORS.gold.primary,
      accentColor: COLORS.gold.accent,
      borderRadius: '1rem',
      shadows: true,
      animations: true,
      reducedMotion
    };
  }

  /**
   * Get current responsive configuration (private method)
   */
  private getResponsiveConfig(): ResponsiveConfig {
    return this.calculateResponsiveConfig();
  }

  /**
   * Initialize media query listeners for responsive design
   */
  private initializeMediaQueries(): void {
    // Safe check for browser environment
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    Object.entries(COLORS.breakpoints).forEach(([key, value]) => {
      const mq = window.matchMedia(`(min-width: ${value})`);
      this.mediaQueries.set(key, mq);
      
      mq.addEventListener('change', () => {
        this.responsiveConfig = this.getResponsiveConfig();
      });
    });

    // Listen for reduced motion preference changes
    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMQ.addEventListener('change', (e) => {
      this.config.reducedMotion = e.matches;
    });
  }

  /**
   * Detect system theme preference
   */
  private detectSystemTheme(): void {
    // Safe check for browser environment
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.setTheme(systemTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark' : 'light');
    });
  }

  /**
   * Set the current theme
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.config.mode = theme;
    
    // Update document class (safe check for browser environment)
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    
    // Update CSS custom properties
    this.updateCSSVariables();
    
    // Notify listeners
    this.listeners.forEach(listener => listener(theme));
  }

  /**
   * Get current theme
   */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  /**
   * Update CSS custom properties based on current theme
   */
  private updateCSSVariables(): void {
    // Safe check for browser environment
    if (typeof document === 'undefined' || !document.documentElement) {
      return;
    }

    const theme = COLORS.theme[this.currentTheme];
    const root = document.documentElement;

    // Primary colors
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-tertiary', theme.tertiary);
    root.style.setProperty('--color-accent', theme.accent);

    // Text colors
    root.style.setProperty('--color-text-primary', theme.text.primary);
    root.style.setProperty('--color-text-secondary', theme.text.secondary);
    root.style.setProperty('--color-text-tertiary', theme.text.tertiary);
    root.style.setProperty('--color-text-accent', theme.text.accent);

    // Border colors
    root.style.setProperty('--color-border-light', theme.border.light);
    root.style.setProperty('--color-border-medium', theme.border.medium);
    root.style.setProperty('--color-border-strong', theme.border.strong);

    // Shadows
    root.style.setProperty('--shadow-sm', theme.shadow.sm);
    root.style.setProperty('--shadow-md', theme.shadow.md);
    root.style.setProperty('--shadow-lg', theme.shadow.lg);
    root.style.setProperty('--shadow-xl', theme.shadow.xl);

    // Golden theme colors
    root.style.setProperty('--color-gold-primary', COLORS.gold.primary);
    root.style.setProperty('--color-gold-secondary', COLORS.gold.secondary);
    root.style.setProperty('--color-gold-accent', COLORS.gold.accent);
    root.style.setProperty('--color-gold-glow', COLORS.gold.glow);
  }

  /**
   * Get theme-aware class names
   */
  getThemeClasses(baseClasses: string): string {
    const theme = this.currentTheme;
    const themeClasses = theme === 'dark' ? 'dark' : '';
    return `${baseClasses} ${themeClasses}`.trim();
  }

  /**
   * Get component styling based on theme and size
   */
  getComponentStyles(component: 'button' | 'modal', size: ComponentSize = 'md') {
    const theme = COLORS.theme[this.currentTheme];
    
    switch (component) {
      case 'button':
        const buttonSize = SIZING.button[size];
        return {
          padding: buttonSize.padding,
          fontSize: buttonSize.fontSize,
          borderRadius: buttonSize.borderRadius,
          backgroundColor: theme.primary,
          color: theme.text.primary,
          border: `2px solid ${theme.border.medium}`,
          boxShadow: this.config.shadows ? theme.shadow.md : 'none',
          transition: this.config.animations ? `all ${ANIMATIONS.duration.normal} ${ANIMATIONS.easing.easeInOut}` : 'none'
        };
      
      case 'modal':
        return {
          backgroundColor: theme.primary,
          borderRadius: SIZING.modal.borderRadius,
          padding: SIZING.modal.padding,
          maxWidth: SIZING.modal.maxWidth,
          border: `6px solid ${theme.border.light}`,
          boxShadow: this.config.shadows ? theme.shadow.xl : 'none',
          color: theme.text.primary
        };
      
      default:
        return {};
    }
  }

  /**
   * Get animation styles with reduced motion support
   */
  getAnimationStyles(type: 'hover' | 'active' | 'focus' = 'hover', speed: AnimationSpeed = 'normal') {
    // Check for reduced motion preference in test environment
    const reducedMotion = this.config.reducedMotion || 
      (typeof window !== 'undefined' && window.matchMedia && 
       window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (reducedMotion) {
      return {
        transition: 'none',
        transform: 'none'
      };
    }

    const duration = ANIMATIONS.duration[speed];
    const easing = ANIMATIONS.easing.spring;
    
    switch (type) {
      case 'hover':
        return {
          transition: `all ${duration} ${easing}`,
          transform: ANIMATIONS.scale.hover
        };
      case 'active':
        return {
          transition: `all ${ANIMATIONS.duration.fast} ${easing}`,
          transform: ANIMATIONS.scale.active
        };
      case 'focus':
        return {
          transition: reducedMotion ? 'none' : `all ${duration} ${easing}`,
          transform: reducedMotion ? 'none' : ANIMATIONS.scale.focus,
          outline: reducedMotion ? undefined : `2px solid ${COLORS.gold.primary}`,
          outlineOffset: reducedMotion ? undefined : '2px'
        };
      default:
        return {};
    }
  }

  /**
   * Get responsive styles based on current breakpoint
   */
  getResponsiveStyles(styles: Partial<Record<keyof typeof COLORS.breakpoints, React.CSSProperties>>): React.CSSProperties {
    const currentBreakpoint = this.responsiveConfig.breakpoint;
    
    // Apply styles in order from smallest to current breakpoint
    let appliedStyles: React.CSSProperties = {};
    
    const breakpointOrder: (keyof typeof COLORS.breakpoints)[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = 0; i <= currentIndex; i++) {
      const bp = breakpointOrder[i];
      if (styles[bp]) {
        appliedStyles = { ...appliedStyles, ...styles[bp] };
      }
    }
    
    return appliedStyles;
  }

  /**
   * Get golden theme gradient
   */
  getGoldenGradient(): string {
    return COLORS.gold.gradient;
  }

  /**
   * Get floating menu styles with enhanced animations
   */
  getFloatingMenuStyles(): React.CSSProperties {
    const theme = COLORS.theme[this.currentTheme];
    
    return {
      backgroundColor: `${theme.primary}95`, // 95% opacity
      backdropFilter: 'blur(20px)',
      border: `2px solid ${theme.border.light}`,
      borderRadius: '1.5rem',
      boxShadow: this.config.shadows ? theme.shadow.xl : 'none',
      transition: this.config.animations ? `all ${ANIMATIONS.duration.normal} ${ANIMATIONS.easing.spring}` : 'none'
    };
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: ThemeMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current responsive configuration
   */
  getResponsiveConfig(): ResponsiveConfig {
    // Always return fresh responsive config
    return this.calculateResponsiveConfig();
  }

  /**
   * Calculate responsive configuration based on current window size
   */
  private calculateResponsiveConfig(): ResponsiveConfig {
    // Safe check for browser environment
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    return {
      breakpoint: width >= 1536 ? '2xl' : 
                 width >= 1280 ? 'xl' : 
                 width >= 1024 ? 'lg' : 
                 width >= 768 ? 'md' : 'sm',
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      screenWidth: width,
      screenHeight: height
    };
  }

  /**
   * Check if current screen size matches breakpoint
   */
  matchesBreakpoint(breakpoint: keyof typeof COLORS.breakpoints): boolean {
    const mq = this.mediaQueries.get(breakpoint);
    return mq ? mq.matches : false;
  }

  /**
   * Get theme-aware text color for contrast
   */
  getContrastTextColor(backgroundColor: string): string {
    // Simple contrast calculation - in production, use a proper contrast library
    const theme = COLORS.theme[this.currentTheme];
    
    // For light backgrounds, use dark text
    if (backgroundColor.includes('#FFFFFF') || backgroundColor.includes('#F8FAFC') || backgroundColor.includes('white')) {
      return this.currentTheme === 'dark' ? theme.text.primary : '#1E293B';
    }
    
    // For dark backgrounds, use light text
    if (backgroundColor.includes('#000000') || backgroundColor.includes('#0F172A') || backgroundColor.includes('black')) {
      return this.currentTheme === 'dark' ? theme.text.primary : '#FFFFFF';
    }
    
    // Default based on current theme
    return theme.text.primary;
  }

  /**
   * Destroy service and cleanup listeners
   */
  destroy(): void {
    this.listeners.clear();
    this.mediaQueries.forEach(mq => {
      // Note: MediaQueryList doesn't have removeAllListeners, 
      // but listeners are automatically cleaned up when the service is destroyed
    });
    this.mediaQueries.clear();
  }
}

// Export singleton instance
export const themeService = new ThemeService();
export default themeService;