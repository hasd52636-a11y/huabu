/**
 * Smear Removal Handler
 * 
 * Handles smear removal operations including:
 * - Removal area detection and processing
 * - AI inpainting integration with Volc API
 * - Undo functionality and state recovery
 * - Batch processing for multiple removal areas
 * 
 * Requirements: 3.3 (AI inpainting and removal processing)
 */

import { ShenmaService, SmearRemovalOptions } from './shenmaService';

export interface Point {
  x: number;
  y: number;
}

export interface RemovalArea {
  id: string;
  name: string;
  maskData: string;
  bounds: { x: number; y: number; width: number; height: number };
  selected: boolean;
  timestamp: number;
  processed?: boolean;
  resultPreview?: string;
}

export interface RemovalState {
  originalImage: string;
  currentImage: string;
  removalAreas: RemovalArea[];
  processedAreas: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RemovalOperation {
  id: string;
  type: 'mark_area' | 'process_removal' | 'batch_process' | 'undo' | 'preview';
  timestamp: number;
  parameters: any;
  result?: string;
  maskData?: string;
  affectedAreas?: string[];
}

export interface SmearRemovalConfig {
  maxHistorySize: number;
  autoSaveInterval: number;
  enablePreview: boolean;
  defaultRemovalOptions: SmearRemovalOptions;
  maxBatchSize: number;
  previewTimeout: number;
}

export class SmearRemovalHandler {
  private shenmaService: ShenmaService;
  private config: SmearRemovalConfig;
  private removalStates: Map<string, RemovalState> = new Map();
  private operationHistory: Map<string, RemovalOperation[]> = new Map();
  private activeRemovalSessions: Set<string> = new Set();
  private previewCache: Map<string, string> = new Map();

  constructor(
    shenmaService: ShenmaService,
    config: Partial<SmearRemovalConfig> = {}
  ) {
    this.shenmaService = shenmaService;
    this.config = {
      maxHistorySize: 50,
      autoSaveInterval: 30000, // 30 seconds
      enablePreview: true,
      defaultRemovalOptions: {
        model: 'byteedit-v2.0',
        inpaintMode: 'smart_fill',
        contextAwareness: true,
        edgeBlending: true,
        quality: 'high'
      },
      maxBatchSize: 10,
      previewTimeout: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Initialize a new smear removal session
   * Requirements: 3.3
   */
  async initializeRemovalSession(
    sessionId: string,
    imageUrl: string
  ): Promise<RemovalState> {
    console.log('[SmearRemovalHandler] Initializing removal session:', sessionId);

    // Validate image
    await this.validateImage(imageUrl);

    const removalState: RemovalState = {
      originalImage: imageUrl,
      currentImage: imageUrl,
      removalAreas: [],
      processedAreas: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Store removal state
    this.removalStates.set(sessionId, removalState);
    this.operationHistory.set(sessionId, []);
    this.activeRemovalSessions.add(sessionId);

    // Log initial operation
    this.logOperation(sessionId, {
      id: `init_${Date.now()}`,
      type: 'mark_area',
      timestamp: Date.now(),
      parameters: { action: 'initialize', imageUrl }
    });

    console.log('[SmearRemovalHandler] Removal session initialized:', sessionId);
    return removalState;
  }

  /**
   * Add a removal area to the session
   * Requirements: 3.3
   */
  addRemovalArea(
    sessionId: string,
    area: Omit<RemovalArea, 'id' | 'timestamp'>
  ): RemovalArea | null {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) {
      console.error('[SmearRemovalHandler] Removal state not found:', sessionId);
      return null;
    }

    const removalArea: RemovalArea = {
      ...area,
      id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // Add area to state
    removalState.removalAreas.push(removalArea);
    removalState.updatedAt = Date.now();

    // Log operation
    this.logOperation(sessionId, {
      id: removalArea.id,
      type: 'mark_area',
      timestamp: removalArea.timestamp,
      parameters: {
        action: 'add_area',
        bounds: removalArea.bounds,
        name: removalArea.name
      },
      maskData: removalArea.maskData
    });

    console.log('[SmearRemovalHandler] Added removal area to session:', sessionId, removalArea.id);
    return removalArea;
  }

  /**
   * Remove a removal area from the session
   * Requirements: 3.3
   */
  removeRemovalArea(sessionId: string, areaId: string): boolean {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) {
      console.error('[SmearRemovalHandler] Removal state not found:', sessionId);
      return false;
    }

    const areaIndex = removalState.removalAreas.findIndex(area => area.id === areaId);
    if (areaIndex === -1) {
      console.error('[SmearRemovalHandler] Removal area not found:', areaId);
      return false;
    }

    // Remove area
    const removedArea = removalState.removalAreas.splice(areaIndex, 1)[0];
    removalState.updatedAt = Date.now();

    // Remove from processed areas if it was processed
    const processedIndex = removalState.processedAreas.indexOf(areaId);
    if (processedIndex !== -1) {
      removalState.processedAreas.splice(processedIndex, 1);
    }

    // Clear preview cache for this area
    this.previewCache.delete(`${sessionId}_${areaId}`);

    // Log operation
    this.logOperation(sessionId, {
      id: `remove_${Date.now()}`,
      type: 'undo',
      timestamp: Date.now(),
      parameters: {
        action: 'remove_area',
        removedAreaId: areaId,
        areaName: removedArea.name
      }
    });

    console.log('[SmearRemovalHandler] Removed removal area:', sessionId, areaId);
    return true;
  }

  /**
   * Preview removal result for specific areas
   * Requirements: 3.3
   */
  async previewRemoval(
    sessionId: string,
    areaIds: string[],
    options?: SmearRemovalOptions
  ): Promise<string> {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) {
      throw new Error(`Removal state not found: ${sessionId}`);
    }

    console.log('[SmearRemovalHandler] Previewing removal for session:', sessionId, areaIds);

    // Generate cache key
    const cacheKey = `${sessionId}_${areaIds.sort().join('_')}`;
    
    // Check cache first
    if (this.previewCache.has(cacheKey)) {
      console.log('[SmearRemovalHandler] Returning cached preview:', cacheKey);
      return this.previewCache.get(cacheKey)!;
    }

    try {
      // Combine masks for selected areas
      const combinedMask = await this.combineRemovalMasks(sessionId, areaIds);
      
      // Process removal preview
      const previewResult = await this.shenmaService.processSmearRemoval(
        removalState.currentImage,
        combinedMask,
        { ...this.config.defaultRemovalOptions, ...options }
      );

      // Cache the result
      this.previewCache.set(cacheKey, previewResult);
      
      // Set cache expiration
      setTimeout(() => {
        this.previewCache.delete(cacheKey);
      }, this.config.previewTimeout);

      // Log operation
      this.logOperation(sessionId, {
        id: `preview_${Date.now()}`,
        type: 'preview',
        timestamp: Date.now(),
        parameters: {
          action: 'preview_removal',
          areaIds,
          options
        },
        result: previewResult,
        maskData: combinedMask
      });

      console.log('[SmearRemovalHandler] Preview generated successfully:', sessionId);
      return previewResult;
    } catch (error) {
      console.error('[SmearRemovalHandler] Preview generation failed:', error);
      throw error;
    }
  }

  /**
   * Process removal for specific areas
   * Requirements: 3.3
   */
  async processRemoval(
    sessionId: string,
    areaIds: string[],
    options?: SmearRemovalOptions
  ): Promise<string> {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) {
      throw new Error(`Removal state not found: ${sessionId}`);
    }

    console.log('[SmearRemovalHandler] Processing removal for session:', sessionId, areaIds);

    try {
      // Combine masks for selected areas
      const combinedMask = await this.combineRemovalMasks(sessionId, areaIds);
      
      // Process removal
      const resultImage = await this.shenmaService.processSmearRemoval(
        removalState.currentImage,
        combinedMask,
        { ...this.config.defaultRemovalOptions, ...options }
      );

      // Update state
      removalState.currentImage = resultImage;
      removalState.processedAreas.push(...areaIds);
      removalState.updatedAt = Date.now();

      // Mark areas as processed
      areaIds.forEach(areaId => {
        const area = removalState.removalAreas.find(a => a.id === areaId);
        if (area) {
          area.processed = true;
          area.resultPreview = resultImage;
        }
      });

      // Log operation
      this.logOperation(sessionId, {
        id: `process_${Date.now()}`,
        type: 'process_removal',
        timestamp: Date.now(),
        parameters: {
          action: 'process_removal',
          areaIds,
          options
        },
        result: resultImage,
        maskData: combinedMask,
        affectedAreas: areaIds
      });

      console.log('[SmearRemovalHandler] Removal processed successfully:', sessionId);
      return resultImage;
    } catch (error) {
      console.error('[SmearRemovalHandler] Removal processing failed:', error);
      
      // Log failed operation
      this.logOperation(sessionId, {
        id: `process_error_${Date.now()}`,
        type: 'process_removal',
        timestamp: Date.now(),
        parameters: {
          action: 'process_removal_failed',
          areaIds,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Process batch removal for multiple areas
   * Requirements: 3.3
   */
  async processBatchRemoval(
    sessionId: string,
    areaIds: string[],
    options?: SmearRemovalOptions
  ): Promise<string> {
    if (areaIds.length > this.config.maxBatchSize) {
      throw new Error(`Batch size ${areaIds.length} exceeds maximum ${this.config.maxBatchSize}`);
    }

    console.log('[SmearRemovalHandler] Processing batch removal:', sessionId, areaIds.length, 'areas');

    // Process all areas in a single operation for consistency
    return this.processRemoval(sessionId, areaIds, options);
  }

  /**
   * Undo last removal operation
   * Requirements: 3.3
   */
  async undoLastRemoval(sessionId: string): Promise<boolean> {
    const removalState = this.removalStates.get(sessionId);
    const history = this.operationHistory.get(sessionId);
    
    if (!removalState || !history) {
      console.error('[SmearRemovalHandler] State or history not found:', sessionId);
      return false;
    }

    // Find last process_removal operation
    const lastProcessOperation = [...history]
      .reverse()
      .find(op => op.type === 'process_removal' && op.result);

    if (!lastProcessOperation || !lastProcessOperation.affectedAreas) {
      console.log('[SmearRemovalHandler] No removal operation to undo:', sessionId);
      return false;
    }

    try {
      // Restore to original image (simple undo - could be enhanced with step-by-step undo)
      removalState.currentImage = removalState.originalImage;
      
      // Mark affected areas as not processed
      lastProcessOperation.affectedAreas.forEach(areaId => {
        const area = removalState.removalAreas.find(a => a.id === areaId);
        if (area) {
          area.processed = false;
          area.resultPreview = undefined;
        }
        
        // Remove from processed areas
        const processedIndex = removalState.processedAreas.indexOf(areaId);
        if (processedIndex !== -1) {
          removalState.processedAreas.splice(processedIndex, 1);
        }
      });

      removalState.updatedAt = Date.now();

      // Log undo operation
      this.logOperation(sessionId, {
        id: `undo_${Date.now()}`,
        type: 'undo',
        timestamp: Date.now(),
        parameters: {
          action: 'undo_removal',
          undoneOperationId: lastProcessOperation.id,
          affectedAreas: lastProcessOperation.affectedAreas
        }
      });

      console.log('[SmearRemovalHandler] Undid last removal operation:', sessionId);
      return true;
    } catch (error) {
      console.error('[SmearRemovalHandler] Undo operation failed:', error);
      return false;
    }
  }

  /**
   * Get current removal state
   * Requirements: 3.3
   */
  getRemovalState(sessionId: string): RemovalState | null {
    return this.removalStates.get(sessionId) || null;
  }

  /**
   * Get operation history
   * Requirements: 3.3
   */
  getOperationHistory(sessionId: string): RemovalOperation[] {
    return this.operationHistory.get(sessionId) || [];
  }

  /**
   * Get removal statistics
   * Requirements: 3.3
   */
  getRemovalStats(sessionId: string): {
    totalAreas: number;
    processedAreas: number;
    pendingAreas: number;
    sessionDuration: number;
    lastActivity: number;
  } | null {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) return null;

    const processedCount = removalState.removalAreas.filter(area => area.processed).length;

    return {
      totalAreas: removalState.removalAreas.length,
      processedAreas: processedCount,
      pendingAreas: removalState.removalAreas.length - processedCount,
      sessionDuration: removalState.updatedAt - removalState.createdAt,
      lastActivity: removalState.updatedAt
    };
  }

  /**
   * Clear removal state and cleanup resources
   * Requirements: 3.3
   */
  clearRemovalState(sessionId: string): boolean {
    const existed = this.removalStates.has(sessionId);
    
    // Remove from memory
    this.removalStates.delete(sessionId);
    this.operationHistory.delete(sessionId);
    this.activeRemovalSessions.delete(sessionId);

    // Clear preview cache for this session
    const cacheKeysToDelete = Array.from(this.previewCache.keys())
      .filter(key => key.startsWith(`${sessionId}_`));
    cacheKeysToDelete.forEach(key => this.previewCache.delete(key));

    if (existed) {
      console.log('[SmearRemovalHandler] Removal state cleared:', sessionId);
    }

    return existed;
  }

  /**
   * Get all active removal sessions
   * Requirements: 3.3
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeRemovalSessions);
  }

  /**
   * Cleanup all sessions and resources
   * Requirements: 3.3
   */
  cleanup(): void {
    console.log('[SmearRemovalHandler] Cleaning up all sessions');

    // Clear all sessions
    const sessionIds = Array.from(this.activeRemovalSessions);
    sessionIds.forEach(sessionId => this.clearRemovalState(sessionId));

    // Clear preview cache
    this.previewCache.clear();

    console.log('[SmearRemovalHandler] Cleanup completed');
  }

  // Private methods

  private async validateImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Basic validation - could be enhanced with size/format checks
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Invalid image dimensions'));
        } else {
          resolve();
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for validation'));
      };
      
      img.src = imageUrl;
    });
  }

  private async combineRemovalMasks(sessionId: string, areaIds: string[]): Promise<string> {
    const removalState = this.removalStates.get(sessionId);
    if (!removalState) {
      throw new Error(`Removal state not found: ${sessionId}`);
    }

    // Get areas to combine
    const areasToProcess = removalState.removalAreas.filter(area => areaIds.includes(area.id));
    
    if (areasToProcess.length === 0) {
      throw new Error('No valid areas found for processing');
    }

    if (areasToProcess.length === 1) {
      return areasToProcess[0].maskData;
    }

    // Create canvas to combine masks
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context for mask combination');
    }

    // Set canvas size (should match image dimensions)
    canvas.width = 800; // Default size - should be determined from image
    canvas.height = 600;

    // Set to black background (no mask)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set blend mode to lighten (white areas will show through)
    ctx.globalCompositeOperation = 'lighten';

    // Draw all area masks
    for (const area of areasToProcess) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load mask for area: ${area.id}`));
        img.src = area.maskData;
      });
    }

    return canvas.toDataURL('image/png');
  }

  private logOperation(sessionId: string, operation: RemovalOperation): void {
    const history = this.operationHistory.get(sessionId) || [];
    history.push(operation);

    // Limit history size
    if (history.length > this.config.maxHistorySize) {
      history.shift();
    }

    this.operationHistory.set(sessionId, history);
  }
}

export default SmearRemovalHandler;