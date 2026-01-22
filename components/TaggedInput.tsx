import React, { useCallback } from 'react';

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
}, ref) => {
  
  const insertTag = useCallback((blockNumber: string) => {
    const tagText = `#${blockNumber}`;
    const newValue = value + (value ? ' ' : '') + tagText;
    onChange(newValue);
  }, [value, onChange]);

  React.useImperativeHandle(ref, () => ({
    insertTag,
    focus: () => (ref as any)?.current?.focus(),
    blur: () => (ref as any)?.current?.blur()
  }), [insertTag]);

  return (
    <textarea
      ref={ref as any}
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