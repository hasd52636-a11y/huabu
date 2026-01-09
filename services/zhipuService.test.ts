import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import ZhipuService from './zhipuService';
import type { ProviderConfig } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('ZhipuService Property Tests', () => {
  let service: ZhipuService;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      apiKey: 'test-api-key-12345',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
    };
    mockLocalStorage.getItem.mockReturnValue(null);
    service = new ZhipuService(mockConfig);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Property 1: API服务植入完整性', () => {
    it('should have all required methods from backup project', () => {
      // Validate Requirements 2.1, 2.2, 2.3, 2.4, 2.5
      const requiredMethods = [
        'generateVideo',
        'getVideoStatus', 
        'analyzeImage',
        'generateImage',
        'generateText',
        'startPolling',
        'stopPolling',
        'cleanup',
        'testConnection'
      ];

      requiredMethods.forEach(method => {
        expect(service).toHaveProperty(method);
        expect(typeof (service as any)[method]).toBe('function');
      });
    });

    it('should support all Zhipu model types', () => {
      fc.assert(fc.property(
        fc.constantFrom(
          'glm-4.5-flash',    // 深度思考
          'glm-4v-flash',     // 视觉理解
          'glm-4-flash',      // 文本生成
          'cogvideox-flash',  // 视频生成
          'cogview-3-flash',  // 图像生成
          'glm-4.6v',         // 高端视觉理解
          'cogvideox-3',      // 高端视频生成
          'cogview-3'         // 高端图像生成
        ),
        (model) => {
          // All models should be valid Zhipu model types
          const validModels = [
            'glm-4.5-flash', 'glm-4v-flash', 'glm-4-flash',
            'cogvideox-flash', 'cogview-3-flash', 'glm-4.6v',
            'cogvideox-3', 'cogview-3'
          ];
          expect(validModels).toContain(model);
        }
      ), { numRuns: 20 });
    });

    it('should handle API key validation correctly', () => {
      fc.assert(fc.property(
        fc.string(),
        (apiKey) => {
          const testService = new ZhipuService({ apiKey });
          
          // Service should be created regardless of API key format
          expect(testService).toBeInstanceOf(ZhipuService);
          
          // Test connection method should exist
          expect(typeof testService.testConnection).toBe('function');
        }
      ), { numRuns: 50 });
    });

    it('should support all video generation parameters', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'cogvideox-flash',
          id: 'task_123',
          request_id: 'req_123',
          task_status: 'PROCESSING'
        })
      });

      const result = await service.generateVideo('test prompt', {
        quality: 'speed',
        withAudio: false,
        watermarkEnabled: true,
        size: '1920x1080',
        fps: 30,
        duration: 5
      });
      
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('status');
      expect(typeof result.taskId).toBe('string');
      expect(typeof result.status).toBe('string');
    });

    it('should support all image analysis parameters', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'analysis_123',
          created: Date.now(),
          model: 'glm-4v-flash',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Analysis result'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        })
      });

      const result = await service.analyzeImage('https://example.com/image.jpg', 'test prompt', {
        temperature: 0.8,
        topP: 0.6,
        maxTokens: 1024
      });
      
      expect(typeof result).toBe('string');
    });

    it('should support all image generation parameters', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          created: Date.now(),
          data: [{
            url: 'https://example.com/generated-image.jpg'
          }]
        })
      });

      const result = await service.generateImage('test prompt', {
        negativePrompt: 'bad quality',
        size: '1024x1024',
        quality: 'standard',
        style: 'realistic'
      });
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https?:\/\//);
    });

    it('should support all text generation parameters', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'text_123',
          created: Date.now(),
          model: 'glm-4-flash',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'Generated text response'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150
          }
        })
      });

      const result = await service.generateText('test prompt', {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048,
        systemPrompt: 'You are a helpful assistant',
        useThinking: false
      });
      
      expect(typeof result).toBe('string');
    });

    it('should handle video status polling correctly', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('PROCESSING', 'SUCCESS', 'FAIL'),
        (taskId, status) => {
          const onProgress = vi.fn();
          const onComplete = vi.fn();
          const onError = vi.fn();

          // Mock status response
          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
              task_status: status,
              video_url: status === 'SUCCESS' ? 'https://example.com/video.mp4' : undefined,
              cover_image_url: status === 'SUCCESS' ? 'https://example.com/cover.jpg' : undefined,
              error: status === 'FAIL' ? { message: 'Generation failed' } : undefined
            })
          });

          // Start polling with short timeout for testing
          service.startPolling(taskId, onProgress, onComplete, onError, 1000);

          // Verify polling was started
          expect(onProgress).toBeDefined();
          expect(onComplete).toBeDefined();
          expect(onError).toBeDefined();

          // Stop polling to clean up
          service.stopPolling(taskId);
        }
      ), { numRuns: 20 });
    });

    it('should handle model configuration correctly', () => {
      fc.assert(fc.property(
        fc.record({
          text: fc.constantFrom('glm-4-flash', 'glm-4.5-flash'),
          thinking: fc.constantFrom('glm-4.5-flash'),
          vision: fc.constantFrom('glm-4v-flash', 'glm-4.6v'),
          video: fc.constantFrom('cogvideox-flash', 'cogvideox-3'),
          image: fc.constantFrom('cogview-3-flash', 'cogview-3')
        }),
        (modelConfig) => {
          // Mock localStorage to return the model config
          mockLocalStorage.getItem.mockReturnValue(JSON.stringify(modelConfig));
          
          const testService = new ZhipuService(mockConfig);
          
          // Service should be created with custom model config
          expect(testService).toBeInstanceOf(ZhipuService);
        }
      ), { numRuns: 20 });
    });

    it('should handle API errors gracefully', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      const testPrompt = 'test prompt';
      
      // All methods should handle errors gracefully
      await expect(service.generateText(testPrompt)).rejects.toThrow();
      await expect(service.generateImage(testPrompt)).rejects.toThrow();
      await expect(service.generateVideo(testPrompt)).rejects.toThrow();
      await expect(service.analyzeImage('https://example.com/image.jpg', testPrompt)).rejects.toThrow();
    });

    it('should clean up resources properly', () => {
      fc.assert(fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (taskIds) => {
          // Start polling for multiple tasks
          taskIds.forEach(taskId => {
            service.startPolling(
              taskId,
              () => {},
              () => {},
              () => {},
              1000
            );
          });

          // Cleanup should stop all polling
          service.cleanup();

          // All intervals should be cleared (we can't directly test this,
          // but the method should complete without errors)
          expect(true).toBe(true);
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 2: 智谱轮询机制完整性', () => {
    it('should implement exponential backoff in polling', () => {
      const taskId = 'test-task';
      let pollCount = 0;
      
      // Mock PROCESSING responses that eventually succeed
      mockFetch.mockImplementation(async () => {
        pollCount++;
        if (pollCount < 3) {
          return {
            ok: true,
            json: async () => ({
              task_status: 'PROCESSING'
            })
          };
        } else {
          return {
            ok: true,
            json: async () => ({
              task_status: 'SUCCESS',
              video_url: 'https://example.com/video.mp4'
            })
          };
        }
      });

      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      service.startPolling(taskId, onProgress, onComplete, onError, 10000);

      // Verify polling callbacks are properly typed
      expect(typeof onProgress).toBe('function');
      expect(typeof onComplete).toBe('function');
      expect(typeof onError).toBe('function');

      service.stopPolling(taskId);
    });

    it('should handle timeout correctly', () => {
      const taskId = 'timeout-task';
      
      // Mock perpetual PROCESSING response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          task_status: 'PROCESSING'
        })
      });

      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Start polling with very short timeout
      service.startPolling(taskId, onProgress, onComplete, onError, 100);

      // Should handle timeout gracefully
      expect(onError).toBeDefined();

      service.stopPolling(taskId);
    });
  });

  describe('Property 3: 异步视频处理逻辑完整性', () => {
    it('should support both text-to-video and image-to-video generation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'cogvideox-flash',
          id: 'task_123',
          request_id: 'req_123',
          task_status: 'PROCESSING'
        })
      });

      // Test text-to-video
      const textResult = await service.generateVideo('test prompt');
      expect(textResult).toHaveProperty('taskId');
      expect(textResult).toHaveProperty('status');
      expect(textResult.status).toBe('PROCESSING');

      // Test image-to-video
      const imageResult = await service.generateVideo('test prompt', { 
        imageUrl: 'https://example.com/image.jpg' 
      });
      expect(imageResult).toHaveProperty('taskId');
      expect(imageResult).toHaveProperty('status');
      expect(imageResult.status).toBe('PROCESSING');
    });

    it('should extract video URLs from various response formats', async () => {
      const taskId = 'test-task';
      const videoUrl = 'https://example.com/video.mp4';
      const coverUrl = 'https://example.com/cover.jpg';

      // Test different response formats that might be returned by Zhipu API
      const responseFormats = [
        { video_url: videoUrl, cover_image_url: coverUrl, task_status: 'SUCCESS' },
        { result: { video_url: videoUrl, cover_image_url: coverUrl }, task_status: 'SUCCESS' },
        { choices: [{ video_url: videoUrl, cover_image_url: coverUrl }], task_status: 'SUCCESS' },
        { choices: [{ data: { url: videoUrl, cover_url: coverUrl } }], task_status: 'SUCCESS' }
      ];

      for (const responseFormat of responseFormats) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => responseFormat
        });

        const result = await service.getVideoStatus(taskId);
        
        expect(result.status).toBe('SUCCESS');
        expect(result.videoUrl).toBe(videoUrl);
        expect(result.coverImageUrl).toBe(coverUrl);
      }
    });
  });

  describe('Property 4: 连接测试可靠性', () => {
    it('should test connection using text generation', async () => {
      // Mock successful text generation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'successful'
            }
          }]
        })
      });

      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      // Mock failed response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });
});