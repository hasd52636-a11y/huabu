/**
 * 自动化下载修复测试
 * 测试自动化执行完成后的下载功能
 */

import { AutoExecutionService } from '../services/AutoExecutionService';
import DownloadManager from '../services/DownloadManager';

describe('自动化下载修复测试', () => {
  let autoExecutionService: AutoExecutionService;
  let downloadManager: DownloadManager;

  beforeEach(() => {
    autoExecutionService = new AutoExecutionService();
    downloadManager = new DownloadManager();
    
    // 模拟下载管理器配置
    downloadManager.updateConfig({
      enableSilentDownload: true,
      batchDownloadDelay: 100,
      autoDownload: true,
      enableNotifications: false
    });
  });

  test('应该为每个有内容的节点触发下载', async () => {
    const mockBlocks = [
      {
        id: 'block1',
        number: 'A01',
        type: 'text' as const,
        content: '这是文本内容',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        status: 'idle' as const
      },
      {
        id: 'block2', 
        number: 'B01',
        type: 'image' as const,
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        x: 300,
        y: 100,
        width: 200,
        height: 200,
        status: 'idle' as const
      },
      {
        id: 'block3',
        number: 'C01', 
        type: 'video' as const,
        content: 'https://example.com/video.mp4',
        x: 500,
        y: 100,
        width: 300,
        height: 200,
        status: 'idle' as const
      }
    ];

    const mockConnections = [
      {
        id: 'conn1',
        fromId: 'block1',
        toId: 'block2',
        instruction: '根据文本生成图片'
      },
      {
        id: 'conn2', 
        fromId: 'block2',
        toId: 'block3',
        instruction: '根据图片生成视频'
      }
    ];

    // 模拟批量数据
    const batchData = ['数据1', '数据2'];
    
    // 模拟节点执行函数
    const mockOnNodeExecute = jest.fn().mockResolvedValue(undefined);
    
    // 模拟进度更新函数
    const mockOnProgressUpdate = jest.fn();

    // 启动自动执行
    await autoExecutionService.startExecution(
      mockBlocks,
      mockConnections,
      mockOnNodeExecute,
      mockOnProgressUpdate,
      batchData,
      'download', // 使用下载模式
      undefined, // onCreateBlock
      ['A01'] // templateFinalOutputModules - 指定A01为最终输出模块
    );

    // 验证下载功能
    expect(mockOnNodeExecute).toHaveBeenCalled();
    
    // 验证每个批次都会执行
    expect(mockOnNodeExecute).toHaveBeenCalledTimes(batchData.length * mockBlocks.length);
  });

  test('静默下载应该不显示文件选择器', async () => {
    const mockBlob = new Blob(['test content'], { type: 'text/plain' });
    const filename = 'test_file.txt';
    
    // 模拟DOM操作
    const mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: jest.fn(),
      setAttribute: jest.fn()
    };
    
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    // 添加下载任务
    const downloadId = downloadManager.addDownload('test-url', filename);
    
    // 处理下载队列
    await downloadManager.processQueue();
    
    // 验证DOM操作
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.style.display).toBe('none');
    expect(mockLink.click).toHaveBeenCalled();
    
    // 清理
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  test('应该正确识别可下载的内容类型', async () => {
    const testCases = [
      {
        type: 'image',
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        expected: true
      },
      {
        type: 'video',
        content: 'https://example.com/video.mp4',
        expected: true
      },
      {
        type: 'text',
        content: '这是普通文本内容',
        expected: false
      },
      {
        type: 'text',
        content: 'https://example.com/file.txt',
        expected: false // 文本URL暂不支持下载
      }
    ];

    for (const testCase of testCases) {
      const mockBlock = {
        id: 'test-block',
        number: 'T01',
        type: testCase.type as any,
        content: testCase.content,
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        status: 'idle' as const
      };

      const mockNode = {
        blockId: 'test-block',
        blockNumber: 'T01',
        blockType: testCase.type as any,
        dependencies: [],
        estimatedDuration: 30
      };

      // 使用私有方法测试（通过类型断言访问）
      const hasDownloadable = await (autoExecutionService as any).hasDownloadableContent(mockNode, mockBlock);
      
      expect(hasDownloadable).toBe(testCase.expected);
    }
  });

  test('批量下载应该按顺序处理避免浏览器限制', async () => {
    const batchItems = [
      { url: 'https://example.com/video1.mp4', filename: 'video1.mp4' },
      { url: 'https://example.com/video2.mp4', filename: 'video2.mp4' },
      { url: 'https://example.com/video3.mp4', filename: 'video3.mp4' }
    ];

    const batchConfig = {
      executionId: 'test-execution',
      batchId: 'test-batch',
      maxConcurrentDownloads: 1
    };

    const downloadIds = downloadManager.addBatchDownloads(batchItems, batchConfig);
    
    expect(downloadIds).toHaveLength(3);
    
    // 验证批量进度跟踪
    const batchProgress = downloadManager.getBatchProgress('test-batch');
    expect(batchProgress.total).toBe(3);
    expect(batchProgress.pending).toBe(3);
  });
});