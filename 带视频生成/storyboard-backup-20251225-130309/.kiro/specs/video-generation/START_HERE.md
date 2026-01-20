# 🎬 视频生成功能 - 从这里开始

## 👋 欢迎！

你提到了两个问题：
1. **"没看到怎么设置这个密钥"**
2. **"没看到生成视频怎么操作"**

我已经为你创建了完整的文档来解决这些问题。让我告诉你如何快速上手。

---

## ⚡ 5 分钟快速开始

### 第 1 步：设置密钥（2 分钟）

1. 点击左侧边栏的 **⚙️ 按钮**
2. 在弹出的对话框中：
   - **Base URL**: 粘贴你的中转服务 URL（如 `https://api.xxx.com`）
   - **API Key**: 粘贴你的 API 密钥（如 `sk-xxx...`）
3. 点击 **"测试连接"** 按钮
4. 看到 ✅ 表示成功！

**不知道怎么获取 API 密钥？** → 查看 [QUICK_REFERENCE_CARD.md - 🔑 API 密钥获取](./QUICK_REFERENCE_CARD.md#-api-密钥获取)

### 第 2 步：生成视频（3 分钟）

1. 点击左侧边栏的 **📥 按钮** 上传分镜图片
2. 在画布上选择要生成的分镜（框选或 Shift+点击）
3. 点击右侧边栏的 **🎬 生成视频** 按钮
4. 填写视频提示词（如 "一只猫在公园里奔跑"）
5. 选择模型、宽高比、时长
6. 点击 **"生成"** 按钮
7. 等待 1-10 分钟，视频生成完成后点击 **"下载"**

**不知道怎么填写参数？** → 查看 [QUICK_REFERENCE_CARD.md - 📊 参数速查表](./QUICK_REFERENCE_CARD.md#-参数速查表)

---

## 📚 文档导航

### 🎯 我是普通用户，想要快速上手

**推荐阅读顺序：**

1. **[QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md)** (5 分钟)
   - 快速参考卡片，包含所有关键信息
   - 包含三步快速开始、参数速查表、常见错误

2. **[USER_GUIDE_CN.md](./USER_GUIDE_CN.md)** (15 分钟)
   - 详细的中文用户指南
   - 包含完整的设置步骤和常见问题解答

### 👨‍💻 我是开发者，想要集成或修改功能

**推荐阅读顺序：**

1. **[requirements.md](./requirements.md)** - 理解功能需求
2. **[design.md](./design.md)** - 理解架构设计
3. **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - API 文档
4. **[IMPLEMENTATION_TEMPLATE.md](./IMPLEMENTATION_TEMPLATE.md)** - 代码模板

### 🏗️ 我是架构师，想要了解系统设计

**推荐阅读顺序：**

1. **[design.md](./design.md)** - 完整的架构设计
2. **[requirements.md](./requirements.md)** - 功能需求
3. **[CANVAS_INTEGRATION.md](./CANVAS_INTEGRATION.md)** - 画布集成设计

---

## 🔍 快速查找

### "我不知道怎么设置密钥"
→ [USER_GUIDE_CN.md - 第一步：设置 API 密钥](./USER_GUIDE_CN.md#第一步设置-api-密钥)

### "我不知道怎么生成视频"
→ [USER_GUIDE_CN.md - 第二步：生成视频](./USER_GUIDE_CN.md#第二步生成视频)

### "生成失败了，怎么办？"
→ [USER_GUIDE_CN.md - 常见问题](./USER_GUIDE_CN.md#常见问题)

### "我想要改进提示词"
→ [QUICK_REFERENCE_CARD.md - 💡 提示词模板](./QUICK_REFERENCE_CARD.md#-提示词模板)

### "我想要选择合适的参数"
→ [QUICK_REFERENCE_CARD.md - 🎬 场景推荐](./QUICK_REFERENCE_CARD.md#-场景推荐)

### "我想要集成这个功能"
→ [DOCUMENTATION_INDEX.md - 按用户类型推荐阅读 - 开发者](./DOCUMENTATION_INDEX.md#-开发者想要集成或修改功能)

---

## 📋 新增文档列表

我为你创建了以下 4 个新文档：

| 文档 | 用途 | 阅读时间 |
|------|------|--------|
| **[QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md)** | 快速参考卡片，包含所有关键信息 | 5 分钟 |
| **[USER_GUIDE_CN.md](./USER_GUIDE_CN.md)** | 详细的中文用户指南 | 15 分钟 |
| **[USER_GUIDE_EN.md](./USER_GUIDE_EN.md)** | 详细的英文用户指南 | 15 分钟 |
| **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** | 完整的文档索引和导航 | 10 分钟 |

---

## 🎯 工作流程

```
1️⃣ 设置 API 密钥
   ↓
2️⃣ 上传分镜图片
   ↓
3️⃣ 选择要生成的分镜
   ↓
4️⃣ 打开视频生成对话框
   ↓
5️⃣ 填写视频参数
   ↓
6️⃣ 点击"生成"按钮
   ↓
7️⃣ 等待生成完成（1-10 分钟）
   ↓
8️⃣ 查看和下载视频
```

---

## 💡 快速提示

### 🔑 API 密钥获取
1. 注册中转服务账号（如 [神马 API](https://shenma.ai)）
2. 登录后进入账户设置
3. 找到 "API 配置" 或 "密钥管理"
4. 复制 Base URL 和 API Key
5. 粘贴到应用的 API 配置对话框

### 📊 参数选择建议

| 场景 | 推荐参数 |
|------|--------|
| 社交媒体短视频 | 竖屏 9:16，10 秒，Sora 2 |
| 电影预告片 | 横屏 16:9，15 秒，Sora 2 Pro + 高清 |
| 产品广告 | 横屏 16:9，10 秒，Sora 2 Pro |
| 演示视频 | 横屏 16:9，15 秒，Sora 2 |

### ⏱️ 预期耗时

| 配置 | 耗时 |
|------|------|
| 标清 10 秒 | 1-3 分钟 |
| 标清 15 秒 | 3-5 分钟 |
| 高清 10 秒 | 8+ 分钟 |
| 高清 15 秒 | 10+ 分钟 |

---

## ❓ 常见问题

### Q: 测试连接失败，怎么办？
**A:** 检查以下几点：
- Base URL 是否正确（应该是完整的 URL，如 `https://api.xxx.com`）
- API Key 是否正确（应该以 `sk-` 开头）
- 网络连接是否正常
- API 服务是否可用

详细答案 → [USER_GUIDE_CN.md - Q2](./USER_GUIDE_CN.md#q2-测试连接失败怎么办)

### Q: 生成视频需要多长时间？
**A:** 取决于你选择的参数：
- 标清 10 秒：1-3 分钟
- 标清 15 秒：3-5 分钟
- 高清 10 秒：8+ 分钟
- 高清 15 秒：10+ 分钟

详细答案 → [USER_GUIDE_CN.md - Q3](./USER_GUIDE_CN.md#q3-生成视频需要多长时间)

### Q: 生成失败，显示错误信息，怎么办？
**A:** 根据错误信息采取相应措施：
- `401 Unauthorized` → 检查 API Key 是否正确
- `400 Bad Request` → 检查提示词和参数是否正确
- `429 Too Many Requests` → 等待几分钟后重试
- `图片包含真人` → 使用不含人脸的图片
- `提示词包含违规内容` → 修改提示词

详细答案 → [USER_GUIDE_CN.md - Q4](./USER_GUIDE_CN.md#q4-生成失败显示错误信息怎么办)

### Q: 生成的视频质量不好，怎么办？
**A:** 尝试以下方法改进：
1. 改进提示词（更详细、更具体）
2. 选择更好的模型（Sora 2 Pro）
3. 启用高清选项
4. 增加时长（15 秒或 25 秒）
5. 使用参考图片

详细答案 → [USER_GUIDE_CN.md - Q6](./USER_GUIDE_CN.md#q6-生成的视频质量不好怎么办)

更多问题 → [USER_GUIDE_CN.md - 常见问题](./USER_GUIDE_CN.md#常见问题)

---

## 🚀 下一步

### 立即开始
1. 打开 [QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md)
2. 按照 "🎯 三步快速开始" 操作
3. 生成你的第一个视频！

### 深入学习
1. 阅读 [USER_GUIDE_CN.md](./USER_GUIDE_CN.md)
2. 查看 [QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md) 的所有部分
3. 掌握所有参数和技巧

### 获取帮助
1. 查看 [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
2. 按问题类型查找相关文档
3. 查看常见问题解答

---

## 📞 获取帮助

如果你找不到答案：

1. **查看文档索引** → [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
2. **按问题类型查找** → [DOCUMENTATION_INDEX.md - 按问题类型查找文档](./DOCUMENTATION_INDEX.md#-按问题类型查找文档)
3. **查看常见问题** → [USER_GUIDE_CN.md - 常见问题](./USER_GUIDE_CN.md#常见问题)
4. **查看快速参考** → [QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md)

---

## 📊 文档概览

```
START_HERE.md (你在这里)
    ↓
    ├─→ 快速上手 (5 分钟)
    │   └─→ QUICK_REFERENCE_CARD.md
    │
    ├─→ 详细学习 (15 分钟)
    │   └─→ USER_GUIDE_CN.md
    │
    ├─→ 完整导航
    │   └─→ DOCUMENTATION_INDEX.md
    │
    └─→ 开发者文档
        ├─→ requirements.md
        ├─→ design.md
        ├─→ API_INTEGRATION_GUIDE.md
        └─→ IMPLEMENTATION_TEMPLATE.md
```

---

## ✨ 总结

我为你创建了完整的文档体系来解决你的两个问题：

✅ **问题 1：没看到怎么设置密钥**
- 现在有清晰的密钥设置指南
- 包含详细的步骤和截图说明
- 包含常见错误和解决方案

✅ **问题 2：没看到生成视频怎么操作**
- 现在有清晰的视频生成流程指南
- 包含详细的参数说明
- 包含场景推荐和提示词模板

现在你可以：
- 在 5 分钟内了解如何设置密钥
- 在 10 分钟内完成第一个视频生成
- 在 15 分钟内解决常见问题

---

## 🎉 开始吧！

**立即打开 [QUICK_REFERENCE_CARD.md](./QUICK_REFERENCE_CARD.md) 开始使用！**

或者如果你想要更详细的说明，打开 [USER_GUIDE_CN.md](./USER_GUIDE_CN.md)

祝你使用愉快！🚀

---

*最后更新：2024-12-24*

**有任何问题或建议？** 欢迎反馈！
