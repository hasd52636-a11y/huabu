import React from 'react';
import { useTokenContext } from '../contexts/TokenContext';
import { RotateCcw } from 'lucide-react';

// TokenConsumptionDisplay组件 - 简化版
export const TokenConsumptionDisplay: React.FC = () => {
  const { total, enabled, resetConsumption } = useTokenContext();

  // 如果未启用统计功能，不显示组件
  if (!enabled) return null;

  const handleReset = () => {
    if (confirm('确定要清零Token统计吗？此操作不可恢复。')) {
      resetConsumption();
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="font-medium">Token:</span>
      <span className="font-semibold text-slate-700 dark:text-slate-300">{total.toLocaleString()}</span>
      <button
        onClick={handleReset}
        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
        title="清零Token统计"
      >
        <RotateCcw size={14} className="text-slate-400 group-hover:text-amber-500 group-hover:rotate-180 transition-all duration-300" />
      </button>
    </div>
  );
};

export default TokenConsumptionDisplay;
