import React from 'react';
import { X, Eye, Wifi, Users, Activity, HelpCircle } from 'lucide-react';

interface ViewerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ViewerGuideModal: React.FC<ViewerGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">观看模式使用指南</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 功能介绍 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              观看模式功能
            </h3>
            <p className="text-gray-600 mb-4">
              观看模式让你可以实时查看主持人的画布操作，所有的更改都会自动同步到你的屏幕上。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">主要特性：</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 实时同步画布内容</li>
                <li>• 自动重连机制</li>
                <li>• 网络质量监控</li>
                <li>• 性能优化显示</li>
              </ul>
            </div>
          </div>
          {/* 状态指示器说明 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-500" />
              连接状态说明
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Wifi className="w-4 h-4 text-green-500" />
                <div>
                  <span className="font-medium text-green-800">已连接</span>
                  <p className="text-sm text-green-700">正常接收实时更新</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Wifi className="w-4 h-4 text-red-500" />
                <div>
                  <span className="font-medium text-red-800">连接中断</span>
                  <p className="text-sm text-red-700">正在尝试重新连接</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Activity className="w-4 h-4 text-yellow-500" />
                <div>
                  <span className="font-medium text-yellow-800">重连中</span>
                  <p className="text-sm text-yellow-700">系统正在自动重连</p>
                </div>
              </div>
            </div>
          </div>

          {/* 网络质量说明 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">网络质量指示</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="font-medium text-green-800">优秀/良好</span>
                <p className="text-sm text-green-700">更新流畅，延迟很低</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="font-medium text-yellow-800">一般</span>
                <p className="text-sm text-yellow-700">可能有轻微延迟</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="font-medium text-red-800">较差</span>
                <p className="text-sm text-red-700">更新较慢，已启用压缩</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-medium text-blue-800">性能优化</span>
                <p className="text-sm text-blue-700">大量内容时自动优化</p>
              </div>
            </div>
          </div>

          {/* 常见问题 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">常见问题解决</h3>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">画面不更新怎么办？</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 检查连接状态指示器</li>
                  <li>2. 刷新页面重新连接</li>
                  <li>3. 联系主持人确认会话状态</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">连接经常中断？</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 检查网络连接稳定性</li>
                  <li>2. 尝试切换到更稳定的网络</li>
                  <li>3. 系统会自动尝试重连</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">画面显示不完整？</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 这可能是性能优化的结果</li>
                  <li>2. 系统会优先显示重要内容</li>
                  <li>3. 网络改善后会显示完整内容</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 快捷操作 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">快捷操作</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium">刷新连接：</span>
                  <span className="text-gray-600"> F5 或点击重试按钮</span>
                </div>
                <div>
                  <span className="font-medium">退出观看：</span>
                  <span className="text-gray-600"> 点击右上角退出按钮</span>
                </div>
                <div>
                  <span className="font-medium">复制链接：</span>
                  <span className="text-gray-600"> 错误页面的复制按钮</span>
                </div>
                <div>
                  <span className="font-medium">查看帮助：</span>
                  <span className="text-gray-600"> 点击帮助图标</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewerGuideModal;