import React, { useRef, useEffect, useState, useCallback } from 'react';
import EnhancedTagChip from './EnhancedTagChip';
import { TagData, BlockType, VisualConfig } from '../types/TagChipTypes';
import { visualStyleEngine } from '../services/VisualStyleEngine';
import { LayoutManager, TagDimensions, LayoutConfig } from '../services/LayoutManager';
import { HoverPreviewSystem, PreviewContent } from '../services/HoverPreviewSystem';
import { CursorManager } from '../services/CursorManager';
import { InteractionHandler } from '../services/InteractionHandler';
import { AccessibilityManager } from '../services/AccessibilityManager';
import { PerformanceOptimizer } from '../services/PerformanceOptimizer';

interface TaggedInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  lang?: 'zh' | 'en';
  onTagHover?: (tagData: { id: string; content?: string } | null) => void;
  upstreamData?: Array<{ blockNumber: string; content?: string; type?: string }>;
  visualConfig?: VisualConfig;
  enableEnhancedChips?: boolean;
  enableMultiLineLayout?: boolean;
  enableHoverPreview?: boolean;
  enableAccessibility?: boolean;
  layoutConfig?: Partial<LayoutConfig>;
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
  upstreamData = [],
  visualConfig,
  enableEnhancedChips = true,
  enableMultiLineLayout = false,
  enableHoverPreview = true,
  enableAccessibility = true,
  layoutConfig
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [tags, setTags] = useState<TagData[]>([]);
  const [layoutManager, setLayoutManager] = useState<LayoutManager | null>(null);
  const [hoverPreviewSystem, setHoverPreviewSystem] = useState<HoverPreviewSystem | null>(null);
  const [cursorManager, setCursorManager] = useState<CursorManager | null>(null);
  const [interactionHandler, setInteractionHandler] = useState<InteractionHandler | null>(null);
  const [accessibilityManager, setAccessibilityManager] = useState<AccessibilityManager | null>(null);
  const [performanceOptimizer, setPerformanceOptimizer] = useState<PerformanceOptimizer | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  // 添加输入法状态管理
  const [isComposing, setIsComposing] = useState(false);
  const [lastCursorPosition, setLastCursorPosition] = useState<number>(0);

  // Initialize all managers and systems
  useEffect(() => {
    if (!containerRef.current) return;

    const cleanupFunctions: (() => void)[] = [];

    // Initialize performance optimizer first
    const optimizer = new PerformanceOptimizer({
      debounceDelay: 16,
      maxCacheSize: 100,
      cleanupInterval: 30000,
      enableVirtualization: true,
      batchUpdateThreshold: 10
    });
    setPerformanceOptimizer(optimizer);
    cleanupFunctions.push(() => optimizer.destroy());

    // Initialize cursor manager
    if (enableEnhancedChips) {
      const cursor = new CursorManager();
      cursor.initialize(containerRef.current);
      setCursorManager(cursor);
      cleanupFunctions.push(() => cursor.destroy());
    }

    // Initialize hover preview system
    if (enableHoverPreview) {
      const hoverSystem = new HoverPreviewSystem({
        showDelay: 300,
        hideDelay: 100,
        offset: 8,
        maxWidth: 300,
        zIndex: 1000
      });
      setHoverPreviewSystem(hoverSystem);
      cleanupFunctions.push(() => hoverSystem.destroy());
    }

    // Initialize interaction handler
    if (enableEnhancedChips) {
      const interaction = new InteractionHandler({
        clickFeedbackDuration: 50,
        keyboardNavigationEnabled: enableAccessibility,
        focusIndicatorStyle: 'outline: 2px solid #3b82f6; outline-offset: 2px;',
        tabOrder: 'sequential'
      });
      setInteractionHandler(interaction);
      cleanupFunctions.push(() => interaction.destroy());
    }

    // Initialize accessibility manager
    if (enableAccessibility) {
      const accessibility = new AccessibilityManager({
        enableScreenReaderSupport: true,
        enableKeyboardOnlyOperation: true,
        announceChanges: true,
        useAriaLiveRegions: true,
        customAriaLabels: {}
      });
      setAccessibilityManager(accessibility);
      cleanupFunctions.push(() => accessibility.destroy());
    }

    // Initialize layout manager
    if (enableMultiLineLayout) {
      const rect = containerRef.current.getBoundingClientRect();
      const defaultConfig: LayoutConfig = {
        containerWidth: rect.width || 400,
        lineHeight: 32,
        tagSpacing: 8,
        lineSpacing: 8,
        padding: {
          top: 8,
          right: 12,
          bottom: 8,
          left: 12
        }
      };

      const config = { ...defaultConfig, ...layoutConfig };
      const manager = new LayoutManager(config);
      
      // Set up container resize callback
      manager.onContainerResize = (newWidth: number) => {
        setContainerWidth(newWidth);
        if (tags.length > 0) {
          requestAnimationFrame(() => {
            renderMultiLineContent();
          });
        }
      };
      
      manager.observeContainer(containerRef.current);
      setLayoutManager(manager);
      setContainerWidth(config.containerWidth);
      cleanupFunctions.push(() => manager.destroy());
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [enableEnhancedChips, enableMultiLineLayout, enableHoverPreview, enableAccessibility, layoutConfig]);

  // Parse tags from value
  useEffect(() => {
    const parsedTags = parseTagsFromValue(value);
    setTags(parsedTags);
  }, [value]);

  // Parse tags from text value
  const parseTagsFromValue = (text: string): TagData[] => {
    const regex = /\[([A-Z]\d{2})\]/g;
    const foundTags: TagData[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const blockNumber = match[1];
      const blockType = getBlockTypeFromNumber(blockNumber);
      const referencedBlock = upstreamData.find(data => data.blockNumber === blockNumber);
      
      foundTags.push({
        id: `tag-${blockNumber}`,
        label: blockNumber,
        blockType,
        content: referencedBlock?.content || ''
      });
    }

    return foundTags;
  };

  // Get block type from block number
  const getBlockTypeFromNumber = (blockNumber: string): BlockType => {
    const type = blockNumber.charAt(0);
    switch (type) {
      case 'A': return BlockType.A;
      case 'B': return BlockType.B;
      case 'V': return BlockType.V;
      default: return BlockType.A;
    }
  };

  // 初始化内容
  useEffect(() => {
    if (containerRef.current && value) {
      if (enableMultiLineLayout && layoutManager) {
        renderMultiLineContent();
      } else {
        renderContent(value);
      }
    }
  }, [value, layoutManager, enableMultiLineLayout]);

  // Render multi-line content with layout management and performance optimization
  const renderMultiLineContent = useCallback(() => {
    if (!containerRef.current || !layoutManager || !enableMultiLineLayout || !performanceOptimizer) return;

    const parsedTags = parseTagsFromValue(value);
    if (parsedTags.length === 0) {
      containerRef.current.innerHTML = `<span class="text-gray-400 dark:text-gray-500">${placeholder || ''}</span>`;
      return;
    }

    // Use performance optimizer for layout calculation
    const layoutCalculation = () => {
      // Calculate tag dimensions with optimization
      const tagDimensions: TagDimensions[] = parsedTags.map(tag => {
        return performanceOptimizer.cacheLayoutCalculation(
          `tag-dimensions-${tag.id}`,
          () => {
            // Create temporary element to measure dimensions
            const tempElement = document.createElement('span');
            tempElement.className = 'inline-block align-middle mx-1';
            tempElement.style.visibility = 'hidden';
            tempElement.style.position = 'absolute';
            tempElement.innerHTML = `[${tag.label}]`;
            
            // Apply visual styles for accurate measurement
            const styleResult = visualStyleEngine.calculateChipStyles(
              tag.blockType,
              visualConfig,
              { isHovered: false, isFocused: false, isSelected: false, isDisabled: false }
            );
            Object.assign(tempElement.style, styleResult.styles);
            
            document.body.appendChild(tempElement);
            const rect = tempElement.getBoundingClientRect();
            document.body.removeChild(tempElement);

            return {
              id: tag.id,
              width: rect.width + 8, // Add margin
              height: rect.height,
              minWidth: 60,
              maxWidth: 200
            };
          },
          [tag.label, tag.blockType, visualConfig]
        );
      });

      return layoutManager.calculateLayout(tagDimensions);
    };

    // Cache layout calculation
    const layout = performanceOptimizer.cacheLayoutCalculation(
      'multi-line-layout',
      layoutCalculation,
      [parsedTags.length, containerWidth, visualConfig]
    );
    
    // Batch DOM updates for better performance
    const domUpdates = [
      () => {
        // Clear container and set up positioned layout
        containerRef.current!.innerHTML = '';
        containerRef.current!.style.position = 'relative';
        containerRef.current!.style.height = `${layout.totalHeight}px`;
        containerRef.current!.style.minHeight = `${layout.totalHeight}px`;
      },
      ...parsedTags.map((tag, index) => () => {
        const position = layout.tagPositions.get(tag.id);
        if (!position) return;

        const chipContainer = document.createElement('span');
        chipContainer.className = 'absolute';
        chipContainer.style.left = `${position.x}px`;
        chipContainer.style.top = `${position.y}px`;
        chipContainer.style.width = `${position.width}px`;
        chipContainer.style.height = `${position.height}px`;
        chipContainer.setAttribute('data-testid', `tag-chip-${tag.id}`);
        chipContainer.setAttribute('data-tag-id', tag.id);
        chipContainer.setAttribute('data-element-id', tag.id);
        chipContainer.contentEditable = 'false';
        
        // Use VisualStyleEngine for styling
        const styleResult = visualStyleEngine.calculateChipStyles(
          tag.blockType,
          visualConfig,
          { isHovered: false, isFocused: false, isSelected: false, isDisabled: false }
        );
        
        // Apply styles
        Object.assign(chipContainer.style, styleResult.styles);
        chipContainer.className += ` ${styleResult.classes.join(' ')}`;
        
        // Set accessibility attributes
        Object.entries(styleResult.accessibility).forEach(([key, value]) => {
          chipContainer.setAttribute(key, String(value));
        });
        
        chipContainer.innerHTML = `[${tag.label}]`;
        
        // Initialize interaction handler
        if (interactionHandler) {
          interactionHandler.initializeElement(chipContainer, tag.id);
        }
        
        // Initialize accessibility manager
        if (accessibilityManager) {
          const referencedBlock = upstreamData.find(data => data.blockNumber === tag.label);
          accessibilityManager.initializeElement(chipContainer, tag.id, {
            label: `Block ${tag.label}`,
            description: referencedBlock?.content || 'No content available',
            role: 'button'
          });
        }
        
        // Add optimized event listeners
        const optimizedHoverHandler = performanceOptimizer.createOptimizedHandler(
          `hover-${tag.id}`,
          () => handleTagHover(tag),
          { debounce: true, delay: 100 }
        );
        
        const optimizedHoverEndHandler = performanceOptimizer.createOptimizedHandler(
          `hover-end-${tag.id}`,
          handleTagHoverEnd,
          { debounce: true, delay: 50 }
        );
        
        chipContainer.addEventListener('mouseenter', optimizedHoverHandler);
        chipContainer.addEventListener('mouseleave', optimizedHoverEndHandler);
        chipContainer.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        containerRef.current!.appendChild(chipContainer);
      })
    ];

    performanceOptimizer.batchDOMUpdates(domUpdates);

    // Add text input areas between and around tags
    requestAnimationFrame(() => {
      addTextInputAreas(layout, parsedTags);
    });
  }, [value, layoutManager, visualConfig, placeholder, enableMultiLineLayout, performanceOptimizer, interactionHandler, accessibilityManager, upstreamData, containerWidth]);

  // Add text input areas for multi-line layout
  const addTextInputAreas = (layout: any, tags: TagData[]) => {
    if (!containerRef.current) return;

    // For now, add a simple text input area at the end
    // This is a simplified implementation - full implementation would add
    // text areas between tags and handle text positioning
    const textArea = document.createElement('div');
    textArea.contentEditable = 'true';
    textArea.style.position = 'absolute';
    textArea.style.left = '12px';
    textArea.style.top = `${layout.totalHeight}px`;
    textArea.style.width = 'calc(100% - 24px)';
    textArea.style.minHeight = '24px';
    textArea.style.outline = 'none';
    textArea.style.border = 'none';
    textArea.style.background = 'transparent';
    
    textArea.addEventListener('input', handleInput);
    textArea.addEventListener('keydown', handleKeyDown);
    
    containerRef.current.appendChild(textArea);
  };

  // 初始化内容 - Legacy method
  const initializeContent = () => {
    if (containerRef.current && value) {
      renderContent(value);
    }
  };

  // 渲染内容：将 [A01] 转换为标签芯片
  const renderContent = (text: string) => {
    if (!containerRef.current) return;
    
    if (enableMultiLineLayout && layoutManager) {
      renderMultiLineContent();
      return;
    }
    
    if (enableEnhancedChips) {
      renderEnhancedContent(text);
    } else {
      renderLegacyContent(text);
    }
  };

  // Render content with enhanced tag chips
  const renderEnhancedContent = (text: string) => {
    if (!containerRef.current) return;
    
    const regex = /\[([A-Z]\d{2})\]/g;
    const parts: (string | TagData)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before tag
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Add tag data
      const blockNumber = match[1];
      const blockType = getBlockTypeFromNumber(blockNumber);
      const referencedBlock = upstreamData.find(data => data.blockNumber === blockNumber);
      
      parts.push({
        id: `tag-${blockNumber}`,
        label: blockNumber,
        blockType,
        content: referencedBlock?.content || ''
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    // Clear container and render parts
    containerRef.current.innerHTML = '';
    
    if (parts.length === 0) {
      containerRef.current.innerHTML = `<span class="text-gray-400 dark:text-gray-500">${placeholder || ''}</span>`;
      return;
    }

    parts.forEach((part, index) => {
      if (typeof part === 'string') {
        if (part.trim()) {
          const textNode = document.createTextNode(part);
          containerRef.current!.appendChild(textNode);
        }
      } else {
        // Create enhanced tag chip element with full integration
        const chipContainer = document.createElement('span');
        chipContainer.className = 'inline-block align-middle mx-1';
        chipContainer.setAttribute('data-testid', `tag-chip-${part.id}`);
        chipContainer.setAttribute('data-tag-id', part.id);
        chipContainer.setAttribute('data-element-id', part.id); // For accessibility manager
        chipContainer.contentEditable = 'false';
        
        // Use VisualStyleEngine for styling
        const styleResult = visualStyleEngine.calculateChipStyles(
          part.blockType,
          visualConfig,
          { isHovered: false, isFocused: false, isSelected: false, isDisabled: false }
        );
        
        // Apply styles
        Object.assign(chipContainer.style, styleResult.styles);
        chipContainer.className += ` ${styleResult.classes.join(' ')}`;
        
        // Set accessibility attributes
        Object.entries(styleResult.accessibility).forEach(([key, value]) => {
          chipContainer.setAttribute(key, String(value));
        });
        
        chipContainer.innerHTML = `[${part.label}]`;
        
        // Initialize interaction handler
        if (interactionHandler) {
          interactionHandler.initializeElement(chipContainer, part.id);
        }
        
        // Initialize accessibility manager
        if (accessibilityManager) {
          const referencedBlock = upstreamData.find(data => data.blockNumber === part.label);
          accessibilityManager.initializeElement(chipContainer, part.id, {
            label: `Block ${part.label}`,
            description: referencedBlock?.content || 'No content available',
            role: 'button'
          });
        }
        
        // Add optimized event listeners
        const optimizedHoverHandler = performanceOptimizer?.createOptimizedHandler(
          `hover-${part.id}`,
          () => handleTagHover(part),
          { debounce: true, delay: 100 }
        ) || (() => handleTagHover(part));
        
        const optimizedHoverEndHandler = performanceOptimizer?.createOptimizedHandler(
          `hover-end-${part.id}`,
          handleTagHoverEnd,
          { debounce: true, delay: 50 }
        ) || handleTagHoverEnd;
        
        chipContainer.addEventListener('mouseenter', optimizedHoverHandler);
        chipContainer.addEventListener('mouseleave', optimizedHoverEndHandler);
        chipContainer.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        // Listen for interaction events
        chipContainer.addEventListener('tagChipClick', (e: any) => {
          console.log('Tag chip clicked:', e.detail);
        });
        
        chipContainer.addEventListener('tagChipActivate', (e: any) => {
          console.log('Tag chip activated:', e.detail);
        });
        
        containerRef.current!.appendChild(chipContainer);
      }
    });
  };

  // Legacy rendering method (fallback)
  const renderLegacyContent = (text: string) => {
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

  // Enhanced tag hover handler with preview system
  const handleTagHover = (tagData: TagData) => {
    const referencedBlock = upstreamData.find(data => data.blockNumber === tagData.label);
    const content = referencedBlock?.content || '';
    const hasContent = content && content.trim();
    
    setHoveredTag(tagData.id);
    
    // Use hover preview system if enabled
    if (enableHoverPreview && hoverPreviewSystem) {
      const targetElement = document.querySelector(`[data-tag-id="${tagData.id}"]`) as HTMLElement;
      if (targetElement) {
        const previewContent: PreviewContent = {
          title: `Block ${tagData.label}`,
          description: hasContent 
            ? (content.length > 200 ? `${content.substring(0, 200)}...` : content)
            : (lang === 'zh' ? '暂无内容，建议先生成内容' : 'No content yet, consider generating content first'),
          metadata: {
            'Type': tagData.blockType,
            'Block ID': tagData.label
          }
        };
        
        hoverPreviewSystem.show(targetElement, previewContent);
      }
    }
    
    // Legacy hover callback
    onTagHover?.({ 
      id: tagData.label, 
      content: hasContent 
        ? (content.length > 100 ? `${content.substring(0, 100)}...` : content)
        : (lang === 'zh' ? '暂无内容，建议先生成内容' : 'No content yet, consider generating content first')
    });
  };

  const handleTagHoverEnd = () => {
    setHoveredTag(null);
    
    // Hide preview system
    if (enableHoverPreview && hoverPreviewSystem) {
      hoverPreviewSystem.hide();
    }
    
    onTagHover?.(null);
  };

  // 处理标签悬停事件 - Legacy version
  const handleLegacyTagHover = (e: Event) => {
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

  // 设置事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container && !enableEnhancedChips) {
      // Only add legacy event listeners when not using enhanced chips
      container.addEventListener('tagHover', handleLegacyTagHover);
      container.addEventListener('tagHoverEnd', handleTagHoverEnd);
      
      return () => {
        container.removeEventListener('tagHover', handleLegacyTagHover);
        container.removeEventListener('tagHoverEnd', handleTagHoverEnd);
      };
    }
  }, [onTagHover, enableEnhancedChips]);

  // 插入标签 - 简化版本，修复光标问题
  const insertTag = (blockNumber: string) => {
    if (!containerRef.current || isComposing) return;
    
    // 获取当前光标位置
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 如果没有选区，在末尾插入
      const currentText = containerRef.current.textContent || '';
      const newText = currentText + `[${blockNumber}] `;
      containerRef.current.textContent = newText;
      onChange(newText);
      
      // 设置光标到末尾
      const range = document.createRange();
      range.selectNodeContents(containerRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // 清除占位符
    const placeholder = containerRef.current.querySelector('.text-gray-400');
    if (placeholder) {
      containerRef.current.innerHTML = '';
      const newRange = document.createRange();
      newRange.selectNodeContents(containerRef.current);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // 获取当前文本内容
    const currentText = containerRef.current.textContent || '';
    
    // 计算光标在纯文本中的位置
    let textPosition = 0;
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node === range.startContainer) {
        textPosition += range.startOffset;
        break;
      } else {
        textPosition += node.textContent?.length || 0;
      }
    }
    
    // 插入标签文本
    const tagText = `[${blockNumber}]`;
    const beforeText = currentText.substring(0, textPosition);
    const afterText = currentText.substring(textPosition);
    const newText = beforeText + tagText + ' ' + afterText;
    
    // 更新内容
    containerRef.current.textContent = newText;
    onChange(newText);
    
    // 设置光标位置到标签后面
    const newCursorPosition = textPosition + tagText.length + 1;
    
    // 重新创建选区
    const newRange = document.createRange();
    const textNode = containerRef.current.firstChild;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const maxOffset = Math.min(newCursorPosition, textNode.textContent?.length || 0);
      newRange.setStart(textNode, maxOffset);
      newRange.setEnd(textNode, maxOffset);
      
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // 确保焦点在输入框上
    containerRef.current.focus();
  };

  // Insert enhanced tag
  const insertEnhancedTag = (blockNumber: string) => {
    if (!containerRef.current) return;
    
    // 保存当前光标位置和选区
    const selection = window.getSelection();
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }
    
    // 清除占位符
    const placeholder = containerRef.current.querySelector('.text-gray-400');
    if (placeholder) {
      containerRef.current.innerHTML = '';
      range = document.createRange();
      range.selectNodeContents(containerRef.current);
      range.collapse(true);
    }
    
    // Create enhanced tag data
    const blockType = getBlockTypeFromNumber(blockNumber);
    const referencedBlock = upstreamData.find(data => data.blockNumber === blockNumber);
    
    const tagData: TagData = {
      id: `tag-${blockNumber}`,
      label: blockNumber,
      blockType,
      content: referencedBlock?.content || ''
    };
    
    // Create enhanced tag chip element
    const chipContainer = document.createElement('span');
    chipContainer.className = 'inline-block align-middle mx-1';
    chipContainer.setAttribute('data-testid', `tag-chip-${tagData.id}`);
    chipContainer.setAttribute('data-tag-id', tagData.id);
    chipContainer.setAttribute('data-element-id', tagData.id); // For accessibility manager
    chipContainer.contentEditable = 'false';
    
    // Use VisualStyleEngine for styling
    const styleResult = visualStyleEngine.calculateChipStyles(
      tagData.blockType,
      visualConfig,
      { isHovered: false, isFocused: false, isSelected: false, isDisabled: false }
    );
    
    // Apply styles
    Object.assign(chipContainer.style, styleResult.styles);
    chipContainer.className += ` ${styleResult.classes.join(' ')}`;
    
    // Set accessibility attributes
    Object.entries(styleResult.accessibility).forEach(([key, value]) => {
      chipContainer.setAttribute(key, String(value));
    });
    
    chipContainer.innerHTML = `[${tagData.label}]`;
    
    // Initialize interaction handler
    if (interactionHandler) {
      interactionHandler.initializeElement(chipContainer, tagData.id);
    }
    
    // Initialize accessibility manager
    if (accessibilityManager) {
      const referencedBlock = upstreamData.find(data => data.blockNumber === tagData.label);
      accessibilityManager.initializeElement(chipContainer, tagData.id, {
        label: `Block ${tagData.label}`,
        description: referencedBlock?.content || 'No content available',
        role: 'button'
      });
    }
    
    // Add optimized event listeners
    const optimizedHoverHandler = performanceOptimizer?.createOptimizedHandler(
      `hover-${tagData.id}`,
      () => handleTagHover(tagData),
      { debounce: true, delay: 100 }
    ) || (() => handleTagHover(tagData));
    
    const optimizedHoverEndHandler = performanceOptimizer?.createOptimizedHandler(
      `hover-end-${tagData.id}`,
      handleTagHoverEnd,
      { debounce: true, delay: 50 }
    ) || handleTagHoverEnd;
    
    chipContainer.addEventListener('mouseenter', optimizedHoverHandler);
    chipContainer.addEventListener('mouseleave', optimizedHoverEndHandler);
    chipContainer.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Listen for interaction events
    chipContainer.addEventListener('tagChipClick', (e: any) => {
      console.log('Tag chip clicked:', e.detail);
    });
    
    chipContainer.addEventListener('tagChipActivate', (e: any) => {
      console.log('Tag chip activated:', e.detail);
    });
    
    // Insert the chip with cursor management
    if (range && cursorManager) {
      try {
        // Use cursor manager for precise positioning
        cursorManager.insertAtCursor(' ');
        range.insertNode(chipContainer);
        cursorManager.insertAtCursor(' ');
        
        // Set cursor after the inserted chip
        const newRange = document.createRange();
        newRange.setStartAfter(chipContainer);
        newRange.setEndAfter(chipContainer);
        
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch (error) {
        console.warn('Enhanced cursor positioning failed, using fallback:', error);
        // Fallback to original method
        range.deleteContents();
        
        const spaceBefore = document.createTextNode(' ');
        const spaceAfter = document.createTextNode(' ');
        
        range.insertNode(spaceAfter);
        range.insertNode(chipContainer);
        range.insertNode(spaceBefore);
        
        range.setStartAfter(spaceAfter);
        range.setEndAfter(spaceAfter);
        
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      containerRef.current.appendChild(document.createTextNode(' '));
      containerRef.current.appendChild(chipContainer);
      containerRef.current.appendChild(document.createTextNode(' '));
    }
    
    containerRef.current.focus();
    updateValue();
  };

  // Legacy tag insertion
  const insertLegacyTag = (blockNumber: string) => {
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
        const tag = element.getAttribute('data-tag') || element.getAttribute('data-tag-id');
        if (tag) {
          // Handle both legacy and enhanced tag formats
          const tagLabel = tag.startsWith('tag-') ? tag.substring(4) : tag;
          text += `[${tagLabel}]`;
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

  // Cleanup function for tag chip elements
  const cleanupTagChip = (element: HTMLElement) => {
    const elementId = element.getAttribute('data-element-id') || element.getAttribute('data-tag-id');
    if (!elementId) return;

    // Cleanup interaction handler
    if (interactionHandler) {
      interactionHandler.cleanupElement(element, elementId);
    }

    // Cleanup accessibility manager
    if (accessibilityManager) {
      accessibilityManager.cleanupElement(elementId);
    }

    // Hide any active previews
    if (hoverPreviewSystem && hoverPreviewSystem.getCurrentTarget() === element) {
      hoverPreviewSystem.hideImmediate();
    }
  };

  // 处理输入 - Optimized version
  const handleInput = useCallback(() => {
    // 如果正在输入法组合中，不处理更新
    if (isComposing) {
      return;
    }
    
    if (performanceOptimizer) {
      const optimizedUpdate = performanceOptimizer.debounce('input-update', updateValue, 16);
      optimizedUpdate();
    } else {
      updateValue();
    }
  }, [performanceOptimizer, isComposing]);

  // 处理输入法开始
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    // 保存当前光标位置
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setLastCursorPosition(range.startOffset);
    }
  }, []);

  // 处理输入法结束
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
    // 延迟更新，确保输入法完全结束
    setTimeout(() => {
      if (performanceOptimizer) {
        const optimizedUpdate = performanceOptimizer.debounce('composition-update', updateValue, 16);
        optimizedUpdate();
      } else {
        updateValue();
      }
    }, 0);
  }, [performanceOptimizer]);

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
            if (prevSibling && ((prevSibling as HTMLElement).getAttribute?.('data-tag') || (prevSibling as HTMLElement).getAttribute?.('data-tag-id'))) {
              e.preventDefault();
              cleanupTagChip(prevSibling as HTMLElement);
              prevSibling.remove();
              updateValue();
              return;
            }
          }
          
          // 情况2：光标在容器元素中，检查前一个子节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            const prevChild = (node as HTMLElement).childNodes[range.startOffset - 1];
            if (prevChild && ((prevChild as HTMLElement).getAttribute?.('data-tag') || (prevChild as HTMLElement).getAttribute?.('data-tag-id'))) {
              e.preventDefault();
              cleanupTagChip(prevChild as HTMLElement);
              prevChild.remove();
              updateValue();
              return;
            }
          }
          
          // 情况3：光标在容器的开头，但容器的第一个子节点是标签
          if (node === containerRef.current && range.startOffset === 0) {
            const firstChild = containerRef.current?.firstChild;
            if (firstChild && ((firstChild as HTMLElement).getAttribute?.('data-tag') || (firstChild as HTMLElement).getAttribute?.('data-tag-id'))) {
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
            if (nextSibling && ((nextSibling as HTMLElement).getAttribute?.('data-tag') || (nextSibling as HTMLElement).getAttribute?.('data-tag-id'))) {
              e.preventDefault();
              cleanupTagChip(nextSibling as HTMLElement);
              nextSibling.remove();
              updateValue();
              return;
            }
          }
          
          // 情况2：光标在容器元素中，检查下一个子节点
          if (node.nodeType === Node.ELEMENT_NODE) {
            const nextChild = (node as HTMLElement).childNodes[range.startOffset];
            if (nextChild && ((nextChild as HTMLElement).getAttribute?.('data-tag') || (nextChild as HTMLElement).getAttribute?.('data-tag-id'))) {
              e.preventDefault();
              cleanupTagChip(nextChild as HTMLElement);
              nextChild.remove();
              updateValue();
              return;
            }
          }
        }
        
        // 处理选中内容包含标签的情况
        if (!range.collapsed) {
          const fragment = range.cloneContents();
          const tags = fragment.querySelectorAll('[data-tag], [data-tag-id]');
          if (tags.length > 0) {
            // Cleanup tags before deletion
            const actualTags = containerRef.current?.querySelectorAll('[data-tag], [data-tag-id]');
            actualTags?.forEach(tag => {
              if (range.intersectsNode(tag)) {
                cleanupTagChip(tag as HTMLElement);
              }
            });
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
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      suppressContentEditableWarning
      style={{
        minHeight: enableMultiLineLayout ? 'auto' : '48px',
        maxHeight: enableMultiLineLayout ? 'none' : '160px',
        overflowY: enableMultiLineLayout ? 'visible' : 'auto',
        outline: 'none',
        whiteSpace: enableMultiLineLayout ? 'normal' : 'pre-wrap',
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