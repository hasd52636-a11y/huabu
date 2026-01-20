import React, { useState, useEffect } from 'react';
import { Language, Theme } from '../types';

interface KnowledgeSection {
  id: string;
  title: string;
  titleEn: string;
  content: string;
}

interface HelpAssistantProps {
  lang: Language;
  theme: Theme;
}

export const useHelpAssistant = () => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeSection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      try {
        const response = await fetch('/helpContent.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // 将helpContent.json的格式转换为KnowledgeSection格式
        const sections: KnowledgeSection[] = [];
        
        // 从中文和英文内容中提取sections
        if (data.zh && data.zh.sections && Array.isArray(data.zh.sections)) {
          data.zh.sections.forEach((section: any) => {
            if (section.title && section.content) {
              sections.push({
                id: section.title,
                title: section.title,
                titleEn: section.titleEn || section.title,
                content: section.content
              });
            }
          });
        }
        
        console.log(`✓ Knowledge base loaded: ${sections.length} sections`);
        setKnowledgeBase(sections);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load knowledge base:', error);
        // 即使加载失败，也标记为已加载，避免无限等待
        setIsLoaded(true);
      }
    };
    loadKnowledgeBase();
  }, []);

  const searchKnowledge = (query: string): KnowledgeSection | null => {
    const lowerQuery = query.toLowerCase();
    
    for (const section of knowledgeBase) {
      if (section.title.toLowerCase().includes(lowerQuery) || 
          section.titleEn.toLowerCase().includes(lowerQuery)) {
        return section;
      }
    }
    
    for (const section of knowledgeBase) {
      if (section.content.toLowerCase().includes(lowerQuery)) {
        return section;
      }
    }
    
    return null;
  };

  const getKnowledgeBaseContext = (): string => {
    if (!knowledgeBase || knowledgeBase.length === 0) {
      console.warn('⚠️ Knowledge base is empty!');
      return '';
    }
    
    const context = knowledgeBase
      .map(section => `## ${section.title} (${section.titleEn})\n\n${section.content}`)
      .join('\n\n---\n\n');
    
    console.log(`✓ Knowledge base context generated: ${context.length} characters`);
    return context;
  };

  const detectHelpCommand = (text: string): { isCommand: boolean; query: string } => {
    const commandPattern = /^@wboke\s+(.+)$/i;
    const match = text.match(commandPattern);
    
    if (match) {
      return { isCommand: true, query: match[1] };
    }
    
    return { isCommand: false, query: '' };
  };

  const buildAIPrompt = (userQuery: string, lang: Language): string => {
    const knowledgeContext = getKnowledgeBaseContext();
    
    // 如果知识库为空，返回警告信息
    if (!knowledgeContext.trim()) {
      console.warn('⚠️ Knowledge base is empty!');
      const fallback = lang === 'zh' 
        ? '知识库未加载，请稍后重试。'
        : 'Knowledge base not loaded, please try again later.';
      return fallback;
    }
    
    if (lang === 'zh') {
      return `你是一个分镜大师应用的智能助手。用户提出了以下问题：

"${userQuery}"

以下是应用的完整知识库文档，请根据这些文档来回答用户的问题：

${knowledgeContext}

请用中文回答，确保答案准确、有帮助且易于理解。`;
    } else {
      return `You are an intelligent assistant for the Storyboard Master application. The user has asked the following question:

"${userQuery}"

Below is the complete knowledge base documentation for the application. Please answer the user's question based on this documentation:

${knowledgeContext}

Please answer in English, ensuring the answer is accurate, helpful, and easy to understand.`;
    }
  };

  return { 
    searchKnowledge, 
    knowledgeBase, 
    isLoaded,
    detectHelpCommand,
    buildAIPrompt,
    getKnowledgeBaseContext
  };
};

const HelpAssistant: React.FC<HelpAssistantProps> = ({ lang, theme }) => {
  return null;
};

export default HelpAssistant;
