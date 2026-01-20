import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Send, Upload, X } from 'lucide-react';
import { getAssistantGuideContent, createAssistantSystemPrompt } from '../config/assistant-guide';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'image' | 'video';
  content: string;
  timestamp: string;
  isGenerating?: boolean;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectToCanvas?: (content: string, type: 'text' | 'image' | 'video') => void;
  aiServiceAdapter: any;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  isOpen,
  onClose,
  onProjectToCanvas,
  aiServiceAdapter,
  theme,
  lang
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantMode, setIsAssistantMode] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const t = {
    aiAssistant: lang === 'zh' ? 'AI 助手' : 'AI Assistant',
    loadGuide: lang === 'zh' ? '加载操作指南' : 'Load Operation Guide',
    sendMessage: lang === 'zh' ? '发送消息' : 'Send Message',
    projectToCanvas: lang === 'zh' ? '投射到画布' : 'Project to Canvas',
    placeholder: lang === 'zh' ? '输入您的问题...' : 'Enter your question...',
    loading: lang === 'zh' ? '正在生成...' : 'Generating...'
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ 
        top: chatScrollRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }, 100);
  };

  // 加载操作指南
  const handleLoadOperationGuide = async () => {
    try {
      const guideLoadingMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        type: 'text',
        content: lang === 'zh' ? '正在加载Canvas智能创作平台操作指南...' : 'Loading Canvas operation guide...',
        timestamp: new Date().toLocaleTimeString(),
        isGenerating: true
      };
      
      setMessages(prev => [...prev, guideLoadingMessage]);
      scrollToBottom();
      
      // 获取指南内容
      const guideContent = getAssistantGuideContent();
      
      // 更新消息
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === guideLoadingMessage.id 
            ? { 
                ...msg, 
                content: lang === 'zh' 
                  ? '你好，我是您的智能助手，我的名字叫曹冲，我是一个轻量级多媒体工作站，可以基于我聪明的家族遗传大脑为您实现文本，文字，图片，视频创作，也可以以工作流的形式搭建多媒体融合的创作，更可以将您创建的工作流实现自动批量化生产。为了帮助更多的残疾人士，我还加装了语音，手势识别的三头六臂，我内置了72种能力可以模块化调用，更为重要的是我是个爱学习的人，如果您持续使用我一个月后您将看到我令你惊艳的贴心懂你。' 
                  : 'Hello! I\'m your intelligent assistant named Cao Chong, a lightweight multimedia workstation. I can create text, images, and videos using my smart "family heritage brain". I can also build multimedia fusion creations through workflows and achieve automatic batch production. To help more people with disabilities, I\'ve added voice and gesture recognition capabilities. I have 72 built-in modular abilities, and most importantly, I\'m a fast learner. Continue using me for a month, and you\'ll be amazed by how贴心 I become!',
                isGenerating: false 
              } 
            : msg
        ));
        
        scrollToBottom();
        setIsAssistantMode(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error loading operation guide:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        type: 'text',
        content: lang === 'zh' 
          ? `加载操作指南时出错: ${(error as Error).message}` 
          : `Error loading operation guide: ${(error as Error).message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      type: 'text',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      type: 'text',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isGenerating: true
    };

    setMessages(prev => [...prev, assistantMessage]);
    scrollToBottom();

    try {
      // 构建对话历史
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 构建消息内容
      const parts = [{ text: userMessage.content }];

      // 如果是助手模式，添加系统提示和对话历史
      if (isAssistantMode) {
        const guideContent = getAssistantGuideContent();
        const systemPrompt = createAssistantSystemPrompt(guideContent);
        
        // 构建完整的对话上下文
        const fullContext = {
          parts,
          conversationHistory: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userMessage.content }
          ]
        };
        
        // 调用AI服务，传递对话历史
        const result = await aiServiceAdapter.generateText(fullContext, {});
        
        // 更新助手消息
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: result, isGenerating: false } 
            : msg
        ));
      } else {
        // 非助手模式，也传递对话历史以保持上下文
        const contextWithHistory = {
          parts,
          conversationHistory: [
            ...conversationHistory,
            { role: 'user', content: userMessage.content }
          ]
        };
        
        // 调用AI服务
        const result = await aiServiceAdapter.generateText(contextWithHistory, {});

        // 更新助手消息
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: result, isGenerating: false } 
            : msg
        ));
      }

    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMsg = lang === 'zh' 
        ? `生成回复时出错: ${(error as Error).message}` 
        : `Error generating response: ${(error as Error).message}`;

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: errorMsg, isGenerating: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // 投射到画布
  const handleProjectToCanvas = (content: string, type: 'text' | 'image' | 'video') => {
    if (onProjectToCanvas) {
      onProjectToCanvas(content, type);
    }
  };

  // 键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400]">
      <div className={`w-full max-w-4xl h-[80vh] ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-xl flex flex-col`}>
        {/* 头部 */}
        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <BrainCircuit className={`${isAssistantMode ? 'text-purple-500 animate-pulse' : 'text-purple-500'}`} size={24} />
            <h2 className="text-xl font-bold">{t.aiAssistant}</h2>
            {isAssistantMode && (
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadOperationGuide}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isAssistantMode 
                  ? 'bg-purple-500 text-white' 
                  : theme === 'dark' 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.loadGuide}
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-700 text-slate-400' 
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        <div 
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <BrainCircuit size={48} className="mx-auto mb-4 opacity-50" />
              <p>{lang === 'zh' ? '开始与AI助手对话吧！' : 'Start chatting with AI assistant!'}</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-100'
                      : 'bg-slate-100 text-slate-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.isGenerating && (
                  <div className="mt-2 text-xs opacity-70">{t.loading}</div>
                )}
                <div className="text-xs opacity-50 mt-1">{message.timestamp}</div>
                {message.role === 'assistant' && !message.isGenerating && onProjectToCanvas && (
                  <button
                    onClick={() => handleProjectToCanvas(message.content, 'text')}
                    className="mt-2 text-xs px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                  >
                    {t.projectToCanvas}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.placeholder}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};