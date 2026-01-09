/**
 * Property-based tests for AIServiceAdapter
 * Feature: api-configuration-integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { MultiProviderAIService, createAIServiceAdapter } from './AIServiceAdapter.js';
import { ProviderSettings, ProviderType } from '../types.js';

// Mock services
vi.mock('../services/shenmaService.js', () => ({
  ShenmaService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue('Shenma text response'),
    generateImage: vi.fn().mockResolvedValue('https://shenma.com/image.jpg'),
    generateVideo: vi.fn().mockResolvedValue('https://shenma.com/video.mp4'),
    testConnection: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../services/zhipuService.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue('Zhipu text response'),
    generateImage: vi.fn().mockResolvedValue('https://zhipu.com/image.jpg'),
    generateVideo: vi.fn().mockResolvedValue({ taskId: 'task123', videoUrl: 'https://zhipu.com/video.mp4' }),
    testConnection: vi.fn().mockResolvedValue(true),
    startPolling: vi.fn().mockImplementation((taskId, onProgress, onComplete, onError, timeout) => {
      setTimeout(() => {
        if (onComplete) {
          onComplete('https://zhipu.com/video.mp4');
        }
      }, 100);
    })
  }))
}));

describe('AIServiceAdapter', () => {
  let adapter: MultiProviderAIService;
  let mockOriginalService: any;

  beforeEach(() => {
    mockOriginalService = {
      generateText: vi.fn().mockResolvedValue('Original text response'),
      generateImage: vi.fn().mockResolvedValue('https://original.com/image.jpg'),
      generateVideo: vi.fn().mockResolvedValue('https://original.com/video.mp4'),
      testConnection: vi.fn().mockResolvedValue(true)
    };
    adapter = createAIServiceAdapter(mockOriginalService);
  });

  describe('Property Tests', () => {
    it('Property 4: 接口适配兼容性 - For any existing API call, should maintain same input/output format after transplanting new services', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          provider: fc.constantFrom('google', 'openai-compatible'),
          apiKey: fc.string({ minLength: 8, maxLength: 100 }),
          baseUrl: fc.webUrl(),
          model: fc.string({ minLength: 1, maxLength: 50 })
        }),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.array(fc.string({ minLength: 1, maxLength: 100 })),
          fc.record({ text: fc.string({ minLength: 1, maxLength: 500 }) })
        ),
        async (settings: ProviderSettings, contents: any) => {
          // 对于现有提供商，应该调用原始服务
          const result = await adapter.generateText(contents, settings);
          
          // 验证返回值类型
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          
          // 验证原始服务被调用
          expect(mockOriginalService.generateText).toHaveBeenCalledWith(contents, settings);
        }
      ), { numRuns: 100 });
    });

    it('Property 1: API服务植入完整性 - For any transplanted API service (Shenma, Zhipu), calling any function should return valid result or clear error', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          provider: fc.constantFrom('shenma', 'zhipu'),
          apiKey: fc.string({ minLength: 10, maxLength: 100 }),
          baseUrl: fc.webUrl(),
          model: fc.string({ minLength: 1, maxLength: 50 })
        }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (settings: ProviderSettings, prompt: string) => {
          // 测试文本生成
          const textResult = await adapter.generateText(prompt, settings);
          expect(typeof textResult).toBe('string');
          expect(textResult.length).toBeGreaterThan(0);
          
          // 测试图像生成
          const imageResult = await adapter.generateImage(prompt, settings);
          expect(typeof imageResult).toBe('string');
          expect(imageResult).toMatch(/^https?:\/\//);
          
          // 测试连接测试
          const connectionResult = await adapter.testConnection(settings);
          expect(typeof connectionResult).toBe('boolean');
        }
      ), { numRuns: 100 });
    });

    it('Property: Content conversion consistency - For any input content format, should convert to valid string', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.string(),
          fc.array(fc.string()),
          fc.array(fc.record({ text: fc.string() })),
          fc.record({ content: fc.string() }),
          fc.record({ prompt: fc.string() }),
          fc.record({ text: fc.string() })
        ),
        fc.record({
          provider: fc.constantFrom('shenma', 'zhipu'),
          apiKey: fc.string({ minLength: 10 }),
          baseUrl: fc.webUrl(),
          model: fc.string({ minLength: 1 })
        }),
        async (contents: any, settings: ProviderSettings) => {
          const result = await adapter.generateText(contents, settings);
          
          // 验证结果是有效字符串
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });

    it('Property: Provider configuration consistency - For any provider, should return valid default config', async () => {
      await fc.assert(fc.property(
        fc.constantFrom('shenma', 'zhipu'),
        (provider: string) => {
          const config = adapter.getProviderConfig(provider);
          
          // 验证配置结构
          expect(typeof config).toBe('object');
          expect(config).not.toBeNull();
          
          if (provider === 'shenma') {
            expect(config.shenma).toBeDefined();
            expect(config.shenma?.llmModel).toBeDefined();
            expect(config.shenma?.imageModel).toBeDefined();
            expect(config.shenma?.videoModel).toBeDefined();
          }
          
          if (provider === 'zhipu') {
            expect(config.zhipu).toBeDefined();
            expect(config.zhipu?.llmModel).toBeDefined();
            expect(config.zhipu?.visionModel).toBeDefined();
            expect(config.zhipu?.imageModel).toBeDefined();
            expect(config.zhipu?.videoModel).toBeDefined();
          }
        }
      ), { numRuns: 100 });
    });

    it('Property: Error handling consistency - For any invalid provider, should throw clear error', async () => {
      // Create adapter without original service for this test
      const adapterWithoutFallback = new MultiProviderAIService();
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          provider: fc.string().filter(s => s.trim().length > 0 && !['google', 'openai-compatible', 'shenma', 'zhipu'].includes(s.trim())),
          apiKey: fc.string(),
          baseUrl: fc.string(),
          model: fc.string()
        }),
        fc.string({ minLength: 1 }),
        async (settings: any, prompt: string) => {
          // 对于无效提供商，应该抛出错误
          await expect(adapterWithoutFallback.generateText(prompt, settings)).rejects.toThrow();
          await expect(adapterWithoutFallback.generateImage(prompt, settings)).rejects.toThrow();
          await expect(adapterWithoutFallback.generateVideo(prompt, settings)).rejects.toThrow();
        }
      ), { numRuns: 30 });
    });
  });

  describe('Unit Tests', () => {
    it('should handle Shenma text generation correctly', async () => {
      const settings: ProviderSettings = {
        provider: 'shenma',
        apiKey: 'test-shenma-key',
        baseUrl: 'https://api.shenma.com',
        model: 'default'
      };

      const result = await adapter.generateText('Test prompt', settings);
      expect(result).toBe('Shenma text response');
    });

    it('should handle Zhipu image generation correctly', async () => {
      const settings: ProviderSettings = {
        provider: 'zhipu',
        apiKey: 'test-zhipu-key',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'cogview-3-flash'
      };

      const result = await adapter.generateImage('Test image prompt', settings);
      expect(result).toBe('https://zhipu.com/image.jpg');
    });

    it('should handle Zhipu async video generation correctly', async () => {
      const settings: ProviderSettings = {
        provider: 'zhipu',
        apiKey: 'test-zhipu-key',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'cogvideox-flash'
      };

      const result = await adapter.generateVideo('Test video prompt', settings);
      expect(result).toBe('https://zhipu.com/video.mp4');
    });

    it('should fallback to original service for existing providers', async () => {
      const settings: ProviderSettings = {
        provider: 'google',
        apiKey: 'test-google-key',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-pro'
      };

      const result = await adapter.generateText('Test prompt', settings);
      expect(result).toBe('Original text response');
      expect(mockOriginalService.generateText).toHaveBeenCalledWith('Test prompt', settings);
    });

    it('should handle content conversion correctly', async () => {
      const settings: ProviderSettings = {
        provider: 'shenma',
        apiKey: 'test-key',
        baseUrl: 'https://api.shenma.com',
        model: 'default'
      };

      // Test array content
      await adapter.generateText(['Hello', 'World'], settings);
      
      // Test object content
      await adapter.generateText({ text: 'Hello World' }, settings);
      
      // Test complex object
      await adapter.generateText({ content: 'Hello World', extra: 'data' }, settings);
      
      // All should work without throwing
      expect(true).toBe(true);
    });

    it('should dispose resources correctly', () => {
      adapter.dispose();
      
      // After disposal, adapter should still be usable but will reinitialize services
      expect(() => adapter.dispose()).not.toThrow();
    });
  });
});