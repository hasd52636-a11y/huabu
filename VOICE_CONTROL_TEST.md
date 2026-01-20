# 语音控制功能测试指南 - 神马API Realtime完整版本

## 🎯 新功能特性

### 1. **完整的双向实时语音对话**
- ✅ 用户语音 → AI实时识别和理解
- ✅ AI回复 → 实时语音播放
- ✅ 无需"曹操"唤醒词，直接对话
- ✅ 支持语音指令自动执行
- ✅ 完整的事件处理机制

### 2. **两种语音模式**
- 🚀 **实时语音模式**：使用神马API Realtime WebSocket（完整实现）
- 🔄 **浏览器语音模式**：使用浏览器Web Speech API（备用）

### 3. **智能指令识别**
- 自动识别生成图片指令
- 自动识别生成视频指令  
- 自动识别生成文本指令
- 内容自动添加到画布

### 4. **完整的事件支持**
基于神马API Realtime完整文档实现：

#### Client Events（客户端事件）
- ✅ `session.update` - 会话配置更新
- ✅ `input_audio_buffer.append` - 音频数据追加
- ✅ `input_audio_buffer.commit` - 音频提交
- ✅ `input_audio_buffer.clear` - 音频缓冲区清空
- ✅ `conversation.item.create` - 创建对话项
- ✅ `conversation.item.truncate` - 截断对话项
- ✅ `conversation.item.delete` - 删除对话项
- ✅ `response.create` - 触发响应生成
- ✅ `response.cancel` - 取消响应

#### Server Events（服务器事件）
- ✅ `session.created` / `session.updated` - 会话管理
- ✅ `conversation.created` / `conversation.item.created` - 对话管理
- ✅ `input_audio_buffer.*` - 音频缓冲区事件
- ✅ `response.*` - 响应生成事件
- ✅ `response.content_part.*` - 内容部分事件
- ✅ `response.text.*` - 文本流事件
- ✅ `response.audio.*` - 音频流事件
- ✅ `response.audio_transcript.*` - 音频转录事件
- ✅ `response.function_call_arguments.*` - 函数调用事件
- ✅ `conversation.item.input_audio_transcription.*` - 语音转录事件
- ✅ `rate_limits.updated` - 速率限制更新
- ✅ `error` - 错误处理

## 🎤 使用方法

### 步骤1：配置API密钥
1. 点击右侧边栏的"设置"⚙️按钮
2. 在"API提供商配置"中选择"神马"
3. 输入神马API密钥
4. 点击"保存配置"

### 步骤2：激活语音控制
1. 点击右侧边栏的"曹操"标签页
2. 点击"语音控制"按钮
3. 浏览器会请求麦克风权限，点击"允许"
4. 看到"实时对话"绿色状态表示连接成功

### 步骤3：开始语音对话
直接对着麦克风说话，例如：
- "帮我生成一张蓝天白云的图片"
- "写一首关于春天的诗"
- "制作一个10秒的海浪视频"
- "创建一个产品介绍文案"

## 🔧 技术实现

### 完整的Realtime WebSocket连接
```javascript
// 连接到神马API Realtime端点
const wsUrl = baseUrl.replace('https://', 'wss://') + '/v1/realtime';
const ws = new WebSocket(wsUrl, [], {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'realtime=v1'
  }
});

// 完整的会话配置
const sessionConfig = {
  event_id: `event_${Date.now()}`,
  type: 'session.update',
  session: {
    modalities: ['text', 'audio'],
    instructions: '你是曹操，一个专业的AI画布助手...',
    voice: 'alloy',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200
    },
    temperature: 0.8,
    max_output_tokens: 'inf'
  }
};
```

### 完整的事件处理机制
```javascript
// 处理所有服务器事件
const handleRealtimeEvent = (event) => {
  switch (event.type) {
    case 'session.created':
      console.log('会话已创建:', event.session?.id);
      break;
    case 'input_audio_buffer.speech_started':
      console.log('检测到语音开始:', event.audio_start_ms);
      break;
    case 'conversation.item.input_audio_transcription.completed':
      console.log('语音转录完成:', event.transcript);
      break;
    case 'response.content_part.done':
      if (event.part?.type === 'text') {
        console.log('文本响应完成:', event.part.text);
        executeCommand(event.part.text);
      }
      break;
    case 'response.audio.delta':
      playAudioDelta(event.delta);
      break;
    // ... 处理所有其他事件
  }
};
```

### 音频处理流程
1. **录音**：MediaRecorder录制用户语音
2. **转换**：转换为PCM16格式
3. **发送**：通过WebSocket发送到API
4. **接收**：接收AI语音回复
5. **播放**：实时播放AI语音

### 指令解析
```javascript
// 自动识别生成指令
if (response.includes('生成图片')) {
  executeCommand('generate_image', extractContent(response));
} else if (response.includes('生成视频')) {
  executeCommand('generate_video', extractContent(response));
}
```

## 🌟 优势对比

### 神马API Realtime模式 vs 浏览器语音模式

| 特性 | Realtime模式 | 浏览器模式 |
|------|-------------|-----------|
| 语音识别 | ✅ 服务器端，更准确 | ⚠️ 浏览器端，依赖网络 |
| AI语音回复 | ✅ 实时语音播放 | ❌ 仅文字回复 |
| 连接稳定性 | ✅ WebSocket长连接 | ⚠️ 依赖浏览器支持 |
| 延迟 | ✅ 低延迟 | ⚠️ 较高延迟 |
| 兼容性 | ✅ 不依赖浏览器 | ❌ 仅Chrome/Edge |
| 功能完整性 | ✅ 完整对话体验 | ⚠️ 基础语音识别 |
| 事件支持 | ✅ 完整事件机制 | ❌ 基础事件 |
| 错误处理 | ✅ 详细错误信息 | ⚠️ 基础错误处理 |

## 🔍 故障排除

### 问题1：连接失败，自动降级到浏览器模式
**原因**：
- API密钥未配置或无效
- 网络连接问题
- WebSocket连接被阻止

**解决方案**：
1. 检查API密钥配置
2. 确认网络连接正常
3. 检查防火墙/代理设置

### 问题2：语音识别不准确
**解决方案**：
- 在安静环境中使用
- 说话清晰，语速适中
- 确保麦克风质量良好
- 尝试切换语音模式

### 问题3：AI语音播放失败
**解决方案**：
- 检查浏览器音频权限
- 确认扬声器/耳机正常
- 刷新页面重试

### 问题4：事件处理异常
**解决方案**：
- 检查控制台日志
- 确认事件格式正确
- 验证WebSocket连接状态

## 📱 浏览器兼容性

### 完全支持（Realtime模式）：
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Safari 14+
- ✅ Firefox 80+

### 部分支持（仅浏览器模式）：
- ⚠️ 较旧版本浏览器

## 🎯 最佳实践

### 1. 环境准备
- 使用有线网络或稳定WiFi
- 安静的使用环境
- 质量良好的麦克风

### 2. 语音技巧
- 说话清晰，语速适中
- 指令要具体明确
- 避免背景噪音干扰

### 3. 指令示例
```
✅ 好的指令：
"帮我生成一张夕阳下的海滩图片"
"写一段关于人工智能发展的介绍"
"制作一个15秒的城市夜景视频"

❌ 避免的指令：
"生成图片"（太模糊）
"写点什么"（不具体）
"做个视频"（缺少描述）
```

## 🚀 部署验证

部署后请验证以下功能：
- [ ] 麦克风权限正常获取
- [ ] WebSocket连接成功建立
- [ ] 语音识别准确工作
- [ ] AI语音回复正常播放
- [ ] 指令自动执行到画布
- [ ] 模式切换功能正常
- [ ] 所有事件正确处理
- [ ] 错误处理机制正常
- [ ] 音频流播放正常
- [ ] 文本流显示正常

## 📊 事件监控

### 关键事件日志
```javascript
// 监控关键事件
console.log('会话创建:', event.session?.id);
console.log('语音开始:', event.audio_start_ms);
console.log('转录完成:', event.transcript);
console.log('响应创建:', event.response?.id);
console.log('内容完成:', event.part?.text);
console.log('音频增量:', event.delta);
```

### 性能指标
- WebSocket连接时间
- 语音识别延迟
- AI响应时间
- 音频播放延迟

完成验证后，用户即可享受完整的语音交互体验！