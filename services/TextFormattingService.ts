/**
 * TextFormattingService - 增强的文本格式化服务
 * 从AUTOCANVAS智慧画布项目移植，提供更丰富的文本格式化功能
 */

import React from 'react';

export interface FormattingOptions {
  enableMarkdown?: boolean;
  enableCodeHighlight?: boolean;
  enableLinkDetection?: boolean;
  maxLineLength?: number;
  preserveWhitespace?: boolean;
}

export class TextFormattingService {
  private static instance: TextFormattingService;

  public static getInstance(): TextFormattingService {
    if (!TextFormattingService.instance) {
      TextFormattingService.instance = new TextFormattingService();
    }
    return TextFormattingService.instance;
  }

  /**
   * 格式化文本为JSX元素数组
   */
  formatText(text: string, options: FormattingOptions = {}): JSX.Element[] {
    const {
      enableMarkdown = true,
      enableCodeHighlight = true,
      enableLinkDetection = true,
      maxLineLength = 0,
      preserveWhitespace = false
    } = options;

    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // 处理长行截断
      if (maxLineLength > 0 && line.length > maxLineLength) {
        line = line.substring(0, maxLineLength) + '...';
      }

      const trimmedLine = line.trim();
      
      // 处理Markdown格式
      if (enableMarkdown) {
        // 处理标题 (# ## ###)
        const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = Math.min(headerMatch[1].length, 6);
          const headerText = headerMatch[2];
          const HeaderTag = `h${level + 2}` as keyof JSX.IntrinsicElements; // h3-h8
          return React.createElement(HeaderTag, {
            key: lineIndex,
            className: `font-bold mb-2 mt-4 ${this.getHeaderClass(level)}`
          }, headerText);
        }
        
        // 处理无序列表 (- 或 *)
        const bulletMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          return React.createElement('div', {
            key: lineIndex,
            className: 'flex items-start gap-2 my-1'
          }, [
            React.createElement('span', {
              key: 'bullet',
              className: 'text-amber-500 font-bold mt-1'
            }, '•'),
            React.createElement('span', {
              key: 'content',
              className: 'flex-1'
            }, this.formatInlineText(bulletMatch[1], lineIndex, options))
          ]);
        }
        
        // 处理有序列表 (1. 2. etc.)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return React.createElement('div', {
            key: lineIndex,
            className: 'flex items-start gap-2 my-1'
          }, [
            React.createElement('span', {
              key: 'number',
              className: 'text-amber-500 font-bold mt-1 min-w-[20px]'
            }, `${numberedMatch[1]}.`),
            React.createElement('span', {
              key: 'content',
              className: 'flex-1'
            }, this.formatInlineText(numberedMatch[2], lineIndex, options))
          ]);
        }
        
        // 处理代码块 (```code```)
        if (enableCodeHighlight && trimmedLine.startsWith('```') && trimmedLine.endsWith('```') && trimmedLine.length > 6) {
          const codeContent = trimmedLine.slice(3, -3);
          return React.createElement('pre', {
            key: lineIndex,
            className: 'bg-gray-100 dark:bg-gray-800 rounded-3xl p-3 my-2 overflow-x-auto'
          }, React.createElement('code', {
            className: 'text-xs font-mono'
          }, codeContent));
        }
        
        // 处理引用 (> text)
        const quoteMatch = trimmedLine.match(/^>\s+(.+)$/);
        if (quoteMatch) {
          return React.createElement('div', {
            key: lineIndex,
            className: 'border-l-4 border-amber-500 pl-4 py-2 my-2 bg-amber-50 dark:bg-amber-900/20 italic rounded-r-3xl'
          }, this.formatInlineText(quoteMatch[1], lineIndex, options));
        }

        // 处理分隔线 (--- 或 ***)
        if (trimmedLine.match(/^(---|\*\*\*)$/)) {
          return React.createElement('hr', {
            key: lineIndex,
            className: 'my-4 border-gray-300 dark:border-gray-600'
          });
        }
      }
      
      // 处理普通行
      return React.createElement('div', {
        key: lineIndex,
        className: `leading-relaxed ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`
      }, this.formatInlineText(line, lineIndex, options));
    });
  }

  /**
   * 格式化行内文本
   */
  private formatInlineText(text: string, lineIndex: number, options: FormattingOptions): (string | JSX.Element)[] {
    if (!text.trim()) return ['\u00A0'];
    
    const {
      enableMarkdown = true,
      enableCodeHighlight = true,
      enableLinkDetection = true
    } = options;

    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    
    // 处理粗体 (**bold**)
    if (enableMarkdown) {
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      
      while ((match = boldRegex.exec(text)) !== null) {
        // 添加匹配前的文本
        if (match.index > currentIndex) {
          parts.push(text.slice(currentIndex, match.index));
        }
        // 添加粗体文本
        parts.push(React.createElement('strong', {
          key: `bold-${lineIndex}-${match.index}`,
          className: 'font-bold'
        }, match[1]));
        currentIndex = match.index + match[0].length;
      }
      
      // 添加剩余文本
      if (currentIndex < text.length) {
        parts.push(text.slice(currentIndex));
      }
    } else {
      parts.push(text);
    }
    
    // 处理斜体和代码的第二轮处理
    const processedParts: (string | JSX.Element)[] = [];
    parts.forEach((part, partIndex) => {
      if (typeof part === 'string') {
        let processedPart = part;
        const subParts: (string | JSX.Element)[] = [];
        let subIndex = 0;

        // 处理斜体 (*italic*)
        if (enableMarkdown) {
          const italicRegex = /\*([^*]+)\*/g;
          let italicMatch;
          
          while ((italicMatch = italicRegex.exec(processedPart)) !== null) {
            if (italicMatch.index > subIndex) {
              subParts.push(processedPart.slice(subIndex, italicMatch.index));
            }
            subParts.push(React.createElement('em', {
              key: `italic-${lineIndex}-${partIndex}-${italicMatch.index}`,
              className: 'italic'
            }, italicMatch[1]));
            subIndex = italicMatch.index + italicMatch[0].length;
          }
          
          if (subIndex < processedPart.length) {
            subParts.push(processedPart.slice(subIndex));
          }
          
          if (subParts.length > 0) {
            processedPart = subParts.join('');
            processedParts.push(...subParts);
          } else {
            processedParts.push(processedPart);
          }
        } else {
          // 处理行内代码 (`code`)
          if (enableCodeHighlight) {
            const codeParts: (string | JSX.Element)[] = [];
            let codeIndex = 0;
            const codeRegex = /`([^`]+)`/g;
            let codeMatch;
            
            while ((codeMatch = codeRegex.exec(processedPart)) !== null) {
              if (codeMatch.index > codeIndex) {
                codeParts.push(processedPart.slice(codeIndex, codeMatch.index));
              }
              codeParts.push(React.createElement('code', {
                key: `code-${lineIndex}-${partIndex}-${codeMatch.index}`,
                className: 'px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-mono'
              }, codeMatch[1]));
              codeIndex = codeMatch.index + codeMatch[0].length;
            }
            
            if (codeIndex < processedPart.length) {
              codeParts.push(processedPart.slice(codeIndex));
            }
            
            processedParts.push(...(codeParts.length > 0 ? codeParts : [processedPart]));
          } else {
            processedParts.push(processedPart);
          }
        }

        // 处理链接检测
        if (enableLinkDetection && typeof processedPart === 'string') {
          const linkRegex = /(https?:\/\/[^\s]+)/g;
          const linkParts: (string | JSX.Element)[] = [];
          let linkIndex = 0;
          let linkMatch;
          
          while ((linkMatch = linkRegex.exec(processedPart)) !== null) {
            if (linkMatch.index > linkIndex) {
              linkParts.push(processedPart.slice(linkIndex, linkMatch.index));
            }
            linkParts.push(React.createElement('a', {
              key: `link-${lineIndex}-${partIndex}-${linkMatch.index}`,
              href: linkMatch[1],
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'text-blue-500 hover:text-blue-700 underline'
            }, linkMatch[1]));
            linkIndex = linkMatch.index + linkMatch[0].length;
          }
          
          if (linkIndex < processedPart.length) {
            linkParts.push(processedPart.slice(linkIndex));
          }
          
          if (linkParts.length > 1) {
            processedParts.splice(processedParts.indexOf(processedPart), 1, ...linkParts);
          }
        }
      } else {
        processedParts.push(part);
      }
    });
    
    return processedParts.length > 0 ? processedParts : ['\u00A0'];
  }

  /**
   * 获取标题样式类
   */
  private getHeaderClass(level: number): string {
    const classes = {
      1: 'text-2xl',
      2: 'text-xl', 
      3: 'text-lg',
      4: 'text-base',
      5: 'text-sm',
      6: 'text-xs'
    };
    return classes[level as keyof typeof classes] || 'text-sm';
  }

  /**
   * 提取纯文本内容（去除格式）
   */
  extractPlainText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
      .replace(/\*(.*?)\*/g, '$1')     // 移除斜体
      .replace(/`(.*?)`/g, '$1')       // 移除行内代码
      .replace(/^#{1,6}\s+/gm, '')     // 移除标题标记
      .replace(/^[-*]\s+/gm, '')       // 移除列表标记
      .replace(/^\d+\.\s+/gm, '')      // 移除有序列表标记
      .replace(/^>\s+/gm, '')          // 移除引用标记
      .replace(/```.*?```/gs, '')      // 移除代码块
      .replace(/---|\*\*\*/g, '')      // 移除分隔线
      .trim();
  }

  /**
   * 统计文本信息
   */
  getTextStats(text: string): {
    characters: number;
    charactersNoSpaces: number;
    words: number;
    lines: number;
    paragraphs: number;
  } {
    const plainText = this.extractPlainText(text);
    const lines = text.split('\n');
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const words = plainText.split(/\s+/).filter(w => w.length > 0);

    return {
      characters: plainText.length,
      charactersNoSpaces: plainText.replace(/\s/g, '').length,
      words: words.length,
      lines: lines.length,
      paragraphs: paragraphs.length
    };
  }
}

// 导出单例实例
export const textFormattingService = TextFormattingService.getInstance();