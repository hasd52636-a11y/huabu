/**
 * Video Model Selection Fix - Tests
 * 
 * Tests for the video model selection fix that ensures user-selected models
 * are respected during video generation.
 */

import { MultiProviderAIService } from '../adapters/AIServiceAdapter';

describe('Video Model Selection Fix', () => {
  let adapter: MultiProviderAIService;

  beforeEach(() => {
    adapter = new MultiProviderAIService();
  });

  describe('getEnhancedVideoStrategy', () => {
    test('should use user-selected VEO model as primary', () => {
      // Access private method for testing
      const strategy = (adapter as any).getEnhancedVideoStrategy('veo3-pro', {
        duration: 10,
        aspectRatio: '16:9',
        quality: 'standard',
        priority: 'quality'
      });

      expect(strategy.primary).toBe('veo3-pro');
      expect(strategy.fallback).toBe('veo3'); // VEO fallback
    });

    test('should use user-selected Sora model as primary', () => {
      const strategy = (adapter as any).getEnhancedVideoStrategy('sora_video2-portrait', {
        duration: 10,
        aspectRatio: '9:16',
        quality: 'hd',
        priority: 'quality'
      });

      expect(strategy.primary).toBe('sora_video2-portrait');
      expect(strategy.fallback).toBe('sora_video2'); // Sora fallback
    });

    test('should use automatic strategy when no user model provided', () => {
      const strategy = (adapter as any).getEnhancedVideoStrategy(undefined, {
        duration: 10,
        aspectRatio: '16:9',
        quality: 'standard',
        priority: 'quality'
      });

      // Should use automatic strategy (Sora models)
      expect(strategy.primary).toContain('sora');
      expect(strategy.fallback).toContain('sora');
    });

    test('should handle empty user model string', () => {
      const strategy = (adapter as any).getEnhancedVideoStrategy('', {
        duration: 10,
        aspectRatio: '16:9',
        quality: 'standard',
        priority: 'quality'
      });

      // Should use automatic strategy
      expect(strategy.primary).toContain('sora');
      expect(strategy.fallback).toContain('sora');
    });
  });

  describe('getCompatibleFallback', () => {
    test('should provide VEO fallback for VEO models', () => {
      expect((adapter as any).getCompatibleFallback('veo3-pro')).toBe('veo3');
      expect((adapter as any).getCompatibleFallback('veo3-fast')).toBe('veo3');
      expect((adapter as any).getCompatibleFallback('veo2')).toBe('veo3-fast');
    });

    test('should provide Sora fallback for Sora models', () => {
      expect((adapter as any).getCompatibleFallback('sora_video2-portrait')).toBe('sora_video2');
      expect((adapter as any).getCompatibleFallback('sora_video2-landscape')).toBe('sora_video2');
      expect((adapter as any).getCompatibleFallback('sora_video2')).toBe('sora_video2-landscape');
    });

    test('should provide WanX fallback for WanX models', () => {
      expect((adapter as any).getCompatibleFallback('wanx2.1-vace-plus')).toBe('wanx2.1-vace-plus');
      expect((adapter as any).getCompatibleFallback('wan2.2-animate-move')).toBe('wanx2.1-vace-plus');
    });

    test('should provide default fallback for unknown models', () => {
      expect((adapter as any).getCompatibleFallback('unknown-model')).toBe('sora_video2');
      expect((adapter as any).getCompatibleFallback('custom-model-123')).toBe('sora_video2');
    });
  });

  describe('Model Selection Integration', () => {
    test('Property: User model selection is respected', () => {
      const testModels = ['veo3', 'veo3-pro', 'sora_video2', 'wanx2.1-vace-plus'];
      
      testModels.forEach(model => {
        const strategy = (adapter as any).getEnhancedVideoStrategy(model, {
          duration: 10,
          aspectRatio: '16:9',
          quality: 'standard',
          priority: 'quality'
        });
        
        // Property: If user selects model M, strategy uses model M as primary
        expect(strategy.primary).toBe(model);
        
        // Property: Fallback should be compatible with primary
        const fallback = (adapter as any).getCompatibleFallback(model);
        expect(strategy.fallback).toBe(fallback);
      });
    });

    test('Property: Fallback models are compatible with primary', () => {
      const testCases = [
        { primary: 'veo3-pro', expectedFallbackFamily: 'veo' },
        { primary: 'sora_video2-portrait', expectedFallbackFamily: 'sora' },
        { primary: 'wanx2.1-vace-plus', expectedFallbackFamily: 'wanx' }
      ];
      
      testCases.forEach(({ primary, expectedFallbackFamily }) => {
        const fallback = (adapter as any).getCompatibleFallback(primary);
        
        // Property: Fallback should be from same model family
        expect(fallback.toLowerCase()).toContain(expectedFallbackFamily);
      });
    });
  });
});