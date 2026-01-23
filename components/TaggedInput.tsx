import React, { useCallback, useRef } from 'react';

interface TaggedInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  lang?: 'zh' | 'en';
  onTagHover?: (tagData: { id: string; content?: string } | null) => void;
  upstreamData?: Array<{ blockNumber: string; content?: string; type?: string }>;
}

const TaggedInput = React.forwardRef<HTMLTextAreaElement, TaggedInputProps>(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  lang = 'zh',
  onTagHover,
  upstreamData = []
}, forwardedRef) => {
  
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = forwardedRef || internalRef;
  
  const insertTag = useCallback((blockNumber: string) => {
    const tagText = `[${blockNumber}]`;
    const newValue = value + (value ? ' ' : '') + tagText;
    onChange(newValue);
  }, [value, onChange]);

  React.useImperativeHandle(forwardedRef, () => ({
    insertTag,
    focus: () => {
      if (textareaRef && 'current' in textareaRef && textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    blur: () => {
      if (textareaRef && 'current' in textareaRef && textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  }), [insertTag, textareaRef]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      style={{ 
        resize: 'none',
        outline: 'none'
      }}
    />
  );
});

TaggedInput.displayName = 'TaggedInput';

export default TaggedInput;