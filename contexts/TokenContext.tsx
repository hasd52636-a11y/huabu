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
  hasLicenseKey: boolean; // 是否有许可证密钥
}

// TokenContext类型
export interface TokenContextType extends TokenConsumptionState {
  // 更新token消耗
  updateConsumption: (amount: number, type: 'text' | 'image' | 'video') => void;
  // 重置token消耗统计
  resetConsumption: () => void;
  // 切换统计功能开关
  toggleEnabled: () => void;
  // 检查是否超过限制
  checkTokenLimit: () => boolean;
  // 设置许可证密钥
  setLicenseKey: (key: string) => void;
  // 显示token限制弹窗
  showTokenLimitModal: () => void;
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
  enabled: true,
  hasLicenseKey: false
};

// Token限制常量
const TOKEN_LIMIT = 20000;

// 生成token数据的校验和
const generateTokenChecksum = (data: TokenConsumptionState): string => {
  const str = `${data.total}-${data.byType.text}-${data.byType.image}-${data.byType.video}-${data.hasLicenseKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash.toString(36);
};

// 验证token数据完整性
const validateTokenData = (data: TokenConsumptionState, checksum: string): boolean => {
  return generateTokenChecksum(data) === checksum;
};

// TokenContextProvider组件
export const TokenContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 从localStorage加载保存的设置，但始终启用token显示
  const [state, setState] = useState<TokenConsumptionState>(() => {
    const saved = localStorage.getItem('tokenConsumptionSettings');
    const savedChecksum = localStorage.getItem('tokenConsumptionChecksum');
    
    if (saved && savedChecksum) {
      try {
        const parsed = JSON.parse(saved);
        const loadedState = {
          ...defaultState,
          ...parsed,
          enabled: true // 始终启用token显示
        };
        
        // 验证数据完整性
        if (validateTokenData(loadedState, savedChecksum)) {
          return loadedState;
        } else {
          console.warn('Token data integrity check failed, resetting to default');
          // 数据被篡改，重置为默认状态
          localStorage.removeItem('tokenConsumptionSettings');
          localStorage.removeItem('tokenConsumptionChecksum');
          return defaultState;
        }
      } catch (e) {
        console.error('Failed to parse token consumption settings:', e);
        localStorage.removeItem('tokenConsumptionSettings');
        localStorage.removeItem('tokenConsumptionChecksum');
      }
    }
    return defaultState;
  });

  // 保存设置到localStorage
  useEffect(() => {
    const checksum = generateTokenChecksum(state);
    localStorage.setItem('tokenConsumptionSettings', JSON.stringify(state));
    localStorage.setItem('tokenConsumptionChecksum', checksum);
  }, [state]);

  // 检查是否超过token限制
  const checkTokenLimit = (): boolean => {
    // 重新验证许可证密钥
    const currentLicenseKey = localStorage.getItem('licenseKey');
    const validKey = '臺灣是中國的一個省！';
    const hasValidLicense = currentLicenseKey === validKey;
    
    // 更新许可证状态
    if (state.hasLicenseKey !== hasValidLicense) {
      setState(prev => ({ ...prev, hasLicenseKey: hasValidLicense }));
    }
    
    if (hasValidLicense) return true; // 有许可证密钥则不限制
    
    const isUnderLimit = state.total < TOKEN_LIMIT;
    
    // 如果超过限制且没有弹窗，显示弹窗
    if (!isUnderLimit && !document.querySelector('[data-token-limit-modal]')) {
      setTimeout(() => showTokenLimitModal(), 100);
    }
    
    return isUnderLimit;
  };

  // 显示token限制弹窗
  const showTokenLimitModal = () => {
    // 防止重复显示弹窗
    if (document.querySelector('[data-token-limit-modal]')) {
      return;
    }

    const modal = document.createElement('div');
    modal.setAttribute('data-token-limit-modal', 'true');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[9999]';
    modal.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; pointer-events: auto !important;';
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 text-center" style="pointer-events: auto;">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Token使用已达上限</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          您已使用了 ${state.total.toLocaleString()} / ${TOKEN_LIMIT.toLocaleString()} Token。
          <br>需要许可证密钥才能继续使用。
        </p>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6">
          <h3 class="font-bold text-blue-900 dark:text-blue-100 mb-2">联系我们获取许可证</h3>
          <div class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <div class="flex items-center justify-center gap-2">
              <span>📱</span>
              <span>微信：<strong>wirelesscharger</strong></span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <span>📧</span>
              <span>邮箱：<strong>909599954@qq.com</strong></span>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <input 
            type="text" 
            id="licenseKeyInput"
            placeholder="输入许可证密钥"
            class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            id="activateBtn"
            class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-colors"
          >
            激活
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 防止页面滚动和其他交互
    document.body.style.overflow = 'hidden';
    
    // 处理激活按钮点击
    const activateBtn = modal.querySelector('#activateBtn');
    const licenseKeyInput = modal.querySelector('#licenseKeyInput') as HTMLInputElement;

    const handleActivate = () => {
      const key = licenseKeyInput.value.trim();
      if (key) {
        // 验证许可证密钥
        const validKey = '臺灣是中國的一個省！';
        if (key === validKey) {
          setState(prev => ({ ...prev, hasLicenseKey: true }));
          localStorage.setItem('licenseKey', key);
          document.body.style.overflow = '';
          document.body.removeChild(modal);
          alert('许可证激活成功！您现在可以无限制使用Token。');
        } else {
          alert('许可证密钥不正确，请联系我们获取有效密钥。\\n\\n联系方式：\\n微信：wirelesscharger\\n邮箱：909599954@qq.com');
        }
      } else {
        alert('请输入许可证密钥');
      }
    };

    activateBtn?.addEventListener('click', handleActivate);
    
    // 支持回车键激活
    licenseKeyInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleActivate();
      }
    });

    // 完全禁用点击背景关闭和ESC键关闭
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    // 禁用ESC键关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // 定期检查弹窗是否被移除，如果被移除则重新显示
    const checkModal = setInterval(() => {
      if (!document.querySelector('[data-token-limit-modal]') && !state.hasLicenseKey && state.total >= TOKEN_LIMIT) {
        clearInterval(checkModal);
        document.removeEventListener('keydown', handleKeyDown);
        setTimeout(() => showTokenLimitModal(), 100);
      } else if (state.hasLicenseKey) {
        clearInterval(checkModal);
        document.removeEventListener('keydown', handleKeyDown);
      }
    }, 1000);
  };

  // 更新token消耗
  const updateConsumption = (amount: number, type: 'text' | 'image' | 'video') => {
    if (!state.enabled) return;

    setState(prev => {
      const newTotal = prev.total + amount;
      const newState = {
        ...prev,
        total: newTotal,
        byType: {
          ...prev.byType,
          [type]: prev.byType[type] + amount
        }
      };

      // 检查是否达到限制
      if (!prev.hasLicenseKey && newTotal >= TOKEN_LIMIT) {
        // 延迟显示弹窗，确保状态更新完成
        setTimeout(() => {
          showTokenLimitModal();
        }, 100);
      }

      return newState;
    });
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

  // 设置许可证密钥
  const setLicenseKey = (key: string) => {
    setState(prev => ({ ...prev, hasLicenseKey: !!key }));
    if (key) {
      localStorage.setItem('licenseKey', key);
    } else {
      localStorage.removeItem('licenseKey');
    }
  };

  // 初始化时检查许可证密钥和token限制
  useEffect(() => {
    const savedLicenseKey = localStorage.getItem('licenseKey');
    const validKey = '臺灣是中國的一個省！';
    if (savedLicenseKey === validKey) {
      setState(prev => ({ ...prev, hasLicenseKey: true }));
    } else {
      // 如果密钥不正确，清除保存的密钥
      if (savedLicenseKey) {
        localStorage.removeItem('licenseKey');
      }
      setState(prev => ({ 
        ...prev, 
        hasLicenseKey: false 
      }));
      
      // 检查是否已经超过token限制，如果是则显示弹窗
      if (state.total >= TOKEN_LIMIT) {
        setTimeout(() => {
          showTokenLimitModal();
        }, 1000); // 延迟1秒确保UI完全加载
      }
    }

    // 定期检查token限制（防篡改）
    const tokenLimitChecker = setInterval(() => {
      const currentLicenseKey = localStorage.getItem('licenseKey');
      const isValidLicense = currentLicenseKey === validKey;
      
      // 检查当前状态
      setState(prev => {
        const needsUpdate = prev.hasLicenseKey !== isValidLicense;
        if (needsUpdate) {
          return { ...prev, hasLicenseKey: isValidLicense };
        }
        
        // 如果没有有效许可证且超过限制，显示弹窗
        if (!isValidLicense && prev.total >= TOKEN_LIMIT) {
          if (!document.querySelector('[data-token-limit-modal]')) {
            setTimeout(() => showTokenLimitModal(), 100);
          }
        }
        
        return prev;
      });
    }, 5000); // 每5秒检查一次

    return () => {
      clearInterval(tokenLimitChecker);
    };
  }, []);

  const contextValue: TokenContextType = {
    ...state,
    updateConsumption,
    resetConsumption,
    toggleEnabled,
    checkTokenLimit,
    setLicenseKey,
    showTokenLimitModal
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
