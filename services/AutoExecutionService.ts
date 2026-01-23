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
  private currentBatchIndex?: number; // 当前批次索引
  private isAutomationMode: boolean = false; // 是否为自动化模式
  
  // 新增：事件驱动执行相关
  private pendingNodes: Map<string, { resolve: () => void; reject: (error: Error) => void }> = new Map();
  private completedNodes: Set<string> = new Set();
  private nodeCompletionCallbacks: Map<string, (() => void)[]> = new Map();

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

    // 为每个块创建执行节点
    for (const block of blocks) {
      // 防御性编程：确保 block 有必要的属性
      if (!block || !block.id) {
        console.warn('[AutoExecutionService] Invalid block found, skipping:', block);
        continue;
      }

      const dependencies = connections
        .filter(conn => conn.toId === block.id)
        .map(conn => conn.fromId);

      // 确保 blockType 是有效的
      const blockType = block.type || 'text';
      if (!['text', 'image', 'video'].includes(blockType)) {
        console.warn(`[AutoExecutionService] Invalid block type: ${blockType}, using 'text' as default`);
      }

      nodes.push({
        blockId: block.id,
        blockNumber: block.number || `Block_${nodes.length + 1}`,
        blockType: blockType as BlockType,
        dependencies,
        estimatedDuration: this.estimateExecutionTime(blockType as BlockType)
      });
    }

    if (nodes.length === 0) {
      console.warn('[AutoExecutionService] No valid blocks found for execution');
      return [];
    }

    // 按依赖关系排序（拓扑排序）
    const sortedNodes = this.topologicalSort(nodes);
    this.executionNodes = sortedNodes;
    
    console.log(`[AutoExecutionService] Analyzed workflow: ${sortedNodes.length} nodes`);
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
    
    // 设置为自动化执行模式
    this.isAutomationMode = true;
    
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
      // 检查是否有上游依赖，如果有则验证内容
      if (currentNode.dependencies.length > 0) {
        // 导入连接引擎来获取上游数据
        const { connectionEngine } = await import('./ConnectionEngine');
        const upstreamData = connectionEngine.getUpstreamData(currentNode.blockId);
        
        // 给出警告但不中断执行
        const emptyUpstreamBlocks = upstreamData.filter(d => !d.content || !d.content.trim());
        if (emptyUpstreamBlocks.length > 0) {
          const emptyBlockNumbers = emptyUpstreamBlocks.map(d => d.blockNumber).join('、');
          console.warn(`[AutoExecutionService] 警告：上游模块 [${emptyBlockNumbers}] 内容为空，可能影响生成质量`);
        }
      }
      
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
   * 计算等待时间 - 优化版，确保有足够时间完成AI生成
   */
  private calculateWaitTime(blockType: BlockType, actualDuration?: number): number {
    const baseInterval = this.config.mode === 'custom' && this.config.customInterval
      ? this.config.customInterval
      : this.DEFAULT_INTERVALS[this.config.mode][blockType];

    if (this.config.enableSmartInterval && actualDuration) {
      // 基于实际执行时间调整间隔，确保有足够缓冲时间
      const bufferTime = 30; // 30秒缓冲时间
      const adaptiveInterval = Math.max(
        baseInterval, 
        (actualDuration / 1000) + bufferTime
      );
      return Math.min(adaptiveInterval, baseInterval * 3); // 最多是基础间隔的3倍
    }

    // 为不同类型设置最小安全间隔
    const minSafeIntervals = {
      text: 45,    // 文本最少45秒
      image: 90,   // 图片最少90秒  
      video: 180   // 视频最少3分钟
    };

    return Math.max(baseInterval, minSafeIntervals[blockType]);
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
    return estimates[blockType] || estimates.text; // 如果 blockType 无效，使用 text 的默认值
  }

  /**
   * 计算总预估时间
   */
  private calculateTotalEstimatedTime(nodes: ExecutionNode[]): number {
    return nodes.reduce((total, node) => {
      // 防御性编程：确保 blockType 是有效的
      const blockType = node.blockType || 'text'; // 默认为 text
      const modeIntervals = this.DEFAULT_INTERVALS[this.config.mode];
      
      if (!modeIntervals) {
        console.warn(`[AutoExecutionService] Unknown execution mode: ${this.config.mode}, using standard mode`);
        const interval = this.DEFAULT_INTERVALS.standard[blockType] || this.DEFAULT_INTERVALS.standard.text;
        return total + node.estimatedDuration + interval;
      }
      
      const interval = modeIntervals[blockType] || modeIntervals.text; // 如果 blockType 无效，使用 text 作为默认值
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
      this.currentBatchIndex = dataIndex; // 设置当前批次索引
      
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
        dataIndex,
        batchData
      );
      
      // 计算下一个数据项的等待时间 - 确保有足够时间保存结果
      const waitTime = Math.max(
        this.calculateWaitTime('text'), // 基础间隔
        10 // 最少10秒缓冲时间，确保结果保存完成
      );
      
      // 等待指定时间后继续下一个数据项
      if (dataIndex < batchData.length - 1) { // 不是最后一个数据项
        console.log(`[AutoExecutionService] 批次 ${dataIndex + 1} 完成，等待 ${waitTime} 秒后继续下一批次...`);
        await this.delay(waitTime * 1000);
      }
    }

    // 所有批量数据处理完成
    this.progress.status = 'completed';
    this.isRunning = false;
    this.notifyProgress();
    
    console.log(`[AutoExecutionService] ✓ 所有 ${batchData.length} 个批次执行完成`);
  }

  /**
   * 执行单个工作流迭代
   */
  private async executeSingleWorkflowIteration(
    blocks: Block[],
    connections: Connection[],
    executionPlan: ExecutionNode[],
    batchDataItem: string,
    dataIndex: number,
    batchData: string[]
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
          prompt = this.replaceBatchVariables(originalPrompt, batchDataItem, dataIndex, batchData.length);
        } else {
          // 后续节点：使用连接引擎获取上游数据
          const originalPrompt = currentBlock.originalPrompt || currentBlock.content || '';
          
          // 导入连接引擎来获取上游数据
          const { connectionEngine } = await import('./ConnectionEngine');
          const upstreamData = connectionEngine.getUpstreamData(currentNode.blockId);
          
          console.log(`[AutoExecutionService] 节点 ${currentNode.blockNumber} 获取上游数据:`, {
            upstreamCount: upstreamData.length,
            upstreamBlocks: upstreamData.map(d => ({ blockNumber: d.blockNumber, hasContent: !!d.content }))
          });
          
          if (upstreamData.length > 0) {
            // 有上游数据，进行变量替换
            let resolvedPrompt = originalPrompt;
            
            // 替换变量引用 [A01], [B01] 等
            for (const data of upstreamData) {
              const variablePattern = new RegExp(`\\[${data.blockNumber}\\]`, 'g');
              const replacementContent = data.content || '';
              
              // 如果上游内容为空，给出警告但不中断执行
              if (!replacementContent.trim()) {
                console.warn(`[AutoExecutionService] 警告：上游模块 [${data.blockNumber}] 内容为空，可能影响生成质量`);
              }
              
              resolvedPrompt = resolvedPrompt.replace(variablePattern, replacementContent);
              
              console.log(`[AutoExecutionService] 替换变量 [${data.blockNumber}] -> ${replacementContent.substring(0, 50)}...`);
            }
            
            // 替换批量数据变量
            prompt = this.replaceBatchVariables(resolvedPrompt, batchDataItem, dataIndex, batchData.length);
          } else {
            // 没有上游数据，直接使用原始提示词
            prompt = this.replaceBatchVariables(originalPrompt, batchDataItem, dataIndex, batchData.length);
          }
        }

        console.log(`[AutoExecutionService] 执行节点 ${currentNode.blockNumber} (${currentNode.blockType}), 提示词: ${prompt.substring(0, 100)}...`);

        // 执行当前节点 - 等待完成
        await this.onNodeExecute?.(currentNode.blockId, prompt);
        
        // 使用事件驱动等待，而不是固定时间等待
        console.log(`[AutoExecutionService] 等待节点 ${currentNode.blockId} 完成信号...`);
        await this.waitForNodeCompletion(currentNode.blockId);
        
        // 记录成功
        executionRecord.endTime = Date.now();
        executionRecord.duration = executionRecord.endTime - executionRecord.startTime;
        executionRecord.success = true;
        
        this.progress.executionHistory.push(executionRecord);

        console.log(`[AutoExecutionService] 节点 ${currentNode.blockNumber} 执行完成，耗时: ${executionRecord.duration}ms`);

        // 只需要很短的缓冲时间，确保数据传播
        if (nodeIndex < executionPlan.length - 1) {
          console.log(`[AutoExecutionService] 短暂缓冲后执行下一个节点...`);
          await this.delay(1000); // 只需1秒缓冲时间
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
        // 立即保存当前结果到新模块，避免被下一轮覆盖
        const resultContent = finalBlock.content; // 立即获取结果内容
        
        // 创建新模块，复制原始模块配置
        const newBlock: Block = {
          ...finalBlock,
          id: crypto.randomUUID(),
          content: resultContent, // 使用保存的结果内容
          status: 'idle',
          x: undefined, // 让 addBlock 自动计算位置
          y: undefined, // 让 addBlock 自动计算位置
          // 添加批量生成标识，便于后续整理
          batchIndex: this.currentBatchIndex || 0
        };
        
        // 通过回调添加到画布 - 这会立即创建新模块
        this.onCreateBlock(newBlock);
        
        // 等待一小段时间确保新模块创建完成，再继续下一轮
        await this.delay(1000); // 1秒缓冲时间
      }
    }
  }

  /**
   * 替换批量数据变量
   */
  private replaceBatchVariables(
    prompt: string, 
    batchDataItem: string, 
    currentIndex: number, 
    totalCount: number
  ): string {
    let result = prompt;
    
    // 基本变量
    result = result.replace(/\{\s*(data|input|batch|content)\s*\}/gi, batchDataItem);
    
    // 索引变量
    result = result.replace(/\{\s*index\s*\}/gi, (currentIndex + 1).toString());
    result = result.replace(/\{\s*number\s*\}/gi, (currentIndex + 1).toString());
    
    // 总数变量
    result = result.replace(/\{\s*total\s*\}/gi, totalCount.toString());
    result = result.replace(/\{\s*count\s*\}/gi, totalCount.toString());
    
    // 进度变量
    const progress = Math.round(((currentIndex + 1) / totalCount) * 100);
    result = result.replace(/\{\s*progress\s*\}/gi, `${progress}%`);
    
    // 时间变量
    const now = new Date();
    result = result.replace(/\{\s*date\s*\}/gi, now.toLocaleDateString());
    result = result.replace(/\{\s*time\s*\}/gi, now.toLocaleTimeString());
    result = result.replace(/\{\s*datetime\s*\}/gi, now.toLocaleString());
    
    // 如果没有找到任何占位符，将批量数据追加到提示词末尾
    if (result === prompt && batchDataItem.trim()) {
      result = `${prompt}\n\n${batchDataItem}`;
    }
    
    return result;
  }

  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 通知节点完成 - 由外部调用（如handleGenerate完成时）
   */
  notifyNodeCompletion(nodeId: string, success: boolean = true, error?: Error): void {
    console.log(`[AutoExecutionService] 节点 ${nodeId} 完成通知，成功: ${success}`);
    
    if (success) {
      this.completedNodes.add(nodeId);
    }
    
    // 触发等待该节点的回调
    const callbacks = this.nodeCompletionCallbacks.get(nodeId) || [];
    callbacks.forEach(callback => callback());
    this.nodeCompletionCallbacks.delete(nodeId);
    
    // 解决等待的Promise
    const pending = this.pendingNodes.get(nodeId);
    if (pending) {
      if (success) {
        pending.resolve();
      } else {
        pending.reject(error || new Error(`节点 ${nodeId} 执行失败`));
      }
      this.pendingNodes.delete(nodeId);
    }
  }

  /**
   * 等待节点完成 - 返回Promise
   */
  private waitForNodeCompletion(nodeId: string): Promise<void> {
    // 如果节点已经完成，立即返回
    if (this.completedNodes.has(nodeId)) {
      return Promise.resolve();
    }
    
    // 创建Promise等待节点完成
    return new Promise<void>((resolve, reject) => {
      this.pendingNodes.set(nodeId, { resolve, reject });
      
      // 设置超时保护（防止永久等待）
      setTimeout(() => {
        if (this.pendingNodes.has(nodeId)) {
          this.pendingNodes.delete(nodeId);
          reject(new Error(`节点 ${nodeId} 执行超时`));
        }
      }, 10 * 60 * 1000); // 10分钟超时
    });
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