import { Template, CanvasState, TemplateStorage, Block, Connection, EnhancedConnection } from '../types';
import { connectionEngine } from './ConnectionEngine';

/**
 * TemplateManager handles saving, loading, and managing workflow templates.
 * Templates preserve complete canvas state including blocks, connections, and settings.
 */
export class TemplateManager {
  private static readonly STORAGE_KEY = 'automation_templates';
  private static readonly VERSION = '1.0.0';

  /**
   * Saves current canvas state as a template
   */
  async saveTemplate(canvas: CanvasState, name: string, description?: string): Promise<Template> {
    const template: Template = {
      id: this.generateId(),
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      canvasState: this.cloneCanvasState(canvas),
      metadata: {
        blockCount: canvas.blocks.length,
        connectionCount: canvas.connections.length,
        hasFileInput: canvas.attachments ? canvas.attachments.length > 0 : false
      }
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
    const storage = this.getStorage();
    const template = storage.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Clone the canvas state to avoid mutations
    const canvasState = this.cloneCanvasState(template.canvasState);
    
    // Update connection engine with loaded connections
    connectionEngine.updateConnections(canvasState.connections);
    
    return canvasState;
  }

  /**
   * Lists all available templates
   */
  async listTemplates(): Promise<Template[]> {
    const storage = this.getStorage();
    return [...storage.templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
   * Updates an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<Pick<Template, 'name' | 'description' | 'canvasState'>>): Promise<Template> {
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
    const storage = this.getStorage();
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      return this.listTemplates();
    }

    return storage.templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      (template.description && template.description.toLowerCase().includes(searchTerm))
    ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Gets template statistics
   */
  getTemplateStats(): { total: number; totalBlocks: number; totalConnections: number } {
    const storage = this.getStorage();
    return {
      total: storage.templates.length,
      totalBlocks: storage.templates.reduce((sum, t) => sum + t.metadata.blockCount, 0),
      totalConnections: storage.templates.reduce((sum, t) => sum + t.metadata.connectionCount, 0)
    };
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
        // Convert date strings back to Date objects
        parsed.lastUpdated = new Date(parsed.lastUpdated);
        parsed.templates.forEach((template: any) => {
          template.createdAt = new Date(template.createdAt);
          template.updatedAt = new Date(template.updatedAt);
        });
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load template storage:', error);
    }

    // Return default storage
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
}

// Singleton instance for global use
export const templateManager = new TemplateManager();