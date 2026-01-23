/**
 * 简化的模板加载白屏修复测试
 */

import { templateManager } from '../services/TemplateManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock connectionEngine
jest.mock('../services/ConnectionEngine', () => ({
  connectionEngine: {
    updateConnections: jest.fn(),
  },
}));

describe('Template Loading Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle missing template', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      version: '1.0.0',
      templates: [],
      lastUpdated: new Date().toISOString()
    }));

    await expect(templateManager.loadTemplate('nonexistent')).rejects.toThrow('not found');
  });

  it('should handle corrupted localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('invalid json');
    const templates = await templateManager.listTemplates();
    expect(templates).toEqual([]);
  });

  it('should fix missing connections array', async () => {
    const mockTemplate = {
      id: 'test',
      name: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvasState: {
        blocks: [{ id: 'b1', type: 'text', x: 0, y: 0, width: 100, height: 100 }],
        settings: { zoom: 1, pan: { x: 0, y: 0 } }
      },
      metadata: { blockCount: 1, connectionCount: 0, hasFileInput: false }
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      version: '1.0.0',
      templates: [mockTemplate],
      lastUpdated: new Date().toISOString()
    }));

    const result = await templateManager.loadTemplate('test');
    expect(result.connections).toEqual([]);
  });
});