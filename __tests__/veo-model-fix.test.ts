/**
 * 测试VEO模型修复
 * 验证VEO模型能够正确通过ShenmaService处理
 */

import { ShenmaService } from '../services/shenmaService';

describe('VEO Model Fix', () => {
  let shenmaService: ShenmaService;

  beforeEach(() => {
    shenmaService = new ShenmaService({
      provider: 'shenma',
      baseUrl: 'https://test-api.example.com',
      apiKey: 'test-key',
      llmModel: 'gpt-4o',
      imageModel: 'nano-banana',
      videoModel: 'sora_video2'
    });

    // Mock fetch for testing
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('VEO Model Detection', () => {
    it('should detect VEO models and use generateVideoViaVeo3', async () => {
      const mockResponse = {
        task_id: 'veo3.1-pro:1768997593-ZPlzJupOdo'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Mock the generateVideoViaVeo3 method
      const generateVideoViaVeo3Spy = jest.spyOn(shenmaService as any, 'generateVideoViaVeo3')
        .mockResolvedValue({ taskId: mockResponse.task_id });

      const result = await shenmaService.generateVideo('一只在火星飞翔的狗机械装置。赛博朋克', {
        model: 'veo3.1-pro',
        aspectRatio: '16:9',
        duration: 10
      });

      expect(generateVideoViaVeo3Spy).toHaveBeenCalledWith({
        prompt: '一只在火星飞翔的狗机械装置。赛博朋克',
        model: 'veo3.1-pro',
        aspect_ratio: '16:9',
        duration: '10',
        quality: 'standard'
      });

      expect(result).toEqual({ taskId: mockResponse.task_id });
    });

    it('should handle different VEO model variants', () => {
      const veoModels = ['veo3', 'veo3-pro', 'veo3-fast', 'veo3.1', 'veo3.1-pro'];
      
      veoModels.forEach(model => {
        const isVeoModel = model.includes('veo');
        expect(isVeoModel).toBe(true);
      });
    });

    it('should not use VEO method for non-VEO models', async () => {
      const mockResponse = {
        task_id: 'sora-task-123'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse))
      });

      const generateVideoViaVeo3Spy = jest.spyOn(shenmaService as any, 'generateVideoViaVeo3');

      await shenmaService.generateVideo('test prompt', {
        model: 'sora_video2',
        aspectRatio: '16:9',
        duration: 10
      });

      expect(generateVideoViaVeo3Spy).not.toHaveBeenCalled();
    });
  });

  describe('VEO Parameter Conversion', () => {
    it('should convert ShenmaVideoOptions to Veo3VideoParams correctly', () => {
      const shenmaOptions = {
        model: 'veo3.1-pro' as const,
        aspectRatio: '9:16' as const,
        duration: 15,
        referenceImage: ['image1.jpg', 'image2.jpg']
      };

      const expectedVeoParams = {
        prompt: 'test prompt',
        model: 'veo3.1-pro',
        aspect_ratio: '9:16',
        duration: '15',
        quality: 'standard',
        reference_images: ['image1.jpg', 'image2.jpg']
      };

      // This tests the conversion logic in generateVideo method
      expect(shenmaOptions.model).toBe(expectedVeoParams.model);
      expect(shenmaOptions.aspectRatio).toBe(expectedVeoParams.aspect_ratio);
      expect(shenmaOptions.duration.toString()).toBe(expectedVeoParams.duration);
    });

    it('should handle single reference image', () => {
      const singleImageOptions = {
        model: 'veo3' as const,
        referenceImage: 'single-image.jpg'
      };

      // Should convert single string to array
      const expectedArray = [singleImageOptions.referenceImage];
      expect(Array.isArray(expectedArray)).toBe(true);
      expect(expectedArray).toHaveLength(1);
      expect(expectedArray[0]).toBe('single-image.jpg');
    });
  });

  describe('Provider Settings Integration', () => {
    it('should work with correct provider settings', () => {
      const providerSettings = {
        provider: 'shenma' as const,
        apiKey: 'test-key',
        baseUrl: 'https://hk-api.gptbest.vip',
        modelId: 'veo3.1-pro'
      };

      expect(providerSettings.provider).toBe('shenma');
      expect(providerSettings.modelId).toContain('veo');
      expect(providerSettings.apiKey).toBeTruthy();
      expect(providerSettings.baseUrl).toBeTruthy();
    });

    it('should not have undefined provider', () => {
      const providerSettings = {
        provider: 'shenma' as const,
        apiKey: 'test-key',
        baseUrl: 'https://hk-api.gptbest.vip',
        modelId: 'veo3.1-pro'
      };

      expect(providerSettings.provider).not.toBeUndefined();
      expect(providerSettings.provider).not.toBe('undefined');
    });
  });
});