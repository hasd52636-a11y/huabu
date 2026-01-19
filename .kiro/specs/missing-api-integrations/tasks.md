# Implementation Plan: Missing API Integrations

## Overview

本实现计划将在现有Canvas智能创作平台基础上增量实现缺失的API功能。神马API作为统一的中转站，包含：
1. **主要模型端口**：已配置的文本、图像、视频主要模型
2. **专用功能接口**：主要模型无法实现的特定功能（如ByteEdit v2.0图像编辑、Qwen视频生成等）通过神马API专用接口实现
3. **统一调度**：所有请求统一通过神马API发送，支持并发和极限调度优化

所有实现将使用TypeScript，保持现有架构和布局不变，重点做好并发调度和性能优化。

## Tasks

- [x] 1. 扩展ShenmaService类实现ByteEdit v2.0专用图像编辑接口
  - [x] 1.1 实现cropImage()方法
    - 通过神马API专用接口调用ByteEdit v2.0裁剪功能
    - 支持智能裁剪和手动坐标裁剪
    - 处理图像格式转换和参数验证
    - _Requirements: 1.1_
  
  - [ ]* 1.2 为cropImage()方法编写属性测试
    - **Property 4: 图像编辑操作保真性**
    - **Validates: Requirements 1.1**
  
  - [x] 1.3 实现transferImageStyle()方法
    - 通过神马API专用接口调用ByteEdit v2.0风格迁移
    - 支持多种风格转换参数
    - 实现风格强度控制
    - _Requirements: 1.2_
  
  - [ ]* 1.4 为transferImageStyle()方法编写属性测试
    - **Property 4: 图像编辑操作保真性**
    - **Validates: Requirements 1.2**
  
  - [x] 1.5 实现addImageElement()方法
    - 添加元素添加API调用逻辑
    - 支持位置和大小控制
    - 实现多种混合模式
    - _Requirements: 1.3_
  
  - [ ]* 1.6 为addImageElement()方法编写属性测试
    - **Property 4: 图像编辑操作保真性**
    - **Validates: Requirements 1.3**
  
  - [x] 1.7 实现replaceImageElement()方法
    - 添加元素替换API调用逻辑
    - 支持遮罩和智能识别
    - 实现背景保护功能
    - _Requirements: 1.4_
  
  - [ ]* 1.8 为replaceImageElement()方法编写属性测试
    - **Property 4: 图像编辑操作保真性**
    - **Validates: Requirements 1.4**

- [x] 2. 实现神马API Qwen模型专用视频生成接口
  - [x] 2.1 实现imageToAction()方法
    - 通过神马API专用接口调用Qwen图像转动作功能
    - 支持动作强度和时长控制
    - 实现异步任务提交和ID返回
    - _Requirements: 2.1_
  
  - [ ]* 2.2 为imageToAction()方法编写属性测试
    - **Property 5: 视频生成参数有效性**
    - **Validates: Requirements 2.1**
  
  - [x] 2.3 实现generateDanceVideo()方法
    - 通过神马API专用接口调用Qwen舞蹈生成功能
    - 支持参考图像和风格控制
    - 实现竖屏优化和时长设置
    - _Requirements: 2.2_
  
  - [ ]* 2.4 为generateDanceVideo()方法编写属性测试
    - **Property 5: 视频生成参数有效性**
    - **Validates: Requirements 2.2**

- [x] 3. 实现Sora2标准接口
  - [x] 3.1 创建/v1/videos标准接口处理器
    - 实现符合Sora2标准的请求解析
    - 添加参数验证和格式转换
    - 支持标准响应格式返回
    - _Requirements: 3.1, 3.3_
  
  - [x] 3.2 创建/v1/videos/{task_id}/remix接口处理器
    - 实现视频重制功能
    - 支持重制参数和风格控制
    - 添加任务状态管理
    - _Requirements: 3.2, 3.4_
  
  - [ ]* 3.3 为Sora2标准接口编写属性测试
    - **Property 8: API响应格式标准化**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. 优化神马API统一调度和并发处理
  - [x] 4.1 实现统一的神马API调度器
    - 创建统一的请求调度和路由逻辑
    - 实现主要模型端口和专用接口的智能路由
    - 添加请求队列和并发控制
    - _Requirements: 4.1_
  
  - [x] 4.2 优化并发和极限调度性能
    - 实现请求池和连接复用
    - 添加智能负载均衡和限流
    - 支持请求优先级和批处理
    - _Requirements: 4.2_
  
  - [x] 4.3 标准化所有神马API调用格式
    - 统一请求头和参数格式
    - 实现响应格式标准化处理
    - 添加调用日志和监控
    - _Requirements: 4.3_
  
  - [ ]* 4.4 为API规范化编写属性测试
    - **Property 1: API调用统一性**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 5. 检查点 - 确保核心API功能正常
  - 确保所有测试通过，询问用户是否有问题

- [x] 6. 通过神马API专用接口实现Google Veo3模型对接
  - [x] 6.1 添加Veo3专用接口集成
    - 通过神马API专用接口调用Veo3模型
    - 实现Veo3参数配置和验证
    - 支持Veo3响应格式处理
    - _Requirements: 5.1, 5.2_
  
  - [x] 6.2 实现Veo3错误处理和回退
    - 添加Veo3特定的错误处理
    - 实现服务不可用时的回退策略
    - 支持备选方案提示
    - _Requirements: 5.3, 5.4_
  
  - [ ]* 6.3 为Veo3集成编写属性测试
    - **Property 5: 视频生成参数有效性**
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. 实现异步图像生成能力
  - [x] 7.1 创建AsyncTaskManager类
    - 实现任务状态管理
    - 添加任务轮询机制
    - 支持任务取消和清理
    - _Requirements: 6.1, 6.2_
  
  - [x] 7.2 实现任务状态轮询逻辑
    - 添加智能轮询间隔调整
    - 实现轮询超时和错误处理
    - 支持进度回调和通知
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 7.3 为异步任务管理编写属性测试
    - **Property 2: 异步任务状态一致性**
    - **Property 7: 任务轮询终止性**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 8. 通过神马API专用接口实现Flux与Recraftv3图像模型集成
  - [x] 8.1 添加Flux模型专用接口集成
    - 通过神马API专用接口调用Flux模型
    - 添加Flux参数配置和验证
    - 支持Flux响应格式处理
    - _Requirements: 7.1, 7.4_
  
  - [x] 8.2 添加Recraftv3模型专用接口集成
    - 通过神马API专用接口调用Recraftv3模型
    - 添加Recraftv3参数配置和验证
    - 支持Recraftv3响应格式处理
    - _Requirements: 7.2, 7.4_
  
  - [x] 8.3 实现模型切换和UI一致性
    - 添加模型选择和切换逻辑
    - 保持UI界面的一致性
    - 实现模型特定参数显示
    - _Requirements: 7.3, 7.5_
  
  - [ ]* 8.4 为新图像模型编写属性测试
    - **Property 5: 视频生成参数有效性** (适用于图像生成)
    - **Validates: Requirements 7.1, 7.2**

- [x] 9. 实现高级视频功能
  - [x] 9.1 实现视频重制功能
    - 添加视频重制API调用
    - 支持重制参数和风格控制
    - 实现变体生成逻辑
    - _Requirements: 8.1, 8.5_
  
  - [x] 9.2 实现多图生视频功能
    - 添加多图合成视频API调用
    - 支持图像间过渡效果控制
    - 实现时序和节奏调整
    - _Requirements: 8.2, 8.4_
  
  - [ ]* 9.3 为高级视频功能编写属性测试
    - **Property 5: 视频生成参数有效性**
    - **Validates: Requirements 8.1, 8.2**

- [x] 10. 实现异常处理与重试逻辑
  - [x] 10.1 创建APIErrorHandler类
    - 实现分层错误处理策略
    - 添加错误分类和严重性判断
    - 支持自定义错误处理策略
    - _Requirements: 9.1, 9.2_
  
  - [x] 10.2 实现智能重试机制
    - 添加指数退避重试策略
    - 实现网络异常处理
    - 支持重试次数限制和日志记录
    - _Requirements: 9.3, 9.4_
  
  - [x] 10.3 实现错误恢复和通知
    - 添加自动恢复机制
    - 实现用户友好的错误提示
    - 支持错误日志和监控
    - _Requirements: 9.5_
  
  - [ ]* 10.4 为错误处理编写属性测试
    - **Property 3: 错误重试幂等性**
    - **Validates: Requirements 9.1, 9.3**

- [x] 11. 确保增量修改约束
  - [x] 11.1 验证现有功能完整性
    - 运行现有功能的回归测试
    - 确保所有现有API调用正常工作
    - 验证UI布局和交互未受影响
    - _Requirements: 10.1, 10.2_
  
  - [x] 11.2 实现向后兼容性保证
    - 确保现有API接口保持兼容
    - 实现配置迁移和升级逻辑
    - 支持渐进式功能启用
    - _Requirements: 10.3, 10.4_
  
  - [ ]* 11.3 为兼容性编写属性测试
    - **Property 6: 配置向后兼容性**
    - **Validates: Requirements 10.1, 10.3**

- [x] 12. 集成测试和最终验证
  - [x] 12.1 运行完整的集成测试套件
    - 执行所有API集成测试
    - 验证异步任务处理流程
    - 测试错误处理和恢复机制
    - _Requirements: 所有需求_
  
  - [x] 12.2 性能和负载测试
    - 测试并发API调用性能
    - 验证内存使用和资源管理
    - 确保响应时间在合理范围内
    - _Requirements: 所有需求_
  
  - [ ]* 12.3 编写端到端属性测试
    - **Property 1-8: 所有正确性属性的综合验证**
    - **Validates: 所有需求**

- [x] 13. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，询问用户是否有问题

## Notes

- 任务标记为 `*` 的是可选测试任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求条目以确保可追溯性
- 检查点任务确保增量验证和用户反馈
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
- 所有实现都基于现有TypeScript架构进行增量扩展