import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { ShenmaService } from './shenmaService'
import { ExtendedProviderConfig } from '../types'

/**
 * Feature: api-configuration-integration, Property 1: API服务植入完整性
 * 
 * For any planted API service (Shenma, Zhipu), calling any of its functions 
 * (text, image, video generation) should return valid results or clear error messages.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 */
describe('Shenma API Service Integration', () => {
  let mockFetch: any;
  let shenmaService: ShenmaService;
  let mockConfig: ExtendedProviderConfig;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Mock config
    mockConfig = {
      provider: 'shenma',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.shenma.com',
      llmModel: 'gpt-4o',
      imageModel: 'nano-banana',
      videoModel: 'sora_video2'
    }

    shenmaService = new ShenmaService(mockConfig)
  })

  it('should handle text generation requests with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        prompt: fc.string({ minLength: 1, maxLength: 1000 }),
        temperature: fc.option(fc.float({ min: 0, max: 2 })),
        maxTokens: fc.option(fc.integer({ min: 1, max: 4096 })),
        topP: fc.option(fc.float({ min: 0, max: 1 }))
      }),
      async (input) => {
        // Test successful response
        const mockSuccessResponse = {
          choices: [{
            message: {
              content: 'Generated text response'
            }
          }]
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.generateText(input.prompt, {
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          topP: input.topP
        })

        // Should return valid string result
        expect(typeof result).toBe('string')
        expect(result).toBeTruthy()

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Bad Request'
        })

        await expect(shenmaService.generateText(input.prompt)).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle image generation requests with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        prompt: fc.string({ minLength: 1, maxLength: 500 }),
        aspectRatio: fc.option(fc.constantFrom('16:9', '9:16', '1:1', '4:3')),
        style: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
      }),
      async (input) => {
        // Mock successful image generation
        const mockSuccessResponse = {
          data: [{
            url: 'https://example.com/generated-image.jpg'
          }]
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        // Mock urlToBase64 method
        const originalUrlToBase64 = (shenmaService as any).urlToBase64
        ;(shenmaService as any).urlToBase64 = vi.fn().mockResolvedValue('data:image/png;base64,mockbase64data')

        const result = await shenmaService.generateImage(input.prompt, {
          aspectRatio: input.aspectRatio,
          style: input.style
        })

        // Should return valid image data (URL or base64)
        expect(typeof result).toBe('string')
        expect(result).toBeTruthy()
        expect(result.startsWith('data:image/') || result.startsWith('http')).toBe(true)

        // Restore original method
        ;(shenmaService as any).urlToBase64 = originalUrlToBase64

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded'
        })

        await expect(shenmaService.generateImage(input.prompt)).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle video generation requests with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        prompt: fc.string({ minLength: 1, maxLength: 500 }),
        model: fc.option(fc.constantFrom('sora_video2', 'sora_video2-portrait', 'sora_video2-landscape')),
        aspectRatio: fc.option(fc.constantFrom('16:9', '9:16')),
        duration: fc.option(fc.constantFrom(10, 15, 25)),
        hd: fc.option(fc.boolean()),
        watermark: fc.option(fc.boolean())
      }),
      async (input) => {
        // Mock successful video generation
        const mockSuccessResponse = {
          task_id: 'task-12345',
          status: 'SUBMITTED'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.generateVideo(input.prompt, {
          model: input.model,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          hd: input.hd,
          watermark: input.watermark
        })

        // Should return valid task info
        expect(typeof result).toBe('object')
        expect(result.taskId).toBeTruthy()
        expect(result.status).toBeTruthy()
        expect(typeof result.taskId).toBe('string')
        expect(typeof result.status).toBe('string')

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error'
        })

        await expect(shenmaService.generateVideo(input.prompt)).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle image analysis requests with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        imageUrl: fc.webUrl(),
        prompt: fc.string({ minLength: 1, maxLength: 500 }),
        temperature: fc.option(fc.float({ min: 0, max: 2 })),
        maxTokens: fc.option(fc.integer({ min: 1, max: 2048 }))
      }),
      async (input) => {
        // Mock successful image analysis
        const mockSuccessResponse = {
          choices: [{
            message: {
              content: 'Image analysis result'
            }
          }]
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.analyzeImage(input.imageUrl, input.prompt, {
          temperature: input.temperature,
          maxTokens: input.maxTokens
        })

        // Should return valid analysis result
        expect(typeof result).toBe('string')
        expect(result).toBeTruthy()

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Forbidden'
        })

        await expect(shenmaService.analyzeImage(input.imageUrl, input.prompt)).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle video status queries with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }),
      async (taskId) => {
        // Mock successful status query
        const mockSuccessResponse = {
          task_id: taskId,
          status: 'IN_PROGRESS',
          progress: '50%',
          submit_time: Date.now(),
          start_time: Date.now(),
          video_url: null
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.getVideoStatus(taskId)

        // Should return valid status object
        expect(typeof result).toBe('object')
        expect(result.task_id).toBe(taskId)
        expect(result.status).toBeTruthy()
        expect(typeof result.status).toBe('string')
        expect(['NOT_START', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS', 'SUCCESS', 'FAILURE']).toContain(result.status)

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Task not found'
        })

        await expect(shenmaService.getVideoStatus(taskId)).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle connection testing with boolean results', async () => {
    await fc.assert(fc.asyncProperty(
      fc.constant(null), // No input needed for connection test
      async () => {
        // Mock successful connection test
        const mockSuccessResponse = {
          choices: [{
            message: {
              content: 'test response'
            }
          }]
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.testConnection()

        // Should return boolean
        expect(typeof result).toBe('boolean')
        expect(result).toBe(true)

        // Test failed connection
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized'
        })

        const failedResult = await shenmaService.testConnection()
        expect(typeof failedResult).toBe('boolean')
        expect(failedResult).toBe(false)
      }
    ), { numRuns: 100 })
  })

  it('should handle quota queries with valid responses or clear errors', async () => {
    await fc.assert(fc.asyncProperty(
      fc.constant(null), // No input needed for quota query
      async () => {
        // Mock successful quota query
        const mockSuccessResponse = {
          total_quota: 1000,
          used_quota: 250,
          remaining_quota: 750
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse
        })

        const result = await shenmaService.getTokenQuota()

        // Should return valid quota object
        expect(typeof result).toBe('object')
        expect(typeof result.total_quota).toBe('number')
        expect(typeof result.used_quota).toBe('number')
        expect(typeof result.remaining_quota).toBe('number')
        expect(result.total_quota).toBeGreaterThanOrEqual(0)
        expect(result.used_quota).toBeGreaterThanOrEqual(0)
        expect(result.remaining_quota).toBeGreaterThanOrEqual(0)

        // Test error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable'
        })

        await expect(shenmaService.getTokenQuota()).rejects.toThrow('API Error')
      }
    ), { numRuns: 100 })
  })

  it('should handle API key validation and header construction', () => {
    fc.assert(fc.property(
      fc.record({
        apiKey: fc.string({ minLength: 1, maxLength: 100 }),
        baseUrl: fc.webUrl(),
        llmModel: fc.string({ minLength: 1, maxLength: 50 })
      }),
      (config) => {
        const testConfig: ExtendedProviderConfig = {
          provider: 'shenma',
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          llmModel: config.llmModel,
          imageModel: 'nano-banana',
          videoModel: 'sora_video2'
        }

        const service = new ShenmaService(testConfig)

        // Test that service can be created with valid config
        expect(service).toBeInstanceOf(ShenmaService)

        // Test that buildSafeHeaders method works (accessing private method for testing)
        const headers = (service as any).buildSafeHeaders()
        expect(headers).toHaveProperty('Authorization')
        expect(headers).toHaveProperty('Content-Type')
        expect(headers['Authorization']).toContain('Bearer')
        expect(headers['Content-Type']).toBe('application/json')

        return true
      }
    ), { numRuns: 100 })
  })
})