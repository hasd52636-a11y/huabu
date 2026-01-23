import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { ResponsiveModalContainer } from './ResponsiveModalContainer';
import { ScrollableContentArea } from './ScrollableContentArea';
import { NodeSelectionPanel } from './NodeSelectionPanel';
import { useViewportConstraints } from './ViewportConstraints';

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
  maxHeight = '90vh',
  responsive = true,
  lang,
  theme
}) => {
  const { constraints, getWidth, getHeight } = useViewportConstraints({
    maxHeight
  });

  // State management
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saveAsAutomation, setSaveAsAutomation] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'all' | 'smart' | 'manual'>('smart');
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
      setSelectionMode('smart');
      setError(null);
    }
  }, [isOpen, nodes]);

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

  return (
    <ResponsiveModalContainer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={{
        mobile: '95vw',
        tablet: '85vw',
        desktop: '75vw'
      }}
      maxHeight={responsive ? getHeight() : maxHeight}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-8 border-b-2 border-purple-300 dark:border-purple-600">
      <div className="flex items-center justify-between">
        <h3 className="text-4xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-4">
          <Save size={40} />
          {t.title}
        </h3>
        <button
          onClick={handleClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={32} />
        </button>
      </div>
      </div>

      <ScrollableContentArea
        maxHeight="calc(90vh - 200px)"
        showScrollIndicators={true}
        maintainHeaderFooter={true}
      >
        <div className="space-y-10">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Workflow Name Input */}
          <input 
            type="text" 
            placeholder={t.workflowName}
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
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

          {/* Workflow Description Input */}
          <textarea 
            placeholder={t.workflowDescription}
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
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
          
          {/* Node Selection Panel (only shown for automation templates) */}
          {saveAsAutomation && (
            <NodeSelectionPanel
              nodes={nodes}
              selectedNodes={selectedNodes}
              onSelectionChange={setSelectedNodes}
              selectionMode={selectionMode}
              onModeChange={(mode) => setSelectionMode(mode as 'all' | 'smart' | 'manual')}
              lang={lang}
              theme={theme}
              analyzeFinalOutputModules={analyzeFinalOutputModules}
            />
          )}

          {/* Download Instructions (only shown for automation templates) */}
          {saveAsAutomation && (
            <div className="bg-purple-100 dark:bg-purple-900/30 border-3 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="text-purple-600 dark:text-purple-400 mt-1 text-2xl">💡</div>
                <div className="text-lg text-purple-800 dark:text-purple-200">
                  <div className="font-bold mb-3 text-xl">
                    {t.downloadNodesInstructions}
                  </div>
                  <ul className="text-base space-y-2 text-purple-700 dark:text-purple-300">
                    <li>• {t.instruction1}</li>
                    <li>• {t.instruction2}</li>
                    <li>• {t.instruction3}</li>
                    <li>• {t.instruction4}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Save as Automation Checkbox */}
          <div className="flex items-center gap-4 p-6 border-3 border-purple-300 dark:border-purple-600 rounded-2xl bg-purple-100 dark:bg-purple-900/30 shadow-lg">
            <input
              type="checkbox"
              id="automation-checkbox"
              checked={saveAsAutomation}
              onChange={(e) => setSaveAsAutomation(e.target.checked)}
              className="w-8 h-8 text-purple-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="automation-checkbox" className="flex-1 cursor-pointer">
              <div className="font-bold text-xl text-purple-800 dark:text-purple-200 mb-2">
                {t.saveAsAutomationTitle}
              </div>
              <div className="text-lg text-purple-700 dark:text-purple-300">
                {t.saveAsAutomationDesc}
              </div>
            </label>
          </div>

          {/* Automation Warning */}
          {saveAsAutomation && (
            <div className="p-6 border-4 border-amber-400 dark:border-amber-500 rounded-2xl bg-amber-100 dark:bg-amber-900/30 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" size={24} />
                <div className="text-lg">
                  <div className="font-bold text-xl text-amber-800 dark:text-amber-200 mb-3">
                    {t.importantNotice}
                  </div>
                  <div className="text-amber-700 dark:text-amber-300 leading-relaxed">
                    {t.automationWarning}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollableContentArea>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 p-8 border-t-2 border-purple-300 dark:border-purple-600">
        <div className="flex justify-end gap-4">
          <button 
            onClick={handleClose}
            className={`
              px-8 py-4 rounded-2xl text-xl font-bold shadow-lg transition-all transform hover:scale-105
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
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xl font-bold shadow-lg transition-all transform hover:scale-105"
          >
            {t.save}
          </button>
        </div>
      </div>
    </ResponsiveModalContainer>
  );
};