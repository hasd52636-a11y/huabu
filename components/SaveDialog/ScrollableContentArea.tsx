import React, { useRef, useEffect, useState } from 'react';

export interface ScrollableContentAreaProps {
  children: React.ReactNode;
  maxHeight: string;
  showScrollIndicators?: boolean;
  maintainHeaderFooter?: boolean;
  className?: string;
}

export const ScrollableContentArea: React.FC<ScrollableContentAreaProps> = ({
  children,
  maxHeight,
  showScrollIndicators = true,
  maintainHeaderFooter = true,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowTopShadow(scrollTop > 0);
    setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 1);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // Initial check
    handleScroll();

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Top scroll indicator */}
      {showScrollIndicators && showTopShadow && (
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/10 to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={`
          h-full overflow-y-auto overflow-x-hidden
          scrollbar-thin scrollbar-track-purple-100 scrollbar-thumb-purple-400
          dark:scrollbar-track-purple-900 dark:scrollbar-thumb-purple-600
          hover:scrollbar-thumb-purple-500 dark:hover:scrollbar-thumb-purple-500
          ${className}
        `}
        style={{
          maxHeight,
          scrollBehavior: 'smooth'
        }}
      >
        <div className="p-8">
          {children}
        </div>
      </div>

      {/* Bottom scroll indicator */}
      {showScrollIndicators && showBottomShadow && (
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/10 to-transparent z-10 pointer-events-none" />
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.6) rgba(168, 85, 247, 0.1);
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(168, 85, 247, 0.1);
          border-radius: 8px;
          margin: 4px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.6);
          border-radius: 8px;
          border: 2px solid transparent;
          background-clip: content-box;
          min-height: 40px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.8);
          background-clip: content-box;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:active {
          background: rgba(147, 51, 234, 0.9);
          background-clip: content-box;
        }
        
        .scrollbar-thin::-webkit-scrollbar-corner {
          background: rgba(168, 85, 247, 0.1);
        }
        
        .dark .scrollbar-thin {
          scrollbar-color: rgba(147, 51, 234, 0.7) rgba(147, 51, 234, 0.2);
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(147, 51, 234, 0.2);
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.7);
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.9);
        }
        
        .dark .scrollbar-thin::-webkit-scrollbar-corner {
          background: rgba(147, 51, 234, 0.2);
        }
      `}</style>
    </div>
  );
};