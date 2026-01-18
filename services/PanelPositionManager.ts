/**
 * PanelPositionManager - 面板位置管理器
 * 从AUTOCANVAS智慧画布项目移植，管理浮动面板的位置和状态
 */

export interface PanelPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

export interface PanelState {
  id: string;
  position: PanelPosition;
  isVisible: boolean;
  isMinimized: boolean;
  isDocked: boolean;
  dockSide?: 'left' | 'right' | 'top' | 'bottom';
}

export class PanelPositionManager {
  private panels = new Map<string, PanelState>();
  private dragState: {
    panelId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null = null;

  private readonly STORAGE_KEY = 'panel-positions';
  private readonly DOCK_THRESHOLD = 50; // 靠近边缘多少像素时自动吸附

  constructor() {
    this.loadPositions();
    this.setupEventListeners();
  }

  /**
   * 注册面板
   */
  registerPanel(
    id: string, 
    initialPosition: PanelPosition,
    options: {
      isVisible?: boolean;
      isMinimized?: boolean;
      isDocked?: boolean;
      dockSide?: 'left' | 'right' | 'top' | 'bottom';
    } = {}
  ): void {
    const existingPanel = this.panels.get(id);
    
    this.panels.set(id, {
      id,
      position: existingPanel?.position || initialPosition,
      isVisible: options.isVisible ?? true,
      isMinimized: options.isMinimized ?? false,
      isDocked: options.isDocked ?? false,
      dockSide: options.dockSide
    });

    this.savePositions();
  }

  /**
   * 获取面板状态
   */
  getPanelState(id: string): PanelState | undefined {
    return this.panels.get(id);
  }

  /**
   * 更新面板位置
   */
  updatePanelPosition(id: string, position: Partial<PanelPosition>): void {
    const panel = this.panels.get(id);
    if (!panel) return;

    panel.position = { ...panel.position, ...position };
    
    // 检查是否需要自动吸附到边缘
    this.checkDocking(panel);
    
    this.panels.set(id, panel);
    this.savePositions();
  }

  /**
   * 显示/隐藏面板
   */
  togglePanelVisibility(id: string, isVisible?: boolean): void {
    const panel = this.panels.get(id);
    if (!panel) return;

    panel.isVisible = isVisible ?? !panel.isVisible;
    this.panels.set(id, panel);
    this.savePositions();
  }

  /**
   * 最小化/还原面板
   */
  togglePanelMinimized(id: string, isMinimized?: boolean): void {
    const panel = this.panels.get(id);
    if (!panel) return;

    panel.isMinimized = isMinimized ?? !panel.isMinimized;
    this.panels.set(id, panel);
    this.savePositions();
  }

  /**
   * 开始拖拽面板
   */
  startDrag(id: string, startX: number, startY: number): void {
    const panel = this.panels.get(id);
    if (!panel) return;

    this.dragState = {
      panelId: id,
      startX,
      startY,
      initialX: panel.position.x,
      initialY: panel.position.y
    };

    // 如果面板是停靠的，取消停靠
    if (panel.isDocked) {
      panel.isDocked = false;
      panel.dockSide = undefined;
    }
  }

  /**
   * 拖拽过程中更新位置
   */
  updateDrag(currentX: number, currentY: number): void {
    if (!this.dragState) return;

    const { panelId, startX, startY, initialX, initialY } = this.dragState;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    this.updatePanelPosition(panelId, {
      x: initialX + deltaX,
      y: initialY + deltaY
    });
  }

  /**
   * 结束拖拽
   */
  endDrag(): void {
    this.dragState = null;
  }

  /**
   * 检查是否需要自动吸附到边缘
   */
  private checkDocking(panel: PanelState): void {
    const { x, y, width = 300, height = 200 } = panel.position;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 检查左边缘
    if (x < this.DOCK_THRESHOLD) {
      panel.position.x = 0;
      panel.isDocked = true;
      panel.dockSide = 'left';
      return;
    }

    // 检查右边缘
    if (x + width > windowWidth - this.DOCK_THRESHOLD) {
      panel.position.x = windowWidth - width;
      panel.isDocked = true;
      panel.dockSide = 'right';
      return;
    }

    // 检查顶部边缘
    if (y < this.DOCK_THRESHOLD) {
      panel.position.y = 0;
      panel.isDocked = true;
      panel.dockSide = 'top';
      return;
    }

    // 检查底部边缘
    if (y + height > windowHeight - this.DOCK_THRESHOLD) {
      panel.position.y = windowHeight - height;
      panel.isDocked = true;
      panel.dockSide = 'bottom';
      return;
    }

    // 如果不在任何边缘附近，取消停靠
    panel.isDocked = false;
    panel.dockSide = undefined;
  }

  /**
   * 自动排列面板
   */
  autoArrangePanels(): void {
    const visiblePanels = Array.from(this.panels.values()).filter(p => p.isVisible);
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    visiblePanels.forEach((panel, index) => {
      const cols = Math.ceil(Math.sqrt(visiblePanels.length));
      const rows = Math.ceil(visiblePanels.length / cols);
      
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const panelWidth = Math.min(400, windowWidth / cols - 20);
      const panelHeight = Math.min(300, windowHeight / rows - 20);
      
      panel.position = {
        x: col * (panelWidth + 20) + 10,
        y: row * (panelHeight + 20) + 10,
        width: panelWidth,
        height: panelHeight
      };
      
      panel.isDocked = false;
      panel.dockSide = undefined;
    });

    this.savePositions();
  }

  /**
   * 重置所有面板位置
   */
  resetAllPositions(): void {
    this.panels.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 保存位置到本地存储
   */
  private savePositions(): void {
    try {
      const data = Array.from(this.panels.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save panel positions:', error);
    }
  }

  /**
   * 从本地存储加载位置
   */
  private loadPositions(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.panels = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load panel positions:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 窗口大小改变时重新检查停靠
    window.addEventListener('resize', () => {
      for (const panel of this.panels.values()) {
        if (panel.isDocked) {
          this.checkDocking(panel);
        }
      }
      this.savePositions();
    });

    // 全局鼠标事件处理拖拽
    document.addEventListener('mousemove', (e) => {
      if (this.dragState) {
        this.updateDrag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.dragState) {
        this.endDrag();
      }
    });
  }

  /**
   * 获取所有面板状态
   */
  getAllPanels(): PanelState[] {
    return Array.from(this.panels.values());
  }

  /**
   * 获取可见面板数量
   */
  getVisiblePanelCount(): number {
    return Array.from(this.panels.values()).filter(p => p.isVisible).length;
  }
}

// 单例实例
export const panelPositionManager = new PanelPositionManager();