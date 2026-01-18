import { Connection, EnhancedConnection, Block, BlockData, ValidationResult, ValidationError, ValidationWarning, BlockType } from '../types';

/**
 * ConnectionEngine handles data flow between connected blocks in the automation system.
 * It extends the existing connection system with data propagation capabilities.
 */
export class ConnectionEngine {
  private blockDataCache: Map<string, BlockData> = new Map();
  private connectionCache: Map<string, EnhancedConnection> = new Map();

  /**
   * Enhances a basic connection with data flow capabilities
   */
  enhanceConnection(connection: Connection): EnhancedConnection {
    const cached = this.connectionCache.get(connection.id);
    if (cached && cached.instruction === connection.instruction) {
      return cached;
    }

    const enhanced: EnhancedConnection = {
      ...connection,
      dataFlow: {
        enabled: true,
        lastUpdate: Date.now(),
        dataType: 'text', // Default to text, will be updated based on source block
        lastData: undefined
      }
    };

    this.connectionCache.set(connection.id, enhanced);
    return enhanced;
  }

  /**
   * Propagates data from a source block to all connected downstream blocks
   */
  propagateData(fromBlockId: string, data: string, blockType: BlockType, blockNumber: string): void {
    const blockData: BlockData = {
      blockId: fromBlockId,
      blockNumber,
      content: data,
      type: blockType,
      timestamp: Date.now()
    };

    // Update cache
    this.blockDataCache.set(fromBlockId, blockData);

    // Update all connections from this block
    for (const [connectionId, connection] of this.connectionCache.entries()) {
      if (connection.fromId === fromBlockId) {
        connection.dataFlow.lastUpdate = Date.now();
        connection.dataFlow.dataType = blockType;
        connection.dataFlow.lastData = data;
      }
    }
  }

  /**
   * Gets all upstream data for a specific block
   */
  getUpstreamData(blockId: string): BlockData[] {
    const upstreamData: BlockData[] = [];

    for (const connection of this.connectionCache.values()) {
      if (connection.toId === blockId && connection.dataFlow.enabled) {
        const sourceData = this.blockDataCache.get(connection.fromId);
        if (sourceData) {
          upstreamData.push(sourceData);
        }
      }
    }

    // Sort by timestamp to maintain order
    return upstreamData.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Gets upstream data with content summaries for display
   */
  getUpstreamDataWithSummaries(blockId: string): Array<BlockData & { summary: string }> {
    const upstreamData = this.getUpstreamData(blockId);
    
    return upstreamData.map(data => ({
      ...data,
      summary: this.generateContentSummary(data)
    }));
  }

  /**
   * Generates a content summary for display in instruction boxes
   */
  private generateContentSummary(data: BlockData): string {
    if (!data.content) return '无内容';
    
    const maxLength = 50;
    let summary = data.content.trim();
    
    // 对不同类型的内容进行不同的摘要处理
    if (data.type === 'text') {
      // 文本内容：取前50个字符
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength) + '...';
      }
    } else if (data.type === 'image') {
      // 图片内容：显示图片信息
      if (summary.startsWith('data:image/')) {
        const sizeMatch = summary.match(/data:image\/(\w+);/);
        const format = sizeMatch ? sizeMatch[1].toUpperCase() : 'IMAGE';
        summary = `${format}图片`;
      } else if (summary.startsWith('http')) {
        summary = '在线图片';
      } else {
        summary = '图片内容';
      }
    } else if (data.type === 'video') {
      // 视频内容：显示视频信息
      if (summary.startsWith('http')) {
        summary = '视频文件';
      } else {
        summary = '视频内容';
      }
    }
    
    return summary;
  }

  /**
   * Gets formatted upstream info for display in block placeholders
   */
  getUpstreamDisplayInfo(blockId: string): string {
    const upstreamData = this.getUpstreamDataWithSummaries(blockId);
    
    if (upstreamData.length === 0) return '';
    
    const upstreamInputs = upstreamData.map(data => {
      const typeText = data.type === 'text' ? '文本' : data.type === 'image' ? '图片' : '视频';
      return `[${data.blockNumber}]${typeText}: ${data.summary}`;
    }).join('，');
    
    return upstreamInputs;
  }

  /**
   * Gets all upstream block IDs for a specific block
   */
  getUpstreamBlockIds(blockId: string): string[] {
    const upstreamIds: string[] = [];

    for (const connection of this.connectionCache.values()) {
      if (connection.toId === blockId && connection.dataFlow.enabled) {
        upstreamIds.push(connection.fromId);
      }
    }

    return upstreamIds;
  }

  /**
   * Gets available upstream block numbers for variable references
   */
  getAvailableVariables(blockId: string): string[] {
    const variables: string[] = [];

    for (const connection of this.connectionCache.values()) {
      if (connection.toId === blockId && connection.dataFlow.enabled) {
        const sourceData = this.blockDataCache.get(connection.fromId);
        if (sourceData) {
          variables.push(sourceData.blockNumber);
        }
      }
    }

    return variables.sort();
  }

  /**
   * Validates data flow consistency across all connections
   */
  validateDataFlow(connections: Connection[], blocks: Block[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Create a map for quick block lookup
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (blockId: string): boolean => {
      if (recursionStack.has(blockId)) {
        return true;
      }
      if (visited.has(blockId)) {
        return false;
      }

      visited.add(blockId);
      recursionStack.add(blockId);

      // Check all outgoing connections
      for (const connection of connections) {
        if (connection.fromId === blockId) {
          if (hasCycle(connection.toId)) {
            errors.push({
              type: 'circular_dependency',
              message: `Circular dependency detected involving block ${blockId}`,
              blockId,
              connectionId: connection.id
            });
            return true;
          }
        }
      }

      recursionStack.delete(blockId);
      return false;
    };

    // Check each block for cycles
    for (const block of blocks) {
      if (!visited.has(block.id)) {
        hasCycle(block.id);
      }
    }

    // Check for missing blocks in connections
    for (const connection of connections) {
      if (!blockMap.has(connection.fromId)) {
        errors.push({
          type: 'missing_block',
          message: `Source block ${connection.fromId} not found`,
          connectionId: connection.id
        });
      }
      if (!blockMap.has(connection.toId)) {
        errors.push({
          type: 'missing_block',
          message: `Target block ${connection.toId} not found`,
          connectionId: connection.id
        });
      }
    }

    // Performance warnings for complex workflows
    const connectionCount = connections.length;
    if (connectionCount > 20) {
      warnings.push({
        type: 'performance',
        message: `High number of connections (${connectionCount}) may impact performance`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Updates connection cache with new connections
   */
  updateConnections(connections: Connection[]): void {
    // Remove connections that no longer exist
    const currentIds = new Set(connections.map(c => c.id));
    for (const cachedId of this.connectionCache.keys()) {
      if (!currentIds.has(cachedId)) {
        this.connectionCache.delete(cachedId);
      }
    }

    // Update or add new connections
    for (const connection of connections) {
      this.enhanceConnection(connection);
    }
  }

  /**
   * Clears all cached data (useful for testing or reset)
   */
  clearCache(): void {
    this.blockDataCache.clear();
    this.connectionCache.clear();
  }

  /**
   * Gets the enhanced connection by ID
   */
  getEnhancedConnection(connectionId: string): EnhancedConnection | undefined {
    return this.connectionCache.get(connectionId);
  }

  /**
   * Gets all enhanced connections
   */
  getAllEnhancedConnections(): EnhancedConnection[] {
    return Array.from(this.connectionCache.values());
  }
}

// Singleton instance for global use
export const connectionEngine = new ConnectionEngine();