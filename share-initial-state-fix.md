# 分享初始状态同步修复

## 问题描述

用户反馈分享功能存在问题：
- 分享按钮可以创建分享链接
- 但观看者打开分享链接时只看到空白页面，没有实时内容同步
- 观看者无法看到主机当前的画布状态

## 根本原因

经过分析发现问题的根本原因是：**缺少初始状态同步机制**

1. **新观看者连接时没有接收初始状态**：当观看者通过分享链接连接时，只能接收到连接后的数据更新，但无法获取连接前已存在的画布内容
2. **主机没有存储当前状态**：ShareManager 没有保存当前画布状态，无法在新观看者连接时发送
3. **缺少新观看者连接事件处理**：系统没有检测新观看者连接并主动发送初始状态

## 修复方案

### 1. 更新 ShareManager.ts

**添加状态存储和新观看者回调：**
- 添加 `currentState` 属性存储当前画布状态
- 添加 `onNewViewerCallback` 处理新观看者连接事件
- 在 `handleIncomingConnection` 中检测新观看者并触发回调
- 添加 `sendToSpecificViewer` 方法向特定观看者发送数据

**关键改动：**
```typescript
// 存储当前状态
private currentState: any = null;
private onNewViewerCallback: ((viewerId: string) => void) | null = null;

// 新观看者连接时发送初始状态
conn.on('open', () => {
  // ... 现有代码 ...
  if (this.currentState && this.onNewViewerCallback) {
    this.onNewViewerCallback(conn.peer);
  }
});

// 广播时存储状态
public broadcast(data: any, type: ShareableData['type'] = 'state-update'): void {
  this.currentState = data; // 存储当前状态
  // ... 广播逻辑 ...
}
```

### 2. 更新 ShareProvider.tsx

**添加初始状态同步逻辑：**
- 使用 `currentDataRef` 存储当前数据
- 在 `createShare` 时设置新观看者回调
- 新观看者连接时自动发送当前状态

**关键改动：**
```typescript
const currentDataRef = useRef<any>(null);

// 创建分享时设置回调
manager.setCallbacks({
  // ... 现有回调 ...
  onNewViewer: (viewerId) => {
    if (currentDataRef.current && manager) {
      manager.sendToSpecificViewer(viewerId, currentDataRef.current, 'initial-state');
    }
  }
});

// 同步数据时存储当前状态
const syncData = (data: any) => {
  if (session.isHost && managerRef.current) {
    currentDataRef.current = data;
    managerRef.current.broadcast(data);
  }
};
```

### 3. 更新 types.ts

**添加新的数据类型：**
```typescript
type?: 'state-update' | 'cursor-move' | 'action' | 'initial-state';
```

### 4. 更新 ToolbarShareButton.tsx

**修复中文字符问题和添加初始数据：**
- 使用英文标题避免 PeerJS ID 验证错误
- 创建分享时传递当前画布数据作为初始状态
- 添加调试日志帮助排查问题

## 修复效果

修复后的分享功能将实现：

1. **完整的初始状态同步**：新观看者连接时立即接收当前画布的完整状态
2. **实时数据同步**：观看者可以看到主机的实时操作
3. **稳定的连接**：避免中文字符导致的 PeerJS 错误
4. **调试支持**：添加详细日志帮助排查问题

## 测试方法

1. 打开主应用 `http://localhost:3005/`
2. 创建一些内容（文本块、图片等）
3. 点击分享按钮创建分享链接
4. 在新标签页中打开分享链接
5. 验证观看者能看到：
   - 主机当前的所有画布内容（初始状态）
   - 主机的实时操作（实时同步）

## 技术细节

- **P2P 连接**：使用 PeerJS 建立点对点连接
- **状态管理**：React Context + useRef 管理状态
- **数据结构**：包含 blocks, connections, zoom, pan 等完整画布状态
- **错误处理**：PeerJS ID 必须使用英文字符，避免验证错误