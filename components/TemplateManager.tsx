import React, { useState, useEffect } from 'react';
import { Template, CanvasState } from '../types';
import { templateManager } from '../services/TemplateManager';
import { applyTextEnhancements } from '../src/utils/textClarity';
import { 
  Save, FolderOpen, Download, Upload, Copy, Trash2, 
  Search, Plus, X, Edit3, Check, AlertCircle, 
  FileText, Layers, Link, Calendar, Zap
} from 'lucide-react';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCanvas: CanvasState;
  onLoadTemplate: (canvas: CanvasState, isAutomation?: boolean) => void;
  lang: 'zh' | 'en';
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  currentCanvas,
  onLoadTemplate,
  lang
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const t = {
    zh: {
      title: '模板管理',
      saveTemplate: '保存模板',
      loadTemplate: '加载模板',
      searchPlaceholder: '搜索模板...',
      templateName: '模板名称',
      templateDescription: '模板描述（可选）',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      duplicate: '复制',
      export: '导出',
      import: '导入',
      edit: '编辑',
      noTemplates: '暂无模板',
      createFirst: '创建您的第一个模板',
      blocks: '个模块',
      connections: '个连接',
      created: '创建于',
      updated: '更新于',
      confirmDelete: '确定要删除这个模板吗？',
      saveSuccess: '模板保存成功',
      loadSuccess: '模板加载成功',
      deleteSuccess: '模板删除成功',
      duplicateSuccess: '模板复制成功',
      exportSuccess: '模板导出成功',
      importSuccess: '模板导入成功',
      error: '操作失败',
      invalidFile: '无效的模板文件',
      nameRequired: '请输入模板名称'
    },
    en: {
      title: 'Template Manager',
      saveTemplate: 'Save Template',
      loadTemplate: 'Load Template',
      searchPlaceholder: 'Search templates...',
      templateName: 'Template Name',
      templateDescription: 'Template Description (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      duplicate: 'Duplicate',
      export: 'Export',
      import: 'Import',
      edit: 'Edit',
      noTemplates: 'No templates',
      createFirst: 'Create your first template',
      blocks: ' blocks',
      connections: ' connections',
      created: 'Created',
      updated: 'Updated',
      confirmDelete: 'Are you sure you want to delete this template?',
      saveSuccess: 'Template saved successfully',
      loadSuccess: 'Template loaded successfully',
      deleteSuccess: 'Template deleted successfully',
      duplicateSuccess: 'Template duplicated successfully',
      exportSuccess: 'Template exported successfully',
      importSuccess: 'Template imported successfully',
      error: 'Operation failed',
      invalidFile: 'Invalid template file',
      nameRequired: 'Please enter template name'
    }
  }[lang];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
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

    try {
      setIsLoading(true);
      await templateManager.saveTemplate(
        currentCanvas, 
        name, 
        newTemplateDescription || undefined,
        isAutomation
      );
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowSaveDialog(false);
      await loadTemplates();
      showSuccess(t.saveSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      const canvas = await templateManager.loadTemplate(templateId);
      // 直接从templateManager中获取所有模板，确保获取最新的模板数据
      const allTemplates = await templateManager.listTemplates();
      const template = allTemplates.find(t => t.id === templateId);
      onLoadTemplate(canvas, template?.isAutomation);
      onClose();
      showSuccess(t.loadSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className={`text-2xl font-bold text-slate-900 dark:text-white ${applyTextEnhancements('', { enhanced: true, highContrast: true, chineseOptimized: true })}`}>{t.title}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSaveDialog(true)}
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
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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

                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`font-medium text-slate-900 dark:text-white truncate flex-1 pr-2 ${applyTextEnhancements('', { enhanced: true, summary: true, chineseOptimized: true })}`}>
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleLoadTemplate(template.id)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title={t.loadTemplate}
                      >
                        <FolderOpen size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                        title={t.duplicate}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template.id)}
                        className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title={t.export}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title={t.delete}
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
                      {template.metadata.blockCount}{t.blocks}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link size={12} />
                      {template.metadata.connectionCount}{t.connections}
                    </div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`
              bg-white rounded-lg p-6 max-w-md w-full mx-4
              ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
            `}>
              <h3 className="text-lg font-semibold mb-4">
                {lang === 'zh' ? '保存模板' : 'Save Template'}
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder={lang === 'zh' ? '模板名称' : 'Template Name'}
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className={`
                    w-full p-2 border rounded-lg
                    ${theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                  `}
                />
                <textarea 
                  placeholder={lang === 'zh' ? '模板描述' : 'Template Description'}
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className={`
                    w-full p-2 border rounded-lg h-20
                    ${theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                  `}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewTemplateName('');
                      setNewTemplateDescription('');
                      setError(null);
                    }}
                    className={`
                      px-4 py-2 rounded-lg
                      ${theme === 'dark' 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }
                    `}
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button 
                    onClick={handleSaveTemplate}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
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