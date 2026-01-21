/**
 * 手势AI分析器
 * 使用TensorFlow.js进行手势意图分析和预测
 */

import * as tf from '@tensorflow/tfjs';

export interface GestureFeatures {
  handedness: 'Left' | 'Right';
  landmarks: Array<{ x: number; y: number; z: number }>;
  velocity: Array<{ x: number; y: number }>;
  acceleration: Array<{ x: number; y: number }>;
  fingerStates: {
    thumb: 'extended' | 'bent';
    index: 'extended' | 'bent';
    middle: 'extended' | 'bent';
    ring: 'extended' | 'bent';
    pinky: 'extended' | 'bent';
  };
  gestureArea: number;
  centroid: { x: number; y: number };
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface GestureContext {
  canvasState: {
    blockCount: number;
    selectedCount: number;
    hasContent: boolean;
    zoomLevel: number;
    panPosition: { x: number; y: number };
  };
  previousGestures: string[];
  sessionDuration: number;
  userPreferences: {
    sensitivity: number;
    preferredGestures: string[];
  };
}

export interface AIGestureResult {
  intent: string;
  confidence: number;
  suggestedAction: string;
  parameters?: Record<string, any>;
  reasoning: string;
}

export class GestureAIAnalyzer {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;
  private featureHistory: GestureFeatures[] = [];
  private readonly maxHistoryLength = 10;

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
            inputShape: [84], // 21个关键点 * 4个特征 (x, y, z, confidence)
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
            units: 10, // 10种手势类型
            activation: 'softmax'
          })
        ]
      });

      // 编译模型
      this.model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.isModelLoaded = true;
      console.log('[GestureAIAnalyzer] AI模型初始化成功');
    } catch (error) {
      console.error('[GestureAIAnalyzer] AI模型初始化失败:', error);
      this.isModelLoaded = false;
    }
  }

  /**
   * 提取手势特征
   */
  extractFeatures(landmarks: Array<{ x: number; y: number; z: number }>, previousFeatures?: GestureFeatures): GestureFeatures {
    // 计算手势中心点
    const centroid = this.calculateCentroid(landmarks);
    
    // 计算边界框
    const boundingBox = this.calculateBoundingBox(landmarks);
    
    // 计算速度和加速度
    const velocity = previousFeatures ? this.calculateVelocity(landmarks, previousFeatures.landmarks) : [];
    const acceleration = previousFeatures ? this.calculateAcceleration(velocity, previousFeatures.velocity) : [];
    
    // 分析手指状态
    const fingerStates = this.analyzeFingerStates(landmarks);
    
    // 计算手势区域
    const gestureArea = boundingBox.width * boundingBox.height;

    const features: GestureFeatures = {
      handedness: 'Right', // 简化处理，实际应该从MediaPipe获取
      landmarks,
      velocity,
      acceleration,
      fingerStates,
      gestureArea,
      centroid,
      boundingBox
    };

    // 添加到历史记录
    this.featureHistory.push(features);
    if (this.featureHistory.length > this.maxHistoryLength) {
      this.featureHistory.shift();
    }

    return features;
  }

  /**
   * 分析手势意图
   */
  async analyzeGestureIntent(features: GestureFeatures, context: GestureContext): Promise<AIGestureResult> {
    try {
      if (!this.isModelLoaded || !this.model) {
        return this.fallbackAnalysis(features, context);
      }

      // 准备输入数据
      const inputData = this.prepareInputData(features);
      const prediction = this.model.predict(inputData) as tf.Tensor;
      const probabilities = await prediction.data();
      
      // 获取最高概率的手势
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const confidence = probabilities[maxIndex];
      
      // 映射到手势意图
      const gestureIntents = [
        'zoom_in', 'zoom_out', 'move_up', 'move_down', 
        'move_left', 'move_right', 'reset_view', 'clear_canvas',
        'auto_layout', 'select_all'
      ];
      
      const intent = gestureIntents[maxIndex] || 'idle';
      
      // 清理张量
      inputData.dispose();
      prediction.dispose();

      return {
        intent,
        confidence,
        suggestedAction: this.mapIntentToAction(intent, context),
        parameters: this.extractActionParameters(intent, features, context),
        reasoning: `AI模型预测手势为 ${intent}，置信度 ${(confidence * 100).toFixed(1)}%`
      };

    } catch (error) {
      console.error('[GestureAIAnalyzer] AI分析失败:', error);
      return this.fallbackAnalysis(features, context);
    }
  }

  /**
   * 准备模型输入数据
   */
  private prepareInputData(features: GestureFeatures): tf.Tensor {
    const flatData: number[] = [];
    
    // 将21个关键点的坐标展平
    features.landmarks.forEach(point => {
      flatData.push(point.x, point.y, point.z, 1.0); // 添加置信度
    });
    
    return tf.tensor2d([flatData], [1, 84]);
  }

  /**
   * 回退分析（基于规则）
   */
  private fallbackAnalysis(features: GestureFeatures, context: GestureContext): AIGestureResult {
    // 基于规则的简单手势识别
    const { fingerStates, gestureArea, centroid } = features;
    
    // 拳头手势 - 重置视图
    if (this.isAllFingersBent(fingerStates)) {
      return {
        intent: 'reset_view',
        confidence: 0.8,
        suggestedAction: '重置画布视图到默认状态',
        reasoning: '检测到拳头手势，建议重置视图'
      };
    }
    
    // 张开手掌 - 清空画布
    if (this.isAllFingersExtended(fingerStates)) {
      return {
        intent: 'clear_canvas',
        confidence: 0.7,
        suggestedAction: '清空画布内容',
        reasoning: '检测到张开手掌，建议清空画布'
      };
    }
    
    // 食指指向 - 选择操作
    if (fingerStates.index === 'extended' && this.isOtherFingersBent(fingerStates, 'index')) {
      return {
        intent: 'select_all',
        confidence: 0.6,
        suggestedAction: '选择所有模块',
        reasoning: '检测到食指指向，建议选择操作'
      };
    }
    
    // 默认返回空闲状态
    return {
      intent: 'idle',
      confidence: 0.5,
      suggestedAction: '无特定操作',
      reasoning: '未识别出明确的手势意图'
    };
  }

  /**
   * 计算手势中心点
   */
  private calculateCentroid(landmarks: Array<{ x: number; y: number; z: number }>): { x: number; y: number } {
    const sum = landmarks.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    
    return {
      x: sum.x / landmarks.length,
      y: sum.y / landmarks.length
    };
  }

  /**
   * 计算边界框
   */
  private calculateBoundingBox(landmarks: Array<{ x: number; y: number; z: number }>) {
    const xs = landmarks.map(p => p.x);
    const ys = landmarks.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 计算速度
   */
  private calculateVelocity(
    currentLandmarks: Array<{ x: number; y: number; z: number }>,
    previousLandmarks: Array<{ x: number; y: number; z: number }>
  ): Array<{ x: number; y: number }> {
    return currentLandmarks.map((current, index) => {
      const previous = previousLandmarks[index];
      if (!previous) return { x: 0, y: 0 };
      
      return {
        x: current.x - previous.x,
        y: current.y - previous.y
      };
    });
  }

  /**
   * 计算加速度
   */
  private calculateAcceleration(
    currentVelocity: Array<{ x: number; y: number }>,
    previousVelocity: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> {
    return currentVelocity.map((current, index) => {
      const previous = previousVelocity[index];
      if (!previous) return { x: 0, y: 0 };
      
      return {
        x: current.x - previous.x,
        y: current.y - previous.y
      };
    });
  }

  /**
   * 分析手指状态
   */
  private analyzeFingerStates(landmarks: Array<{ x: number; y: number; z: number }>) {
    // MediaPipe手部关键点索引
    const fingerTips = [4, 8, 12, 16, 20]; // 拇指、食指、中指、无名指、小指尖端
    const fingerMCPs = [2, 5, 9, 13, 17]; // 对应的MCP关节
    
    return {
      thumb: this.isFingerExtended(landmarks, 4, 2) ? 'extended' : 'bent',
      index: this.isFingerExtended(landmarks, 8, 5) ? 'extended' : 'bent',
      middle: this.isFingerExtended(landmarks, 12, 9) ? 'extended' : 'bent',
      ring: this.isFingerExtended(landmarks, 16, 13) ? 'extended' : 'bent',
      pinky: this.isFingerExtended(landmarks, 20, 17) ? 'extended' : 'bent'
    } as const;
  }

  /**
   * 判断手指是否伸展
   */
  private isFingerExtended(landmarks: Array<{ x: number; y: number; z: number }>, tipIndex: number, mcpIndex: number): boolean {
    const tip = landmarks[tipIndex];
    const mcp = landmarks[mcpIndex];
    
    if (!tip || !mcp) return false;
    
    // 简单判断：指尖是否在MCP关节上方
    return tip.y < mcp.y;
  }

  /**
   * 检查是否所有手指都弯曲
   */
  private isAllFingersBent(fingerStates: GestureFeatures['fingerStates']): boolean {
    return Object.values(fingerStates).every(state => state === 'bent');
  }

  /**
   * 检查是否所有手指都伸展
   */
  private isAllFingersExtended(fingerStates: GestureFeatures['fingerStates']): boolean {
    return Object.values(fingerStates).every(state => state === 'extended');
  }

  /**
   * 检查除指定手指外其他手指是否都弯曲
   */
  private isOtherFingersBent(fingerStates: GestureFeatures['fingerStates'], exceptFinger: keyof GestureFeatures['fingerStates']): boolean {
    return Object.entries(fingerStates)
      .filter(([finger]) => finger !== exceptFinger)
      .every(([, state]) => state === 'bent');
  }

  /**
   * 将意图映射到具体操作
   */
  private mapIntentToAction(intent: string, context: GestureContext): string {
    const actionMap: Record<string, string> = {
      zoom_in: '放大画布视图',
      zoom_out: '缩小画布视图',
      move_up: '向上移动画布',
      move_down: '向下移动画布',
      move_left: '向左移动画布',
      move_right: '向右移动画布',
      reset_view: '重置画布视图',
      clear_canvas: '清空画布内容',
      auto_layout: '自动排列模块',
      select_all: '选择所有模块',
      idle: '无操作'
    };
    
    return actionMap[intent] || '未知操作';
  }

  /**
   * 提取操作参数
   */
  private extractActionParameters(intent: string, features: GestureFeatures, context: GestureContext): Record<string, any> {
    const params: Record<string, any> = {};
    
    // 根据手势强度调整参数
    const intensity = Math.min(features.gestureArea * 10, 1.0);
    
    switch (intent) {
      case 'zoom_in':
      case 'zoom_out':
        params.factor = 1.0 + intensity * 0.5;
        break;
      case 'move_up':
      case 'move_down':
      case 'move_left':
      case 'move_right':
        params.distance = 50 + intensity * 100;
        break;
    }
    
    return params;
  }

  /**
   * 获取手势历史
   */
  getGestureHistory(): GestureFeatures[] {
    return [...this.featureHistory];
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.featureHistory = [];
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.featureHistory = [];
    this.isModelLoaded = false;
  }
}

// 单例实例
export const gestureAIAnalyzer = new GestureAIAnalyzer();