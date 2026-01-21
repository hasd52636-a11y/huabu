/**
 * Model Availability Service
 * 
 * Checks and monitors model availability against Shenma API
 */

import {
  ModelAvailabilityService as IModelAvailabilityService,
  ModelCheckRequest,
  ModelAvailabilityResult,
  ModelAvailabilityError,
  ModelAvailabilityStatus,
  GenerationType
} from '../types/ModelConfigurationTypes';

/**
 * Model Availability Service implementation
 */
export class ModelAvailabilityService implements IModelAvailabilityService {
  private cache: Map<string, ModelAvailabilityResult> = new Map();
  private subscribers: Set<(modelId: string, result: ModelAvailabilityResult) => void> = new Set();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Check single model availability
   */
  async checkModelAvailability(request: ModelCheckRequest): Promise<ModelAvailabilityResult> {
    const { modelId, generationType, timeout = this.DEFAULT_TIMEOUT, retryCount = 3 } = request;
    const cacheKey = this.getCacheKey(modelId, generationType);

    // Check cache first
    const cached = this.getCachedAvailability(modelId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const startTime = Date.now();
    let lastError: ModelAvailabilityError | undefined;

    // Retry logic
    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const result = await this.performAvailabilityCheck(modelId, generationType, timeout);
        
        // Cache successful result
        this.cache.set(cacheKey, result);
        
        // Notify subscribers
        this.notifySubscribers(modelId, result);
        
        return result;
      } catch (error) {
        lastError = this.createAvailabilityError(error, attempt < retryCount - 1);
        
        if (attempt < retryCount - 1) {
          // Wait before retry with exponential backoff
          await this.delay(Math.min(1000 * Math.pow(2, attempt), 5000));
        }
      }
    }

    // All retries failed
    const failedResult: ModelAvailabilityResult = {
      modelId,
      isAvailable: false,
      status: 'error',
      lastChecked: Date.now(),
      error: lastError,
      responseTime: Date.now() - startTime,
      provider: 'shenma'
    };

    // Cache failed result for shorter duration
    this.cache.set(cacheKey, failedResult);
    this.notifySubscribers(modelId, failedResult);
    
    return failedResult;
  }

  /**
   * Check multiple models
   */
  async checkBatchAvailability(requests: ModelCheckRequest[]): Promise<ModelAvailabilityResult[]> {
    // Process requests in parallel with concurrency limit
    const BATCH_SIZE = 5;
    const results: ModelAvailabilityResult[] = [];

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(request => this.checkModelAvailability(request));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get cached availability
   */
  getCachedAvailability(modelId: string): ModelAvailabilityResult | null {
    // Try to find in cache with any generation type
    for (const [key, result] of this.cache.entries()) {
      if (key.includes(modelId)) {
        return result;
      }
    }
    return null;
  }

  /**
   * Refresh availability
   */
  async refreshAvailability(modelId?: string): Promise<void> {
    if (modelId) {
      // Refresh specific model
      const generationTypes: GenerationType[] = ['text', 'image', 'video'];
      
      for (const genType of generationTypes) {
        const cacheKey = this.getCacheKey(modelId, genType);
        if (this.cache.has(cacheKey)) {
          // Remove from cache to force refresh
          this.cache.delete(cacheKey);
          
          // Check availability
          await this.checkModelAvailability({
            modelId,
            generationType: genType,
            priority: 'normal'
          });
        }
      }
    } else {
      // Refresh all cached models
      const keysToRefresh = Array.from(this.cache.keys());
      this.cache.clear();
      
      for (const key of keysToRefresh) {
        const [genType, id] = key.split(':');
        await this.checkModelAvailability({
          modelId: id,
          generationType: genType as GenerationType,
          priority: 'low'
        });
      }
    }
  }

  /**
   * Subscribe to availability changes
   */
  subscribeToAvailabilityChanges(
    callback: (modelId: string, result: ModelAvailabilityResult) => void
  ): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Perform actual availability check
   */
  private async performAvailabilityCheck(
    modelId: string,
    generationType: GenerationType,
    timeout: number
  ): Promise<ModelAvailabilityResult> {
    const startTime = Date.now();

    try {
      // Create a test request based on generation type
      const testRequest = this.createTestRequest(modelId, generationType);
      
      // Make API call with timeout
      const response = await this.makeApiCall(testRequest, timeout);
      
      const responseTime = Date.now() - startTime;
      
      // Analyze response to determine availability
      const isAvailable = this.analyzeResponse(response, generationType);
      
      return {
        modelId,
        isAvailable,
        status: isAvailable ? 'available' : 'unavailable',
        lastChecked: Date.now(),
        responseTime,
        provider: 'shenma',
        metadata: {
          testType: 'api_call',
          generationType,
          responseStatus: response.status
        }
      };
    } catch (error) {
      throw error; // Let the caller handle retries
    }
  }

  /**
   * Create test request for model
   */
  private createTestRequest(modelId: string, generationType: GenerationType): any {
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SHENMA_API_KEY || 'test-key'}`
    };

    switch (generationType) {
      case 'text':
        return {
          url: '/v1/chat/completions',
          method: 'POST',
          headers: baseHeaders,
          body: {
            model: modelId,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          }
        };

      case 'image':
        return {
          url: '/v1/chat/completions',
          method: 'POST',
          headers: baseHeaders,
          body: {
            model: modelId,
            messages: [{ role: 'user', content: 'test image' }]
          }
        };

      case 'video':
        // For video models, use the v2 API
        return {
          url: '/v2/videos/generations',
          method: 'POST',
          headers: baseHeaders,
          body: {
            model: modelId,
            prompt: 'test video'
          }
        };

      default:
        throw new Error(`Unsupported generation type: ${generationType}`);
    }
  }

  /**
   * Make API call with timeout
   */
  private async makeApiCall(request: any, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => ({}))
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Analyze API response to determine availability
   */
  private analyzeResponse(response: any, generationType: GenerationType): boolean {
    // Check for successful response codes
    if (response.status >= 200 && response.status < 300) {
      return true;
    }

    // Check for specific error codes that indicate model availability issues
    if (response.status === 404) {
      return false; // Model not found
    }

    if (response.status === 400) {
      // Check error message for model-specific issues
      const errorMessage = response.data?.error?.message || '';
      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        return false;
      }
      if (errorMessage.includes('unsupported')) {
        return false;
      }
    }

    // For other errors (auth, rate limit, etc.), assume model is available but temporarily inaccessible
    return true;
  }

  /**
   * Create availability error
   */
  private createAvailabilityError(error: any, retryable: boolean): ModelAvailabilityError {
    if (error.name === 'AbortError') {
      return {
        type: 'network_error',
        message: 'Request timeout',
        retryable: true
      };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        type: 'endpoint_unreachable',
        message: 'Cannot reach API endpoint',
        retryable: true
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        type: 'api_key_missing',
        message: 'Authentication failed',
        retryable: false
      };
    }

    if (error.status === 429) {
      return {
        type: 'quota_exceeded',
        message: 'Rate limit exceeded',
        retryable: true
      };
    }

    if (error.status === 404) {
      return {
        type: 'model_not_found',
        message: 'Model not found',
        retryable: false
      };
    }

    return {
      type: 'network_error',
      message: error.message || 'Unknown error',
      details: error,
      retryable
    };
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(result: ModelAvailabilityResult): boolean {
    const age = Date.now() - result.lastChecked;
    
    // Use shorter cache duration for failed results
    const maxAge = result.isAvailable ? this.CACHE_DURATION : this.CACHE_DURATION / 2;
    
    return age < maxAge;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(modelId: string, generationType: GenerationType): string {
    return `${generationType}:${modelId}`;
  }

  /**
   * Notify subscribers of availability changes
   */
  private notifySubscribers(modelId: string, result: ModelAvailabilityResult): void {
    this.subscribers.forEach(callback => {
      try {
        callback(modelId, result);
      } catch (error) {
        console.error('[ModelAvailabilityService] Subscriber callback error:', error);
      }
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get availability statistics
   */
  getAvailabilityStatistics(): {
    totalChecked: number;
    available: number;
    unavailable: number;
    errors: number;
    cacheHitRate: number;
  } {
    const results = Array.from(this.cache.values());
    const available = results.filter(r => r.isAvailable).length;
    const unavailable = results.filter(r => !r.isAvailable && !r.error).length;
    const errors = results.filter(r => r.error).length;

    return {
      totalChecked: results.length,
      available,
      unavailable,
      errors,
      cacheHitRate: results.length > 0 ? (available + unavailable) / results.length : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all cached results
   */
  getAllCachedResults(): ModelAvailabilityResult[] {
    return Array.from(this.cache.values());
  }
}

/**
 * Global model availability service instance
 */
export const modelAvailabilityService = new ModelAvailabilityService();