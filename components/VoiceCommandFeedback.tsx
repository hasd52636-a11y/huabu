/**
 * 语音指令反馈组件
 * 用于收集用户对语音识别结果的反馈，提升识别精度
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Edit3, X } from 'lucide-react';
import { voiceCommandLibrary } from '../services/VoiceCommandLibrary';

interface VoiceCommandFeedbackProps {
  originalText: string;
  recognizedCommand: string;
  isVisible: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
  lang?: 'zh' | 'en';
}

const VoiceCommandFeedback: React.FC<VoiceCommandFeedbackProps> = ({
  originalText,
  recognizedCommand,
  isVisible,
  onClose,
  onFeedbackSubmitted,
  lang = 'zh'
}) => {
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedCommand, setCorrectedCommand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    zh: {
      title: '语音识别反馈',
      question: '识别结果是否正确？',
      originalText: '您说的话',
      recognized: '识别为',
      correct: '正确',
      incorrect: '错误',
      correction: '请选择正确的指令类型',
      submit: '提交反馈',
      cancel: '取消',
      thanks: '感谢您的反馈！',
      commands: {
        generate_text: '生成文字',
        generate_image: '生成图片',
        generate_video: '生成视频',
        add_to_canvas: '添加到画布',
        clear_canvas: '清空画布',
        reset_view: '重置视角',
        auto_layout: '自动布局',
        copy_blocks: '复制模块',
        delete_blocks: '删除模块',
        zoom_in: '放大画布',
        zoom_out: '缩小画布',
        save_project: '保存项目',
        export_pdf: '导出PDF',
        batch_generate: '批量生成',
        connect_blocks: '连接模块',
        select_all: '全选',
        undo: '撤销',
        redo: '重做',
        show_config: '显示设置',
        switch_theme: '切换主题',
        unknown: '未知指令'
      }
    },
    en: {
      title: 'Voice Recognition Feedback',
      question: 'Is the recognition result correct?',
      originalText: 'What you said',
      recognized: 'Recognized as',
      correct: 'Correct',
      incorrect: 'Incorrect',
      correction: 'Please select the correct command type',
      submit: 'Submit Feedback',
      cancel: 'Cancel',
      thanks: 'Thank you for your feedback!',
      commands: {
        generate_text: 'Generate Text',
        generate_image: 'Generate Image',
        generate_video: 'Generate Video',
        add_to_canvas: 'Add to Canvas',
        unknown: 'Unknown Command'
      }
    }
  };

  const handlePositiveFeedback = async () => {
    setIsSubmitting(true);
    
    voiceCommandLibrary.addFeedback({
      original_text: originalText,
      recognized_command: recognizedCommand,
      actual_command: recognizedCommand,
      is_correct: true
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onFeedbackSubmitted?.();
      onClose();
    }, 500);
  };

  const handleNegativeFeedback = () => {
    setShowCorrection(true);
  };

  const handleCorrectionSubmit = async () => {
    if (!correctedCommand) return;

    setIsSubmitting(true);
    
    voiceCommandLibrary.addFeedback({
      original_text: originalText,
      recognized_command: recognizedCommand,
      actual_command: correctedCommand,
      is_correct: false,
      user_correction: correctedCommand
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onFeedbackSubmitted?.();
      onClose();
    }, 500);
  };

  const handleCancel = () => {
    setShowCorrection(false);
    setCorrectedCommand('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t[lang].title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 原始文本 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t[lang].originalText}:
            </p>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-900 dark:text-white">"{originalText}"</p>
            </div>
          </div>

          {/* 识别结果 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t[lang].recognized}:
            </p>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-900 dark:text-blue-100 font-medium">
                {t[lang].commands[recognizedCommand as keyof typeof t[typeof lang]['commands']] || recognizedCommand}
              </p>
            </div>
          </div>

          {!showCorrection ? (
            /* 反馈按钮 */
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {t[lang].question}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePositiveFeedback}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  <ThumbsUp size={20} />
                  {t[lang].correct}
                </button>
                
                <button
                  onClick={handleNegativeFeedback}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  <ThumbsDown size={20} />
                  {t[lang].incorrect}
                </button>
              </div>
            </div>
          ) : (
            /* 纠正选择 */
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t[lang].correction}:
              </p>
              
              <div className="space-y-2">
                {Object.entries(t[lang].commands).map(([key, label]) => (
                  key !== 'unknown' && (
                    <button
                      key={key}
                      onClick={() => setCorrectedCommand(key)}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                        correctedCommand === key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  )
                ))}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t[lang].cancel}
                </button>
                
                <button
                  onClick={handleCorrectionSubmit}
                  disabled={!correctedCommand || isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? '提交中...' : t[lang].submit}
                </button>
              </div>
            </div>
          )}

          {/* 感谢信息 */}
          {isSubmitting && (
            <div className="text-center py-2">
              <p className="text-green-600 dark:text-green-400 font-medium">
                {t[lang].thanks}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandFeedback;