# 分镜图导出 Tainted Canvas 问题修复

## 问题描述

导出分镜图时出现错误：
```
SecurityError: Failed to execute 'toBlob' on 'HTMLCanvasElement': 
Tainted canvases may not be exported.
```

## 根本原因

**Canvas 污染（Tainted Canvas）** 是浏览器的安全机制：
- 当从不同域（CDN、外部服务器）加载的图片被绘制到 Canvas 上时
- 如果这些图片没有正确的 CORS 头或 CORS 配置不当
- Canvas 会被标记为"污染"，禁止导出为图片

## 修复方案

### 1️⃣ 改进 CORS 处理

**修改前**：只尝试一种加载方式
```typescript
img.crossOrigin = "anonymous";
img.src = url;
```

**修改后**：多层级降级方案
```typescript
// 第一步：尝试 CORS 加载
img.crossOrigin = "anonymous";
img.src = url;

// 如果失败，第二步：尝试不使用 CORS 加载
fallbackImg.crossOrigin = null; // 移除 CORS 属性
fallbackImg.src = url;
```

### 2️⃣ 改进导出逻辑

**修改前**：直接使用 `toBlob`
```typescript
canvas.toBlob((blob) => {
  // 导出逻辑
}, 'image/jpeg', 0.9);
```

**修改后**：双重降级方案
```typescript
try {
  // 第一步：尝试 toBlob（推荐，更高效）
  canvas.toBlob((blob) => {
    // 导出逻辑
  }, 'image/jpeg', 0.9);
} catch (blobError) {
  // 第二步：如果 toBlob 失败，尝试 toDataURL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  // 使用 dataUrl 导出
}
```

## 修复后的行为

### ✅ 成功场景
- 所有图片都能正常加载 → 正常导出
- 部分图片加载失败 → 显示占位符，仍然导出

### ⚠️ 降级场景
- Canvas 被污染 → 自动尝试 `toDataURL` 降级方案
- 两种方法都失败 → 显示友好的错误提示

## 技术细节

### Canvas 污染的三种情况

| 情况 | 原因 | 解决方案 |
|------|------|---------|
| **CORS 错误** | 图片服务器没有 CORS 头 | 尝试不使用 CORS 加载 |
| **跨域加载** | 从不同域加载图片 | 确保图片服务器支持 CORS |
| **混合内容** | HTTP 页面加载 HTTPS 图片 | 使用 HTTPS 协议 |

### 浏览器安全机制

Canvas 污染是浏览器的安全特性，防止：
- 恶意网站窃取跨域图片内容
- 隐私泄露（如用户头像、私密图片）
- 跨站请求伪造（CSRF）

## 测试方法

### 测试场景 1：正常导出
1. 生成分镜图
2. 选择分镜图
3. 点击"导出 JPEG"
4. ✅ 应该成功导出

### 测试场景 2：部分图片加载失败
1. 生成分镜图
2. 某些图片加载失败（显示占位符）
3. 点击"导出 JPEG"
4. ✅ 应该导出，占位符显示为灰色

### 测试场景 3：CORS 问题
1. 如果图片来自不支持 CORS 的 CDN
2. 系统会自动尝试不使用 CORS 加载
3. ✅ 应该仍然能导出

## 用户可见的改进

### 导出过程
```
用户点击"导出 JPEG"
    ↓
系统加载所有分镜图
    ↓
┌─────────────────────────────────────┐
│ 图片加载结果                         │
├─────────────────────────────────────┤
│ ✓ 成功加载 → 绘制到 Canvas          │
│ ✗ 加载失败 → 显示占位符             │
└─────────────────────────────────────┘
    ↓
尝试导出 Canvas
    ↓
┌─────────────────────────────────────┐
│ 导出方法                             │
├─────────────────────────────────────┤
│ 方法1: toBlob (推荐)                │
│ 方法2: toDataURL (降级)             │
└─────────────────────────────────────┘
    ↓
✅ 导出成功 / ❌ 显示错误提示
```

## 代码变更

### 文件：App.tsx

#### 变更 1：改进 loadAndDrawImage 函数
- 添加 CORS 降级处理
- 移除 CORS 属性重试
- 改进错误处理

#### 变更 2：改进导出逻辑
- 添加 try-catch 包装
- 实现 toBlob → toDataURL 降级
- 改进错误提示

## 性能影响

- ✅ 无性能下降
- ✅ 实际上可能更快（toDataURL 在某些情况下更快）
- ✅ 内存使用不变

## 兼容性

- ✅ 所有现代浏览器支持
- ✅ Chrome/Edge/Firefox/Safari 都支持
- ✅ 向后兼容

## 后续改进建议

1. **图片代理服务**
   - 建立自己的图片代理服务
   - 确保所有图片都有正确的 CORS 头

2. **预加载优化**
   - 在导出前预加载所有图片
   - 显示加载进度

3. **缓存策略**
   - 缓存已加载的图片
   - 减少重复加载

4. **用户反馈**
   - 显示哪些图片加载失败
   - 提供重试选项

## 相关文档

- [STORYBOARD_EXPORT_FIX.md](./STORYBOARD_EXPORT_FIX.md) - 之前的导出修复
- [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) - API 集成指南
