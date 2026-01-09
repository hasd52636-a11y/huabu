import React from 'react';
import { FileText } from 'lucide-react';

interface PresetPromptButtonProps {
  selectedPrompt: string | null;
  selectedPromptIndex: number | null;
  onOpenModal: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const PresetPromptButton: React.FC<PresetPromptButtonProps> = ({
  selectedPrompt,
  selectedPromptIndex,
  onOpenModal,
  theme,
  lang
}) => {
  // Truncate prompt text for display
  const truncateText = (text: string, maxLength: number = 20): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get display text based on selection state
  const getDisplayText = (): string => {
    if (selectedPrompt && selectedPrompt.trim() && selectedPromptIndex !== null) {
      return `P${selectedPromptIndex + 1}`;
    }
    return lang === 'zh' ? '我的提示词' : 'My Prompt';
  };

  // Get tooltip text for full prompt when truncated
  const getTooltipText = (): string | undefined => {
    if (selectedPrompt && selectedPrompt.trim() && selectedPrompt.length > 20) {
      return selectedPrompt.trim();
    }
    return undefined;
  };

  const displayText = getDisplayText();
  const tooltipText = getTooltipText();

  return (
    <button
      onClick={onOpenModal}
      className={`
        px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all
        flex items-center gap-2 relative
        ${selectedPrompt && selectedPrompt.trim()
          ? 'bg-amber-500 shadow-lg text-white border-2 border-amber-400 scale-105'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5'
        }
      `}
      title={tooltipText}
      aria-label={lang === 'zh' ? '打开我的提示词库' : 'Open My Prompt Library'}
    >
      <FileText size={12} />
      <span className="max-w-[120px] truncate">
        {displayText}
      </span>
      {/* Active indicator dot */}
      {selectedPrompt && selectedPrompt.trim() && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
};

export default PresetPromptButton;