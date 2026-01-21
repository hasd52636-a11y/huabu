/**
 * PresetManager - 预设管理组件
 * 
 * 功能：
 * - 预设加载下拉菜单
 * - 保存预设对话框
 * - 预设应用逻辑
 * - 参数同步
 * - 紫色主题 (violet-500)
 * - 多语言支持
 */

import React, { useState } from 'react';
import { Save, Upload, Trash2, Edit3, ChevronDown } from 'lucide-react';
import { 
  GenerationParameters,
  ParameterPreset
} from '../types';

interface PresetManagerProps {
  generationType: 'image' | 'video';
  currentParameters: GenerationParameters;
  presets: ParameterPreset[];
  onPresetLoad: (preset: ParameterPreset) => void;
  onPresetSave: (name: string, parameters: GenerationParameters) => void;
  onPresetDelete?: (presetId: string) => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const PresetManager: React.FC<PresetManagerProps> = ({
  generationType,
  currentParameters,
  presets,
  onPresetLoad,
  onPresetSave,
  onPresetDelete,
  theme = 'light',
  lang = 'zh'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // 翻译
  const t = {
    zh: {
      presets: '预设',
      loadPreset: '加载预设',
      savePreset: '保存预设',
      noPresets: '暂无预设',
      presetName: '预设名称',
      presetDescription: '预设描述（可选）',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      apply: '应用',
      saveCurrentAsPreset: '保存当前参数为预设',
      presetNamePlaceholder: '输入预设名称...',
      presetDescriptionPlaceholder: '输入预设描述...',
      confirmDelete: '确定要删除这个预设吗？',
      presetSaved: '预设已保存',
      presetLoaded: '预设已加载',
      presetDeleted: '预设已删除'
    },
    en: {
      presets: 'Presets',
      loadPreset: 'Load Preset',
      savePreset: 'Save Preset',
      noPresets: 'No presets available',
      presetName: 'Preset Name',
      presetDescription: 'Preset Description (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      apply: 'Apply',
      saveCurrentAsPreset: 'Save Current Parameters as Preset',
      presetNamePlaceholder: 'Enter preset name...',
      presetDescriptionPlaceholder: 'Enter preset description...',
      confirmDelete: 'Are you sure you want to delete this preset?',
      presetSaved: 'Preset saved',
      presetLoaded: 'Preset loaded',
      presetDeleted: 'Preset deleted'
    }
  };

  // 过滤当前生成类型的预设
  const filteredPresets = presets.filter(preset => 
    preset.generationType === generationType
  );

  // 处理预设保存
  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    onPresetSave(presetName.trim(), currentParameters);
    setPresetName('');
    setPresetDescription('');
    setIsSaveDialogOpen(false);
  };

  // 处理预设加载
  const handleLoadPreset = (preset: ParameterPreset) => {
    onPresetLoad(preset);
    setIsDropdownOpen(false);
  };

  // 处理预设删除
  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPresetDelete && window.confirm(t[lang].confirmDelete)) {
      onPresetDelete(presetId);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        {t[lang].presets}
      </h3>

      {/* 预设列表 */}
      <div className="space-y-2 mb-4">
        {filteredPresets.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between p-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
            >
              <span>{t[lang].loadPreset}</span>
              <ChevronDown 
                size={16} 
                className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto dropdown-violet">
                {filteredPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 dropdown-item-violet transition-colors group"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 text-left text-sm text-slate-700 dark:text-slate-300"
                    >
                      <div className="font-medium">{preset.name}</div>
                      {preset.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {preset.description}
                        </div>
                      )}
                    </button>
                    
                    {onPresetDelete && (
                      <button
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-all duration-300 transform hover:scale-110 hover:rotate-12"
                        title={t[lang].delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">
            {t[lang].noPresets}
          </p>
        )}
      </div>

      {/* 保存预设按钮 */}
      <button
        onClick={() => setIsSaveDialogOpen(true)}
        className="w-full p-2 text-sm btn-violet-secondary rounded border-2 border-violet-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-violet-300/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        <Save size={14} />
        {t[lang].savePreset}
      </button>

      {/* 保存预设对话框 */}
      {isSaveDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t[lang].savePreset}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t[lang].presetName}
                  </label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder={t[lang].presetNamePlaceholder}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t[lang].presetDescription}
                  </label>
                  <textarea
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                    placeholder={t[lang].presetDescriptionPlaceholder}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsSaveDialogOpen(false);
                    setPresetName('');
                    setPresetDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                >
                  {t[lang].cancel}
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-300 transform ${
                    presetName.trim()
                      ? 'bg-violet-500 hover:bg-violet-600 text-white hover:scale-105 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5'
                      : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {t[lang].save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetManager;