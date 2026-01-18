import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Eye, EyeOff, Pencil } from 'lucide-react';

interface PromptPreviewPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  previewUrl?: string;
  onRegenerate?: (newPrompt?: string) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  // 新增：解析后的提示词信息
  resolvedPromptInfo?: {
    original: string;
    resolved: string;
    references: Array<{ blockNumber: string; content: string; found: boolean; type: string }>;
  };
}

const PromptPreviewPopover: React.FC<PromptPreviewPopoverProps> = ({
  isOpen,
  onClose,
  prompt,
  previewUrl,
  onRegenerate,
  theme,
  lang,
  resolvedPromptInfo
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [editablePrompt, setEditablePrompt] = useState(prompt);
  const [isEditing, setIsEditing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // 检查是否有提示词（区分AI生成 vs 用户上传）
  const hasPrompt = Boolean(prompt && prompt.trim());
  const isUserUploaded = !hasPrompt;

  const t = {
    zh: {
      preview: '预览',
      prompt: '提示词',
      originalPrompt: '原始提示词',
      resolvedPrompt: '实际使用的提示词',
      references: '引用内容',
      regenerate: '重新生成',
      close: '关闭',
      noPreview: '暂无预览',
      loading: '生成中...',
      edit: '编辑',
      save: '保存',
      cancel: '取消',
      userUploaded: '用户上传',
      noPromptAvailable: '此图片为用户上传，无生成提示词',
      addPromptToRegenerate: '添加提示词以重新生成图片',
      referenceNotFound: '未找到引用的模块',
      imageReference: '(图片引用)'
    },
    en: {
      preview: 'Preview',
      prompt: 'Prompt',
      originalPrompt: 'Original Prompt',
      resolvedPrompt: 'Actual Prompt Used',
      references: 'References',
      regenerate: 'Regenerate',
      close: 'Close',
      noPreview: 'No preview available',
      loading: 'Generating...',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      userUploaded: 'User Uploaded',
      noPromptAvailable: 'This image was uploaded by user, no generation prompt available',
      addPromptToRegenerate: 'Add a prompt to regenerate this image',
      referenceNotFound: 'Referenced block not found',
      imageReference: '(Image Reference)'
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 同步外部prompt变化
  useEffect(() => {
    setEditablePrompt(prompt);
  }, [prompt]);

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsLoading(true);
      try {
        await onRegenerate(editablePrompt);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSavePrompt = () => {
    setIsEditing(false);
    // 如果提示词有变化，可以触发重新生成
    if (editablePrompt !== prompt && onRegenerate) {
      handleRegenerate();
    }
  };

  const handleCancelEdit = () => {
    setEditablePrompt(prompt);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  const popoverClasses = {
    light: 'bg-white text-gray-800 border-gray-200 shadow-lg',
    dark: 'bg-gray-800 text-white border-gray-700 shadow-lg'
  };

  const buttonClasses = {
    light: 'bg-blue-500 hover:bg-blue-600 text-white',
    dark: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/50">
      <div 
        ref={popoverRef}
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Eye size={24} className="text-blue-500" />
            {isUserUploaded ? t[lang].userUploaded : t[lang].preview}
          </h2>
          <div className="flex items-center gap-2">
            {hasPrompt && (
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                aria-label={showPrompt ? t[lang].preview : t[lang].prompt}
              >
                {showPrompt ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
            {(hasPrompt || editablePrompt.trim()) && !isEditing && (
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>{t[lang].regenerate}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}
              aria-label={t[lang].close}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prompt section */}
            {(showPrompt || isUserUploaded) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-base font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {t[lang].prompt}
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                
                <div 
                  className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editablePrompt}
                        onChange={(e) => setEditablePrompt(e.target.value)}
                        placeholder={isUserUploaded ? t[lang].addPromptToRegenerate : ''}
                        className={`w-full p-3 text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        rows={8}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePrompt}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        >
                          {t[lang].save}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            theme === 'dark' 
                              ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          {t[lang].cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 显示原始提示词 */}
                      {hasPrompt ? (
                        <div>
                          <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {resolvedPromptInfo && resolvedPromptInfo.references.length > 0 
                              ? t[lang].originalPrompt 
                              : t[lang].prompt}
                          </h4>
                          <p className={`whitespace-pre-wrap text-sm p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'
                          }`}>
                            {prompt}
                          </p>
                        </div>
                      ) : (
                        <p className={`text-sm italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {t[lang].noPromptAvailable}
                        </p>
                      )}
                      
                      {/* 显示引用内容 */}
                      {resolvedPromptInfo && resolvedPromptInfo.references.length > 0 && (
                        <div>
                          <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {t[lang].references}
                          </h4>
                          <div className="space-y-2">
                            {resolvedPromptInfo.references.map((ref, idx) => (
                              <div key={idx} className="border-l-2 border-blue-500 pl-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                    [{ref.blockNumber}]
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    ({ref.type})
                                  </span>
                                </div>
                                {ref.found ? (
                                  <div className={`p-2 rounded text-xs ${
                                    theme === 'dark' 
                                      ? 'bg-green-900/20 text-green-300' 
                                      : 'bg-green-50 text-green-700'
                                  }`}>
                                    {ref.type === 'image' ? (
                                      <span className="italic">
                                        {t[lang].imageReference}
                                      </span>
                                    ) : (
                                      <span>{ref.content}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className={`p-2 rounded text-xs ${
                                    theme === 'dark' 
                                      ? 'bg-red-900/20 text-red-400' 
                                      : 'bg-red-50 text-red-600'
                                  }`}>
                                    {t[lang].referenceNotFound}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 显示解析后的提示词 */}
                      {resolvedPromptInfo && resolvedPromptInfo.references.length > 0 && (
                        <div>
                          <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {t[lang].resolvedPrompt}
                          </h4>
                          <p className={`whitespace-pre-wrap text-sm p-3 rounded-lg border-2 ${
                            theme === 'dark' 
                              ? 'bg-blue-900/20 border-blue-700 text-blue-200' 
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>
                            {resolvedPromptInfo.resolved}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview section */}
            <div className="space-y-4">
              <h3 className={`text-base font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {t[lang].preview}
              </h3>
              <div className={`relative aspect-video rounded-lg overflow-hidden border ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
              }`}>
                {isLoading ? (
                  <div className={`flex items-center justify-center w-full h-full ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw size={32} className="animate-spin text-blue-500" />
                      <span className="text-sm">{t[lang].loading}</span>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className={`flex items-center justify-center w-full h-full ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t[lang].noPreview}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptPreviewPopover;