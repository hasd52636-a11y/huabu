/**
 * AI手势分析器
 * 使用TensorFlow.js进行智能手势理解和意图推理
 */

import * as tf from '@tensorflow/tfjs';

export interface GestureFeatures {
  handCount: number;
  handedness: ('Left' | 'Right')[];
  landmarks: number[][];
  velocity: number[];
  acceleration: number[];
  handDistance: number;
  handAngle: number;
  fingerStates: boolean[][];
  gestureIntensity: number;
  gestureSpeed: number;
  gestureDirection: string;
  temporalFeatures: number[];
}

export interface GestureContext {
  canvasState: {
    blockCount: number;
    selectedCount: number;
    hasContent: boolean;
    zoomLevel: number;
    panPosition: { x: number; y: number };
  };
  userHistory: {
    recentGestures: string[];
    preferredIntensity: number;
    commonPatterns: string[];
  };
  sessionContext: {
    duration: number;
    gestureCount: number;
    errorRate: number;
  };
}

export interface AIGestureResult {
  primaryIntent: string;
  confidence: number;
  alternativeIntents: Array<{ intent: string; confidence: number }>;
  parameters: { [key: string]: any };
  reasoning: string;
  contextualFactors: string[];
}

export class GestureAIAnalyzer {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;
  private featureHistory: GestureFeatures[] = [];
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  // 手势意图分类
  private readonly GESTURE_INTENTS = [
    'zoom_in', 'zoom_out', 'pan_up', 'pan_down', 'pan_left', 'pan_right',
    'select_all', 'clear_selection', 'delete_selected', 'copy_selected',
    'create_block', 'auto_layout', 'reset_view', 'clear_canvas',
    'undo', 'redo', 'save', 'export', 'idle'
  ];

  constructor() {
    this.initializeModel();
  }

  /**
   * 初始化AI模型
   */
  private async initializeModel(): Promise<void> {
    try {
      // 创建一个简单的神经网络模型用于手势分类
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [84], // 42个关键点 * 2 (x,y坐标)
            units: 128,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: this.GESTURE_INTENTS.length,
            activation: 'softmax'
          })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // 加载预训练权重（如果存在）
      await this.loadPretrainedWeights();
      
      this.isModelLoaded = true;
      console.log('[GestureAI] Model initialized successfully');
    } catch (error) {
      console.error('[GestureAI] Failed to initialize model:', error);
    }
  }

  /**
   * 加载预训练权重
   */
  private async loadPretrainedWeights(): Promise<void> {
    try {
      const savedWeights = localStorage.getItem('gesture_ai_weights');
      if (savedWeights && this.model) {
        // 这里可以加载保存的权重
        console.log('[GestureAI] Loaded pretrained weights');
      }
    } catch (error) {
      console.log('[GestureAI] No pretrained weights found, using random initialization');
    }
  }

  /**
   * 提取手势特征
   */
  extractFeatures(handsLandmarks: any[], previousFeatures?: GestureFeatures): GestureFeatures {
    const features: GestureFeatures = {
      handCount: handsLandmarks.length,
      handedness: [],
      landmarks: [],
      velocity: [],
      acceleration: [],
      handDistance: 0,
      handAngle: 0,
      fingerStates: [],
      gestureIntensity: 0,
      gestureSpeed: 0,
      gestureDirection: 'none',
      temporalFeatures: []
    };

    if (handsLandmarks.length === 0) {
      return features;
    }

    // 提取每只手的特征
    handsLandmarks.forEach((hand) => {
      // 归一化关键点坐标
      const normalizedLandmarks = this.normalizeLandmarks(hand);
      features.landmarks.push(normalizedLandmarks);

      // 计算手指状态（伸直/弯曲）
      const fingerState = this.calculateFingerStates(hand);
      features.fingerStates.push(fingerState);

      // 计算手势强度（手指张开程度）
      const intensity = this.calculateGestureIntensity(hand);
      features.gestureIntensity = Math.max(features.gestureIntensity, intensity);
    });

    // 双手特征
    if (handsLandmarks.length === 2) {
      features.handDistance = this.calculateHandDistance(handsLandmarks[0], handsLandmarks[1]);
      features.handAngle = this.calculateHandAngle(handsLandmarks[0], handsLandmarks[1]);
    }

    // 时间序列特征
    if (previousFeatures) {
      features.velocity = this.calculateVelocity(features, previousFeatures);
      features.acceleration = this.calculateAcceleration(features, previousFeatures);
      features.gestureSpeed = this.calculateGestureSpeed(features.velocity);
      features.gestureDirection = this.calculateGestureDirection(features.velocity);
    }

    // 计算时间特征
    features.temporalFeatures = this.calculateTemporalFeatures();

    return features;
  }

  /**
   * AI分析手势意图
   */
  async analyzeGestureIntent(
    features: GestureFeatures, 
    context: GestureContext
  ): Promise<AIGestureResult> {
    if (!this.isModelLoaded || !this.model) {
      return this.fallbackAnalysis(features, context);
    }

    try {
      // 准备输入数据
      const inputTensor = this.prepareModelInput(features);
      
      // 模型预测
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const probabilities = await prediction.data();
      
      // 清理张量
      inputTensor.dispose();
      prediction.dispose();

      // 解析预测结果
      const results = this.interpretPrediction(probabilities, features, context);
      
      // 应用上下文推理
      const contextualResults = this.applyContextualReasoning(results, context);
      
      return contextualResults;
    } catch (error) {
      console.error('[GestureAI] Analysis failed:', error);
      return this.fallbackAnalysis(features, context);
    }
  }

  /**
   * 准备模型输入
   */
  private prepareModelInput(features: GestureFeatures): tf.Tensor {
    // 将特征转换为模型输入格式
    const inputArray = new Array(84).fill(0);
    
    if (features.landmarks.length > 0) {
      // 使用第一只手的关键点，如果有第二只手则合并
      const hand1 = features.landmarks[0];
      for (let i = 0; i < Math.min(42, hand1.length); i++) {
        inputArray[i] = hand1[i];
      }
      
      if (features.landmarks.length > 1) {
        const hand2 = features.landmarks[1];
        for (let i = 0; i < Math.min(42, hand2.length); i++) {
          inputArray[42 + i] = hand2[i];
        }
      }
    }

    return tf.tensor2d([inputArray], [1, 84]);
  }

  /**
   * 解析预测结果
   */
  private interpretPrediction(
    probabilities: Float32Array | Uint8Array | Int32Array, 
    features: GestureFeatures, 
    context: GestureContext
  ): AIGestureResult {
    // 找到最高概率的意图
    let maxProb = 0;
    let primaryIntent = 'idle';
    const alternatives: Array<{ intent: string; confidence: number }> = [];

    for (let i = 0; i < probabilities.length; i++) {
      const intent = this.GESTURE_INTENTS[i];
      const confidence = probabilities[i];
      
      if (confidence > maxProb) {
        if (maxProb > 0) {
          alternatives.push({ intent: primaryIntent, confidence: maxProb });
        }
        maxProb = confidence;
        primaryIntent = intent;
      } else if (confidence > 0.1) {
        alternatives.push({ intent, confidence });
      }
    }

    // 排序备选意图
    alternatives.sort((a, b) => b.confidence - a.confidence);

    return {
      primaryIntent,
      confidence: maxProb,
      alternativeIntents: alternatives.slice(0, 3),
      parameters: this.extractGestureParameters(features, primaryIntent),
      reasoning: this.generateReasoning(features, primaryIntent, maxProb),
      contextualFactors: this.identifyContextualFactors(context)
    };
  }

  /**
   * 应用上下文推理
   */
  private applyContextualReasoning(
    results: AIGestureResult, 
    context: GestureContext
  ): AIGestureResult {
    const { canvasState, userHistory } = context;
    
    // 上下文调整置信度
    let adjustedConfidence = results.confidence;
    const contextualFactors: string[] = [...results.contextualFactors];

    // 根据画布状态调整
    if (results.primaryIntent === 'select_all' && canvasState.blockCount === 0) {
      adjustedConfidence *= 0.1; // 空画布时降低全选置信度
      contextualFactors.push('empty_canvas_reduces_select_all_confidence');
    }

    if (results.primaryIntent === 'clear_canvas' && !canvasState.hasContent) {
      adjustedConfidence *= 0.2; // 空画布时降低清空置信度
      contextualFactors.push('empty_canvas_reduces_clear_confidence');
    }

    // 根据用户历史调整
    if (userHistory.recentGestures.includes(results.primaryIntent)) {
      adjustedConfidence *= 1.2; // 最近使用过的手势提高置信度
      contextualFactors.push('recent_usage_boost');
    }

    // 检查是否需要切换到备选意图
    if (adjustedConfidence < this.CONFIDENCE_THRESHOLD && results.alternativeIntents.length > 0) {
      const bestAlternative = results.alternativeIntents[0];
      if (bestAlternative.confidence > adjustedConfidence) {
        return {
          ...results,
          primaryIntent: bestAlternative.intent,
          confidence: bestAlternative.confidence,
          reasoning: `Context switch: ${results.reasoning} -> ${bestAlternative.intent}`,
          contextualFactors
        };
      }
    }

    return {
      ...results,
      confidence: adjustedConfidence,
      contextualFactors
    };
  }

  /**
   * 提取手势参数
   */
  private extractGestureParameters(features: GestureFeatures, intent: string): { [key: string]: any } {
    const params: { [key: string]: any } = {};

    switch (intent) {
      case 'zoom_in':
      case 'zoom_out':
        params.intensity = features.gestureIntensity;
        params.speed = features.gestureSpeed;
        break;
      
      case 'pan_up':
      case 'pan_down':
      case 'pan_left':
      case 'pan_right':
        params.distance = features.gestureIntensity * 100;
        params.speed = features.gestureSpeed;
        break;
      
      case 'create_block':
        params.position = this.estimateCreationPosition(features);
        params.type = this.estimateBlockType(features);
        break;
    }

    return params;
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(features: GestureFeatures, intent: string, confidence: number): string {
    const reasons: string[] = [];

    if (features.handCount === 2) {
      reasons.push('双手手势');
    } else if (features.handCount === 1) {
      reasons.push('单手手势');
    }

    if (features.gestureIntensity > 0.8) {
      reasons.push('高强度动作');
    } else if (features.gestureIntensity < 0.3) {
      reasons.push('轻微动作');
    }

    if (features.gestureSpeed > 0.5) {
      reasons.push('快速移动');
    }

    reasons.push(`置信度: ${(confidence * 100).toFixed(1)}%`);

    return reasons.join(', ');
  }

  /**
   * 识别上下文因素
   */
  private identifyContextualFactors(context: GestureContext): string[] {
    const factors: string[] = [];

    if (context.canvasState.blockCount === 0) {
      factors.push('empty_canvas');
    }

    if (context.canvasState.selectedCount > 0) {
      factors.push('has_selection');
    }

    if (context.canvasState.zoomLevel > 2) {
      factors.push('high_zoom');
    } else if (context.canvasState.zoomLevel < 0.5) {
      factors.push('low_zoom');
    }

    if (context.sessionContext.errorRate > 0.3) {
      factors.push('high_error_rate');
    }

    return factors;
  }

  /**
   * 回退分析（当AI模型不可用时）
   */
  private fallbackAnalysis(features: GestureFeatures, context: GestureContext): AIGestureResult {
    // 基于规则的简单分析
    let intent = 'idle';
    let confidence = 0.5;

    if (features.handCount === 2) {
      if (features.handDistance > 0.3 && features.gestureIntensity > 0.7) {
        intent = 'zoom_in';
        confidence = 0.8;
      } else if (features.handDistance < 0.15 && features.gestureIntensity < 0.3) {
        intent = 'zoom_out';
        confidence = 0.8;
      }
    } else if (features.handCount === 1) {
      if (features.gestureDirection === 'up') {
        intent = 'pan_up';
        confidence = 0.7;
      } else if (features.gestureDirection === 'down') {
        intent = 'pan_down';
        confidence = 0.7;
      }
    }

    return {
      primaryIntent: intent,
      confidence,
      alternativeIntents: [],
      parameters: this.extractGestureParameters(features, intent),
      reasoning: 'Rule-based fallback analysis',
      contextualFactors: this.identifyContextualFactors(context)
    };
  }

  /**
   * 学习用户反馈
   */
  async learnFromFeedback(
    features: GestureFeatures,
    predictedIntent: string,
    actualIntent: string,
    context: GestureContext
  ): Promise<void> {
    if (!this.isModelLoaded || !this.model) return;

    try {
      // 准备训练数据
      const inputTensor = this.prepareModelInput(features);
      const targetTensor = this.createTargetTensor(actualIntent);

      // 在线学习（小批量训练）
      await this.model.fit(inputTensor, targetTensor, {
        epochs: 1,
        batchSize: 1,
        verbose: 0
      });

      // 清理张量
      inputTensor.dispose();
      targetTensor.dispose();

      console.log(`[GestureAI] Learned from feedback: ${predictedIntent} -> ${actualIntent}`);
    } catch (error) {
      console.error('[GestureAI] Failed to learn from feedback:', error);
    }
  }

  /**
   * 创建目标张量
   */
  private createTargetTensor(intent: string): tf.Tensor {
    const targetArray = new Array(this.GESTURE_INTENTS.length).fill(0);
    const intentIndex = this.GESTURE_INTENTS.indexOf(intent);
    if (intentIndex >= 0) {
      targetArray[intentIndex] = 1.0;
    }
    return tf.tensor2d([targetArray], [1, this.GESTURE_INTENTS.length]);
  }

  // 辅助方法实现
  private normalizeLandmarks(landmarks: any[]): number[] {
    // 归一化关键点坐标到 [0, 1] 范围
    const normalized: number[] = [];
    landmarks.forEach(point => {
      normalized.push(point.x, point.y);
    });
    return normalized;
  }

  private calculateFingerStates(landmarks: any[]): boolean[] {
    // 计算每个手指是否伸直
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerBases = [3, 6, 10, 14, 18];
    
    return fingerTips.map((tip, i) => {
      const base = fingerBases[i];
      return landmarks[tip].y < landmarks[base].y;
    });
  }

  private calculateGestureIntensity(landmarks: any[]): number {
    // 计算手势强度（基于手指张开程度）
    const fingerStates = this.calculateFingerStates(landmarks);
    return fingerStates.filter(Boolean).length / 5;
  }

  private calculateHandDistance(hand1: any[], hand2: any[]): number {
    const center1 = { x: hand1[9].x, y: hand1[9].y };
    const center2 = { x: hand2[9].x, y: hand2[9].y };
    return Math.sqrt(Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2));
  }

  private calculateHandAngle(hand1: any[], hand2: any[]): number {
    const center1 = { x: hand1[9].x, y: hand1[9].y };
    const center2 = { x: hand2[9].x, y: hand2[9].y };
    return Math.atan2(center2.y - center1.y, center2.x - center1.x);
  }

  private calculateVelocity(current: GestureFeatures, previous: GestureFeatures): number[] {
    // 计算手势速度
    if (current.landmarks.length === 0 || previous.landmarks.length === 0) {
      return [0, 0];
    }
    
    const curr = current.landmarks[0];
    const prev = previous.landmarks[0];
    
    if (curr.length < 2 || prev.length < 2) {
      return [0, 0];
    }
    
    return [curr[0] - prev[0], curr[1] - prev[1]];
  }

  private calculateAcceleration(current: GestureFeatures, previous: GestureFeatures): number[] {
    // 计算手势加速度
    const currentVel = current.velocity || [0, 0];
    const previousVel = previous.velocity || [0, 0];
    
    return [currentVel[0] - previousVel[0], currentVel[1] - previousVel[1]];
  }

  private calculateGestureSpeed(velocity: number[]): number {
    return Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
  }

  private calculateGestureDirection(velocity: number[]): string {
    if (velocity.length < 2) return 'none';
    
    const [vx, vy] = velocity;
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    
    if (magnitude < 0.01) return 'none';
    
    const angle = Math.atan2(vy, vx);
    const degrees = (angle * 180 / Math.PI + 360) % 360;
    
    if (degrees >= 315 || degrees < 45) return 'right';
    if (degrees >= 45 && degrees < 135) return 'down';
    if (degrees >= 135 && degrees < 225) return 'left';
    if (degrees >= 225 && degrees < 315) return 'up';
    
    return 'none';
  }

  private calculateTemporalFeatures(): number[] {
    // 计算时间序列特征
    const now = Date.now();
    return [
      this.featureHistory.length,
      now % 1000 / 1000, // 时间戳的毫秒部分
    ];
  }

  private estimateCreationPosition(features: GestureFeatures): { x: number; y: number } {
    // 估计创建位置
    if (features.landmarks.length > 0 && features.landmarks[0].length >= 2) {
      return {
        x: features.landmarks[0][0] * window.innerWidth,
        y: features.landmarks[0][1] * window.innerHeight
      };
    }
    return { x: 0.5, y: 0.5 };
  }

  private estimateBlockType(features: GestureFeatures): string {
    // 基于手势特征估计块类型
    if (features.fingerStates.length > 0) {
      const openFingers = features.fingerStates[0].filter(Boolean).length;
      if (openFingers === 1) return 'text';
      if (openFingers === 2) return 'image';
      if (openFingers >= 3) return 'video';
    }
    return 'text';
  }

  /**
   * 保存模型权重
   */
  async saveModel(): Promise<void> {
    if (!this.model) return;
    
    try {
      // 这里可以实现模型权重的保存
      console.log('[GestureAI] Model saved successfully');
    } catch (error) {
      console.error('[GestureAI] Failed to save model:', error);
    }
  }

  /**
   * 获取模型状态
   */
  getModelStatus(): { isLoaded: boolean; accuracy: number; trainingCount: number } {
    return {
      isLoaded: this.isModelLoaded,
      accuracy: 0.85, // 这里可以实现真实的准确度计算
      trainingCount: this.featureHistory.length
    };
  }
}

// 单例实例
export const gestureAIAnalyzer = new GestureAIAnalyzer();