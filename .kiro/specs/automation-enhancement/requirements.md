# Requirements Document

## Introduction

基于现有的画布模块系统（文字、图片、视频模块），通过模块间的连线逻辑实现自动化工作流。用户可以在画布上搭建模块流程，设置预设提示词，上传参考附件，手动验证流程后保存为自动化模板，支持定时批量执行和自动下载到指定目录。

## Glossary

- **Canvas_Module**: 画布模块，包括文字模块、图片模块、视频模块
- **Connection_Logic**: 连线逻辑，定义模块间的数据流和执行顺序
- **Workflow_Template**: 工作流模板，用户验证后保存的自动化流程配置
- **Auto_Executor**: 自动执行器，根据模板和连线逻辑自动执行工作流
- **Scheduler**: 定时调度器，管理定时任务的执行
- **Template_Manager**: 模板管理器，管理工作流模板的保存、加载和执行
- **Auto_Downloader**: 自动下载器，将生成结果自动下载到指定目录

## Requirements

### Requirement 1: 模块连线数据传递增强

**User Story:** 作为用户，我希望现有的模块连线能够传递数据内容，这样上游模块的输出可以自动成为下游模块的输入。

#### Acceptance Criteria

1. WHEN 模块A连接到模块B THEN Connection_Logic SHALL 将模块A的输出内容传递给模块B
2. WHEN 模块B执行时 THEN Canvas_Module SHALL 自动将上游输入内容与本模块提示词结合
3. WHEN 连线建立 THEN Connection_Logic SHALL 在现有连线基础上增加数据传递功能
4. WHEN 模块输出更新 THEN Connection_Logic SHALL 自动更新下游模块的可用输入
5. WHEN 保存画布 THEN Connection_Logic SHALL 保存连线的数据传递配置

### Requirement 2: 现有提示词框功能扩展

**User Story:** 作为用户，我希望在现有的模块提示词输入框中能够引用上游模块的输出内容。

#### Acceptance Criteria

1. WHEN 用户在提示词框中输入变量语法 THEN Canvas_Module SHALL 支持引用连接模块的输出
2. WHEN 模块有上游连接 THEN Canvas_Module SHALL 在提示词框旁显示可用变量提示
3. WHEN 执行模块 THEN Canvas_Module SHALL 将变量替换为实际的上游输出内容
4. WHEN 提示词包含变量 THEN Canvas_Module SHALL 在现有输入框基础上增加变量解析
5. WHEN 变量无效 THEN Canvas_Module SHALL 在现有验证基础上增加变量检查

### Requirement 3: 画布状态保存为模板

**User Story:** 作为用户，我希望能够将当前画布的完整状态（包括模块、连线、提示词）保存为可重用的模板。

#### Acceptance Criteria

1. WHEN 用户点击"保存为模板" THEN Template_Manager SHALL 保存当前画布的完整配置
2. WHEN 保存模板 THEN Template_Manager SHALL 包含所有模块的位置、内容和提示词设置
3. WHEN 保存模板 THEN Template_Manager SHALL 保存所有连线关系和数据传递配置
4. WHEN 模板保存成功 THEN Template_Manager SHALL 在现有界面中增加模板管理入口
5. WHEN 加载模板 THEN Template_Manager SHALL 恢复完整的画布状态

### Requirement 4: 一键自动执行功能

**User Story:** 作为用户，我希望能够一键自动执行整个画布工作流，按连线顺序依次处理所有模块。

#### Acceptance Criteria

1. WHEN 用户点击"自动执行" THEN Auto_Executor SHALL 按连线逻辑顺序执行所有模块
2. WHEN 自动执行 THEN Auto_Executor SHALL 使用现有模块的生成功能进行处理
3. WHEN 模块执行完成 THEN Auto_Executor SHALL 将输出传递给下游连接的模块
4. WHEN 执行过程中 THEN Auto_Executor SHALL 在现有界面中显示执行进度
5. WHEN 执行完成 THEN Auto_Executor SHALL 在现有结果显示区域展示最终输出

### Requirement 5: 批量数据输入支持

**User Story:** 作为用户，我希望起始模块能够从指定的本地文件夹自动读取文字和图片文件，实现批量自动化处理。

#### Acceptance Criteria

1. WHEN 用户在起始模块设置文件夹路径 THEN Auto_Executor SHALL 自动读取文件夹中的文字文件（TXT）和图片文件（JPG、PNG）
2. WHEN 文件为TXT格式 THEN Auto_Executor SHALL 支持按分隔符（如******）或按行分割多组数据
3. WHEN 文件为图片格式 THEN Auto_Executor SHALL 直接作为图像输入传递给工作流
4. WHEN 批量处理执行 THEN Auto_Executor SHALL 按文件顺序依次处理
5. WHEN 批量处理完成 THEN Auto_Executor SHALL 按文件名组织输出结果

### Requirement 6: 定时执行调度

**User Story:** 作为用户，我希望能够设置定时任务，让系统在指定时间自动执行保存的模板。

#### Acceptance Criteria

1. WHEN 用户设置定时任务 THEN Scheduler SHALL 在现有设置界面中增加定时配置选项
2. WHEN 到达执行时间 THEN Scheduler SHALL 自动加载指定模板并执行
3. WHEN 定时执行 THEN Scheduler SHALL 使用现有的自动执行功能
4. WHEN 定时任务完成 THEN Scheduler SHALL 在现有通知系统中发送完成通知
5. WHEN 管理定时任务 THEN Scheduler SHALL 在现有界面中增加任务列表和管理功能

### Requirement 7: 自动下载增强

**User Story:** 作为用户，我希望系统能够自动下载所有生成的内容到指定目录，并按执行批次组织。

#### Acceptance Criteria

1. WHEN 工作流执行完成 THEN Auto_Downloader SHALL 扩展现有下载功能支持批量下载
2. WHEN 批量执行完成 THEN Auto_Downloader SHALL 为每次执行创建独立目录
3. WHEN 下载文件 THEN Auto_Downloader SHALL 使用现有的文件命名和组织逻辑
4. WHEN 设置下载目录 THEN Auto_Downloader SHALL 在现有设置中增加目录配置选项
5. WHEN 下载完成 THEN Auto_Downloader SHALL 在现有界面中显示下载状态和位置

### Requirement 9: 自动化执行状态管理

**User Story:** 作为用户，我希望自动化执行过程中能够暂停、恢复、取消任务，并且系统重启后能够恢复未完成的任务。

#### Acceptance Criteria

1. WHEN 自动化任务执行中 THEN Auto_Executor SHALL 支持暂停、恢复、取消操作
2. WHEN 系统意外关闭 THEN Auto_Executor SHALL 在重启后自动恢复未完成的任务
3. WHEN 任务暂停 THEN Auto_Executor SHALL 保存当前执行状态到本地存储
4. WHEN 任务恢复 THEN Auto_Executor SHALL 从暂停点继续执行而不是重新开始
5. WHEN 长时间运行 THEN Auto_Executor SHALL 定期保存执行进度防止数据丢失

### Requirement 10: 错误处理和重试机制

**User Story:** 作为用户，我希望自动化执行过程中遇到错误时能够智能处理，包括自动重试、跳过失败项、或者停止整个流程。

#### Acceptance Criteria

1. WHEN 单个模块执行失败 THEN Auto_Executor SHALL 根据配置决定重试、跳过或停止
2. WHEN 网络错误或API限制 THEN Auto_Executor SHALL 自动等待并重试
3. WHEN 连续失败次数超过阈值 THEN Auto_Executor SHALL 暂停任务并通知用户
4. WHEN 批量处理中部分失败 THEN Auto_Executor SHALL 记录失败项并继续处理其他项
5. WHEN 错误发生 THEN Auto_Executor SHALL 详细记录错误信息和上下文便于调试

### Requirement 11: 资源占用和性能控制

**User Story:** 作为用户，我希望自动化执行时能够控制系统资源占用，避免影响其他工作或超出API限制。

#### Acceptance Criteria

1. WHEN 自动化执行 THEN Auto_Executor SHALL 支持设置并发数量限制
2. WHEN API调用频繁 THEN Auto_Executor SHALL 自动控制请求间隔避免超出限制
3. WHEN 系统资源紧张 THEN Auto_Executor SHALL 自动降低处理速度
4. WHEN 用户设置优先级 THEN Auto_Executor SHALL 根据优先级分配资源
5. WHEN 长时间运行 THEN Auto_Executor SHALL 监控内存使用避免内存泄漏

### Requirement 12: 数据安全和隐私保护

**User Story:** 作为用户，我希望自动化处理过程中我的数据和文件得到安全保护，不会泄露或丢失。

#### Acceptance Criteria

1. WHEN 处理敏感文件 THEN Auto_Executor SHALL 在本地处理避免上传不必要的数据
2. WHEN 临时文件创建 THEN Auto_Executor SHALL 在处理完成后自动清理临时文件
3. WHEN 保存执行状态 THEN Auto_Executor SHALL 加密存储敏感信息
4. WHEN 网络传输 THEN Auto_Executor SHALL 使用安全连接传输数据
5. WHEN 用户删除模板 THEN Auto_Executor SHALL 彻底删除相关的所有数据和文件

### Requirement 8: 执行历史和监控

**User Story:** 作为用户，我希望能够查看自动执行的历史记录和结果，便于跟踪和管理。

#### Acceptance Criteria

1. WHEN 自动执行完成 THEN Template_Manager SHALL 在现有历史记录中保存执行详情
2. WHEN 查看历史 THEN Template_Manager SHALL 在现有界面中增加执行历史标签页
3. WHEN 显示历史记录 THEN Template_Manager SHALL 显示执行时间、模板名称、结果统计
4. WHEN 查看执行详情 THEN Template_Manager SHALL 显示每个模块的执行状态和输出
5. WHEN 重新执行 THEN Template_Manager SHALL 支持基于历史记录重新执行相同配置