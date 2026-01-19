import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Video, Clock, ExternalLink } from 'lucide-react';

interface Character {
  id: string;
  username: string;
  permalink: string;
  profile_picture_url: string;
  created_at?: number;
  source_video?: string;
  timestamps?: string;
}

interface CharacterManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onCharacterSelect: (character: Character) => void;
  onCharacterCreate: (params: {
    url?: string;
    from_task?: string;
    timestamps: string;
  }) => Promise<Character>;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const CharacterManager: React.FC<CharacterManagerProps> = ({
  isVisible,
  onClose,
  onCharacterSelect,
  onCharacterCreate,
  theme,
  lang
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    videoUrl: '',
    fromTask: '',
    startTime: '1',
    endTime: '3'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load characters from localStorage on mount
  useEffect(() => {
    const savedCharacters = localStorage.getItem('shenma_characters');
    if (savedCharacters) {
      try {
        setCharacters(JSON.parse(savedCharacters));
      } catch (error) {
        console.error('Failed to load saved characters:', error);
      }
    }
  }, []);

  // Save characters to localStorage whenever characters change
  useEffect(() => {
    localStorage.setItem('shenma_characters', JSON.stringify(characters));
  }, [characters]);

  const handleCreateCharacter = async () => {
    if (!createForm.videoUrl && !createForm.fromTask) {
      setError(lang === 'zh' ? '请提供视频URL或任务ID' : 'Please provide video URL or task ID');
      return;
    }

    const startTime = parseFloat(createForm.startTime);
    const endTime = parseFloat(createForm.endTime);

    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
      setError(lang === 'zh' ? '时间范围无效' : 'Invalid time range');
      return;
    }

    if ((endTime - startTime) > 3 || (endTime - startTime) < 1) {
      setError(lang === 'zh' ? '时间范围必须在1-3秒之间' : 'Time range must be between 1-3 seconds');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        timestamps: `${createForm.startTime},${createForm.endTime}`,
        ...(createForm.videoUrl ? { url: createForm.videoUrl } : {}),
        ...(createForm.fromTask ? { from_task: createForm.fromTask } : {})
      };

      const newCharacter = await onCharacterCreate(params);
      
      // Add creation timestamp and source info
      const characterWithMetadata: Character = {
        ...newCharacter,
        created_at: Date.now(),
        source_video: createForm.videoUrl,
        timestamps: params.timestamps
      };

      setCharacters(prev => [characterWithMetadata, ...prev]);
      setIsCreating(false);
      setCreateForm({
        videoUrl: '',
        fromTask: '',
        startTime: '1',
        endTime: '3'
      });
    } catch (error) {
      console.error('Character creation failed:', error);
      setError(error instanceof Error ? error.message : 'Character creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = (characterId: string) => {
    setCharacters(prev => prev.filter(char => char.id !== characterId));
  };

  const handleSelectCharacter = (character: Character) => {
    onCharacterSelect(character);
    onClose();
  };

  if (!isVisible) return null;

  const texts = {
    title: lang === 'zh' ? '角色管理' : 'Character Management',
    createNew: lang === 'zh' ? '创建新角色' : 'Create New Character',
    videoUrl: lang === 'zh' ? '视频URL' : 'Video URL',
    taskId: lang === 'zh' ? '任务ID' : 'Task ID',
    startTime: lang === 'zh' ? '开始时间(秒)' : 'Start Time (seconds)',
    endTime: lang === 'zh' ? '结束时间(秒)' : 'End Time (seconds)',
    create: lang === 'zh' ? '创建' : 'Create',
    cancel: lang === 'zh' ? '取消' : 'Cancel',
    noCharacters: lang === 'zh' ? '暂无角色，创建第一个角色吧！' : 'No characters yet. Create your first character!',
    selectCharacter: lang === 'zh' ? '选择角色' : 'Select Character',
    deleteCharacter: lang === 'zh' ? '删除角色' : 'Delete Character',
    viewProfile: lang === 'zh' ? '查看资料' : 'View Profile',
    createdAt: lang === 'zh' ? '创建于' : 'Created at',
    timeRange: lang === 'zh' ? '时间范围' : 'Time Range',
    or: lang === 'zh' ? '或' : 'or'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400]">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border shadow-2xl`}>
        {/* Header */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User size={24} className="text-amber-500" />
              <h2 className="text-xl font-semibold">{texts.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                {texts.createNew}
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {/* Create Character Form */}
          {isCreating && (
            <div className={`mb-6 p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">{texts.createNew}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{texts.videoUrl}</label>
                  <input
                    type="url"
                    value={createForm.videoUrl}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                    className={`w-full p-3 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {texts.taskId} <span className="text-gray-500">({texts.or})</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.fromTask}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, fromTask: e.target.value }))}
                    className={`w-full p-3 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="video_637efe22-3b6a-47ad-ab02-ee01a686a0bd"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{texts.startTime}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className={`w-full p-3 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{texts.endTime}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className={`w-full p-3 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleCreateCharacter}
                  disabled={loading}
                  className="px-6 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {loading ? '创建中...' : texts.create}
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className={`px-6 py-2 rounded-xl transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-600 hover:bg-gray-500' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {texts.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Characters List */}
          {characters.length === 0 ? (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">{texts.noCharacters}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 hover:border-amber-500' 
                      : 'bg-white border-gray-200 hover:border-amber-500'
                  }`}
                >
                  {/* Character Avatar */}
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={character.profile_picture_url}
                      alt={character.username}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMiIgeT0iMTIiPgo8cGF0aCBkPSJNMjAgMjFWMTlBNCA0IDAgMCAwIDE2IDE1SDhBNCA0IDAgMCAwIDQgMTlWMjEiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{character.username}</h4>
                      {character.created_at && (
                        <p className="text-xs text-gray-500">
                          {texts.createdAt} {new Date(character.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Character Info */}
                  {character.timestamps && (
                    <div className="mb-3 text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      {texts.timeRange}: {character.timestamps}s
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectCharacter(character)}
                      className="flex-1 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      {texts.selectCharacter}
                    </button>
                    
                    <button
                      onClick={() => window.open(character.permalink, '_blank')}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-gray-600' 
                          : 'hover:bg-gray-100'
                      }`}
                      title={texts.viewProfile}
                    >
                      <ExternalLink size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteCharacter(character.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={texts.deleteCharacter}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterManager;