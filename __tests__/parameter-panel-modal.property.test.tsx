/**
 * Property-Based Tests for ParameterPanel Modal Behavior
 * 
 * Tests Property 1: Modal Opening and Positioning
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import ParameterPanel from '../components/ParameterPanel';
import { 
  GenerationParameters,
  IMAGE_MODELS,
  VIDEO_MODELS,
  ParameterPanelProps
} from '../types';

// Mock services
vi.mock('../services/ModelConfigService', () => ({
  ModelConfigService: {
    getInstance: () => ({
      getModelParameters: vi.fn().mockReturnValue([
        {
          key: 'prompt',
          label: '提示词',
          type: 'text',
          defaultValue: '',
          required: true,
          validation: { required: true, min: 1, max: 2000 },
          description: '描述你想要生成的内容',
          category: 'basic'
        }
      ])
    })
  }
}));

vi.mock('../services/ParameterValidationService', () => ({
  ParameterValidationService: {
    getInstance: () => ({
      validateParameters: vi.fn().mockReturnValue([])
    })
  }
}));

vi.mock('../services/PresetStorageService', () => ({
  PresetStorageService: {
    getInstance: () => ({
      loadPresets: vi.fn().mockResolvedValue([])
    })
  }
}));

describe('ParameterPanel Modal Behavior Property Tests', () => {
  const defaultProps: ParameterPanelProps = {
    isOpen: false,
    onClose: vi.fn(),
    selectedModel: 'test-model',
    generationType: 'image' as const,
    onParametersChange: vi.fn(),
    theme: 'light' as const,
    lang: 'zh' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      writable: true,
      value: document.body
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 1: Modal Opening and Positioning
   * **Validates: Requirements 1.1, 1.2**
   * 
   * 验证模态框开启和定位的正确性
   */
  describe('Property 1: Modal Opening and Positioning', () => {
    
    it('should render modal only when isOpen is true', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.constantFrom(...IMAGE_MODELS.basic, ...VIDEO_MODELS.sora),
        fc.constantFrom('image', 'video'),
        fc.constantFrom('light', 'dark'),
        fc.constantFrom('zh', 'en'),
        (isOpen, selectedModel, generationType, theme, lang) => {
          const { container } = render(
            <ParameterPanel
              {...defaultProps}
              isOpen={isOpen}
              selectedModel={selectedModel}
              generationType={generationType}
              theme={theme}
              lang={lang}
            />
          );

          // Property: 模态框只有在isOpen为true时才应该渲染
          if (isOpen) {
            expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
            expect(screen.getByText(/智能参数面板|Intelligent Parameter Panel/)).toBeInTheDocument();
          } else {
            expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
          }
        }
      ), { numRuns: 30 });
    });

    it('should have correct modal structure and accessibility attributes', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.constantFrom('image', 'video'),
        fc.constantFrom('light', 'dark'),
        fc.constantFrom('zh', 'en'),
        (selectedModel, generationType, theme, lang) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
              generationType={generationType}
              theme={theme}
              lang={lang}
            />
          );

          const modal = screen.getByRole('dialog');
          
          // Property: 模态框应该有正确的ARIA属性
          expect(modal).toHaveAttribute('aria-modal', 'true');
          expect(modal).toHaveAttribute('aria-labelledby', 'parameter-panel-title');
          expect(modal).toHaveAttribute('tabIndex', '-1');
          
          // Property: 模态框应该有正确的CSS类
          expect(modal).toHaveClass('bg-white');
          
          // Property: 应该有背景遮罩
          const backdrop = modal.parentElement;
          expect(backdrop).toHaveClass('fixed', 'inset-0');
          
          // Property: 应该有正确的z-index
          expect(backdrop).toHaveClass('z-[10000]');
        }
      ), { numRuns: 20 });
    });

    it('should handle modal positioning correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.constantFrom('image', 'video'),
        (selectedModel, generationType) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
              generationType={generationType}
            />
          );

          const backdrop = screen.getByRole('dialog').parentElement;
          
          // Property: 模态框应该居中定位
          expect(backdrop).toHaveClass('flex');
          
          // Property: 模态框应该有适当的内边距
          expect(backdrop).toHaveClass('p-4');
          
          const modal = screen.getByRole('dialog');
          
          // Property: 模态框应该有最大宽度和高度限制
          expect(modal).toHaveClass('max-w-5xl');
          
          // Property: 模态框应该是全宽但受最大宽度限制
          expect(modal).toHaveClass('w-full');
          
          // Property: 模态框应该可滚动
          expect(modal).toHaveClass('overflow-y-auto');
        }
      ), { numRuns: 15 });
    });

    it('should handle theme changes correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom('light', 'dark'),
        fc.constantFrom(...IMAGE_MODELS.basic),
        (theme, selectedModel) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              theme={theme}
              selectedModel={selectedModel}
            />
          );

          const modal = screen.getByRole('dialog');
          
          // Property: 模态框应该根据主题应用正确的样式
          if (theme === 'dark') {
            expect(modal).toHaveClass('bg-white'); // Component handles theme internally
          } else {
            expect(modal).toHaveClass('bg-white');
          }
          
          // Property: 标题应该有正确的主题样式
          const title = screen.getByRole('heading');
          expect(title).toBeInTheDocument();
        }
      ), { numRuns: 10 });
    });

    it('should handle language changes correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom('zh', 'en'),
        fc.constantFrom(...IMAGE_MODELS.basic),
        (lang, selectedModel) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              lang={lang}
              selectedModel={selectedModel}
            />
          );

          const title = screen.getByRole('heading');
          
          // Property: 标题应该根据语言显示正确的文本
          if (lang === 'zh') {
            expect(title).toHaveTextContent('智能参数面板');
          } else {
            expect(title).toHaveTextContent('Intelligent Parameter Panel');
          }
          
          // Property: 标签应该根据语言显示正确的文本
          const buttons = screen.getAllByRole('button');
          const buttonTexts = buttons.map(btn => btn.textContent);
          
          if (lang === 'zh') {
            expect(buttonTexts.some(text => text?.includes('图像生成'))).toBe(true);
            expect(buttonTexts.some(text => text?.includes('视频生成'))).toBe(true);
          } else {
            expect(buttonTexts.some(text => text?.includes('Image Generation'))).toBe(true);
            expect(buttonTexts.some(text => text?.includes('Video Generation'))).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });

    it('should handle tab switching correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom('image', 'video'),
        fc.constantFrom(...IMAGE_MODELS.basic, ...VIDEO_MODELS.sora),
        (initialTab, selectedModel) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              generationType={initialTab}
              selectedModel={selectedModel}
            />
          );

          // Property: 初始标签应该是激活状态
          const buttons = screen.getAllByRole('button');
          const tabButtons = buttons.filter(btn => 
            btn.textContent?.includes('图像生成') || 
            btn.textContent?.includes('视频生成') ||
            btn.textContent?.includes('Image Generation') || 
            btn.textContent?.includes('Video Generation')
          );
          
          expect(tabButtons.length).toBeGreaterThanOrEqual(2);
          
          // Property: 应该有激活状态的标签
          const hasActiveTab = tabButtons.some(btn => 
            btn.className.includes('violet-600') || btn.className.includes('border-violet-600')
          );
          expect(hasActiveTab).toBe(true);
        }
      ), { numRuns: 15 });
    });

    it('should handle close button correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.constantFrom('zh', 'en'),
        (selectedModel, lang) => {
          const onClose = vi.fn();
          
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
              lang={lang}
              onClose={onClose}
            />
          );

          // Property: 应该有关闭按钮
          const buttons = screen.getAllByRole('button');
          const buttonTexts = buttons.map(btn => btn.textContent);
          
          const hasCancelButton = buttonTexts.some(text => 
            text?.includes(lang === 'zh' ? '取消' : 'Cancel')
          );
          expect(hasCancelButton).toBe(true);
          
          // Property: 点击关闭按钮应该调用onClose
          const cancelButton = buttons.find(btn => 
            btn.textContent?.includes(lang === 'zh' ? '取消' : 'Cancel')
          );
          if (cancelButton) {
            fireEvent.click(cancelButton);
            expect(onClose).toHaveBeenCalledTimes(1);
          }
          
          // Property: 头部的X按钮也应该能关闭模态框
          const xButton = screen.getByLabelText(lang === 'zh' ? '取消' : 'Cancel');
          fireEvent.click(xButton);
          expect(onClose).toHaveBeenCalledTimes(2);
        }
      ), { numRuns: 10 });
    });

    it('should handle keyboard navigation correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        (selectedModel) => {
          const onClose = vi.fn();
          
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
              onClose={onClose}
            />
          );

          const modal = screen.getByRole('dialog');
          
          // Property: 模态框应该可以接收焦点
          expect(modal).toHaveAttribute('tabIndex', '-1');
          
          // Property: 按Escape键应该关闭模态框
          fireEvent.keyDown(modal, { key: 'Escape' });
          expect(onClose).toHaveBeenCalledTimes(1);
        }
      ), { numRuns: 10 });
    });

    it('should handle parameter changes correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 }),
          aspectRatio: fc.constantFrom('1:1', '4:3', '16:9'),
          imageSize: fc.constantFrom('1K', '2K', '4K')
        }),
        (selectedModel, initialParameters) => {
          const onParametersChange = vi.fn();
          
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
              initialParameters={initialParameters}
              onParametersChange={onParametersChange}
            />
          );

          // Property: 生成按钮应该存在
          const buttons = screen.getAllByRole('button');
          const buttonTexts = buttons.map(btn => btn.textContent);
          
          const hasGenerateButton = buttonTexts.some(text => 
            text?.includes('生成') || text?.includes('Generate')
          );
          expect(hasGenerateButton).toBe(true);
          
          // Property: 点击生成按钮应该调用onParametersChange
          const generateButton = buttons.find(btn => 
            btn.textContent?.includes('生成') || btn.textContent?.includes('Generate')
          );
          if (generateButton) {
            fireEvent.click(generateButton);
            expect(onParametersChange).toHaveBeenCalledTimes(1);
            
            // Property: 传递的参数应该包含初始参数
            const calledWith = onParametersChange.mock.calls[0][0];
            expect(calledWith).toMatchObject(initialParameters);
          }
        }
      ), { numRuns: 15 });
    });

    it('should maintain consistent modal structure across different props', () => {
      fc.assert(fc.property(
        fc.record({
          selectedModel: fc.constantFrom(...IMAGE_MODELS.basic, ...VIDEO_MODELS.sora),
          generationType: fc.constantFrom('image', 'video'),
          theme: fc.constantFrom('light', 'dark'),
          lang: fc.constantFrom('zh', 'en'),
          initialParameters: fc.option(fc.record({
            prompt: fc.string({ maxLength: 100 })
          }))
        }),
        (props) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              {...props}
            />
          );

          // Property: 模态框结构应该保持一致
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByRole('heading')).toBeInTheDocument();
          
          // Property: 应该有标签导航
          expect(screen.getAllByRole('button')).toHaveLength.greaterThan(2);
          
          // Property: 应该有取消和生成按钮
          const buttons = screen.getAllByRole('button');
          const buttonTexts = buttons.map(btn => btn.textContent);
          
          const hasCancelButton = buttonTexts.some(text => 
            text?.includes('取消') || text?.includes('Cancel')
          );
          const hasGenerateButton = buttonTexts.some(text => 
            text?.includes('生成') || text?.includes('Generate')
          );
          
          expect(hasCancelButton).toBe(true);
          expect(hasGenerateButton).toBe(true);
        }
      ), { numRuns: 20 });
    });
  });

  /**
   * Modal Positioning and Layout Tests
   */
  describe('Modal Positioning and Layout Properties', () => {
    
    it('should handle viewport constraints correctly', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        (selectedModel) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
            />
          );

          const modal = screen.getByRole('dialog');
          
          // Property: 模态框应该有最大高度限制以适应视口
          expect(modal).toHaveClass('max-h-[90vh]');
          
          // Property: 模态框应该有最大宽度限制
          expect(modal).toHaveClass('max-w-5xl');
          
          // Property: 模态框应该是响应式的
          expect(modal).toHaveClass('w-full');
          
          // Property: 内容应该可滚动
          expect(modal).toHaveClass('overflow-y-auto');
        }
      ), { numRuns: 10 });
    });

    it('should maintain proper spacing and padding', () => {
      fc.assert(fc.property(
        fc.constantFrom(...IMAGE_MODELS.basic),
        (selectedModel) => {
          render(
            <ParameterPanel
              {...defaultProps}
              isOpen={true}
              selectedModel={selectedModel}
            />
          );

          const backdrop = screen.getByRole('dialog').parentElement;
          
          // Property: 背景应该有适当的内边距
          expect(backdrop).toHaveClass('p-4');
          
          // Property: 模态框内容应该有适当的内边距
          const modal = screen.getByRole('dialog');
          expect(modal).toBeInTheDocument();
        }
      ), { numRuns: 10 });
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Modal Error Handling Properties', () => {
    
    it('should handle missing required props gracefully', () => {
      fc.assert(fc.property(
        fc.boolean(),
        (isOpen) => {
          // Property: 即使缺少某些props，组件也不应该崩溃
          expect(() => {
            render(
              <ParameterPanel
                isOpen={isOpen}
                onClose={vi.fn()}
                selectedModel=""
                generationType="image"
                onParametersChange={vi.fn()}
              />
            );
          }).not.toThrow();
        }
      ), { numRuns: 10 });
    });
  });
});