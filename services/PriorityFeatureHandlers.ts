/**
 * Priority Feature Handlers
 * 
 * Centralized handlers for the four priority features:
 * 1. Voice Session Management
 * 2. Smear Editing
 * 3. Smear Removal
 * 4. Video Character Replacement
 */

import ShenmaService from './shenmaService';

// Voice Session Handler
export class VoiceSessionHandler {
  private shenmaService: ShenmaService;
  private activeSessions: Map<string, VoiceSession> = new Map();

  constructor(shenmaService: ShenmaService) {
    this.shenmaService = shenmaService;
  }

  async createSession(config: VoiceConfig): Promise<VoiceSession> {
    console.log('[VoiceSessionHandler] Creating voice session');
    
    try {
      const sessionUrl = await this.shenmaService.generateVoiceChatLink(config);
      
      const session: VoiceSession = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        status: 'connecting',
        audioLevel: 0,
        connectionUrl: sessionUrl,
        reconnectAttempts: 0,
        config
      };

      this.activeSessions.set(session.id, session);
      return session;
    } catch (error) {
      console.error('[VoiceSessionHandler] Session creation failed:', error);
      throw error;
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    console.log('[VoiceSessionHandler] Destroying session:', sessionId);
    
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
      this.activeSessions.delete(sessionId);
    }
  }

  getSessionStatus(sessionId: string): VoiceSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  updateSessionStatus(sessionId: string, updates: Partial<VoiceSession>): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  getAllActiveSessions(): VoiceSession[] {
    return Array.from(this.activeSessions.values());
  }
}

// Smear Editing Handler
export class SmearEditingHandler {
  private shenmaService: ShenmaService;
  private editHistory: Map<string, EditState> = new Map();

  constructor(shenmaService: ShenmaService) {
    this.shenmaService = shenmaService;
  }

  async processEditedArea(
    imageFile: File | string,
    mask: string,
    instructions: string,
    options?: EditOptions
  ): Promise<string> {
    console.log('[SmearEditingHandler] Processing edited area');
    
    try {
      const result = await this.shenmaService.processSmearEdit(
        imageFile,
        mask,
        instructions,
        {
          model: options?.model || 'nano-banana',
          guidanceScale: options?.guidanceScale || 7.5,
          steps: options?.steps || 25,
          ...options
        }
      );

      // Save to edit history
      const editId = Date.now().toString();
      this.editHistory.set(editId, {
        originalImage: typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile),
        currentMask: mask,
        brushHistory: [],
        editInstructions: [instructions],
        result
      });

      return result;
    } catch (error) {
      console.error('[SmearEditingHandler] Edit processing failed:', error);
      throw error;
    }
  }

  saveEditState(editId: string, state: EditState): void {
    this.editHistory.set(editId, state);
  }

  restoreEditState(editId: string): EditState | null {
    return this.editHistory.get(editId) || null;
  }

  getEditHistory(): EditState[] {
    return Array.from(this.editHistory.values());
  }

  clearEditHistory(): void {
    this.editHistory.clear();
  }
}

// Smear Removal Handler
export class SmearRemovalHandler {
  private shenmaService: ShenmaService;
  private removalHistory: Map<string, RemovalState> = new Map();

  constructor(shenmaService: ShenmaService) {
    this.shenmaService = shenmaService;
  }

  async processRemoval(
    imageFile: File | string,
    mask: string,
    options?: RemovalOptions
  ): Promise<string> {
    console.log('[SmearRemovalHandler] Processing removal');
    
    try {
      const result = await this.shenmaService.processSmearRemoval(
        imageFile,
        mask,
        {
          batchAreas: options?.batchAreas,
          preserveBackground: options?.preserveBackground !== false
        }
      );

      // Save to removal history
      const removalId = Date.now().toString();
      this.removalHistory.set(removalId, {
        originalImage: typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile),
        maskAreas: [mask],
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('[SmearRemovalHandler] Removal processing failed:', error);
      throw error;
    }
  }

  async processMultipleAreas(
    imageFile: File | string,
    masks: string[]
  ): Promise<string> {
    console.log('[SmearRemovalHandler] Processing multiple removal areas');
    
    try {
      const result = await this.shenmaService.processSmearRemoval(
        imageFile,
        masks[0], // First mask as primary
        {
          batchAreas: masks,
          preserveBackground: true
        }
      );

      // Save to removal history
      const removalId = Date.now().toString();
      this.removalHistory.set(removalId, {
        originalImage: typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile),
        maskAreas: masks,
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('[SmearRemovalHandler] Multiple area removal failed:', error);
      throw error;
    }
  }

  async undoRemoval(removalId: string): Promise<string | null> {
    const state = this.removalHistory.get(removalId);
    if (state) {
      this.removalHistory.delete(removalId);
      return state.originalImage;
    }
    return null;
  }

  getRemovalHistory(): RemovalState[] {
    return Array.from(this.removalHistory.values());
  }
}

// Video Character Replacement Handler
export class VideoCharacterReplaceHandler {
  private shenmaService: ShenmaService;
  private activeTasks: Map<string, CharacterReplaceTask> = new Map();

  constructor(shenmaService: ShenmaService) {
    this.shenmaService = shenmaService;
  }

  async replaceCharacter(params: CharacterReplaceParams): Promise<CharacterReplaceResult> {
    console.log('[VideoCharacterReplaceHandler] Starting character replacement');
    
    try {
      const result = await this.shenmaService.replaceVideoCharacterAdvanced(
        params.videoUrl,
        params.characterImageUrl,
        {
          prompt: params.prompt,
          preserveMotion: params.preserveMotion,
          qualityLevel: params.qualityLevel,
          characterId: params.characterId
        }
      );

      if (result.taskId) {
        // Asynchronous task
        const task: CharacterReplaceTask = {
          id: result.taskId,
          status: 'PENDING',
          progress: 0,
          params,
          createdAt: Date.now()
        };
        
        this.activeTasks.set(result.taskId, task);
        
        return {
          taskId: result.taskId,
          status: 'PENDING',
          progress: 0
        };
      } else if (result.videoUrl) {
        // Synchronous result
        return {
          taskId: '',
          status: 'SUCCEEDED',
          progress: 100,
          videoUrl: result.videoUrl
        };
      }

      throw new Error('No task ID or video URL returned');
    } catch (error) {
      console.error('[VideoCharacterReplaceHandler] Character replacement failed:', error);
      throw error;
    }
  }

  async trackProgress(taskId: string): Promise<ProcessingStatus> {
    console.log('[VideoCharacterReplaceHandler] Tracking progress for task:', taskId);
    
    try {
      const status = await this.shenmaService.trackCharacterReplacementProgress(taskId);
      
      // Update local task status
      const task = this.activeTasks.get(taskId);
      if (task) {
        task.status = status.status;
        task.progress = status.progress || 0;
        if (status.videoUrl) {
          task.resultUrl = status.videoUrl;
        }
        if (status.error) {
          task.error = status.error;
        }
      }

      return {
        taskId,
        status: status.status,
        progress: status.progress || 0,
        videoUrl: status.videoUrl,
        error: status.error,
        estimatedCompletion: task?.createdAt ? task.createdAt + (5 * 60 * 1000) : undefined // 5 min estimate
      };
    } catch (error) {
      console.error('[VideoCharacterReplaceHandler] Progress tracking failed:', error);
      throw error;
    }
  }

  async detectCharacters(videoUrl: string): Promise<DetectedCharacter[]> {
    console.log('[VideoCharacterReplaceHandler] Detecting characters in video');
    
    try {
      const characters = await this.shenmaService.detectVideoCharacters(videoUrl);
      return characters.map(char => ({
        id: char.id,
        boundingBox: char.boundingBox,
        confidence: char.confidence,
        timestamp: char.timestamp
      }));
    } catch (error) {
      console.error('[VideoCharacterReplaceHandler] Character detection failed:', error);
      throw error;
    }
  }

  getActiveTask(taskId: string): CharacterReplaceTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  getAllActiveTasks(): CharacterReplaceTask[] {
    return Array.from(this.activeTasks.values());
  }

  cancelTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = 'FAILED';
      task.error = 'Cancelled by user';
    }
  }
}

// Type Definitions
export interface VoiceConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  language: string;
  instructions?: string;
}

export interface VoiceSession {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  audioLevel: number;
  connectionUrl: string;
  reconnectAttempts: number;
  config: VoiceConfig;
}

export interface EditState {
  originalImage: string;
  currentMask: string;
  brushHistory: BrushStroke[];
  editInstructions: string[];
  result?: string;
}

export interface BrushStroke {
  points: Point[];
  brushSize: number;
  timestamp: number;
  tool: 'brush' | 'eraser';
}

export interface Point {
  x: number;
  y: number;
}

export interface EditOptions {
  model?: string;
  guidanceScale?: number;
  steps?: number;
  seed?: number;
}

export interface RemovalState {
  originalImage: string;
  maskAreas: string[];
  result: string;
  timestamp: number;
}

export interface RemovalOptions {
  batchAreas?: string[];
  preserveBackground?: boolean;
}

export interface CharacterReplaceParams {
  videoUrl: string;
  characterImageUrl: string;
  prompt?: string;
  preserveMotion?: boolean;
  qualityLevel?: 'standard' | 'high';
  characterId?: string;
}

export interface CharacterReplaceResult {
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  videoUrl?: string;
  error?: string;
}

export interface CharacterReplaceTask {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  params: CharacterReplaceParams;
  createdAt: number;
  resultUrl?: string;
  error?: string;
}

export interface ProcessingStatus {
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  videoUrl?: string;
  error?: string;
  estimatedCompletion?: number;
}

export interface DetectedCharacter {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  timestamp: number;
}

// Priority Feature Manager - Centralized management
export class PriorityFeatureManager {
  private voiceHandler: VoiceSessionHandler;
  private smearEditHandler: SmearEditingHandler;
  private smearRemovalHandler: SmearRemovalHandler;
  private videoCharacterHandler: VideoCharacterReplaceHandler;

  constructor(shenmaService: ShenmaService) {
    this.voiceHandler = new VoiceSessionHandler(shenmaService);
    this.smearEditHandler = new SmearEditingHandler(shenmaService);
    this.smearRemovalHandler = new SmearRemovalHandler(shenmaService);
    this.videoCharacterHandler = new VideoCharacterReplaceHandler(shenmaService);
  }

  // Voice feature access
  get voice() {
    return this.voiceHandler;
  }

  // Smear editing access
  get smearEdit() {
    return this.smearEditHandler;
  }

  // Smear removal access
  get smearRemoval() {
    return this.smearRemovalHandler;
  }

  // Video character replacement access
  get videoCharacter() {
    return this.videoCharacterHandler;
  }

  // Provider compatibility check
  isFeatureAvailable(feature: 'voice' | 'smearEdit' | 'smearRemoval' | 'videoCharacter', providerType: string): boolean {
    // Voice features are only available with ShenmaAPI
    if (feature === 'voice') {
      return providerType === 'shenma';
    }
    
    // Other features are available with ShenmaAPI (preferred) but may work with others
    return providerType === 'shenma';
  }

  // Get feature status
  getFeatureStatus(): {
    voice: boolean;
    smearEdit: boolean;
    smearRemoval: boolean;
    videoCharacter: boolean;
  } {
    return {
      voice: this.voiceHandler.getAllActiveSessions().length > 0,
      smearEdit: this.smearEditHandler.getEditHistory().length > 0,
      smearRemoval: this.smearRemovalHandler.getRemovalHistory().length > 0,
      videoCharacter: this.videoCharacterHandler.getAllActiveTasks().length > 0
    };
  }
}

export default PriorityFeatureManager;