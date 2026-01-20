import React, { useRef, useEffect, useState } from 'react';

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
 * TaggedInput - 支持标签和文本混合输入的组件
 * 用于提示词输入，引用编号显示为不可编辑的标签芯片
 */
const TaggedInput = React.forwardRef<any, TaggedInputProps>(({
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
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // 初始化内容
  useEffect(() => {
    if (containerRef.current && value) {
      renderContent(value);
    }
  }, []);

  // 渲染内容：将 [A01] 转换为标签芯片
  const renderContent = (text: string) => {
    if (!containerRef.current) return;
    
    const regex = /\[([A-Z]\d{2})\]/g;
    let html = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 添加标签前的文本
      if (match.index > lastIndex) {
        html += escapeHtml(text.slice(lastIndex, match.index));
      }
      
      // 添加增强的标签芯片 - 改进的视觉设计和多行排版
      const chipColor = getEnhancedChipStyle(match[1]);
      html += `<span class="inline-block align-middle px-3 py-1.5 mx-1 text-white font-semibold text-sm shadow-lg select-none cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 ease-out tag-chip" contenteditable="false" data-tag="${match[1]}" style="${chipColor.style}" onmouseenter="this.dispatchEvent(new CustomEvent('tagHover', {detail: '${match[1]}', bubbles: true}))" onmouseleave="this.dispatchEvent(new CustomEvent('tagHoverEnd', {bubbles: true}))">[${match[1]}]</span>`;
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      html += escapeHtml(text.slice(lastIndex));
    }
    
    if (!html.trim()) {
      containerRef.current.innerHTML = `<span class="text-gray-400 dark:text-gray-500">${placeholder || ''}</span>`;
    } else {
      containerRef.current.innerHTML = html;
    }
  };

  // 获取增强的标签芯片样式
  const getEnhancedChipStyle = (blockNumber: string) => {
    const colors = {
      A: { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)', border: '#3b82f6' },
      B: { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #047857 100%)', border: '#10b981' },
      V: { bg: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #b91c1c 100%)', border: '#ef4444' }
    };
    
    const type = blockNumber.charAt(0) as keyof typeof colors;
    const color = colors[type] || colors.A;
    
    return {
      style: `background: ${color.bg}; border: 2px solid ${color.border}; border-radius: 16px; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`
    };
  };

  // 转义HTML
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 处理标签悬停事件
  const handleTagHover = (e: Event) => {
    const customEvent = e as CustomEvent;
    const tagId = customEvent.detail;
    
    // 查找对应的上游数据
    const referencedBlock = upstreamData.find(data => data.blockNumber === tagId);
    const content = referencedBlock?.content || '';
    const hasContent = content && content.trim();
    
    setHoveredTag(tagId);
    onTagHover?.({ 
      id: tagId, 
      content: hasContent 
        ? (content.length > 100 ? `${content.substring(0, 100)}...` : content)
        : (lang === 'zh' ? '暂无内容，建议先生成内容' : 'No content yet, consider generating content first')
    });
  };

  const handleTagHoverEnd = () => {
    setHoveredTag(null);
    onTagHover?.(null);
  };

  // 设置事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('tagHover', handleTagHover);
      container.addEventListener('tagHoverEnd', handleTagHoverEnd);
      
      return () => {
        container.removeEventListener('tagHover', handleTagHover);
        container.removeEventListener('tagHoverEnd', handleTagHoverEnd);
      };
    }
  }, [onTagHover]);

  // 插入标签 - 优化的光标处理逻辑
  const insertTag = (blockNumber: string) => {
    if (!containerRef.current) return;
    
    // 保存当前光标位置和选区
    const selection = window.getSelection();
    let range: Range | null = null;
    let cursorPosition = 0;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      // 计算光标在文本中的位置
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(containerRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      cursorPosition = preCaretRange.toString().length;
    }
    
    // 清除占位符
    const placeholder = containerRef.current.querySelector('.text-gray-400');
    if (placeholder) {
      containerRef.current.innerHTML = '';
      range = document.createRange();
      range.selectNodeContents(containerRef.current);
      range.collapse(true);
      cursorPosition = 0;
    }
    
    // 创建增强的标签元素
    const chipStyle = getEnhancedChipStyle(blockNumber);
    const tagSpan = document.createElement('span');
    tagSpan.className = 'inline-block align-middle px-3 py-1.5 mx-1 text-white font-semibold text-sm shadow-lg select-none cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 ease-out';
    tagSpan.contentEditable = 'false';
    tagSpan.setAttribute('data-tag', blockNumber);
    tagSpan.setAttribute('style', chipStyle.style);
    tagSpan.innerHTML = `[${blockNumber}]`;
    
    // 优化的光标位置处理
    if (range) {
      try {
        // 删除选中的内容
        range.deleteContents();
        
        // 创建空格节点
        const spaceBefore = document.createTextNode(' ');
        const spaceAfter = document.createTextNode(' ');
        
        // 插入：空格 + 标签 + 空格
        range.insertNode(spaceAfter);
        range.insertNode(tagSpan);
        range.insertNode(spaceBefore);
        
        // 精确设置光标到标签后的空格之后
        range.setStartAfter(spaceAfter);
        range.setEndAfter(spaceAfter);
        
        // 应用新的光标位置
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        // 错误处理：降级到末尾插入
        console.warn('光标定位失败，使用降级方案:', error);
        containerRef.current.appendChild(document.createTextNode(' '));
        containerRef.current.appendChild(tagSpan);
        containerRef.current.appendChild(document.createTextNode(' '));
        
        // 设置光标到末尾
        const newRange = document.createRange();
        newRange.selectNodeContents(containerRef.current);
        newRange.collapse(false);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // 没有选区时添加到末尾
      containerRef.current.appendChild(document.createTextNode(' '));
      containerRef.current.appendChild(tagSpan);
      containerRef.current.appendChild(document.createTextNode(' '));
      
      // 设置光标到末尾
      const newRange = document.createRange();
      newRange.selectNodeContents(containerRef.current);
      newRange.collapse(false);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    // 确保焦点和更新
    containerRef.current.focus();
    updateValue();
  };

  // 更新value
  const updateValue = () => {
    if (!containerRef.current) return;
    
    let text = '';
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tag = element.getAttribute('data-tag');
        if (tag) {
          text += `[${tag}]`;
        } else if (element.classList.contains('text-gray-400')) {
          // 跳过占位符
        } else {
          // 递归处理子节点
          node.childNodes.forEach(walk);
        }
      }
    };
    
    containerRef.current.childNodes.forEach(walk);
    onChange(text);
  };

  // 处理输入
  const handleInput = () => {
    updateValue();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 处理退格键和删除键
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 处理 Backspace：删除光标前面的标签
        if (e.key === 'Backspace' && range.collapsed) {
          const node = range.startContainer;
          
          // 情况1：光标在文本节点的开头，检查前一个兄弟节点
          if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
            const prevSibling = node.previousSibling;
            if (prevSibling && (prevSibling as HTMLElement).getAttribute?.('data-tag')) {
              e.preventDefault();
              prevSibling.remove();
              updateValue();
              return;
            }
          }
          
          // 情况2：光标在容器元素中，检查前一个子节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            const prevChild = (node as HTMLElement).childNodes[range.startOffset - 1];
            if (prevChild && (prevChild as HTMLElement).getAttribute?.('data-tag')) {
              e.preventDefault();
              prevChild.remove();
              updateValue();
              return;
            }
          }
          
          // 情况3：光标在容器的开头，但容器的第一个子节点是标签
          if (node === containerRef.current && range.startOffset === 0) {
            const firstChild = containerRef.current?.firstChild;
            if (firstChild && (firstChild as HTMLElement).getAttribute?.('data-tag')) {
              // 不删除，让用户使用 Delete 键
              e.preventDefault();
              return;
            }
          }
        }
        
        // 处理 Delete：删除光标后面的标签
        if (e.key === 'Delete' && range.collapsed) {
          const node = range.startContainer;
          
          // 情况1：光标在文本节点的末尾，检查下一个兄弟节点
          if (node.nodeType === Node.TEXT_NODE && range.startOffset === node.textContent?.length) {
            const nextSibling = node.nextSibling;
            if (nextSibling && (nextSibling as HTMLElement).getAttribute?.('data-tag')) {
              e.preventDefault();
              nextSibling.remove();
              updateValue();
              return;
            }
          }
          
          // 情况2：光标在容器元素中，检查下一个子节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            const nextChild = (node as HTMLElement).childNodes[range.startOffset];
            if (nextChild && (nextChild as HTMLElement).getAttribute?.('data-tag')) {
              e.preventDefault();
              nextChild.remove();
              updateValue();
              return;
            }
          }
        }
        
        // 处理选中内容包含标签的情况
        if (!range.collapsed) {
          const fragment = range.cloneContents();
          const tags = fragment.querySelectorAll('[data-tag]');
          if (tags.length > 0) {
            // 让默认行为删除选中内容（包括标签）
            setTimeout(() => updateValue(), 0);
          }
        }
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // 处理焦点
  const handleFocus = () => {
    // 清除占位符
    if (containerRef.current) {
      const placeholder = containerRef.current.querySelector('.text-gray-400');
      if (placeholder) {
        containerRef.current.innerHTML = '';
      }
    }
  };

  const handleBlur = () => {
    // 如果为空，显示占位符
    if (containerRef.current && !containerRef.current.textContent?.trim()) {
      containerRef.current.innerHTML = `<span class="text-gray-400 dark:text-gray-500">${placeholder || ''}</span>`;
    }
  };

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    insertTag,
    focus: () => containerRef.current?.focus(),
    setSelectionRange: () => {}, // 兼容性方法
    selectionStart: 0 // 兼容性属性
  }));

  return (
    <div
      ref={containerRef}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      suppressContentEditableWarning
      style={{
        minHeight: '48px',
        maxHeight: '160px',
        overflowY: 'auto',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.6',
        // 优化多行文字排版
        display: 'block',
        alignItems: 'normal',
        justifyContent: 'normal',
        // 改进的文字流动和标签对齐
        textAlign: 'left',
        verticalAlign: 'baseline'
      }}
    />
  );
});

TaggedInput.displayName = 'TaggedInput';

export default TaggedInput;