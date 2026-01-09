import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import PresetPromptModal from './PresetPromptModal';
import { PresetPrompt } from '../types';

/**
 * Feature: my-prompt, Property 5: Modal display completeness
 * 
 * For any prompt library state, opening the modal should display all 6 slots 
 * with correct content or appropriate placeholder text for empty slots
 * 
 * **Validates: Requirements 3.1, 3.2**
 */
describe('PresetPromptModal Display Completeness', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnSelect.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  // Helper function to create a preset prompt
  const createPresetPrompt = (id: string, content: string = '', title: string = ''): PresetPrompt => ({
    id,
    title: title || (content ? content.slice(0, 50) : ''),
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Helper function to create exactly 6 prompts (as required by the system)
  const createSixPrompts = (prompts: Partial<PresetPrompt>[]): PresetPrompt[] => {
    const result: PresetPrompt[] = [];
    
    for (let i = 0; i < 6; i++) {
      const promptData = prompts[i] || {};
      result.push(createPresetPrompt(
        promptData.id || `prompt-${i}`,
        promptData.content || '',
        promptData.title || ''
      ));
    }
    
    return result;
  };

  describe('Property 5: Modal display completeness', () => {
    it('should always display exactly 6 prompt slots regardless of input', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            content: fc.string({ maxLength: 2000 }),
            title: fc.string({ maxLength: 100 })
          }),
          { minLength: 0, maxLength: 10 } // Allow various array lengths to test normalization
        ),
        fc.option(fc.integer({ min: 0, max: 5 })),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (promptsData, selectedIndex, theme, lang) => {
          cleanup(); // Clean up before each iteration
          
          // Create exactly 6 prompts (system requirement)
          const prompts = createSixPrompts(promptsData);
          
          render(
            <PresetPromptModal
              isOpen={true}
              prompts={prompts}
              selectedPromptIndex={selectedIndex}
              onClose={mockOnClose}
              onSave={mockOnSave}
              onSelect={mockOnSelect}
              theme={theme}
              lang={lang}
            />
          );

          // Should always display exactly 6 slots
          const slots = screen.getAllByText(/提示词槽位|Prompt Slot/);
          expect(slots).toHaveLength(6);

          // Each slot should be numbered 1-6
          for (let i = 1; i <= 6; i++) {
            const slotText = lang === 'zh' ? `提示词槽位 ${i}` : `Prompt Slot ${i}`;
            expect(screen.getByText(slotText)).toBeInTheDocument();
          }

          // Verify content display
          prompts.forEach((prompt, index) => {
            if (prompt.content) {
              // Non-empty slots should show content
              expect(screen.getByText(prompt.content)).toBeInTheDocument();
            } else {
              // Empty slots should show placeholder
              const emptyText = lang === 'zh' ? '空槽位' : 'Empty Slot';
              const emptySlots = screen.getAllByText(emptyText);
              expect(emptySlots.length).toBeGreaterThan(0);
            }
          });

          // Verify selected slot highlighting
          if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < 6) {
            const selectedIndicators = screen.getAllByRole('generic').filter(
              el => el.className.includes('bg-amber-500') && el.className.includes('rounded-full')
            );
            expect(selectedIndicators.length).toBeGreaterThan(0);
          }

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should display appropriate placeholder text for empty slots', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 6 }), // Number of filled slots
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (filledCount, theme, lang) => {
          cleanup(); // Clean up before each iteration
          
          // Create prompts with only first 'filledCount' slots having content
          const promptsData = Array.from({ length: 6 }, (_, i) => ({
            content: i < filledCount ? `Test content for slot ${i + 1}` : '',
            title: i < filledCount ? `Test title ${i + 1}` : ''
          }));
          
          const prompts = createSixPrompts(promptsData);
          
          render(
            <PresetPromptModal
              isOpen={true}
              prompts={prompts}
              selectedPromptIndex={null}
              onClose={mockOnClose}
              onSave={mockOnSave}
              onSelect={mockOnSelect}
              theme={theme}
              lang={lang}
            />
          );

          const emptyText = lang === 'zh' ? '空槽位' : 'Empty Slot';
          const emptySlots = screen.getAllByText(emptyText);
          
          // Should have exactly (6 - filledCount) empty slots
          expect(emptySlots).toHaveLength(6 - filledCount);

          // Filled slots should show their content
          for (let i = 0; i < filledCount; i++) {
            expect(screen.getByText(`Test content for slot ${i + 1}`)).toBeInTheDocument();
          }

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });

    it('should handle modal open/close state correctly', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (isOpen, theme, lang) => {
          cleanup(); // Clean up before each iteration
          
          const prompts = createSixPrompts([]);
          
          const { container } = render(
            <PresetPromptModal
              isOpen={isOpen}
              prompts={prompts}
              selectedPromptIndex={null}
              onClose={mockOnClose}
              onSave={mockOnSave}
              onSelect={mockOnSelect}
              theme={theme}
              lang={lang}
            />
          );

          if (isOpen) {
            // Modal should be visible
            const modal = container.querySelector('.fixed.inset-0');
            expect(modal).toBeInTheDocument();
            
            // Title should be visible
            const title = lang === 'zh' ? '我的提示词库' : 'My Prompt Library';
            expect(screen.getByText(title)).toBeInTheDocument();
          } else {
            // Modal should not be rendered
            const modal = container.querySelector('.fixed.inset-0');
            expect(modal).not.toBeInTheDocument();
          }

          cleanup(); // Clean up after each iteration
          return true;
        }
      ), { numRuns: 100 });
    });
  });

  describe('Modal interaction', () => {
    it('should call onClose when close button is clicked', () => {
      const prompts = createSixPrompts([]);
      
      render(
        <PresetPromptModal
          isOpen={true}
          prompts={prompts}
          selectedPromptIndex={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onSelect={mockOnSelect}
          theme="light"
          lang="zh"
        />
      );

      const closeButton = screen.getByLabelText('关闭');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside modal', () => {
      const prompts = createSixPrompts([]);
      
      render(
        <PresetPromptModal
          isOpen={true}
          prompts={prompts}
          selectedPromptIndex={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onSelect={mockOnSelect}
          theme="light"
          lang="zh"
        />
      );

      // Click on the backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle escape key to close modal', () => {
      const prompts = createSixPrompts([]);
      
      render(
        <PresetPromptModal
          isOpen={true}
          prompts={prompts}
          selectedPromptIndex={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onSelect={mockOnSelect}
          theme="light"
          lang="zh"
        />
      );

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility attributes', () => {
      const prompts = createSixPrompts([
        { content: 'Test prompt content' }
      ]);
      
      render(
        <PresetPromptModal
          isOpen={true}
          prompts={prompts}
          selectedPromptIndex={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onSelect={mockOnSelect}
          theme="light"
          lang="zh"
        />
      );

      // Close button should have aria-label
      const closeButton = screen.getByLabelText('关闭');
      expect(closeButton).toBeInTheDocument();

      // Modal should have proper structure
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeInTheDocument();
    });
  });

  /**
   * Feature: my-prompt, Property 3: Character limit validation
   * 
   * For any prompt content input, the system should enforce a strict 2000 character limit
   * and prevent saving content that exceeds this limit
   * 
   * **Validates: Requirements 2.2, 2.3, 8.1**
   */
  describe('Property 3: Character limit validation', () => {
    it('should enforce 2000 character limit for all prompt content', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1900, maxLength: 2500 }), // Test around the boundary
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (testContent, slotIndex, theme, lang) => {
          cleanup();
          
          const prompts = createSixPrompts([]);
          
          render(
            <PresetPromptModal
              isOpen={true}
              prompts={prompts}
              selectedPromptIndex={null}
              onClose={mockOnClose}
              onSave={mockOnSave}
              onSelect={mockOnSelect}
              theme={theme}
              lang={lang}
            />
          );

          // Click on a slot to start editing
          const slots = screen.getAllByText(/提示词槽位|Prompt Slot/);
          fireEvent.click(slots[slotIndex]);

          // Find the textarea
          const textarea = screen.getByRole('textbox');
          expect(textarea).toBeInTheDocument();

          // Try to input content that may exceed limit
          fireEvent.change(textarea, { target: { value: testContent } });

          // Check that content is truncated to 2000 characters
          const actualValue = (textarea as HTMLTextAreaElement).value;
          expect(actualValue.length).toBeLessThanOrEqual(2000);

          // If original content was over 2000 chars, it should be truncated
          if (testContent.length > 2000) {
            expect(actualValue).toBe(testContent.slice(0, 2000));
          } else {
            expect(actualValue).toBe(testContent);
          }

          // Check character count display
          const characterCountText = lang === 'zh' ? '字符计数' : 'Character Count';
          const characterCount = screen.getByText(new RegExp(characterCountText));
          expect(characterCount).toBeInTheDocument();

          // If over limit, should show warning
          if (testContent.length > 2000) {
            const warningText = lang === 'zh' ? '提示词内容不能超过2000字符' : 'Prompt content cannot exceed 2000 characters';
            // Warning should be visible in the UI logic, but content should be truncated
            expect(actualValue.length).toBe(2000);
          }

          cleanup();
          return true;
        }
      ), { numRuns: 50 });
    });
  });

  /**
   * Feature: my-prompt, Property 7: Real-time character counting
   * 
   * For any prompt editing session, the character count should update in real-time
   * as the user types, providing immediate feedback
   * 
   * **Validates: Requirements 3.4, 7.5**
   */
  describe('Property 7: Real-time character counting', () => {
    it('should update character count in real-time during editing', () => {
      fc.assert(fc.property(
        fc.array(fc.string({ maxLength: 100 }), { minLength: 1, maxLength: 10 }), // Multiple input steps
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('zh' as const, 'en' as const),
        (inputSteps, slotIndex, theme, lang) => {
          cleanup();
          
          const prompts = createSixPrompts([]);
          
          render(
            <PresetPromptModal
              isOpen={true}
              prompts={prompts}
              selectedPromptIndex={null}
              onClose={mockOnClose}
              onSave={mockOnSave}
              onSelect={mockOnSelect}
              theme={theme}
              lang={lang}
            />
          );

          // Click on a slot to start editing
          const slots = screen.getAllByText(/提示词槽位|Prompt Slot/);
          fireEvent.click(slots[slotIndex]);

          // Find the textarea
          const textarea = screen.getByRole('textbox');
          expect(textarea).toBeInTheDocument();

          let cumulativeContent = '';
          
          // Simulate typing in steps
          for (const step of inputSteps) {
            cumulativeContent += step;
            
            // Truncate if over 2000 characters (system limit)
            const expectedContent = cumulativeContent.slice(0, 2000);
            
            fireEvent.change(textarea, { target: { value: cumulativeContent } });

            // Check that character count updates correctly
            const characterCountText = lang === 'zh' ? '字符计数' : 'Character Count';
            const characterCountRegex = new RegExp(`${characterCountText}:\\s*(\\d+)/2000`);
            const characterCountElement = screen.getByText(characterCountRegex);
            expect(characterCountElement).toBeInTheDocument();

            // Extract the actual count from the display
            const match = characterCountElement.textContent?.match(/(\d+)\/2000/);
            const displayedCount = match ? parseInt(match[1]) : 0;
            
            // Should match the expected length
            expect(displayedCount).toBe(expectedContent.length);

            // Textarea value should match expected content
            expect((textarea as HTMLTextAreaElement).value).toBe(expectedContent);
          }

          cleanup();
          return true;
        }
      ), { numRuns: 30 });
    });
  });
});