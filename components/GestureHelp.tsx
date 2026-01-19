/**
 * 手势帮助组件
 * 显示所有可用手势的详细说明和演示
 */

import React from 'react';
import { X, Hand, Lightbulb } from 'lucide-react';

interface GestureHelpProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'zh' | 'en';
}

const GestureHelp: React.FC<GestureHelpProps> = ({
  isOpen,
  onClose,
  lang = 'zh'
}) => {
  if (!isOpen) return null;

  const t = {
    zh: {
      title: '手势控制帮助',
      subtitle: '学习如何使用手势控制画布',
      categories: {
        zoom: '缩放控制',
        move: '移动控制',
        canvas: '画布操作',
        selection: '选择操作'
      },
      gestures: {
        zoom: [
          {
            gesture: '👐',
            name: '放大画布',
            description: '双手张开，手指伸直',
            instruction: '将双手放在摄像头前，手掌张开，手指伸直，然后向外张开双手'
          },
          {
            gesture: '🤏',
            name: '缩小画布',
            description: '双手合拢，形成握拳状',
            instruction: '将双手放在摄像头前，然后将双手向内合拢，形成握拳状'
          }
        ],
        move: [
          {
            gesture: '☝️',
            name: '向上移动',
            description: '单手食指向上指',
            instruction: '伸出一只手，只伸直食指，其他手指弯曲，食指向上指'
          },
          {
            gesture: '👇',
            name: '向下移动',
            description: '单手食指向下指',
            instruction: '伸出一只手，只伸直食指，其他手指弯曲，食指向下指'
          },
          {
            gesture: '👈',
            name: '向左移动',
            description: '单手食指向左指',
            instruction: '伸出一只手，只伸直食指，其他手指弯曲，食指向左指'
          },
          {
            gesture: '👉',
            name: '向右移动',
            description: '单手食指向右指',
            instruction: '伸出一只手，只伸直食指，其他手指弯曲，食指向右指'
          }
        ],
        canvas: [
          {
            gesture: '🙌',
            name: '重置视角',
            description: '双手举起摇摆',
            instruction: '将双手举到头部两侧，手掌张开，轻轻摇摆'
          },
          {
            gesture: '✋',
            name: '清空画布',
            description: '单手停止手势',
            instruction: '伸出一只手，手掌张开面向摄像头，做出"停止"的手势'
          },
          {
            gesture: '👏',
            name: '自动布局',
            description: '拍手动作',
            instruction: '将双手合拢，做出拍手的动作'
          }
        ],
        selection: [
          {
            gesture: '🫴',
            name: '全选模块',
            description: '双手环抱手势',
            instruction: '将双手张开，形成环抱的姿势，就像要拥抱什么东西一样'
          }
        ]
      },
      tips: {
        title: '使用技巧',
        items: [
          '确保摄像头能清楚看到你的手部',
          '在光线充足的环境中使用',
          '手势需要保持0.5秒以上才会触发',
          '动作要清晰明确，避免模糊不清',
          '一次只做一个手势，避免混合动作',
          '如果识别不准确，可以重新调整手势'
        ]
      },
      troubleshooting: {
        title: '常见问题',
        items: [
          {
            problem: '手势识别不准确',
            solution: '检查光线是否充足，确保手部完全在摄像头视野内'
          },
          {
            problem: '摄像头无法启动',
            solution: '检查浏览器权限设置，允许网站访问摄像头'
          },
          {
            problem: '手势反应延迟',
            solution: '这是正常现象，系统需要0.5秒确认手势稳定性'
          },
          {
            problem: '误触发其他手势',
            solution: '确保手势动作清晰，避免在切换手势时产生中间状态'
          }
        ]
      },
      close: '关闭'
    },
    en: {
      title: 'Gesture Control Help',
      subtitle: 'Learn how to use gestures to control the canvas',
      // ... English translations would go here
    }
  };

  const currentLang = t[lang];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Hand className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentLang.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentLang.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Zoom Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {currentLang.categories.zoom}
              </h3>
              <div className="space-y-4">
                {currentLang.gestures.zoom.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{item.gesture}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-12">
                      {item.instruction}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Movement Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {currentLang.categories.move}
              </h3>
              <div className="space-y-4">
                {currentLang.gestures.move.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{item.gesture}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-12">
                      {item.instruction}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                {currentLang.categories.canvas}
              </h3>
              <div className="space-y-4">
                {currentLang.gestures.canvas.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{item.gesture}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-12">
                      {item.instruction}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selection Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                {currentLang.categories.selection}
              </h3>
              <div className="space-y-4">
                {currentLang.gestures.selection.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{item.gesture}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-12">
                      {item.instruction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Tips */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  {currentLang.tips.title}
                </h4>
              </div>
              <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {currentLang.tips.items.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                {currentLang.troubleshooting.title}
              </h4>
              <div className="space-y-3 text-sm">
                {currentLang.troubleshooting.items.map((item, index) => (
                  <div key={index}>
                    <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                      {item.problem}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 text-xs">
                      {item.solution}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {currentLang.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestureHelp;