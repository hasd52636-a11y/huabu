# BUG 修复建议

## 优先级 1：高严重性 BUG（必须立即修复）

### BUG #1: duration 参数在脚本生成中丢失

**问题**:
```typescript
// SidebarRight.tsx - 用户设置了时长
const [scriptDuration, setScriptDuration] = useState(0);

// 传递给 App.tsx
onGenerateFromScript(scriptInput, frameCount, scriptStyle || undefined, scriptAspectRatio, scriptDuration)

// App.tsx - 接收但未使用
const handleGenerateFromScript = useCallback(async (scriptText: string, sceneCount: number, style?: any, aspectRatio?: string, duration?: number) => {
  // ... duration 参数从未被使用
  const imageUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio);
  // ❌ 缺少 duration 参数
}
```

**修复方案**:
```typescript
// 方案 1: 将 duration 信息添加到 enrichedPrompt
let enrichedPrompt = `【${sceneNum}】
[画面描述]: ${scene.description}
[摄像机语言]: ${scene.visualPrompt}`;

if (duration && duration > 0) {
  enrichedPrompt += `\n[时长]: ${duration}秒`;
}

// 方案 2: 如果 generateSceneImage 支持 duration 参数，直接传递
const imageUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio, duration);
```

---

### BUG #3: chatDuration 在创意对话模式中未传递

**问题**:
```typescript
// SidebarRight.tsx - 用户设置了时长
const [chatDuration, setChatDuration] = useState(0);

// 但在调用 onGenerateFromDialogue 时没有传递
onGenerateFromDialogue(scenes, chatFrameCount, chatStyle?.id || '', chatAspectRatio || undefined);
// ❌ 缺少 chatDuration 参数
```

**修复方案**:
```typescript
// 修改 SidebarRightProps 接口
interface SidebarRightProps {
  onGenerateFromDialogue?: (scenes: any[], frameCount: number, style: string, aspectRatio?: string, duration?: number) => void;
  // 添加 duration 参数
}

// 修改调用
onGenerateFromDialogue(scenes, chatFrameCount, chatStyle?.id || '', chatAspectRatio || undefined, chatDuration > 0 ? chatDuration : undefined);

// 修改 App.tsx 中的处理
const handleGenerateFromDialogue = useCallback(async (scenes: any[], frameCount: number, styleId: string, aspectRatio?: string, duration?: number) => {
  // 现在可以使用 duration 参数
}
```

---

### BUG #5: currentStyle 和 currentAspectRatio 状态不同步

**问题**:
```typescript
// App.tsx 维护全局状态
const [currentStyle, setCurrentStyle] = useState<StyleOption | null>(null);
const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio | null>(null);

// SidebarRight 维护本地状态
const [scriptStyle, setScriptStyle] = useState<StyleOption | null>(null);
const [chatStyle, setChatStyle] = useState<StyleOption | null>(null);
const [scriptAspectRatio, setScriptAspectRatio] = useState<AspectRatio | null>(null);
const [chatAspectRatio, setChatAspectRatio] = useState<AspectRatio | null>(null);

// 导出时使用全局状态，但可能不是用户最后设置的值
const getOptimizedPrompts = useCallback(() => {
  const styleInfo = currentStyle?.nameZh || currentStyle?.name || '写实摄影';
  // ❌ currentStyle 可能为 null
}
```

**修复方案**:
```typescript
// 方案 1: 移除全局状态，只在 SidebarRight 中维护
// 删除 App.tsx 中的:
// const [currentStyle, setCurrentStyle] = useState<StyleOption | null>(null);
// const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio | null>(null);

// 修改 SidebarRightProps
interface SidebarRightProps {
  activeTab?: 'script' | 'chat';  // 添加当前活跃标签
  // ... 其他属性
}

// 方案 2: 在 SidebarRight 中暴露当前活跃的风格和比例
const getCurrentStyle = () => activeTab === 'script' ? scriptStyle : chatStyle;
const getCurrentAspectRatio = () => activeTab === 'script' ? scriptAspectRatio : chatAspectRatio;

// 修改 getOptimizedPrompts 的调用方式
const getOptimizedPrompts = useCallback((style?: StyleOption, aspectRatio?: AspectRatio) => {
  const styleInfo = style?.nameZh || style?.name || '写实摄影';
  const aspectRatioInfo = aspectRatio || '16:9';
  // ...
}
```

---

### BUG #17: 批量重绘中的序号生成错误

**问题**:
```typescript
// 当用户选择非连续的分镜时，序号会错误
// 例如: 选择 SC-01, SC-03, SC-05
// 但批量重绘时会生成: SC-01, SC-02, SC-03

for (let i = 0; i < orderedFrames.length; i++) {
  const frame = orderedFrames[i];
  const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`;  // ❌ 使用循环索引
  // ...
}
```

**修复方案**:
```typescript
// 使用原始的 order 属性
for (let i = 0; i < orderedFrames.length; i++) {
  const frame = orderedFrames[i];
  const sceneNum = `SC-${String(frame.order + 1).padStart(2, '0')}`;  // ✅ 使用原始 order
  // ...
}

// 或者，如果需要重新编号，应该明确说明
const useOriginalNumbers = false;  // 配置选项
for (let i = 0; i < orderedFrames.length; i++) {
  const frame = orderedFrames[i];
  const sceneNum = useOriginalNumbers 
    ? `SC-${String(frame.order + 1).padStart(2, '0')}`
    : `SC-${String(i + 1).padStart(2, '0')}`;
  // ...
}
```

---

## 优先级 2：中等严重性 BUG（应该修复）

### BUG #2: style 参数类型不一致

**修复方案**:
```typescript
// SidebarRight.tsx
const handleScriptStyleChange = (style: StyleOption | null) => {
  setScriptStyle(style);
  onStyleChange?.(style);
};

// App.tsx - 修改函数签名
const handleGenerateFromScript = useCallback(async (
  scriptText: string, 
  sceneCount: number, 
  style?: StyleOption,  // ✅ 改为 StyleOption
  aspectRatio?: string, 
  duration?: number
) => {
  // ...
}, [items.length, canvasOffset, globalColorMode]);
```

---

### BUG #4: 传递 styleId 而非 StyleOption

**修复方案**:
```typescript
// SidebarRight.tsx - 修改调用
if (scenes && scenes.length > 0) {
  onGenerateFromDialogue(
    scenes, 
    chatFrameCount, 
    chatStyle || STYLES[0],  // ✅ 传递完整的 StyleOption
    chatAspectRatio || undefined
  );
}

// App.tsx - 修改函数签名
const handleGenerateFromDialogue = useCallback(async (
  scenes: any[], 
  frameCount: number, 
  style: StyleOption,  // ✅ 改为 StyleOption
  aspectRatio?: string
) => {
  // 不需要查找，直接使用
  const imageUrl = await generateSceneImage(enrichedPrompt, true, isBlackAndWhite, style, aspectRatio);
  // ...
}, [items.length, canvasOffset, globalColorMode]);
```

---

### BUG #7: VideoItem status 类型转换不完整

**修复方案**:
```typescript
// videoService.ts - 确保返回的状态值一致
interface VideoStatus {
  status: 'NOT_START' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  // ...
}

// App.tsx - 完整的状态转换
const statusMap: Record<string, 'loading' | 'completed' | 'failed'> = {
  'NOT_START': 'loading',
  'IN_PROGRESS': 'loading',
  'SUCCESS': 'completed',
  'FAILURE': 'failed'
};

setVideoItems(prev => prev.map(item =>
  item.taskId === result.task_id
    ? {
        ...item,
        progress: status.progress,
        status: statusMap[status.status] || 'loading',
        videoUrl: status.video_url || item.videoUrl,
        error: status.error?.message
      }
    : item
));
```

---

### BUG #11: 轮询状态转换不完整

**修复方案**:
```typescript
// App.tsx - 改进轮询回调
videoServiceRef.current.startPolling(
  result.task_id,
  (status) => {
    console.log(`Video ${result.task_id} progress: ${status.progress}%`);
    
    setVideoItems(prev => prev.map(item =>
      item.taskId === result.task_id
        ? {
            ...item,
            progress: status.progress,
            status: status.status === 'SUCCESS' 
              ? 'completed' 
              : status.status === 'FAILURE' 
              ? 'failed' 
              : 'loading',
            videoUrl: status.video_url || item.videoUrl,
            error: status.error?.message
          }
        : item
    ));
  },
  // ...
);
```

---

### BUG #18: 批量重绘符号信息可能导致提示词过长

**修复方案**:
```typescript
// App.tsx - 限制提示词长度
const MAX_PROMPT_LENGTH = 2000;  // 设置最大长度

for (let i = 0; i < orderedFrames.length; i++) {
  const frame = orderedFrames[i];
  const sceneNum = `SC-${String(i + 1).padStart(2, '0')}`;
  const instruction = instructions[sceneNum] || '';
  
  const symbolInstructions = frame.symbols
    .map(s => SYMBOL_DESCRIPTIONS[lang][s.name] || s.name)
    .filter(Boolean)
    .join(', ');
  
  let finalPrompt = frame.prompt;
  
  if (instruction) {
    finalPrompt = `${finalPrompt}. ${instruction}`;
  }
  
  // ✅ 只添加关键的符号信息，避免过长
  if (symbolInstructions && finalPrompt.length < MAX_PROMPT_LENGTH - 100) {
    finalPrompt = `${finalPrompt}. Key actions: ${symbolInstructions}`;
  }
  
  // 验证长度
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`Prompt for ${sceneNum} exceeds max length, truncating...`);
    finalPrompt = finalPrompt.substring(0, MAX_PROMPT_LENGTH);
  }
  
  // ...
}
```

---

### BUG #19 & #20: 导出提示词中的风格和序号问题

**修复方案**:
```typescript
// App.tsx - 改进 getOptimizedPrompts
const getOptimizedPrompts = useCallback((
  style?: StyleOption, 
  aspectRatio?: AspectRatio
) => {
  if (selectedIds.size === 0) return { zh: "", en: "" };
  
  const selectedItems = items
    .filter(it => selectedIds.has(it.id))
    .sort((a, b) => a.order - b.order);
  
  // 使用传入的参数或使用默认值
  const styleInfo = style?.nameZh || style?.name || '写实摄影';
  const styleInfoEn = style?.name || 'Realistic Photography';
  const aspectRatioInfo = aspectRatio || '16:9';
  
  // 生成中文版本
  const zhContent = (() => {
    let globalInstr = `【全局指令】必须按照以下规则生成视频：
1、禁止将参考图写入画面，按照参考图标注的序号生成视频
2、保持${styleInfo}风格
3、${aspectRatioInfo}画幅
【限制性指令】禁止闪烁，严禁背景形变，保持角色一致性。
单一连续电影镜头，沉浸式360度环境，无分屏，无边框，无分镜布局，无UI
【约束条件】不修改参考主体特征 | 保持视觉连续性 | 严格按编号顺序`;
    
    let content = `${globalInstr}\n\n`;
    
    // 使用 selectionOrder 来确定正确的序号
    const numberMap: Record<string, number> = {};
    if (selectionOrder.length > 0) {
      let frameNum = 1;
      for (const id of selectionOrder) {
        if (selectedItems.some(it => it.id === id)) {
          numberMap[id] = frameNum++;
        }
      }
    } else {
      selectedItems.forEach((it, idx) => {
        numberMap[it.id] = idx + 1;
      });
    }
    
    content += selectedItems.map(it => {
      const frameNum = numberMap[it.id] || 1;
      const sceneNum = `SC-${String(frameNum).padStart(2, '0')}`;
      
      // ... 其余代码
    }).join('\n\n');
    
    return content;
  })();
  
  // ... 英文版本类似
  
  return { zh: zhContent, en: enContent };
}, [selectedIds, items, selectionOrder]);
```

---

## 优先级 3：低严重性 BUG（可选修复）

### BUG #16: model 类型转换使用 as any

**修复方案**:
```typescript
// VideoGenDialog.tsx
<select
  value={model}
  onChange={(e) => setModel(e.target.value as 'sora-2' | 'sora-2-pro')}
  // ✅ 改为具体的类型而不是 as any
>
```

---

## 修复优先级总结

1. **立即修复** (影响功能正确性):
   - BUG #1: duration 参数丢失
   - BUG #3: chatDuration 未传递
   - BUG #5: 状态不同步
   - BUG #17: 批量重绘序号错误

2. **尽快修复** (影响用户体验):
   - BUG #2: 类型不一致
   - BUG #4: 参数类型错误
   - BUG #7: 状态转换不完整
   - BUG #11: 轮询逻辑不完整
   - BUG #19, #20: 导出功能问题

3. **可选修复** (代码质量):
   - BUG #16: 类型转换优化

