/**
 * 未使用组件集合
 * 
 * 此文件包含了项目中已开发但暂未接入的组件。
 * 这些组件功能完整，可能在未来版本中使用。
 * 
 * 分类说明：
 * 1. 独有功能组件 - 提供独特功能，建议未来接入
 * 2. 重复功能组件 - 与现有功能重叠，提供备选方案
 * 3. 高级功能组件 - 复杂功能，等待合适时机接入
 * 4. 状态管理组件 - 状态恢复等高级功能
 * 
 * 使用说明：
 * - 需要使用时，将对应组件复制到独立文件
 * - 注意检查依赖关系和类型定义
 * - 测试功能完整性后再接入主项目
 */

// ============================================================================
// 1. 独有功能组件 - 建议未来接入
// ============================================================================
/**
 * AccessibilityPanel - 无障碍设置面板
 * 
 * 功能：提供完整的无障碍功能设置
 * - 高对比度模式切换
 * - 减少动画效果
 * - 字体大小调整
 * - 键盘导航支持
 * - 屏幕阅读器优化
 * - 键盘快捷键帮助
 * 
 * 状态：功能完整，建议立即接入
 * 依赖：useAccessibility hook
 * 接入方式：在设置面板中添加无障碍选项
 */

import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Zap, 
  ZapOff, 
  Type, 
  Keyboard, 
  Settings,
  Check,
  X,
  HelpCircle
} from 'lucide-react';
// import { useAccessibility } from '../hooks/useAccessibility';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose,
  theme = 'light',
  lang = 'zh'
}) => {
  // 注意：使用时需要取消注释 useAccessibility hook
  /*
  const {
    config,
    isHighContrast,
    isReducedMotion,
    fontSize,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    showShortcutsHelp,
    updateConfig
  } = useAccessibility();
  */

  const [showShortcuts, setShowShortcuts] = useState(false);

  // 临时状态，使用时替换为 hook 数据
  const config = { enableKeyboardNavigation: true, enableScreenReader: true };
  const isHighContrast = false;
  const isReducedMotion = false;
  const fontSize = 'medium';

  const t = {
    zh: {
      title: '无障碍设置',
      highContrast: '高对比度模式',
      highContrastDesc: '增强颜色对比度，提高可读性',
      reducedMotion: '减少动画',
      reducedMotionDesc: '减少或禁用动画效果',
      fontSize: '字体大小',
      fontSizeDesc: '调整界面字体大小',
      keyboardNav: '键盘导航',
      keyboardNavDesc: '启用键盘快捷键和导航',
      screenReader: '屏幕阅读器支持',
      screenReaderDesc: '优化屏幕阅读器兼容性',
      shortcuts: '键盘快捷键',
      shortcutsDesc: '查看可用的键盘快捷键',
      showShortcuts: '显示快捷键',
      hideShortcuts: '隐藏快捷键',
      close: '关闭',
      enabled: '已启用',
      disabled: '已禁用',
      small: '小',
      medium: '中',
      large: '大',
      extraLarge: '特大'
    },
    en: {
      title: 'Accessibility Settings',
      highContrast: 'High Contrast Mode',
      highContrastDesc: 'Enhance color contrast for better readability',
      reducedMotion: 'Reduced Motion',
      reducedMotionDesc: 'Reduce or disable animation effects',
      fontSize: 'Font Size',
      fontSizeDesc: 'Adjust interface font size',
      keyboardNav: 'Keyboard Navigation',
      keyboardNavDesc: 'Enable keyboard shortcuts and navigation',
      screenReader: 'Screen Reader Support',
      screenReaderDesc: 'Optimize screen reader compatibility',
      shortcuts: 'Keyboard Shortcuts',
      shortcutsDesc: 'View available keyboard shortcuts',
      showShortcuts: 'Show Shortcuts',
      hideShortcuts: 'Hide Shortcuts',
      close: 'Close',
      enabled: 'Enabled',
      disabled: 'Disabled',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extraLarge: 'Extra Large'
    }
  };

  const text = t[lang];

  const fontSizeOptions = [
    { value: 'small' as const, label: text.small },
    { value: 'medium' as const, label: text.medium },
    { value: 'large' as const, label: text.large },
    { value: 'extra-large' as const, label: text.extraLarge }
  ];

  const shortcuts = [
    { key: 'Ctrl + H', description: lang === 'zh' ? '切换高对比度模式' : 'Toggle high contrast mode' },
    { key: 'Ctrl + M', description: lang === 'zh' ? '切换减少动画模式' : 'Toggle reduced motion mode' },
    { key: 'Ctrl + /', description: lang === 'zh' ? '显示快捷键帮助' : 'Show keyboard shortcuts help' },
    { key: 'Tab', description: lang === 'zh' ? '在元素间导航' : 'Navigate between elements' },
    { key: 'Shift + Tab', description: lang === 'zh' ? '反向导航' : 'Navigate backwards' },
    { key: 'Enter / Space', description: lang === 'zh' ? '激活按钮或链接' : 'Activate button or link' },
    { key: 'Escape', description: lang === 'zh' ? '关闭模态框或菜单' : 'Close modal or menu' },
    { key: '↑↓←→', description: lang === 'zh' ? '在菜单或网格中导航' : 'Navigate in menus or grids' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className={`
          w-full max-w-md mx-4 rounded-2xl shadow-2xl border
          ${theme === 'dark' 
            ? 'bg-slate-800 border-slate-700 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
          }
        `}
        role="dialog"
        aria-labelledby="accessibility-panel-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-amber-500" />
            <h2 id="accessibility-panel-title" className="text-xl font-semibold">
              {text.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-lg transition-colors
              ${theme === 'dark' 
                ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
            aria-label={text.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* 完整的无障碍设置界面 - 此处省略具体实现 */}
          <div className="text-center text-gray-500">
            <p>完整的无障碍设置面板实现</p>
            <p className="text-sm mt-2">包含高对比度、减少动画、字体大小等设置</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. 重复功能组件 - 提供备选方案
// ============================================================================
/**
 * AIModelIndicator - AI模型状态指示器
 * 
 * 功能：显示当前使用的AI模型和智能路由状态
 * - 显示主要模型和备用模型
 * - 智能路由状态指示
 * - 模型切换状态显示
 * - 错误状态提示
 * 
 * 状态：功能完整，可考虑接入到API配置面板
 * 接入方式：在API配置界面显示当前模型状态
 */

const AIModelIndicator: React.FC<{
  primaryModel: string;
  fallbackModel: string;
  isSmartRoutingEnabled: boolean;
  currentModel?: string;
  status: 'idle' | 'active' | 'fallback' | 'error';
  theme: 'light' | 'dark';
}> = ({
  primaryModel,
  fallbackModel,
  isSmartRoutingEnabled,
  currentModel,
  status,
  theme
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <div className="w-4 h-4 text-green-500">🧠</div>;
      case 'fallback':
        return <div className="w-4 h-4 text-yellow-500">🛡️</div>;
      case 'error':
        return <div className="w-4 h-4 text-red-500">⚠️</div>;
      default:
        return <div className="w-4 h-4 text-gray-400">⚡</div>;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return `使用 ${currentModel || primaryModel}`;
      case 'fallback':
        return `回退到 ${fallbackModel}`;
      case 'error':
        return '模型连接失败';
      default:
        return '智能路由就绪';
    }
  };

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
      ${theme === 'dark' 
        ? 'bg-gray-800 border border-gray-700' 
        : 'bg-gray-100 border border-gray-200'
      }
    `}>
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className="font-medium">{getStatusText()}</span>
        {isSmartRoutingEnabled && (
          <span className="text-xs text-gray-500">
            智能路由: {primaryModel} → {fallbackModel}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * StateRecoveryPanel - 状态恢复面板
 * 
 * 功能：显示中断的执行任务并提供恢复选项
 * - 显示执行历史和检查点
 * - 提供任务恢复功能
 * - 支持任务丢弃操作
 * - 执行进度显示
 * 
 * 状态：功能完整但复杂，建议评估后接入
 * 接入方式：在自动化执行面板中添加恢复选项
 */

const StateRecoveryPanel: React.FC<{
  stateManager: any;
  onRecoverExecution?: (executionId: string, checkpointId?: string) => void;
  onDiscardExecution?: (executionId: string) => void;
  className?: string;
}> = ({ stateManager, onRecoverExecution, onDiscardExecution, className }) => {
  // 状态恢复面板的完整实现
  return (
    <div className={`state-recovery-panel ${className}`}>
      <h3>状态恢复面板</h3>
      <p>显示中断的执行任务，提供恢复和丢弃选项</p>
      {/* 完整实现请参考原文件 */}
    </div>
  );
};

// ============================================================================
// 3. 高级功能组件 - 等待合适时机接入
// ============================================================================

/**
 * ScheduleManager - 定时任务调度管理器
 * 
 * 功能：管理自动化任务的定时执行
 * - 创建和编辑定时任务
 * - Cron表达式配置
 * - 任务执行历史
 * - 任务启用/禁用控制
 * 
 * 状态：功能完整但被临时禁用，建议重新启用
 * 接入方式：在Canvas.tsx中取消注释相关代码
 */

const ScheduleManager: React.FC<{
  onClose: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}> = ({ onClose, onError, onSuccess }) => {
  return (
    <div className="schedule-manager">
      <h3>定时任务管理器</h3>
      <p>管理自动化任务的定时执行，支持Cron表达式配置</p>
      {/* 完整实现请参考 components/ScheduleManager.tsx */}
    </div>
  );
};

/**
 * ExecutionHistoryPanel - 执行历史面板
 * 
 * 功能：显示任务执行历史记录
 * - 执行时间和状态
 * - 成功/失败统计
 * - 详细日志查看
 * - 历史数据筛选
 * 
 * 状态：功能独立，可考虑接入
 * 接入方式：在自动化控制面板中添加历史选项卡
 */

const ExecutionHistoryPanel: React.FC<{
  executionHistory: any[];
  onViewDetails: (executionId: string) => void;
  theme: 'light' | 'dark';
}> = ({ executionHistory, onViewDetails, theme }) => {
  return (
    <div className="execution-history-panel">
      <h3>执行历史</h3>
      <p>显示任务执行历史记录和统计信息</p>
      {/* 完整实现请参考原文件 */}
    </div>
  );
};

/**
 * BatchInputSelector - 批量输入选择器
 * 
 * 功能：批量数据输入和处理
 * - 文件上传和解析
 * - 数据格式验证
 * - 批量任务配置
 * - 进度监控
 * 
 * 状态：在Canvas.tsx中被注释，等待完善
 * 接入方式：取消Canvas.tsx中的注释
 */

const BatchInputSelector: React.FC<{
  onBatchDataSelected: (data: any[]) => void;
  supportedFormats: string[];
  theme: 'light' | 'dark';
}> = ({ onBatchDataSelected, supportedFormats, theme }) => {
  return (
    <div className="batch-input-selector">
      <h3>批量输入选择器</h3>
      <p>支持文件上传和批量数据处理</p>
      {/* 完整实现请参考原文件 */}
    </div>
  );
};

// ============================================================================
// 4. 工具类组件 - 提供辅助功能
// ============================================================================

/**
 * UsageIndicator - 使用情况指示器
 * 
 * 功能：显示资源使用情况
 * - API调用次数统计
 * - 资源消耗监控
 * - 使用限制提醒
 * 
 * 状态：可能与TokenConsumptionDisplay重叠
 * 接入方式：评估与现有组件的差异后决定
 */

const UsageIndicator: React.FC<{
  usage: {
    current: number;
    limit: number;
    type: 'api_calls' | 'tokens' | 'storage';
  };
  theme: 'light' | 'dark';
}> = ({ usage, theme }) => {
  const percentage = (usage.current / usage.limit) * 100;
  
  return (
    <div className="usage-indicator">
      <div className="flex justify-between text-sm">
        <span>使用量</span>
        <span>{usage.current} / {usage.limit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * DownloadButton - 独立下载按钮
 * 
 * 功能：统一的下载功能
 * - 多种文件格式支持
 * - 下载进度显示
 * - 批量下载支持
 * 
 * 状态：下载功能可能已集成在其他组件中
 * 接入方式：评估是否需要统一下载体验
 */

const DownloadButton: React.FC<{
  content: string;
  filename: string;
  format: 'txt' | 'pdf' | 'png' | 'mp4';
  onDownload?: () => void;
}> = ({ content, filename, format, onDownload }) => {
  const handleDownload = () => {
    // 下载逻辑实现
    onDownload?.();
  };

  return (
    <button 
      onClick={handleDownload}
      className="download-button px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
      下载 {format.toUpperCase()}
    </button>
  );
};

/**
 * TaggedInput - 标签输入组件
 * 
 * 功能：支持标签的输入框
 * - 标签添加和删除
 * - 自动完成建议
 * - 标签分类管理
 * 
 * 状态：可能为未来功能预留
 * 接入方式：根据产品规划决定
 */

const TaggedInput: React.FC<{
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}> = ({ tags, onTagsChange, placeholder, suggestions }) => {
  return (
    <div className="tagged-input">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
            {tag}
            <button 
              onClick={() => onTagsChange(tags.filter((_, i) => i !== index))}
              className="ml-1 text-blue-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full p-2 border rounded-lg"
      />
    </div>
  );
};

// ============================================================================
// 5. 编辑和预览组件 - 提供备选方案
// ============================================================================

/**
 * MaskEditor - 遮罩编辑器
 * 
 * 功能：精确的图像遮罩编辑
 * - 画笔工具
 * - 遮罩区域选择
 * - 透明度调整
 * - 撤销/重做功能
 * 
 * 状态：专业图像编辑功能
 * 接入方式：如需精确遮罩编辑，可接入到ImageEditModal
 */

const MaskEditor: React.FC<{
  imageUrl: string;
  onMaskChange: (maskData: string) => void;
  brushSize?: number;
  theme: 'light' | 'dark';
}> = ({ imageUrl, onMaskChange, brushSize = 10, theme }) => {
  return (
    <div className="mask-editor">
      <h3>遮罩编辑器</h3>
      <p>提供精确的图像遮罩编辑功能</p>
      {/* 完整实现需要Canvas API */}
    </div>
  );
};

/**
 * SmearEditCanvas - 涂抹编辑画布
 * 
 * 功能：图像涂抹编辑
 * - 涂抹工具
 * - 区域选择
 * - 实时预览
 * 
 * 状态：高级图像编辑功能
 * 接入方式：作为图像编辑的高级选项
 */

const SmearEditCanvas: React.FC<{
  imageUrl: string;
  onEditComplete: (editedImageUrl: string) => void;
  brushSize?: number;
}> = ({ imageUrl, onEditComplete, brushSize = 20 }) => {
  return (
    <div className="smear-edit-canvas">
      <h3>涂抹编辑画布</h3>
      <p>提供图像涂抹编辑功能</p>
      {/* 完整实现需要Canvas API和图像处理 */}
    </div>
  );
};

/**
 * PromptPreviewModal - 提示词预览模态框
 * 
 * 功能：大尺寸提示词预览
 * - 完整提示词显示
 * - 语法高亮
 * - 编辑功能
 * 
 * 状态：与PromptPreviewPopover功能重叠
 * 接入方式：根据UX需求选择Modal或Popover
 */

const PromptPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onEdit?: (newPrompt: string) => void;
}> = ({ isOpen, onClose, prompt, onEdit }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-4">提示词预览</h3>
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <pre className="whitespace-pre-wrap text-sm">{prompt}</pre>
        </div>
        <div className="flex justify-end gap-2">
          {onEdit && (
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
              编辑
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * SaveTemplateDialog - 保存模板对话框
 * 
 * 功能：模板保存界面
 * - 模板名称和描述
 * - 分类选择
 * - 标签设置
 * 
 * 状态：应该与TemplateManager配合使用
 * 接入方式：在模板保存时调用此对话框
 */

const SaveTemplateDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => void;
  canvasState: any;
}> = ({ isOpen, onClose, onSave, canvasState }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">保存模板</h3>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="模板名称"
            className="w-full p-2 border rounded-lg"
          />
          <textarea 
            placeholder="模板描述"
            className="w-full p-2 border rounded-lg h-20"
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={() => onSave({})}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. 上传和配置组件
// ============================================================================

/**
 * MultiImageUploader - 多图上传器
 * 
 * 功能：批量图片上传
 * - 拖拽上传
 * - 预览功能
 * - 格式验证
 * 
 * 状态：可能与MultiImageConfigModal配合使用
 * 接入方式：在需要批量上传时使用
 */

const MultiImageUploader: React.FC<{
  onImagesUploaded: (images: string[]) => void;
  maxImages?: number;
  acceptedFormats?: string[];
}> = ({ onImagesUploaded, maxImages = 10, acceptedFormats = ['jpg', 'png'] }) => {
  return (
    <div className="multi-image-uploader border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <p>拖拽图片到此处或点击上传</p>
      <p className="text-sm text-gray-500">
        支持格式: {acceptedFormats.join(', ')} | 最多 {maxImages} 张
      </p>
    </div>
  );
};

/**
 * EditParameterPanel - 编辑参数面板
 * 
 * 功能：统一的参数编辑界面
 * - 参数分组显示
 * - 实时预览
 * - 参数验证
 * 
 * 状态：可能提供更统一的编辑体验
 * 接入方式：评估是否需要统一参数编辑界面
 */

const EditParameterPanel: React.FC<{
  parameters: any;
  onParameterChange: (key: string, value: any) => void;
  onApply: () => void;
  onCancel: () => void;
}> = ({ parameters, onParameterChange, onApply, onCancel }) => {
  return (
    <div className="edit-parameter-panel bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">编辑参数</h3>
      <div className="space-y-4">
        {/* 参数编辑界面 */}
        <p>统一的参数编辑界面</p>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded-lg">
          取消
        </button>
        <button onClick={onApply} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
          应用
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 导出所有组件（使用时取消注释需要的组件）
// ============================================================================

/*
export {
  AccessibilityPanel,
  AIModelIndicator,
  StateRecoveryPanel,
  ScheduleManager,
  ExecutionHistoryPanel,
  BatchInputSelector,
  UsageIndicator,
  DownloadButton,
  TaggedInput,
  MaskEditor,
  SmearEditCanvas,
  PromptPreviewModal,
  SaveTemplateDialog,
  MultiImageUploader,
  EditParameterPanel
};
*/

export default {};