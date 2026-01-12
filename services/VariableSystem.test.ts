import { describe, it, expect } from 'vitest';
import { VariableSystem } from './VariableSystem';
import { BlockData } from '../types';

describe('VariableSystem', () => {
  let system: VariableSystem;

  beforeEach(() => {
    system = new VariableSystem();
  });

  describe('Basic functionality', () => {
    it('should parse variables correctly', () => {
      const prompt = 'Generate image based on [A01] with style [B02]';
      const variables = system.parseVariables(prompt);

      expect(variables).toHaveLength(2);
      expect(variables[0].variable).toBe('[A01]');
      expect(variables[0].blockNumber).toBe('A01');
      expect(variables[0].position).toEqual([24, 29]); // Fixed position
      expect(variables[1].variable).toBe('[B02]');
      expect(variables[1].blockNumber).toBe('B02');
      expect(variables[1].position).toEqual([41, 46]); // Fixed position
    });

    it('should resolve variables with context data', () => {
      const prompt = 'Create [A01] based on [B02]';
      const context: BlockData[] = [
        {
          blockId: 'block1',
          blockNumber: 'A01',
          content: 'a beautiful landscape',
          type: 'text',
          timestamp: Date.now()
        },
        {
          blockId: 'block2',
          blockNumber: 'B02',
          content: 'impressionist painting style',
          type: 'text',
          timestamp: Date.now()
        }
      ];

      const resolved = system.resolveVariables(prompt, context);
      expect(resolved).toBe('Create a beautiful landscape based on impressionist painting style');
    });

    it('should validate variables against available blocks', () => {
      const prompt = 'Use [A01] and [B02] and [C03]';
      const availableBlocks = ['A01', 'B02'];

      const errors = system.validateVariables(prompt, availableBlocks);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid_variable');
      expect(errors[0].message).toContain('C03');
    });

    it('should check if prompt has variables', () => {
      expect(system.hasVariables('No variables here')).toBe(false);
      expect(system.hasVariables('Has [A01] variable')).toBe(true);
      expect(system.hasVariables('Multiple [A01] and [B02] variables')).toBe(true);
    });

    it('should get unique variables', () => {
      const prompt = 'Use [A01] and [B02] and [A01] again';
      const unique = system.getUniqueVariables(prompt);
      expect(unique).toEqual(['A01', 'B02']);
    });
  });

  describe('Property 2: Variable Resolution Correctness', () => {
    /**
     * Property 2: Variable Resolution Correctness
     * For any prompt containing valid variable references, the resolved prompt should contain 
     * the actual content from referenced blocks, maintaining the original prompt structure.
     */
    it('should maintain prompt structure during variable resolution', () => {
      // Test various prompt structures and variable patterns
      const testCases = [
        {
          prompt: 'Simple [A01] replacement',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'test', type: 'text' as const, timestamp: 1 }],
          expected: 'Simple test replacement'
        },
        {
          prompt: '[A01] at the beginning',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'Starting', type: 'text' as const, timestamp: 1 }],
          expected: 'Starting at the beginning'
        },
        {
          prompt: 'At the end [A01]',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'ending', type: 'text' as const, timestamp: 1 }],
          expected: 'At the end ending'
        },
        {
          prompt: '[A01][B02][C03]',
          context: [
            { blockId: 'b1', blockNumber: 'A01', content: 'One', type: 'text' as const, timestamp: 1 },
            { blockId: 'b2', blockNumber: 'B02', content: 'Two', type: 'text' as const, timestamp: 2 },
            { blockId: 'b3', blockNumber: 'C03', content: 'Three', type: 'text' as const, timestamp: 3 }
          ],
          expected: 'OneTwoThree'
        },
        {
          prompt: 'Multiple [A01] references [A01] should work [A01]',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'SAME', type: 'text' as const, timestamp: 1 }],
          expected: 'Multiple SAME references SAME should work SAME'
        },
        {
          prompt: 'Mixed [A01] and [B02] with [A01] repeated',
          context: [
            { blockId: 'b1', blockNumber: 'A01', content: 'alpha', type: 'text' as const, timestamp: 1 },
            { blockId: 'b2', blockNumber: 'B02', content: 'beta', type: 'text' as const, timestamp: 2 }
          ],
          expected: 'Mixed alpha and beta with alpha repeated'
        },
        {
          prompt: 'Empty content [A01] handling',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: '', type: 'text' as const, timestamp: 1 }],
          expected: 'Empty content  handling'
        },
        {
          prompt: 'Special chars [A01] test',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: '!@#$%^&*()_+{}|:"<>?[]\\;\',./', type: 'text' as const, timestamp: 1 }],
          expected: 'Special chars !@#$%^&*()_+{}|:"<>?[]\\;\',./ test'
        },
        {
          prompt: 'Unicode [A01] support',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: '你好世界 🌍 émojis', type: 'text' as const, timestamp: 1 }],
          expected: 'Unicode 你好世界 🌍 émojis support'
        },
        {
          prompt: 'Newlines [A01] preserved',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'line1\nline2\nline3', type: 'text' as const, timestamp: 1 }],
          expected: 'Newlines line1\nline2\nline3 preserved'
        }
      ];

      testCases.forEach((testCase, index) => {
        const resolved = system.resolveVariables(testCase.prompt, testCase.context);
        expect(resolved).toBe(testCase.expected, `Test case ${index + 1} failed`);

        // Verify that variables were actually replaced
        const variables = system.parseVariables(testCase.prompt);
        if (variables.length > 0) {
          // Check that no original variable syntax remains in resolved text
          variables.forEach(variable => {
            const contextData = testCase.context.find(c => c.blockNumber === variable.blockNumber);
            if (contextData) {
              expect(resolved).toContain(contextData.content);
            }
          });
        }
      });
    });

    it('should handle missing variables gracefully', () => {
      const prompt = 'Available [A01] and missing [B02] variables';
      const context: BlockData[] = [
        { blockId: 'b1', blockNumber: 'A01', content: 'found', type: 'text', timestamp: 1 }
      ];

      const resolved = system.resolveVariables(prompt, context);
      // Missing variables should remain unchanged
      expect(resolved).toBe('Available found and missing [B02] variables');
    });

    it('should handle edge cases in variable resolution', () => {
      const edgeCases = [
        {
          name: 'Empty prompt',
          prompt: '',
          context: [],
          expected: ''
        },
        {
          name: 'No variables',
          prompt: 'No variables in this prompt',
          context: [],
          expected: 'No variables in this prompt'
        },
        {
          name: 'Invalid variable format',
          prompt: 'Invalid [A1] and [AB01] formats',
          context: [],
          expected: 'Invalid [A1] and [AB01] formats'
        },
        {
          name: 'Nested brackets',
          prompt: 'Nested [[A01]] brackets',
          context: [{ blockId: 'b1', blockNumber: 'A01', content: 'content', type: 'text' as const, timestamp: 1 }],
          expected: 'Nested [content] brackets'
        },
        {
          name: 'Very long content',
          prompt: 'Long [A01] content',
          context: [{ 
            blockId: 'b1', 
            blockNumber: 'A01', 
            content: 'A'.repeat(10000), 
            type: 'text' as const, 
            timestamp: 1 
          }],
          expected: `Long ${'A'.repeat(10000)} content`
        }
      ];

      edgeCases.forEach(testCase => {
        const resolved = system.resolveVariables(testCase.prompt, testCase.context);
        expect(resolved).toBe(testCase.expected, `Edge case "${testCase.name}" failed`);
      });
    });

    it('should maintain variable resolution consistency across multiple calls', () => {
      const prompt = 'Consistent [A01] and [B02] resolution';
      const context: BlockData[] = [
        { blockId: 'b1', blockNumber: 'A01', content: 'alpha', type: 'text', timestamp: 1 },
        { blockId: 'b2', blockNumber: 'B02', content: 'beta', type: 'image', timestamp: 2 }
      ];

      // Multiple calls should produce identical results
      const results = Array.from({ length: 100 }, () => 
        system.resolveVariables(prompt, context)
      );

      const expected = 'Consistent alpha and beta resolution';
      results.forEach((result, index) => {
        expect(result).toBe(expected, `Inconsistent result at call ${index + 1}`);
      });

      // Verify all results are identical
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });

    it('should handle concurrent variable resolution correctly', () => {
      const prompts = [
        'First [A01] prompt',
        'Second [B02] prompt', 
        'Third [C03] prompt',
        'Mixed [A01] and [B02] prompt'
      ];

      const contexts = [
        [{ blockId: 'b1', blockNumber: 'A01', content: 'first', type: 'text' as const, timestamp: 1 }],
        [{ blockId: 'b2', blockNumber: 'B02', content: 'second', type: 'text' as const, timestamp: 2 }],
        [{ blockId: 'b3', blockNumber: 'C03', content: 'third', type: 'text' as const, timestamp: 3 }],
        [
          { blockId: 'b1', blockNumber: 'A01', content: 'first', type: 'text' as const, timestamp: 1 },
          { blockId: 'b2', blockNumber: 'B02', content: 'second', type: 'text' as const, timestamp: 2 }
        ]
      ];

      const expected = [
        'First first prompt',
        'Second second prompt',
        'Third third prompt',
        'Mixed first and second prompt'
      ];

      // Simulate concurrent resolution
      const results = prompts.map((prompt, index) => 
        system.resolveVariables(prompt, contexts[index])
      );

      results.forEach((result, index) => {
        expect(result).toBe(expected[index], `Concurrent resolution failed for prompt ${index + 1}`);
      });
    });
  });

  describe('Utility functions', () => {
    it('should generate variable suggestions', () => {
      const availableBlocks = ['A01', 'B02', 'V01'];
      const suggestions = system.generateVariableSuggestions(availableBlocks);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].variable).toBe('[A01]');
      expect(suggestions[0].description).toContain('A01');
      expect(suggestions[0].example).toContain('[A01]');
    });

    it('should replace specific variables', () => {
      const prompt = 'Use [A01] and [B02] and [A01] again';
      const result = system.replaceVariable(prompt, 'A01', 'REPLACED');
      expect(result).toBe('Use REPLACED and [B02] and REPLACED again');
    });

    it('should escape variable content', () => {
      const content = 'Content with [brackets] and special chars';
      const escaped = system.escapeVariableContent(content);
      expect(escaped).toBe('Content with (brackets) and special chars');
    });

    it('should validate variable syntax', () => {
      expect(system.isValidVariableSyntax('[A01]')).toBe(true);
      expect(system.isValidVariableSyntax('[B99]')).toBe(true);
      expect(system.isValidVariableSyntax('[V01]')).toBe(true);
      expect(system.isValidVariableSyntax('[A1]')).toBe(false);
      expect(system.isValidVariableSyntax('[AB01]')).toBe(false);
      expect(system.isValidVariableSyntax('A01')).toBe(false);
      expect(system.isValidVariableSyntax('[a01]')).toBe(false);
    });

    it('should extract block numbers', () => {
      expect(system.extractBlockNumber('[A01]')).toBe('A01');
      expect(system.extractBlockNumber('[B99]')).toBe('B99');
      expect(system.extractBlockNumber('[invalid]')).toBe(null);
      expect(system.extractBlockNumber('A01')).toBe(null);
    });
  });
});