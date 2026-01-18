/**
 * AutoExecutionService - 自动执行服务
 * 基于用户调试好的模板，按设定间隔自动执行每个节点的生成
 */

import { Block, Connection, BlockType } from '../types';

export interface AutoExecutionConfig {
  mode: 'conservative' | 'standard' | 'fast' | 'custom';
  customInterval?: number; // 秒
  maxRetries: number;
  pauseOnError: boolean;
  enableSmartInterval: boolean; // 是否启用智能间隔调整
}

export interface ExecutionNode {
  blockId: string;
  blockNumber: string;
  blockType: BlockType;
  dependencies: string[]; // 依赖的上游节点ID
  estimatedDuration: number; // 预估执行时间（秒）
}

export interface ExecutionProgress {
  currentNodeIndex: number;
  totalNodes: number;
  currentNodeId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  startTime?: number;
  estimatedEndTime?: number;
  errorMessage?: string;
  executionHistory: ExecutionRecord[];
}

export interface ExecutionRecord {
  nodeId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export class AutoExecutionService {
  private config: AutoExecutionConfig;
  private executionNodes: ExecutionNode[] = [];
  private progress: ExecutionProgress;
  private isRunning = false;
  private currentTimeout: NodeJS.Timeout | null = null;
  private onProgressUpdate?: (progress: ExecutionProgress) => void;
  private onNodeExecute?: (nodeId: string, prompt: string) => Promise<void>;
  private onCreateBlock?: (block: Block) => void;
  private resultHandling?: 'canvas' | 'download'; // 结果处理方式

  // 默认间隔时间（秒）
  private readonly DEFAULT_INTERVALS = {
    conservative: { text: 120, image: 180, video: 300 }, // 2-5分钟
    standard: { text: 60, image: 120, video: 180 },      // 1-3分钟  
    fast: { text: 30, image: 60, video: 90 },            // 30秒-1.5分钟
    custom: { text: 60, image: 60, video: 60 }           // 用户自定义
  };

  constructor(config: AutoExecutionConfig = {
    mode: 'standard',
    maxRetries: 3,
    pauseOnError: true,
    enableSmartInterval: true
  }) {
    this.config = config;
    this.progress = {
      currentNodeIndex: 0,
      totalNodes: 0,
      currentNodeId: '',
      status: 'idle',
      executionHistory: []
    };
  }

  /**
   * 分析工作流并生成执行计划
   */
  analyzeWorkflow(blocks: Block[], connections: Connection[]): ExecutionNode[] {
    const nodes: ExecutionNode[] = [];
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    // 为每个块创建执行节点
    for (const block of blocks) {
      const dependencies = connections
        .filter(conn => conn.toId === block.id)
        .map(conn => conn.fromId);

      nodes.push({
        blockId: block.id,
        blockNumber: block.number,
        blockType: block.type,
        dependencies,
        estimatedDuration: this.estimateExecutionTime(block.type)
      });
    }

    // 按依赖关系排序（拓扑排序）
    const sortedNodes = this.topologicalSort(nodes);
    this.executionNodes = sortedNodes;
    
    return sortedNodes;
  }

  /**
   * 开始自动执行
   */
  async startExecution(
    blocks: Block[], 
    connections: Connection[],
    onNodeExecute: (nodeId: string, prompt: string) => Promise<void>,
    onProgressUpdate?: (progress: ExecutionProgress) => void,
    batchData?: string[], // 批量数据数组
    resultHandling?: 'canvas' | 'download', // 结果处理方式
    onCreateBlock?: (block: Block) => void // 创建新模块的回调
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('自动执行已在进行中');
    }

    this.onNodeExecute = onNodeExecute;
    this.onProgressUpdate = onProgressUpdate;
    this.onCreateBlock = onCreateBlock;
    this.resultHandling = resultHandling;
    
    // 分析工作流
    const executionPlan = this.analyzeWorkflow(blocks, connections);
    
    // 如果有批量数据，使用批量数据的长度作为总节点数
    const totalNodes = batchData ? batchData.length * executionPlan.length : executionPlan.length;
    
    this.progress = {
      currentNodeIndex: 0,
      totalNodes,
      currentNodeId: '',
      status: 'running',
      startTime: Date.now(),
      estimatedEndTime: Date.now() + this.calculateTotalEstimatedTime(executionPlan) * (batchData?.length || 1),
      executionHistory: []
    };

    this.isRunning = true;
    this.notifyProgress();

    try {
      if (batchData) {
        // 执行批量数据循环
        await this.executeBatchDataLoop(blocks, connections, executionPlan, batchData);
      } else {
        // 单次执行
        await this.executeNextNode(blocks);
      }
    } catch (error) {
      this.handleExecutionError(error as Error);
    }
  }

  /**
   * 暂停执行
   */
  pauseExecution(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.progress.status = 'paused';
    this.notifyProgress();
  }

  /**
   * 恢复执行
   */
  async resumeExecution(blocks: Block[]): Promise<void> {
    if (this.progress.status !== 'paused') return;
    
    this.progress.status = 'running';
    this.notifyProgress();
    
    try {
      await this.executeNextNode(blocks);
    } catch (error) {
      this.handleExecutionError(error as Error);
    }
  }

  /**
   * 停止执行
   */
  stopExecution(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.isRunning = false;
    this.progress.status = 'idle';
    this.progress.currentNodeIndex = 0;
    this.notifyProgress();
  }

  /**
   * 执行下一个节点
   */
  private async executeNextNode(blocks: Block[]): Promise<void> {
    if (!this.isRunning || this.progress.status === 'paused') return;

    if (this.progress.currentNodeIndex >= this.executionNodes.length) {
      // 执行完成
      this.progress.status = 'completed';
      this.isRunning = false;
      this.notifyProgress();
      return;
    }

    const currentNode = this.executionNodes[this.progress.currentNodeIndex];
    const currentBlock = blocks.find(b => b.id === currentNode.blockId);
    
    if (!currentBlock) {
      throw new Error(`找不到节点: ${currentNode.blockId}`);
    }

    this.progress.currentNodeId = currentNode.blockId;
    this.notifyProgress();

    const executionRecord: ExecutionRecord = {
      nodeId: currentNode.blockId,
      startTime: Date.now(),
      success: false
    };

    try {
      // 执行当前节点
      const prompt = currentBlock.content || ''; // 使用块的当前内容作为提示词
      await this.onNodeExecute?.(currentNode.blockId, prompt);
      
      // 记录成功
      executionRecord.endTime = Date.now();
      executionRecord.duration = executionRecord.endTime - executionRecord.startTime;
      executionRecord.success = true;
      
      this.progress.executionHistory.push(executionRecord);
      this.progress.currentNodeIndex++;

      // 计算下一个节点的等待时间
      const waitTime = this.calculateWaitTime(currentNode.blockType, executionRecord.duration);
      
      // 等待指定时间后执行下一个节点
      this.currentTimeout = setTimeout(() => {
        this.executeNextNode(blocks);
      }, waitTime * 1000);

    } catch (error) {
      // 记录失败
      executionRecord.endTime = Date.now();
      executionRecord.duration = executionRecord.endTime - executionRecord.startTime;
      executionRecord.errorMessage = (error as Error).message;
      
      this.progress.executionHistory.push(executionRecord);
      
      if (this.config.pauseOnError) {
        this.handleExecutionError(error as Error);
      } else {
        // 继续执行下一个节点
        this.progress.currentNodeIndex++;
        const waitTime = this.calculateWaitTime(currentNode.blockType);
        this.currentTimeout = setTimeout(() => {
          this.executeNextNode(blocks);
        }, waitTime * 1000);
      }
    }
  }

  /**
   * 计算等待时间
   */
  private calculateWaitTime(blockType: BlockType, actualDuration?: number): number {
    const baseInterval = this.config.mode === 'custom' && this.config.customInterval
      ? this.config.customInterval
      : this.DEFAULT_INTERVALS[this.config.mode][blockType];

    if (this.config.enableSmartInterval && actualDuration) {
      // 基于实际执行时间调整间隔
      const adaptiveInterval = Math.max(baseInterval, actualDuration / 1000 + 30);
      return Math.min(adaptiveInterval, baseInterval * 2); // 最多是基础间隔的2倍
    }

    return baseInterval;
  }

  /**
   * 估算执行时间
   */
  private estimateExecutionTime(blockType: BlockType): number {
    const estimates = {
      text: 30,    // 文本生成约30秒
      image: 60,   // 图片生成约60秒
      video: 180   // 视频生成约3分钟
    };
    return estimates[blockType];
  }

  /**
   * 计算总预估时间
   */
  private calculateTotalEstimatedTime(nodes: ExecutionNode[]): number {
    return nodes.reduce((total, node) => {
      const interval = this.DEFAULT_INTERVALS[this.config.mode][node.blockType];
      return total + node.estimatedDuration + interval;
    }, 0) * 1000; // 转换为毫秒
  }

  /**
   * 执行批量数据循环
   */
  private async executeBatchDataLoop(
    blocks: Block[],
    connections: Connection[],
    executionPlan: ExecutionNode[],
    batchData: string[]
  ): Promise<void> {
    // 查找工作流的起始节点（没有依赖的节点）
    const startNode = executionPlan.find(node => node.dependencies.length === 0);
    if (!startNode) {
      throw new Error('无法找到工作流的起始节点');
    }

    // 对每条批量数据执行完整的工作流
    for (let dataIndex = 0; dataIndex < batchData.length; dataIndex++) {
      if (!this.isRunning || this.progress.status === 'paused') {
        return;
      }

      const currentData = batchData[dataIndex];
      
      // 更新进度信息
      this.progress.currentNodeId = `batch_${dataIndex + 1}`;
      this.notifyProgress();

      // 创建工作流的克隆（用于每条数据）
      const workflowClone = [...executionPlan];
      
      // 对当前批量数据执行完整的工作流
      await this.executeSingleWorkflowIteration(
        blocks,
        connections,
        workflowClone,
        currentData,
        startNode
      );
      
      // 计算下一个数据项的等待时间
      const waitTime = this.calculateWaitTime('text'); // 批量数据间隔使用文本模块的间隔
      
      // 等待指定时间后继续下一个数据项
      await this.delay(waitTime * 1000);
    }

    // 所有批量数据处理完成
    this.progress.status = 'completed';
    this.isRunning = false;
    this.notifyProgress();
  }

  /**
   * 执行单个工作流迭代
   */
  private async executeSingleWorkflowIteration(
    blocks: Block[],
    connections: Connection[],
    executionPlan: ExecutionNode[],
    batchDataItem: string,
    startNode: ExecutionNode
  ): Promise<void> {
    // 对工作流中的每个节点执行处理
    for (let nodeIndex = 0; nodeIndex < executionPlan.length; nodeIndex++) {
      if (!this.isRunning || this.progress.status === 'paused') {
        return;
      }

      const currentNode = executionPlan[nodeIndex];
      const currentBlock = blocks.find(b => b.id === currentNode.blockId);
      
      if (!currentBlock) {
        throw new Error(`找不到节点: ${currentNode.blockId}`);
      }

      // 更新进度信息
      this.progress.currentNodeId = currentNode.blockId;
      this.progress.currentNodeIndex++;
      this.notifyProgress();

      const executionRecord: ExecutionRecord = {
        nodeId: currentNode.blockId,
        startTime: Date.now(),
        success: false
      };

      try {
        // 确定当前节点的提示词
        let prompt: string;
        
        if (nodeIndex === 0) {
          // 起始节点：保留用户配置的提示词，使用占位符替换注入批量数据
          const originalPrompt = currentBlock.originalPrompt || currentBlock.content || '';
          // 支持多种占位符格式：{data}, {input}, {batch}等
          prompt = originalPrompt.replace(/\{\s*(data|input|batch)\s*\}/gi, batchDataItem);
          // 如果没有占位符，将批量数据追加到提示词末尾
          if (prompt === originalPrompt) {
            prompt = `${originalPrompt}\n\n${batchDataItem}`;
          }
        } else {
          // 后续节点：查找前一个节点的输出作为输入
          const previousNode = executionPlan[nodeIndex - 1];
          const previousBlock = blocks.find(b => b.id === previousNode.blockId);
          
          if (previousBlock?.content) {
            // 如果前一个节点有输出，使用它作为当前节点的输入
            const originalPrompt = currentBlock.originalPrompt || currentBlock.content || '';
            prompt = originalPrompt.replace(/\{\s*(data|input|previous)\s*\}/gi, previousBlock.content);
            // 如果没有占位符，将前一个节点的输出追加到当前提示词末尾
            if (prompt === originalPrompt) {
              prompt = `${originalPrompt}\n\n${previousBlock.content}`;
            }
          } else {
            // 作为备选，使用当前块的配置
            prompt = currentBlock.originalPrompt || currentBlock.content || '';
          }
        }

        // 执行当前节点
        await this.onNodeExecute?.(currentNode.blockId, prompt);
        
        // 记录成功
        executionRecord.endTime = Date.now();
        executionRecord.duration = executionRecord.endTime - executionRecord.startTime;
        executionRecord.success = true;
        
        this.progress.executionHistory.push(executionRecord);

        // 计算下一个节点的等待时间
        const waitTime = this.calculateWaitTime(currentNode.blockType, executionRecord.duration);
        
        // 等待指定时间后执行下一个节点
        if (nodeIndex < executionPlan.length - 1) {
          await this.delay(waitTime * 1000);
        }

      } catch (error) {
        // 记录失败
        executionRecord.endTime = Date.now();
        executionRecord.duration = executionRecord.endTime - executionRecord.startTime;
        executionRecord.errorMessage = (error as Error).message;
        
        this.progress.executionHistory.push(executionRecord);
        
        if (this.config.pauseOnError) {
          this.handleExecutionError(error as Error);
          return;
        }
      }
    }
    
    // 执行完成后，根据结果处理方式决定是否创建新模块
    // 只在 resultHandling 为 'canvas' 时创建新模块，保持二选一原则
    if (this.resultHandling === 'canvas' && this.onCreateBlock) {
      // 查找工作流的最后一个节点
      const finalNode = executionPlan[executionPlan.length - 1];
      const finalBlock = blocks.find(b => b.id === finalNode.blockId);
      
      if (finalBlock && finalBlock.content) {
        // 创建新模块，复制原始模块配置
        // 不设置 x 和 y，让 App.tsx 中的 addBlock 函数处理位置计算
        // 这样可以保持一致的从左到右、从上到下的布局逻辑
        const newBlock: Block = {
          ...finalBlock,
          id: crypto.randomUUID(),
          content: finalBlock.content, // 保存执行结果
          status: 'idle',
          x: undefined,
          y: undefined
        };
        
        // 通过回调添加到画布
        this.onCreateBlock(newBlock);
      }
    }
  }

  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(nodes: ExecutionNode[]): ExecutionNode[] {
    const result: ExecutionNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error('检测到循环依赖');
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      const node = nodes.find(n => n.blockId === nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
        visited.add(nodeId);
        result.push(node);
      }
      visiting.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.blockId)) {
        visit(node.blockId);
      }
    }

    return result;
  }

  /**
   * 处理执行错误
   */
  private handleExecutionError(error: Error): void {
    this.progress.status = 'error';
    this.progress.errorMessage = error.message;
    this.isRunning = false;
    this.notifyProgress();
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(): void {
    this.onProgressUpdate?.(this.progress);
  }

  /**
   * 获取当前进度
   */
  getProgress(): ExecutionProgress {
    return { ...this.progress };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AutoExecutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AutoExecutionConfig {
    return { ...this.config };
  }
}

// 单例实例
export const autoExecutionService = new AutoExecutionService();