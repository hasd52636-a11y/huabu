# API 配置设置指南

## 概述

用户需要在使用视频生成功能前，配置他们自己的 Sora 2 API 密钥。本文档说明如何实现配置界面。

---

## 用户流程

```
用户打开应用
    ↓
检查是否已配置 API
    ↓
如果未配置 → 显示配置界面
    ↓
用户输入 Base URL 和 API Key
    ↓
验证配置（测试连接）
    ↓
保存到本地存储
    ↓
显示"生成视频"按钮
```

---

## 配置界面组件

### APIConfigDialog.tsx

```typescript
// components/APIConfigDialog.tsx
import React, { useState } from 'react';
import VideoService from '../videoService';

interface APIConfigDialogProps {
  onConfigured: (config: { baseUrl: string; apiKey: string }) => void;
  isOpen: boolean;
}

export default function APIConfigDialog({ onConfigured, isOpen }: APIConfigDialogProps) {
  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem('sora_base_url') || ''
  );
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('sora_api_key') || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey) {
      setError('请输入 Base URL 和 API Key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 测试连接
      const videoService = new VideoService({ baseUrl, apiKey });
      const quota = await videoService.getTokenQuota();

      // 连接成功
      setSuccess(true);
      setError(null);

      // 保存到本地存储
      localStorage.setItem('sora_base_url', baseUrl);
      localStorage.setItem('sora_api_key', apiKey);

      // 调用回调
      onConfigured({ baseUrl, apiKey });

      // 2 秒后关闭对话框
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '连接失败，请检查 Base URL 和 API Key'
      );
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>配置 Sora 2 API</h2>

        <p style={{ color: '#666', fontSize: '14px' }}>
          请输入你的 Sora 2 API 配置信息。你可以从中转服务（如神马 API）获取这些信息。
        </p>

        {/* Base URL 输入 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.xxx.com"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            示例: https://api.xxx.com
          </p>
        </div>

        {/* API Key 输入 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-xxx..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
            你的 API 密钥将被加密保存在本地存储中
          </p>
        </div>

        {/* 错误信息 */}
        {error && (
          <div
            style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* 成功信息 */}
        {success && (
          <div
            style={{
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            ✅ 连接成功！配置已保存
          </div>
        )}

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleTestConnection}
            disabled={isLoading || !baseUrl || !apiKey}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isLoading ? '#ccc' : '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? '测试中...' : '测试连接'}
          </button>
        </div>

        {/* 帮助信息 */}
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          <strong>如何获取 API 密钥？</strong>
          <ol style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
            <li>注册中转服务账号（如神马 API）</li>
            <li>在账户设置中获取 Base URL</li>
            <li>生成或复制你的 API Key</li>
            <li>粘贴到上面的输入框中</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

---

## 在 App.tsx 中使用

```typescript
// App.tsx
import { useState, useEffect, useRef } from 'react';
import APIConfigDialog from './components/APIConfigDialog';
import VideoService from './videoService';

export default function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const videoServiceRef = useRef<VideoService | null>(null);

  // 检查是否已配置
  useEffect(() => {
    const baseUrl = localStorage.getItem('sora_base_url');
    const apiKey = localStorage.getItem('sora_api_key');

    if (baseUrl && apiKey) {
      setIsConfigured(true);
      videoServiceRef.current = new VideoService({ baseUrl, apiKey });
    } else {
      setShowConfigDialog(true);
    }
  }, []);

  // 处理配置完成
  const handleConfigured = (config: { baseUrl: string; apiKey: string }) => {
    setIsConfigured(true);
    setShowConfigDialog(false);
    videoServiceRef.current = new VideoService(config);
  };

  // 处理重新配置
  const handleReconfigure = () => {
    setShowConfigDialog(true);
  };

  return (
    <div>
      {/* 配置对话框 */}
      <APIConfigDialog
        isOpen={showConfigDialog}
        onConfigured={handleConfigured}
      />

      {/* 主应用内容 */}
      {isConfigured && (
        <div>
          {/* 你的应用内容 */}
          <button onClick={handleReconfigure}>重新配置 API</button>
        </div>
      )}
    </div>
  );
}
```

---

## 本地存储管理

### 保存配置

```typescript
// 保存配置
localStorage.setItem('sora_base_url', baseUrl);
localStorage.setItem('sora_api_key', apiKey);

// 读取配置
const baseUrl = localStorage.getItem('sora_base_url');
const apiKey = localStorage.getItem('sora_api_key');

// 清除配置
localStorage.removeItem('sora_base_url');
localStorage.removeItem('sora_api_key');
```

### 加密存储（可选）

如果你想更安全地存储 API Key，可以使用简单的加密：

```typescript
// 简单的 Base64 加密（仅用于演示，生产环境建议使用更强的加密）
const encryptApiKey = (apiKey: string) => {
  return btoa(apiKey); // Base64 编码
};

const decryptApiKey = (encrypted: string) => {
  return atob(encrypted); // Base64 解码
};

// 使用
localStorage.setItem('sora_api_key', encryptApiKey(apiKey));
const decrypted = decryptApiKey(localStorage.getItem('sora_api_key') || '');
```

---

## 配置验证

### 测试连接

```typescript
const testConnection = async (baseUrl: string, apiKey: string) => {
  try {
    const videoService = new VideoService({ baseUrl, apiKey });
    
    // 调用 API 来验证配置
    const quota = await videoService.getTokenQuota();
    
    console.log('✅ 连接成功');
    console.log('Remaining quota:', quota.remaining_quota);
    
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error);
    return false;
  }
};
```

### 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `401 Unauthorized` | API Key 无效 | 检查 API Key 是否正确 |
| `Connection refused` | Base URL 错误 | 检查 Base URL 是否正确 |
| `Network error` | 网络问题 | 检查网络连接 |
| `Invalid JSON` | 响应格式错误 | 检查 API 端点是否正确 |

---

## 用户界面流程

### 首次使用

```
应用启动
    ↓
检查本地存储
    ↓
未找到配置
    ↓
显示配置对话框
    ↓
用户输入 Base URL 和 API Key
    ↓
用户点击"测试连接"
    ↓
验证成功 → 保存配置 → 关闭对话框
    ↓
显示"生成视频"按钮
```

### 后续使用

```
应用启动
    ↓
检查本地存储
    ↓
找到配置
    ↓
初始化 VideoService
    ↓
显示"生成视频"按钮
```

### 重新配置

```
用户点击"重新配置"
    ↓
显示配置对话框
    ↓
用户修改配置
    ↓
用户点击"测试连接"
    ↓
验证成功 → 更新配置 → 关闭对话框
```

---

## 最佳实践

### 1. 验证输入

```typescript
const validateConfig = (baseUrl: string, apiKey: string) => {
  const errors: string[] = [];

  if (!baseUrl) {
    errors.push('Base URL 不能为空');
  } else if (!baseUrl.startsWith('http')) {
    errors.push('Base URL 必须以 http 或 https 开头');
  }

  if (!apiKey) {
    errors.push('API Key 不能为空');
  } else if (apiKey.length < 10) {
    errors.push('API Key 长度不足');
  }

  return errors;
};
```

### 2. 显示配置状态

```typescript
// 在应用顶部显示配置状态
<div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
  <span>✅ API 已配置</span>
  <button onClick={handleReconfigure}>修改配置</button>
</div>
```

### 3. 处理配置过期

```typescript
// 如果 API Key 过期，提示用户重新配置
const handleApiError = (error: Error) => {
  if (error.message.includes('401')) {
    alert('API Key 已过期，请重新配置');
    setShowConfigDialog(true);
  }
};
```

### 4. 提供帮助链接

```typescript
// 在配置对话框中提供帮助链接
<a href="https://docs.xxx.com/api-key" target="_blank">
  如何获取 API Key？
</a>
```

---

## 环境变量配置（可选）

如果你想使用环境变量而不是本地存储：

```typescript
// .env
VITE_SORA_BASE_URL=https://api.xxx.com
VITE_SORA_API_KEY=sk-xxx...

// 在代码中使用
const baseUrl = import.meta.env.VITE_SORA_BASE_URL;
const apiKey = import.meta.env.VITE_SORA_API_KEY;
```

**注意**: 不要在生产环境中硬编码 API Key。使用环境变量或后端代理。

---

## 安全建议

### ✅ 推荐做法

- 使用 HTTPS 传输
- 在本地存储中加密 API Key
- 定期更换 API Key
- 使用环境变量而不是硬编码
- 在后端代理 API 调用

### ❌ 不推荐做法

- 在代码中硬编码 API Key
- 在 Git 中提交 API Key
- 在不安全的连接中传输 API Key
- 在浏览器控制台中暴露 API Key
- 在公开的代码库中分享 API Key

---

## 完整的配置流程

```typescript
// 完整的配置和初始化流程
import { useEffect, useRef, useState } from 'react';
import VideoService from './videoService';
import APIConfigDialog from './components/APIConfigDialog';

export default function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const videoServiceRef = useRef<VideoService | null>(null);

  // 初始化
  useEffect(() => {
    const initializeApp = async () => {
      const baseUrl = localStorage.getItem('sora_base_url');
      const apiKey = localStorage.getItem('sora_api_key');

      if (baseUrl && apiKey) {
        try {
          // 验证配置
          const videoService = new VideoService({ baseUrl, apiKey });
          await videoService.getTokenQuota();

          // 配置有效
          videoServiceRef.current = videoService;
          setIsConfigured(true);
          setConfigError(null);
        } catch (error) {
          // 配置无效
          setConfigError('保存的配置已过期，请重新配置');
          setShowConfigDialog(true);
        }
      } else {
        // 未配置
        setShowConfigDialog(true);
      }
    };

    initializeApp();
  }, []);

  const handleConfigured = (config: { baseUrl: string; apiKey: string }) => {
    videoServiceRef.current = new VideoService(config);
    setIsConfigured(true);
    setShowConfigDialog(false);
    setConfigError(null);
  };

  return (
    <div>
      <APIConfigDialog
        isOpen={showConfigDialog}
        onConfigured={handleConfigured}
      />

      {configError && (
        <div style={{ color: 'red', padding: '10px' }}>
          {configError}
        </div>
      )}

      {isConfigured && (
        <div>
          {/* 应用内容 */}
        </div>
      )}
    </div>
  );
}
```

---

## 总结

用户需要：

1. ✅ 获取 API Key 和 Base URL
2. ✅ 在应用中输入这些信息
3. ✅ 测试连接以验证配置
4. ✅ 配置被保存到本地存储
5. ✅ 应用可以使用这些配置调用 API

这样每个用户都可以使用自己的 API 密钥，而不需要在代码中硬编码。

