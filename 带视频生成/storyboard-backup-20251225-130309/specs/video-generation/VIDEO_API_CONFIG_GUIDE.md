# 视频 API 配置完整指南

## 当前状态

你已经正确理解了配置方式：
- ✅ Base URL: `https://hk-api.gptbest.vip` （香港路线）
- ❌ API Key: 已过期（需要更新）

## 问题诊断

你提供的 API 密钥返回错误：
```
{"error":{"code":"invalid_request","message":"该令牌已过期，请前往令牌页面调整该令牌"}}
```

**原因**: API 密钥已过期，需要在中转服务账户中重新生成或更新。

## 解决步骤

### 1️⃣ 获取新的 API 密钥

1. 登录 GPTBest 账户（https://gptbest.vip）
2. 进入 **令牌页面** 或 **API 密钥管理**
3. 查看现有密钥的状态
4. 如果密钥已过期，点击 **重新生成** 或 **创建新密钥**
5. 复制新的 API 密钥

### 2️⃣ 在应用中配置

1. 打开应用设置
2. 点击 **⚙️ 设置** 按钮
3. 选择 **"API 接口配置"** 标签页
4. 切换到 **"🎬 视频生成 API"** 标签
5. 填入以下信息：
   - **Base URL**: `https://hk-api.gptbest.vip`
   - **API Key**: 你新生成的密钥（以 `sk-` 开头）
6. 点击 **"测试连接"** 按钮验证

### 3️⃣ 验证配置

如果测试成功，你会看到：
- ✅ 按钮变绿，显示 "✓ 连接成功"
- 应用会显示你的配额信息

## 配置格式说明

| 字段 | 值 | 说明 |
|------|-----|------|
| Base URL | `https://hk-api.gptbest.vip` | 中转服务的基础地址，**不需要** `/v1` 或 `/v2` |
| API Key | `sk-xxxxx...` | 从 GPTBest 账户获取的密钥 |

## 应用如何使用这些配置

应用会自动在 Base URL 后面添加版本路径：

```typescript
// 查询配额
GET https://hk-api.gptbest.vip/v1/token/quota

// 创建视频
POST https://hk-api.gptbest.vip/v2/videos/generations

// 查询进度
GET https://hk-api.gptbest.vip/v2/videos/generations/{task_id}
```

## 常见问题

### Q: 为什么连接测试失败？
**A**: 可能的原因：
1. API 密钥已过期 → 需要重新生成
2. API 密钥错误 → 检查是否完整复制
3. Base URL 错误 → 确保是 `https://hk-api.gptbest.vip`（不要加 `/v1` 或 `/v2`）
4. 网络问题 → 检查网络连接

### Q: 如何检查 API 密钥是否有效？
**A**: 在应用中点击"测试连接"按钮，如果成功会显示绿色 ✓

### Q: 密钥过期了怎么办？
**A**: 
1. 登录 GPTBest 账户
2. 进入令牌/API 密钥管理页面
3. 重新生成或创建新密钥
4. 在应用中更新密钥

### Q: 可以同时配置多个 API 吗？
**A**: 可以。应用支持：
- 图像生成 API（Gemini、智谱、OpenAI 等）
- 视频生成 API（Sora 2）

两者独立配置，互不影响。

## 下一步

1. 获取新的 API 密钥
2. 在应用中配置
3. 点击"测试连接"验证
4. 开始生成视频！

## 需要帮助？

如果配置仍然有问题，请提供：
- 错误信息的完整内容
- 你填入的 Base URL
- 是否能访问 https://hk-api.gptbest.vip（在浏览器中测试）
