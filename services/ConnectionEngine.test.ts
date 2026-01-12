import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionEngine } from './ConnectionEngine';
import { Connection, Block, BlockType } from '../types';

describe('ConnectionEngine', () => {
  let engine: ConnectionEngine;

  beforeEach(() => {
    engine = new ConnectionEngine();
  });

  describe('Basic functionality', () => {
    it('should enhance a basic connection', () => {
      const connection: Connection = {
        id: 'conn1',
        fromId: 'block1',
        toId: 'block2',
        instruction: 'test instruction'
      };

      const enhanced = engine.enhanceConnection(connection);

      expect(enhanced.id).toBe('conn1');
      expect(enhanced.fromId).toBe('block1');
      expect(enhanced.toId).toBe('block2');
      expect(enhanced.instruction).toBe('test instruction');
      expect(enhanced.dataFlow.enabled).toBe(true);
      expect(enhanced.dataFlow.dataType).toBe('text');
      expect(enhanced.dataFlow.lastUpdate).toBeGreaterThan(0);
    });

    it('should propagate data from source block', () => {
      const connection: Connection = {
        id: 'conn1',
        fromId: 'block1',
        toId: 'block2',
        instruction: 'test'
      };

      engine.enhanceConnection(connection);
      engine.propagateData('block1', 'test content', 'text', 'A01');

      const upstreamData = engine.getUpstreamData('block2');
      expect(upstreamData).toHaveLength(1);
      expect(upstreamData[0].content).toBe('test content');
      expect(upstreamData[0].blockNumber).toBe('A01');
      expect(upstreamData[0].type).toBe('text');
    });

    it('should get available variables for a block', () => {
      const connections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block3', instruction: 'test1' },
        { id: 'conn2', fromId: 'block2', toId: 'block3', instruction: 'test2' }
      ];

      connections.forEach(conn => engine.enhanceConnection(conn));
      engine.propagateData('block1', 'content1', 'text', 'A01');
      engine.propagateData('block2', 'content2', 'image', 'B01');

      const variables = engine.getAvailableVariables('block3');
      expect(variables).toEqual(['A01', 'B01']);
    });
  });

  describe('Validation', () => {
    it('should detect circular dependencies', () => {
      const blocks: Block[] = [
        { id: 'block1', type: 'text', x: 0, y: 0, width: 200, height: 150, content: '', status: 'idle', number: 'A01' },
        { id: 'block2', type: 'text', x: 300, y: 0, width: 200, height: 150, content: '', status: 'idle', number: 'A02' },
        { id: 'block3', type: 'text', x: 600, y: 0, width: 200, height: 150, content: '', status: 'idle', number: 'A03' }
      ];

      const connections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block2', instruction: 'test1' },
        { id: 'conn2', fromId: 'block2', toId: 'block3', instruction: 'test2' },
        { id: 'conn3', fromId: 'block3', toId: 'block1', instruction: 'test3' } // Creates cycle
      ];

      const result = engine.validateDataFlow(connections, blocks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // One error for each block in the cycle
      expect(result.errors[0].type).toBe('circular_dependency');
    });

    it('should detect missing blocks', () => {
      const blocks: Block[] = [
        { id: 'block1', type: 'text', x: 0, y: 0, width: 200, height: 150, content: '', status: 'idle', number: 'A01' }
      ];

      const connections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'missing_block', instruction: 'test' }
      ];

      const result = engine.validateDataFlow(connections, blocks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing_block');
      expect(result.errors[0].message).toContain('missing_block');
    });

    it('should warn about performance issues with many connections', () => {
      const blocks: Block[] = Array.from({ length: 25 }, (_, i) => ({
        id: `block${i}`,
        type: 'text' as BlockType,
        x: i * 100,
        y: 0,
        width: 200,
        height: 150,
        content: '',
        status: 'idle' as const,
        number: `A${String(i).padStart(2, '0')}`
      }));

      const connections: Connection[] = Array.from({ length: 25 }, (_, i) => ({
        id: `conn${i}`,
        fromId: `block${i}`,
        toId: `block${(i + 1) % 25}`,
        instruction: `test${i}`
      }));

      const result = engine.validateDataFlow(connections, blocks);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('performance');
      expect(result.warnings[0].message).toContain('25');
    });
  });

  describe('Property 1: Connection Data Flow Consistency', () => {
    /**
     * Property 1: Connection Data Flow Consistency
     * For any connected modules A and B, when module A's output is updated, 
     * module B should receive the updated data as input within the next execution cycle.
     */
    it('should maintain data flow consistency across multiple updates', () => {
      // Property-based test with multiple scenarios
      const scenarios = [
        { blockType: 'text' as BlockType, content: 'Hello World', blockNumber: 'A01' },
        { blockType: 'image' as BlockType, content: 'data:image/png;base64,abc123', blockNumber: 'B01' },
        { blockType: 'video' as BlockType, content: 'https://example.com/video.mp4', blockNumber: 'V01' },
        { blockType: 'text' as BlockType, content: 'Updated content', blockNumber: 'A02' },
        { blockType: 'text' as BlockType, content: '', blockNumber: 'A03' }, // Empty content
        { blockType: 'text' as BlockType, content: 'Very long content that exceeds normal limits and contains special characters: !@#$%^&*()_+{}|:"<>?[]\\;\',./', blockNumber: 'A04' }
      ];

      scenarios.forEach((scenario, index) => {
        const fromBlockId = `source_${index}`;
        const toBlockId = `target_${index}`;
        const connectionId = `conn_${index}`;

        // Create connection
        const connection: Connection = {
          id: connectionId,
          fromId: fromBlockId,
          toId: toBlockId,
          instruction: `test_${index}`
        };

        engine.enhanceConnection(connection);

        // Initial data propagation
        engine.propagateData(fromBlockId, scenario.content, scenario.blockType, scenario.blockNumber);

        // Verify data is available downstream
        const upstreamData = engine.getUpstreamData(toBlockId);
        expect(upstreamData).toHaveLength(1);
        expect(upstreamData[0].content).toBe(scenario.content);
        expect(upstreamData[0].type).toBe(scenario.blockType);
        expect(upstreamData[0].blockNumber).toBe(scenario.blockNumber);

        // Update data and verify consistency
        const updatedContent = `${scenario.content}_updated`;
        
        // Use a different timestamp to ensure difference
        const originalTimestamp = upstreamData[0].timestamp;
        
        engine.propagateData(fromBlockId, updatedContent, scenario.blockType, scenario.blockNumber);

        const updatedUpstreamData = engine.getUpstreamData(toBlockId);
        expect(updatedUpstreamData).toHaveLength(1);
        expect(updatedUpstreamData[0].content).toBe(updatedContent);
        expect(updatedUpstreamData[0].timestamp).toBeGreaterThanOrEqual(originalTimestamp);

        // Verify enhanced connection reflects the update
        const enhancedConnection = engine.getEnhancedConnection(connectionId);
        expect(enhancedConnection?.dataFlow.lastData).toBe(updatedContent);
        expect(enhancedConnection?.dataFlow.dataType).toBe(scenario.blockType);
      });
    });

    it('should handle multiple upstream connections correctly', () => {
      const targetBlockId = 'target';
      const sourceBlocks = [
        { id: 'source1', content: 'Content 1', type: 'text' as BlockType, number: 'A01' },
        { id: 'source2', content: 'Content 2', type: 'image' as BlockType, number: 'B01' },
        { id: 'source3', content: 'Content 3', type: 'video' as BlockType, number: 'V01' }
      ];

      // Create connections from all sources to target
      sourceBlocks.forEach((source, index) => {
        const connection: Connection = {
          id: `conn_${index}`,
          fromId: source.id,
          toId: targetBlockId,
          instruction: `instruction_${index}`
        };

        engine.enhanceConnection(connection);
        engine.propagateData(source.id, source.content, source.type, source.number);
      });

      // Verify all upstream data is available
      const upstreamData = engine.getUpstreamData(targetBlockId);
      expect(upstreamData).toHaveLength(3);

      // Verify data is sorted by timestamp
      for (let i = 1; i < upstreamData.length; i++) {
        expect(upstreamData[i].timestamp).toBeGreaterThanOrEqual(upstreamData[i - 1].timestamp);
      }

      // Update one source and verify only that data changes
      const updatedContent = 'Updated Content 1';
      engine.propagateData('source1', updatedContent, 'text', 'A01');

      const updatedUpstreamData = engine.getUpstreamData(targetBlockId);
      expect(updatedUpstreamData).toHaveLength(3);
      
      const updatedSource1Data = updatedUpstreamData.find(data => data.blockId === 'source1');
      expect(updatedSource1Data?.content).toBe(updatedContent);

      // Other sources should remain unchanged
      const source2Data = updatedUpstreamData.find(data => data.blockId === 'source2');
      const source3Data = updatedUpstreamData.find(data => data.blockId === 'source3');
      expect(source2Data?.content).toBe('Content 2');
      expect(source3Data?.content).toBe('Content 3');
    });

    it('should maintain consistency across connection updates', () => {
      const connections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block2', instruction: 'original' },
        { id: 'conn2', fromId: 'block2', toId: 'block3', instruction: 'original' }
      ];

      // Initial setup
      engine.updateConnections(connections);
      engine.propagateData('block1', 'initial data', 'text', 'A01');

      // Verify initial state
      let upstreamData = engine.getUpstreamData('block2');
      expect(upstreamData).toHaveLength(1);
      expect(upstreamData[0].content).toBe('initial data');

      // Update connections (simulate connection removal and addition)
      const updatedConnections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block2', instruction: 'updated' },
        { id: 'conn3', fromId: 'block1', toId: 'block4', instruction: 'new' } // New connection
      ];

      engine.updateConnections(updatedConnections);

      // Verify old connection still works
      upstreamData = engine.getUpstreamData('block2');
      expect(upstreamData).toHaveLength(1);
      expect(upstreamData[0].content).toBe('initial data');

      // Verify new connection works
      upstreamData = engine.getUpstreamData('block4');
      expect(upstreamData).toHaveLength(1);
      expect(upstreamData[0].content).toBe('initial data');

      // Verify removed connection no longer provides data
      upstreamData = engine.getUpstreamData('block3');
      expect(upstreamData).toHaveLength(0);
    });
  });

  describe('Cache management', () => {
    it('should clear cache properly', () => {
      const connection: Connection = {
        id: 'conn1',
        fromId: 'block1',
        toId: 'block2',
        instruction: 'test'
      };

      engine.enhanceConnection(connection);
      engine.propagateData('block1', 'test content', 'text', 'A01');

      // Verify data exists
      expect(engine.getUpstreamData('block2')).toHaveLength(1);
      expect(engine.getEnhancedConnection('conn1')).toBeDefined();

      // Clear cache
      engine.clearCache();

      // Verify cache is cleared
      expect(engine.getUpstreamData('block2')).toHaveLength(0);
      expect(engine.getEnhancedConnection('conn1')).toBeUndefined();
    });

    it('should handle connection cache updates correctly', () => {
      const initialConnections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block2', instruction: 'test1' },
        { id: 'conn2', fromId: 'block2', toId: 'block3', instruction: 'test2' }
      ];

      engine.updateConnections(initialConnections);
      expect(engine.getAllEnhancedConnections()).toHaveLength(2);

      // Update with fewer connections
      const updatedConnections: Connection[] = [
        { id: 'conn1', fromId: 'block1', toId: 'block2', instruction: 'updated' }
      ];

      engine.updateConnections(updatedConnections);
      expect(engine.getAllEnhancedConnections()).toHaveLength(1);
      expect(engine.getEnhancedConnection('conn1')?.instruction).toBe('updated');
      expect(engine.getEnhancedConnection('conn2')).toBeUndefined();
    });
  });
});