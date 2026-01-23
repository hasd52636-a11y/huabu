import { Template, CanvasState, TemplateStorage, Block, Connection, EnhancedConnection, AutomationConfig } from '../types';
import { connectionEngine } from './ConnectionEngine';

/**
 * TemplateManager handles saving, loading, and managing workflow templates.
 * Templates preserve complete canvas state including blocks, connections, and settings.
 */
export class TemplateManager {
  private static readonly STORAGE_KEY = 'automation_templates';
  private static readonly VERSION = '1.0.0';

  /**
   * Saves current canvas state as a template with automation support
   */
  async saveTemplate(
    canvas: CanvasState, 
    name: string, 
    description?: string, 
    isAutomation?: boolean,
    finalOutputModules?: string[]
  ): Promise<Template> {
    // For automation templates, clear only generated output but keep prompts and configurations
    const canvasStateToSave = isAutomation ? {
      ...canvas,
      blocks: canvas.blocks.map(block => ({
        ...block,
        content: '', // Clear generated output content
        // Keep originalPrompt, block type, position, size, and all configurations
        // This ensures users don't need to re-enter prompts when opening the template
      }))
    } : canvas;

    const template: Template = {
      id: this.generateId(),
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      canvasState: this.cloneCanvasState(canvasStateToSave),
      metadata: {
        blockCount: canvas.blocks.length,
        connectionCount: canvas.connections.length,
        hasFileInput: canvas.attachments ? canvas.attachments.length > 0 : false,
        finalOutputModules: isAutomation ? finalOutputModules : undefined // 添加到元数据中用于UI显示
      },
      // Automation template fields
      isAutomation: isAutomation || false,
      automationConfig: isAutomation ? {
        mode: 'standard',
        pauseOnError: true,
        enableSmartInterval: true,
        finalOutputModules: finalOutputModules || [] // 保存最终输出模块列表
      } : undefined
    };

    const storage = this.getStorage();
    storage.templates.push(template);
    storage.lastUpdated = new Date();
    this.saveStorage(storage);

    return template;
  }

  /**
   * Loads a template and returns its canvas state
   */
  async loadTemplate(templateId: string): Promise<CanvasState> {
    try {
      console.log('[TemplateManager] Loading template:', templateId);
      
      const storage = this.getStorage();
      const template = storage.templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      console.log('[TemplateManager] Template found:', {
        name: template.name,
        isAutomation: template.isAutomation,
        blocksCount: template.canvasState?.blocks?.length,
        connectionsCount: template.canvasState?.connections?.length
      });

      // Validate template structure before processing
      this.validateTemplateStructure(template);

      // Clone the canvas state to avoid mutations
      const canvasState = this.cloneCanvasState(template.canvasState);
      
      // Ensure connections array exists and is properly formatted
      if (!canvasState.connections) {
        canvasState.connections = [];
      }
      
      // Ensure connections are properly formatted for EnhancedConnection
      canvasState.connections = canvasState.connections.map((conn, index) => {
        try {
          // If connection already has dataFlow, keep it; otherwise add default
          if ('dataFlow' in conn && conn.dataFlow) {
            return conn as EnhancedConnection;
          } else {
            console.log('[TemplateManager] Adding dataFlow to connection:', index);
            return {
              ...conn,
              dataFlow: {
                enabled: true,
                lastUpdate: 0,
                dataType: 'text',
                lastData: ''
              }
            } as EnhancedConnection;
          }
        } catch (error) {
          console.error('[TemplateManager] Error processing connection:', index, error);
          // Return a safe default connection
          return {
            id: conn.id || `conn_${index}`,
            fromId: conn.fromId || '',
            toId: conn.toId || '',
            instruction: conn.instruction || '',
            dataFlow: {
              enabled: true,
              lastUpdate: 0,
              dataType: 'text',
              lastData: ''
            }
          } as EnhancedConnection;
        }
      });
      
      // Validate blocks array
      if (!canvasState.blocks || !Array.isArray(canvasState.blocks)) {
        console.warn('[TemplateManager] Invalid blocks array, initializing empty array');
        canvasState.blocks = [];
      }
      
      // Validate settings
      if (!canvasState.settings) {
        console.warn('[TemplateManager] Missing settings, using defaults');
        canvasState.settings = {
          zoom: 1,
          pan: { x: 0, y: 0 }
        };
      }
      
      // Update connection engine with loaded connections
      try {
        connectionEngine.updateConnections(canvasState.connections);
        console.log('[TemplateManager] Connection engine updated successfully');
      } catch (error) {
        console.error('[TemplateManager] Failed to update connection engine:', error);
        // Continue loading even if connection engine update fails
      }
      
      console.log('[TemplateManager] Template loaded successfully:', {
        blocksCount: canvasState.blocks.length,
        connectionsCount: canvasState.connections.length,
        zoom: canvasState.settings.zoom,
        pan: canvasState.settings.pan
      });
      
      return canvasState;
    } catch (error) {
      console.error('[TemplateManager] Failed to load template:', templateId, error);
      throw new Error(`Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available templates
   */
  async listTemplates(): Promise<Template[]> {
    try {
      const storage = this.getStorage();
      
      // Temporarily disable default template initialization to fix white screen issue
      // This prevents potential conflicts with malformed default templates
      // TODO: Re-enable after fixing template structure validation
      // if (storage.templates.length === 0) {
      //   await this.initializeDefaultTemplates();
      //   // Reload storage after initialization
      //   return this.listTemplates();
      // }
      
      console.log('[TemplateManager] Listing templates:', {
        count: storage.templates.length,
        templates: storage.templates.map(t => ({ id: t.id, name: t.name, isAutomation: t.isAutomation }))
      });
      
      return [...storage.templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('[TemplateManager] Failed to list templates:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Initializes default automation templates if none exist
   */
  private async initializeDefaultTemplates(): Promise<void> {
    const storage = this.getStorage();
    
    // Skip if templates already exist
    if (storage.templates.length > 0) {
      return;
    }

    console.log('[TemplateManager] Initializing default automation templates...');
    
    // Define default templates - 保留最有用的3个模板
    const defaultTemplates = [
      {
        "name": "文本转单图（画布显示）",
        "description": "从文本提示生成单张图片，结果显示在画布上。适合简单的图像生成任务。",
        "canvasState": {
          "blocks": [
            {
              "id": "text_prompt_block",
              "type": "text",
              "x": 100,
              "y": 100,
              "width": 300,
              "height": 150,
              "content": "一只可爱的柴犬在草地上奔跑，阳光明媚，高清细节",
              "status": "idle",
              "number": "A01",
              "fontSize": 14,
              "textColor": "#333333",
              "originalPrompt": "生成一只可爱的柴犬图片"
            },
            {
              "id": "image_output_block",
              "type": "image",
              "x": 500,
              "y": 100,
              "width": 400,
              "height": 400,
              "content": "",
              "status": "idle",
              "number": "B01",
              "aspectRatio": "1:1",
              "originalPrompt": ""
            }
          ],
          "connections": [
            {
              "id": "text_to_image_conn",
              "fromId": "text_prompt_block",
              "toId": "image_output_block",
              "instruction": "根据文本提示生成图片",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            }
          ],
          "settings": {
            "zoom": 1,
            "pan": { "x": 0, "y": 0 }
          }
        },
        "isAutomation": true
      },
      {
        "name": "文本链式生成（最终图像）",
        "description": "先从创意生成详细大纲，再根据大纲生成图像。适合需要结构化内容生成的场景。",
        "canvasState": {
          "blocks": [
            {
              "id": "story_idea_block",
              "type": "text",
              "x": 100,
              "y": 100,
              "width": 300,
              "height": 180,
              "content": "科幻冒险故事：宇航员在未知星球发现神秘文明遗迹",
              "status": "idle",
              "number": "A01",
              "fontSize": 14,
              "textColor": "#333333",
              "originalPrompt": "科幻冒险故事创意"
            },
            {
              "id": "story_outline_block",
              "type": "text",
              "x": 100,
              "y": 350,
              "width": 350,
              "height": 200,
              "content": "",
              "status": "idle",
              "number": "B01",
              "fontSize": 12,
              "textColor": "#333333",
              "originalPrompt": ""
            },
            {
              "id": "story_image_block",
              "type": "image",
              "x": 550,
              "y": 100,
              "width": 450,
              "height": 300,
              "content": "",
              "status": "idle",
              "number": "C01",
              "aspectRatio": "16:9",
              "originalPrompt": ""
            }
          ],
          "connections": [
            {
              "id": "idea_to_outline_conn",
              "fromId": "story_idea_block",
              "toId": "story_outline_block",
              "instruction": "根据故事创意生成详细大纲",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            },
            {
              "id": "outline_to_image_conn",
              "fromId": "story_outline_block",
              "toId": "story_image_block",
              "instruction": "根据故事大纲生成场景图像",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            }
          ],
          "settings": {
            "zoom": 1,
            "pan": { "x": 0, "y": 0 }
          }
        },
        "isAutomation": true
      },
      {
        "name": "多模块拼接（含视频）",
        "description": "文本生成故事大纲，图像生成封面图，最终生成视频。完整的多媒体内容生成流程。",
        "canvasState": {
          "blocks": [
            {
              "id": "story_idea_block",
              "type": "text",
              "x": 100,
              "y": 100,
              "width": 300,
              "height": 180,
              "content": "科幻冒险故事：宇航员在未知星球发现神秘文明遗迹",
              "status": "idle",
              "number": "A01",
              "fontSize": 14,
              "textColor": "#333333",
              "originalPrompt": "科幻冒险故事创意"
            },
            {
              "id": "story_outline_block",
              "type": "text",
              "x": 100,
              "y": 350,
              "width": 350,
              "height": 200,
              "content": "",
              "status": "idle",
              "number": "B01",
              "fontSize": 12,
              "textColor": "#333333",
              "originalPrompt": ""
            },
            {
              "id": "cover_image_block",
              "type": "image",
              "x": 550,
              "y": 100,
              "width": 400,
              "height": 400,
              "content": "",
              "status": "idle",
              "number": "C01",
              "aspectRatio": "1:1",
              "originalPrompt": ""
            },
            {
              "id": "video_output_block",
              "type": "video",
              "x": 1050,
              "y": 100,
              "width": 500,
              "height": 300,
              "content": "",
              "status": "idle",
              "number": "D01",
              "aspectRatio": "16:9",
              "duration": "15",
              "originalPrompt": ""
            }
          ],
          "connections": [
            {
              "id": "idea_to_outline_conn",
              "fromId": "story_idea_block",
              "toId": "story_outline_block",
              "instruction": "根据故事创意生成详细大纲",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            },
            {
              "id": "outline_to_cover_conn",
              "fromId": "story_outline_block",
              "toId": "cover_image_block",
              "instruction": "根据故事大纲生成封面图片",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            },
            {
              "id": "outline_to_video_conn",
              "fromId": "story_outline_block",
              "toId": "video_output_block",
              "instruction": "根据故事大纲生成视频",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "text",
                "lastData": ""
              }
            },
            {
              "id": "cover_to_video_conn",
              "fromId": "cover_image_block",
              "toId": "video_output_block",
              "instruction": "使用封面图片作为视频的参考图像",
              "dataFlow": {
                "enabled": true,
                "lastUpdate": 0,
                "dataType": "image",
                "lastData": ""
              }
            }
          ],
          "settings": {
            "zoom": 1,
            "pan": { "x": 0, "y": 0 }
          }
        },
        "isAutomation": true
      }
    ];

    try {
      for (const templateData of defaultTemplates) {
        await this.saveTemplate(
          templateData.canvasState,
          templateData.name,
          templateData.description,
          templateData.isAutomation
        );
      }
      console.log('[TemplateManager] ✓ Initialized', defaultTemplates.length, 'default automation templates');
    } catch (error) {
      console.error('[TemplateManager] Failed to initialize default templates:', error);
    }
  }

  /**
   * Deletes a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const storage = this.getStorage();
    const index = storage.templates.findIndex(t => t.id === templateId);
    
    if (index === -1) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    storage.templates.splice(index, 1);
    storage.lastUpdated = new Date();
    this.saveStorage(storage);
  }

  /**
   * Updates an existing template with automation support
   */
  async updateTemplate(templateId: string, updates: Partial<Pick<Template, 'name' | 'description' | 'canvasState' | 'isAutomation' | 'automationConfig'>>): Promise<Template> {
    const storage = this.getStorage();
    const template = storage.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    if (updates.name !== undefined) {
      template.name = updates.name.trim();
    }
    
    if (updates.description !== undefined) {
      template.description = updates.description?.trim();
    }
    
    if (updates.canvasState) {
      template.canvasState = this.cloneCanvasState(updates.canvasState);
      template.metadata = {
        blockCount: updates.canvasState.blocks.length,
        connectionCount: updates.canvasState.connections.length,
        hasFileInput: updates.canvasState.attachments ? updates.canvasState.attachments.length > 0 : false
      };
    }

    if (updates.isAutomation !== undefined) {
      template.isAutomation = updates.isAutomation;
    }

    if (updates.automationConfig !== undefined) {
      template.automationConfig = updates.automationConfig;
    }

    template.updatedAt = new Date();
    storage.lastUpdated = new Date();
    this.saveStorage(storage);

    return template;
  }

  /**
   * Exports a template as JSON string
   */
  async exportTemplate(templateId: string): Promise<string> {
    const storage = this.getStorage();
    const template = storage.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Imports a template from JSON string
   */
  async importTemplate(templateData: string): Promise<Template> {
    try {
      const importedTemplate = JSON.parse(templateData) as Template;
      
      // Validate template structure
      this.validateTemplate(importedTemplate);
      
      // Generate new ID and update timestamps
      const template: Template = {
        ...importedTemplate,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const storage = this.getStorage();
      storage.templates.push(template);
      storage.lastUpdated = new Date();
      this.saveStorage(storage);

      return template;
    } catch (error) {
      throw new Error(`Failed to import template: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Duplicates an existing template
   */
  async duplicateTemplate(templateId: string, newName?: string): Promise<Template> {
    const storage = this.getStorage();
    const originalTemplate = storage.templates.find(t => t.id === templateId);
    
    if (!originalTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const duplicatedTemplate: Template = {
      ...originalTemplate,
      id: this.generateId(),
      name: newName || `${originalTemplate.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      canvasState: this.cloneCanvasState(originalTemplate.canvasState)
    };

    storage.templates.push(duplicatedTemplate);
    storage.lastUpdated = new Date();
    this.saveStorage(storage);

    return duplicatedTemplate;
  }

  /**
   * Searches templates by name or description
   */
  async searchTemplates(query: string): Promise<Template[]> {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      return this.listTemplates();
    }

    // Ensure default templates are initialized before searching
    const allTemplates = await this.listTemplates();
    const storage = this.getStorage();
    
    return storage.templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      (template.description && template.description.toLowerCase().includes(searchTerm))
    ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Gets template statistics including automation templates
   */
  async getTemplateStats(): Promise<{ 
    total: number; 
    totalBlocks: number; 
    totalConnections: number;
    automationTemplates: number;
    regularTemplates: number;
  }> {
    // Ensure default templates are initialized
    await this.listTemplates();
    
    const storage = this.getStorage();
    const automationCount = storage.templates.filter(t => t.isAutomation).length;
    return {
      total: storage.templates.length,
      totalBlocks: storage.templates.reduce((sum, t) => sum + t.metadata.blockCount, 0),
      totalConnections: storage.templates.reduce((sum, t) => sum + t.metadata.connectionCount, 0),
      automationTemplates: automationCount,
      regularTemplates: storage.templates.length - automationCount
    };
  }

  /**
   * Lists automation templates only
   */
  async listAutomationTemplates(): Promise<Template[]> {
    // Get all templates without initializing defaults
    const storage = this.getStorage();
    return storage.templates
      .filter(t => t.isAutomation)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Lists regular templates only
   */
  async listRegularTemplates(): Promise<Template[]> {
    // Ensure default templates are initialized
    await this.listTemplates();
    
    const storage = this.getStorage();
    return storage.templates
      .filter(t => !t.isAutomation)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Clears all templates (with confirmation)
   */
  async clearAllTemplates(): Promise<void> {
    const storage: TemplateStorage = {
      version: TemplateManager.VERSION,
      templates: [],
      lastUpdated: new Date()
    };
    this.saveStorage(storage);
  }

  // Private helper methods

  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStorage(): TemplateStorage {
    try {
      const stored = localStorage.getItem(TemplateManager.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate parsed data structure
        if (!parsed || typeof parsed !== 'object') {
          console.warn('[TemplateManager] Invalid storage data, using defaults');
          return this.getDefaultStorage();
        }
        
        if (!parsed.templates || !Array.isArray(parsed.templates)) {
          console.warn('[TemplateManager] Invalid templates array, using defaults');
          return this.getDefaultStorage();
        }
        
        // Convert date strings back to Date objects
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        parsed.templates.forEach((template: any) => {
          try {
            template.createdAt = new Date(template.createdAt);
            template.updatedAt = new Date(template.updatedAt);
          } catch (dateError) {
            console.warn('[TemplateManager] Invalid date in template:', template.id, dateError);
            // Use current date as fallback
            template.createdAt = new Date();
            template.updatedAt = new Date();
          }
        });
        
        console.log('[TemplateManager] Storage loaded successfully:', {
          version: parsed.version,
          templateCount: parsed.templates.length,
          lastUpdated: parsed.lastUpdated
        });
        
        return parsed;
      }
    } catch (error) {
      console.error('[TemplateManager] Failed to load template storage:', error);
      
      // Try to clear corrupted storage
      try {
        localStorage.removeItem(TemplateManager.STORAGE_KEY);
        console.log('[TemplateManager] Cleared corrupted storage');
      } catch (clearError) {
        console.error('[TemplateManager] Failed to clear corrupted storage:', clearError);
      }
    }

    // Return default storage
    return this.getDefaultStorage();
  }

  private getDefaultStorage(): TemplateStorage {
    return {
      version: TemplateManager.VERSION,
      templates: [],
      lastUpdated: new Date()
    };
  }

  private saveStorage(storage: TemplateStorage): void {
    try {
      localStorage.setItem(TemplateManager.STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
      throw new Error(`Failed to save templates: ${error instanceof Error ? error.message : 'Storage error'}`);
    }
  }

  private cloneCanvasState(canvas: CanvasState): CanvasState {
    return {
      blocks: canvas.blocks.map(block => ({ ...block })),
      connections: canvas.connections.map(conn => ({ ...conn })),
      settings: {
        zoom: canvas.settings.zoom,
        pan: { ...canvas.settings.pan }
      },
      attachments: canvas.attachments ? canvas.attachments.map(att => ({ ...att })) : undefined
    };
  }

  private validateTemplate(template: any): void {
    if (!template || typeof template !== 'object') {
      throw new Error('Invalid template format');
    }

    const required = ['id', 'name', 'createdAt', 'updatedAt', 'canvasState', 'metadata'];
    for (const field of required) {
      if (!(field in template)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!template.canvasState.blocks || !Array.isArray(template.canvasState.blocks)) {
      throw new Error('Invalid canvas state: blocks must be an array');
    }

    if (!template.canvasState.connections || !Array.isArray(template.canvasState.connections)) {
      throw new Error('Invalid canvas state: connections must be an array');
    }

    if (!template.canvasState.settings || typeof template.canvasState.settings !== 'object') {
      throw new Error('Invalid canvas state: settings must be an object');
    }
  }

  /**
   * Validates template structure for loading
   */
  private validateTemplateStructure(template: Template): void {
    if (!template) {
      throw new Error('Template is null or undefined');
    }

    if (!template.canvasState) {
      throw new Error('Template missing canvas state');
    }

    if (!template.canvasState.blocks) {
      console.warn('[TemplateManager] Template missing blocks array, will initialize empty array');
    }

    if (!template.canvasState.connections) {
      console.warn('[TemplateManager] Template missing connections array, will initialize empty array');
    }

    if (!template.canvasState.settings) {
      console.warn('[TemplateManager] Template missing settings, will use defaults');
    }

    // Validate each block has required properties
    if (template.canvasState.blocks) {
      template.canvasState.blocks.forEach((block, index) => {
        if (!block.id) {
          throw new Error(`Block at index ${index} missing id`);
        }
        if (!block.type) {
          throw new Error(`Block at index ${index} missing type`);
        }
        if (typeof block.x !== 'number' || typeof block.y !== 'number') {
          throw new Error(`Block at index ${index} has invalid position`);
        }
      });
    }

    // Validate each connection has required properties
    if (template.canvasState.connections) {
      template.canvasState.connections.forEach((conn, index) => {
        if (!conn.id) {
          throw new Error(`Connection at index ${index} missing id`);
        }
        if (!conn.fromId || !conn.toId) {
          throw new Error(`Connection at index ${index} missing fromId or toId`);
        }
      });
    }
  }

  /**
   * Records automation template verification result
   */
  async recordVerificationResult(templateId: string, result: {
    success: boolean;
    timestamp: number;
    verificationLog: string[];
    error?: string;
  }): Promise<void> {
    const storage = this.getStorage();
    const template = storage.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Add verification result to template metadata
    if (!template.metadata.verificationHistory) {
      template.metadata.verificationHistory = [];
    }

    template.metadata.verificationHistory.push({
      ...result,
      id: this.generateId()
    });

    template.updatedAt = new Date();
    storage.lastUpdated = new Date();
    this.saveStorage(storage);
  }

  /**
   * Gets verification history for a template
   */
  async getVerificationHistory(templateId: string): Promise<any[]> {
    const storage = this.getStorage();
    const template = storage.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    return template.metadata.verificationHistory || [];
  }
}

// Singleton instance for global use
export const templateManager = new TemplateManager();