/**
 * 语音指令帮助组件
 * 显示所有可用的语音指令和使用方法
 */

import React from 'react';
import { Mic, X, Lightbulb } from 'lucide-react';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'zh' | 'en';
}

const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isOpen,
  onClose,
  lang = 'zh'
}) => {
  if (!isOpen) return null;

  const t = {
    zh: {
      title: '语音指令帮助',
      subtitle: '说"曹操"唤醒，然后说出以下指令',
      categories: {
        content: '内容生成',
        canvas: '画布操作',
        view: '视图控制',
        file: '文件操作',
        system: '系统设置'
      },
      commands: {
        content: [
          { cmd: '写段文字', desc: '生成文本内容', example: '曹操，帮我写段科幻小说' },
          { cmd: '画张图片', desc: '生成图像内容', example: '曹操，画一张赛博朋克风格的图片' },
          { cmd: '制作视频', desc: '生成视频内容', example: '曹操，制作一个机器人跳舞的视频' },
          { cmd: '批量生成', desc: '为所有空模块生成内容', example: '曹操，批量生成所有内容' }
        ],
        canvas: [
          { cmd: '清空画布', desc: '删除所有模块', example: '曹操，清空画布' },
          { cmd: '自动布局', desc: '整理模块排列', example: '曹操，自动布局' },
          { cmd: '复制模块', desc: '复制选中的模块', example: '曹操，复制选中的模块' },
          { cmd: '删除模块', desc: '删除选中的模块', example: '曹操，删除选中的模块' },
          { cmd: '连接模块', desc: '连接选中的模块', example: '曹操，连接这些模块' },
          { cmd: '全选', desc: '选择所有模块', example: '曹操，全选所有模块' }
        ],
        view: [
          { cmd: '重置视角', desc: '回到画布中心', example: '曹操，重置视角' },
          { cmd: '放大画布', desc: '放大显示', example: '曹操，放大画布' },
          { cmd: '缩小画布', desc: '缩小显示', example: '曹操，缩小画布' }
        ],
        file: [
          { cmd: '保存项目', desc: '保存当前工作', example: '曹操，保存项目' },
          { cmd: '导出PDF', desc: '导出为PDF文件', example: '曹操，导出PDF' }
        ],
        system: [
          { cmd: '打开设置', desc: '显示配置界面', example: '曹操，打开设置' },
          { cmd: '切换主题', desc: '切换深色/浅色主题', example: '曹操，切换主题' }
        ]
      },
      tips: {
        title: '使用技巧',
        items: [
          '说话清晰，语速适中',
          '可以使用不同的表达方式，系统会智能识别',
          '如果识别错误，可以通过反馈界面纠正',
          '系统会学习你的表达习惯，越用越准确'
        ]
      },
      close: '关闭'
    },
    en: {
      title: 'Voice Command Help',
      subtitle: 'Say "曹操" to wake up, then speak the following commands',
      // ... English translations
    }
  };

  const currentLang = t[lang];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[400] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Generation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {currentLang.categories.content}
              </h3>
              <div className="space-y-3">
                {currentLang.commands.content.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.cmd}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {item.desc}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {currentLang.categories.canvas}
              </h3>
              <div className="space-y-3">
                {currentLang.commands.canvas.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.cmd}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {item.desc}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* View Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                {currentLang.categories.view}
              </h3>
              <div className="space-y-3">
                {currentLang.commands.view.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.cmd}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {item.desc}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Operations & System */}
            <div className="space-y-6">
              {/* File Operations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  {currentLang.categories.file}
                </h3>
                <div className="space-y-3">
                  {currentLang.commands.file.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.cmd}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {item.desc}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                        {item.example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {currentLang.categories.system}
                </h3>
                <div className="space-y-3">
                  {currentLang.commands.system.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.cmd}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {item.desc}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                        {item.example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
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
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {currentLang.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandHelp;