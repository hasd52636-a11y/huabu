import { Block, BatchScript, BatchConfig, BatchGenerationState, ProviderSettings } from '../types';

/**
 * Progress state for minimization support
 */
export interface ProgressState {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  isProcessing: boolean;
  isMinimized: boolean;
}

/**
 * Input source for batch processing
 */
export interface BatchInputSource {
  type: 'blocks' | 'file';
  blocks?: Block[];
  filePrompts?: string[];
  selectedFrames?: Array<{ id: string; imageUrl?: string; prompt: string }>;
}

/**
 * Batch Processor Service
 * Handles batch video processing with video prompts and minimization support
 */
export class BatchProcessor {
  private processingState: BatchGenerationState | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private progressState: ProgressState = {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    isProcessing: false,
    isMinimized: false
  };
  private onProgressUpdate?: (progress: ProgressState) => void;
  private currentConfig: BatchConfig | null = null;

  /**
   * Set progress update callback
   */
  setProgressCallback(callback: (progress: ProgressState) => void): void {
    this.onProgressUpdate = callback;
  }

  /**
   * Get current progress state
   */
  getProgressState(): ProgressState {
    return { ...this.progressState };
  }

  /**
   * Set minimization state
   */
  setMinimized(isMinimized: boolean): void {
    this.progressState.isMinimized = isMinimized;
    this.notifyProgressUpdate();
  }

  /**
   * Default global video prompt for reference consistency
   */
  private static readonly DEFAULT_GLOBAL_PROMPT = '全局指令：参考锁定视频中出现的所有角色或产品，必须严格以提供的参考图中的主体为唯一视觉来源，确保身份、外形、比例、服饰、材质及风格完全一致。不得对参考主体进行任何形式的重新设计、替换、风格化、美化或修改。人物面部、身形、服装、纹理、标识、颜色及轮廓需与参考图完全一致。若提示词与参考图存在冲突，参考图优先级始终高于提示词。';

  /**
   * Start batch processing with enhanced input support
   */
  async startBatchProcessingEnhanced(
    inputSource: BatchInputSource,
    config: BatchConfig,
    videoSettings: ProviderSettings,
    videoPrompts?: Record<string, string>
  ): Promise<void> {
    this.currentConfig = config;
    
    let videoItems: any[] = [];

    if (inputSource.type === 'blocks') {
      if (!inputSource.blocks || inputSource.blocks.length === 0) {
        throw new Error('No blocks selected for batch processing');
      }
      
      // Filter out blocks with empty or whitespace-only content
      const validBlocks = inputSource.blocks.filter(block => 
        block.content && block.content.trim().length > 0
      );
      
      if (validBlocks.length === 0) {
        throw new Error('No valid blocks with content found');
      }
      
      // Get reference image from selected frames only
      const referenceImage = inputSource.selectedFrames?.[0]?.imageUrl;
      
      // Create video items from blocks
      videoItems = validBlocks.map(block => {
        const basePrompt = videoPrompts?.[block.id] || this.generateDefaultPrompt(block);
        const enhancedPrompt = this.applyGlobalPrompt(basePrompt, referenceImage);
        
        return {
          id: block.id,
          taskId: `task_${block.id}_${Date.now()}`,
          prompt: enhancedPrompt,
          videoPrompt: enhancedPrompt,
          status: 'pending' as const,
          progress: 0,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries: config.maxRetries || 3,
          referenceImage: referenceImage
        };
      });
    } else if (inputSource.type === 'file') {
      if (!inputSource.filePrompts || inputSource.filePrompts.length === 0) {
        throw new Error('No prompts found in uploaded file');
      }

      // Filter out empty or whitespace-only prompts
      const validPrompts = inputSource.filePrompts.filter(prompt => 
        prompt && prompt.trim().length >= 5 // Minimum 5 characters for a valid prompt
      );
      
      if (validPrompts.length === 0) {
        throw new Error('No valid prompts found in file');
      }

      // Get reference image from selected frames
      const referenceImage = inputSource.selectedFrames?.[0]?.imageUrl;

      // Create video items from file prompts
      videoItems = validPrompts.map((prompt, index) => {
        const enhancedPrompt = this.applyGlobalPrompt(prompt.trim(), referenceImage);
        
        return {
          id: `file_prompt_${index}`,
          taskId: `task_file_${index}_${Date.now()}`,
          prompt: enhancedPrompt,
          videoPrompt: enhancedPrompt,
          status: 'pending' as const,
          progress: 0,
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries: config.maxRetries || 3,
          referenceImage: referenceImage
        };
      });
    }

    if (videoItems.length === 0) {
      throw new Error('No valid items to process');
    }

    this.processingState = {
      id: `batch_${Date.now()}`,
      items: videoItems,
      total: videoItems.length,
      completed: 0,
      failed: 0,
      pending: videoItems.length,
      status: 'processing',
      startedAt: Date.now()
    };

    // Update progress state
    this.progressState = {
      total: videoItems.length,
      completed: 0,
      failed: 0,
      pending: videoItems.length,
      isProcessing: true,
      isMinimized: false
    };

    this.notifyProgressUpdate();

    // Start processing interval
    this.startProcessingInterval(config, videoSettings);
  }

  /**
   * Apply global prompt to enhance video generation consistency
   */
  private applyGlobalPrompt(basePrompt: string, referenceImage?: string): string {
    if (!referenceImage) {
      return basePrompt;
    }
    
    // Prepend global prompt when reference image is available
    return `${BatchProcessor.DEFAULT_GLOBAL_PROMPT}\n\n${basePrompt}`;
  }

  /**
   * Start batch processing with video prompts (legacy method for backward compatibility)
   */
  async startBatchProcessing(
    blocks: Block[],
    config: BatchConfig,
    videoSettings: ProviderSettings,
    videoPrompts?: Record<string, string>
  ): Promise<void> {
    const inputSource: BatchInputSource = {
      type: 'blocks',
      blocks: blocks
    };
    
    return this.startBatchProcessingEnhanced(inputSource, config, videoSettings, videoPrompts);
  }

  /**
   * Generate default prompt based on block content
   */
  private generateDefaultPrompt(block: Block): string {
    switch (block.type) {
      case 'text':
        return `基于文本内容生成视频：${block.content.substring(0, 100)}...`;
      case 'image':
        return '基于图像内容生成视频，保持视觉风格一致';
      case 'video':
        return '优化和增强现有视频内容';
      default:
        return '生成视频内容';
    }
  }

  /**
   * Start processing interval
   */
  private startProcessingInterval(config: BatchConfig, videoSettings: ProviderSettings): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNextItem(config, videoSettings);
    }, config.processingInterval || 3000);
  }

  /**
   * Process next pending item
   */
  private async processNextItem(config: BatchConfig, videoSettings: ProviderSettings): Promise<void> {
    if (!this.processingState) return;

    const nextItem = this.processingState.items.find(item => item.status === 'pending');
    if (!nextItem) {
      // All items processed
      this.completeProcessing();
      return;
    }

    // Update item status to processing
    nextItem.status = 'generating';
    nextItem.progress = 10;
    this.updateStats();

    try {
      // Apply default global video prompt if configured
      const enhancedPrompt = nextItem.prompt;
      nextItem.prompt = enhancedPrompt;
      
      // Simulate video generation (replace with actual API call)
      await this.simulateVideoGeneration(nextItem, config);
      
      nextItem.status = 'completed';
      nextItem.progress = 100;
      nextItem.completedAt = Date.now();
      nextItem.videoUrl = `https://example.com/video/${nextItem.taskId}.mp4`;
      
      this.processingState.completed++;
      this.processingState.pending--;
      this.progressState.completed++;
      this.progressState.pending--;
    } catch (error) {
      nextItem.status = 'failed';
      nextItem.error = error instanceof Error ? error.message : 'Unknown error';
      nextItem.errorMessage = nextItem.error;
      
      this.processingState.failed++;
      this.processingState.pending--;
      this.progressState.failed++;
      this.progressState.pending--;
    }

    this.updateStats();
    this.notifyProgressUpdate();
  }

  /**
   * Notify progress update
   */
  private notifyProgressUpdate(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...this.progressState });
    }
  }

  /**
   * Simulate video generation (replace with actual API integration)
   */
  private async simulateVideoGeneration(item: any, config: BatchConfig): Promise<void> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Simulated generation failure');
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(): void {
    if (!this.processingState) return;
    
    // Stats are already updated in processNextItem
    // This method can be used for additional stat calculations if needed
  }

  /**
   * Complete processing
   */
  private completeProcessing(): void {
    if (!this.processingState) return;

    this.processingState.status = 'completed';
    this.processingState.completedAt = Date.now();
    this.progressState.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.notifyProgressUpdate();
    
    // Save final state to localStorage
    this.saveProcessingState();
  }

  /**
   * Save processing state to localStorage
   */
  private saveProcessingState(): void {
    if (!this.processingState || !this.currentConfig) return;
    
    try {
      const stateToSave = {
        processingState: this.processingState,
        progressState: this.progressState,
        config: this.currentConfig,
        timestamp: Date.now()
      };
      
      localStorage.setItem('batch_processing_enhanced_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save processing state:', error);
    }
  }

  /**
   * Load processing state from localStorage
   */
  loadProcessingState(): boolean {
    try {
      const saved = localStorage.getItem('batch_processing_enhanced_state');
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      
      // Check if state is recent (within 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem('batch_processing_enhanced_state');
        return false;
      }
      
      this.processingState = state.processingState;
      this.progressState = state.progressState;
      this.currentConfig = state.config;
      
      return true;
    } catch (error) {
      console.error('Failed to load processing state:', error);
      return false;
    }
  }

  /**
   * Clear saved processing state
   */
  clearSavedState(): void {
    try {
      localStorage.removeItem('batch_processing_enhanced_state');
    } catch (error) {
      console.error('Failed to clear saved state:', error);
    }
  }

  /**
   * Pause processing
   */
  pauseProcessing(): void {
    if (!this.processingState) return;
    
    this.processingState.status = 'paused';
    this.progressState.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.notifyProgressUpdate();
    this.saveProcessingState();
  }

  /**
   * Resume processing
   */
  resumeProcessing(): void {
    if (!this.processingState || this.processingState.status !== 'paused') return;
    
    this.processingState.status = 'processing';
    this.progressState.isProcessing = true;
    
    // Use saved config or default config
    const config = this.currentConfig || {
      videoDuration: 10,
      processingInterval: 3000,
      videoOrientation: 'landscape' as const,
      maxRetries: 3,
      retryDelay: 5000,
      enableNotifications: true
    };
    
    const defaultSettings: ProviderSettings = {
      provider: 'google',
      modelId: 'veo-3.1-fast-generate-preview'
    };
    
    this.startProcessingInterval(config, defaultSettings);
    this.notifyProgressUpdate();
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.progressState.isProcessing = false;
    this.processingState = null;
    this.notifyProgressUpdate();
    this.clearSavedState();
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): BatchGenerationState | undefined {
    return this.processingState || undefined;
  }

  /**
   * Update script status (legacy method for compatibility)
   */
  static updateScriptStatus(
    scripts: BatchScript[],
    scriptId: string,
    status: BatchScript['status'],
    progress: number,
    videoUrl?: string,
    error?: string
  ): BatchScript[] {
    return scripts.map(script =>
      script.id === scriptId
        ? {
            ...script,
            status,
            progress,
            videoUrl: videoUrl || script.videoUrl,
            error: error || script.error
          }
        : script
    );
  }

  /**
   * Get next pending script (legacy method for compatibility)
   */
  static getNextPendingScript(scripts: BatchScript[]): BatchScript | undefined {
    return scripts.find(s => s.status === 'pending');
  }

  /**
   * Calculate batch statistics (legacy method for compatibility)
   */
  static calculateStats(scripts: BatchScript[]) {
    return {
      total: scripts.length,
      completed: scripts.filter(s => s.status === 'completed').length,
      failed: scripts.filter(s => s.status === 'failed').length,
      processing: scripts.filter(s => s.status === 'processing').length,
      pending: scripts.filter(s => s.status === 'pending').length
    };
  }

  /**
   * Save batch state to localStorage (legacy method for compatibility)
   */
  static saveBatchState(state: any): void {
    try {
      localStorage.setItem('batch_processing_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save batch state:', error);
    }
  }

  /**
   * Load batch state from localStorage (legacy method for compatibility)
   */
  static loadBatchState(): any {
    try {
      const saved = localStorage.getItem('batch_processing_state');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load batch state:', error);
      return null;
    }
  }

  /**
   * Format error message (legacy method for compatibility)
   */
  static formatErrorMessage(error: string, lang: string): string {
    if (lang === 'zh') {
      if (error.includes('timeout')) return '超时错误';
      if (error.includes('network')) return '网络错误';
      if (error.includes('api')) return 'API 错误';
      return `错误: ${error}`;
    } else {
      if (error.includes('timeout')) return 'Timeout error';
      if (error.includes('network')) return 'Network error';
      if (error.includes('api')) return 'API error';
      return `Error: ${error}`;
    }
  }

  /**
   * Check if should retry (legacy method for compatibility)
   */
  static shouldRetry(script: BatchScript, config: BatchConfig): boolean {
    const retryCount = (script as any).retryCount || 0;
    return retryCount < (config.maxRetries || 3);
  }

  /**
   * Reset script for retry (legacy method for compatibility)
   */
  static resetScriptForRetry(scripts: BatchScript[], scriptId: string): BatchScript[] {
    return scripts.map(script =>
      script.id === scriptId
        ? {
            ...script,
            status: 'pending',
            progress: 0,
            error: undefined,
            retryCount: ((script as any).retryCount || 0) + 1
          }
        : script
    );
  }
}

export default BatchProcessor;