/**
 * Accessibility Hook
 * 
 * React hook for managing accessibility features and settings
 */

import { useState, useEffect, useCallback } from 'react';
import { accessibilityService, AccessibilityConfig } from '../services/AccessibilityService';

export interface UseAccessibilityReturn {
  config: AccessibilityConfig;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  fontSize: AccessibilityConfig['fontSize'];
  
  // Actions
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: AccessibilityConfig['fontSize']) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  enhanceElement: (element: HTMLElement, options: any) => void;
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  
  // Keyboard shortcuts
  addShortcut: (shortcut: any) => void;
  showShortcutsHelp: () => void;
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [config, setConfig] = useState<AccessibilityConfig>(accessibilityService.getConfig());

  // Update local state when config changes
  useEffect(() => {
    const handleConfigChange = () => {
      setConfig(accessibilityService.getConfig());
    };

    // Listen for config changes
    document.addEventListener('accessibility-config-changed', handleConfigChange);
    
    return () => {
      document.removeEventListener('accessibility-config-changed', handleConfigChange);
    };
  }, []);

  // Actions
  const toggleHighContrast = useCallback(() => {
    accessibilityService.toggleHighContrast();
    setConfig(accessibilityService.getConfig());
  }, []);

  const toggleReducedMotion = useCallback(() => {
    accessibilityService.toggleReducedMotion();
    setConfig(accessibilityService.getConfig());
  }, []);

  const setFontSize = useCallback((size: AccessibilityConfig['fontSize']) => {
    accessibilityService.setFontSize(size);
    setConfig(accessibilityService.getConfig());
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibilityService.announce(message, priority);
  }, []);

  const enhanceElement = useCallback((element: HTMLElement, options: any) => {
    accessibilityService.enhanceElement(element, options);
  }, []);

  const updateConfig = useCallback((updates: Partial<AccessibilityConfig>) => {
    accessibilityService.updateConfig(updates);
    setConfig(accessibilityService.getConfig());
  }, []);

  const addShortcut = useCallback((shortcut: any) => {
    accessibilityService.addShortcut(shortcut);
  }, []);

  const showShortcutsHelp = useCallback(() => {
    accessibilityService.showShortcutsHelp();
  }, []);

  return {
    config,
    isHighContrast: config.enableHighContrast,
    isReducedMotion: config.enableReducedMotion,
    fontSize: config.fontSize,
    
    // Actions
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    announce,
    enhanceElement,
    updateConfig,
    
    // Keyboard shortcuts
    addShortcut,
    showShortcutsHelp
  };
};