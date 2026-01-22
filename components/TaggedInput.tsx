import React, { useRef, useState, useCallback } from 'react';

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
  const [isFocused, setIsFocused] = useState(false);
  const lastValueRef = useRef<string>('');

  // 同步lastValueRef
  React.useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  // 解析文本中的标签引用 (如 #1, #2 等)
  const parseTagsFromText = useCallback((text: string) => {
    try {
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
    } catch (error) {
      console.error('Error parsing tags:', error);
      return [];
    }
  }, [upstreamData]);

  // 渲染带标签的内容
  const renderContent = useCallback(() => {
    try {
      // 当没有内容且未聚焦时，显示placeholder
      if (!value && !isFocused && placeholder) {
        return <span className="text-gray-400 pointer-events-none select-none">{placeholder}</span>;
      }

      // 如果没有内容，返回空的span以保持结构
      if (!value) {
        return <span></span>;
      }

      const tags = parseTagsFromText(value);
      if (tags.length === 0) {
        // 没有标签时，直接显示文本
        return <span>{value}</span>;
      }

      const parts = [];
      let lastIndex = 0;

      tags.forEach((tag, index) => {
        // 添加标签前的文本
        if (tag.startIndex > lastIndex) {
          const textPart = value.slice(lastIndex, tag.startIndex);
          if (textPart) {
            parts.push(<span key={`text-${index}`}>{textPart}</span>);
          }
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
        const textPart = value.slice(lastIndex);
        if (textPart) {
          parts.push(<span key="text-end">{textPart}</span>);
        }
      }

      return <>{parts}</>;
    } catch (error) {
      console.error('Error rendering content:', error);
      return <span>{value || ''}</span>;
    }
  }, [value, placeholder, isFocused, parseTagsFromText, onTagHover]);

  // 处理输入
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    try {
      if (isComposing) return;
      
      const newValue = e.currentTarget.textContent || '';
      // 防止重复触发onChange
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }, [onChange, isComposing]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    try {
      onKeyDown?.(e);
    } catch (error) {
      console.error('Error handling key down:', error);
    }
  }, [onKeyDown]);

  // 处理输入法事件
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    try {
      setIsComposing(false);
      const newValue = e.currentTarget.textContent || '';
      // 防止重复触发onChange
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    } catch (error) {
      console.error('Error handling composition end:', error);
    }
  }, [onChange]);

  // 插入标签的方法
  const insertTag = useCallback((blockNumber: string) => {
    try {
      const tagText = `#${blockNumber}`;
      const newValue = value + (value ? ' ' : '') + tagText;
      onChange(newValue);
      
      // 聚焦到输入框末尾
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.focus();
          const range = document.createRange();
          const selection = window.getSelection();
          if (selection) {
            range.selectNodeContents(containerRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }, 0);
    } catch (error) {
      console.error('Error inserting tag:', error);
    }
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
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{ 
        whiteSpace: 'pre-wrap',
        direction: 'ltr',
        textAlign: 'left'
      }}
    >
      {renderContent()}
    </div>
  );
});

TaggedInput.displayName = 'TaggedInput';

export default TaggedInput;