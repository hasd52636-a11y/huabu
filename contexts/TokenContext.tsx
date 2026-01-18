import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Token消耗统计状态类型
export interface TokenConsumptionState {
  total: number; // 总token消耗
  byType: {
    text: number; // 文本token消耗
    image: number; // 图片token消耗
    video: number; // 视频token消耗
  };
  enabled: boolean; // 是否启用统计功能
}

// TokenContext类型
export interface TokenContextType extends TokenConsumptionState {
  // 更新token消耗
  updateConsumption: (amount: number, type: 'text' | 'image' | 'video') => void;
  // 重置token消耗统计
  resetConsumption: () => void;
  // 切换统计功能开关
  toggleEnabled: () => void;
}

// 创建TokenContext
export const TokenContext = createContext<TokenContextType | undefined>(undefined);

// 默认状态
const defaultState: TokenConsumptionState = {
  total: 0,
  byType: {
    text: 0,
    image: 0,
    video: 0
  },
  enabled: true
};

// TokenContextProvider组件
export const TokenContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 从localStorage加载保存的设置，但始终启用token显示
  const [state, setState] = useState<TokenConsumptionState>(() => {
    const saved = localStorage.getItem('tokenConsumptionSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultState,
          ...parsed,
          enabled: true // 始终启用token显示
        };
      } catch (e) {
        console.error('Failed to parse token consumption settings:', e);
      }
    }
    return defaultState;
  });

  // 保存设置到localStorage
  useEffect(() => {
    localStorage.setItem('tokenConsumptionSettings', JSON.stringify(state));
  }, [state]);

  // 更新token消耗
  const updateConsumption = (amount: number, type: 'text' | 'image' | 'video') => {
    if (!state.enabled) return;

    setState(prev => ({
      ...prev,
      total: prev.total + amount,
      byType: {
        ...prev.byType,
        [type]: prev.byType[type] + amount
      }
    }));
  };

  // 重置token消耗统计
  const resetConsumption = () => {
    setState(prev => ({
      ...prev,
      total: 0,
      byType: {
        text: 0,
        image: 0,
        video: 0
      }
    }));
  };

  // 切换统计功能开关
  const toggleEnabled = () => {
    setState(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const contextValue: TokenContextType = {
    ...state,
    updateConsumption,
    resetConsumption,
    toggleEnabled
  };

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
};

// 自定义hook，用于访问TokenContext
export const useTokenContext = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokenContext must be used within a TokenContextProvider');
  }
  return context;
};
