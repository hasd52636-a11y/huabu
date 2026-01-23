import React, { useState, useEffect } from 'react';
import { Template, CanvasState } from '../types';
import { templateManager } from '../services/TemplateManager';
import { applyTextEnhancements } from '../src/utils/textClarity';
import { 
  Save, FolderOpen, Download, Upload, Copy, Trash2, 
  Search, Plus, X, Edit3, Check, AlertCircle, 
  FileText, Layers, Link, Calendar, Zap
} from 'lucide-react';

// 添加全局样式来美化滚动条
const addScrollbarStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('custom-scrollbar-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-scrollbar-styles';
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 12px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(168, 85, 247, 0.1);
        border-radius: 6px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.6);
        border-radius: 6px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, 0.8);
        background-clip: content-box;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:active {
        background: rgba(147, 51, 234, 0.9);
        background-clip: content-box;
      }
      
      .dark .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(147, 51, 234, 0.2);
      }
      
      .dark .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(147, 51, 234, 0.7);
      }
      
      .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(147, 51, 234, 0.9);
      }
    `;
    document.head.appendChild(style);
  }
};

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCanvas: CanvasState;
  onLoadTemplate: (canvas: CanvasState, isAutomation?: boolean) => void;
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  currentCanvas,
  onLoadTemplate,
  lang,
  theme
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [isAutomationTemplate, setIsAutomationTemplate] = useState(false);
  const [finalOutputModules, setFinalOutputModules] = useState<string[]>([]); // 最终输出模块列表

  const t = {
    zh: {
      title: '自动化工作流',
      saveTemplate: '保存工作流',
      loadTemplate: '加载工作流',
      searchPlaceholder: '搜索工作流...',
      templateName: '工作流名称',
      templateDescription: '工作流描述（可选）',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      duplicate: '复制',
      export: '导出',
      import: '导入',
      edit: '编辑',
      noTemplates: '暂无工作流',
      createFirst: '创建您的第一个工作流',
      blocks: '个模块',
      connections: '个连接',
      created: '创建于',
      updated: '更新于',
      confirmDelete: '确定要删除这个工作流吗？',
      saveSuccess: '工作流保存成功',
      loadSuccess: '工作流加载成功',
      deleteSuccess: '工作流删除成功',
      duplicateSuccess: '工作流复制成功',
      exportSuccess: '工作流导出成功',
      importSuccess: '工作流导入成功',
      error: '操作失败',
      invalidFile: '无效的工作流文件',
      nameRequired: '请输入工作流名称'
    },
    en: {
      title: 'Automation Workflow',
      saveTemplate: 'Save Workflow',
      loadTemplate: 'Load Workflow',
      searchPlaceholder: 'Search workflows...',
      templateName: 'Workflow Name',
      templateDescription: 'Workflow Description (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      duplicate: 'Duplicate',
      export: 'Export',
      import: 'Import',
      edit: 'Edit',
      noTemplates: 'No workflows',
      createFirst: 'Create your first workflow',
      blocks: ' blocks',
      connections: ' connections',
      created: 'Created',
      updated: 'Updated',
      confirmDelete: 'Are you sure you want to delete this workflow?',
      saveSuccess: 'Workflow saved successfully',
      loadSuccess: 'Workflow loaded successfully',
      deleteSuccess: 'Workflow deleted successfully',
      duplicateSuccess: 'Workflow duplicated successfully',
      exportSuccess: 'Workflow exported successfully',
      importSuccess: 'Workflow imported successfully',
      error: 'Operation failed',
      invalidFile: 'Invalid workflow file',
      nameRequired: 'Please enter workflow name'
    }
  }[lang];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      addScrollbarStyles(); // 添加滚动条样式
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const allTemplates = await templateManager.listTemplates();
      const filtered = searchQuery 
        ? await templateManager.searchTemplates(searchQuery)
        : allTemplates;
      setTemplates(filtered);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (name: string, isAutomation: boolean) => {
    if (!name.trim()) {
      setError(t.nameRequired);
      return;
    }

    // 验证自动化模板的下载节点选择
    if (isAutomation && finalOutputModules.length === 0) {
      setError(lang === 'zh' 
        ? '自动化模板至少需要选择一个下载节点' 
        : 'Automation template requires at least one download node'
      );
      return;
    }

    try {
      setIsLoading(true);
      
      // 创建增强的模板数据，包含最终输出模块信息
      const enhancedCanvas = {
        ...currentCanvas,
        // 添加最终输出模块标记到模板元数据中
        finalOutputModules: isAutomation ? finalOutputModules : undefined
      };
      
      await templateManager.saveTemplate(
        enhancedCanvas, 
        name, 
        newTemplateDescription || undefined,
        isAutomation,
        finalOutputModules // 传递最终输出模块列表
      );
      setNewTemplateName('');
      setNewTemplateDescription('');
      setIsAutomationTemplate(false);
      setFinalOutputModules([]);
      setShowSaveDialog(false);
      await loadTemplates();
      showSuccess(t.saveSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  // 智能分析最终输出模块
  const analyzeFinalOutputModules = (canvas: CanvasState): string[] => {
    if (!canvas.blocks || !canvas.connections) {
      return canvas.blocks?.map(b => b.number || b.id) || [];
    }
    
    const finalModules: string[] = [];
    
    // 找出没有下游连接的模块（最终输出模块）
    for (const block of canvas.blocks) {
      const hasDownstreamConnections = canvas.connections.some(conn => conn.fromId === block.id);
      if (!hasDownstreamConnections) {
        finalModules.push(block.number || block.id);
      }
    }
    
    // 如果没有找到最终模块，返回最后一个模块
    if (finalModules.length === 0 && canvas.blocks.length > 0) {
      const lastBlock = canvas.blocks[canvas.blocks.length - 1];
      finalModules.push(lastBlock.number || lastBlock.id);
    }
    
    return finalModules;
  };

  // 智能分析是否应该推荐为自动化模板
  const analyzeAutomationPotential = (canvas: CanvasState): boolean => {
    // 如果有连接关系，推荐为自动化模板
    if (canvas.connections && canvas.connections.length > 0) {
      return true;
    }
    
    // 如果有多个模块，推荐为自动化模板
    if (canvas.blocks && canvas.blocks.length > 1) {
      return true;
    }
    
    return false;
  };

  // 打开保存对话框时自动分析
  const handleOpenSaveDialog = () => {
    const shouldRecommendAutomation = analyzeAutomationPotential(currentCanvas);
    const detectedFinalModules = analyzeFinalOutputModules(currentCanvas);
    
    setIsAutomationTemplate(shouldRecommendAutomation);
    setFinalOutputModules(detectedFinalModules);
    setShowSaveDialog(true);
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      console.log('[TemplateManager] Starting template load:', templateId);
      setIsLoading(true);
      setError(null);
      
      // Load template with comprehensive error handling
      const canvas = await templateManager.loadTemplate(templateId);
      console.log('[TemplateManager] Template data loaded successfully');
      
      // Get template metadata
      const allTemplates = await templateManager.listTemplates();
      const template = allTemplates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template metadata not found after loading');
      }
      
      console.log('[TemplateManager] Calling onLoadTemplate with:', {
        blocksCount: canvas.blocks?.length,
        connectionsCount: canvas.connections?.length,
        isAutomation: template.isAutomation
      });
      
      // Call the parent component's load handler with template object
      onLoadTemplate(canvas, template.isAutomation, template);
      
      // Close the modal and show success
      onClose();
      showSuccess(t.loadSuccess);
      
    } catch (err) {
      console.error('[TemplateManager] Template loading failed:', err);
      
      // Provide detailed error information
      let errorMessage = t.error;
      if (err instanceof Error) {
        if (err.message.includes('not found')) {
          errorMessage = lang === 'zh' ? '模板不存在或已被删除' : 'Template not found or deleted';
        } else if (err.message.includes('Invalid')) {
          errorMessage = lang === 'zh' ? '模板数据格式错误' : 'Invalid template data format';
        } else if (err.message.includes('connection')) {
          errorMessage = lang === 'zh' ? '模板连接数据错误' : 'Template connection data error';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      setIsLoading(true);
      await templateManager.deleteTemplate(templateId);
      await loadTemplates();
      showSuccess(t.deleteSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      await templateManager.duplicateTemplate(templateId);
      await loadTemplates();
      showSuccess(t.duplicateSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTemplate = async (templateId: string) => {
    try {
      const templateData = await templateManager.exportTemplate(templateId);
      const template = templates.find(t => t.id === templateId);
      const filename = `${template?.name || 'template'}.json`;
      
      const blob = new Blob([templateData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(t.exportSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    }
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await templateManager.importTemplate(content);
        await loadTemplates();
        showSuccess(t.importSuccess);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.invalidFile);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const showSuccess = (message: string) => {
    // Simple success notification - could be enhanced with a proper toast system
    const originalError = error;
    setError(null);
    setTimeout(() => {
      if (!originalError) {
        // Show success briefly
        console.log(message);
      }
    }, 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className={`text-2xl font-bold text-slate-900 dark:text-white ${applyTextEnhancements('', { enhanced: true, highContrast: true, chineseOptimized: true })}`}>{t.title}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSaveDialog}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={18} />
              {t.saveTemplate}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
              <Upload size={18} />
              {t.import}
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplate}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
              className="w-full pl-10 pr-4 py-3 border-2 border-amber-500 dark:border-amber-400 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <div className="flex-1">
                <span className="text-red-700 dark:text-red-300">{error}</span>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {lang === 'zh' 
                    ? '如果问题持续存在，请尝试刷新页面或清除浏览器缓存' 
                    : 'If the problem persists, try refreshing the page or clearing browser cache'
                  }
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {lang === 'zh' ? '正在加载模板...' : 'Loading templates...'}
                </div>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto mb-4 text-slate-400" size={48} />
              <h3 className={`text-lg font-medium text-slate-900 dark:text-white mb-2 ${applyTextEnhancements('', { enhanced: true, summary: true, chineseOptimized: true })}`}>{t.noTemplates}</h3>
              <p className={`text-slate-500 dark:text-slate-400 ${applyTextEnhancements('', { enhanced: true, summary: true, chineseOptimized: true })}`}>{t.createFirst}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-2 hover:shadow-md transition-shadow relative ${
                    template.isAutomation 
                      ? 'border-blue-500 dark:border-blue-400' 
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Automation Badge */}
                  {template.isAutomation && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Zap size={12} />
                      AUTO
                    </div>
                  )}

                  {/* Download Nodes Badge */}
                  {template.isAutomation && template.metadata?.finalOutputModules && template.metadata.finalOutputModules.length > 0 && (
                    <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Download size={12} />
                      {template.metadata.finalOutputModules.length}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`font-medium text-slate-900 dark:text-white truncate flex-1 pr-2 ${applyTextEnhancements('', { enhanced: true, summary: true, chineseOptimized: true })}`}>
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => {
                          try {
                            handleLoadTemplate(template.id);
                          } catch (err) {
                            console.error('[TemplateManager] Load button error:', err);
                            setError(lang === 'zh' ? '加载模板时出现错误' : 'Error loading template');
                          }
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title={t.loadTemplate}
                        disabled={isLoading}
                      >
                        <FolderOpen size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                        title={t.duplicate}
                        disabled={isLoading}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template.id)}
                        className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title={t.export}
                        disabled={isLoading}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title={t.delete}
                        disabled={isLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <p className={`text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 ${applyTextEnhancements('', { enhanced: true, summary: true, chineseOptimized: true })}`}>
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Layers size={12} />
                      {template.metadata?.blockCount || 0}{t.blocks}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link size={12} />
                      {template.metadata?.connectionCount || 0}{t.connections}
                    </div>
                    {template.isAutomation && template.metadata?.finalOutputModules && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Download size={12} />
                        {template.metadata.finalOutputModules.length} {lang === 'zh' ? '下载节点' : 'download nodes'}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar size={12} />
                      {t.created}: {formatDate(template.createdAt)}
                    </div>
                    {template.updatedAt.getTime() !== template.createdAt.getTime() && (
                      <div className="flex items-center gap-1">
                        <Edit3 size={12} />
                        {t.updated}: {formatDate(template.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[450] p-4">
            <div className={`
              rounded-3xl p-8 w-[96vw] max-w-6xl max-h-[96vh] overflow-y-auto custom-scrollbar
              ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
              shadow-2xl border-4 border-purple-400 dark:border-purple-500
              bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20
            `}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: theme === 'dark' ? '#9333ea #1e1b4b' : '#a855f7 #f3e8ff',
              scrollBehavior: 'smooth'
            }}>
              <h3 className="text-4xl font-bold mb-10 text-purple-700 dark:text-purple-300 flex items-center gap-4">
                <Save size={40} />
                {lang === 'zh' ? '保存工作流' : 'Save Workflow'}
              </h3>
              <div className="space-y-10">
                <input 
                  type="text" 
                  placeholder={lang === 'zh' ? '工作流名称' : 'Workflow Name'}
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className={`
                    w-full p-8 border-4 rounded-2xl text-2xl font-medium
                    ${theme === 'dark' 
                      ? 'bg-gray-800 border-purple-500 text-white placeholder-gray-400' 
                      : 'bg-white border-purple-400 text-gray-900 placeholder-gray-500'
                    }
                    focus:border-purple-600 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all
                    shadow-lg
                  `}
                />
                <textarea 
                  placeholder={lang === 'zh' ? '工作流描述（可选）' : 'Workflow Description (Optional)'}
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className={`
                    w-full p-8 border-4 rounded-2xl h-40 text-xl resize-none
                    ${theme === 'dark' 
                      ? 'bg-gray-800 border-purple-500 text-white placeholder-gray-400' 
                      : 'bg-white border-purple-400 text-gray-900 placeholder-gray-500'
                    }
                    focus:border-purple-600 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all
                    shadow-lg
                  `}
                />
                
                {/* 最终输出模块选择（仅自动化模板显示） */}
                {isAutomationTemplate && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="block text-xl font-bold text-purple-700 dark:text-purple-300">
                        {lang === 'zh' ? '下载节点选择' : 'Download Node Selection'}
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            // 全选
                            const allModuleIds = currentCanvas.blocks?.map(b => b.number || b.id) || [];
                            setFinalOutputModules(allModuleIds);
                          }}
                          className="text-base px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg"
                        >
                          {lang === 'zh' ? '全选' : 'Select All'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // 智能选择（最终输出节点）
                            const smartSelection = analyzeFinalOutputModules(currentCanvas);
                            setFinalOutputModules(smartSelection);
                          }}
                          className="text-base px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-lg"
                        >
                          {lang === 'zh' ? '智能选择' : 'Smart Select'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFinalOutputModules([])}
                          className="text-base px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-lg"
                        >
                          {lang === 'zh' ? '清空' : 'Clear'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-4 border-purple-300 dark:border-purple-600 rounded-2xl p-6 bg-purple-50 dark:bg-purple-900/20 shadow-lg">
                      {currentCanvas.blocks?.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-xl">
                          {lang === 'zh' ? '当前画布没有模块' : 'No modules in current canvas'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {currentCanvas.blocks?.map(block => {
                            const moduleId = block.number || block.id;
                            const isSelected = finalOutputModules.includes(moduleId);
                            const isRecommended = analyzeFinalOutputModules(currentCanvas).includes(moduleId);
                            
                            return (
                              <label key={block.id} className={`
                                flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer transition-all transform hover:scale-105
                                ${isSelected 
                                  ? 'bg-purple-200 dark:bg-purple-700 border-3 border-purple-500 dark:border-purple-400 shadow-lg' 
                                  : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                                }
                              `}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFinalOutputModules(prev => [...prev, moduleId]);
                                    } else {
                                      setFinalOutputModules(prev => prev.filter(id => id !== moduleId));
                                    }
                                  }}
                                  className="w-6 h-6 text-purple-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500"
                                />
                                <div className="text-center">
                                  <div className="font-bold text-lg text-purple-700 dark:text-purple-300 mb-1">
                                    [{moduleId}]
                                  </div>
                                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                                    block.type === 'text' 
                                      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                                      : block.type === 'image'
                                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                      : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                  }`}>
                                    {block.type === 'text' ? (lang === 'zh' ? '文本' : 'Text') : 
                                     block.type === 'image' ? (lang === 'zh' ? '图片' : 'Image') : 
                                     (lang === 'zh' ? '视频' : 'Video')}
                                  </span>
                                  {isRecommended && (
                                    <div className="mt-2">
                                      <span className="text-xs px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full font-bold">
                                        {lang === 'zh' ? '推荐' : 'Recommended'}
                                      </span>
                                    </div>
                                  )}
                                  {(block.originalPrompt || block.content) && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 max-w-[120px]">
                                      {(block.originalPrompt || block.content || '').substring(0, 30)}...
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-purple-100 dark:bg-purple-900/30 border-3 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-purple-600 dark:text-purple-400 mt-1 text-2xl">💡</div>
                        <div className="text-lg text-purple-800 dark:text-purple-200">
                          <div className="font-bold mb-3 text-xl">
                            {lang === 'zh' ? '下载节点说明：' : 'Download Node Instructions:'}
                          </div>
                          <ul className="text-base space-y-2 text-purple-700 dark:text-purple-300">
                            <li>• {lang === 'zh' ? '选中的节点在自动化执行完成后会自动下载结果' : 'Selected nodes will automatically download results after automation execution'}</li>
                            <li>• {lang === 'zh' ? '"智能选择"会自动选择工作流的最终输出节点（推荐）' : '"Smart Select" automatically chooses final output nodes (recommended)'}</li>
                            <li>• {lang === 'zh' ? '如果不选择任何节点，将不会自动下载任何结果' : 'If no nodes are selected, no results will be automatically downloaded'}</li>
                            <li>• {lang === 'zh' ? '可以随时在模板管理中修改下载节点设置' : 'Download node settings can be modified anytime in template management'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 自动化模板选择 */}
                <div className="flex items-center gap-4 p-6 border-3 border-purple-300 dark:border-purple-600 rounded-2xl bg-purple-100 dark:bg-purple-900/30 shadow-lg">
                  <input
                    type="checkbox"
                    id="automation-checkbox"
                    checked={isAutomationTemplate}
                    onChange={(e) => setIsAutomationTemplate(e.target.checked)}
                    className="w-8 h-8 text-purple-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="automation-checkbox" className="flex-1 cursor-pointer">
                    <div className="font-bold text-xl text-purple-800 dark:text-purple-200 mb-2">
                      {lang === 'zh' ? '保存为自动化工作流' : 'Save as Automation Workflow'}
                    </div>
                    <div className="text-lg text-purple-700 dark:text-purple-300">
                      {lang === 'zh' 
                        ? '自动分析连接关系，支持一键执行整个工作流' 
                        : 'Auto-analyze connections and support one-click workflow execution'
                      }
                    </div>
                  </label>
                </div>

                {/* 重要提醒：自动化模板不可编辑 */}
                {isAutomationTemplate && (
                  <div className="p-6 border-4 border-amber-400 dark:border-amber-500 rounded-2xl bg-amber-100 dark:bg-amber-900/30 shadow-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" size={24} />
                      <div className="text-lg">
                        <div className="font-bold text-xl text-amber-800 dark:text-amber-200 mb-3">
                          {lang === 'zh' ? '⚠️ 重要提醒' : '⚠️ Important Notice'}
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 leading-relaxed">
                          {lang === 'zh' 
                            ? '自动化模板保存后将锁定为只读模式，无法再次编辑模块内容和连接关系。如需修改，请重新创建新的工作流。' 
                            : 'Automation templates will be locked in read-only mode after saving. Module content and connections cannot be edited. To modify, please create a new workflow.'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-4 pt-6">
                  <button 
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewTemplateName('');
                      setNewTemplateDescription('');
                      setIsAutomationTemplate(false);
                      setError(null);
                    }}
                    className={`
                      px-8 py-4 rounded-2xl text-xl font-bold shadow-lg transition-all transform hover:scale-105
                      ${theme === 'dark' 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }
                    `}
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => handleSaveTemplate(newTemplateName, isAutomationTemplate)}
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xl font-bold shadow-lg transition-all transform hover:scale-105"
                  >
                    {lang === 'zh' ? '保存' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;