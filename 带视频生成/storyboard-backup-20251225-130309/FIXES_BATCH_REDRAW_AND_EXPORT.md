# 批量重绘和分镜合成导出修复

## 问题描述

### 问题 1: 分镜合成下载没有在线生成的分镜图
**症状**: 导出的 JPEG 文件中缺少在线生成的分镜图片，只显示占位符或失败提示。

**根本原因**: `loadAndDrawImage` 函数对所有图片 URL 都设置了 `crossOrigin="anonymous"`。这对于 data URLs（在线生成的图片）是不必要的，而且可能导致加载失败。

**解决方案**: 修改 `loadAndDrawImage` 函数，只对非 data URL 的图片设置 `crossOrigin` 属性。

```typescript
// 修改前
const img = new Image();
img.crossOrigin = "anonymous";  // 对所有 URL 都设置

// 修改后
const img = new Image();
// 只对非 data URL 设置 crossOrigin
if (!url.startsWith('data:')) {
  img.crossOrigin = "anonymous";
}
```

### 问题 2: 批量重绘对话框缺少清晰的缩略图显示
**症状**: 批量重绘对话框中的分镜缩略图显示不够清晰，用户难以快速识别要编辑的分镜。

**改进方案**: 优化批量重绘对话框的 UI：
- 增加当前选中分镜的大预览（带序号标签）
- 改进缩略图网格显示（4 列布局，带序号标签）
- 增加视觉反馈（选中时显示紫色边框和光环）
- 保留原始提示词预览

## 修改文件

### 1. App.tsx
**位置**: `handleExportJPEG` 函数中的 `loadAndDrawImage` 函数

**修改内容**:
```typescript
const loadAndDrawImage = async (url: string, x: number, y: number, w: number, h: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    // 只对非 data URL 设置 crossOrigin
    if (!url.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    // ... 其余代码保持不变
  });
};
```

### 2. components/BatchRedrawDialog.tsx
**位置**: 左侧预览区域

**改进内容**:
- 增加当前选中分镜的大预览（带紫色边框和序号标签）
- 改进缩略图网格：
  - 4 列布局，更紧凑
  - 每个缩略图带序号标签
  - 选中时显示紫色边框和光环效果
  - 悬停时有缩放动画
- 保留原始提示词预览

## 测试建议

### 测试 1: 分镜合成导出
1. 在画布上生成几个分镜（使用脚本或对话模式）
2. 选择这些分镜
3. 点击"分镜合成下载"
4. 验证导出的 JPEG 文件中包含所有分镜图片

### 测试 2: 批量重绘对话框
1. 选择多个分镜
2. 点击"批量重绘"
3. 验证：
   - 左侧显示当前选中分镜的大预览
   - 缩略图网格清晰显示所有分镜
   - 点击缩略图可以切换预览
   - 序号标签清晰可见

## 技术细节

### Data URL vs 外部 URL
- **Data URL**: `data:image/png;base64,...` 格式，不需要 CORS
- **外部 URL**: `https://...` 格式，需要 CORS 才能在 Canvas 中使用

### Canvas 图片加载限制
- Canvas 中的图片必须满足 CORS 要求，否则会被污染（tainted）
- 污染的 Canvas 无法导出为图片
- Data URL 不受 CORS 限制，可以直接使用

## 性能影响
- 最小化：只是条件判断，不增加额外开销
- 实际上改进了性能：避免了不必要的 CORS 请求

## 兼容性
- 所有现代浏览器都支持 data URL
- 所有现代浏览器都支持 Canvas 导出
- 无兼容性问题
