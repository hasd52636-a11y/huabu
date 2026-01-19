/**
 * AI手势控制演示组件
 * 展示AI增强手势识别的功能和特性
 */

import React, { useState, useEffect } from 'react';
import { Brain, Hand, Zap, Target, TrendingUp, Settings } from 'lucide-react';
import { gestureAIAnalyzer } from '../services/GestureAIAnalyzer';

interface AIGestureDemoProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  lang?: 'zh' | 'en';
}

const AIGestureDemo: React.FC<AIGestureDemoProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  lang = 'zh'
}) => {
  const [modelStatus, setModelStatus] = useState({
    isLoaded: false,
    accuracy: 0,
    trainingCount: 0
  });

  useEffect(() => {
    if (isOpen) {
      // 获取AI模型状态
      const status = gestureAIAnalyzer.getModelStatus();
      setModelStatus(status);
    }
  }, [isOpen]);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI智能分析',
      description: '使用TensorFlow.js神经网络进行手势意图理解',
      color: 'text-blue-500'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: '上下文感知',
      description: '根据画布状态和用户历史调整识别策略',
      color: 'text-green-500'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: '自适应学习',
      description: '从用户反馈中学习，持续优化识别准确度',
      color: 'text-purple-500'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: '实时推理',
      description: '毫秒级响应，提供流畅的交互体验',
      color: 'text-yellow-500'
    }
  ];

  const gestureIntents = [
    'zoom_in', 'zoom_out', 'pan_up', 'pan_down', 'pan_left', 'pan_right',
    'select_all', 'clear_selection', 'delete_selected', 'copy_selected',
    'create_block', 'auto_layout', 'reset_view', 'clear_canvas'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI增强手势控制系统
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                基于深度学习的智能手势识别技术
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* AI Model Status */}
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              AI模型状态
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${modelStatus.isLoaded ? 'text-green-500' : 'text-red-500'}`}>
                  {modelStatus.isLoaded ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">模型状态</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {(modelStatus.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">识别准确度</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {modelStatus.trainingCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">训练样本</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              核心特性
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`${feature.color} mt-1`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supported Gestures */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              支持的手势意图 ({gestureIntents.length}种)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {gestureIntents.map((intent, index) => (
                <div key={index} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium text-center">
                  {intent.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              技术架构
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🧠 神经网络架构
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 输入层：84维特征向量（42个关键点 × 2坐标）</li>
                  <li>• 隐藏层：128 → 64 → 32 神经元，ReLU激活</li>
                  <li>• 输出层：19种手势意图分类，Softmax激活</li>
                  <li>• 正则化：Dropout (0.2) 防止过拟合</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📊 特征提取
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 手部关键点归一化和时序特征</li>
                  <li>• 手势强度、速度、方向计算</li>
                  <li>• 双手距离、角度、手指状态分析</li>
                  <li>• 时间序列特征和上下文信息</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🎯 智能推理
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 上下文感知：画布状态、用户历史</li>
                  <li>• 置信度调整：基于环境因素动态调整</li>
                  <li>• 意图切换：智能选择最佳备选意图</li>
                  <li>• 在线学习：从用户反馈持续优化</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">
            基于 TensorFlow.js 和 MediaPipe 构建
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            开始体验
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIGestureDemo;