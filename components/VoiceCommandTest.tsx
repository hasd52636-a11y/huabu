/**
 * 语音指令测试组件
 * 用于测试语音指令系统的基本功能
 */

import React, { useState } from 'react';
import VoiceCommandController from './VoiceCommandController';

interface VoiceCommand {
  command: 'generate_text' | 'generate_image' | 'generate_video' | 'add_to_canvas' | 'unknown';
  text: string;
  content: string;
  params?: {
    aspectRatio?: string;
    style?: string;
    duration?: number;
  };
}

const VoiceCommandTest: React.FC = () => {
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceCommand = (voiceCommand: VoiceCommand) => {
    console.log('收到语音指令:', voiceCommand);
    setCommandHistory(prev => [...prev, voiceCommand]);
    
    // 模拟处理指令
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      console.log('指令处理完成:', voiceCommand.command);
    }, 2000);
  };

  const clearHistory = () => {
    setCommandHistory([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">语音指令系统测试</h1>
      
      {/* 语音控制器 */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">语音控制</h2>
        <VoiceCommandController
          onCommand={handleVoiceCommand}
          lang="zh"
          wakeWord="曹操"
        />
      </div>

      {/* 处理状态 */}
      {isProcessing && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <p className="text-blue-800">正在处理指令...</p>
        </div>
      )}

      {/* 指令历史 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">指令历史</h2>
          <button
            onClick={clearHistory}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            清空历史
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {commandHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无指令历史</p>
          ) : (
            commandHistory.map((cmd, index) => (
              <div key={index} className="p-3 border rounded-lg bg-white">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    cmd.command === 'generate_text' ? 'bg-blue-100 text-blue-800' :
                    cmd.command === 'generate_image' ? 'bg-green-100 text-green-800' :
                    cmd.command === 'generate_video' ? 'bg-purple-100 text-purple-800' :
                    cmd.command === 'add_to_canvas' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cmd.command}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="mb-2">
                  <p className="text-sm text-gray-600 mb-1">原始语音:</p>
                  <p className="text-gray-800">{cmd.text}</p>
                </div>
                
                <div className="mb-2">
                  <p className="text-sm text-gray-600 mb-1">提取内容:</p>
                  <p className="text-gray-800">{cmd.content}</p>
                </div>
                
                {cmd.params && Object.keys(cmd.params).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">参数:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded">
                      {JSON.stringify(cmd.params, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">测试指令示例:</h3>
        <ul className="text-sm space-y-1">
          <li>• "帮我写段巫师骑摩托车的描述"</li>
          <li>• "画一张9:16的赛博朋克风格图片，内容是未来城市"</li>
          <li>• "制作一个30秒的视频，内容是机器人跳舞"</li>
          <li>• "把这个放到画布上"</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceCommandTest;