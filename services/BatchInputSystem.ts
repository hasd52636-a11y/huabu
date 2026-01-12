export interface FileInput {
  name: string;
  path: string;
  type: 'text' | 'image';
  content: string | ArrayBuffer;
  size: number;
  lastModified?: number;
}

export interface BatchItem {
  id: string;
  name: string;
  input: FileInput;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  processedAt?: Date;
}

export interface BatchInputOptions {
  delimiter?: string; // For text file splitting (default: '******')
  supportedImageTypes?: string[]; // Supported image extensions
  supportedTextTypes?: string[]; // Supported text extensions
  maxFileSize?: number; // Maximum file size in bytes
  sortBy?: 'name' | 'date' | 'size'; // File sorting order
}

export interface FolderReadResult {
  files: FileInput[];
  totalFiles: number;
  supportedFiles: number;
  skippedFiles: string[];
  errors: string[];
}

export class BatchInputSystem {
  private readonly defaultOptions: BatchInputOptions = {
    delimiter: '******',
    supportedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    supportedTextTypes: ['.txt', '.md', '.csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    sortBy: 'name'
  };

  constructor(private options: BatchInputOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Read all supported files from a folder
   */
  async readFolder(folderPath: string): Promise<FolderReadResult> {
    try {
      // In a browser environment, we can't directly read folders
      // This would need to be implemented using File System Access API
      // or file input with webkitdirectory attribute
      throw new Error('Direct folder reading not supported in browser environment. Use file input with directory selection.');
    } catch (error) {
      return {
        files: [],
        totalFiles: 0,
        supportedFiles: 0,
        skippedFiles: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Process files from a FileList (from input[type="file"])
   */
  async processFileList(fileList: FileList): Promise<FolderReadResult> {
    const files: FileInput[] = [];
    const skippedFiles: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      try {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
          skippedFiles.push(`${file.name}: ${validation.reason}`);
          continue;
        }

        // Process file based on type
        const fileInput = await this.processFile(file);
        files.push(fileInput);
      } catch (error) {
        errors.push(`Error processing ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Sort files according to options
    this.sortFiles(files);

    return {
      files,
      totalFiles: fileList.length,
      supportedFiles: files.length,
      skippedFiles,
      errors
    };
  }

  /**
   * Parse text file content into multiple items
   */
  async parseTextFile(file: File, delimiter?: string): Promise<string[]> {
    const content = await this.readFileAsText(file);
    const actualDelimiter = delimiter || this.options.delimiter || '******';
    
    // Split by delimiter and clean up
    const parts = content.split(actualDelimiter)
      .map(part => part.trim())
      .filter(part => part.length > 0);

    // If no delimiter found, split by lines as fallback
    if (parts.length === 1 && !content.includes(actualDelimiter)) {
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }

    return parts;
  }

  /**
   * Validate file format and size
   */
  validateFileFormat(file: File): boolean {
    return this.validateFile(file).isValid;
  }

  /**
   * Create batch items from file inputs
   */
  createBatchItems(inputs: FileInput[]): BatchItem[] {
    return inputs.map((input, index) => ({
      id: `batch_${Date.now()}_${index}`,
      name: input.name,
      input,
      status: 'pending' as const
    }));
  }

  /**
   * Create batch items from text file with multiple entries
   */
  async createBatchItemsFromTextFile(file: File, delimiter?: string): Promise<BatchItem[]> {
    const textParts = await this.parseTextFile(file, delimiter);
    
    return textParts.map((text, index) => ({
      id: `text_batch_${Date.now()}_${index}`,
      name: `${file.name}_part_${index + 1}`,
      input: {
        name: `${file.name}_part_${index + 1}`,
        path: file.name,
        type: 'text' as const,
        content: text,
        size: new Blob([text]).size,
        lastModified: file.lastModified
      },
      status: 'pending' as const
    }));
  }

  /**
   * Get file statistics
   */
  getFileStatistics(files: FileInput[]): {
    totalSize: number;
    textFiles: number;
    imageFiles: number;
    averageSize: number;
    largestFile: FileInput | null;
  } {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const textFiles = files.filter(f => f.type === 'text').length;
    const imageFiles = files.filter(f => f.type === 'image').length;
    const averageSize = files.length > 0 ? totalSize / files.length : 0;
    const largestFile = files.reduce((largest, file) => 
      !largest || file.size > largest.size ? file : largest, null as FileInput | null);

    return {
      totalSize,
      textFiles,
      imageFiles,
      averageSize,
      largestFile
    };
  }

  /**
   * Process a single file
   */
  private async processFile(file: File): Promise<FileInput> {
    const fileExtension = this.getFileExtension(file.name);
    const isImage = this.options.supportedImageTypes?.includes(fileExtension) || false;
    const isText = this.options.supportedTextTypes?.includes(fileExtension) || false;

    let content: string | ArrayBuffer;
    let type: 'text' | 'image';

    if (isImage) {
      content = await this.readFileAsDataURL(file);
      type = 'image';
    } else if (isText) {
      content = await this.readFileAsText(file);
      type = 'text';
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    return {
      name: file.name,
      path: file.name, // In browser, we don't have full path
      type,
      content,
      size: file.size,
      lastModified: file.lastModified
    };
  }

  /**
   * Validate file against options
   */
  private validateFile(file: File): { isValid: boolean; reason?: string } {
    // Check file size
    if (this.options.maxFileSize && file.size > this.options.maxFileSize) {
      return {
        isValid: false,
        reason: `File too large (${this.formatFileSize(file.size)} > ${this.formatFileSize(this.options.maxFileSize)})`
      };
    }

    // Check file type
    const extension = this.getFileExtension(file.name);
    const supportedTypes = [
      ...(this.options.supportedImageTypes || []),
      ...(this.options.supportedTextTypes || [])
    ];

    if (!supportedTypes.includes(extension)) {
      return {
        isValid: false,
        reason: `Unsupported file type: ${extension}`
      };
    }

    return { isValid: true };
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Read file as data URL (for images)
   */
  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  /**
   * Sort files according to options
   */
  private sortFiles(files: FileInput[]): void {
    switch (this.options.sortBy) {
      case 'name':
        files.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        files.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
        break;
      case 'size':
        files.sort((a, b) => b.size - a.size);
        break;
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Create file input element for folder selection
   */
  static createFolderInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = true; // Enable folder selection
    return input;
  }

  /**
   * Create file input element for multiple file selection
   */
  static createFileInput(accept?: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (accept) {
      input.accept = accept;
    }
    return input;
  }
}