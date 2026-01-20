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
                  ? '# 你好呀！我是曹操画布智能助手——曹冲\n\n## 🧠 家族遗传，聪明过人\n作为曹操后裔，我继承了先祖的雄才大略，却专注于多媒体创作领域，为您提供：\n- 📝 文本创作：文案、脚本、课件信手拈来\n- 🎨 图像处理：生成、修图、分镜不在话下\n- 🎬 视频制作：动画、剪辑、批量生产样样精通\n\n## 🔧 三头六臂，能力全面\n为助力残障人士，我加装了：\n- 🎤 语音识别：听懂您的每一句指令\n- ✋ 手势控制：看懂您的每一个动作\n- 🧩 72种模块化能力：按需调用，灵活组合\n\n## 📈 勤学苦练，日益精进\n正如先祖所言：「老骥伏枥，志在千里」，我亦如此——\n持续使用我一个月，您将见证我从「初识」到「贴心」的成长，\n成为您创作路上最懂你的「左膀右臂」！\n\n说曹操，曹操到！您有什么创作需求，尽管吩咐~' 
                  : 'Hello! I\'m Cao Chong, the intelligent assistant of Cao Cao Canvas\n\n## 🧠 Smart as My Ancestors\nAs a descendant of Cao Cao, I inherit the great talents but focus on multimedia creation, offering you:\n- 📝 Text creation: Copywriting, scripts, courseware\n- 🎨 Image processing: Generation, editing, storyboarding\n- 🎬 Video production: Animation, editing, batch production\n\n## 🔧 Versatile Abilities\nTo help people with disabilities, I\'ve added:\n- 🎤 Voice recognition: Understand every command\n- ✋ Gesture control: Recognize every movement\n- 🧩 72 modular abilities: Flexible and combinable\n\n## 📈 Always Learning\nJust as my ancestor said: "An old horse in the stable still aspires to run a thousand miles", so do I.\nUse me continuously for a month, and you\'ll witness my growth from "acquaintance" to "intimate",\nbecoming your most understanding "right-hand man" on your creative journey!\n\n"Speak of Cao Cao, and Cao Cao arrives!" What creative needs do you have? Feel free to ask!',
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
        // 根据用户问题选择相关的指南模块，降低token消耗
        const guideContent = getAssistantGuideContent(userMessage.content);
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