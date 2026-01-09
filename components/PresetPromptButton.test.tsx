import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import PresetPromptButton from './PresetPromptButton';

/**
 * Feature: my-prompt, Property 1: Button display state consistency
 * 
 * For any preset prompt selection state, the button should display appropriate text - 
 * either default placeholder text when no prompt is selected, or truncated prompt text 
 * when a prompt is selected
 * 
 * **Validates: Requirements 1.2, 1.3**
 */
describe('PresetPromptButton Display States', () => {
  const mockOnOpenModal = vi.fn();

  beforeEach(() => {
    mockOnOpenModal.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 1: Button display state consistency', () => {
    it('should display appropriate text based on selection state', () => {
      fc.assert(fc.property(
        fc.option(fc.string({ minLength: 0, maxLength: 100 })),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (selectedPrompt, theme, lang) => {
          cleanup(); // Clean up before each property test iteration
          
          const selectedPromptIndex = selectedPrompt && selectedPrompt.trim() ? 0 : null;
          
          render(
            <PresetPromptButton
              selectedPrompt={selectedPrompt}
              selectedPromptIndex={selectedPromptIndex}
              onOpenModal={mockOnOpenModal}
              theme={theme}
              lang={lang}
            />
          );

          const button = screen.getByRole('button');
          const buttonText = button.textContent || '';

          if (selectedPrompt && selectedPrompt.trim()) {
            // When a prompt is selected, should display prompt number
            expect(buttonText).toMatch(/^P\d+$/); // Should match pattern like "P1", "P2", etc.
            
            // Button should have selected styling (white text on amber background)
            expect(button).toHaveClass('text-white');
            expect(button).toHaveClass('bg-amber-500');
          } else {
            // When no prompt is selected, should display default text
            const expectedDefaultText = lang === 'zh' ? '我的提示词' : 'My Prompt';
            expect(buttonText).toContain(expectedDefaultText);
            
            // Button should have unselected styling (slate text)
            expect(button).toHaveClass('text-slate-400');
          }

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should provide tooltip for selected prompts', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Any non-empty string
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (prompt, theme, lang) => {
          cleanup(); // Clean up before each property test iteration
          
          render(
            <PresetPromptButton
              selectedPrompt={prompt}
              selectedPromptIndex={0}
              onOpenModal={mockOnOpenModal}
              theme={theme}
              lang={lang}
            />
          );

          const button = screen.getByRole('button');
          
          // Should have tooltip with full text when selected
          if (prompt.trim() && prompt.length > 20) {
            expect(button).toHaveAttribute('title', prompt.trim());
          }
          
          // Button text should show prompt number
          const buttonText = button.textContent || '';
          expect(buttonText).toMatch(/P\d+/);

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should not provide tooltip for unselected prompts', () => {
      fc.assert(fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (theme, lang) => {
          cleanup(); // Clean up before each property test iteration
          
          render(
            <PresetPromptButton
              selectedPrompt={null}
              selectedPromptIndex={null}
              onOpenModal={mockOnOpenModal}
              theme={theme}
              lang={lang}
            />
          );

          const button = screen.getByRole('button');
          
          // Should not have tooltip for unselected prompts
          expect(button).not.toHaveAttribute('title');
          
          // Button text should show default text
          const buttonText = button.textContent || '';
          const expectedDefaultText = lang === 'zh' ? '我的提示词' : 'My Prompt';
          expect(buttonText).toContain(expectedDefaultText);

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Button interaction', () => {
    it('should call onOpenModal when clicked', () => {
      fc.assert(fc.property(
        fc.option(fc.string()),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (selectedPrompt, theme, lang) => {
          cleanup(); // Clean up before each property test iteration
          
          const selectedPromptIndex = selectedPrompt && selectedPrompt.trim() ? 0 : null;
          
          render(
            <PresetPromptButton
              selectedPrompt={selectedPrompt}
              selectedPromptIndex={selectedPromptIndex}
              onOpenModal={mockOnOpenModal}
              theme={theme}
              lang={lang}
            />
          );

          const button = screen.getByRole('button');
          fireEvent.click(button);

          expect(mockOnOpenModal).toHaveBeenCalledTimes(1);
          
          // Reset for next iteration
          mockOnOpenModal.mockClear();
          cleanup(); // Clean up after each iteration

          return true;
        }
      ), { numRuns: 100 });
    });

    it('should have proper accessibility attributes', () => {
      fc.assert(fc.property(
        fc.option(fc.string()),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (selectedPrompt, theme, lang) => {
          cleanup(); // Clean up before each property test iteration
          
          const selectedPromptIndex = selectedPrompt && selectedPrompt.trim() ? 0 : null;
          
          render(
            <PresetPromptButton
              selectedPrompt={selectedPrompt}
              selectedPromptIndex={selectedPromptIndex}
              onOpenModal={mockOnOpenModal}
              theme={theme}
              lang={lang}
            />
          );

          const button = screen.getByRole('button');
          
          // Should have proper aria-label
          const expectedAriaLabel = lang === 'zh' ? '打开我的提示词库' : 'Open My Prompt Library';
          expect(button).toHaveAttribute('aria-label', expectedAriaLabel);

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty and whitespace-only prompts', () => {
      const testCases = [null, '', '   ', '\t\n  '];
      
      testCases.forEach((prompt, index) => {
        cleanup(); // Clean up before each test case
        
        render(
          <PresetPromptButton
            selectedPrompt={prompt}
            selectedPromptIndex={null}
            onOpenModal={mockOnOpenModal}
            theme="light"
            lang="zh"
          />
        );

        const button = screen.getByRole('button');
        const buttonText = button.textContent || '';
        
        // Should display default text for empty/whitespace prompts
        expect(buttonText).toContain('我的提示词');
        expect(button).toHaveClass('text-slate-400');
        
        cleanup(); // Clean up after each test case
      });
    });

    it('should handle selected prompts correctly', () => {
      cleanup(); // Clean up before test
      
      const veryLongPrompt = 'A'.repeat(200);
      
      render(
        <PresetPromptButton
          selectedPrompt={veryLongPrompt}
          selectedPromptIndex={0}
          onOpenModal={mockOnOpenModal}
          theme="light"
          lang="en"
        />
      );

      const button = screen.getByRole('button');
      const buttonText = button.textContent || '';
      
      // Should show prompt number
      expect(buttonText).toMatch(/^P\d+$/);
      
      // Should have tooltip with full text
      expect(button).toHaveAttribute('title', veryLongPrompt);
      
      cleanup(); // Clean up after test
    });
  });
});