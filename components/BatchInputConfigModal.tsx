import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Files } from 'lucide-react';
import { BatchInputSource, DelimitedFileSource, MultipleFilesSource } from '../types';
import { EnhancedBatchUploadHandler } from '../services/EnhancedBatchUploadHandler';

interface BatchInputConfigModalProps {
  isOpen: boolean;
  onConfigComplete: (source: BatchInputSource) => void;
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

  const handleMultipleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleDelimitedFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setDelimitedFile(file || null);
  };

  const handleProcess = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (inputType === 'multiple_files') {
        if (selectedFiles.length === 0) {
          alert(lang === 'zh' ? '请选择文件' : 'Please select files');
          return;
        }

        const source: BatchInputSource = {
          type: 'multiple_files',
          source: {
            files: selectedFiles,
            maxFileSize: 5 * 1024 * 1024, // 5MB
            maxFileCount: 100
          } as MultipleFilesSource
        };

        onConfigComplete(source);
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

        const source: BatchInputSource = {
          type: 'delimited_file',
          source: {
            file: delimitedFile,
            delimiter: finalDelimiter,
            contentColumn: hasHeader ? contentColumn : undefined,
            hasHeader
          } as DelimitedFileSource
        };

        onConfigComplete(source);
      }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  accept=".txt,.md,.js,.ts,.tsx,.json,.css,.html,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {selectedFiles.length}{t.filesSelected}
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>• {t.maxFiles}</p>
                <p>• {t.maxFileSize}</p>
                <p>• {t.supportedFormats}: {t.textFormats}, {t.imageFormats}</p>
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