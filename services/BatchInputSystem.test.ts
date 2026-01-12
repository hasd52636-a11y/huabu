import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchInputSystem, FileInput, BatchItem } from './BatchInputSystem';

// Mock File and FileReader for testing
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;

  constructor(content: string[], name: string, options: any = {}) {
    this.name = name;
    this.size = content.join('').length;
    this.type = options.type || 'text/plain';
    this.lastModified = options.lastModified || Date.now();
    this.content = content.join('');
  }
} as any;

global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  readAsText(file: any) {
    setTimeout(() => {
      this.result = file.content;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsDataURL(file: any) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,${btoa(file.content)}`;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
} as any;

describe('BatchInputSystem', () => {
  let batchInputSystem: BatchInputSystem;

  beforeEach(() => {
    batchInputSystem = new BatchInputSystem();
  });

  describe('Basic functionality', () => {
    it('should create batch input system with default options', () => {
      expect(batchInputSystem).toBeDefined();
    });

    it('should create batch input system with custom options', () => {
      const customSystem = new BatchInputSystem({
        delimiter: '---',
        maxFileSize: 1024 * 1024,
        sortBy: 'size'
      });
      expect(customSystem).toBeDefined();
    });

    it('should validate supported file formats', () => {
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const jpgFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const unsupportedFile = new File(['content'], 'test.exe', { type: 'application/exe' });

      expect(batchInputSystem.validateFileFormat(txtFile as any)).toBe(true);
      expect(batchInputSystem.validateFileFormat(jpgFile as any)).toBe(true);
      expect(batchInputSystem.validateFileFormat(unsupportedFile as any)).toBe(false);
    });

    it('should create batch items from file inputs', () => {
      const fileInputs: FileInput[] = [
        {
          name: 'test1.txt',
          path: 'test1.txt',
          type: 'text',
          content: 'Test content 1',
          size: 14
        },
        {
          name: 'test2.jpg',
          path: 'test2.jpg',
          type: 'image',
          content: 'data:image/jpeg;base64,abc',
          size: 100
        }
      ];

      const batchItems = batchInputSystem.createBatchItems(fileInputs);

      expect(batchItems).toHaveLength(2);
      expect(batchItems[0].name).toBe('test1.txt');
      expect(batchItems[0].status).toBe('pending');
      expect(batchItems[1].name).toBe('test2.jpg');
      expect(batchItems[1].input.type).toBe('image');
    });
  });

  describe('Text file parsing', () => {
    it('should parse text file with default delimiter', async () => {
      const content = 'Part 1\n******\nPart 2\n******\nPart 3';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const parts = await batchInputSystem.parseTextFile(file as any);

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('Part 1');
      expect(parts[1]).toBe('Part 2');
      expect(parts[2]).toBe('Part 3');
    });

    it('should parse text file with custom delimiter', async () => {
      const content = 'Part 1\n---\nPart 2\n---\nPart 3';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const parts = await batchInputSystem.parseTextFile(file as any, '---');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('Part 1');
      expect(parts[1]).toBe('Part 2');
      expect(parts[2]).toBe('Part 3');
    });

    it('should fall back to line splitting when no delimiter found', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const parts = await batchInputSystem.parseTextFile(file as any);

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('Line 1');
      expect(parts[1]).toBe('Line 2');
      expect(parts[2]).toBe('Line 3');
    });

    it('should filter out empty parts', async () => {
      const content = 'Part 1\n******\n\n******\nPart 2\n******\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const parts = await batchInputSystem.parseTextFile(file as any);

      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe('Part 1');
      expect(parts[1]).toBe('Part 2');
    });

    it('should create batch items from text file with multiple parts', async () => {
      const content = 'Prompt 1\n******\nPrompt 2\n******\nPrompt 3';
      const file = new File([content], 'prompts.txt', { type: 'text/plain' });

      const batchItems = await batchInputSystem.createBatchItemsFromTextFile(file as any);

      expect(batchItems).toHaveLength(3);
      expect(batchItems[0].name).toBe('prompts.txt_part_1');
      expect(batchItems[0].input.content).toBe('Prompt 1');
      expect(batchItems[1].name).toBe('prompts.txt_part_2');
      expect(batchItems[1].input.content).toBe('Prompt 2');
      expect(batchItems[2].name).toBe('prompts.txt_part_3');
      expect(batchItems[2].input.content).toBe('Prompt 3');
    });
  });

  describe('File processing', () => {
    it('should process FileList with mixed file types', async () => {
      const files = [
        new File(['Text content'], 'document.txt', { type: 'text/plain' }),
        new File(['Image content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['Unsupported'], 'document.pdf', { type: 'application/pdf' })
      ];

      // Mock FileList
      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this.item(i);
          }
        }
      } as any;

      // Add array-like access
      files.forEach((file, index) => {
        fileList[index] = file;
      });

      const result = await batchInputSystem.processFileList(fileList);

      expect(result.totalFiles).toBe(3);
      expect(result.supportedFiles).toBe(2);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toContain('document.pdf');
      expect(result.files).toHaveLength(2);
    });

    it('should handle file size limits', async () => {
      const smallSystem = new BatchInputSystem({ maxFileSize: 10 });
      const largeFile = new File(['This is a very long content that exceeds the limit'], 'large.txt');

      const fileList = {
        length: 1,
        0: largeFile,
        item: () => largeFile,
        [Symbol.iterator]: function* () { yield largeFile; }
      } as any;

      const result = await smallSystem.processFileList(fileList);

      expect(result.supportedFiles).toBe(0);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toContain('File too large');
    });
  });

  describe('Property 5: Batch Processing File Handling', () => {
    /**
     * Property 5: Batch Processing File Handling
     * For any valid input folder containing supported file types, the batch processor 
     * should successfully read and process each file according to its type (text or image).
     */
    it('should handle various file types correctly', async () => {
      const testCases = [
        {
          name: 'Text files with different extensions',
          files: [
            { name: 'prompt.txt', content: 'Text prompt', type: 'text/plain' },
            { name: 'readme.md', content: '# Markdown content', type: 'text/markdown' },
            { name: 'data.csv', content: 'col1,col2\nval1,val2', type: 'text/csv' }
          ]
        },
        {
          name: 'Image files with different formats',
          files: [
            { name: 'photo.jpg', content: 'jpeg-data', type: 'image/jpeg' },
            { name: 'icon.png', content: 'png-data', type: 'image/png' },
            { name: 'animation.gif', content: 'gif-data', type: 'image/gif' }
          ]
        },
        {
          name: 'Mixed file types',
          files: [
            { name: 'prompt.txt', content: 'Generate image', type: 'text/plain' },
            { name: 'reference.jpg', content: 'reference-image', type: 'image/jpeg' },
            { name: 'style.png', content: 'style-image', type: 'image/png' }
          ]
        },
        {
          name: 'Text files with delimiters',
          files: [
            { name: 'batch.txt', content: 'Prompt 1\n******\nPrompt 2\n******\nPrompt 3', type: 'text/plain' }
          ]
        }
      ];

      for (const testCase of testCases) {
        // Create mock FileList
        const mockFiles = testCase.files.map(f => new File([f.content], f.name, { type: f.type }));
        const fileList = {
          length: mockFiles.length,
          item: (index: number) => mockFiles[index],
          [Symbol.iterator]: function* () {
            for (let i = 0; i < this.length; i++) {
              yield this.item(i);
            }
          }
        } as any;

        mockFiles.forEach((file, index) => {
          fileList[index] = file;
        });

        // Process files
        const result = await batchInputSystem.processFileList(fileList);

        // Verify all supported files were processed
        expect(result.supportedFiles).toBe(testCase.files.length);
        expect(result.errors).toHaveLength(0);
        expect(result.files).toHaveLength(testCase.files.length);

        // Verify file types are correctly identified
        for (let i = 0; i < result.files.length; i++) {
          const processedFile = result.files[i];
          // Find the corresponding original file by name since order might change due to sorting
          const originalFile = testCase.files.find(f => f.name === processedFile.name);
          expect(originalFile).toBeDefined();

          if (originalFile!.type.startsWith('image/')) {
            expect(processedFile.type).toBe('image');
            expect(processedFile.content).toMatch(/^data:image/);
          } else {
            expect(processedFile.type).toBe('text');
            expect(processedFile.content).toBe(originalFile!.content);
          }
        }

        // For text files with delimiters, verify batch item creation
        if (testCase.name === 'Text files with delimiters') {
          const textFile = mockFiles[0];
          const batchItems = await batchInputSystem.createBatchItemsFromTextFile(textFile as any);
          
          expect(batchItems).toHaveLength(3);
          expect(batchItems[0].input.content).toBe('Prompt 1');
          expect(batchItems[1].input.content).toBe('Prompt 2');
          expect(batchItems[2].input.content).toBe('Prompt 3');
        }
      }
    });

    it('should maintain file order and organization', async () => {
      // Test file sorting by different criteria
      const files = [
        new File(['content'], 'z_file.txt', { type: 'text/plain', lastModified: 1000 }),
        new File(['longer content here'], 'a_file.txt', { type: 'text/plain', lastModified: 3000 }),
        new File(['short'], 'm_file.txt', { type: 'text/plain', lastModified: 2000 })
      ];

      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this.item(i);
          }
        }
      } as any;

      files.forEach((file, index) => {
        fileList[index] = file;
      });

      // Test sorting by name
      const nameSystem = new BatchInputSystem({ sortBy: 'name' });
      const nameResult = await nameSystem.processFileList(fileList);
      expect(nameResult.files.map(f => f.name)).toEqual(['a_file.txt', 'm_file.txt', 'z_file.txt']);

      // Test sorting by size
      const sizeSystem = new BatchInputSystem({ sortBy: 'size' });
      const sizeResult = await sizeSystem.processFileList(fileList);
      expect(sizeResult.files[0].name).toBe('a_file.txt'); // Largest file first

      // Test sorting by date
      const dateSystem = new BatchInputSystem({ sortBy: 'date' });
      const dateResult = await dateSystem.processFileList(fileList);
      expect(dateResult.files[0].name).toBe('a_file.txt'); // Most recent first
    });

    it('should handle edge cases and error conditions', async () => {
      const edgeCases = [
        {
          name: 'Empty files',
          files: [new File([''], 'empty.txt', { type: 'text/plain' })]
        },
        {
          name: 'Files with special characters',
          files: [new File(['content'], 'file with spaces & symbols!.txt', { type: 'text/plain' })]
        },
        {
          name: 'Very long filenames',
          files: [new File(['content'], 'a'.repeat(200) + '.txt', { type: 'text/plain' })]
        }
      ];

      for (const testCase of edgeCases) {
        const fileList = {
          length: testCase.files.length,
          item: (index: number) => testCase.files[index],
          [Symbol.iterator]: function* () {
            for (let i = 0; i < this.length; i++) {
              yield this.item(i);
            }
          }
        } as any;

        testCase.files.forEach((file, index) => {
          fileList[index] = file;
        });

        const result = await batchInputSystem.processFileList(fileList);

        // Should handle edge cases gracefully
        expect(result.supportedFiles).toBeGreaterThanOrEqual(0);
        expect(result.totalFiles).toBe(testCase.files.length);
      }
    });

    it('should provide accurate file statistics', async () => {
      const files = [
        new File(['small'], 'small.txt', { type: 'text/plain' }),
        new File(['medium content here'], 'medium.txt', { type: 'text/plain' }),
        new File(['image-data'], 'image.jpg', { type: 'image/jpeg' })
      ];

      const fileList = {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this.item(i);
          }
        }
      } as any;

      files.forEach((file, index) => {
        fileList[index] = file;
      });

      const result = await batchInputSystem.processFileList(fileList);
      const stats = batchInputSystem.getFileStatistics(result.files);

      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.textFiles).toBe(2);
      expect(stats.imageFiles).toBe(1);
      expect(stats.averageSize).toBe(stats.totalSize / 3);
      expect(stats.largestFile).toBeDefined();
      expect(stats.largestFile!.name).toBe('medium.txt'); // Should be the largest
    });
  });

  describe('File input helpers', () => {
    it('should create folder input element', () => {
      const input = BatchInputSystem.createFolderInput();
      
      expect(input.type).toBe('file');
      expect(input.multiple).toBe(true);
      expect(input.webkitdirectory).toBe(true);
    });

    it('should create file input element', () => {
      const input = BatchInputSystem.createFileInput('.txt,.jpg');
      
      expect(input.type).toBe('file');
      expect(input.multiple).toBe(true);
      expect(input.accept).toBe('.txt,.jpg');
    });

    it('should create file input without accept attribute', () => {
      const input = BatchInputSystem.createFileInput();
      
      expect(input.type).toBe('file');
      expect(input.multiple).toBe(true);
      expect(input.accept).toBe('');
    });
  });

  describe('Error handling', () => {
    it('should handle folder reading errors gracefully', async () => {
      const result = await batchInputSystem.readFolder('/nonexistent/path');
      
      expect(result.files).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not supported in browser');
    });

    it('should handle file processing errors', async () => {
      // Mock a file that will cause an error
      const errorFile = {
        name: 'error.txt',
        size: 100,
        type: 'text/plain',
        lastModified: Date.now()
      };

      // Mock FileReader to throw an error
      const originalFileReader = global.FileReader;
      global.FileReader = class MockErrorFileReader {
        readAsText() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Read error'));
          }, 0);
        }
      } as any;

      const fileList = {
        length: 1,
        0: errorFile,
        item: () => errorFile,
        [Symbol.iterator]: function* () { yield errorFile; }
      } as any;

      const result = await batchInputSystem.processFileList(fileList);

      expect(result.supportedFiles).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('error.txt');

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });
});