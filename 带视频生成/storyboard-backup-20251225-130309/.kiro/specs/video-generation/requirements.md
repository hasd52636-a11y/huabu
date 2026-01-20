# 视频生成功能需求文档

## 介绍

为分镜创作平台添加视频生成功能，允许用户选择单张或多张分镜图片，输入视频提示词，一键生成视频。生成的视频在画布上以小窗口形式展示，支持加载、删除和下载操作。

## 术语表

- **Video_Generator**: 视频生成系统，负责调用 Sora 2 视频生成 API
- **Video_Window**: 画布上的视频展示窗口，用于缓冲和播放视频
- **Storyboard_Item**: 分镜项目，包含图片、提示词等信息
- **Video_Prompt**: 用户输入的视频生成提示词
- **Video_Asset**: 生成的视频文件或 URL
- **Canvas**: 主画布区域，用于展示分镜和视频窗口
- **Sora_2_API**: OpenAI Sora 2 官方视频生成 API，支持两个端点：
  - POST /v1/videos - 基础文本生成视频（逆向分组）
  - POST /v2/videos/generations - 文生视频和图生视频（新端点，支持文本和图片生成视频）
- **Sora_2_Image_to_Video_API**: Sora 2 图生视频 API，端点为 POST /v2/videos/generations（使用 images 参数）
- **Sora_2_Text_to_Video_API**: Sora 2 文生视频 API，端点为 POST /v2/videos/generations（仅使用 prompt 参数）
- **Video_Orientation**: 视频方向，支持横屏（Landscape）和竖屏（Portrait）
- **Video_Resolution**: 视频分辨率，支持 720P 和 1080P（仅 sora-2-pro）
- **Video_Duration**: 视频时长，支持 4 秒及以上（官方分组）或固定 10/15/25 秒（逆向分组）
- **Task_ID**: 视频生成任务的唯一标识符，用于追踪和编辑视频
- **Video_Status**: 视频任务状态，包括 queued（排队）、processing（处理中）、completed（完成）、failed（失败）
- **Video_Object**: Sora 2 API 返回的视频对象，包含 id、status、progress、size、seconds 等属性
- **Remix_API**: Sora 2 视频编辑 API，端点为 POST /v1/videos/{task_id}/remix，用于扩展或修改已生成的视频
- **Image_to_Video**: 图生视频功能，支持从单张或多张图片生成视频

## 需求

### 需求 1: 视频生成按钮与入口

**用户故事**: 作为分镜创作者，我想在分镜导出按钮旁边看到视频生成按钮，以便快速访问视频生成功能。

#### 接受标准

1. WHEN 用户在画布上选择至少一张分镜图片 THEN Video_Generator SHALL 在导出按钮旁显示"生成视频"按钮
2. WHEN 用户未选择任何分镜图片 THEN Video_Generator SHALL 禁用"生成视频"按钮并显示提示信息
3. WHEN 用户点击"生成视频"按钮 THEN Video_Generator SHALL 打开视频生成对话框
4. WHERE 用户选择了参考主体 THEN Video_Generator SHALL 在对话框中显示参考主体预览

### 需求 2: 视频生成对话框

**用户故事**: 作为分镜创作者，我想在对话框中输入视频提示词并配置生成参数（包括视频方向和分辨率），以便生成符合我需求的视频。

#### 接受标准

1. WHEN 视频生成对话框打开 THEN Video_Generator SHALL 显示已选分镜的缩略图列表
2. WHEN 用户在对话框中输入视频提示词 THEN Video_Generator SHALL 实时保存用户输入
3. WHEN 用户选择视频方向 THEN Video_Generator SHALL 支持横屏（720x1280、1792x1024）和竖屏（720x1280、1024x1792）两种选项
4. WHEN 用户选择视频分辨率 THEN Video_Generator SHALL 显示可用的分辨率选项（720P 所有模型支持，1080P 仅 sora-2-pro 支持）
5. WHEN 用户设置视频时长 THEN Video_Generator SHALL 支持 4 秒及以上的自定义时长（官方分组）或固定 10/15/25 秒选项（逆向分组）
6. WHEN 用户点击"生成"按钮 THEN Video_Generator SHALL 将选中的分镜图片、提示词、方向、分辨率和时长提交到 Sora_2_API
7. WHEN 用户点击"取消"按钮 THEN Video_Generator SHALL 关闭对话框并清空临时数据
8. WHERE 用户选择了多张分镜 THEN Video_Generator SHALL 显示分镜序列和过渡提示

### 需求 3: 视频生成与缓冲

**用户故事**: 作为分镜创作者，我想在画布上看到视频生成的进度，并在生成完成后自动加载视频。

#### 接受标准

1. WHEN 用户提交视频生成请求 THEN Video_Generator SHALL 在画布上创建一个视频窗口并显示加载状态
2. WHEN 视频正在生成 THEN Video_Window SHALL 显示进度指示器和"生成中..."文本
3. WHEN 视频生成完成且 status 为 completed THEN Video_Generator SHALL 从响应中获取 video_url（或 url）字段并在 Video_Window 中加载视频
4. WHEN progress 字段为 100 THEN Video_Window SHALL 显示"生成完成"状态
5. IF 视频生成失败（status 为 failed）THEN Video_Generator SHALL 在窗口中显示 error 对象中的 message 字段并提供重试选项
6. WHEN 视频加载完成 THEN Video_Window SHALL 显示视频播放器和操作按钮（编辑、删除、下载）

### 需求 4: 视频窗口管理

**用户故事**: 作为分镜创作者，我想在画布上管理视频窗口，包括移动、删除和下载视频。

#### 接受标准

1. WHEN 视频窗口显示在画布上 THEN Video_Window SHALL 支持拖拽移动位置
2. WHEN 用户点击视频窗口的删除按钮 THEN Video_Window SHALL 从画布上移除该视频
3. WHEN 用户点击视频窗口的下载按钮 THEN Video_Window SHALL 下载生成的视频文件
4. WHEN 用户在画布上滚动或缩放 THEN Video_Window SHALL 随之调整位置和大小
5. WHERE 画布上有多个视频窗口 THEN Video_Window SHALL 支持独立管理每个窗口

### 需求 5: 视频提示词管理

**用户故事**: 作为分镜创作者，我想能够编辑和优化视频提示词，以便生成更符合我需求的视频。

#### 接受标准

1. WHEN 用户在视频生成对话框中输入提示词 THEN Video_Generator SHALL 支持多行文本输入
2. WHEN 用户选择了多张分镜 THEN Video_Generator SHALL 自动生成分镜序列提示词
3. WHEN 用户点击"预览提示词"按钮 THEN Video_Generator SHALL 显示完整的提示词内容
4. WHEN 用户编辑提示词后点击"生成" THEN Video_Generator SHALL 使用编辑后的提示词生成视频
5. WHERE 用户选择了参考主体 THEN Video_Generator SHALL 在提示词中包含参考主体信息

### 需求 6: 视频API集成与配置

**用户故事**: 作为系统管理员，我想配置视频生成API，以便系统能够调用视频生成服务。

#### 接受标准

1. WHEN 系统初始化 THEN Video_Generator SHALL 检查视频API配置（Base URL 和 API Key）
2. WHEN 用户未配置视频API THEN Video_Generator SHALL 显示配置提示，引导用户获取 Base URL 和 API Key
3. WHEN 用户在设置中输入 Base URL 和 API Key THEN Video_Generator SHALL 验证配置的有效性
4. WHEN 配置验证成功 THEN Video_Generator SHALL 保存配置到本地存储（加密存储 API Key）
5. WHEN 调用视频API THEN Video_Generator SHALL 使用配置的 Base URL 和 API Key 进行认证
6. WHEN 构建 API 请求 THEN Video_Generator SHALL 在 Header 中添加 Authorization: Bearer {API_Key}
7. IF 视频API调用失败 THEN Video_Generator SHALL 返回错误信息并记录日志
8. WHEN API 返回错误响应（status 为 failed）THEN Video_Generator SHALL 解析 error 对象中的 code 和 message 字段
9. WHERE 错误代码为 generation_failed THEN Video_Generator SHALL 显示具体的失败原因（如"内容可能违反了我们的安全政策"）
10. WHEN 用户需要查看余额 THEN Video_Generator SHALL 调用 GET {Base_URL}/api/user/self 端点获取用户信息

### 需求 7: 视频窗口UI组件

**用户故事**: 作为前端开发者，我想有一个可复用的视频窗口组件，以便在画布上展示视频。

#### 接受标准

1. WHEN 创建视频窗口组件 THEN Video_Window SHALL 接收视频URL、标题和操作回调
2. WHEN 视频窗口渲染 THEN Video_Window SHALL 显示视频播放器、标题和操作按钮
3. WHEN 用户与视频窗口交互 THEN Video_Window SHALL 触发相应的回调函数
4. WHEN 视频窗口处于加载状态 THEN Video_Window SHALL 显示加载动画
5. WHERE 视频窗口处于错误状态 THEN Video_Window SHALL 显示错误信息和重试按钮

### 需求 8: 视频生成服务集成

**用户故事**: 作为系统架构师，我想有一个视频生成服务模块，以便与 Sora 2 API 进行通信。

#### 接受标准

1. WHEN 调用视频生成服务 THEN Video_Generator SHALL 接收分镜图片、提示词、方向、分辨率和时长参数
2. WHEN 视频生成服务处理请求 THEN Video_Generator SHALL 构建符合 Sora 2 API 格式的 multipart/form-data 请求
3. WHEN 视频生成失败 THEN Video_Generator SHALL 返回详细的错误信息
4. WHEN 视频生成成功 THEN Video_Generator SHALL 返回可下载的视频 URL
5. WHERE 视频生成需要轮询状态 THEN Video_Generator SHALL 实现异步状态检查机制

### 需求 9: 视频方向与分辨率配置

**用户故事**: 作为分镜创作者，我想能够灵活选择视频的方向（横屏/竖屏）和分辨率，以适应不同的播放场景。

#### 接受标准

1. WHEN 用户打开视频生成对话框 THEN Video_Generator SHALL 显示视频方向选择器（横屏/竖屏）
2. WHEN 用户选择横屏方向 THEN Video_Generator SHALL 显示可用的横屏分辨率选项（720x1280 720P、1792x1024 1080P 仅 sora-2-pro）
3. WHEN 用户选择竖屏方向 THEN Video_Generator SHALL 显示可用的竖屏分辨率选项（720x1280 720P、1024x1792 1080P 仅 sora-2-pro）
4. WHEN 用户选择 sora-2 模型 THEN Video_Generator SHALL 仅显示 720P 分辨率选项
5. WHEN 用户选择 sora-2-pro 模型 THEN Video_Generator SHALL 显示 720P 和 1080P 分辨率选项
6. WHEN 用户确认视频方向和分辨率 THEN Video_Generator SHALL 将对应的 size 参数（如 "720x1280"）传递给 Sora_2_API
7. WHERE 用户改变视频方向 THEN Video_Generator SHALL 自动更新可用的分辨率选项列表

### 需求 10: 视频时长配置

**用户故事**: 作为分镜创作者，我想能够设置视频的时长，以控制生成视频的长度和成本。

#### 接受标准

1. WHEN 用户打开视频生成对话框 THEN Video_Generator SHALL 显示视频时长配置选项
2. WHEN 使用官方分组 API THEN Video_Generator SHALL 支持 4 秒及以上的自定义时长设置
3. WHEN 使用逆向分组 API THEN Video_Generator SHALL 仅支持固定的时长选项（10 秒、15 秒、25 秒）
4. WHEN 用户选择时长后点击生成 THEN Video_Generator SHALL 将 seconds 参数传递给 Sora_2_API
5. WHERE 用户选择 sora-2-pro 模型 THEN Video_Generator SHALL 支持 25 秒的时长选项（逆向分组）
6. IF 用户输入的时长不符合要求 THEN Video_Generator SHALL 显示错误提示并阻止生成

### 需求 11: 视频编辑与 Remix 功能

**用户故事**: 作为分镜创作者，我想能够编辑已生成的视频，通过修改提示词来扩展或改进视频内容。

#### 接受标准

1. WHEN 视频生成完成并显示在画布上 THEN Video_Window SHALL 显示"编辑"按钮
2. WHEN 用户点击视频窗口的"编辑"按钮 THEN Video_Generator SHALL 打开视频编辑对话框
3. WHEN 视频编辑对话框打开 THEN Video_Generator SHALL 显示原视频预览和编辑提示词输入框
4. WHEN 用户输入编辑提示词（如"扩展场景"、"改变角度"等） THEN Video_Generator SHALL 实时保存用户输入
5. WHEN 用户点击"应用编辑"按钮 THEN Video_Generator SHALL 调用 Sora 2 Remix API（POST /v1/videos/{task_id}/remix）
6. WHEN 视频编辑完成 THEN Video_Window SHALL 自动加载并显示编辑后的视频
7. IF 视频编辑失败 THEN Video_Generator SHALL 在窗口中显示错误信息并提供重试选项
8. WHERE 用户取消编辑 THEN Video_Generator SHALL 关闭编辑对话框并保留原视频

### 需求 12: 视频编辑服务集成

**用户故事**: 作为系统架构师，我想有一个视频编辑服务模块，以便与 Sora 2 Remix API 进行通信。

#### 接受标准

1. WHEN 调用视频编辑服务 THEN Video_Generator SHALL 接收视频任务 ID 和编辑提示词
2. WHEN 视频编辑服务处理请求 THEN Video_Generator SHALL 构建符合 Sora 2 Remix API 格式的请求（POST /v1/videos/{task_id}/remix，body 为 JSON 格式）
3. WHEN 视频编辑失败（status 为 failed）THEN Video_Generator SHALL 返回详细的错误信息（从 error 字段获取）
4. WHEN 视频编辑成功（status 为 completed）THEN Video_Generator SHALL 从响应中获取 video_url 和新的任务 ID
5. WHERE 视频编辑需要轮询状态 THEN Video_Generator SHALL 实现异步状态检查机制，定期调用 GET /v1/videos/{new_task_id} 查询编辑后的视频状态

### 需求 14: 用户余额监控

**用户故事**: 作为分镜创作者，我想能够查看我的 API 余额，以便了解还能生成多少视频。

#### 接受标准

1. WHEN 用户打开应用 THEN Video_Generator SHALL 调用 GET {Base_URL}/v1/token/quota 获取令牌配额信息
2. WHEN 获取令牌配额成功 THEN Video_Generator SHALL 显示当前余额/配额信息（total_quota、used_quota、remaining_quota）
3. WHEN 用户余额不足 THEN Video_Generator SHALL 在"生成视频"按钮旁显示余额警告
4. WHEN 用户点击余额信息 THEN Video_Generator SHALL 显示详细的余额和使用情况
5. WHEN 用户生成视频后 THEN Video_Generator SHALL 定期刷新余额信息
6. IF 获取令牌配额失败 THEN Video_Generator SHALL 显示错误提示但不阻止用户操作
7. WHERE 用户余额为 0 THEN Video_Generator SHALL 禁用"生成视频"按钮并显示"余额不足"提示
8. WHEN 用户需要完整的用户信息 THEN Video_Generator SHALL 支持调用 GET {Base_URL}/api/user/self 端点（备选方案）

### 需求 16: 图生视频功能

**用户故事**: 作为分镜创作者，我想能够从分镜图片直接生成视频，而不仅仅是从文本生成。

#### 接受标准

1. WHEN 用户在视频生成对话框中选择了分镜图片 THEN Video_Generator SHALL 支持使用图生视频 API（POST /v2/videos/generations）
2. WHEN 用户输入视频提示词和选择参数 THEN Video_Generator SHALL 将分镜图片作为 images 参数提交
3. WHEN 用户选择视频方向 THEN Video_Generator SHALL 支持 16:9（横屏）和 9:16（竖屏）两种比例
4. WHEN 用户选择高清选项 THEN Video_Generator SHALL 仅在 sora-2-pro 模型下启用 hd 参数
5. WHEN 用户设置视频时长 THEN Video_Generator SHALL 支持 10/15/25 秒选项（仅 sora-2-pro 支持 15/25 秒）
6. WHEN 用户点击"生成"按钮 THEN Video_Generator SHALL 调用图生视频 API 并获取 task_id
7. WHEN 图生视频 API 返回 task_id THEN Video_Generator SHALL 使用该 task_id 轮询视频生成进度
8. WHERE 用户提交的图片包含真人 THEN Video_Generator SHALL 显示审查失败提示（"图片包含真人，无法生成"）
9. WHERE 用户的提示词包含违规内容 THEN Video_Generator SHALL 显示审查失败提示（"提示词包含违规内容"）
10. WHERE 生成结果审查不合格 THEN Video_Generator SHALL 显示生成失败提示（"生成结果未通过审查"）

### 需求 17: 视频生成性能优化

**用户故事**: 作为分镜创作者，我想了解视频生成的预期耗时，以便合理安排工作。

#### 接受标准

1. WHEN 用户选择标清视频 THEN Video_Generator SHALL 显示预期生成时间为 1-3 分钟
2. WHEN 用户选择 15 秒视频 THEN Video_Generator SHALL 显示预期生成时间为 3-5 分钟
3. WHEN 用户选择高清视频 THEN Video_Generator SHALL 显示预期生成时间为 8+ 分钟
4. WHEN 用户提交图片 THEN Video_Generator SHALL 优先使用美国访问速度较快的图片地址
5. WHEN 视频正在生成 THEN Video_Window SHALL 显示预期剩余时间
6. WHERE 图片访问速度慢 THEN Video_Generator SHALL 提示用户"图片加载较慢，可能影响生成速度"

### 需求 19: 文生视频功能

**用户故事**: 作为分镜创作者，我想能够直接从文本提示词生成视频，而不需要提供参考图片。

#### 接受标准

1. WHEN 用户在视频生成对话框中选择"仅文本生成" THEN Video_Generator SHALL 支持使用文生视频 API（POST /v2/videos/generations）
2. WHEN 用户输入视频提示词 THEN Video_Generator SHALL 将提示词作为 prompt 参数提交
3. WHEN 用户选择视频方向 THEN Video_Generator SHALL 支持 16:9（横屏）和 9:16（竖屏）两种比例
4. WHEN 用户选择高清选项 THEN Video_Generator SHALL 仅在 sora-2-pro 模型下启用 hd 参数
5. WHEN 用户设置视频时长 THEN Video_Generator SHALL 支持 10/15/25 秒选项（仅 sora-2-pro 支持 15/25 秒）
6. WHEN 用户选择 25 秒时长 THEN Video_Generator SHALL 自动禁用高清选项（HD 在 25 秒时不起作用）
7. WHEN 用户点击"生成"按钮 THEN Video_Generator SHALL 调用文生视频 API 并获取 task_id
8. WHEN 文生视频 API 返回 task_id THEN Video_Generator SHALL 使用该 task_id 轮询视频生成进度
9. WHERE 用户的提示词包含违规内容 THEN Video_Generator SHALL 显示审查失败提示（"提示词包含违规内容"）
10. WHERE 生成结果审查不合格 THEN Video_Generator SHALL 显示生成失败提示（"生成结果未通过审查"）

### 需求 20: 视频隐私和 WebHook 配置

**用户故事**: 作为分镜创作者，我想能够配置视频的隐私设置和接收生成完成的通知。

#### 接受标准

1. WHEN 用户在视频生成对话框中选择"隐私模式" THEN Video_Generator SHALL 设置 private 参数为 true
2. WHEN private 参数为 true THEN Video_Generator SHALL 显示提示"视频将不会发布，且无法进行二次编辑"
3. WHEN 用户配置 WebHook 地址 THEN Video_Generator SHALL 在 notify_hook 参数中传递该地址
4. WHEN 视频生成完成 THEN Video_Generator SHALL 接收来自 API 的 WebHook 回调通知
5. WHEN 接收到 WebHook 通知 THEN Video_Generator SHALL 自动更新视频窗口状态
6. WHERE 用户未配置 WebHook THEN Video_Generator SHALL 继续使用轮询机制查询视频状态
7. WHEN 用户启用水印选项 THEN Video_Generator SHALL 设置 watermark 参数为 true

### 需求 22: 角色创建与管理

**用户故事**: 作为分镜创作者，我想能够从生成的视频中提取角色，并在其他视频中重复使用这些角色。

#### 接受标准

1. WHEN 用户生成视频后 THEN Video_Generator SHALL 显示"创建角色"选项
2. WHEN 用户点击"创建角色" THEN Video_Generator SHALL 打开角色创建对话框
3. WHEN 角色创建对话框打开 THEN Video_Generator SHALL 显示视频预览和时间轴
4. WHEN 用户在时间轴上选择时间范围 THEN Video_Generator SHALL 支持选择 1-3 秒的时间段
5. WHEN 用户确认时间范围 THEN Video_Generator SHALL 调用创建角色 API（POST /sora/v1/characters）
6. WHEN 创建角色成功 THEN Video_Generator SHALL 保存角色信息并显示角色 ID
7. WHEN 用户在新视频的提示词中输入 @{角色Username} THEN Video_Generator SHALL 在生成视频时使用该角色
8. WHERE 用户上传自己的视频 THEN Video_Generator SHALL 支持从上传的视频中创建角色
9. WHERE 用户从已生成的任务中创建角色 THEN Video_Generator SHALL 使用 from_task 参数而不是 url 参数
10. IF 选择的时间范围不符合要求 THEN Video_Generator SHALL 显示"时间范围必须在 1-3 秒之间"提示

### 需求 23: 角色在视频生成中的应用

**用户故事**: 作为分镜创作者，我想能够在视频提示词中引用已创建的角色，以便在新视频中使用这些角色。

#### 接受标准

1. WHEN 用户在视频提示词中输入 @ THEN Video_Generator SHALL 显示已创建角色的列表
2. WHEN 用户选择一个角色 THEN Video_Generator SHALL 在提示词中插入 @{角色Username}
3. WHEN 提示词中包含角色引用 THEN Video_Generator SHALL 在 @ 和角色名之间保留空格
4. WHEN 用户生成包含角色引用的视频 THEN Video_Generator SHALL 将提示词原样传递给 API
5. WHERE 提示词中有多个角色引用 THEN Video_Generator SHALL 支持在同一视频中使用多个角色
6. IF 角色引用格式不正确 THEN Video_Generator SHALL 显示"角色引用格式错误，请使用 @{角色Username}"提示

### 需求 24: 角色 API 集成

**用户故事**: 作为系统架构师，我想有一个角色管理服务模块，以便与 Sora 2 角色 API 进行通信。

#### 接受标准

1. WHEN 调用角色创建服务 THEN Video_Generator SHALL 接收视频 URL 或 task_id、时间戳范围参数
2. WHEN 角色创建服务处理请求 THEN Video_Generator SHALL 构建符合 Sora 2 角色 API 格式的 JSON 请求
3. WHEN 角色创建 API 返回成功 THEN Video_Generator SHALL 返回角色信息（包括角色 ID 和 Username）
4. WHEN 角色创建失败 THEN Video_Generator SHALL 返回详细的错误信息
5. WHERE 用户提供视频 URL THEN Video_Generator SHALL 使用 url 参数
6. WHERE 用户从已生成任务创建角色 THEN Video_Generator SHALL 使用 from_task 参数
