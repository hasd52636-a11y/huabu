import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Files, Clock, Calendar, Info } from 'lucide-react';
import { BatchInputSource, DelimitedFileSource, MultipleFilesSource } from '../types';
import { EnhancedBatchUploadHandler } from '../services/EnhancedBatchUploadHandler';

// 简化的定时配置
interface SimpleScheduleConfig {
  enabled: boolean;
  startTime: string; // HH:MM 格式
  repeatInterval: 'once' | 'hourly' | 'daily' | 'weekly';
  repeatCount?: number; // 重复次数，可选
  description?: string;
}

interface BatchInputConfigModalProps {
  isOpen: boolean;
  onConfigComplete: (source: BatchInputSource, scheduleConfig?: SimpleScheduleConfig) => void;
  onCancel: () => void;
  lang: 'zh' | 'en';
}

const BatchInputConfigModal: React.FC<BatchInputConfigModalProps> = ({
  isOpen,
  onConfigComplete,
  onCancel,
  lang
}) => {
  const [inputType, setInputType] = useState<'multiple_files' | 'delimited_file'>('multiple_files');
  const [delimiter, setDelimiter] = useState('******');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [hasHeader, setHasHeader] = useState(false);
  const [contentColumn, setContentColumn] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [delimitedFile, setDelimitedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  
  // 文本模块支持的文件类型（与BlockComponent保持一致）
  const textFileTypes = ".txt,.md,.js,.ts,.tsx,.json,.css,.html,.doc,.docx,.pdf";
  
  // 简化的定时配置状态
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [repeatInterval, setRepeatInterval] = useState<'once' | 'hourly' | 'daily' | 'weekly'>('once');
  const [repeatCount, setRepeatCount] = useState(1);
  const [scheduleDescription, setScheduleDescription] = useState('');

  const multipleFilesInputRef = useRef<HTMLInputElement>(null);
  const delimitedFileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    zh: {
      title: '批量数据输入配置',
      multipleFiles: '多文件上传',
      delimitedFile: '分隔符文件',
      selectFiles: '选择文件',
      selectDelimitedFile: '选择分隔符文件',
      delimiter: '分隔符',
      customDelimiter: '自定义分隔符',
      hasHeader: '包含标题行',
      contentColumn: '内容列',
      filesSelected: '个文件已选择',
      fileSelected: '文件已选择',
      maxFiles: '最多100个文件',
      maxFileSize: '每个文件最大5MB',
      supportedFormats: '支持格式',
      textFormats: 'TXT, MD, JSON等',
      imageFormats: 'JPG, PNG, GIF等',
      process: '处理',
      cancel: '取消',
      // 定时设置
      scheduleSettings: '定时设置',
      enableSchedule: '启用定时执行',
      startTime: '开始时间',
      repeatInterval: '重复间隔',
      repeatCount: '重复次数',
      scheduleDescription: '任务描述',
      once: '仅执行一次',
      hourly: '每小时',
      daily: '每天',
      weekly: '每周',
      optional: '可选，留空表示无限制',
      times: '次',
      processing: '处理中...',
      newline: '换行符',
      semicolon: '分号',
      comma: '逗号',
      pipe: '竖线',
      custom: '自定义'
    },
    en: {
      title: 'Batch Input Configuration',
      multipleFiles: 'Multiple Files',
      delimitedFile: 'Delimited File',
      selectFiles: 'Select Files',
      selectDelimitedFile: 'Select Delimited File',
      delimiter: 'Delimiter',
      customDelimiter: 'Custom Delimiter',
      hasHeader: 'Has Header Row',
      contentColumn: 'Content Column',
      filesSelected: ' files selected',
      fileSelected: ' file selected',
      maxFiles: 'Max 100 files',
      maxFileSize: 'Max 5MB per file',
      supportedFormats: 'Supported Formats',
      textFormats: 'TXT, MD, JSON, etc.',
      imageFormats: 'JPG, PNG, GIF, etc.',
      process: 'Process',
      cancel: 'Cancel',
      // Schedule settings
      scheduleSettings: 'Schedule Settings',
      enableSchedule: 'Enable Scheduled Execution',
      startTime: 'Start Time',
      repeatInterval: 'Repeat Interval',
      repeatCount: 'Repeat Count',
      scheduleDescription: 'Task Description',
      once: 'Execute Once',
      hourly: 'Hourly',
      daily: 'Daily',
      weekly: 'Weekly',
      optional: 'Optional, leave empty for unlimited',
      times: 'times',
      processing: 'Processing...',
      newline: 'Newline',
      semicolon: 'Semicolon',
      comma: 'Comma',
      pipe: 'Pipe',
      custom: 'Custom'
    }
  }[lang];

  const delimiterOptions = [
    { value: '&&&&&&', label: '&&&&&&' },
    { value: '######', label: '######' },
    { value: '******', label: '******' },
    { value: 'custom', label: t.custom }
  ];

  // 读取并解析分隔符文件，计算内容数量
  const parseDelimitedFile = async (file: File) => {
    try {
      const text = await file.text();
      const finalDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
      if (!finalDelimiter) {
        setContentCount(0);
        return;
      }
      
      // 按分隔符分割内容
      const contentItems = text.split(finalDelimiter).filter(item => item.trim() !== '');
      setContentCount(contentItems.length);
    } catch (error) {
      console.error('Failed to parse delimited file:', error);
      setContentCount(0);
    }
  };

  const handleMultipleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    // 多文件上传：文件数量等于内容数量
    setFileCount(files.length);
    setContentCount(files.length);
  };

  const handleDelimitedFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setDelimitedFile(file || null);
    // 分隔符文件：文件数量为1
    setFileCount(file ? 1 : 0);
    
    // 解析文件内容，计算内容数量
    if (file) {
      parseDelimitedFile(file);
    } else {
      setContentCount(0);
    }
  };

  // 当分隔符变化或文件变化时，重新解析文件
  useEffect(() => {
    if (delimitedFile) {
      parseDelimitedFile(delimitedFile);
    }
  }, [delimiter, customDelimiter, delimitedFile]);

  const handleProcess = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      let source: BatchInputSource;

      if (inputType === 'multiple_files') {
        if (selectedFiles.length === 0) {
          alert(lang === 'zh' ? '请选择文件' : 'Please select files');
          return;
        }

        source = {
          type: 'multiple_files',
          source: {
            files: selectedFiles,
            maxFileSize: 5 * 1024 * 1024, // 5MB
            maxFileCount: 100
          } as MultipleFilesSource
        };
      } else {
        if (!delimitedFile) {
          alert(lang === 'zh' ? '请选择分隔符文件' : 'Please select delimited file');
          return;
        }

        const finalDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
        if (!finalDelimiter) {
          alert(lang === 'zh' ? '请输入自定义分隔符' : 'Please enter custom delimiter');
          return;
        }

        source = {
          type: 'delimited_file',
          source: {
            file: delimitedFile,
            delimiter: finalDelimiter,
            contentColumn: hasHeader ? contentColumn : undefined,
            hasHeader
          } as DelimitedFileSource
        };
      }

      // 构建定时配置（如果启用）
      let scheduleConfig: SimpleScheduleConfig | undefined;
      if (enableSchedule) {
        if (!startTime) {
          alert(lang === 'zh' ? '请设置开始时间' : 'Please set start time');
          return;
        }

        scheduleConfig = {
          enabled: true,
          startTime,
          repeatInterval,
          repeatCount: repeatInterval === 'once' ? 1 : (repeatCount || undefined),
          description: scheduleDescription || undefined
        };
      }

      onConfigComplete(source, scheduleConfig);
    } catch (error) {
      console.error('Failed to process batch input:', error);
      alert(lang === 'zh' ? '处理失败' : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setDelimitedFile(null);
    setDelimiter('******');
    setCustomDelimiter('');
    setHasHeader(false);
    setContentColumn(0);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Type Selection */}
          <div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setInputType('multiple_files')}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  inputType === 'multiple_files'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Files size={20} />
                <span className="font-medium">{t.multipleFiles}</span>
              </button>
              <button
                onClick={() => setInputType('delimited_file')}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  inputType === 'delimited_file'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <FileText size={20} />
                <span className="font-medium">{t.delimitedFile}</span>
              </button>
            </div>
          </div>

          {/* Multiple Files Configuration */}
          {inputType === 'multiple_files' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => multipleFilesInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-blue-500 transition-colors"
                >
                  <Upload size={20} />
                  <span>{t.selectFiles}</span>
                </button>
                <input
                  ref={multipleFilesInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleMultipleFilesSelect}
                  accept={`${textFileTypes},image/*,video/*`}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {selectedFiles.length}{t.filesSelected}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {lang === 'zh' ? `识别到 ${contentCount} 个内容` : `Identified ${contentCount} items`}
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>• {t.maxFiles}</p>
                <p>• {t.maxFileSize}</p>
                <p>• {t.supportedFormats}: {t.textFormats}, {t.imageFormats}</p>
                <p>• {lang === 'zh' ? `文本支持格式: ${textFileTypes.replace(/\./g, ', ').slice(1)}` : `Text formats: ${textFileTypes.replace(/\./g, ', ').slice(1)}`}</p>
              </div>
            </div>
          )}

          {/* Delimited File Configuration */}
          {inputType === 'delimited_file' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => delimitedFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-blue-500 transition-colors"
                >
                  <Upload size={20} />
                  <span>{t.selectDelimitedFile}</span>
                </button>
                <input
                  ref={delimitedFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleDelimitedFileSelect}
                  accept=".txt,.csv,.tsv"
                />
              </div>

              {delimitedFile && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {delimitedFile.name}{t.fileSelected}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {lang === 'zh' ? `识别到 ${contentCount} 个内容` : `Identified ${contentCount} items`}
                  </p>
                </div>
              )}

              {/* Delimiter Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.delimiter}
                </label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {delimiterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {delimiter === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.customDelimiter}
                  </label>
                  <input
                    type="text"
                    value={customDelimiter}
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter custom delimiter"
                  />
                </div>
              )}

              {/* Header Options */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasHeader"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="hasHeader" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.hasHeader}
                </label>
              </div>

              {hasHeader && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.contentColumn}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={contentColumn}
                    onChange={(e) => setContentColumn(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 定时设置 */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t.scheduleSettings}
            </h3>
          </div>

          {/* 变量使用说明 */}
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {lang === 'zh' ? '变量使用说明' : 'Variable Usage Guide'}
              </span>
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
              <div>
                <strong>{lang === 'zh' ? '批量数据变量：' : 'Batch Data Variables:'}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-2">
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{data}'}</code> - {lang === 'zh' ? '批量数据内容' : 'Batch data content'}</div>
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{index}'}</code> - {lang === 'zh' ? '当前序号' : 'Current index'}</div>
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{total}'}</code> - {lang === 'zh' ? '总数量' : 'Total count'}</div>
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{progress}'}</code> - {lang === 'zh' ? '进度百分比' : 'Progress %'}</div>
              </div>
              <div className="mt-2">
                <strong>{lang === 'zh' ? '节点间变量：' : 'Node Variables:'}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-2">
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{previous}'}</code> - {lang === 'zh' ? '前一节点输出' : 'Previous node output'}</div>
                <div><code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">{'{date}'}</code> - {lang === 'zh' ? '当前日期' : 'Current date'}</div>
              </div>
              <div className="mt-2 text-xs">
                <strong>{lang === 'zh' ? '示例：' : 'Example:'}</strong> 
                <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded ml-1">
                  {lang === 'zh' ? '根据 {data} 生成第 {index} 张图片' : 'Generate image {index} based on {data}'}
                </code>
              </div>
            </div>
          </div>

          {/* 启用定时执行 */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableSchedule}
                onChange={(e) => setEnableSchedule(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.enableSchedule}
              </span>
            </label>
          </div>

          {enableSchedule && (
            <div className="space-y-4 pl-7">
              {/* 开始时间和重复间隔在一行 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 开始时间 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.startTime}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 重复间隔 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.repeatInterval}
                  </label>
                  <select
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="once">{t.once}</option>
                    <option value="hourly">{t.hourly}</option>
                    <option value="daily">{t.daily}</option>
                    <option value="weekly">{t.weekly}</option>
                  </select>
                </div>
              </div>

              {/* 重复次数（非一次性执行时显示） */}
              {repeatInterval !== 'once' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.repeatCount}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                    placeholder="留空表示无限制"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t.optional}
                  </p>
                </div>
              )}

              {/* 任务描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.scheduleDescription}
                </label>
                <input
                  type="text"
                  value={scheduleDescription}
                  onChange={(e) => setScheduleDescription(e.target.value)}
                  placeholder="例如：每日数据处理任务"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing || (inputType === 'multiple_files' ? selectedFiles.length === 0 : !delimitedFile)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.processing}
              </>
            ) : (
              t.process
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchInputConfigModal;