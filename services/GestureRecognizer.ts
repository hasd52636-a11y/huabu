/**
 * 手势识别服务 - 基于MediaPipe和TensorFlow.js
 * 提供高精度的手势识别功能
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
  gesture: GestureType;
  confidence: number;
  landmarks?: HandLandmark[][];
  timestamp: number;
}

export type GestureType = 
  | 'zoom_in'      // 双手张开
  | 'zoom_out'     // 双手合拢
  | 'move_up'      // 单手向上
  | 'move_down'    // 单手向下
  | 'move_left'    // 单手向左
  | 'move_right'   // 单手向右
  | 'reset_view'   // 双手摆动
  | 'clear_canvas' // 双手交叉
  | 'auto_layout'  // 双手画圆
  | 'select_all'   // 双手合十
  | 'idle';        // 无手势

export class GestureRecognizer {
  private hands: Hands;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isActive: boolean = false;
  private onGestureCallback?: (result: GestureResult) => void;
  private lastGesture: GestureType = 'idle';
  private gestureStartTime: number = 0;
  private readonly GESTURE_HOLD_TIME = 1000; // 手势持续时间阈值
  private readonly CONFIDENCE_THRESHOLD = 0.7; // 置信度阈值
  private previousFeatures: GestureFeatures | null = null;

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
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));
  }

  /**
   * 初始化手势识别
   */
  async initialize(): Promise<void> {
    try {
      // 创建视频元素
      this.videoElement = document.createElement('video');
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);

      // 创建画布元素
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.style.display = 'none';
      document.body.appendChild(this.canvasElement);

      // 初始化摄像头
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isActive) {
            await this.hands.send({ image: this.videoElement! });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.startDetection();
      
      console.log('[GestureRecognizer] 初始化成功');
    } catch (error) {
      console.error('[GestureRecognizer] 初始化失败:', error);
      throw new Error('无法访问摄像头，请检查权限设置');
    }
  }

  /**
   * 设置手势回调函数
   */
  setOnGestureCallback(callback: ((result: GestureResult) => void) | null): void {
    console.log('[GestureRecognizer] 设置手势回调:', !!callback);
    this.onGestureCallback = callback || undefined;
  }

  /**
   * 开始检测
   */
  private startDetection(): void {
    this.isActive = true;
    console.log('[GestureRecognizer] 开始手势检测');
  }

  /**
   * 停止检测
   */
  stop(): void {
    this.isActive = false;
    
    if (this.camera) {
      this.camera.stop();
    }
    
    if (this.videoElement) {
      document.body.removeChild(this.videoElement);
      this.videoElement = null;
    }
    
    if (this.canvasElement) {
      document.body.removeChild(this.canvasElement);
      this.canvasElement = null;
    }

    console.log('[GestureRecognizer] 已停止');
  }

  /**
   * 处理MediaPipe结果
   */
  private async onResults(results: Results): Promise<void> {
    if (!this.isActive || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const handsLandmarks = results.multiHandLandmarks.map(landmarks => 
      landmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z || 0
      }))
    );

    try {
      // 提取手势特征
      const features = gestureAIAnalyzer.extractFeatures(handsLandmarks, this.previousFeatures || undefined);
      this.previousFeatures = features;

      // 构建上下文信息
      const context: GestureContext = {
        timestamp: Date.now(),
        previousGesture: this.lastGesture
      };

      // AI分析手势意图
      const aiAnalysis = await gestureAIAnalyzer.analyzeGestureIntent(features, context);

      // 映射AI意图到手势类型
      const gesture = this.mapAIIntentToGesture(aiAnalysis);
      
      const result: GestureResult = {
        gesture,
        confidence: aiAnalysis.confidence,
        landmarks: handsLandmarks,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[GestureRecognizer] AI analysis failed, falling back to rule-based:', error);
      // 回退到基于规则的识别
      const fallbackGesture = this.recognizeGesture(handsLandmarks);
      const result: GestureResult = {
        gesture: fallbackGesture,
        confidence: 0.8, // 基于规则的识别给予固定置信度
        landmarks: handsLandmarks,
        timestamp: Date.now()
      };
      this.processGestureResult(result);
    }
  }

  /**
   * 映射AI意图到手势类型
   */
  private mapAIIntentToGesture(aiResult: AIGestureResult): GestureType {
    const intentMap: { [key: string]: GestureType } = {
      'zoom_in': 'zoom_in',
      'zoom_out': 'zoom_out',
      'move_up': 'move_up',
      'move_down': 'move_down',
      'move_left': 'move_left',
      'move_right': 'move_right',
      'reset_view': 'reset_view',
      'clear_canvas': 'clear_canvas',
      'auto_layout': 'auto_layout',
      'select_all': 'select_all'
    };

    return intentMap[aiResult.intent] || 'idle';
  }

  /**
   * 基于规则的手势识别（回退方案）
   */
  private recognizeGesture(handsLandmarks: HandLandmark[][]): GestureType {
    if (handsLandmarks.length === 0) {
      return 'idle';
    }

    if (handsLandmarks.length === 1) {
      // 单手手势
      return this.recognizeSingleHandGesture(handsLandmarks[0]);
    } else if (handsLandmarks.length === 2) {
      // 双手手势
      return this.recognizeTwoHandGesture(handsLandmarks[0], handsLandmarks[1]);
    }

    return 'idle';
  }

  /**
   * 识别单手手势
   */
  private recognizeSingleHandGesture(landmarks: HandLandmark[]): GestureType {
    if (landmarks.length < 21) return 'idle';

    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // 计算手指是否伸直
    const indexExtended = this.isFingerExtended(landmarks, 8);
    const middleExtended = this.isFingerExtended(landmarks, 12);
    const ringExtended = this.isFingerExtended(landmarks, 16);
    const pinkyExtended = this.isFingerExtended(landmarks, 20);

    // 指向手势检测
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      const direction = this.getPointingDirection(wrist, indexTip);
      return direction;
    }

    return 'idle';
  }

  /**
   * 识别双手手势
   */
  private recognizeTwoHandGesture(leftHand: HandLandmark[], rightHand: HandLandmark[]): GestureType {
    if (leftHand.length < 21 || rightHand.length < 21) return 'idle';

    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftIndex = leftHand[8];
    const rightIndex = rightHand[8];

    // 计算双手距离
    const distance = this.calculateDistance(leftWrist, rightWrist);
    
    // 缩放手势检测
    if (distance > 0.3) {
      return 'zoom_in';
    } else if (distance < 0.15) {
      return 'zoom_out';
    }

    // 双手合十检测
    if (this.areHandsTogether(leftHand, rightHand)) {
      return 'select_all';
    }

    // 双手交叉检测
    if (this.areHandsCrossed(leftHand, rightHand)) {
      return 'clear_canvas';
    }

    return 'idle';
  }

  /**
   * 检测手指是否伸直
   */
  private isFingerExtended(landmarks: HandLandmark[], tipIndex: number): boolean {
    const tip = landmarks[tipIndex];
    const pip = landmarks[tipIndex - 2];
    const mcp = landmarks[tipIndex - 3];

    // 计算角度来判断手指是否伸直
    const angle = this.calculateAngle(mcp, pip, tip);
    return angle > 160; // 角度大于160度认为是伸直
  }

  /**
   * 获取指向方向
   */
  private getPointingDirection(wrist: HandLandmark, indexTip: HandLandmark): GestureType {
    const dx = indexTip.x - wrist.x;
    const dy = indexTip.y - wrist.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'move_right' : 'move_left';
    } else {
      return dy > 0 ? 'move_down' : 'move_up';
    }
  }

  /**
   * 计算两点距离
   */
  private calculateDistance(point1: HandLandmark, point2: HandLandmark): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 计算角度
   */
  private calculateAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    const cos = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  }

  /**
   * 检测双手是否合十
   */
  private areHandsTogether(leftHand: HandLandmark[], rightHand: HandLandmark[]): boolean {
    const leftPalm = leftHand[9]; // 中指MCP
    const rightPalm = rightHand[9];
    const distance = this.calculateDistance(leftPalm, rightPalm);
    return distance < 0.1;
  }

  /**
   * 检测双手是否交叉
   */
  private areHandsCrossed(leftHand: HandLandmark[], rightHand: HandLandmark[]): boolean {
    const leftWrist = leftHand[0];
    const rightWrist = rightHand[0];
    const leftIndex = leftHand[8];
    const rightIndex = rightHand[8];

    // 简单的交叉检测：左手食指在右手腕右侧，右手食指在左手腕左侧
    return leftIndex.x > rightWrist.x && rightIndex.x < leftWrist.x;
  }

  /**
   * 处理手势识别结果
   */
  private processGestureResult(result: GestureResult): void {
    if (result.confidence < this.CONFIDENCE_THRESHOLD) {
      return;
    }

    const now = Date.now();
    
    if (result.gesture !== this.lastGesture) {
      // 新手势开始
      this.lastGesture = result.gesture;
      this.gestureStartTime = now;
    } else if (result.gesture !== 'idle' && (now - this.gestureStartTime) >= this.GESTURE_HOLD_TIME) {
      // 手势持续足够时间，触发回调
      this.triggerGesture(result.gesture);
      this.gestureStartTime = now + this.GESTURE_HOLD_TIME; // 防止重复触发
    }
  }

  /**
   * 触发手势回调
   */
  private triggerGesture(gesture: GestureType): void {
    if (!this.isActive) {
      console.warn('[GestureRecognizer] 手势识别器未激活');
      return;
    }
    
    if (!this.onGestureCallback) {
      console.warn('[GestureRecognizer] 没有设置回调函数');
      return;
    }
    
    try {
      console.log('[GestureRecognizer] 正在触发手势回调:', gesture);
      this.onGestureCallback({
        gesture,
        confidence: 0.9,
        timestamp: Date.now()
      });
      console.log('[GestureRecognizer] 手势回调执行完成');
    } catch (error) {
      console.error('[GestureRecognizer] 手势回调执行失败:', error);
    }
  }

  /**
   * 手动触发手势（用于测试）
   */
  triggerGesture(gesture: GestureType): void {
    this.triggerGesture(gesture);
  }

  /**
   * 更新画布状态
   */
  updateCanvasState(state: any): void {
    // 更新AI分析器的上下文
    if (this.previousFeatures) {
      this.previousFeatures.canvasContext = {
        blockCount: state.blockCount || 0,
        selectedCount: state.selectedCount || 0,
        hasContent: state.hasContent || false,
        zoomLevel: state.zoomLevel || 1,
        panPosition: state.panPosition || { x: 0, y: 0 }
      };
    }
    console.log('[GestureRecognizer] 画布状态更新:', state);
  }
}

// 单例实例
export const gestureRecognizer = new GestureRecognizer();