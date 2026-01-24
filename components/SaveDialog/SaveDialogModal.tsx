import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  dependencies: string[];
  isRequired: boolean;
  size: number;
}

export interface DownloadOptions {
  includeAssets: boolean;
  compressionLevel: 'none' | 'standard' | 'maximum';
  format: 'json' | 'yaml' | 'xml';
  includeMetadata: boolean;
}

export interface SaveConfiguration {
  selectedNodes: string[];
  downloadOptions: DownloadOptions;
  workflowName: string;
  saveAsAutomation: boolean;
}

export interface SaveDialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: WorkflowNode[];
  onSave: (config: SaveConfiguration) => Promise<void>;
  maxHeight?: string;
  responsive?: boolean;
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
}

export const SaveDialogModal: React.FC<SaveDialogModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSave,
  lang,
  theme
}) => {
  // State management
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saveAsAutomation, setSaveAsAutomation] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const t = {
    zh: {
      title: '保存工作流',
      workflowName: '工作流名称',
      workflowDescription: '工作流描述（可选）',
      saveAsAutomationTitle: '保存为自动化工作流',
      saveAsAutomationDesc: '自动分析连接关系，支持一键执行整个工作流',
      downloadNodesInstructions: '下载节点说明：',
      instruction1: '选中的节点在自动化执行完成后会自动下载结果',
      instruction2: '"智能选择"会自动选择工作流的最终输出节点（推荐）',
      instruction3: '如果不选择任何节点，将不会自动下载任何结果',
      instruction4: '可以随时在模板管理中修改下载节点设置',
      importantNotice: '⚠️ 重要提醒',
      automationWarning: '自动化模板保存后将锁定为只读模式，无法再次编辑模块内容和连接关系。如需修改，请重新创建新的工作流。',
      nameRequired: '请输入工作流名称',
      automationRequiresNodes: '自动化模板至少需要选择一个下载节点',
      cancel: '取消',
      save: '保存'
    },
    en: {
      title: 'Save Workflow',
      workflowName: 'Workflow Name',
      workflowDescription: 'Workflow Description (Optional)',
      saveAsAutomationTitle: 'Save as Automation Workflow',
      saveAsAutomationDesc: 'Auto-analyze connections and support one-click workflow execution',
      downloadNodesInstructions: 'Download Node Instructions:',
      instruction1: 'Selected nodes will automatically download results after automation execution',
      instruction2: '"Smart Select" automatically chooses final output nodes (recommended)',
      instruction3: 'If no nodes are selected, no results will be automatically downloaded',
      instruction4: 'Download node settings can be modified anytime in template management',
      importantNotice: '⚠️ Important Notice',
      automationWarning: 'Automation templates will be locked in read-only mode after saving. Module content and connections cannot be edited. To modify, please create a new workflow.',
      nameRequired: 'Please enter workflow name',
      automationRequiresNodes: 'Automation template requires at least one download node',
      cancel: 'Cancel',
      save: 'Save'
    }
  }[lang];

  // Auto-analyze final output modules
  const analyzeFinalOutputModules = (workflowNodes: WorkflowNode[]): string[] => {
    if (!workflowNodes || workflowNodes.length === 0) {
      return [];
    }
    
    const finalModules: string[] = [];
    
    // Find modules without downstream connections (final output modules)
    for (const node of workflowNodes) {
      const hasDownstreamConnections = workflowNodes.some(otherNode => 
        otherNode.dependencies.includes(node.id)
      );
      if (!hasDownstreamConnections) {
        finalModules.push(node.id);
      }
    }
    
    // If no final modules found, return the last module
    if (finalModules.length === 0 && workflowNodes.length > 0) {
      const lastNode = workflowNodes[workflowNodes.length - 1];
      finalModules.push(lastNode.id);
    }
    
    return finalModules;
  };

  // Auto-analyze automation potential
  const analyzeAutomationPotential = (workflowNodes: WorkflowNode[]): boolean => {
    // If there are dependencies, recommend as automation template
    const hasDependencies = workflowNodes.some(node => node.dependencies.length > 0);
    if (hasDependencies) {
      return true;
    }
    
    // If there are multiple modules, recommend as automation template
    if (workflowNodes.length > 1) {
      return true;
    }
    
    return false;
  };

  // Initialize state when dialog opens
  useEffect(() => {
    if (isOpen && nodes) {
      const shouldRecommendAutomation = analyzeAutomationPotential(nodes);
      const detectedFinalModules = analyzeFinalOutputModules(nodes);
      
      setSaveAsAutomation(shouldRecommendAutomation);
      setSelectedNodes(detectedFinalModules);
      setError(null);
    }
  }, [isOpen, nodes]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validation
    if (!workflowName.trim()) {
      setError(t.nameRequired);
      return;
    }

    if (saveAsAutomation && selectedNodes.length === 0) {
      setError(t.automationRequiresNodes);
      return;
    }

    try {
      const config: SaveConfiguration = {
        selectedNodes,
        downloadOptions: {
          includeAssets: true,
          compressionLevel: 'standard',
          format: 'json',
          includeMetadata: true
        },
        workflowName: workflowName.trim(),
        saveAsAutomation
      };
      
      await onSave(config);
      
      // Reset form
      setWorkflowName('');
      setWorkflowDescription('');
      setSaveAsAutomation(false);
      setSelectedNodes([]);
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleClose = () => {
    setWorkflowName('');
    setWorkflowDescription('');
    setSaveAsAutomation(false);
    setSelectedNodes([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[450] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-purple-400 dark:border-purple-500 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header - 固定 */}
        <div className="flex-shrink-0 p-4 border-b border-purple-300 dark:border-purple-600">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Save size={20} />
              {t.title}
            </h3>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="text-red-600 dark:text-red-400" size={16} />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Workflow Name and Description - 一行布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder={t.workflowName}
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className={`
                  w-full p-3 border-2 rounded-lg text-sm font-medium
                  ${theme === 'dark' 
                    ? 'bg-gray-800 border-purple-500 text-white placeholder-gray-400' 
                    : 'bg-white border-purple-400 text-gray-900 placeholder-gray-500'
                  }
                  focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all
                  shadow-sm
                `}
              />
              <input 
                type="text"
                placeholder={t.workflowDescription}
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className={`
                  w-full p-3 border-2 rounded-lg text-sm
                  ${theme === 'dark' 
                    ? 'bg-gray-800 border-purple-500 text-white placeholder-gray-400' 
                    : 'bg-white border-purple-400 text-gray-900 placeholder-gray-500'
                  }
                  focus:border-purple-600 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all
                  shadow-sm
                `}
              />
            </div>
            
            {/* Save as Automation Checkbox - 降低高度 */}
            <div className="flex items-center gap-3 p-3 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-purple-100 dark:bg-purple-900/30 shadow-sm">
              <input
                type="checkbox"
                id="automation-checkbox"
                checked={saveAsAutomation}
                onChange={(e) => setSaveAsAutomation(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="automation-checkbox" className="flex-1 cursor-pointer">
                <div className="font-bold text-sm text-purple-800 dark:text-purple-200">
                  {t.saveAsAutomationTitle}
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300">
                  {t.saveAsAutomationDesc}
                </div>
              </label>
            </div>

            {/* Node Selection Panel (only shown for automation templates) - 降低高度 */}
            {saveAsAutomation && (
              <div className="border-2 border-purple-300 dark:border-purple-700 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">下载节点选择</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedNodes(nodes.map((n: WorkflowNode) => n.id))}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      全选
                    </button>
                    <button
                      onClick={() => setSelectedNodes(analyzeFinalOutputModules(nodes))}
                      className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      智能选择
                    </button>
                    <button
                      onClick={() => setSelectedNodes([])}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {nodes.length === 0 ? (
                    lang === 'zh' ? '当前画布没有模块' : 'No modules in current canvas'
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium text-purple-700 dark:text-purple-300">
                        {lang === 'zh' ? `可选择的节点 (${nodes.length}个):` : `Available nodes (${nodes.length}):`}
                      </div>
                      <div className="max-h-16 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {nodes.map(node => (
                            <label key={node.id} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800/30 px-2 py-1 rounded border border-purple-200 dark:border-purple-600">
                              <input
                                type="checkbox"
                                checked={selectedNodes.includes(node.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedNodes([...selectedNodes, node.id]);
                                  } else {
                                    setSelectedNodes(selectedNodes.filter(id => id !== node.id));
                                  }
                                }}
                                className="w-3 h-3 text-purple-600 rounded"
                              />
                              <span className="font-mono">
                                {node.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 合并的说明和提醒 - 横排布局 */}
            {saveAsAutomation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 下载节点说明 */}
                <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="text-purple-600 dark:text-purple-400 text-sm">💡</div>
                    <div className="text-xs text-purple-800 dark:text-purple-200">
                      <div className="font-bold mb-1 text-sm">
                        {t.downloadNodesInstructions}
                      </div>
                      <ul className="text-xs space-y-0.5 text-purple-700 dark:text-purple-300">
                        <li>• {t.instruction1}</li>
                        <li>• {t.instruction2}</li>
                        <li>• {t.instruction3}</li>
                        <li>• {t.instruction4}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 重要提醒 */}
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-500 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={16} />
                    <div className="text-xs">
                      <div className="font-bold text-sm text-amber-800 dark:text-amber-200 mb-1">
                        {t.importantNotice}
                      </div>
                      <div className="text-amber-700 dark:text-amber-300 leading-relaxed">
                        {t.automationWarning}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - 固定 */}
        <div className="flex-shrink-0 p-4 border-t border-purple-300 dark:border-purple-600 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-end gap-2">
            <button 
              onClick={handleClose}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all
                ${theme === 'dark' 
                  ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
                }
              `}
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};