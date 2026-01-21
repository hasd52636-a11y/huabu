/**
 * 曹操头像组件 - 紫色线条勾勒的古代人物头像
 */

import React from 'react';

interface CaocaoAvatarProps {
  size?: number;
  className?: string;
}

const CaocaoAvatar: React.FC<CaocaoAvatarProps> = ({ 
  size = 32, 
  className = '' 
}) => {
  return (
    <div 
      className={`flex-shrink-0 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 脸部轮廓 */}
        <path
          d="M12 2C8.5 2 6 4.5 6 8C6 10 6.5 11.5 7.5 12.5C8 13 8.5 13.5 9 14C9.5 14.5 10 15 10.5 15.5C11 16 11.5 16.5 12 17C12.5 16.5 13 16 13.5 15.5C14 15 14.5 14.5 15 14C15.5 13.5 16 13 16.5 12.5C17.5 11.5 18 10 18 8C18 4.5 15.5 2 12 2Z"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 古代发髻 */}
        <path
          d="M8 6C8.5 4.5 10 3.5 12 3.5C14 3.5 15.5 4.5 16 6C16.5 5 15.5 3 12 3C8.5 3 7.5 5 8 6Z"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 发髻装饰 */}
        <circle
          cx="12"
          cy="4.5"
          r="1"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          fill="none"
        />
        
        {/* 眉毛 */}
        <path
          d="M9.5 8.5C10 8.2 10.5 8.2 11 8.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M13 8.5C13.5 8.2 14 8.2 14.5 8.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* 眼睛 */}
        <circle
          cx="10"
          cy="9.5"
          r="0.8"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="14"
          cy="9.5"
          r="0.8"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          fill="none"
        />
        
        {/* 眼珠 */}
        <circle
          cx="10"
          cy="9.5"
          r="0.3"
          fill="rgb(147 51 234)"
        />
        <circle
          cx="14"
          cy="9.5"
          r="0.3"
          fill="rgb(147 51 234)"
        />
        
        {/* 鼻子 */}
        <path
          d="M12 10.5L12 12"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M11.5 12C11.7 12.2 12.3 12.2 12.5 12"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* 嘴巴 */}
        <path
          d="M10.5 13.5C11 14 12 14 12.5 14C13 14 14 14 14.5 13.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* 胡须 */}
        <path
          d="M8.5 13C8.2 13.5 8 14 8 14.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M15.5 13C15.8 13.5 16 14 16 14.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 15C12 15.5 12 16 12 16.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* 古代服饰领口 */}
        <path
          d="M9 17C10 18 11 18.5 12 18.5C13 18.5 14 18 15 17"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        
        {/* 服饰装饰 */}
        <path
          d="M10 18.5C10.5 19 11.5 19.5 12 20C12.5 19.5 13.5 19 14 18.5"
          stroke="rgb(147 51 234)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default CaocaoAvatar;