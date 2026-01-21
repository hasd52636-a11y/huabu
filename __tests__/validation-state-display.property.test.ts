/**
 * Property-Based Tests for Validation State Display
 * 
 * Tests Property 10: Validation State Display
 * Validates: Requirements 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { 
  ParameterValidationResult,
  ParameterValidationError,
  ParameterValidationWarning
} from '../types';

/**
 * Mock ValidationStateDisplay class to test validation state display logic
 * This represents the UI component that would display validation states
 */
class ValidationStateDisplay {
  private validationResults: ParameterValidationResult[] = [];
  private theme: 'light' | 'dark' = 'light';

  setValidationResults(results: ParameterValidationResult[]): void {
    this.validationResults = results;
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  getErrorCount(): number {
    return this.validationResults.reduce((count, result) => count + result.errors.length, 0);
  }

  getWarningCount(): number {
    return this.validationResults.reduce((count, result) => count + result.warnings.length, 0);
  }

  hasErrors(): boolean {
    return this.getErrorCount() > 0;
  }

  hasWarnings(): boolean {
    return this.getWarningCount() > 0;
  }

  getOverallValidationState(): 'valid' | 'warning' | 'error' {
    if (this.hasErrors()) return 'error';
    if (this.hasWarnings()) return 'warning';
    return 'valid';
  }

  getValidationStateColor(): string {
    const state = this.getOverallValidationState();
    const isDark = this.theme === 'dark';
    
    switch (state) {
      case 'error':
        return isDark ? '#ef4444' : '#dc2626'; // red-500/red-600
      case 'warning':
        return isDark ? '#f59e0b' : '#d97706'; // amber-500/amber-600
      case 'valid':
        return isDark ? '#8b5cf6' : '#7c3aed'; // violet-500/violet-600 (purple theme)
      default:
        return isDark ? '#6b7280' : '#4b5563'; // gray-500/gray-600
    }
  }

  getValidationIcon(): string {
    const state = this.getOverallValidationState();
    
    switch (state) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'valid':
        return '✅';
      default:
        return '❓';
    }
  }

  getValidationMessage(): string {
    const errorCount = this.getErrorCount();
    const warningCount = this.getWarningCount();
    
    if (errorCount > 0) {
      return `${errorCount} error${errorCount > 1 ? 's' : ''} found`;
    }
    
    if (warningCount > 0) {
      return `${warningCount} warning${warningCount > 1 ? 's' : ''} found`;
    }
    
    return 'All parameters are valid';
  }

  getErrorMessages(): string[] {
    const messages: string[] = [];
    this.validationResults.forEach(result => {
      result.errors.forEach(error => {
        messages.push(`${error.parameterKey}: ${error.message}`);
      });
    });
    return messages;
  }

  getWarningMessages(): string[] {
    const messages: string[] = [];
    this.validationResults.forEach(result => {
      result.warnings.forEach(warning => {
        messages.push(`${warning.parameterKey}: ${warning.message}`);
      });
    });
    return messages;
  }

  getSuggestions(): string[] {
    const suggestions: string[] = [];
    this.validationResults.forEach(result => {
      result.warnings.forEach(warning => {
        if (warning.suggestion) {
          suggestions.push(warning.suggestion);
        }
      });
    });
    return [...new Set(suggestions)]; // Remove duplicates
  }

  shouldShowValidationBadge(): boolean {
    return this.hasErrors() || this.hasWarnings();
  }

  getValidationBadgeText(): string {
    const errorCount = this.getErrorCount();
    const warningCount = this.getWarningCount();
    
    if (errorCount > 0 && warningCount > 0) {
      return `${errorCount}E, ${warningCount}W`;
    } else if (errorCount > 0) {
      return `${errorCount}`;
    } else if (warningCount > 0) {
      return `${warningCount}`;
    }
    
    return '';
  }

  isValidationStateConsistent(): boolean {
    const state = this.getOverallValidationState();
    const hasErrors = this.hasErrors();
    const hasWarnings = this.hasWarnings();
    
    // Check consistency between state and actual error/warning counts
    if (state === 'error' && !hasErrors) return false;
    if (state === 'warning' && (hasErrors || !hasWarnings)) return false;
    if (state === 'valid' && (hasErrors || hasWarnings)) return false;
    
    return true;
  }
}

describe('Validation State Display Property Tests', () => {
  let display: ValidationStateDisplay;

  beforeEach(() => {
    display = new ValidationStateDisplay();
  });

  /**
   * Property 10: Validation State Display
   * **Validates: Requirements 7.2, 7.3, 7.4**
   * 
   * 验证状态显示的正确性和一致性
   */
  describe('Property 10: Validation State Display', () => {
    
    it('should display validation state consistently with error/warning counts', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            isValid: fc.boolean(),
            errors: fc.array(
              fc.record({
                parameterKey: fc.string({ minLength: 1 }),
                message: fc.string({ minLength: 1 }),
                code: fc.string({ minLength: 1 }),
                severity: fc.constantFrom('error', 'warning')
              }),
              { maxLength: 5 }
            ),
            warnings: fc.array(
              fc.record({
                parameterKey: fc.string({ minLength: 1 }),
                message: fc.string({ minLength: 1 }),
                suggestion: fc.option(fc.string({ minLength: 1 }))
              }),
              { maxLength: 5 }
            )
          }),
          { maxLength: 10 }
        ),
        (validationResults) => {
          display.setValidationResults(validationResults);
          
          // Property: 验证状态应与实际错误/警告数量一致
          expect(display.isValidationStateConsistent()).toBe(true);
          
          // Property: 错误计数应正确
          const expectedErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
          expect(display.getErrorCount()).toBe(expectedErrors);
          
          // Property: 警告计数应正确
          const expectedWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
          expect(display.getWarningCount()).toBe(expectedWarnings);
          
          // Property: 整体状态应正确反映错误和警告情况
          const overallState = display.getOverallValidationState();
          if (expectedErrors > 0) {
            expect(overallState).toBe('error');
          } else if (expectedWarnings > 0) {
            expect(overallState).toBe('warning');
          } else {
            expect(overallState).toBe('valid');
          }
        }
      ), { numRuns: 50 });
    });

    it('should provide appropriate colors for different validation states', () => {
      fc.assert(fc.property(
        fc.constantFrom('light', 'dark'),
        fc.record({
          hasErrors: fc.boolean(),
          hasWarnings: fc.boolean()
        }),
        (theme, { hasErrors, hasWarnings }) => {
          display.setTheme(theme);
          
          // 创建相应的验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (hasErrors) {
            validationResults.push({
              isValid: false,
              errors: [{
                parameterKey: 'test',
                message: 'Test error',
                code: 'TEST_ERROR',
                severity: 'error'
              }],
              warnings: []
            });
          }
          
          if (hasWarnings && !hasErrors) {
            validationResults.push({
              isValid: true,
              errors: [],
              warnings: [{
                parameterKey: 'test',
                message: 'Test warning'
              }]
            });
          }
          
          if (!hasErrors && !hasWarnings) {
            validationResults.push({
              isValid: true,
              errors: [],
              warnings: []
            });
          }
          
          display.setValidationResults(validationResults);
          
          const color = display.getValidationStateColor();
          
          // Property: 颜色应该是有效的十六进制颜色值
          expect(color).toMatch(/^#[0-9a-f]{6}$/i);
          
          // Property: 错误状态应使用红色系
          if (hasErrors) {
            expect(color.toLowerCase()).toMatch(/#(ef4444|dc2626)/);
          }
          
          // Property: 警告状态应使用琥珀色系
          if (hasWarnings && !hasErrors) {
            expect(color.toLowerCase()).toMatch(/#(f59e0b|d97706)/);
          }
          
          // Property: 有效状态应使用紫色系（主题色）
          if (!hasErrors && !hasWarnings) {
            expect(color.toLowerCase()).toMatch(/#(8b5cf6|7c3aed)/);
          }
        }
      ), { numRuns: 30 });
    });

    it('should provide appropriate icons for different validation states', () => {
      fc.assert(fc.property(
        fc.record({
          errorCount: fc.integer({ min: 0, max: 5 }),
          warningCount: fc.integer({ min: 0, max: 5 })
        }),
        ({ errorCount, warningCount }) => {
          // 创建验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (errorCount > 0) {
            validationResults.push({
              isValid: false,
              errors: Array(errorCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Error ${i}`,
                code: `ERROR_${i}`,
                severity: 'error' as const
              })),
              warnings: []
            });
          }
          
          if (warningCount > 0) {
            validationResults.push({
              isValid: errorCount === 0,
              errors: [],
              warnings: Array(warningCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Warning ${i}`
              }))
            });
          }
          
          display.setValidationResults(validationResults);
          
          const icon = display.getValidationIcon();
          
          // Property: 图标应该是有效的表情符号
          expect(typeof icon).toBe('string');
          expect(icon.length).toBeGreaterThan(0);
          
          // Property: 错误状态应显示错误图标
          if (errorCount > 0) {
            expect(icon).toBe('❌');
          }
          
          // Property: 仅警告状态应显示警告图标
          if (warningCount > 0 && errorCount === 0) {
            expect(icon).toBe('⚠️');
          }
          
          // Property: 有效状态应显示成功图标
          if (errorCount === 0 && warningCount === 0) {
            expect(icon).toBe('✅');
          }
        }
      ), { numRuns: 25 });
    });

    it('should generate appropriate validation messages', () => {
      fc.assert(fc.property(
        fc.record({
          errorCount: fc.integer({ min: 0, max: 10 }),
          warningCount: fc.integer({ min: 0, max: 10 })
        }),
        ({ errorCount, warningCount }) => {
          // 创建验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (errorCount > 0 || warningCount > 0) {
            validationResults.push({
              isValid: errorCount === 0,
              errors: Array(errorCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Error message ${i}`,
                code: `ERROR_${i}`,
                severity: 'error' as const
              })),
              warnings: Array(warningCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Warning message ${i}`
              }))
            });
          }
          
          display.setValidationResults(validationResults);
          
          const message = display.getValidationMessage();
          
          // Property: 消息应该是非空字符串
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
          
          // Property: 错误消息应包含错误数量
          if (errorCount > 0) {
            expect(message).toContain(errorCount.toString());
            expect(message.toLowerCase()).toContain('error');
          }
          
          // Property: 仅警告时消息应包含警告数量
          if (warningCount > 0 && errorCount === 0) {
            expect(message).toContain(warningCount.toString());
            expect(message.toLowerCase()).toContain('warning');
          }
          
          // Property: 无错误无警告时应显示成功消息
          if (errorCount === 0 && warningCount === 0) {
            expect(message.toLowerCase()).toContain('valid');
          }
        }
      ), { numRuns: 30 });
    });

    it('should correctly determine when to show validation badge', () => {
      fc.assert(fc.property(
        fc.record({
          hasErrors: fc.boolean(),
          hasWarnings: fc.boolean()
        }),
        ({ hasErrors, hasWarnings }) => {
          // 创建验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (hasErrors || hasWarnings) {
            validationResults.push({
              isValid: !hasErrors,
              errors: hasErrors ? [{
                parameterKey: 'test',
                message: 'Test error',
                code: 'TEST_ERROR',
                severity: 'error'
              }] : [],
              warnings: hasWarnings ? [{
                parameterKey: 'test',
                message: 'Test warning'
              }] : []
            });
          }
          
          display.setValidationResults(validationResults);
          
          const shouldShow = display.shouldShowValidationBadge();
          
          // Property: 只有在有错误或警告时才显示徽章
          expect(shouldShow).toBe(hasErrors || hasWarnings);
        }
      ), { numRuns: 20 });
    });

    it('should generate appropriate badge text', () => {
      fc.assert(fc.property(
        fc.record({
          errorCount: fc.integer({ min: 0, max: 99 }),
          warningCount: fc.integer({ min: 0, max: 99 })
        }),
        ({ errorCount, warningCount }) => {
          // 创建验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (errorCount > 0 || warningCount > 0) {
            validationResults.push({
              isValid: errorCount === 0,
              errors: Array(errorCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Error ${i}`,
                code: `ERROR_${i}`,
                severity: 'error' as const
              })),
              warnings: Array(warningCount).fill(null).map((_, i) => ({
                parameterKey: `param${i}`,
                message: `Warning ${i}`
              }))
            });
          }
          
          display.setValidationResults(validationResults);
          
          const badgeText = display.getValidationBadgeText();
          
          // Property: 徽章文本格式应正确
          if (errorCount > 0 && warningCount > 0) {
            expect(badgeText).toBe(`${errorCount}E, ${warningCount}W`);
          } else if (errorCount > 0) {
            expect(badgeText).toBe(errorCount.toString());
          } else if (warningCount > 0) {
            expect(badgeText).toBe(warningCount.toString());
          } else {
            expect(badgeText).toBe('');
          }
        }
      ), { numRuns: 25 });
    });

    it('should extract error and warning messages correctly', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            isValid: fc.boolean(),
            errors: fc.array(
              fc.record({
                parameterKey: fc.string({ minLength: 1, maxLength: 10 }),
                message: fc.string({ minLength: 1, maxLength: 50 }),
                code: fc.string({ minLength: 1 }),
                severity: fc.constantFrom('error', 'warning')
              }),
              { maxLength: 3 }
            ),
            warnings: fc.array(
              fc.record({
                parameterKey: fc.string({ minLength: 1, maxLength: 10 }),
                message: fc.string({ minLength: 1, maxLength: 50 }),
                suggestion: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
              }),
              { maxLength: 3 }
            )
          }),
          { maxLength: 5 }
        ),
        (validationResults) => {
          display.setValidationResults(validationResults);
          
          const errorMessages = display.getErrorMessages();
          const warningMessages = display.getWarningMessages();
          const suggestions = display.getSuggestions();
          
          // Property: 错误消息数量应正确
          const expectedErrorCount = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
          expect(errorMessages.length).toBe(expectedErrorCount);
          
          // Property: 警告消息数量应正确
          const expectedWarningCount = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);
          expect(warningMessages.length).toBe(expectedWarningCount);
          
          // Property: 每个错误消息应包含参数键和消息
          errorMessages.forEach(message => {
            expect(message).toContain(':');
            expect(message.length).toBeGreaterThan(0);
          });
          
          // Property: 每个警告消息应包含参数键和消息
          warningMessages.forEach(message => {
            expect(message).toContain(':');
            expect(message.length).toBeGreaterThan(0);
          });
          
          // Property: 建议应该去重
          const allSuggestions = validationResults.flatMap(result => 
            result.warnings.map(warning => warning.suggestion).filter(Boolean)
          );
          const uniqueSuggestions = [...new Set(allSuggestions)];
          expect(suggestions.length).toBe(uniqueSuggestions.length);
        }
      ), { numRuns: 20 });
    });

    it('should maintain theme consistency across all display elements', () => {
      fc.assert(fc.property(
        fc.constantFrom('light', 'dark'),
        fc.record({
          hasErrors: fc.boolean(),
          hasWarnings: fc.boolean()
        }),
        (theme, { hasErrors, hasWarnings }) => {
          display.setTheme(theme);
          
          // 创建验证结果
          const validationResults: ParameterValidationResult[] = [];
          
          if (hasErrors || hasWarnings) {
            validationResults.push({
              isValid: !hasErrors,
              errors: hasErrors ? [{
                parameterKey: 'test',
                message: 'Test error',
                code: 'TEST_ERROR',
                severity: 'error'
              }] : [],
              warnings: hasWarnings ? [{
                parameterKey: 'test',
                message: 'Test warning'
              }] : []
            });
          }
          
          display.setValidationResults(validationResults);
          
          const color = display.getValidationStateColor();
          const state = display.getOverallValidationState();
          
          // Property: 主题一致性 - 深色主题应使用较亮的颜色
          if (theme === 'dark') {
            if (state === 'error') {
              expect(color).toBe('#ef4444'); // 较亮的红色
            } else if (state === 'warning') {
              expect(color).toBe('#f59e0b'); // 较亮的琥珀色
            } else if (state === 'valid') {
              expect(color).toBe('#8b5cf6'); // 较亮的紫色
            }
          } else {
            if (state === 'error') {
              expect(color).toBe('#dc2626'); // 较深的红色
            } else if (state === 'warning') {
              expect(color).toBe('#d97706'); // 较深的琥珀色
            } else if (state === 'valid') {
              expect(color).toBe('#7c3aed'); // 较深的紫色
            }
          }
        }
      ), { numRuns: 15 });
    });
  });
});