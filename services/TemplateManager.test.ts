import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from './TemplateManager';
import { CanvasState, Template } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let mockCanvasState: CanvasState;

  beforeEach(() => {
    manager = new TemplateManager();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    
    mockCanvasState = {
      blocks: [
        {
          id: 'block1',
          type: 'text',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle',
          number: 'A01'
        }
      ],
      connections: [
        {
          id: 'conn1',
          fromId: 'block1',
          toId: 'block2',
          instruction: 'test',
          dataFlow: {
            enabled: true,
            lastUpdate: Date.now(),
            dataType: 'text',
            lastData: 'test data'
          }
        }
      ],
      settings: {
        zoom: 1,
        pan: { x: 0, y: 0 }
      }
    };
  });

  describe('Basic functionality', () => {
    it('should save a template', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const template = await manager.saveTemplate(mockCanvasState, 'Test Template', 'Test description');

      expect(template.name).toBe('Test Template');
      expect(template.description).toBe('Test description');
      expect(template.metadata.blockCount).toBe(1);
      expect(template.metadata.connectionCount).toBe(1);
      expect(template.canvasState.blocks).toHaveLength(1);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should load a template', async () => {
      const savedTemplate: Template = {
        id: 'template1',
        name: 'Test Template',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        canvasState: mockCanvasState,
        metadata: {
          blockCount: 1,
          connectionCount: 1,
          hasFileInput: false
        }
      };

      const storage = {
        version: '1.0.0',
        templates: [savedTemplate],
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      const loadedCanvas = await manager.loadTemplate('template1');

      expect(loadedCanvas.blocks).toHaveLength(1);
      expect(loadedCanvas.connections).toHaveLength(1);
      expect(loadedCanvas.settings.zoom).toBe(1);
    });

    it('should list templates', async () => {
      const template1: Template = {
        id: 'template1',
        name: 'Template 1',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        canvasState: mockCanvasState,
        metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
      };

      const template2: Template = {
        id: 'template2',
        name: 'Template 2',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        canvasState: mockCanvasState,
        metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
      };

      const storage = {
        version: '1.0.0',
        templates: [template1, template2],
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      const templates = await manager.listTemplates();

      expect(templates).toHaveLength(2);
      // Should be sorted by updatedAt descending
      expect(templates[0].name).toBe('Template 2');
      expect(templates[1].name).toBe('Template 1');
    });

    it('should delete a template', async () => {
      const template: Template = {
        id: 'template1',
        name: 'Test Template',
        createdAt: new Date(),
        updatedAt: new Date(),
        canvasState: mockCanvasState,
        metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
      };

      const storage = {
        version: '1.0.0',
        templates: [template],
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      await manager.deleteTemplate('template1');

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.templates).toHaveLength(0);
    });

    it('should throw error when loading non-existent template', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        templates: [],
        lastUpdated: new Date()
      }));

      await expect(manager.loadTemplate('nonexistent')).rejects.toThrow('Template with ID nonexistent not found');
    });
  });

  describe('Property 3: Template State Preservation', () => {
    /**
     * Property 3: Template State Preservation
     * For any canvas state saved as a template, loading the template should restore 
     * an equivalent canvas state with identical blocks, connections, and configurations.
     */
    it('should preserve complete canvas state during save/load cycle', async () => {
      // Test various canvas state scenarios
      const testCases = [
        {
          name: 'Simple canvas',
          canvas: {
            blocks: [
              { id: 'b1', type: 'text' as const, x: 0, y: 0, width: 200, height: 150, content: 'Hello', status: 'idle' as const, number: 'A01' }
            ],
            connections: [],
            settings: { zoom: 1, pan: { x: 0, y: 0 } }
          }
        },
        {
          name: 'Complex canvas with connections',
          canvas: {
            blocks: [
              { id: 'b1', type: 'text' as const, x: 0, y: 0, width: 200, height: 150, content: 'Block 1', status: 'idle' as const, number: 'A01' },
              { id: 'b2', type: 'image' as const, x: 300, y: 0, width: 200, height: 150, content: 'data:image/png;base64,abc', status: 'idle' as const, number: 'B01' },
              { id: 'b3', type: 'video' as const, x: 600, y: 0, width: 200, height: 150, content: 'https://example.com/video.mp4', status: 'processing' as const, number: 'V01' }
            ],
            connections: [
              {
                id: 'c1',
                fromId: 'b1',
                toId: 'b2',
                instruction: 'Generate image from text',
                dataFlow: { enabled: true, lastUpdate: 123456, dataType: 'text' as const, lastData: 'test' }
              },
              {
                id: 'c2',
                fromId: 'b2',
                toId: 'b3',
                instruction: 'Create video from image',
                dataFlow: { enabled: true, lastUpdate: 123457, dataType: 'image' as const }
              }
            ],
            settings: { zoom: 1.5, pan: { x: -100, y: 50 } }
          }
        },
        {
          name: 'Canvas with attachments',
          canvas: {
            blocks: [
              { id: 'b1', type: 'text' as const, x: 0, y: 0, width: 200, height: 150, content: 'With attachments', status: 'idle' as const, number: 'A01' }
            ],
            connections: [],
            settings: { zoom: 0.8, pan: { x: 200, y: -100 } },
            attachments: [
              { id: 'att1', name: 'test.txt', type: 'text' as const, content: 'file content', size: 100 }
            ]
          }
        },
        {
          name: 'Empty canvas',
          canvas: {
            blocks: [],
            connections: [],
            settings: { zoom: 1, pan: { x: 0, y: 0 } }
          }
        }
      ];

      localStorageMock.getItem.mockReturnValue(null);

      for (const testCase of testCases) {
        // Save template
        const template = await manager.saveTemplate(testCase.canvas, `Test ${testCase.name}`, `Description for ${testCase.name}`);
        
        // Mock storage to return the saved template
        const storage = {
          version: '1.0.0',
          templates: [template],
          lastUpdated: new Date()
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

        // Load template
        const loadedCanvas = await manager.loadTemplate(template.id);

        // Verify complete state preservation
        expect(loadedCanvas.blocks).toEqual(testCase.canvas.blocks);
        expect(loadedCanvas.connections).toEqual(testCase.canvas.connections);
        expect(loadedCanvas.settings).toEqual(testCase.canvas.settings);
        expect(loadedCanvas.attachments).toEqual(testCase.canvas.attachments);

        // Verify metadata accuracy
        expect(template.metadata.blockCount).toBe(testCase.canvas.blocks.length);
        expect(template.metadata.connectionCount).toBe(testCase.canvas.connections.length);
        expect(template.metadata.hasFileInput).toBe(Boolean(testCase.canvas.attachments?.length));
      }
    });

    it('should handle template mutations without affecting original', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const originalCanvas = {
        blocks: [
          { id: 'b1', type: 'text' as const, x: 0, y: 0, width: 200, height: 150, content: 'Original', status: 'idle' as const, number: 'A01' }
        ],
        connections: [],
        settings: { zoom: 1, pan: { x: 0, y: 0 } }
      };

      // Save template
      const template = await manager.saveTemplate(originalCanvas, 'Mutation Test');

      // Modify original canvas
      originalCanvas.blocks[0].content = 'Modified';
      originalCanvas.settings.zoom = 2;

      // Mock storage
      const storage = {
        version: '1.0.0',
        templates: [template],
        lastUpdated: new Date()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      // Load template
      const loadedCanvas = await manager.loadTemplate(template.id);

      // Template should preserve original state, not modified state
      expect(loadedCanvas.blocks[0].content).toBe('Original');
      expect(loadedCanvas.settings.zoom).toBe(1);
    });

    it('should preserve complex block properties', async () => {
      const complexCanvas = {
        blocks: [
          {
            id: 'b1',
            type: 'text' as const,
            x: 123.45,
            y: 678.90,
            width: 250,
            height: 180,
            content: 'Complex text with\nmultiple lines\nand special chars: !@#$%^&*()',
            status: 'processing' as const,
            number: 'A01',
            fontSize: 24,
            textColor: '#FF5733',
            aspectRatio: '16:9' as const,
            isCropped: true
          }
        ],
        connections: [],
        settings: { zoom: 1.234, pan: { x: -456.78, y: 901.23 } }
      };

      localStorageMock.getItem.mockReturnValue(null);

      const template = await manager.saveTemplate(complexCanvas, 'Complex Properties Test');

      const storage = {
        version: '1.0.0',
        templates: [template],
        lastUpdated: new Date()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      const loadedCanvas = await manager.loadTemplate(template.id);

      // Verify all properties are preserved exactly
      const originalBlock = complexCanvas.blocks[0];
      const loadedBlock = loadedCanvas.blocks[0];

      expect(loadedBlock.x).toBe(originalBlock.x);
      expect(loadedBlock.y).toBe(originalBlock.y);
      expect(loadedBlock.width).toBe(originalBlock.width);
      expect(loadedBlock.height).toBe(originalBlock.height);
      expect(loadedBlock.content).toBe(originalBlock.content);
      expect(loadedBlock.status).toBe(originalBlock.status);
      expect(loadedBlock.fontSize).toBe(originalBlock.fontSize);
      expect(loadedBlock.textColor).toBe(originalBlock.textColor);
      expect(loadedBlock.aspectRatio).toBe(originalBlock.aspectRatio);
      expect(loadedBlock.isCropped).toBe(originalBlock.isCropped);

      expect(loadedCanvas.settings.zoom).toBe(complexCanvas.settings.zoom);
      expect(loadedCanvas.settings.pan).toEqual(complexCanvas.settings.pan);
    });
  });

  describe('Advanced functionality', () => {
    it('should export and import templates', async () => {
      const template: Template = {
        id: 'template1',
        name: 'Export Test',
        description: 'Test export/import',
        createdAt: new Date(),
        updatedAt: new Date(),
        canvasState: mockCanvasState,
        metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
      };

      const storage = {
        version: '1.0.0',
        templates: [template],
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      // Export template
      const exportedData = await manager.exportTemplate('template1');
      const exportedTemplate = JSON.parse(exportedData);

      expect(exportedTemplate.name).toBe('Export Test');
      expect(exportedTemplate.canvasState).toEqual(mockCanvasState);

      // Import template
      const importedTemplate = await manager.importTemplate(exportedData);

      expect(importedTemplate.name).toBe('Export Test');
      expect(importedTemplate.id).not.toBe('template1'); // Should have new ID
      expect(importedTemplate.canvasState).toEqual(mockCanvasState);
    });

    it('should duplicate templates', async () => {
      const originalTemplate: Template = {
        id: 'original',
        name: 'Original Template',
        createdAt: new Date(),
        updatedAt: new Date(),
        canvasState: mockCanvasState,
        metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
      };

      const storage = {
        version: '1.0.0',
        templates: [originalTemplate],
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      const duplicated = await manager.duplicateTemplate('original', 'Duplicated Template');

      expect(duplicated.name).toBe('Duplicated Template');
      expect(duplicated.id).not.toBe('original');
      expect(duplicated.canvasState).toEqual(mockCanvasState);
    });

    it('should search templates', async () => {
      const templates: Template[] = [
        {
          id: 't1',
          name: 'Text Processing Template',
          description: 'Processes text content',
          createdAt: new Date(),
          updatedAt: new Date(),
          canvasState: mockCanvasState,
          metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
        },
        {
          id: 't2',
          name: 'Image Generation',
          description: 'Creates images from text',
          createdAt: new Date(),
          updatedAt: new Date(),
          canvasState: mockCanvasState,
          metadata: { blockCount: 1, connectionCount: 1, hasFileInput: false }
        }
      ];

      const storage = {
        version: '1.0.0',
        templates,
        lastUpdated: new Date()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storage));

      // Search by name
      const textResults = await manager.searchTemplates('text');
      expect(textResults).toHaveLength(2); // Both contain "text"

      // Search by description
      const imageResults = await manager.searchTemplates('image');
      expect(imageResults).toHaveLength(1);
      expect(imageResults[0].name).toBe('Image Generation');

      // Empty search should return all
      const allResults = await manager.searchTemplates('');
      expect(allResults).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted storage gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const templates = await manager.listTemplates();
      expect(templates).toEqual([]);
    });

    it('should validate imported templates', async () => {
      const invalidTemplate = JSON.stringify({ invalid: 'template' });

      await expect(manager.importTemplate(invalidTemplate)).rejects.toThrow('Failed to import template');
    });

    it('should handle storage errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      await expect(manager.saveTemplate(mockCanvasState, 'Test')).rejects.toThrow('Failed to save templates');
    });
  });
});