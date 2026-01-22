import React, { useState, useEffect } from 'react';
import { Smartphone, X, Info } from 'lucide-react';

interface MobileOptimizationNoticeProps {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const MobileOptimizationNotice: React.FC<MobileOptimizationNoticeProps> = ({ theme, lang }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 检查是否为移动设备
    const isMobile = window.innerWidth < 768;
    const hasBeenDismissed = localStorage.getItem('mobile-notice-dismissed') === 'true';
    
    if (isMobile && !hasBeenDismissed) {
      // 延迟显示提示
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('mobile-notice-dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  const texts = {
    zh: {
      title: '移动端优化提示',
      message: '当前为移动端访问，部分功能已优化。建议使用桌面端获得完整体验。',
      dismiss: '知道了'
    },
    en: {
      title: 'Mobile Optimization Notice',
      message: 'You are accessing from mobile. Some features are optimized. Desktop is recommended for full experience.',
      dismiss: 'Got it'
    }
  };

  const t = texts[lang];

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-[400] transform transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <div className={`rounded-2xl shadow-2xl border-2 p-4 ${
        theme === 'dark' 
          ? 'bg-slate-800/95 border-slate-600 text-white' 
          : 'bg-white/95 border-blue-200 text-gray-900'
      } backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
          }`}>
            <Smartphone className={`w-5 h-5 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">{t.title}</h4>
            <p className="text-xs opacity-80 leading-relaxed">{t.message}</p>
          </div>
          
          <button
            onClick={handleDismiss}
            className={`p-1 rounded-lg hover:scale-110 transition-transform ${
              theme === 'dark' 
                ? 'hover:bg-slate-700 text-slate-400' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleDismiss}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {t.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizationNotice;