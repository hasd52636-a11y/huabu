/**
 * SidebarResultsArea - 侧边栏结果区域组件
 * 
 * 功能：
 * - 显示生成结果的缩略图网格
 * - 提供结果选择和批量操作
 * - 支持投射到画布和删除操作
 * - 实现搜索和过滤功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Grid, Search, Trash2, Download, Eye, Play, 
  CheckSquare, Square, MoreVertical, Filter,
  ArrowUpRight, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { GenerationResult, SidebarResultsAreaProps } from '../types';

const SidebarResultsArea: React.FC<SidebarResultsAreaProps> = ({
  results,
  onProjectToCanvas,
  onDeleteResult,
  onDeleteResults,
  theme,
  lang,
  isLoading = false
}) => {
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'generating' | 'completed' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const t = {
    zh: {
      title: '生成结果',
      search: '搜索结果...',
      filter: '筛选',
      selectAll: '全选',
      deselectAll: '取消全选',
      projectSelected: '投射选中项',
      deleteSelected: '删除选中项',
      projectToCanvas: '投射到画布',
      delete: '删除',
      download: '下载',
      preview: '预览',
      generating: '生成中',
      completed: '已完成',
      failed: '失败',
      noResults: '暂无结果',
      noResultsDesc: '生成的内容将在这里显示',
      searchNoResults: '未找到匹配的结果',
      type: '类型',
      status: '状态',
      time: '时间',
      model: '模型',
      all: '全部',
      text: '文本',
      image: '图片',
      video: '视频',
      confirmDelete: '确认删除',
      confirmDeleteMessage: '确定要删除选中的结果吗？此操作无法撤销。'
    },
    en: {
      title: 'Generation Results',
      search: 'Search results...',
      filter: 'Filter',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      projectSelected: 'Project Selected',
      deleteSelected: 'Delete Selected',
      projectToCanvas: 'Project to Canvas',
      delete: 'Delete',
      download: 'Download',
      preview: 'Preview',
      generating: 'Generating',
      completed: 'Completed',
      failed: 'Failed',
      noResults: 'No Results',
      noResultsDesc: 'Generated content will appear here',
      searchNoResults: 'No matching results found',
      type: 'Type',
      status: 'Status',
      time: 'Time',
      model: 'Model',
      all: 'All',
      text: 'Text',
      image: 'Image',
      video: 'Video',
      confirmDelete: 'Confirm Delete',
      confirmDeleteMessage: 'Are you sure you want to delete the selected results? This action cannot be undone.'
    }
  };

  // 过滤和搜索结果
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      // 类型过滤
      if (filterType !== 'all' && result.type !== filterType) {
        return false;
      }

      // 状态过滤
      if (filterStatus !== 'all' && result.status !== filterStatus) {
        return false;
      }

      // 搜索过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          result.metadata.prompt.toLowerCase().includes(query) ||
          result.metadata.model.toLowerCase().includes(query) ||
          result.type.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [results, filterType, filterStatus, searchQuery]);

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedResults.size === filteredResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(filteredResults.map(r => r.id)));
    }
  };

  // 处理单个结果选择
  const handleSelectResult = (resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  };

  // 处理批量投射
  const handleProjectSelected = () => {
    selectedResults.forEach(resultId => {
      onProjectToCanvas(resultId);
    });
    setSelectedResults(new Set());
  };

  // 处理批量删除
  const handleDeleteSelected = () => {
    if (selectedResults.size === 0) return;

    if (window.confirm(t[lang].confirmDeleteMessage)) {
      onDeleteResults(Array.from(selectedResults));
      setSelectedResults(new Set());
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return lang === 'zh' ? '刚刚' : 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${lang === 'zh' ? '分钟前' : 'm ago'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${lang === 'zh' ? '小时前' : 'h ago'}`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  // 获取状态图标
  const getStatusIcon = (status: GenerationResult['status']) => {
    switch (status) {
      case 'generating':
        return <Clock size={16} className="text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: GenerationResult['type']) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t[lang].title}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={viewMode === 'grid' ? 'List View' : 'Grid View'}
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t[lang].search}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 过滤器 */}
        <div className="flex gap-2 mb-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">{t[lang].all}</option>
            <option value="text">{t[lang].text}</option>
            <option value="image">{t[lang].image}</option>
            <option value="video">{t[lang].video}</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">{t[lang].all}</option>
            <option value="generating">{t[lang].generating}</option>
            <option value="completed">{t[lang].completed}</option>
            <option value="failed">{t[lang].failed}</option>
          </select>
        </div>

        {/* 批量操作 */}
        {selectedResults.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {selectedResults.size} {lang === 'zh' ? '项已选中' : 'selected'}
            </span>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={handleProjectSelected}
                className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
              >
                {t[lang].projectSelected}
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t[lang].deleteSelected}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? t[lang].searchNoResults : t[lang].noResults}
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? `"${searchQuery}"` : t[lang].noResultsDesc}
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 p-4' : 'space-y-2 p-4'}>
            {filteredResults.map(result => (
              <ResultGridItem
                key={result.id}
                result={result}
                isSelected={selectedResults.has(result.id)}
                onSelect={handleSelectResult}
                onProjectToCanvas={onProjectToCanvas}
                onDelete={onDeleteResult}
                viewMode={viewMode}
                theme={theme}
                lang={lang}
                formatTime={formatTime}
                getStatusIcon={getStatusIcon}
                getTypeIcon={getTypeIcon}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {lang === 'zh' 
            ? `共 ${results.length} 个结果，显示 ${filteredResults.length} 个`
            : `${results.length} total, ${filteredResults.length} shown`
          }
        </div>
      )}
    </div>
  );
};

// 结果网格项组件
interface ResultGridItemProps {
  result: GenerationResult;
  isSelected: boolean;
  onSelect: (resultId: string) => void;
  onProjectToCanvas: (resultId: string) => void;
  onDelete: (resultId: string) => void;
  viewMode: 'grid' | 'list';
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  formatTime: (timestamp: number) => string;
  getStatusIcon: (status: GenerationResult['status']) => React.ReactNode;
  getTypeIcon: (type: GenerationResult['type']) => string;
  t: any;
}

const ResultGridItem: React.FC<ResultGridItemProps> = ({
  result,
  isSelected,
  onSelect,
  onProjectToCanvas,
  onDelete,
  viewMode,
  theme,
  lang,
  formatTime,
  getStatusIcon,
  getTypeIcon,
  t
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProjectToCanvas(result.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t[lang].confirmDeleteMessage)) {
      onDelete(result.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          isSelected 
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={() => onSelect(result.id)}
      >
        {/* 选择框 */}
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckSquare size={16} className="text-amber-500" />
          ) : (
            <Square size={16} className="text-gray-400" />
          )}
        </div>

        {/* 缩略图 */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {result.type === 'text' ? (
            <span className="text-lg">{getTypeIcon(result.type)}</span>
          ) : result.thumbnail ? (
            <img src={result.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{getTypeIcon(result.type)}</span>
          )}
        </div>

        {/* 内容信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(result.status)}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {result.metadata.model}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {result.metadata.prompt || `${result.type} content`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(result.metadata.timestamp)}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <button
            onClick={handleProjectClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={t[lang].projectToCanvas}
          >
            <ArrowUpRight size={14} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
            title={t[lang].delete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={`relative group rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={() => onSelect(result.id)}
    >
      {/* 缩略图区域 */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative">
        {result.type === 'text' ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-3">
              <div className="text-2xl mb-2">{getTypeIcon(result.type)}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                {result.content.substring(0, 100)}...
              </p>
            </div>
          </div>
        ) : result.thumbnail ? (
          <img src={result.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">{getTypeIcon(result.type)}</span>
          </div>
        )}

        {/* 状态指示器 */}
        <div className="absolute top-2 right-2">
          {getStatusIcon(result.status)}
        </div>

        {/* 选择指示器 */}
        <div className="absolute top-2 left-2">
          {isSelected ? (
            <CheckSquare size={16} className="text-amber-500 bg-white rounded" />
          ) : (
            <Square size={16} className="text-gray-400 bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* 悬停操作 */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleProjectClick}
            className="px-3 py-1 bg-white text-black rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            {t[lang].projectToCanvas}
          </button>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
          {result.metadata.prompt || `${result.type} content`}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{result.metadata.model}</span>
          <span>{formatTime(result.metadata.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default SidebarResultsArea;