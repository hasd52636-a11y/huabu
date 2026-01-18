/**
 * BatchInputSystem - 批量输入系统
 * 支持多种格式的批量数据输入：分隔文件（CSV, TXT）和多文件上传
 */

import { BatchInputSource, DelimitedFileSource, MultipleFilesSource, BatchItem } from '../types';

export interface ParsedBatchData {
  items: BatchItem[];
  totalCount: number;
  errors: string[];
  warnings: string[];
}

export interface BatchInputValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
}

export class BatchInputSystem {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
  private readonly MAX_FILE_COUNT = 100;
  private readonly MAX_BATCH_ITEMS = 1000;

  /**
   * Parse batch input source and extract items
   */
  async parseBatchInput(source: BatchInputSource, targetBlockId: string): Promise<ParsedBatchData> {
    const result: ParsedBatchData = {
      items: [],
      totalCount: 0,
      errors: [],
      warnings: []
    };

    try {
      if (source.type === 'delimited_file') {
        return await this.parseDelimitedFile(source.source as DelimitedFileSource, targetBlockId);
      } else if (source.type === 'multiple_files') {
        return await this.parseMultipleFiles(source.source as MultipleFilesSource, targetBlockId);
      } else {
        result.errors.push('Unknown batch input type');
        return result;
      }
    } catch (error) {
      result.errors.push(`Failed to parse batch input: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Parse delimited file (CSV, TXT with separators)
   */
  private async parseDelimitedFile(
    source: DelimitedFileSource,
    targetBlockId: string
  ): Promise<ParsedBatchData> {
    const result: ParsedBatchData = {
      items: [],
      totalCount: 0,
      errors: [],
      warnings: []
    };

    try {
      // Read file content
      const content = await this.readFileAsText(source.file);
      
      // Split by delimiter
      let lines: string[];
      if (source.delimiter === '\\n' || source.delimiter === 'newline') {
        lines = content.split(/\r?\n/);
      } else if (source.delimiter === ';') {
        lines = content.split(';');
      } else if (source.delimiter === ',') {
        // CSV parsing - handle quoted values
        lines = this.parseCSV(content, source.contentColumn);
      } else {
        lines = content.split(source.delimiter);
      }

      // Remove header if specified
      if (source.hasHeader && lines.length > 0) {
        lines.shift();
        result.warnings.push('Header row skipped');
      }

      // Filter empty lines
      lines = lines.filter(line => line.trim().length > 0);

      // Validate item count
      if (lines.length > this.MAX_BATCH_ITEMS) {
        result.warnings.push(`Batch size (${lines.length}) exceeds recommended limit (${this.MAX_BATCH_ITEMS}). Processing may be slow.`);
      }

      // Create batch items
      lines.forEach((line, index) => {
        const trimmedContent = line.trim();
        if (trimmedContent) {
          result.items.push({
            id: `batch_item_${Date.now()}_${index}`,
            content: trimmedContent,
            metadata: {
              fileName: source.file.name,
              lineNumber: source.hasHeader ? index + 2 : index + 1
            },
            type: 'text',
            targetBlockId
          });
        }
      });

      result.totalCount = result.items.length;

      if (result.totalCount === 0) {
        result.errors.push('No valid items found in file');
      }

    } catch (error) {
      result.errors.push(`Failed to parse delimited file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Parse CSV with proper handling of quoted values
   */
  private parseCSV(content: string, contentColumn?: number): string[] {
    const lines: string[] = [];
    const rows = content.split(/\r?\n/);

    for (const row of rows) {
      if (!row.trim()) continue;

      // Simple CSV parsing (handles quoted values)
      const columns: string[] = [];
      let currentColumn = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      columns.push(currentColumn.trim());

      // Extract content from specified column or use entire row
      if (contentColumn !== undefined && contentColumn < columns.length) {
        lines.push(columns[contentColumn]);
      } else {
        lines.push(columns.join(' '));
      }
    }

    return lines;
  }

  /**
   * Parse multiple files
   */
  private async parseMultipleFiles(
    source: MultipleFilesSource,
    targetBlockId: string
  ): Promise<ParsedBatchData> {
    const result: ParsedBatchData = {
      items: [],
      totalCount: 0,
      errors: [],
      warnings: []
    };

    try {
      // Validate file count
      if (source.files.length > source.maxFileCount) {
        result.errors.push(`File count (${source.files.length}) exceeds limit (${source.maxFileCount})`);
        return result;
      }

      // Process each file
      for (let i = 0; i < source.files.length; i++) {
        const file = source.files[i];

        // Validate file size
        if (file.size > source.maxFileSize) {
          result.warnings.push(`File "${file.name}" exceeds size limit (${this.formatFileSize(source.maxFileSize)}), skipped`);
          continue;
        }

        try {
          // Determine file type
          const fileType = this.detectFileType(file);

          if (fileType === 'text') {
            const content = await this.readFileAsText(file);
            result.items.push({
              id: `batch_item_${Date.now()}_${i}`,
              content: content.trim(),
              metadata: {
                fileName: file.name,
                folderPath: (file as any).webkitRelativePath || undefined
              },
              type: 'text',
              targetBlockId
            });
          } else if (fileType === 'image') {
            const base64 = await this.readFileAsBase64(file);
            result.items.push({
              id: `batch_item_${Date.now()}_${i}`,
              content: base64,
              metadata: {
                fileName: file.name,
                folderPath: (file as any).webkitRelativePath || undefined
              },
              type: 'image',
              targetBlockId
            });
          } else {
            result.warnings.push(`File "${file.name}" has unsupported type, skipped`);
          }
        } catch (error) {
          result.warnings.push(`Failed to process file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.totalCount = result.items.length;

      if (result.totalCount === 0) {
        result.errors.push('No valid files found');
      }

    } catch (error) {
      result.errors.push(`Failed to parse multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate batch input before processing
   */
  async validateBatchInput(source: BatchInputSource): Promise<BatchInputValidation> {
    const validation: BatchInputValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      itemCount: 0
    };

    try {
      if (source.type === 'delimited_file') {
        const delimitedSource = source.source as DelimitedFileSource;
        
        // Validate file
        if (!delimitedSource.file) {
          validation.errors.push('No file provided');
          validation.isValid = false;
          return validation;
        }

        // Validate file size
        if (delimitedSource.file.size > this.MAX_FILE_SIZE) {
          validation.errors.push(`File size (${this.formatFileSize(delimitedSource.file.size)}) exceeds limit (${this.formatFileSize(this.MAX_FILE_SIZE)})`);
          validation.isValid = false;
        }

        // Validate delimiter
        if (!delimitedSource.delimiter) {
          validation.errors.push('No delimiter specified');
          validation.isValid = false;
        }

        // Estimate item count
        const content = await this.readFileAsText(delimitedSource.file);
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        validation.itemCount = delimitedSource.hasHeader ? lines.length - 1 : lines.length;

        if (validation.itemCount === 0) {
          validation.errors.push('File appears to be empty');
          validation.isValid = false;
        }

        if (validation.itemCount > this.MAX_BATCH_ITEMS) {
          validation.warnings.push(`Item count (${validation.itemCount}) exceeds recommended limit (${this.MAX_BATCH_ITEMS})`);
        }

      } else if (source.type === 'multiple_files') {
        const multipleSource = source.source as MultipleFilesSource;
        
        // Validate file count
        if (!multipleSource.files || multipleSource.files.length === 0) {
          validation.errors.push('No files provided');
          validation.isValid = false;
          return validation;
        }

        if (multipleSource.files.length > multipleSource.maxFileCount) {
          validation.errors.push(`File count (${multipleSource.files.length}) exceeds limit (${multipleSource.maxFileCount})`);
          validation.isValid = false;
        }

        // Validate individual files
        let validFileCount = 0;
        for (const file of multipleSource.files) {
          if (file.size > multipleSource.maxFileSize) {
            validation.warnings.push(`File "${file.name}" exceeds size limit`);
          } else {
            validFileCount++;
          }
        }

        validation.itemCount = validFileCount;

        if (validFileCount === 0) {
          validation.errors.push('No valid files found');
          validation.isValid = false;
        }
      }

    } catch (error) {
      validation.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Get batch input preview (first N items)
   */
  async getPreview(source: BatchInputSource, maxItems: number = 5): Promise<string[]> {
    try {
      const parsed = await this.parseBatchInput(source, 'preview');
      return parsed.items.slice(0, maxItems).map(item => {
        if (item.type === 'text') {
          return item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '');
        } else {
          return `[Image: ${item.metadata?.fileName || 'unknown'}]`;
        }
      });
    } catch (error) {
      return [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Read file as base64
   */
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Detect file type
   */
  private detectFileType(file: File): 'text' | 'image' | 'unknown' {
    if (file.type.startsWith('text/')) {
      return 'text';
    } else if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return 'text';
    } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return 'image';
    }
    return 'unknown';
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Singleton instance
export const batchInputSystem = new BatchInputSystem();
