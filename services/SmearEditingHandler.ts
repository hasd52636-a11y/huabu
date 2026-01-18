/**
 * Smear Editing Handler
 * 
 * Handles smear editing operations including:
 * - Brush stroke capture and processing
 * - Editing state management and history tracking
 * - Integration with ShenmaService editing APIs
 * - Real-time mask generation and preview
 * 
 * Requirements: 2.4 (Smear editing state management)
 */

import { ShenmaService, SmearEditOptions } from './shenmaService';

export interface Point {
  x: number;
  y: number;
}

export interface BrushStroke {
  id: string;
  tool: 'brush' | 'eraser';
  points: Point[];
  brushSize: number;
  timestamp: number;
}

export interface EditState {
  originalImage: string;
  currentMask: string;
  brushHistory: BrushStroke[];
  editInstructions: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EditOperation {
  id: string;
  type: 'brush' | 'erase' | 'process' | 'undo' | 'redo';
  timestamp: number;
  parameters: any;
  result?: string;
  maskData?: string;
}

export interface SmearEditingConfig {
  maxHistorySize: number;
  autoSaveInterval: number;
  enableRealTimePreview: boolean;
  defaultBrushSize: number;
  maxImageSize: number;
}

export class SmearEditingHandler {
  private shenmaService: ShenmaService;
  private config: SmearEditingConfig;
  private editStates: Map<string, EditState> = new Map();
  private operationHistory: Map<string, EditOperation[]> = new Map();
  private activeEditingSessions: Set<string> = new Set();

  constructor(
    shenmaService: ShenmaService,
    config: Partial<SmearEditingConfig> = {}
  ) {
    this.shenmaService = shenmaService;
    this.config = {
      maxHistorySize: 50,
      autoSaveInterval: 30000, // 30 seconds
      enableRealTimePreview: true,
      defaultBrushSize: 20,
      maxImageSize: 2048,
      ...config
    };
  }

  /**
   * Initialize a new smear editing session
   * Requirements: 2.4
   */
  async initializeEditingSession(
    sessionId: string,
    imageUrl: string
  ): Promise<EditState> {
    console.log('[SmearEditingHandler] Initializing editing session:', sessionId);

    // Validate image size
    await this.validateImageSize(imageUrl);

    const editState: EditState = {
      originalImage: imageUrl,
      currentMask: '', // Will be set when first brush stroke is made
      brushHistory: [],
      editInstructions: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Store edit state
    this.editStates.set(sessionId, editState);
    this.operationHistory.set(sessionId, []);
    this.activeEditingSessions.add(sessionId);

    // Log initial operation
    this.logOperation(sessionId, {
      id: `init_${Date.now()}`,
      type: 'process',
      timestamp: Date.now(),
      parameters: { action: 'initialize', imageUrl }
    });

    console.log('[SmearEditingHandler] Editing session initialized:', sessionId);
    return editState;
  }

  /**
   * Add a brush stroke to the editing session
   * Requirements: 2.4
   */
  addBrushStroke(
    sessionId: string,
    stroke: BrushStroke
  ): boolean {
    const editState = this.editStates.get(sessionId);
    if (!editState) {
      console.error('[SmearEditingHandler] Edit state not found:', sessionId);
      return false;
    }

    // Add stroke to history
    editState.brushHistory.push(stroke);
    editState.updatedAt = Date.now();

    // Limit history size
    if (editState.brushHistory.length > this.config.maxHistorySize) {
      editState.brushHistory.shift();
    }

    // Log operation
    this.logOperation(sessionId, {
      id: stroke.id,
      type: stroke.tool === 'brush' ? 'brush' : 'erase',
      timestamp: stroke.timestamp,
      parameters: {
        tool: stroke.tool,
        brushSize: stroke.brushSize,
        pointCount: stroke.points.length
      }
    });

    console.log(`[SmearEditingHandler] Added ${stroke.tool} stroke to session:`, sessionId);
    return true;
  }

  /**
   * Update mask data for the editing session
   * Requirements: 2.4
   */
  updateMask(sessionId: string, maskDataUrl: string): boolean {
    const editState = this.editStates.get(sessionId);
    if (!editState) {
      console.error('[SmearEditingHandler] Edit state not found:', sessionId);
      return false;
    }

    editState.currentMask = maskDataUrl;
    editState.updatedAt = Date.now();

    console.log('[SmearEditingHandler] Mask updated for session:', sessionId);
    return true;
  }

  /**
   * Add editing instructions to the session
   * Requirements: 2.4
   */
  addEditInstructions(
    sessionId: string,
    instructions: string
  ): boolean {
    const editState = this.editStates.get(sessionId);
    if (!editState) {
      console.error('[SmearEditingHandler] Edit state not found:', sessionId);
      return false;
    }

    editState.editInstructions.push(instructions);
    editState.updatedAt = Date.now();

    // Log operation
    this.logOperation(sessionId, {
      id: `instructions_${Date.now()}`,
      type: 'process',
      timestamp: Date.now(),
      parameters: { action: 'add_instructions', instructions }
    });

    console.log('[SmearEditingHandler] Instructions added to session:', sessionId);
    return true;
  }

  /**
   * Process the smear editing with current mask and instructions
   * Requirements: 2.4
   */
  async processSmearEdit(
    sessionId: string,
    options?: SmearEditOptions
  ): Promise<string> {
    const editState = this.editStates.get(sessionId);
    if (!editState) {
      throw new Error(`Edit state not found: ${sessionId}`);
    }

    if (!editState.currentMask) {
      throw new Error('No mask data available for processing');
    }

    if (editState.editInstructions.length === 0) {
      throw new Error('No editing instructions provided');
    }

    console.log('[SmearEditingHandler] Processing smear edit for session:', sessionId);

    try {
      // Get the latest instructions
      const latestInstructions = editState.editInstructions[editState.editInstructions.length - 1];

      // Process through ShenmaService
      const resultImageUrl = await this.shenmaService.processSmearEdit(
        editState.originalImage,
        editState.currentMask,
        latestInstructions,
        options
      );

      // Log successful operation
      this.logOperation(sessionId, {
        id: `process_${Date.now()}`,
        type: 'process',
        timestamp: Date.now(),
        parameters: {
          action: 'smear_edit',
          instructions: latestInstructions,
          options
        },
        result: resultImageUrl,
        maskData: editState.currentMask
      });

      console.log('[SmearEditingHandler] Smear edit processed successfully:', sessionId);
      return resultImageUrl;
    } catch (error) {
      console.error('[SmearEditingHandler] Smear edit processing failed:', error);
      
      // Log failed operation
      this.logOperation(sessionId, {
        id: `process_error_${Date.now()}`,
        type: 'process',
        timestamp: Date.now(),
        parameters: {
          action: 'smear_edit_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Get current edit state for a session
   * Requirements: 2.4
   */
  getEditState(sessionId: string): EditState | null {
    return this.editStates.get(sessionId) || null;
  }

  /**
   * Get operation history for a session
   * Requirements: 2.4
   */
  getOperationHistory(sessionId: string): EditOperation[] {
    return this.operationHistory.get(sessionId) || [];
  }

  /**
   * Save edit state (for persistence)
   * Requirements: 2.4
   */
  saveEditState(sessionId: string): EditState | null {
    const editState = this.editStates.get(sessionId);
    if (!editState) return null;

    // In a real implementation, this would save to localStorage or server
    const serializedState = JSON.stringify(editState);
    localStorage.setItem(`smear_edit_${sessionId}`, serializedState);

    console.log('[SmearEditingHandler] Edit state saved:', sessionId);
    return editState;
  }

  /**
   * Restore edit state (from persistence)
   * Requirements: 2.4
   */
  restoreEditState(sessionId: string): EditState | null {
    try {
      const serializedState = localStorage.getItem(`smear_edit_${sessionId}`);
      if (!serializedState) return null;

      const editState: EditState = JSON.parse(serializedState);
      
      // Validate restored state
      if (!editState.originalImage || !editState.createdAt) {
        console.error('[SmearEditingHandler] Invalid restored state:', sessionId);
        return null;
      }

      // Restore to memory
      this.editStates.set(sessionId, editState);
      this.activeEditingSessions.add(sessionId);

      console.log('[SmearEditingHandler] Edit state restored:', sessionId);
      return editState;
    } catch (error) {
      console.error('[SmearEditingHandler] Failed to restore edit state:', error);
      return null;
    }
  }

  /**
   * Clear edit state and cleanup resources
   * Requirements: 2.4
   */
  clearEditState(sessionId: string): boolean {
    const existed = this.editStates.has(sessionId);
    
    // Remove from memory
    this.editStates.delete(sessionId);
    this.operationHistory.delete(sessionId);
    this.activeEditingSessions.delete(sessionId);

    // Remove from localStorage
    localStorage.removeItem(`smear_edit_${sessionId}`);

    if (existed) {
      console.log('[SmearEditingHandler] Edit state cleared:', sessionId);
    }

    return existed;
  }

  /**
   * Get all active editing sessions
   * Requirements: 2.4
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeEditingSessions);
  }

  /**
   * Undo last operation (if possible)
   * Requirements: 2.4
   */
  undoLastOperation(sessionId: string): boolean {
    const editState = this.editStates.get(sessionId);
    if (!editState) return false;

    // Remove last brush stroke if any
    if (editState.brushHistory.length > 0) {
      const removedStroke = editState.brushHistory.pop();
      editState.updatedAt = Date.now();

      // Log undo operation
      this.logOperation(sessionId, {
        id: `undo_${Date.now()}`,
        type: 'undo',
        timestamp: Date.now(),
        parameters: {
          action: 'undo_stroke',
          removedStrokeId: removedStroke?.id
        }
      });

      console.log('[SmearEditingHandler] Undid last stroke for session:', sessionId);
      return true;
    }

    return false;
  }

  /**
   * Get editing statistics for a session
   * Requirements: 2.4
   */
  getEditingStats(sessionId: string): {
    strokeCount: number;
    instructionCount: number;
    sessionDuration: number;
    lastActivity: number;
  } | null {
    const editState = this.editStates.get(sessionId);
    if (!editState) return null;

    return {
      strokeCount: editState.brushHistory.length,
      instructionCount: editState.editInstructions.length,
      sessionDuration: editState.updatedAt - editState.createdAt,
      lastActivity: editState.updatedAt
    };
  }

  /**
   * Cleanup all sessions and resources
   * Requirements: 2.4
   */
  cleanup(): void {
    console.log('[SmearEditingHandler] Cleaning up all sessions');

    // Clear all sessions
    const sessionIds = Array.from(this.activeEditingSessions);
    sessionIds.forEach(sessionId => this.clearEditState(sessionId));

    console.log('[SmearEditingHandler] Cleanup completed');
  }

  // Private methods

  private async validateImageSize(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const maxSize = this.config.maxImageSize;
        if (img.width > maxSize || img.height > maxSize) {
          reject(new Error(`Image size ${img.width}x${img.height} exceeds maximum ${maxSize}x${maxSize}`));
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

  private logOperation(sessionId: string, operation: EditOperation): void {
    const history = this.operationHistory.get(sessionId) || [];
    history.push(operation);

    // Limit history size
    if (history.length > this.config.maxHistorySize) {
      history.shift();
    }

    this.operationHistory.set(sessionId, history);
  }
}

export default SmearEditingHandler;