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
          width: `min(${maxWidth.mobile}, 100vw)`,
          maxHeight,
          height: 'fit-content',
          minHeight: '300px'
        }}
      >
        <style jsx>{`
          @media (min-width: 768px) {
            div {
              width: min(${maxWidth.tablet}, 100vw) !important;
            }
          }
          @media (min-width: 1024px) {
            div {
              width: min(${maxWidth.desktop}, 100vw) !important;
            }
          }
        `}</style>
        {children}
      </div>
    </div>
  );
};