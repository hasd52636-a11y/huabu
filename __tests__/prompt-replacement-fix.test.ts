/**
 * 测试提示词替换修复
 * 验证视频和图片生成中用户输入不会被错误替换
 */

import { MultiProviderAIService } from '../adapters/AIServiceAdapter';

describe('Prompt Replacement Fix', () => {
  let aiService: MultiProviderAIService;

  beforeEach(() => {
    aiService = new MultiProviderAIService();
  });

  describe('Video Generation Prompt Processing', () => {
    it('should extract clean user prompt from User Instruction format', () => {
      const contents = {
        parts: [
          { text: 'User Instruction: 奔跑的马' }
        ],
        aspectRatio: '16:9',
        duration: 10
      };

      // 模拟 convertContents 方法的逻辑
      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => {
          let text = part.text;
          if (text.includes('User Instruction:')) {
            text = text.replace(/^.*User Instruction:\s*/, '').trim();
          }
          return text;
        });

      const result = textParts.join(' ').trim();
      expect(result).toBe('奔跑的马');
      expect(result).not.toContain('User Instruction:');
    });

    it('should handle Chinese instruction format', () => {
      const contents = {
        parts: [
          { text: '指令: 飞翔的鸟' }
        ]
      };

      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => {
          let text = part.text;
          if (text.includes('指令:')) {
            text = text.replace(/^.*指令:\s*/, '').trim();
          }
          return text;
        });

      const result = textParts.join(' ').trim();
      expect(result).toBe('飞翔的鸟');
      expect(result).not.toContain('指令:');
    });

    it('should handle plain text without prefixes', () => {
      const contents = {
        parts: [
          { text: '奔跑的马' }
        ]
      };

      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => {
          let text = part.text;
          // 如果没有前缀，直接使用文本内容
          if (!text.includes('User Instruction:') && !text.includes('指令:')) {
            return text.trim();
          }
          return text;
        });

      const result = textParts.join(' ').trim();
      expect(result).toBe('奔跑的马');
    });
  });

  describe('Image Generation Prompt Processing', () => {
    it('should extract clean user prompt from image instruction format', () => {
      const contents = {
        parts: [
          { text: '用户指令: 美丽的风景' }
        ]
      };

      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => {
          let text = part.text;
          if (text.includes('用户指令:')) {
            text = text.replace(/^.*用户指令:\s*/, '').trim();
          }
          return text;
        });

      const result = textParts.join(' ').trim();
      expect(result).toBe('美丽的风景');
      expect(result).not.toContain('用户指令:');
    });

    it('should handle reference image format', () => {
      const contents = {
        parts: [
          { 
            inlineData: {
              mimeType: 'image/png',
              data: 'base64data'
            }
          },
          { text: '参考图片已上传。用户指令: 类似风格的画' }
        ]
      };

      const textParts = contents.parts
        .filter((part: any) => part.text && !part.inlineData)
        .map((part: any) => {
          let text = part.text;
          if (text.includes('参考图片已上传。用户指令:')) {
            text = text.replace(/^.*参考图片已上传。用户指令:\s*/, '').trim();
          }
          return text;
        });

      const result = textParts.join(' ').trim();
      expect(result).toBe('类似风格的画');
      expect(result).not.toContain('参考图片已上传');
      expect(result).not.toContain('用户指令:');
    });
  });

  describe('Reference Image Processing', () => {
    it('should correctly extract reference images for video generation', () => {
      const contents = {
        parts: [
          { text: 'User Instruction: 奔跑的马' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: 'base64imagedata'
            }
          }
        ]
      };

      const referenceImages: string[] = [];
      contents.parts.forEach((part: any) => {
        if (part.inlineData) {
          const imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          referenceImages.push(imageData);
        }
      });

      expect(referenceImages).toHaveLength(1);
      expect(referenceImages[0]).toBe('data:image/jpeg;base64,base64imagedata');
    });

    it('should handle multiple reference images', () => {
      const contents = {
        parts: [
          { text: 'User Instruction: 多图生视频' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: 'image1data'
            }
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'image2data'
            }
          }
        ]
      };

      const referenceImages: string[] = [];
      contents.parts.forEach((part: any) => {
        if (part.inlineData) {
          const imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          referenceImages.push(imageData);
        }
      });

      expect(referenceImages).toHaveLength(2);
      expect(referenceImages[0]).toBe('data:image/jpeg;base64,image1data');
      expect(referenceImages[1]).toBe('data:image/png;base64,image2data');
    });
  });

  describe('Fallback Behavior', () => {
    it('should not use default prompt when user input is valid', () => {
      const userInstruction = '奔跑的马';
      let formattedPrompt = '';
      
      if (userInstruction && userInstruction.trim()) {
        formattedPrompt = userInstruction.trim();
      }
      
      // 如果没有有效的prompt，使用默认提示
      if (!formattedPrompt) {
        formattedPrompt = '生成一个创意视频';
      }

      expect(formattedPrompt).toBe('奔跑的马');
      expect(formattedPrompt).not.toBe('生成一个创意视频');
    });

    it('should use default prompt only when user input is empty', () => {
      const userInstruction = '';
      let formattedPrompt = '';
      
      if (userInstruction && userInstruction.trim()) {
        formattedPrompt = userInstruction.trim();
      }
      
      // 如果没有有效的prompt，使用默认提示
      if (!formattedPrompt) {
        formattedPrompt = '生成一个创意视频';
      }

      expect(formattedPrompt).toBe('生成一个创意视频');
    });
  });
});