import React, { useEffect, useRef } from 'react';

export interface ResponsiveBreakpoint {
  mobile: string;
  tablet: string;
  desktop: string;
}

export interface ResponsiveModalContainerProps {
  children: React.ReactNode;
  maxWidth?: ResponsiveBreakpoint;
  maxHeight?: string;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

const defaultBreakpoints: ResponsiveBreakpoint = {
  mobile: '95vw',
  tablet: '85vw',
  desktop: '75vw'
};

export const ResponsiveModalContainer: React.FC<ResponsiveModalContainerProps> = ({
  children,
  maxWidth = defaultBreakpoints,
  maxHeight = '90vh',
  className = '',
  isOpen,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [adaptiveWidth, setAdaptiveWidth] = useState<string>('');

  // Calculate adaptive width based on available space
  useEffect(() => {
    if (isOpen) {
      const updateAdaptiveWidth = () => {
        const viewportWidth = window.innerWidth;
        const availableWidth = viewportWidth - 100; // Account for padding
        
        // Check if there might be a parameter panel open (common width ~400-500px)
        const hasRightPanel = document.querySelector('[class*="parameter"]') || 
                             document.querySelector('[class*="sidebar"]') ||
                             viewportWidth < 1400; // Assume constrained space on smaller screens
        
        let targetWidth: string;
        
        if (viewportWidth < 768) {
          // Mobile
          targetWidth = maxWidth.mobile;
        } else if (viewportWidth < 1024) {
          // Tablet
          targetWidth = maxWidth.tablet;
        } else {
          // Desktop - adjust based on available space
          if (hasRightPanel || availableWidth < 1200) {
            // Constrained space - use smaller width
            targetWidth = '55vw';
          } else {
            // Full space available
            targetWidth = maxWidth.desktop;
          }
        }
        
        setAdaptiveWidth(targetWidth);
      };

      updateAdaptiveWidth();
      window.addEventListener('resize', updateAdaptiveWidth);
      
      return () => {
        window.removeEventListener('resize', updateAdaptiveWidth);
      };
    }
  }, [isOpen, maxWidth]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const finalWidth = adaptiveWidth || maxWidth.desktop;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[450] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`
          relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl
          border-4 border-purple-400 dark:border-purple-500
          bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20
          flex flex-col
          ${className}
        `}
        style={{
          width: finalWidth,
          maxHeight,
          height: 'fit-content',
          minHeight: '400px',
          maxWidth: '90vw'
        }}
      >
        {children}
      </div>
    </div>
  );
};