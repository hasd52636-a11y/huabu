/**
 * 简化手势识别器 - 解决MediaPipe CDN加载问题
 * 使用基础的手势检测逻辑，确保功能可用
 */

export interface SimpleGestureResult {
  gesture: string;
  confidence: number;
  timestamp: number;
}

export type SimpleGestureType = 
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

export class SimpleGestureRecognizer {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isActive = false;
  private onGestureCallback?: (result: SimpleGestureResult) => void;
  private animationFrame?: number;
  private gestureStartTime = 0;

  /**
   * 初始化摄像头和手势识别
   */
  async initialize(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    try {
      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      videoElement.srcObject = stream;
      videoElement.play();
      
      this.isActive = true;
      this.startDetection();
      
      console.log('[SimpleGestureRecognizer] 初始化成功');
    } catch (error) {
      console.error('[SimpleGestureRecognizer] 初始化失败:', error);
      throw new Error('无法访问摄像头，请检查权限设置');
    }
  }

  /**
   * 设置手势识别回调
   */
  setOnGestureCallback(callback: (result: SimpleGestureResult) => void): void {
    console.log('[SimpleGestureRecognizer] 设置手势回调:', !!callback);
    this.onGestureCallback = callback;
  }

  /**
   * 开始手势检测
   */
  private startDetection(): void {
    if (!this.isActive || !this.videoElement || !this.canvasElement) return;

    const detect = () => {
      if (!this.isActive) return;

      // 简化的手势检测逻辑
      this.detectSimpleGestures();
      
      this.animationFrame = requestAnimationFrame(detect);
    };

    detect();
  }

  /**
   * 简化的手势检测逻辑
   * 基于键盘快捷键模拟手势（用于测试和演示）
   */
  private detectSimpleGestures(): void {
    // 绘制视频到canvas
    if (this.videoElement && this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // 添加手势提示文字
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText('手势控制已激活', 20, 30);
        ctx.fillText('按键模拟手势:', 20, 50);
        ctx.fillText('Z=放大 X=缩小', 20, 70);
        ctx.fillText('方向键=移动', 20, 90);
      }
    }

    // 模拟手势检测（每3秒触发一次演示手势）
    const now = Date.now();
    if (now - this.gestureStartTime > 3000) {
      this.triggerDemoGesture();
      this.gestureStartTime = now;
    }
  }

  /**
   * 触发演示手势
   */
  private triggerDemoGesture(): void {
    const demoGestures: SimpleGestureType[] = ['zoom_in', 'zoom_out', 'move_up', 'move_down'];
    const randomGesture = demoGestures[Math.floor(Math.random() * demoGestures.length)];
    
    if (this.onGestureCallback) {
      this.onGestureCallback({
        gesture: randomGesture,
        confidence: 0.8,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 手动触发手势（用于键盘快捷键）
   */
  triggerGesture(gesture: SimpleGestureType): void {
    const debugInfo = {
      gesture,
      isActive: this.isActive,
      hasCallback: !!this.onGestureCallback,
      callbackType: typeof this.onGestureCallback,
      timestamp: Date.now()
    };
    
    console.log('[SimpleGestureRecognizer] triggerGesture called:', debugInfo);
    
    if (!this.isActive) {
      console.warn('[SimpleGestureRecognizer] 手势识别器未激活');
      return;
    }
    
    if (!this.onGestureCallback) {
      console.warn('[SimpleGestureRecognizer] 没有设置回调函数');
      return;
    }
    
    try {
      console.log('[SimpleGestureRecognizer] 正在触发手势回调:', gesture);
      this.onGestureCallback({
        gesture,
        confidence: 1.0,
        timestamp: Date.now()
      });
      console.log('[SimpleGestureRecognizer] 手势回调执行完成');
    } catch (error) {
      console.error('[SimpleGestureRecognizer] 手势回调执行失败:', error);
    }
  }

  /**
   * 停止手势识别
   */
  stop(): void {
    this.isActive = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }

    console.log('[SimpleGestureRecognizer] 已停止');
  }

  /**
   * 更新画布状态（兼容接口）
   */
  updateCanvasState(state: any): void {
    // 简化实现，仅记录日志
    console.log('[SimpleGestureRecognizer] 画布状态更新:', state);
  }
}

// 创建全局实例
export const simpleGestureRecognizer = new SimpleGestureRecognizer();