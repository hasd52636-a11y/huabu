import { CanvasState, Block, EnhancedConnection, BlockType, ValidationResult, ValidationError } from '../types';
import { ConnectionEngine } from './ConnectionEngine';
import { VariableSystem } from './VariableSystem';

export interface ExecutionOptions {
  batchInput?: BatchInputSource;
  downloadPath?: string;
  maxConcurrency?: number;
  retryPolicy?: RetryPolicy;
  notificationSettings?: NotificationSettings;
}

export interface BatchInputSource {
  type: 'folder' | 'files';
  path: string;
  files?: FileInput[];
}

export interface FileInput {
  name: string;
  path: string;
  type: 'text' | 'image';
  content: string | ArrayBuffer;
  size: number;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier?: number;
}

export interface NotificationSettings {
  onProgress?: boolean;
  onCompletion?: boolean;
  onError?: boolean;
}

export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled';
  results: BlockResult[];
  statistics: ExecutionStatistics;
  errors?: ExecutionError[];
}

export interface BlockResult {
  blockId: string;
  blockNumber: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  executionTime: number;
  retryCount: number;
}

export interface ExecutionStatistics {
  totalBlocks: number;
  completedBlocks: number;
  failedBlocks: number;
  skippedBlocks: number;
  totalExecutionTime: number;
  averageBlockTime: number;
}

export interface ExecutionError {
  blockId: string;
  blockNumber: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export interface ExecutionStatus {
  executionId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    current?: string; // current block being processed
  };
  startTime: Date;
  estimatedCompletion?: Date;
}

export class AutoExecutor {
  private connectionEngine: ConnectionEngine;
  private variableSystem: VariableSystem;
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  private executionCounter = 0;

  constructor() {
    this.connectionEngine = new ConnectionEngine();
    this.variableSystem = new VariableSystem();
  }

  /**
   * Execute a complete workflow based on canvas state and connection logic
   */
  async executeWorkflow(canvas: CanvasState, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    try {
      // Validate workflow before execution
      const validation = this.validateWorkflow(canvas);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create execution context
      const context: ExecutionContext = {
        executionId,
        canvas,
        options,
        status: 'running',
        startTime,
        progress: {
          total: canvas.blocks.length,
          completed: 0,
          failed: 0
        },
        results: [],
        errors: []
      };

      this.activeExecutions.set(executionId, context);

      // Calculate execution order using topological sort
      const executionOrder = this.calculateExecutionOrder(canvas.blocks, canvas.connections);
      
      // Execute blocks in order
      for (let i = 0; i < executionOrder.length; i++) {
        const blockId = executionOrder[i];
        
        if (context.status === 'cancelled') {
          break;
        }

        if (context.status === 'paused') {
          await this.waitForResume(executionId);
        }

        const block = canvas.blocks.find(b => b.id === blockId);
        if (!block) continue;

        context.progress.current = block.number;
        
        try {
          const result = await this.executeBlock(block, canvas, context);
          // Add execution order to result
          (result as any).executionOrder = i;
          context.results.push(result);
          
          if (result.status === 'completed') {
            context.progress.completed++;
            // Propagate data to downstream blocks
            this.connectionEngine.propagateData(blockId, result.output || '', block.type, block.number);
          } else {
            context.progress.failed++;
          }
        } catch (error) {
          const errorResult: BlockResult = {
            blockId: block.id,
            blockNumber: block.number,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            retryCount: 0
          };
          
          // Add execution order to result
          (errorResult as any).executionOrder = i;
          context.results.push(errorResult);
          context.progress.failed++;
          context.errors.push({
            blockId: block.id,
            blockNumber: block.number,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            retryCount: 0
          });
        }
      }

      // Finalize execution
      const finalStatus = context.status === 'cancelled' ? 'cancelled' : 
                         context.progress.failed > 0 ? 'failed' : 'completed';

      const result: ExecutionResult = {
        executionId,
        status: finalStatus,
        results: context.results,
        statistics: this.calculateStatistics(context.results, startTime),
        errors: context.errors.length > 0 ? context.errors : undefined
      };

      this.activeExecutions.delete(executionId);
      return result;

    } catch (error) {
      this.activeExecutions.delete(executionId);
      throw error;
    }
  }

  /**
   * Pause an active execution
   */
  async pauseExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context && context.status === 'running') {
      context.status = 'paused';
    }
  }

  /**
   * Resume a paused execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context && context.status === 'paused') {
      context.status = 'running';
    }
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'cancelled';
    }
  }

  /**
   * Get current execution status
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    const context = this.activeExecutions.get(executionId);
    if (!context) return null;

    return {
      executionId,
      status: context.status,
      progress: context.progress,
      startTime: context.startTime,
      estimatedCompletion: this.estimateCompletion(context)
    };
  }

  /**
   * Validate workflow before execution
   */
  private validateWorkflow(canvas: CanvasState): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for circular dependencies
    const hasCycles = this.detectCycles(canvas.blocks, canvas.connections);
    if (hasCycles) {
      errors.push({
        type: 'circular_dependency',
        message: 'Workflow contains circular dependencies'
      });
    }

    // Validate all connections have valid blocks
    for (const connection of canvas.connections) {
      const fromBlock = canvas.blocks.find(b => b.id === connection.fromId);
      const toBlock = canvas.blocks.find(b => b.id === connection.toId);
      
      if (!fromBlock) {
        errors.push({
          type: 'missing_block',
          message: `Connection references missing source block: ${connection.fromId}`,
          connectionId: connection.id
        });
      }
      
      if (!toBlock) {
        errors.push({
          type: 'missing_block',
          message: `Connection references missing target block: ${connection.toId}`,
          connectionId: connection.id
        });
      }
    }

    // Validate variables in block prompts
    for (const block of canvas.blocks) {
      if (block.content) {
        const availableBlocks = this.getUpstreamBlocks(block.id, canvas.connections)
          .map(id => canvas.blocks.find(b => b.id === id)?.number)
          .filter(Boolean) as string[];
        
        const variableErrors = this.variableSystem.validateVariables(block.content, availableBlocks);
        errors.push(...variableErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Calculate execution order using topological sort
   */
  private calculateExecutionOrder(blocks: Block[], connections: EnhancedConnection[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    for (const block of blocks) {
      graph.set(block.id, []);
      inDegree.set(block.id, 0);
    }

    // Build adjacency list and calculate in-degrees
    for (const connection of connections) {
      if (graph.has(connection.fromId) && graph.has(connection.toId)) {
        graph.get(connection.fromId)!.push(connection.toId);
        inDegree.set(connection.toId, (inDegree.get(connection.toId) || 0) + 1);
      }
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with no incoming edges
    for (const [blockId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(blockId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Process all neighbors
      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Detect cycles in the workflow graph
   */
  private detectCycles(blocks: Block[], connections: EnhancedConnection[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const block of blocks) {
      graph.set(block.id, []);
    }

    for (const connection of connections) {
      if (graph.has(connection.fromId)) {
        graph.get(connection.fromId)!.push(connection.toId);
      }
    }

    // DFS to detect cycles
    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const block of blocks) {
      if (!visited.has(block.id)) {
        if (hasCycleDFS(block.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Execute a single block with variable resolution and AI service integration
   */
  private async executeBlock(block: Block, canvas: CanvasState, context: ExecutionContext): Promise<BlockResult> {
    const startTime = Date.now();
    
    try {
      // Get upstream data for variable resolution
      const upstreamData = this.connectionEngine.getUpstreamData(block.id);
      
      // Resolve variables in block content (prompt)
      const resolvedPrompt = this.variableSystem.resolveVariables(block.content, upstreamData);
      
      // Execute based on block type
      let output: string;
      switch (block.type) {
        case 'text':
          output = await this.executeTextBlock(resolvedPrompt, context.options);
          break;
        case 'image':
          output = await this.executeImageBlock(resolvedPrompt, context.options);
          break;
        case 'video':
          output = await this.executeVideoBlock(resolvedPrompt, context.options);
          break;
        default:
          throw new Error(`Unsupported block type: ${block.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        blockId: block.id,
        blockNumber: block.number,
        status: 'completed',
        output,
        executionTime,
        retryCount: 0
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        blockId: block.id,
        blockNumber: block.number,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        retryCount: 0
      };
    }
  }

  /**
   * Execute text block using AI service
   */
  private async executeTextBlock(prompt: string, options: ExecutionOptions): Promise<string> {
    // Add small delay to simulate real execution time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // This would integrate with existing AI service adapters
    // For now, return a mock response
    return `Generated text response for: ${prompt.substring(0, 50)}...`;
  }

  /**
   * Execute image block using AI service
   */
  private async executeImageBlock(prompt: string, options: ExecutionOptions): Promise<string> {
    // Add small delay to simulate real execution time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // This would integrate with existing AI service adapters
    // For now, return a mock image URL
    return `data:image/png;base64,mock_image_data_for_${prompt.substring(0, 20)}`;
  }

  /**
   * Execute video block using AI service
   */
  private async executeVideoBlock(prompt: string, options: ExecutionOptions): Promise<string> {
    // Add small delay to simulate real execution time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // This would integrate with existing AI service adapters
    // For now, return a mock video URL
    return `https://example.com/video/mock_video_for_${prompt.substring(0, 20)}.mp4`;
  }

  /**
   * Get upstream blocks for a given block
   */
  private getUpstreamBlocks(blockId: string, connections: EnhancedConnection[]): string[] {
    return connections
      .filter(conn => conn.toId === blockId)
      .map(conn => conn.fromId);
  }

  /**
   * Calculate execution statistics
   */
  private calculateStatistics(results: BlockResult[], startTime: Date): ExecutionStatistics {
    const totalExecutionTime = Date.now() - startTime.getTime();
    const completedBlocks = results.filter(r => r.status === 'completed').length;
    const failedBlocks = results.filter(r => r.status === 'failed').length;
    const skippedBlocks = results.filter(r => r.status === 'skipped').length;

    return {
      totalBlocks: results.length,
      completedBlocks,
      failedBlocks,
      skippedBlocks,
      totalExecutionTime,
      averageBlockTime: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.executionTime, 0) / results.length : 0
    };
  }

  /**
   * Estimate completion time for active execution
   */
  private estimateCompletion(context: ExecutionContext): Date | undefined {
    if (context.progress.completed === 0) return undefined;

    const elapsed = Date.now() - context.startTime.getTime();
    const averageTimePerBlock = elapsed / context.progress.completed;
    const remainingBlocks = context.progress.total - context.progress.completed;
    const estimatedRemainingTime = remainingBlocks * averageTimePerBlock;

    return new Date(Date.now() + estimatedRemainingTime);
  }

  /**
   * Wait for execution to be resumed
   */
  private async waitForResume(executionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const context = this.activeExecutions.get(executionId);
        if (!context || context.status !== 'paused') {
          resolve();
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${++this.executionCounter}`;
  }
}

interface ExecutionContext {
  executionId: string;
  canvas: CanvasState;
  options: ExecutionOptions;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  progress: {
    total: number;
    completed: number;
    failed: number;
    current?: string;
  };
  results: BlockResult[];
  errors: ExecutionError[];
}