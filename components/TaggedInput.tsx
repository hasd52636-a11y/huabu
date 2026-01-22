import React, { useRef, useEffect, useState, useCallback } from 'react';

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

/**
 * TaggedInput - 简化版支持标签和文本混合输入的组件
 * 用于提示词输入，引用编号显示为简单的标签
 */
const TaggedInput = React.forwardRef<HTMLDivElement, TaggedInputProps>(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  lang = 'zh',
  onTagHover,
  upstreamData = []
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // 解析文本中的标签引用 (如 #1, #2 等)
  const parseTagsFromText = useCallback((text: string) => {
    const tagRegex = /#(\d+)/g;
    const matches = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      const blockNumber = match[1];
      const referencedBlock = upstreamData.find(block => block.blockNumber === blockNumber);
      
      matches.push({
        id: `tag-${blockNumber}`,
        blockNumber,
        content: referencedBlock?.content || '',
        type: referencedBlock?.type || 'text',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0]
      });
    }
    
    return matches;
  }, [upstreamData]);

  // 渲染带标签的内容
  const renderContent = useCallback(() => {
    if (!value) {
      return <span className="text-gray-400">{placeholder}</span>;
    }

    const tags = parseTagsFromText(value);
    if (tags.length === 0) {
      return value;
    }

    const parts = [];
    let lastIndex = 0;

    tags.forEach((tag, index) => {
      // 添加标签前的文本
      if (tag.startIndex > lastIndex) {
        parts.push(value.slice(lastIndex, tag.startIndex));
      }

      // 添加标签
      parts.push(
        <span
          key={`tag-${index}`}
          className="inline-flex items-center px-2 py-1 mx-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
          onMouseEnter={() => onTagHover?.({ id: tag.id, content: tag.content })}
          onMouseLeave={() => onTagHover?.(null)}
          title={tag.content ? `${tag.blockNumber}: ${tag.content.slice(0, 50)}${tag.content.length > 50 ? '...' : ''}` : `引用模块 ${tag.blockNumber}`}
        >
          #{tag.blockNumber}
        </span>
      );

      lastIndex = tag.endIndex;
    });

    // 添加最后的文本
    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }

    return parts;
  }, [value, placeholder, parseTagsFromText, onTagHover]);

  // 处理输入
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (isComposing) return;
    
    const newValue = e.currentTarget.textContent || '';
    onChange(newValue);
  }, [onChange, isComposing]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
  }, [onKeyDown]);

  // 处理输入法事件
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    setIsComposing(false);
    const newValue = e.currentTarget.textContent || '';
    onChange(newValue);
  }, [onChange]);

  // 插入标签的方法
  const insertTag = useCallback((blockNumber: string) => {
    const tagText = `#${blockNumber}`;
    const newValue = value + (value ? ' ' : '') + tagText;
    onChange(newValue);
    
    // 聚焦到输入框末尾
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(containerRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 0);
  }, [value, onChange]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    insertTag,
    focus: () => containerRef.current?.focus(),
    blur: () => containerRef.current?.blur()
  }), [insertTag]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[2.5rem] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {renderContent()}
    </div>
  );
});

TaggedInput.displayName = 'TaggedInput';

export default TaggedInput;