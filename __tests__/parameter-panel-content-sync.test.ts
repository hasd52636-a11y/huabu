/**
 * Parameter Panel Content Sync - Integration Tests
 * 
 * Tests the core functionality of the parameter panel content sync feature
 */

import { contentSyncService } from '../services/ContentSyncService';
import { resultsManagerService } from '../services/ResultsManagerService';
import { thumbnailGenerator } from '../services/ThumbnailGenerator';

describe('Parameter Panel Content Sync', () => {
  beforeEach(() => {
    // Clear any existing state
    localStorage.clear();
    contentSyncService.clearState();
    // Note: resultsManagerService doesn't have clearResults method, 
    // but it will be cleared by localStorage.clear()
  });

  describe('ContentSyncService', () => {
    test('should sync content from chat dialog', () => {
      const testPrompt = 'Generate a beautiful landscape image';
      const testAttachments = {
        image: 'data:image/jpeg;base64,test-image-data'
      };

      contentSyncService.syncFromChatDialog(
        testPrompt,
        testAttachments,
        'image',
        'test-model'
      );

      const state = contentSyncService.getState();
      expect(state.prompt).toBe(testPrompt);
      expect(state.attachments.image).toBe(testAttachments.image);
      expect(state.generationType).toBe('image');
      expect(state.modelId).toBe('test-model');
    });

    test('should sync content to chat dialog', () => {
      const testPrompt = 'Updated prompt from parameter panel';
      const testMetadata = {
        negativePrompt: 'no blur, no distortion'
      };

      contentSyncService.syncToChatDialog(
        testPrompt,
        testMetadata,
        'image',
        'test-model'
      );

      const state = contentSyncService.getState();
      expect(state.prompt).toBe(testPrompt);
      expect(state.source).toBe('parameter-panel');
    });

    test('should notify subscribers of state changes', (done) => {
      const testPrompt = 'Test subscription';
      
      const unsubscribe = contentSyncService.subscribe((state) => {
        expect(state.prompt).toBe(testPrompt);
        unsubscribe();
        done();
      });

      contentSyncService.syncFromChatDialog(testPrompt, {}, 'text', 'test-model');
    });
  });

  describe('ResultsManagerService', () => {
    test('should add and retrieve results', () => {
      const testResult = {
        type: 'image' as const,
        content: 'test-image-url',
        metadata: {
          prompt: 'Test prompt',
          model: 'test-model',
          parameters: { aspectRatio: '16:9' },
          source: 'parameter-panel'
        },
        status: 'completed' as const
      };

      const resultId = resultsManagerService.addResult(testResult);
      expect(resultId).toBeDefined();

      const retrievedResult = resultsManagerService.getResult(resultId);
      expect(retrievedResult).toBeDefined();
      expect(retrievedResult?.content).toBe(testResult.content);
      expect(retrievedResult?.metadata.prompt).toBe(testResult.metadata.prompt);
    });

    test('should update result status', () => {
      const testResult = {
        type: 'image' as const,
        content: '',
        metadata: {
          prompt: 'Test prompt',
          model: 'test-model',
          parameters: {},
          source: 'parameter-panel'
        },
        status: 'generating' as const
      };

      const resultId = resultsManagerService.addResult(testResult);
      
      resultsManagerService.updateResult(resultId, {
        content: 'generated-image-url',
        status: 'completed'
      });

      const updatedResult = resultsManagerService.getResult(resultId);
      expect(updatedResult?.status).toBe('completed');
      expect(updatedResult?.content).toBe('generated-image-url');
    });

    test('should delete results', () => {
      const testResult = {
        type: 'image' as const,
        content: 'test-content',
        metadata: {
          prompt: 'Test',
          model: 'test-model',
          parameters: {},
          source: 'parameter-panel'
        },
        status: 'completed' as const
      };

      const resultId = resultsManagerService.addResult(testResult);
      expect(resultsManagerService.getResult(resultId)).toBeDefined();

      const deleted = resultsManagerService.deleteResult(resultId);
      expect(deleted).toBe(true);
      expect(resultsManagerService.getResult(resultId)).toBeUndefined();
    });

    test('should notify subscribers of results changes', (done) => {
      const testResult = {
        type: 'text' as const,
        content: 'Test content',
        metadata: {
          prompt: 'Test prompt',
          model: 'test-model',
          parameters: {},
          source: 'parameter-panel'
        },
        status: 'completed' as const
      };

      const unsubscribe = resultsManagerService.subscribe((results) => {
        expect(results).toHaveLength(1);
        expect(results[0].content).toBe(testResult.content);
        unsubscribe();
        done();
      });

      resultsManagerService.addResult(testResult);
    });
  });

  describe('ThumbnailGenerator', () => {
    test('should generate image thumbnail', async () => {
      const testImageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';

      const thumbnail = await thumbnailGenerator.generateImageThumbnail(testImageUrl);
      expect(thumbnail).toBeDefined();
      expect(typeof thumbnail).toBe('string');
      expect(thumbnail.startsWith('data:image/')).toBe(true);
    });

    test('should handle thumbnail generation errors gracefully', async () => {
      const invalidImageUrl = 'invalid-image-url';

      await expect(
        thumbnailGenerator.generateImageThumbnail(invalidImageUrl)
      ).rejects.toThrow();
    });
  });

  describe('Integration Workflow', () => {
    test('should complete full workflow from sync to results', async () => {
      // Step 1: Sync content from chat dialog
      const testPrompt = 'Generate a sunset landscape';
      const testAttachments = {};
      
      contentSyncService.syncFromChatDialog(
        testPrompt,
        testAttachments,
        'image',
        'test-model'
      );

      const syncState = contentSyncService.getState();
      expect(syncState.prompt).toBe(testPrompt);

      // Step 2: Create result from synced content
      const result = {
        type: 'image' as const,
        content: 'generated-image-url',
        metadata: {
          prompt: syncState.prompt,
          model: syncState.modelId,
          parameters: { aspectRatio: '16:9' },
          source: 'parameter-panel'
        },
        status: 'completed' as const
      };

      const resultId = resultsManagerService.addResult(result);
      
      // Step 3: Verify result is stored and retrievable
      const storedResult = resultsManagerService.getResult(resultId);
      expect(storedResult).toBeDefined();
      expect(storedResult?.metadata.prompt).toBe(testPrompt);

      // Step 4: Verify results list contains the new result
      const allResults = resultsManagerService.getResults();
      expect(allResults).toHaveLength(1);
      expect(allResults[0].id).toBe(resultId);
    });
  });
});