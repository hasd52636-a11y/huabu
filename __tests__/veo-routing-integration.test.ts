/**
 * VEO Model Routing Integration Test
 * 
 * This test verifies the complete VEO model selection and routing pipeline
 * from UI selection to API endpoint routing.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getProviderSettings } from '../types';
import { MultiProviderAIService } from '../adapters/AIServiceAdapter';
import { ShenmaService } from '../services/shenmaService';

describe('VEO Model Routing Integration', () => {
  let aiServiceAdapter: MultiProviderAIService;
  let mockShenmaService: jest.Mocked<ShenmaService>;

  beforeEach(() => {
    // Mock ShenmaService
    mockShenmaService = {
      generateVideo: jest.fn(),
      generateVideoViaVeo3: jest.fn(),
    } as any;

    aiServiceAdapter = new MultiProviderAIService();
    (aiServiceAdapter as any).shenmaService = mockShenmaService;
  });

  describe('Model Configuration to Provider Settings', () => {
    it('should correctly convert VEO model selection to provider settings', () => {
      const modelConfig = {
        providers: {
          shenma: {
            apiKey: 'test-key',
            baseUrl: 'https://test-api.com',
            enabled: true
          }
        },
        video: {
          provider: 'shenma' as const,
          modelId: 'veo3.1-pro'
        },
        text: { provider: 'shenma' as const, modelId: 'gpt-4o' },
        image: { provider: 'shenma' as const, modelId: 'nano-banana' },
        _meta: { version: '2.0' as const, lastSaved: Date.now() }
      };

      const settings = getProviderSettings(modelConfig, 'video');

      expect(settings).toEqual({
        provider: 'shenma',
        apiKey: 'test-key',
        baseUrl: 'https://test-api.com',
        modelId: 'veo3.1-pro'
      });

      // Verify VEO model detection
      expect(settings.modelId.includes('veo')).toBe(true);
    });

    it('should handle different VEO model variants', () => {
      const veoModels = [
        'veo3.1-pro',
        'veo3-fast', 
        'veo3-pro',
        'veo2-fast'
      ];

      veoModels.forEach(modelId => {
        const modelConfig = {
          providers: {
            shenma: {
              apiKey: 'test-key',
              baseUrl: 'https://test-api.com',
              enabled: true
            }
          },
          video: {
            provider: 'shenma' as const,
            modelId
          },
          text: { provider: 'shenma' as const, modelId: 'gpt-4o' },
          image: { provider: 'shenma' as const, modelId: 'nano-banana' },
          _meta: { version: '2.0' as const, lastSaved: Date.now() }
        };

        const settings = getProviderSettings(modelConfig, 'video');
        
        expect(settings.modelId).toBe(modelId);
        expect(settings.modelId.includes('veo')).toBe(true);
      });
    });
  });

  describe('AIServiceAdapter VEO Routing', () => {
    it('should pass VEO model to ShenmaService correctly', async () => {
      const settings = {
        provider: 'shenma' as const,
        apiKey: 'test-key',
        baseUrl: 'https://test-api.com',
        modelId: 'veo3.1-pro'
      };

      const contents = {
        parts: [{ text: 'Generate a video of a flying dog' }]
      };

      mockShenmaService.generateVideo.mockResolvedValue('test-video-url');

      await aiServiceAdapter.generateVideo(contents, settings);

      // Verify ShenmaService.generateVideo was called with VEO model
      expect(mockShenmaService.generateVideo).toHaveBeenCalledWith(
        'Generate a video of a flying dog',
        expect.objectContaining({
          model: 'veo3.1-pro'
        })
      );
    });
  });

  describe('ShenmaService VEO Detection', () => {
    it('should detect VEO models and route to VEO3 endpoint', async () => {
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://test-api.com',
        apiKey: 'test-key',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora_video2'
      });

      // Mock the VEO3 method
      const generateVideoViaVeo3Spy = jest.spyOn(shenmaService as any, 'generateVideoViaVeo3')
        .mockResolvedValue({ taskId: 'veo3-task-123' });

      // Mock fetch for the standard endpoint (should not be called)
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ task_id: 'should-not-be-called' })
      } as any);

      const result = await shenmaService.generateVideo('test prompt', {
        model: 'veo3.1-pro',
        aspectRatio: '16:9'
      });

      // Verify VEO3 method was called
      expect(generateVideoViaVeo3Spy).toHaveBeenCalledWith({
        prompt: 'test prompt',
        model: 'veo3.1-pro',
        aspect_ratio: '16:9',
        duration: '10',
        quality: 'standard'
      });

      // Verify standard endpoint was NOT called
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/v2/videos/generations'),
        expect.any(Object)
      );

      expect(result).toEqual({ taskId: 'veo3-task-123' });

      fetchSpy.mockRestore();
      generateVideoViaVeo3Spy.mockRestore();
    });

    it('should NOT route non-VEO models to VEO3 endpoint', async () => {
      const shenmaService = new ShenmaService({
        provider: 'shenma',
        baseUrl: 'https://test-api.com',
        apiKey: 'test-key',
        llmModel: 'gpt-4o',
        imageModel: 'nano-banana',
        videoModel: 'sora_video2'
      });

      // Mock the VEO3 method (should not be called)
      const generateVideoViaVeo3Spy = jest.spyOn(shenmaService as any, 'generateVideoViaVeo3');

      // Mock fetch for the standard endpoint
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ task_id: 'sora-task-123' })
      } as any);

      await shenmaService.generateVideo('test prompt', {
        model: 'sora_video2',
        aspectRatio: '16:9'
      });

      // Verify VEO3 method was NOT called
      expect(generateVideoViaVeo3Spy).not.toHaveBeenCalled();

      // Verify standard endpoint WAS called
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v2/videos/generations'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sora_video2')
        })
      );

      fetchSpy.mockRestore();
      generateVideoViaVeo3Spy.mockRestore();
    });
  });

  describe('End-to-End VEO Routing', () => {
    it('should route VEO model from UI selection to correct API endpoint', async () => {
      // Simulate complete flow from UI to API
      const modelConfig = {
        providers: {
          shenma: {
            apiKey: 'test-key',
            baseUrl: 'https://test-api.com',
            enabled: true
          }
        },
        video: {
          provider: 'shenma' as const,
          modelId: 'veo3.1-pro'
        },
        text: { provider: 'shenma' as const, modelId: 'gpt-4o' },
        image: { provider: 'shenma' as const, modelId: 'nano-banana' },
        _meta: { version: '2.0' as const, lastSaved: Date.now() }
      };

      // Step 1: Convert model config to provider settings
      const settings = getProviderSettings(modelConfig, 'video');
      expect(settings.modelId).toBe('veo3.1-pro');

      // Step 2: AIServiceAdapter should pass model to ShenmaService
      mockShenmaService.generateVideo.mockImplementation(async (prompt, options) => {
        // Verify the model is passed correctly
        expect(options?.model).toBe('veo3.1-pro');
        
        // Simulate VEO detection and routing
        if (options?.model && options.model.includes('veo')) {
          return { taskId: 'veo3-success' };
        } else {
          return 'sora-fallback-url';
        }
      });

      const result = await aiServiceAdapter.generateVideo(
        { parts: [{ text: 'test prompt' }] },
        settings
      );

      expect(mockShenmaService.generateVideo).toHaveBeenCalledWith(
        'test prompt',
        expect.objectContaining({
          model: 'veo3.1-pro'
        })
      );
    });
  });

  describe('Debug Logging Verification', () => {
    it('should log VEO model detection at each step', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const modelConfig = {
        providers: {
          shenma: {
            apiKey: 'test-key',
            baseUrl: 'https://test-api.com',
            enabled: true
          }
        },
        video: {
          provider: 'shenma' as const,
          modelId: 'veo3.1-pro'
        },
        text: { provider: 'shenma' as const, modelId: 'gpt-4o' },
        image: { provider: 'shenma' as const, modelId: 'nano-banana' },
        _meta: { version: '2.0' as const, lastSaved: Date.now() }
      };

      getProviderSettings(modelConfig, 'video');

      // Verify debug logging includes VEO detection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VEO-DEBUG]'),
        expect.objectContaining({
          isVeoModel: true,
          selectedModelId: 'veo3.1-pro'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});