/**
 * 文本清晰度增强工具函数和类型定义
 */

// 文本渲染配置接口
export interface TextRenderingConfig {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  color: string;
  textShadow?: string;
  letterSpacing?: string;
}

// 主题文本配置接口
export interface ThemeTextConfig {
  light: TextRenderingConfig;
  dark: TextRenderingConfig;
}

// 排版比例系统
export const typography = {
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  }
} as const;

// 字体栈配置
export const fontStacks = {
  primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
  chinese: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
  mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
} as const;

// 文本清晰度增强类名
export const textClasses = {
  enhanced: 'text-enhanced',
  highContrast: 'text-high-contrast',
  summary: 'text-summary',
  crisp: 'text-crisp',
  ultraCrisp: 'text-ultra-crisp',
  chineseOptimized: 'text-chinese-optimized',
  englishOptimized: 'text-english-optimized',
  monoOptimized: 'text-mono-optimized',
  numericOptimized: 'text-numeric-optimized',
  accessible: 'text-accessible',
  performanceOptimized: 'text-performance-optimized',
  antialiased: 'text-antialiased',
  subpixelAntialiased: 'text-subpixel-antialiased',
  optimizeLegibility: 'text-optimize-legibility',
  optimizeSpeed: 'text-optimize-speed',
  geometricPrecision: 'text-geometric-precision',
  kerning: 'text-kerning',
  ligatures: 'text-ligatures',
  noLigatures: 'text-no-ligatures',
  dpiAdaptive: 'text-dpi-adaptive',
  webkitOptimized: 'text-webkit-optimized',
  firefoxOptimized: 'text-firefox-optimized',
  edgeOptimized: 'text-edge-optimized',
  gpuAccelerated: 'text-gpu-accelerated',
  cacheOptimized: 'text-cache-optimized'
} as const;

// 响应式文本大小类名
export const responsiveTextClasses = {
  xs: 'text-xs-enhanced',
  sm: 'text-sm-enhanced',
  base: 'text-base-enhanced',
  lg: 'text-lg-enhanced',
  xl: 'text-xl-enhanced'
} as const;

// 组件特定文本类名
export const componentTextClasses = {
  button: 'btn-text-enhanced',
  navigation: 'nav-text-enhanced',
  modal: 'modal-text-enhanced',
  tooltip: 'tooltip-text-enhanced',
  formLabel: 'form-label-enhanced'
} as const;

/**
 * 获取文本渲染配置
 * @param theme - 主题类型 ('light' | 'dark')
 * @param component - 组件类型
 * @returns 文本渲染配置对象
 */
export function getTextRenderingConfig(
  theme: 'light' | 'dark' = 'light',
  component: 'default' | 'summary' | 'button' | 'navigation' | 'modal' = 'default'
): TextRenderingConfig {
  const baseConfig: TextRenderingConfig = {
    fontFamily: fontStacks.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    lineHeight: typography.lineHeights.normal,
    color: theme === 'dark' ? '#f9fafb' : '#111827',
    letterSpacing: typography.letterSpacing.normal
  };

  // 根据组件类型调整配置
  switch (component) {
    case 'summary':
      return {
        ...baseConfig,
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        letterSpacing: typography.letterSpacing.wide,
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
      };
    
    case 'button':
      return {
        ...baseConfig,
        fontWeight: typography.weights.medium,
        letterSpacing: typography.letterSpacing.wide
      };
    
    case 'navigation':
      return {
        ...baseConfig,
        fontSize: typography.sizes.sm,
        fontWeight: typography.weights.medium,
        color: theme === 'dark' ? '#e5e7eb' : '#374151'
      };
    
    case 'modal':
      return {
        ...baseConfig,
        lineHeight: typography.lineHeights.relaxed
      };
    
    default:
      return baseConfig;
  }
}

/**
 * 检查文本对比度是否符合WCAG标准
 * @param textColor - 文本颜色 (hex格式)
 * @param backgroundColor - 背景颜色 (hex格式)
 * @returns 对比度比值
 */
export function calculateContrastRatio(textColor: string, backgroundColor: string): number {
  // 将hex颜色转换为RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // 计算相对亮度
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const textRgb = hexToRgb(textColor);
  const bgRgb = hexToRgb(backgroundColor);

  if (!textRgb || !bgRgb) return 0;

  const textLuminance = getLuminance(textRgb.r, textRgb.g, textRgb.b);
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(textLuminance, bgLuminance);
  const darker = Math.min(textLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 检查对比度是否符合WCAG AA标准
 * @param contrastRatio - 对比度比值
 * @param fontSize - 字体大小 (px)
 * @param fontWeight - 字体权重
 * @returns 是否符合标准
 */
export function meetsWCAGStandard(
  contrastRatio: number, 
  fontSize: number = 16, 
  fontWeight: number = 400
): boolean {
  // 大文本标准 (18px+ 或 14px+ bold)
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
  
  // WCAG AA标准: 普通文本4.5:1, 大文本3:1
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * 应用文本清晰度增强类名
 * @param baseClasses - 基础类名
 * @param options - 增强选项
 * @returns 合并后的类名字符串
 */
export function applyTextEnhancements(
  baseClasses: string = '',
  options: {
    enhanced?: boolean;
    highContrast?: boolean;
    summary?: boolean;
    crisp?: boolean;
    ultraCrisp?: boolean;
    chineseOptimized?: boolean;
    englishOptimized?: boolean;
    monoOptimized?: boolean;
    numericOptimized?: boolean;
    accessible?: boolean;
    antialiased?: boolean;
    subpixelAntialiased?: boolean;
    optimizeLegibility?: boolean;
    optimizeSpeed?: boolean;
    geometricPrecision?: boolean;
    kerning?: boolean;
    ligatures?: boolean;
    noLigatures?: boolean;
    dpiAdaptive?: boolean;
    webkitOptimized?: boolean;
    firefoxOptimized?: boolean;
    edgeOptimized?: boolean;
    gpuAccelerated?: boolean;
    performanceOptimized?: boolean;
    cacheOptimized?: boolean;
    size?: keyof typeof responsiveTextClasses;
    component?: keyof typeof componentTextClasses;
  } = {}
): string {
  const classes = [];

  // 只添加非空的基础类名，并规范化空格
  if (baseClasses && baseClasses.trim()) {
    // 将多个空格替换为单个空格，然后分割并重新连接
    const normalizedClasses = baseClasses.trim().replace(/\s+/g, ' ');
    classes.push(normalizedClasses);
  }

  // 基础增强选项
  if (options.enhanced) classes.push(textClasses.enhanced);
  if (options.highContrast) classes.push(textClasses.highContrast);
  if (options.summary) classes.push(textClasses.summary);
  if (options.crisp) classes.push(textClasses.crisp);
  if (options.ultraCrisp) classes.push(textClasses.ultraCrisp);
  if (options.accessible) classes.push(textClasses.accessible);
  if (options.performanceOptimized) classes.push(textClasses.performanceOptimized);

  // 语言优化选项
  if (options.chineseOptimized) classes.push(textClasses.chineseOptimized);
  if (options.englishOptimized) classes.push(textClasses.englishOptimized);
  if (options.monoOptimized) classes.push(textClasses.monoOptimized);
  if (options.numericOptimized) classes.push(textClasses.numericOptimized);

  // 渲染优化选项
  if (options.antialiased) classes.push(textClasses.antialiased);
  if (options.subpixelAntialiased) classes.push(textClasses.subpixelAntialiased);
  if (options.optimizeLegibility) classes.push(textClasses.optimizeLegibility);
  if (options.optimizeSpeed) classes.push(textClasses.optimizeSpeed);
  if (options.geometricPrecision) classes.push(textClasses.geometricPrecision);

  // 字体特性选项
  if (options.kerning) classes.push(textClasses.kerning);
  if (options.ligatures) classes.push(textClasses.ligatures);
  if (options.noLigatures) classes.push(textClasses.noLigatures);

  // 浏览器和DPI优化选项
  if (options.dpiAdaptive) classes.push(textClasses.dpiAdaptive);
  if (options.webkitOptimized) classes.push(textClasses.webkitOptimized);
  if (options.firefoxOptimized) classes.push(textClasses.firefoxOptimized);
  if (options.edgeOptimized) classes.push(textClasses.edgeOptimized);

  // 性能优化选项
  if (options.gpuAccelerated) classes.push(textClasses.gpuAccelerated);
  if (options.cacheOptimized) classes.push(textClasses.cacheOptimized);
  
  // 大小和组件选项
  if (options.size) classes.push(responsiveTextClasses[options.size]);
  if (options.component) classes.push(componentTextClasses[options.component]);

  return classes.filter(Boolean).join(' ').trim();
}

/**
 * 检测是否包含中文字符
 * @param text - 要检测的文本
 * @returns 是否包含中文字符
 */
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 根据文本内容自动应用合适的字体
 * @param text - 文本内容
 * @param baseClasses - 基础类名
 * @returns 优化后的类名
 */
export function autoOptimizeTextClasses(text: string, baseClasses: string = ''): string {
  const hasChinese = containsChinese(text);
  
  return applyTextEnhancements(baseClasses, {
    enhanced: true,
    chineseOptimized: hasChinese,
    crisp: true
  });
}

/**
 * 检测浏览器类型
 * @returns 浏览器类型
 */
export function detectBrowser(): 'webkit' | 'firefox' | 'edge' | 'unknown' {
  if (typeof window === 'undefined' || !window.navigator) return 'unknown';
  
  const userAgent = window.navigator.userAgent;
  
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Edge') || userAgent.includes('Edg/')) return 'edge';
  if (userAgent.includes('Chrome') || userAgent.includes('Safari')) return 'webkit';
  
  return 'unknown';
}

/**
 * 检测设备DPI
 * @returns DPI类型
 */
export function detectDPI(): 'standard' | 'high' | 'ultra' {
  if (typeof window === 'undefined') return 'standard';
  
  const dpr = window.devicePixelRatio || 1;
  
  if (dpr >= 2.5) return 'ultra';
  if (dpr >= 1.5) return 'high';
  return 'standard';
}

/**
 * 获取当前主题
 * @returns 当前主题类型
 */
export function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'light';
  
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * 根据浏览器和DPI自动优化文本类名
 * @param text - 文本内容
 * @param baseClasses - 基础类名
 * @returns 优化后的类名
 */
export function autoOptimizeForEnvironment(text: string, baseClasses: string = ''): string {
  const browser = detectBrowser();
  const dpi = detectDPI();
  const hasChinese = containsChinese(text);
  
  return applyTextEnhancements(baseClasses, {
    enhanced: true,
    crisp: true,
    chineseOptimized: hasChinese,
    englishOptimized: !hasChinese,
    dpiAdaptive: true,
    webkitOptimized: browser === 'webkit',
    firefoxOptimized: browser === 'firefox',
    edgeOptimized: browser === 'edge',
    antialiased: dpi !== 'standard',
    geometricPrecision: dpi === 'ultra',
    kerning: true,
    ligatures: !hasChinese // 中文通常不需要连字
  });
}

/**
 * 动态设置文本样式
 * @param element - DOM元素
 * @param config - 文本渲染配置
 */
export function applyTextStyles(element: HTMLElement, config: TextRenderingConfig): void {
  if (!element) return;

  element.style.fontFamily = config.fontFamily;
  element.style.fontSize = config.fontSize;
  element.style.fontWeight = config.fontWeight.toString();
  element.style.lineHeight = config.lineHeight.toString();
  element.style.color = config.color;
  
  if (config.textShadow) element.style.textShadow = config.textShadow;
  if (config.letterSpacing) element.style.letterSpacing = config.letterSpacing;
  
  // 应用文本渲染优化 - 使用类型断言处理vendor前缀
  (element.style as any).webkitFontSmoothing = 'antialiased';
  (element.style as any).mozOsxFontSmoothing = 'grayscale';
  element.style.textRendering = 'optimizeLegibility';
}