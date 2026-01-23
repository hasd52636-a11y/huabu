/**
 * Variable Reference Fix Test
 * 
 * Tests that variable references work correctly after content generation.
 * This addresses the issue where variable reference buttons were disabled
 * because the connection engine wasn't updated after content generation.
 */

import { connectionEngine } from '../services/ConnectionEngine';

describe('Variable Reference Fix', () => {
  beforeEach(() => {
    // Clear connection engine cache before each test
    connectionEngine.clearCache();
  });

  test('should update connection engine after content generation', () => {
    const blockId = 'test-block-1';
    const blockNumber = 'A01';
    const blockType = 'text';
    const generatedContent = 'This is generated content for testing';

    // Simulate content generation and connection engine update
    connectionEngine.updateBlockData(blockId, generatedContent, blockType, blockNumber);

    // Verify that the block data is available in the connection engine
    const upstreamData = connectionEngine.getUpstreamData('downstream-block');
    
    // Since we haven't set up connections, upstreamData should be empty
    // But the block data should be cached
    expect(connectionEngine.blockDataCache.has(blockId)).toBe(true);
    
    const cachedData = connectionEngine.blockDataCache.get(blockId);
    expect(cachedData).toBeDefined();
    expect(cachedData?.content).toBe(generatedContent);
    expect(cachedData?.blockNumber).toBe(blockNumber);
    expect(cachedData?.type).toBe(blockType);
  });

  test('should make variable references available after content generation', () => {
    const sourceBlockId = 'source-block';
    const targetBlockId = 'target-block';
    const blockNumber = 'A01';
    const blockType = 'text';
    const generatedContent = 'Source block content';

    // Update block data in connection engine
    connectionEngine.updateBlockData(sourceBlockId, generatedContent, blockType, blockNumber);

    // Set up a connection between blocks
    const connection = {
      id: 'test-connection',
      fromId: sourceBlockId,
      toId: targetBlockId,
      instruction: 'Test connection',
      dataFlow: {
        enabled: true,
        lastUpdate: Date.now(),
        dataType: blockType as any,
        lastData: generatedContent
      }
    };

    connectionEngine.updateConnections([connection]);

    // Get upstream data for the target block
    const upstreamData = connectionEngine.getUpstreamData(targetBlockId);

    // Verify that the upstream data is available
    expect(upstreamData).toHaveLength(1);
    expect(upstreamData[0].content).toBe(generatedContent);
    expect(upstreamData[0].blockNumber).toBe(blockNumber);
    expect(upstreamData[0].type).toBe(blockType);
  });

  test('should handle empty content correctly', () => {
    const blockId = 'empty-block';
    const blockNumber = 'A02';
    const blockType = 'text';
    const emptyContent = '';

    // Update block data with empty content
    connectionEngine.updateBlockData(blockId, emptyContent, blockType, blockNumber);

    const cachedData = connectionEngine.blockDataCache.get(blockId);
    expect(cachedData).toBeDefined();
    expect(cachedData?.content).toBe(emptyContent);
    
    // Empty content should still be cached, but UI should handle it appropriately
  });

  test('should handle different block types', () => {
    const textBlockId = 'text-block';
    const imageBlockId = 'image-block';
    const videoBlockId = 'video-block';

    // Update different types of blocks
    connectionEngine.updateBlockData(textBlockId, 'Text content', 'text', 'A01');
    connectionEngine.updateBlockData(imageBlockId, 'data:image/png;base64,iVBOR...', 'image', 'B01');
    connectionEngine.updateBlockData(videoBlockId, 'https://example.com/video.mp4', 'video', 'V01');

    // Verify all block types are cached correctly
    const textData = connectionEngine.blockDataCache.get(textBlockId);
    const imageData = connectionEngine.blockDataCache.get(imageBlockId);
    const videoData = connectionEngine.blockDataCache.get(videoBlockId);

    expect(textData?.type).toBe('text');
    expect(imageData?.type).toBe('image');
    expect(videoData?.type).toBe('video');

    expect(textData?.blockNumber).toBe('A01');
    expect(imageData?.blockNumber).toBe('B01');
    expect(videoData?.blockNumber).toBe('V01');
  });

  test('should update existing block data when content changes', () => {
    const blockId = 'updating-block';
    const blockNumber = 'A03';
    const blockType = 'text';
    const initialContent = 'Initial content';
    const updatedContent = 'Updated content';

    // Initial update
    connectionEngine.updateBlockData(blockId, initialContent, blockType, blockNumber);
    let cachedData = connectionEngine.blockDataCache.get(blockId);
    expect(cachedData?.content).toBe(initialContent);

    // Update with new content
    connectionEngine.updateBlockData(blockId, updatedContent, blockType, blockNumber);
    cachedData = connectionEngine.blockDataCache.get(blockId);
    expect(cachedData?.content).toBe(updatedContent);
  });
});