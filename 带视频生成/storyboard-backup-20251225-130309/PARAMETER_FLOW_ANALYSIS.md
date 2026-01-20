# 参数流向详细分析

## 1. 脚本生成模式 (Script Mode) 参数流向

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    SidebarRight.tsx                              │
│                                                                   │
│  用户输入:                                                        │
│  ├─ scriptInput (文本)                                           │
│  ├─ frameCount (1-16)                                           │
│  ├─ scriptStyle (StyleOption | null)                            │
│  ├─ scriptDuration (0-120秒)                                    │
│  └─ scriptAspectRatio (16:9, 4:3, 等)                          │
│                                                                   │
│  点击"生成"按钮                                                  │
│  ↓                                                               │
│  onGenerateFromScript(                                           │
│    scriptInput,                                                  │
│    frameCount,                                                   │
│    scriptStyle || undefined,                                    │
│    scriptAspectRatio,                                           │
│    scriptDuration                                               │
│  )                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  handleGenerateFromScript(                                       │
│    scriptText: string,                                          │
│    sceneCount: number,                                          │
│    style?: any,                                                 │
│    aspectRatio?: string,                                        │
│    duration?: number  ← ❌ 接收但未使用                          │
│  )                                                               │
│                                                                   │
│  ├─ parseScriptToScenes(scriptText, sceneCount)                │
│  │  └─ 返回: Scene[]                                            │
│  │                                                               │
│  ├─ 对每个 Scene 调用:                                          │
│  │  generateSceneImage(                                         │
│  │    enrichedPrompt,                                           │
│  │    true,                                                     │
│  │    isBlackAndWhite,                                          │
│  │    style,                                                    │
│  │    aspectRatio                                               │
│  │    ❌ 缺少 duration 参数                                      │
│  │  )                                                            │
│  │                                                               │
│  └─ 创建 StoryboardItem[]                                       │
│     ├─ id: UUID                                                 │
│     ├─ imageUrl: 生成的图片URL                                  │
│     ├─ prompt: enrichedPrompt                                   │
│     ├─ colorMode: 'color' | 'blackAndWhite'                   │
│     ├─ aspectRatio: 用户设置的比例                              │
│     └─ 其他属性...                                              │
│                                                                   │
│  setItems(prev => [...prev, ...newItems])                       │
└─────────────────────────────────────────────────────────────────┘
```

### 参数映射表

| 参数 | 来源 | 传递到 | 使用情况 | 问题 |
|------|------|--------|---------|------|
| scriptInput | 用户输入 | parseScriptToScenes | ✅ 正确使用 | 无 |
| frameCount | 滑块 (1-16) | parseScriptToScenes | ✅ 正确使用 | 无 |
| scriptStyle | 风格选择器 | generateSceneImage | ⚠️ 可能为 null | BUG #12 |
| scriptDuration | 滑块 (0-120) | ❌ 未传递 | ❌ 未使用 | BUG #1 |
| scriptAspectRatio | 比例按钮 | generateSceneImage | ✅ 正确使用 | 无 |
| globalColorMode | App 全局状态 | 计算 isBlackAndWhite | ✅ 正确使用 | 无 |

### 数据流向验证

```
scriptInput
  ↓
parseScriptToScenes()
  ↓
Scene[] {
  description: string
  visualPrompt: string
}
  ↓
enrichedPrompt = `【SC-01】\n[画面描述]: ${description}\n[摄像机语言]: ${visualPrompt}`
  ↓
generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio)
  ↓
imageUrl: string
  ↓
StoryboardItem {
  imageUrl,
  prompt: enrichedPrompt,
  aspectRatio,
  colorMode,
  ...
}
```

---

## 2. 创意对话模式 (Chat Mode) 参数流向

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    SidebarRight.tsx                              │
│                                                                   │
│  用户输入:                                                        │
│  ├─ chatInput (创意想法)                                         │
│  ├─ chatHistory (对话历史)                                       │
│  ├─ chatFrameCount (1-16)                                       │
│  ├─ chatStyle (StyleOption | null)                              │
│  ├─ chatDuration (0-120秒)                                      │
│  └─ chatAspectRatio (16:9, 4:3, 等)                            │
│                                                                   │
│  点击"生成分镜"按钮                                              │
│  ↓                                                               │
│  handleGenerateStoryboard()                                      │
│  ├─ generateStoryboardFromDialogue(                             │
│  │   chatHistory,                                               │
│  │   chatFrameCount,                                            │
│  │   styleName,                                                 │
│  │   chatDuration > 0 ? chatDuration : undefined,              │
│  │   chatAspectRatio || undefined,                             │
│  │   lang                                                       │
│  │ )                                                             │
│  │ └─ 返回: Scene[]                                             │
│  │                                                               │
│  └─ onGenerateFromDialogue(                                     │
│      scenes,                                                    │
│      chatFrameCount,                                            │
│      chatStyle?.id || '',                                       │
│      chatAspectRatio || undefined                               │
│      ❌ 缺少 chatDuration 参数                                   │
│    )                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  handleGenerateFromDialogue(                                     │
│    scenes: any[],                                               │
│    frameCount: number,                                          │
│    styleId: string,                                             │
│    aspectRatio?: string                                         │
│    ❌ 缺少 duration 参数                                         │
│  )                                                               │
│                                                                   │
│  ├─ const style = STYLES.find(s => s.id === styleId)           │
│  │  ❌ 需要查找，效率低                                          │
│  │                                                               │
│  ├─ 对每个 Scene 调用:                                          │
│  │  generateSceneImage(                                         │
│  │    enrichedPrompt,                                           │
│  │    true,                                                     │
│  │    isBlackAndWhite,                                          │
│  │    style,                                                    │
│  │    aspectRatio                                               │
│  │    ❌ 缺少 duration 参数                                      │
│  │  )                                                            │
│  │                                                               │
│  └─ 创建 StoryboardItem[]                                       │
│                                                                   │
│  setItems(prev => [...prev, ...newItems])                       │
└─────────────────────────────────────────────────────────────────┘
```

### 参数映射表

| 参数 | 来源 | 传递到 | 使用情况 | 问题 |
|------|------|--------|---------|------|
| chatHistory | 用户对话 | generateStoryboardFromDialogue | ✅ 正确使用 | 无 |
| chatFrameCount | 滑块 (1-16) | generateStoryboardFromDialogue | ✅ 正确使用 | 无 |
| chatStyle | 风格选择器 | onGenerateFromDialogue (as styleId) | ⚠️ 类型转换 | BUG #4 |
| chatDuration | 滑块 (0-120) | ❌ 未传递到 onGenerateFromDialogue | ❌ 未使用 | BUG #3 |
| chatAspectRatio | 比例按钮 | generateSceneImage | ✅ 正确使用 | 无 |
| lang | App 全局状态 | generateStoryboardFromDialogue | ✅ 正确使用 | 无 |

### 数据流向验证

```
chatHistory
  ↓
generateStoryboardFromDialogue(chatHistory, chatFrameCount, styleName, chatDuration, chatAspectRatio, lang)
  ↓
Scene[] {
  description: string
  visualPrompt: string
}
  ↓
onGenerateFromDialogue(scenes, chatFrameCount, chatStyle?.id, chatAspectRatio)
  ❌ chatDuration 丢失
  ↓
handleGenerateFromDialogue(scenes, frameCount, styleId, aspectRatio)
  ├─ STYLES.find(s => s.id === styleId)  ← 需要查找
  ↓
enrichedPrompt = `【SC-01】\n[画面描述]: ${description}\n[摄像机语言]: ${visualPrompt}`
  ↓
generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio)
  ❌ duration 参数缺失
  ↓
imageUrl: string
  ↓
StoryboardItem
```

---

## 3. 视频生成参数流向

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    SidebarRight.tsx                              │
│                                                                   │
│  点击"生成视频"按钮                                              │
│  ↓                                                               │
│  onGenerateVideo()                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  handleGenerateVideoFromContextMenu(itemId)                      │
│  ├─ setSelectedIds(new Set([itemId]))                           │
│  ├─ setVideoGenDialogPrompt(item.prompt)                        │
│  └─ setShowVideoGenDialog(true)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VideoGenDialog.tsx                             │
│                                                                   │
│  用户设置:                                                        │
│  ├─ prompt (提示词)                                              │
│  ├─ model ('sora-2' | 'sora-2-pro')                            │
│  ├─ aspectRatio ('16:9' | '9:16')                              │
│  ├─ duration (10 | 15 | 25 秒)                                 │
│  └─ hd (boolean)                                                │
│                                                                   │
│  点击"生成"按钮                                                  │
│  ↓                                                               │
│  onGenerate(prompt, {                                           │
│    model,                                                       │
│    aspect_ratio: aspectRatio,                                  │
│    duration,                                                    │
│    hd                                                           │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  handleGenerateVideo(prompt, options)                            │
│  ├─ 初始化 VideoService                                         │
│  ├─ 获取选中的分镜图片 URLs                                      │
│  │                                                               │
│  ├─ VideoService.createVideo(prompt, {                         │
│  │   model: options.model,                                     │
│  │   aspect_ratio: options.aspect_ratio,                       │
│  │   duration: options.duration,                               │
│  │   hd: options.hd,                                           │
│  │   images: selectedFrames.map(it => it.imageUrl)            │
│  │ })                                                            │
│  │ └─ 返回: { task_id, status, progress }                      │
│  │                                                               │
│  ├─ 创建 VideoItem                                              │
│  │  ├─ id: UUID                                                │
│  │  ├─ taskId: result.task_id                                  │
│  │  ├─ prompt                                                  │
│  │  ├─ status: 'loading'                                       │
│  │  ├─ progress: 0                                             │
│  │  └─ 其他属性...                                              │
│  │                                                               │
│  ├─ setVideoItems(prev => [...prev, newVideoItem])             │
│  │                                                               │
│  └─ VideoService.startPolling(                                 │
│      result.task_id,                                           │
│      onProgress,                                               │
│      onComplete,                                               │
│      onError                                                   │
│    )                                                             │
│                                                                   │
│    轮询回调:                                                      │
│    ├─ onProgress(status)                                        │
│    │  └─ 更新 VideoItem 的 progress 和 status                  │
│    │                                                             │
│    ├─ onComplete(videoUrl)                                      │
│    │  └─ 更新 VideoItem 的 videoUrl 和 status                  │
│    │                                                             │
│    └─ onError(error)                                            │
│       └─ 更新 VideoItem 的 error 和 status                     │
└─────────────────────────────────────────────────────────────────┘
```

### 参数映射表

| 参数 | 来源 | 传递到 | 使用情况 | 问题 |
|------|------|--------|---------|------|
| prompt | VideoGenDialog | VideoService.createVideo | ✅ 正确使用 | 无 |
| model | 用户选择 | VideoService.createVideo | ✅ 正确使用 | BUG #16 (类型) |
| aspect_ratio | 用户选择 | VideoService.createVideo | ⚠️ 仅支持 16:9, 9:16 | 无 |
| duration | 用户选择 | VideoService.createVideo | ✅ 正确使用 | 无 |
| hd | 用户选择 | VideoService.createVideo | ✅ 正确使用 | 无 |
| images | 选中分镜 | VideoService.createVideo | ⚠️ 可能为空 | BUG #10 |

---

## 4. 批量重绘参数流向

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  用户选择多个分镜                                                │
│  ├─ selectedIds: Set<string>                                    │
│  └─ selectionOrder: string[]                                    │
│                                                                   │
│  点击"批量重绘"按钮                                              │
│  ↓                                                               │
│  setShowBatchRedrawDialog(true)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BatchRedrawDialog.tsx                          │
│                                                                   │
│  显示选中的分镜列表                                              │
│  用户为每个分镜输入修改指令                                      │
│  ├─ SC-01: "添加更多细节"                                       │
│  ├─ SC-02: "改变光线"                                           │
│  └─ ...                                                          │
│                                                                   │
│  点击"应用"按钮                                                  │
│  ↓                                                               │
│  onApply(instructions: Record<string, string>)                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  handleBatchRedraw(instructions)                                 │
│  ├─ 获取选中的分镜                                               │
│  │  selectedFrames = items.filter(it => !it.isMain && selectedIds.has(it.id))
│  │                                                               │
│  ├─ 按顺序排序                                                   │
│  │  if (selectionOrder.length > 0)                              │
│  │    orderedFrames = selectionOrder.map(id => ...)            │
│  │  else                                                        │
│  │    orderedFrames = selectedFrames.sort(...)                 │
│  │                                                               │
│  ├─ 对每个分镜:                                                 │
│  │  for (let i = 0; i < orderedFrames.length; i++) {           │
│  │    const frame = orderedFrames[i]                           │
│  │    const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`  │
│  │    ❌ 使用循环索引，而不是原始 order                         │
│  │                                                               │
│  │    const instruction = instructions[sceneNum] || ''          │
│  │    const symbolInstructions = frame.symbols.map(...)        │
│  │                                                               │
│  │    let finalPrompt = frame.prompt                            │
│  │    if (instruction) finalPrompt += `. ${instruction}`       │
│  │    if (symbolInstructions) finalPrompt += `. Key actions: ${symbolInstructions}`
│  │                                                               │
│  │    generateSceneImage(finalPrompt, ...)                      │
│  │    setItems(prev => prev.map(...))                          │
│  │  }                                                            │
│  │                                                               │
│  └─ 显示结果提示                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 参数映射表

| 参数 | 来源 | 使用情况 | 问题 |
|------|------|---------|------|
| selectedIds | App 状态 | 过滤分镜 | ✅ 正确使用 |
| selectionOrder | App 状态 | 排序分镜 | ⚠️ 可能为空 |
| instructions | 用户输入 | 修改提示词 | ✅ 正确使用 |
| frame.order | 分镜属性 | ❌ 未使用 | BUG #17 |
| frame.symbols | 分镜属性 | 添加到提示词 | ⚠️ 可能过长 | BUG #18 |

---

## 5. 导出提示词参数流向

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    App.tsx                                        │
│                                                                   │
│  用户选择分镜                                                    │
│  ├─ selectedIds: Set<string>                                    │
│  └─ selectionOrder: string[]                                    │
│                                                                   │
│  点击"预览提示词"或"导出提示词"                                  │
│  ↓                                                               │
│  getOptimizedPrompts()                                           │
│  ├─ 使用 currentStyle (可能为 null)                             │
│  │  ❌ 应该使用当前活跃模式的风格                                │
│  │                                                               │
│  ├─ 使用 currentAspectRatio (可能为 null)                       │
│  │  ❌ 应该使用当前活跃模式的比例                                │
│  │                                                               │
│  ├─ 对每个选中的分镜:                                           │
│  │  const sceneNum = `SC-${String(it.order + 1).padStart(2, '0')}`
│  │  ❌ 使用 order 属性，而不是 selectionOrder 中的位置          │
│  │                                                               │
│  └─ 返回: { zh: string, en: string }                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SidebarRight.tsx                              │
│                                                                   │
│  显示预览模态框或下载文件                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 参数映射表

| 参数 | 来源 | 使用情况 | 问题 |
|------|------|---------|------|
| selectedIds | App 状态 | 过滤分镜 | ✅ 正确使用 |
| selectionOrder | App 状态 | ❌ 未使用 | BUG #20 |
| currentStyle | App 状态 | 生成全局指令 | ⚠️ 可能为 null | BUG #19 |
| currentAspectRatio | App 状态 | 生成全局指令 | ⚠️ 可能为 null | BUG #19 |
| it.order | 分镜属性 | 生成场景编号 | ⚠️ 不符合选择顺序 | BUG #20 |

---

## 6. 状态同步问题分析

### 问题 1: currentStyle 和 currentAspectRatio 的双重维护

```
App.tsx:
  const [currentStyle, setCurrentStyle] = useState<StyleOption | null>(null);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio | null>(null);

SidebarRight.tsx:
  const [scriptStyle, setScriptStyle] = useState<StyleOption | null>(null);
  const [chatStyle, setChatStyle] = useState<StyleOption | null>(null);
  const [scriptAspectRatio, setScriptAspectRatio] = useState<AspectRatio | null>(null);
  const [chatAspectRatio, setChatAspectRatio] = useState<AspectRatio | null>(null);

问题:
  1. 两套状态可能不同步
  2. 导出时使用 currentStyle，但可能不是用户最后设置的值
  3. 在脚本模式和对话模式之间切换时，状态会丢失
```

### 问题 2: selectedIds 和 selectionOrder 的不同步

```
删除操作:
  setItems(prev => prev.filter(it => !idsToDelete.includes(it.id)));
  setSelectedIds(new Set());
  setSelectionOrder([]);

批量重绘:
  if (selectionOrder.length > 0)
    orderedFrames = selectionOrder.map(id => ...)
  else
    orderedFrames = selectedFrames.sort(...)

问题:
  1. 如果用户删除了一个分镜，selectionOrder 中可能仍然包含其 ID
  2. 这会导致批量重绘时出错
```

### 问题 3: videoItems 的状态转换

```
VideoService 返回的状态:
  'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE'

App.tsx 映射的状态:
  'loading' | 'completed' | 'failed'

问题:
  1. 'NOT_START' 状态没有明确处理
  2. 'IN_PROGRESS' 状态与 'loading' 的映射不清晰
  3. 没有处理状态转换的所有情况
```

---

## 7. 参数验证检查清单

### 脚本生成模式
- [ ] scriptInput 不为空
- [ ] frameCount 在 1-16 范围内
- [ ] scriptStyle 有默认值或用户选择
- [ ] scriptDuration 被正确传递和使用
- [ ] scriptAspectRatio 有默认值或用户选择

### 创意对话模式
- [ ] chatHistory 不为空
- [ ] chatFrameCount 在 1-16 范围内
- [ ] chatStyle 有默认值或用户选择
- [ ] chatDuration 被正确传递和使用
- [ ] chatAspectRatio 有默认值或用户选择

### 视频生成
- [ ] prompt 不为空且不超过 760 字符
- [ ] model 是有效的值
- [ ] aspect_ratio 与分镜比例匹配
- [ ] duration 是有效的值 (10, 15, 25)
- [ ] images 不为空或为 undefined

### 批量重绘
- [ ] selectedIds 不为空
- [ ] selectionOrder 与 selectedIds 同步
- [ ] instructions 对象有效
- [ ] 序号生成正确
- [ ] 提示词长度不超过限制

### 导出提示词
- [ ] selectedIds 不为空
- [ ] currentStyle 有有效值
- [ ] currentAspectRatio 有有效值
- [ ] selectionOrder 被正确使用
- [ ] 场景编号与选择顺序一致

