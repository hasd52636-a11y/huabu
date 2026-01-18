// components/CharacterPanel.tsx
// Character Management Panel Component

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Plus, Search, Filter, User, Video, Clock, 
  Settings, Download, Upload, Trash2, Edit3, 
  AlertCircle, CheckCircle, Loader, Eye, Tag,
  FileText, Image as ImageIcon, Play, Pause
} from 'lucide-react';
import { Character, CreateCharacterOptions, CharacterUsageStats } from '../types';
import { characterService } from '../services/CharacterService';

interface CharacterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterSelect: (character: Character) => void;
  selectedCharacter?: Character;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  shenmaService?: any;
}

interface CharacterPanelState {
  characters: Character[];
  isCreating: boolean;
  createMode: 'video' | 'task';
  videoUrl: string;
  taskId: string;
  timestamps: string;
  searchQuery: string;
  filterStatus: 'all' | 'ready' | 'creating' | 'error';
  selectedTags: string[];
  showCreateForm: boolean;
  showImportExport: boolean;
  viewMode: 'grid' | 'list';
}

const CharacterPanel: React.FC<CharacterPanelProps> = ({
  isOpen,
  onClose,
  onCharacterSelect,
  selectedCharacter,
  theme,
  lang,
  shenmaService
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<CharacterPanelState>({
    characters: [],
    isCreating: false,
    createMode: 'video',
    videoUrl: '',
    taskId: '',
    timestamps: '',
    searchQuery: '',
    filterStatus: 'all',
    selectedTags: [],
    showCreateForm: false,
    showImportExport: false,
    viewMode: 'grid'
  });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load characters on component mount
  useEffect(() => {
    if (isOpen) {
      loadCharacters();
    }
  }, [isOpen]);

  const loadCharacters = () => {
    const characters = characterService.getAllCharacters();
    setState(prev => ({ ...prev, characters }));
  };

  // Handle character creation
  const handleCreateCharacter = async () => {
    if (!shenmaService) {
      setError(lang === 'zh' ? '神马服务未配置' : 'Shenma service not configured');
      return;
    }

    setState(prev => ({ ...prev, isCreating: true }));
    setError('');
    setSuccess('');

    try {
      const options: CreateCharacterOptions = {
        timestamps: state.timestamps,
        ...(state.createMode === 'video' 
          ? { url: state.videoUrl }
          : { from_task: state.taskId }
        )
      };

      const character = await characterService.createCharacter(options, shenmaService);
      
      setSuccess(lang === 'zh' 
        ? `角色 "${character.username}" 创建成功！` 
        : `Character "${character.username}" created successfully!`
      );
      
      // Reset form and reload characters
      setState(prev => ({
        ...prev,
        showCreateForm: false,
        videoUrl: '',
        taskId: '',
        timestamps: ''
      }));
      
      loadCharacters();
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      setError(lang === 'zh' 
        ? `创建失败: ${error.message}` 
        : `Creation failed: ${error.message}`
      );
    } finally {
      setState(prev => ({ ...prev, isCreating: false }));
    }
  };

  // Handle character deletion
  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm(lang === 'zh' ? '确定要删除这个角色吗？' : 'Are you sure you want to delete this character?')) {
      return;
    }

    const success = characterService.deleteCharacter(characterId);
    if (success) {
      setSuccess(lang === 'zh' ? '角色删除成功' : 'Character deleted successfully');
      loadCharacters();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(lang === 'zh' ? '删除失败' : 'Deletion failed');
    }
  };

  // Get filtered characters
  const getFilteredCharacters = (): Character[] => {
    return characterService.searchCharacters(
      state.searchQuery,
      state.filterStatus,
      state.selectedTags
    );
  };

  // Get status icon
  const getStatusIcon = (status: Character['status']) => {
    switch (status) {
      case 'creating':
        return <Loader size={14} className="animate-spin text-blue-500" />;
      case 'ready':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <User size={20} className="text-purple-500" />
            {lang === 'zh' ? '角色管理' : 'Character Management'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Toolbar */}
          <div className={`border-b pb-4 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between gap-4">
              {/* Search and Filter */}
              <div className="flex items-center gap-3">
                <div className="relative max-w-md">
                  <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <input
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder={lang === 'zh' ? '搜索角色...' : 'Search characters...'}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-white/20 text-white placeholder-slate-400'
                        : 'bg-white border-black/20 text-black placeholder-slate-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                
                <select
                  value={state.filterStatus}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    filterStatus: e.target.value as 'all' | 'ready' | 'creating' | 'error' 
                  }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-white/20 text-white'
                      : 'bg-white border-black/20 text-black'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                >
                  <option value="all">{lang === 'zh' ? '全部状态' : 'All Status'}</option>
                  <option value="ready">{lang === 'zh' ? '就绪' : 'Ready'}</option>
                  <option value="creating">{lang === 'zh' ? '创建中' : 'Creating'}</option>
                  <option value="error">{lang === 'zh' ? '错误' : 'Error'}</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setState(prev => ({ ...prev, showImportExport: !prev.showImportExport }))}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                      : 'hover:bg-black/5 text-slate-600 hover:text-black'
                  }`}
                  title={lang === 'zh' ? '导入/导出' : 'Import/Export'}
                >
                  <Settings size={16} />
                </button>
                
                <button
                  onClick={() => setState(prev => ({ ...prev, showCreateForm: !prev.showCreateForm }))}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  {lang === 'zh' ? '创建角色' : 'Create Character'}
                </button>
              </div>
            </div>
          </div>

          {/* Create Form */}
          {state.showCreateForm && (
            <div className={`border-b pb-6 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="space-y-4">
                <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">
                  {lang === 'zh' ? '创建新角色' : 'Create New Character'}
                </h3>
                
                {/* Create Mode Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setState(prev => ({ ...prev, createMode: 'video' }))}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${state.createMode === 'video' ? 'bg-purple-500 text-white' : theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                  >
                    {lang === 'zh' ? '从视频URL' : 'From Video URL'}
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, createMode: 'task' }))}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${state.createMode === 'task' ? 'bg-purple-500 text-white' : theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                  >
                    {lang === 'zh' ? '从任务ID' : 'From Task ID'}
                  </button>
                </div>

                {/* Input Fields */}
                <div className="space-y-3">
                  {state.createMode === 'video' ? (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lang === 'zh' ? '视频URL' : 'Video URL'}
                      </label>
                      <input
                        type="url"
                        value={state.videoUrl}
                        onChange={(e) => setState(prev => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder={lang === 'zh' ? '输入视频URL...' : 'Enter video URL...'}
                        className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lang === 'zh' ? '任务ID' : 'Task ID'}
                      </label>
                      <input
                        type="text"
                        value={state.taskId}
                        onChange={(e) => setState(prev => ({ ...prev, taskId: e.target.value }))}
                        placeholder={lang === 'zh' ? '输入任务ID...' : 'Enter task ID...'}
                        className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
                      />
                    </div>
                  )}
                  
                  {/* Video Preview */}
                  {(state.videoUrl || state.taskId) && (
                    <VideoPreviewSection
                      videoUrl={state.videoUrl}
                      taskId={state.taskId}
                      timestamps={state.timestamps}
                      onTimestampsChange={(ts) => setState(prev => ({ ...prev, timestamps: ts }))}
                      theme={theme}
                      lang={lang}
                      shenmaService={shenmaService}
                    />
                  )}

                  {/* Timestamp Input with Guidance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lang === 'zh' ? '时间段选择' : 'Time Range Selection'}
                      </label>
                      <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <AlertCircle size={12} />
                        <span>{lang === 'zh' ? '范围：1-3秒' : 'Range: 1-3s'}</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={state.timestamps}
                      onChange={(e) => setState(prev => ({ ...prev, timestamps: e.target.value }))}
                      placeholder={lang === 'zh' ? '格式: 1,3 (表示1-3秒)' : 'Format: 1,3 (means 1-3s)'}
                      className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white`}
                    />
                    <div className={`mt-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className={`flex items-start gap-2 text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium mb-1">{lang === 'zh' ? '选择技巧：' : 'Selection Tips:'}</p>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>{lang === 'zh' ? '选择角色清晰可见的片段' : 'Choose segments where character is clearly visible'}</li>
                            <li>{lang === 'zh' ? '避免快速移动或模糊的画面' : 'Avoid fast motion or blurry frames'}</li>
                            <li>{lang === 'zh' ? '确保光线充足，角色特征明显' : 'Ensure good lighting and clear features'}</li>
                            <li>{lang === 'zh' ? '时间范围必须在1-3秒之间' : 'Time range must be 1-3 seconds'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showCreateForm: false, videoUrl: '', taskId: '', timestamps: '' }))}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCreateCharacter}
                    disabled={state.isCreating || !state.timestamps || (!state.videoUrl && !state.taskId)}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {state.isCreating ? (
                      <>
                        <Loader size={16} className="animate-spin inline mr-2" />
                        {lang === 'zh' ? '创建中...' : 'Creating...'}
                      </>
                    ) : (
                      lang === 'zh' ? '创建角色' : 'Create Character'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {(error || success) && (
            <div className="mb-4">
              {error && (
                <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400`}>
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {success && (
                <div className={`p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400`}>
                  <span className="text-sm">{success}</span>
                </div>
              )}
            </div>
          )}

          {/* Character List */}
          <div className="overflow-y-auto">
            <CharacterList
              characters={getFilteredCharacters()}
              selectedCharacter={selectedCharacter}
              onCharacterSelect={onCharacterSelect}
              onCharacterDelete={handleDeleteCharacter}
              theme={theme}
              lang={lang}
              viewMode={state.viewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Character List Component
interface CharacterListProps {
  characters: Character[];
  selectedCharacter?: Character;
  onCharacterSelect: (character: Character) => void;
  onCharacterDelete: (characterId: string) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  viewMode: 'grid' | 'list';
}

const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  selectedCharacter,
  onCharacterSelect,
  onCharacterDelete,
  theme,
  lang,
  viewMode
}) => {
  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User size={48} className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} />
        <p className={`text-lg font-medium mt-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          {lang === 'zh' ? '暂无角色' : 'No characters yet'}
        </p>
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
          {lang === 'zh' ? '点击"创建角色"开始添加您的第一个角色' : 'Click "Create Character" to add your first character'}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${
      viewMode === 'grid' 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
        : 'grid-cols-1'
    }`}>
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          isSelected={selectedCharacter?.id === character.id}
          onSelect={() => onCharacterSelect(character)}
          onDelete={() => onCharacterDelete(character.id)}
          theme={theme}
          lang={lang}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

// Character Card Component
interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  viewMode: 'grid' | 'list';
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected,
  onSelect,
  onDelete,
  theme,
  lang,
  viewMode
}) => {
  const getStatusIcon = (status: Character['status']) => {
    switch (status) {
      case 'creating':
        return <Loader size={14} className="animate-spin text-blue-500" />;
      case 'ready':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: Character['status']) => {
    switch (status) {
      case 'creating':
        return lang === 'zh' ? '创建中' : 'Creating';
      case 'ready':
        return lang === 'zh' ? '就绪' : 'Ready';
      case 'error':
        return lang === 'zh' ? '错误' : 'Error';
      default:
        return lang === 'zh' ? '未知' : 'Unknown';
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US');
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-500/10'
          : theme === 'dark'
          ? 'border-white/10 hover:border-white/20 bg-slate-700/30 hover:bg-slate-700/50'
          : 'border-black/10 hover:border-black/20 bg-slate-50/50 hover:bg-slate-50/80'
      }`}
    >
      {/* Character Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
          }`}>
            {character.profile_picture_url ? (
              <img
                src={character.profile_picture_url}
                alt={character.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={20} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
            )}
          </div>
          
          {/* Character Info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium text-sm truncate ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              {character.username}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(character.status)}
              <span className={`text-xs ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {getStatusText(character.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`p-1 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                : 'hover:bg-red-500/10 text-slate-600 hover:text-red-600'
            }`}
            title={lang === 'zh' ? '删除角色' : 'Delete character'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Character Details */}
      <div className="space-y-2">
        {/* Source */}
        <div className="flex items-center gap-2">
          {character.url ? (
            <Video size={12} className="text-blue-500" />
          ) : character.from_task ? (
            <FileText size={12} className="text-green-500" />
          ) : (
            <AlertCircle size={12} className="text-gray-500" />
          )}
          <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {character.url 
              ? (lang === 'zh' ? '来自视频' : 'From Video')
              : character.from_task 
              ? (lang === 'zh' ? '来自任务' : 'From Task')
              : (lang === 'zh' ? '未知来源' : 'Unknown Source')
            }
          </span>
        </div>

        {/* Timestamps */}
        {character.timestamps && (
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-purple-500" />
            <span className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {character.timestamps}
            </span>
          </div>
        )}

        {/* Usage Stats */}
        {character.usage_count !== undefined && character.usage_count > 0 && (
          <div className="flex items-center gap-2">
            <Play size={12} className="text-orange-500" />
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {lang === 'zh' ? `使用 ${character.usage_count} 次` : `Used ${character.usage_count} times`}
            </span>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-gray-500" />
          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
            {formatDate(character.created_at)}
          </span>
        </div>

        {/* Error Message */}
        {character.status === 'error' && character.error_message && (
          <div className={`p-2 rounded border text-xs ${
            theme === 'dark'
              ? 'bg-red-900/20 border-red-500/30 text-red-400'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {character.error_message}
          </div>
        )}
      </div>
    </div>
  );
};

// Video Preview Section Component
interface VideoPreviewSectionProps {
  videoUrl: string;
  taskId: string;
  timestamps: string;
  onTimestampsChange: (timestamps: string) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  shenmaService?: any;
}

const VideoPreviewSection: React.FC<VideoPreviewSectionProps> = ({
  videoUrl,
  taskId,
  timestamps,
  onTimestampsChange,
  theme,
  lang,
  shenmaService
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(3);

  // Load video from URL or task ID
  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        if (videoUrl) {
          // Direct video URL
          setVideoSrc(videoUrl);
        } else if (taskId && shenmaService) {
          // Fetch video from task ID
          const taskData = await shenmaService.getTaskStatus(taskId);
          if (taskData.status === 'SUCCESS' && taskData.data?.output) {
            setVideoSrc(taskData.data.output);
          } else if (taskData.status === 'FAILURE') {
            setError(lang === 'zh' ? '任务失败，无法加载视频' : 'Task failed, cannot load video');
          } else {
            setError(lang === 'zh' ? '视频尚未生成完成' : 'Video not yet generated');
          }
        }
      } catch (err) {
        setError(lang === 'zh' ? '加载视频失败' : 'Failed to load video');
        console.error('[VideoPreview] Load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (videoUrl || taskId) {
      loadVideo();
    }
  }, [videoUrl, taskId, shenmaService, lang]);

  // Parse timestamps
  useEffect(() => {
    if (timestamps) {
      const parts = timestamps.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const start = parseFloat(parts[0]);
        const end = parseFloat(parts[1]);
        if (!isNaN(start) && !isNaN(end)) {
          setRangeStart(start);
          setRangeEnd(end);
        }
      }
    }
  }, [timestamps]);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      // Set initial range if not set
      if (!timestamps) {
        const defaultEnd = Math.min(3, videoRef.current.duration);
        setRangeEnd(defaultEnd);
        onTimestampsChange(`0,${defaultEnd}`);
      }
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Loop within selected range
      if (videoRef.current.currentTime >= rangeEnd) {
        videoRef.current.currentTime = rangeStart;
      }
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = rangeStart;
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle range slider change
  const handleRangeChange = (start: number, end: number) => {
    // Validate range (1-3 seconds)
    const duration = end - start;
    if (duration < 1 || duration > 3) {
      return;
    }
    
    setRangeStart(start);
    setRangeEnd(end);
    onTimestampsChange(`${start},${end}`);
    
    // Update video position
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    return seconds.toFixed(1) + 's';
  };

  // Validate range
  const isValidRange = (): boolean => {
    const duration = rangeEnd - rangeStart;
    return duration >= 1 && duration <= 3;
  };

  if (isLoading) {
    return (
      <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-center gap-3">
          <Loader size={20} className="animate-spin text-purple-500" />
          <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
            {lang === 'zh' ? '加载视频中...' : 'Loading video...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!videoSrc) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="space-y-4">
        {/* Video Player */}
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full max-h-64 object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Play/Pause Overlay */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            {isPlaying ? (
              <Pause size={48} className="text-white opacity-80" />
            ) : (
              <Play size={48} className="text-white opacity-80" />
            )}
          </button>
        </div>

        {/* Timeline Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              {lang === 'zh' ? '选择时间段' : 'Select Time Range'}
            </span>
            <span className={`font-mono ${isValidRange() ? 'text-green-500' : 'text-red-500'}`}>
              {formatTime(rangeEnd - rangeStart)}
            </span>
          </div>

          {/* Range Slider */}
          <div className="relative h-12 bg-slate-700 rounded-lg overflow-hidden">
            {/* Video Timeline Background */}
            <div className="absolute inset-0 flex items-center px-2">
              <div className="w-full h-2 bg-slate-600 rounded-full relative">
                {/* Selected Range */}
                <div
                  className={`absolute h-full rounded-full ${isValidRange() ? 'bg-purple-500' : 'bg-red-500'}`}
                  style={{
                    left: `${(rangeStart / videoDuration) * 100}%`,
                    width: `${((rangeEnd - rangeStart) / videoDuration) * 100}%`
                  }}
                />
                
                {/* Current Time Indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full"
                  style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                />
              </div>
            </div>

            {/* Range Input Controls */}
            <div className="absolute inset-0 flex items-center px-2">
              <input
                type="range"
                min="0"
                max={videoDuration}
                step="0.1"
                value={rangeStart}
                onChange={(e) => {
                  const newStart = parseFloat(e.target.value);
                  if (newStart < rangeEnd) {
                    handleRangeChange(newStart, rangeEnd);
                  }
                }}
                className="absolute w-full opacity-0 cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max={videoDuration}
                step="0.1"
                value={rangeEnd}
                onChange={(e) => {
                  const newEnd = parseFloat(e.target.value);
                  if (newEnd > rangeStart) {
                    handleRangeChange(rangeStart, newEnd);
                  }
                }}
                className="absolute w-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {formatTime(rangeStart)}
            </span>
            <span className={`font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {formatTime(rangeEnd)}
            </span>
          </div>

          {/* Validation Message */}
          {!isValidRange() && (
            <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              <AlertCircle size={12} />
              <span>
                {lang === 'zh' 
                  ? '时间范围必须在1-3秒之间' 
                  : 'Time range must be between 1-3 seconds'}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRangeChange(0, 3)}
            className={`px-3 py-1.5 text-xs rounded ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            {lang === 'zh' ? '0-3秒' : '0-3s'}
          </button>
          <button
            onClick={() => {
              const mid = videoDuration / 2;
              handleRangeChange(Math.max(0, mid - 1.5), Math.min(videoDuration, mid + 1.5));
            }}
            className={`px-3 py-1.5 text-xs rounded ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            {lang === 'zh' ? '中间3秒' : 'Middle 3s'}
          </button>
          <button
            onClick={() => handleRangeChange(Math.max(0, videoDuration - 3), videoDuration)}
            className={`px-3 py-1.5 text-xs rounded ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            {lang === 'zh' ? '最后3秒' : 'Last 3s'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterPanel;
