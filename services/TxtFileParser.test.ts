import { describe, it, expect } from 'vitest';
import { TxtFileParser, ParseOptions } from './TxtFileParser';

describe('TxtFileParser', () => {
  describe('parseContent', () => {
    it('should parse content with ****** separators', () => {
      const content = 'First prompt\n******\nSecond prompt\n******\nThird prompt';
      const result = TxtFileParser.parseContent(content);

      expect(result.parseMethod).toBe('separator');
      expect(result.totalFound).toBe(3);
      expect(result.validCount).toBe(3);
      expect(result.prompts).toHaveLength(3);
      expect(result.prompts[0].content).toBe('First prompt');
      expect(result.prompts[1].content).toBe('Second prompt');
      expect(result.prompts[2].content).toBe('Third prompt');
    });

    it('should fall back to line-based parsing when no separators found', () => {
      const content = 'First prompt\nSecond prompt\nThird prompt';
      const result = TxtFileParser.parseContent(content);

      expect(result.parseMethod).toBe('line-based');
      expect(result.totalFound).toBe(3);
      expect(result.validCount).toBe(3);
      expect(result.prompts).toHaveLength(3);
    });

    it('should handle empty content', () => {
      const result = TxtFileParser.parseContent('');
      
      expect(result.errors).toContain('Content is empty');
      expect(result.totalFound).toBe(0);
      expect(result.prompts).toHaveLength(0);
    });

    it('should filter out empty lines', () => {
      const content = 'First prompt\n\n\nSecond prompt\n   \nThird prompt';
      const result = TxtFileParser.parseContent(content);

      expect(result.totalFound).toBe(3);
      expect(result.validCount).toBe(3);
    });

    it('should validate prompt length', () => {
      const content = 'OK\n******\nThis is a valid prompt\n******\n' + 'x'.repeat(2001);
      const options: ParseOptions = {
        minPromptLength: 5,
        maxPromptLength: 2000
      };
      const result = TxtFileParser.parseContent(content, options);

      expect(result.totalFound).toBe(3);
      expect(result.validCount).toBe(1); // Only middle prompt is valid
      expect(result.invalidCount).toBe(2);
      expect(result.prompts[0].isValid).toBe(false); // Too short
      expect(result.prompts[1].isValid).toBe(true);  // Valid
      expect(result.prompts[2].isValid).toBe(false); // Too long
    });

    it('should limit batch size to maximum', () => {
      const prompts = Array.from({ length: 60 }, (_, i) => `Prompt ${i + 1}`);
      const content = prompts.join('\n******\n');
      const options: ParseOptions = { maxPrompts: 50 };
      const result = TxtFileParser.parseContent(content, options);

      expect(result.totalFound).toBe(60);
      expect(result.prompts).toHaveLength(50);
      expect(result.warnings).toContain('Batch size limited to 50 prompts (found 60)');
    });

    it('should handle various separator patterns', () => {
      const content = 'First\n******\nSecond\n*******\nThird\n**********\nFourth';
      const result = TxtFileParser.parseContent(content);

      expect(result.parseMethod).toBe('separator');
      expect(result.totalFound).toBe(4);
      expect(result.validCount).toBe(4);
    });

    it('should detect suspicious patterns', () => {
      const content = 'Valid prompt\n******\n***\n******\n---\n******\nAnother valid prompt';
      const result = TxtFileParser.parseContent(content);

      expect(result.totalFound).toBe(4);
      expect(result.validCount).toBe(2); // First and last prompts are valid
      expect(result.prompts[0].isValid).toBe(true);  // Valid prompt
      expect(result.prompts[1].isValid).toBe(false); // Only asterisks
      expect(result.prompts[2].isValid).toBe(false); // Only dashes
      expect(result.prompts[3].isValid).toBe(true);  // Another valid prompt
    });
  });

  describe('validatePrompt', () => {
    it('should validate individual prompts', () => {
      expect(TxtFileParser.validatePrompt('Valid prompt').isValid).toBe(true);
      expect(TxtFileParser.validatePrompt('').isValid).toBe(false);
      expect(TxtFileParser.validatePrompt('OK').isValid).toBe(false); // Too short
      expect(TxtFileParser.validatePrompt('***').isValid).toBe(false); // Suspicious pattern
    });
  });

  describe('getStatistics', () => {
    it('should calculate correct statistics', () => {
      const content = 'Valid prompt\n******\nOK\n******\nAnother valid prompt';
      const result = TxtFileParser.parseContent(content);
      const stats = TxtFileParser.getStatistics(result);

      expect(stats.totalPrompts).toBe(3);
      expect(stats.validPrompts).toBe(2);
      expect(stats.invalidPrompts).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.parseMethod).toBe('separator');
    });
  });
});