import React, { useState, useRef } from 'react';
import { BatchInputSystem, FileInput, BatchItem, FolderReadResult } from '../services/BatchInputSystem';

interface BatchInputSelectorProps {
  onFilesSelected: (batchItems: BatchItem[]) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const BatchInputSelector: React.FC<BatchInputSelectorProps> = ({
  onFilesSelected,
  onError,
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileInput[]>([]);
  const [processingResult, setProcessingResult] = useState<FolderReadResult | null>(null);
  const [delimiter, setDelimiter] = useState('******');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const batchInputSystem = new BatchInputSystem({
    delimiter,
    sortBy
  });

  const handleFolderSelect = async () => {
    if (!folderInputRef.current) return;
    
    const input = BatchInputSystem.createFolderInput();
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        await processFiles(target.files);
      }
    };
    input.click();
  };

  const handleFileSelect = async () => {
    if (!fileInputRef.current) return;
    
    const input = BatchInputSystem.createFileInput('.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp,.md,.csv');
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        await processFiles(target.files);
      }
    };
    input.click();
  };

  const processFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    try {
      const result = await batchInputSystem.processFileList(fileList);
      setProcessingResult(result);
      setSelectedFiles(result.files);

      if (result.errors.length > 0) {
        onError(`Processing errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateBatchItems = async () => {
    if (selectedFiles.length === 0) {
      onError('No files selected');
      return;
    }

    try {
      let allBatchItems: BatchItem[] = [];

      for (const file of selectedFiles) {
        if (file.type === 'text') {
          // For text files, check if we should split them
          const fileObj = new File([file.content as string], file.name, {
            type: 'text/plain',
            lastModified: file.lastModified
          });
          
          const textParts = await batchInputSystem.parseTextFile(fileObj, delimiter);
          
          if (textParts.length > 1) {
            // Split text file into multiple batch items
            const textBatchItems = await batchInputSystem.createBatchItemsFromTextFile(fileObj, delimiter);
            allBatchItems.push(...textBatchItems);
          } else {
            // Single text item
            const batchItems = batchInputSystem.createBatchItems([file]);
            allBatchItems.push(...batchItems);
          }
        } else {
          // Image files - one item per file
          const batchItems = batchInputSystem.createBatchItems([file]);
          allBatchItems.push(...batchItems);
        }
      }

      onFilesSelected(allBatchItems);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to create batch items');
    }
  };

  const statistics = selectedFiles.length > 0 ? batchInputSystem.getFileStatistics(selectedFiles) : null;

  return (
    <div className="batch-input-selector">
      <div className="batch-input-header">
        <h3>批量输入设置</h3>
        <p>选择文件夹或文件进行批量处理</p>
      </div>

      {/* File Selection */}
      <div className="file-selection">
        <div className="selection-buttons">
          <button
            onClick={handleFolderSelect}
            disabled={disabled || isProcessing}
            className="btn btn-primary"
          >
            📁 选择文件夹
          </button>
          <button
            onClick={handleFileSelect}
            disabled={disabled || isProcessing}
            className="btn btn-secondary"
          >
            📄 选择文件
          </button>
        </div>

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>处理文件中...</span>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="batch-config">
        <div className="config-row">
          <label htmlFor="delimiter">文本分隔符:</label>
          <input
            id="delimiter"
            type="text"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            placeholder="例如: ******"
            disabled={disabled || isProcessing}
          />
        </div>

        <div className="config-row">
          <label htmlFor="sortBy">文件排序:</label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
            disabled={disabled || isProcessing}
          >
            <option value="name">按名称</option>
            <option value="date">按日期</option>
            <option value="size">按大小</option>
          </select>
        </div>
      </div>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="file-list">
          <h4>已选择的文件 ({selectedFiles.length})</h4>
          <div className="file-items">
            {selectedFiles.slice(0, 10).map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-icon">
                  {file.type === 'image' ? '🖼️' : '📄'}
                </span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
            {selectedFiles.length > 10 && (
              <div className="file-item more-files">
                ... 还有 {selectedFiles.length - 10} 个文件
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="file-statistics">
          <h4>文件统计</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">总大小:</span>
              <span className="stat-value">
                {(statistics.totalSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">文本文件:</span>
              <span className="stat-value">{statistics.textFiles}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">图片文件:</span>
              <span className="stat-value">{statistics.imageFiles}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均大小:</span>
              <span className="stat-value">
                {(statistics.averageSize / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Results */}
      {processingResult && (
        <div className="processing-results">
          <div className="result-summary">
            <span>✅ 成功处理: {processingResult.supportedFiles}</span>
            {processingResult.skippedFiles.length > 0 && (
              <span>⚠️ 跳过: {processingResult.skippedFiles.length}</span>
            )}
            {processingResult.errors.length > 0 && (
              <span>❌ 错误: {processingResult.errors.length}</span>
            )}
          </div>

          {processingResult.skippedFiles.length > 0 && (
            <details className="skipped-files">
              <summary>跳过的文件 ({processingResult.skippedFiles.length})</summary>
              <ul>
                {processingResult.skippedFiles.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Action Button */}
      {selectedFiles.length > 0 && (
        <div className="batch-actions">
          <button
            onClick={handleCreateBatchItems}
            disabled={disabled || isProcessing}
            className="btn btn-success btn-large"
          >
            创建批量任务 ({selectedFiles.length} 个文件)
          </button>
        </div>
      )}

      <style jsx>{`
        .batch-input-selector {
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
        }

        .batch-input-header {
          margin-bottom: 20px;
        }

        .batch-input-header h3 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .batch-input-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .file-selection {
          margin-bottom: 20px;
        }

        .selection-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #1e7e34;
        }

        .btn-large {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 14px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .batch-config {
          margin-bottom: 20px;
          padding: 16px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .config-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .config-row:last-child {
          margin-bottom: 0;
        }

        .config-row label {
          min-width: 100px;
          font-weight: 500;
          color: #333;
        }

        .config-row input,
        .config-row select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .file-list {
          margin-bottom: 20px;
        }

        .file-list h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .file-items {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: white;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .file-item:last-child {
          border-bottom: none;
        }

        .file-item.more-files {
          font-style: italic;
          color: #666;
          justify-content: center;
        }

        .file-icon {
          font-size: 16px;
        }

        .file-name {
          flex: 1;
          font-size: 14px;
          color: #333;
        }

        .file-size {
          font-size: 12px;
          color: #666;
        }

        .file-statistics {
          margin-bottom: 20px;
          padding: 16px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .file-statistics h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .processing-results {
          margin-bottom: 20px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .result-summary {
          display: flex;
          gap: 16px;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .skipped-files {
          margin-top: 8px;
        }

        .skipped-files summary {
          cursor: pointer;
          font-size: 14px;
          color: #666;
        }

        .skipped-files ul {
          margin: 8px 0 0 20px;
          font-size: 12px;
          color: #666;
        }

        .batch-actions {
          text-align: center;
        }
      `}</style>
    </div>
  );
};