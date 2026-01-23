import React from 'react';
import { Download } from 'lucide-react';
import type { WorkflowNode } from './SaveDialogModal';

export interface NodeSelectionPanelProps {
  nodes: WorkflowNode[];
  selectedNodes: string[];
  onSelectionChange: (nodeIds: string[]) => void;
  selectionMode: 'all' | 'smart' | 'manual';
  onModeChange: (mode: string) => void;
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
  analyzeFinalOutputModules?: (nodes: WorkflowNode[]) => string[];
}

export const NodeSelectionPanel: React.FC<NodeSelectionPanelProps> = ({
  nodes,
  selectedNodes,
  onSelectionChange,
  selectionMode,
  onModeChange,
  lang,
  theme,
  analyzeFinalOutputModules
}) => {
  const t = {
    zh: {
      title: '下载节点选择',
      selectAll: '全选',
      smartSelect: '智能选择',
      clear: '清空',
      text: '文本',
      image: '图片',
      video: '视频',
      recommended: '推荐',
      noNodes: '当前画布没有模块'
    },
    en: {
      title: 'Download Node Selection',
      selectAll: 'Select All',
      smartSelect: 'Smart Select',
      clear: 'Clear',
      text: 'Text',
      image: 'Image',
      video: 'Video',
      recommended: 'Recommended',
      noNodes: 'No modules in current canvas'
    }
  }[lang];

  const handleSelectAll = () => {
    const allNodeIds = nodes.map(node => node.id);
    onSelectionChange(allNodeIds);
    onModeChange('all');
  };

  const handleSmartSelect = () => {
    if (analyzeFinalOutputModules) {
      const smartSelection = analyzeFinalOutputModules(nodes);
      onSelectionChange(smartSelection);
    } else {
      // Fallback: select nodes without dependencies (final output nodes)
      const finalNodes = nodes
        .filter(node => node.dependencies.length === 0)
        .map(node => node.id);
      onSelectionChange(finalNodes.length > 0 ? finalNodes : [nodes[nodes.length - 1]?.id].filter(Boolean));
    }
    onModeChange('smart');
  };

  const handleClear = () => {
    onSelectionChange([]);
    onModeChange('manual');
  };

  const handleNodeToggle = (nodeId: string) => {
    const isSelected = selectedNodes.includes(nodeId);
    if (isSelected) {
      onSelectionChange(selectedNodes.filter(id => id !== nodeId));
    } else {
      onSelectionChange([...selectedNodes, nodeId]);
    }
    onModeChange('manual');
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return t.text;
      case 'image': return t.image;
      case 'video': return t.video;
      default: return type;
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200';
      case 'image':
        return 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200';
      case 'video':
        return 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getRecommendedNodes = () => {
    if (analyzeFinalOutputModules) {
      return analyzeFinalOutputModules(nodes);
    }
    // Fallback logic
    return nodes
      .filter(node => node.dependencies.length === 0)
      .map(node => node.id);
  };

  const recommendedNodes = getRecommendedNodes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="block text-xl font-bold text-purple-700 dark:text-purple-300">
          {t.title}
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`
              text-base px-4 py-2 rounded-xl font-medium transition-colors shadow-lg
              ${selectionMode === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {t.selectAll}
          </button>
          <button
            type="button"
            onClick={handleSmartSelect}
            className={`
              text-base px-4 py-2 rounded-xl font-medium transition-colors shadow-lg
              ${selectionMode === 'smart' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}
          >
            {t.smartSelect}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-base px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            {t.clear}
          </button>
        </div>
      </div>
      
      <div className="border-4 border-purple-300 dark:border-purple-600 rounded-2xl p-6 bg-purple-50 dark:bg-purple-900/20 shadow-lg max-h-96 overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-xl">
            {t.noNodes}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {nodes.map(node => {
              const isSelected = selectedNodes.includes(node.id);
              const isRecommended = recommendedNodes.includes(node.id);
              
              return (
                <label key={node.id} className={`
                  flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer transition-all transform hover:scale-105
                  ${isSelected 
                    ? 'bg-purple-200 dark:bg-purple-700 border-3 border-purple-500 dark:border-purple-400 shadow-lg' 
                    : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                  }
                `}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleNodeToggle(node.id)}
                    className="w-6 h-6 text-purple-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500"
                  />
                  <div className="text-center">
                    <div className="font-bold text-lg text-purple-700 dark:text-purple-300 mb-1">
                      [{node.name}]
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${getNodeTypeColor(node.type)}`}>
                      {getNodeTypeLabel(node.type)}
                    </span>
                    {isRecommended && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full font-bold">
                          {t.recommended}
                        </span>
                      </div>
                    )}
                    {node.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 max-w-[120px]">
                        {node.description.substring(0, 30)}...
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};