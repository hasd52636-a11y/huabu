import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, Edit3 } from 'lucide-react';
import { PresetPrompt } from '../types';

interface PresetPromptModalProps {
  isOpen: boolean;
  prompts: PresetPrompt[];
  selectedPromptIndex: number | null;
  onClose: () => void;
  onSave: (prompts: PresetPrompt[]) => void;
  onSelect: (index: number) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const PresetPromptModal: React.FC<PresetPromptModalProps> = ({
  isOpen,
  prompts,
  selectedPromptIndex,
  onClose,
  onSave,
  onSelect,
  theme,
  lang
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [localPrompts, setLocalPrompts] = useState<PresetPrompt[]>(prompts);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Translation helper
  const t = {
    zh: {
      title: '我的提示词库',
      placeholder: '点击编辑提示词内容...',
      characterCount: '字符计数',
      save: '保存',
      cancel: '取消',
      emptySlot: '空槽位',
      promptSlot: '提示词槽位',
      tooLong: '提示词内容不能超过3000字符',
      selectPrompt: '选择提示词'
    },
    en: {
      title: 'My Prompt Library',
      placeholder: 'Click to edit prompt content...',
      characterCount: 'Character Count',
      save: 'Save',
      cancel: 'Cancel',
      emptySlot: 'Empty Slot',
      promptSlot: 'Prompt Slot',
      tooLong: 'Prompt content cannot exceed 3000 characters',
      selectPrompt: 'Select Prompt'
    }
  }[lang];

  // Update local prompts when props change
  useEffect(() => {
    setLocalPrompts(prompts);
  }, [prompts]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingIndex]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingIndex !== null) {
          // Cancel editing
          setEditingIndex(null);
          setEditingContent('');
          setCharacterCount(0);
        } else {
          // Close modal
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, editingIndex]);

  const handleClose = () => {
    // Save changes before closing
    onSave(localPrompts);
    setEditingIndex(null);
    setEditingContent('');
    setCharacterCount(0);
    onClose();
  };

  const handleSlotClick = (index: number) => {
    if (editingIndex === index) {
      // Already editing this slot, do nothing
      return;
    }

    if (editingIndex !== null) {
      // Save current editing before switching
      saveCurrentEdit();
    }

    // Start editing this slot
    const prompt = localPrompts[index];
    setEditingIndex(index);
    setEditingContent(prompt.content);
    setCharacterCount(prompt.content.length);
  };

  const handleContentChange = (content: string) => {
    // Enforce 3000 character limit
    if (content.length > 3000) {
      return;
    }
    
    setEditingContent(content);
    setCharacterCount(content.length);
  };

  const saveCurrentEdit = () => {
    if (editingIndex === null) return;

    const updatedPrompts = [...localPrompts];
    updatedPrompts[editingIndex] = {
      ...updatedPrompts[editingIndex],
      content: editingContent,
      title: editingContent.slice(0, 50) || t.emptySlot,
      updatedAt: new Date()
    };
    
    setLocalPrompts(updatedPrompts);
    setEditingIndex(null);
    setEditingContent('');
    setCharacterCount(0);
  };

  const handleSelectPrompt = (index: number) => {
    onSelect(index);
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-10 animate-in fade-in zoom-in duration-300"
      onClick={handleClickOutside}
    >
      <div 
        className={`w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-[4rem] border-4 shadow-4xl ${
          theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-black/5'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-8 border-b-2 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="text-amber-500" size={32} />
              <h2 className="text-2xl font-black uppercase tracking-widest">
                {t.title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className={`p-3 rounded-2xl transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                  : 'hover:bg-black/5 text-black/70 hover:text-black'
              }`}
              aria-label={lang === 'zh' ? '关闭' : 'Close'}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          {/* Prompt Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {localPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                className={`
                  relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200
                  min-h-[200px] flex flex-col
                  ${selectedPromptIndex === index
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg scale-105'
                    : theme === 'dark'
                      ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      : 'border-black/10 bg-black/5 hover:border-black/20 hover:bg-black/10'
                  }
                  ${editingIndex === index ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => handleSlotClick(index)}
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      theme === 'dark' ? 'text-white/60' : 'text-black/60'
                    }`}>
                      P{index + 1} - {t.promptSlot} {index + 1}
                    </span>
                    {editingIndex === index && (
                      <Edit3 size={14} className="text-blue-500" />
                    )}
                    {selectedPromptIndex === index && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black uppercase text-green-600 dark:text-green-400">
                          {lang === 'zh' ? '活跃' : 'ACTIVE'}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedPromptIndex === index && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400">
                        {lang === 'zh' ? '已选中' : 'SELECTED'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col">
                  {editingIndex === index ? (
                    <div className="flex-1 flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={editingContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder={t.placeholder}
                        className={`
                          flex-1 w-full p-4 rounded-xl border-2 resize-none text-sm
                          ${theme === 'dark'
                            ? 'bg-white/10 border-amber-400 text-white placeholder-white/50'
                            : 'bg-white border-amber-500 text-black placeholder-black/50'
                          }
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                        `}
                        rows={1}
                        onInput={(e) => {
                          const textarea = e.target as HTMLTextAreaElement;
                          textarea.style.height = 'auto';
                          textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                        }}
                      />
                      <div className={`mt-2 text-xs flex justify-between items-center ${
                        characterCount > 2700 ? 'text-red-500' : theme === 'dark' ? 'text-white/60' : 'text-black/60'
                      }`}>
                        <span>{t.characterCount}: {characterCount}/3000</span>
                        {characterCount > 3000 && (
                          <span className="text-red-500 font-bold">{t.tooLong}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      {prompt.content ? (
                        <div className={`text-sm leading-relaxed ${
                          theme === 'dark' ? 'text-white/80' : 'text-black/80'
                        }`}>
                          <div className="line-clamp-6">
                            {prompt.content}
                          </div>
                        </div>
                      ) : (
                        <div className={`flex-1 flex items-center justify-center text-sm ${
                          theme === 'dark' ? 'text-white/40' : 'text-black/40'
                        }`}>
                          {t.emptySlot}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!editingIndex && prompt.content && (
                  <div className="mt-4 pt-4 border-t border-current/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPrompt(index);
                      }}
                      className={`
                        w-full py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider
                        transition-all duration-200 flex items-center justify-center gap-2
                        ${selectedPromptIndex === index
                          ? 'bg-green-500 text-white shadow-lg'
                          : theme === 'dark'
                            ? 'bg-white/10 text-white/80 hover:bg-white/20'
                            : 'bg-black/10 text-black/80 hover:bg-black/20'
                        }
                      `}
                    >
                      {selectedPromptIndex === index ? (
                        <>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          {lang === 'zh' ? '当前活跃' : 'CURRENTLY ACTIVE'}
                        </>
                      ) : (
                        t.selectPrompt
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {editingIndex !== null && (
            <div className="flex justify-center gap-4">
              <button
                onClick={saveCurrentEdit}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-2xl font-bold uppercase text-sm tracking-wider hover:scale-105 active:scale-95 transition-all"
              >
                <Save size={18} />
                {t.save}
              </button>
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setEditingContent('');
                  setCharacterCount(0);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold uppercase text-sm tracking-wider hover:scale-105 active:scale-95 transition-all ${
                  theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-black/10 text-black hover:bg-black/20'
                }`}
              >
                <X size={18} />
                {t.cancel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresetPromptModal;