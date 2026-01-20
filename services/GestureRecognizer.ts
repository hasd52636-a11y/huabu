/**
 * 手势识别服务
 * 使用MediaPipe Hands进行实时手势识别，结合AI分析器进行智能手势理解
 */

import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { gestureAIAnalyzer, GestureFeatures, GestureContext, AIGestureResult } from './GestureAIAnalyzer';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureResult {
  gesture: string;
  confidence: number;
  hands: HandLandmark[][];
  timestamp: number;
  aiAnalysis?: AIGestureResult;
  reasoning?: string;
}

export type GestureType = 
  | 'zoom_in'      // 双手张开
  | 'zoom_out'     // 双手合拢
  | 'move_up'      // 单手向上
  | 'move_down'    // 单手向下
  | 'move_left'    // 单手向左
  | 'move_right'   // 单手向右
  | 'reset_view'   // 双手摇摆
  | 'clear_canvas' // 停止手势
  | 'auto_layout'  // 拍手
  | 'select_all'   // 双手环抱
  | 'idle';        // 无手势

export class GestureRecognizer {
  private hands: Hands;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isActive = false;
  private lastGesture: GestureType = 'idle';
  private gestureStartTime = 0;
  private readonly GESTURE_HOLD_TIME = 500; // 手势持续时间阈值(ms)
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  
  private onGestureCallback?: (result: GestureResult) => void;
  private gestureHistory: GestureType[] = [];
  private readonly HISTORY_SIZE = 5;
  
  // AI增强功能
  private previousFeatures: GestureFeatures | null = null;
  private canvasState = {
    blockCount: 0,
    selectedCount: 0,
    hasContent: false,
    zoomLevel: 1.0,
    panPosition: { x: 0, y: 0 }
  };
  private userHistory = {
    recentGestures: [] as string[],
    preferredIntensity: 0.5,
    commonPatterns: [] as string[]
  };
  private sessionContext = {
    duration: 0,
    gestureCount: 0,
    errorRate: 0
  };

  constructor() {
    this.hands = new Hands({
      locateFile: (file) => {
        // 使用更稳定的CDN源，并添加fallback
        const cdnSources = [
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
          `https://unpkg.com/@mediapipe/hands@0.4.1646424915/${file}`,
          `https://cdn.skypack.dev/@mediapipe/hands@0.4.1646424915/${file}`
        ];
        return cdnSources[0]; // 先尝试第一个
      }
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0, // 降低复杂度提高性能
      minDetectionConfidence: 0.7, // 提高检测阈值
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  /**
   * 初始化摄像头和手势识别
   */
  async initialize(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    try {
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.isActive) {
            await this.hands.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isActive = true;
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      throw new Error('无法访问摄像头，请检查权限设置');
    }
  }

  /**
   * 设置手势识别回调
   */
  setOnGestureCallback(callback: (result: GestureResult) => void): void {
    this.onGestureCallback = callback;
  }

  /**
   * 更新画布状态（供外部调用）
   */
  updateCanvasState(state: {
    blockCount?: number;
    selectedCount?: number;
    hasContent?: boolean;
    zoomLevel?: number;
    panPosition?: { x: number; y: number };
  }): void {
    this.canvasState = { ...this.canvasState, ...state };
  }

  /**
   * 处理MediaPipe识别结果
   */
  private async onResults(results: Results): Promise<void> {
    if (!this.canvasElement || !this.isActive) return;

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // 绘制手部关键点
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        this.drawLandmarks(ctx, landmarks);
      }
    }

    // 使用AI分析器进行智能手势识别
    const gesture = await this.recognizeGestureWithAI(results.multiHandLandmarks || []);
    this.processGesture(gesture, results.multiHandLandmarks || []);
  }

  /**
   * 使用AI分析器进行智能手势识别
   */
  private async recognizeGestureWithAI(handsLandmarks: HandLandmark[][]): Promise<{
    gesture: GestureType;
    confidence: number;
    aiAnalysis?: AIGestureResult;
    reasoning?: string;
  }> {
    try {
      // 提取手势特征
      const features = gestureAIAnalyzer.extractFeatures(handsLandmarks, this.previousFeatures || undefined);
      this.previousFeatures = features;

      // 构建上下文
      const context: GestureContext = {
        canvasState: this.canvasState,
        userHistory: this.userHistory,
        sessionContext: this.sessionContext
      };

      // AI分析手势意图
      const aiAnalysis = await gestureAIAnalyzer.analyzeGestureIntent(features, context);

      // 映射AI意图到手势类型
      const mappedGesture = this.mapAIIntentToGesture(aiAnalysis.primaryIntent);

      return {
        gesture: mappedGesture,
        confidence: aiAnalysis.confidence,
        aiAnalysis,
        reasoning: aiAnalysis.reasoning
      };
    } catch (error) {
      console.error('[GestureRecognizer] AI analysis failed, falling back to rule-based:', error);
      // 回退到基于规则的识别
      const fallbackGesture = this.recognizeGesture(handsLandmarks);
      return {
        gesture: fallbackGesture,
        confidence: this.CONFIDENCE_THRESHOLD,
        reasoning: 'Fallback to rule-based recognition'
      };
    }
  }

  /**
   * 映射AI意图到手势类型
   */
  private mapAIIntentToGesture(intent: string): GestureType {
    const intentMapping: { [key: string]: GestureType } = {
      'zoom_in': 'zoom_in',
      'zoom_out': 'zoom_out',
      'pan_up': 'move_up',
      'pan_down': 'move_down',
      'pan_left': 'move_left',
      'pan_right': 'move_right',
      'reset_view': 'reset_view',
      'clear_canvas': 'clear_canvas',
      'auto_layout': 'auto_layout',
      'select_all': 'select_all',
      'idle': 'idle'
    };

    return intentMapping[intent] || 'idle';
  }

  /**
   * 绘制手部关键点
   */
  private drawLandmarks(ctx: CanvasRenderingContext2D, landmarks: HandLandmark[]): void {
    // 绘制手部连线
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
      [0, 5], [5, 6], [6, 7], [7, 8], // 食指
      [0, 9], [9, 10], [10, 11], [11, 12], // 中指
      [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
      [0, 17], [17, 18], [18, 19], [19, 20], // 小指
      [5, 9], [9, 13], [13, 17] // 手掌连线
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * this.canvasElement!.width, startPoint.y * this.canvasElement!.height);
      ctx.lineTo(endPoint.x * this.canvasElement!.width, endPoint.y * this.canvasElement!.height);
      ctx.stroke();
    });

    // 绘制关键点
    ctx.fillStyle = '#ff0000';
    landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * this.canvasElement!.width,
        landmark.y * this.canvasElement!.height,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  /**
   * 识别手势
   */
  private recognizeGesture(handsLandmarks: HandLandmark[][]): GestureType {
    if (handsLandmarks.length === 0) {
      return 'idle';
    }

    if (handsLandmarks.length === 2) {
      // 双手手势
      return this.recognizeTwoHandGesture(handsLandmarks[0], handsLandmarks[1]);
    } else {
      // 单手手势
      return this.recognizeOneHandGesture(handsLandmarks[0]);
    }
  }

  /**
   * 识别双手手势
   */
  private recognizeTwoHandGesture(leftHand: HandLandmark[], rightHand: HandLandmark[]): GestureType {
    // 计算双手距离
    const leftCenter = this.getHandCenter(leftHand);
    const rightCenter = this.getHandCenter(rightHand);
    const distance = Math.sqrt(
      Math.pow(leftCenter.x - rightCenter.x, 2) + 
      Math.pow(leftCenter.y - rightCenter.y, 2)
    );

    // 检查是否为放大手势（双手张开）
    if (distance > 0.3 && this.areHandsOpen(leftHand) && this.areHandsOpen(rightHand)) {
      return 'zoom_in';
    }

    // 检查是否为缩小手势（双手合拢）
    if (distance < 0.15 && this.areHandsClosed(leftHand) && this.areHandsClosed(rightHand)) {
      return 'zoom_out';
    }

    // 检查是否为重置手势（双手摇摆）
    if (this.areHandsWaving(leftHand, rightHand)) {
      return 'reset_view';
    }

    // 检查是否为拍手手势
    if (this.isClapping(leftHand, rightHand)) {
      return 'auto_layout';
    }

    // 检查是否为环抱手势
    if (this.areHandsEmbracing(leftHand, rightHand)) {
      return 'select_all';
    }

    return 'idle';
  }

  /**
   * 识别单手手势
   */
  private recognizeOneHandGesture(hand: HandLandmark[]): GestureType {
    // 检查停止手势（手掌张开面向摄像头）
    if (this.isStopGesture(hand)) {
      return 'clear_canvas';
    }

    // 检查指向手势
    const pointingDirection = this.getPointingDirection(hand);
    if (pointingDirection) {
      switch (pointingDirection) {
        case 'up': return 'move_up';
        case 'down': return 'move_down';
        case 'left': return 'move_left';
        case 'right': return 'move_right';
      }
    }

    return 'idle';
  }

  /**
   * 获取手部中心点
   */
  private getHandCenter(hand: HandLandmark[]): { x: number; y: number } {
    const wrist = hand[0];
    const middleFinger = hand[12];
    return {
      x: (wrist.x + middleFinger.x) / 2,
      y: (wrist.y + middleFinger.y) / 2
    };
  }

  /**
   * 检查手是否张开
   */
  private areHandsOpen(hand: HandLandmark[]): boolean {
    // 检查所有手指是否伸直
    const fingerTips = [4, 8, 12, 16, 20]; // 拇指、食指、中指、无名指、小指尖
    const fingerBases = [3, 6, 10, 14, 18]; // 对应的基部关节
    
    let openFingers = 0;
    for (let i = 0; i < fingerTips.length; i++) {
      const tip = hand[fingerTips[i]];
      const base = hand[fingerBases[i]];
      
      // 检查手指是否伸直（tip在base上方）
      if (tip.y < base.y) {
        openFingers++;
      }
    }
    
    return openFingers >= 4; // 至少4个手指张开
  }

  /**
   * 检查手是否握拳
   */
  private areHandsClosed(hand: HandLandmark[]): boolean {
    return !this.areHandsOpen(hand);
  }

  /**
   * 检查是否为摇摆手势
   */
  private areHandsWaving(leftHand: HandLandmark[], rightHand: HandLandmark[]): boolean {
    // 简化实现：检查双手是否都在上方且张开
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    
    return leftWrist.y < 0.3 && rightWrist.y < 0.3 && 
           this.areHandsOpen(leftHand) && this.areHandsOpen(rightHand);
  }

  /**
   * 检查是否为拍手手势
   */
  private isClapping(leftHand: HandLandmark[], rightHand: HandLandmark[]): boolean {
    const leftCenter = this.getHandCenter(leftHand);
    const rightCenter = this.getHandCenter(rightHand);
    const distance = Math.sqrt(
      Math.pow(leftCenter.x - rightCenter.x, 2) + 
      Math.pow(leftCenter.y - rightCenter.y, 2)
    );
    
    // 双手靠近且都是张开状态
    return distance < 0.1 && this.areHandsOpen(leftHand) && this.areHandsOpen(rightHand);
  }

  /**
   * 检查是否为环抱手势
   */
  private areHandsEmbracing(leftHand: HandLandmark[], rightHand: HandLandmark[]): boolean {
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    
    // 双手在中间位置，形成环抱状
    return Math.abs(leftWrist.x - rightWrist.x) > 0.4 && 
           leftWrist.y > 0.3 && rightWrist.y > 0.3;
  }

  /**
   * 检查是否为停止手势
   */
  private isStopGesture(hand: HandLandmark[]): boolean {
    // 手掌张开，面向摄像头
    return this.areHandsOpen(hand) && hand[0].z > -0.1; // z值表示深度
  }

  /**
   * 获取指向方向
   */
  private getPointingDirection(hand: HandLandmark[]): 'up' | 'down' | 'left' | 'right' | null {
    const indexTip = hand[8];
    const indexMcp = hand[5];
    const wrist = hand[0];
    
    // 检查是否只有食指伸出
    const isPointing = this.isIndexFingerPointing(hand);
    if (!isPointing) return null;
    
    // 计算指向方向
    const dx = indexTip.x - wrist.x;
    const dy = indexTip.y - wrist.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * 检查是否只有食指伸出
   */
  private isIndexFingerPointing(hand: HandLandmark[]): boolean {
    const indexTip = hand[8];
    const indexMcp = hand[5];
    const middleTip = hand[12];
    const middleMcp = hand[9];
    
    // 食指伸直，中指弯曲
    return (indexTip.y < indexMcp.y) && (middleTip.y > middleMcp.y);
  }

  /**
   * 处理识别到的手势
   */
  private processGesture(gestureResult: {
    gesture: GestureType;
    confidence: number;
    aiAnalysis?: AIGestureResult;
    reasoning?: string;
  }, handsLandmarks: HandLandmark[][]): void {
    const now = Date.now();
    const { gesture, confidence, aiAnalysis, reasoning } = gestureResult;
    
    // 更新手势历史
    this.gestureHistory.push(gesture);
    if (this.gestureHistory.length > this.HISTORY_SIZE) {
      this.gestureHistory.shift();
    }
    
    // 更新用户历史
    if (gesture !== 'idle') {
      this.userHistory.recentGestures.push(gesture);
      if (this.userHistory.recentGestures.length > 10) {
        this.userHistory.recentGestures.shift();
      }
      this.sessionContext.gestureCount++;
    }
    
    // 检查手势稳定性
    const stableGesture = this.getStableGesture();
    
    if (stableGesture !== this.lastGesture) {
      this.lastGesture = stableGesture;
      this.gestureStartTime = now;
    }
    
    // 如果手势持续足够长时间，触发回调
    if (stableGesture !== 'idle' && 
        confidence >= this.CONFIDENCE_THRESHOLD &&
        now - this.gestureStartTime >= this.GESTURE_HOLD_TIME &&
        this.onGestureCallback) {
      
      this.onGestureCallback({
        gesture: stableGesture,
        confidence,
        hands: handsLandmarks,
        timestamp: now,
        aiAnalysis,
        reasoning
      });
      
      // 重置计时器，避免重复触发
      this.gestureStartTime = now + 1000;
    }
  }

  /**
   * 获取稳定的手势（基于历史记录）
   */
  private getStableGesture(): GestureType {
    if (this.gestureHistory.length < 3) return 'idle';
    
    // 统计最近几个手势的出现频率
    const counts: { [key: string]: number } = {};
    this.gestureHistory.slice(-3).forEach(gesture => {
      counts[gesture] = (counts[gesture] || 0) + 1;
    });
    
    // 返回出现频率最高的手势
    let maxCount = 0;
    let stableGesture: GestureType = 'idle';
    
    Object.entries(counts).forEach(([gesture, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stableGesture = gesture as GestureType;
      }
    });
    
    return maxCount >= 2 ? stableGesture : 'idle';
  }

  /**
   * 停止手势识别
   */
  stop(): void {
    this.isActive = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  /**
   * 重新开始手势识别
   */
  start(): void {
    this.isActive = true;
    if (this.camera) {
      this.camera.start();
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): { isActive: boolean; lastGesture: GestureType } {
    return {
      isActive: this.isActive,
      lastGesture: this.lastGesture
    };
  }
}

// 单例实例
export const gestureRecognizer = new GestureRecognizer();