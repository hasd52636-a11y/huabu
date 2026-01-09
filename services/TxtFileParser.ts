/**
 * TxtFileParser Service
 * 
 * Handles parsing of TXT files for batch video generation.
 * Supports both ****** separator parsing (primary) and line-based parsing (fallback).
 * Includes validation, sanitization, and batch size limits.
 */

export interface ParsedPrompt {
  id: string;
  content: string;
  originalIndex: number;
  isValid: boolean;
  validationError?: string;
}

export interface ParseResult {
  prompts: ParsedPrompt[];
  totalFound: number;
  validCount: number;
  invalidCount: number;
  parseMethod: 'separator' | 'line-based';
  errors: string[];
  warnings: string[];
}

export interface ParseOptions {
  maxPrompts?: number;
  minPromptLength?: number;
  maxPromptLength?: number;
  trimWhitespace?: boolean;
  filterEmptyLines?: boolean;
}

export class TxtFileParser {
  private static readonly DEFAULT_OPTIONS: Required<ParseOptions> = {
    maxPrompts: 50,
    minPromptLength: 5,
    maxPromptLength: 2000,
    trimWhitespace: true,
    filterEmptyLines: true
  };

  private static readonly SEPARATOR_PATTERN = /\*{6,}/; // 6 or more asterisks
  private static readonly ENCODING_PATTERNS = {
    UTF8_BOM: '\uFEFF',
    UTF16_BE_BOM: '\uFFFE',
    UTF16_LE_BOM: '\uFEFF'
  };

  /**
   * Parse a TXT file and extract video prompts
   */
  public static async parseFile(
    file: File, 
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: ParseResult = {
      prompts: [],
      totalFound: 0,
      validCount: 0,
      invalidCount: 0,
      parseMethod: 'separator',
      errors: [],
      warnings: []
    };

    try {
      // Read file content
      const content = await this.readFileContent(file);
      
      if (!content || content.trim().length === 0) {
        result.errors.push('File is empty or contains no readable content');
        return result;
      }

      // Clean content (remove BOM, normalize line endings)
      const cleanContent = this.cleanContent(content);

      // Parse content using appropriate method
      const rawPrompts = this.extractPrompts(cleanContent, result);

      // Process and validate prompts
      result.prompts = this.processPrompts(rawPrompts, opts, result);
      result.totalFound = rawPrompts.length;
      result.validCount = result.prompts.filter(p => p.isValid).length;
      result.invalidCount = result.prompts.filter(p => !p.isValid).length;

      // Apply batch size limits
      this.applyBatchLimits(result, opts);

      // Add warnings for common issues
      this.addWarnings(result, opts);

    } catch (error) {
      result.errors.push(`Failed to parse file: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Parse text content directly (for testing or direct usage)
   */
  public static parseContent(
    content: string,
    options: ParseOptions = {}
  ): ParseResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: ParseResult = {
      prompts: [],
      totalFound: 0,
      validCount: 0,
      invalidCount: 0,
      parseMethod: 'separator',
      errors: [],
      warnings: []
    };

    try {
      if (!content || content.trim().length === 0) {
        result.errors.push('Content is empty');
        return result;
      }

      const cleanContent = this.cleanContent(content);
      const rawPrompts = this.extractPrompts(cleanContent, result);

      result.prompts = this.processPrompts(rawPrompts, opts, result);
      result.totalFound = rawPrompts.length;
      result.validCount = result.prompts.filter(p => p.isValid).length;
      result.invalidCount = result.prompts.filter(p => !p.isValid).length;

      this.applyBatchLimits(result, opts);
      this.addWarnings(result, opts);

    } catch (error) {
      result.errors.push(`Failed to parse content: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Read file content with encoding detection
   */
  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content || '');
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Read as text with UTF-8 encoding
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Clean content by removing BOM and normalizing line endings
   */
  private static cleanContent(content: string): string {
    let cleaned = content;

    // Remove BOM if present
    Object.values(this.ENCODING_PATTERNS).forEach(bom => {
      if (cleaned.startsWith(bom)) {
        cleaned = cleaned.substring(bom.length);
      }
    });

    // Normalize line endings to \n
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return cleaned;
  }

  /**
   * Extract prompts using separator or line-based parsing
   */
  private static extractPrompts(content: string, result: ParseResult): string[] {
    // Try separator-based parsing first (primary method)
    if (this.SEPARATOR_PATTERN.test(content)) {
      result.parseMethod = 'separator';
      return content.split(this.SEPARATOR_PATTERN)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Fall back to line-based parsing
    result.parseMethod = 'line-based';
    return content.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Process and validate individual prompts
   */
  private static processPrompts(
    rawPrompts: string[],
    options: Required<ParseOptions>,
    result: ParseResult
  ): ParsedPrompt[] {
    return rawPrompts.map((content, index) => {
      const prompt: ParsedPrompt = {
        id: `prompt_${index}`,
        content: options.trimWhitespace ? content.trim() : content,
        originalIndex: index,
        isValid: true
      };

      // Validate prompt length
      if (prompt.content.length < options.minPromptLength) {
        prompt.isValid = false;
        prompt.validationError = `Prompt too short (minimum ${options.minPromptLength} characters)`;
      } else if (prompt.content.length > options.maxPromptLength) {
        prompt.isValid = false;
        prompt.validationError = `Prompt too long (maximum ${options.maxPromptLength} characters)`;
      }

      // Check for empty content after trimming
      if (options.filterEmptyLines && prompt.content.length === 0) {
        prompt.isValid = false;
        prompt.validationError = 'Empty prompt after trimming whitespace';
      }

      // Additional validation rules
      if (prompt.isValid) {
        // Check for suspicious patterns
        if (prompt.content.match(/^[\s\*\-_=]+$/)) {
          prompt.isValid = false;
          prompt.validationError = 'Prompt contains only whitespace or separator characters';
        }
      }

      return prompt;
    });
  }

  /**
   * Apply batch size limits
   */
  private static applyBatchLimits(result: ParseResult, options: Required<ParseOptions>): void {
    if (result.prompts.length > options.maxPrompts) {
      const originalCount = result.prompts.length;
      result.prompts = result.prompts.slice(0, options.maxPrompts);
      result.warnings.push(
        `Batch size limited to ${options.maxPrompts} prompts (found ${originalCount})`
      );
      
      // Recalculate counts after limiting
      result.validCount = result.prompts.filter(p => p.isValid).length;
      result.invalidCount = result.prompts.filter(p => !p.isValid).length;
    }
  }

  /**
   * Add warnings for common issues
   */
  private static addWarnings(result: ParseResult, options: Required<ParseOptions>): void {
    // Warn about invalid prompts
    if (result.invalidCount > 0) {
      result.warnings.push(
        `${result.invalidCount} prompts were invalid and will be skipped`
      );
    }

    // Warn about parsing method
    if (result.parseMethod === 'line-based' && result.totalFound > 10) {
      result.warnings.push(
        'Used line-based parsing. Consider using ****** separators for better control'
      );
    }

    // Warn about very short prompts
    const shortPrompts = result.prompts.filter(
      p => p.isValid && p.content.length < 20
    ).length;
    if (shortPrompts > 0) {
      result.warnings.push(
        `${shortPrompts} prompts are very short and may produce poor results`
      );
    }
  }

  /**
   * Utility method to validate a single prompt
   */
  public static validatePrompt(
    content: string,
    options: Partial<ParseOptions> = {}
  ): { isValid: boolean; error?: string } {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Prompt is empty' };
    }

    const trimmed = content.trim();
    
    if (trimmed.length < opts.minPromptLength) {
      return { isValid: false, error: `Prompt too short (minimum ${opts.minPromptLength} characters)` };
    }
    
    if (trimmed.length > opts.maxPromptLength) {
      return { isValid: false, error: `Prompt too long (maximum ${opts.maxPromptLength} characters)` };
    }
    
    if (trimmed.match(/^[\s\*\-_=]+$/)) {
      return { isValid: false, error: 'Prompt contains only whitespace or separator characters' };
    }

    return { isValid: true };
  }

  /**
   * Get statistics about parsing results
   */
  public static getStatistics(result: ParseResult): {
    totalPrompts: number;
    validPrompts: number;
    invalidPrompts: number;
    successRate: number;
    parseMethod: string;
    hasErrors: boolean;
    hasWarnings: boolean;
  } {
    return {
      totalPrompts: result.totalFound,
      validPrompts: result.validCount,
      invalidPrompts: result.invalidCount,
      successRate: result.totalFound > 0 ? (result.validCount / result.totalFound) * 100 : 0,
      parseMethod: result.parseMethod,
      hasErrors: result.errors.length > 0,
      hasWarnings: result.warnings.length > 0
    };
  }
}