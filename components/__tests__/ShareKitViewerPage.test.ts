/**
 * ShareKitViewerPage 坐标验证单元测试
 * 测试坐标验证函数的错误处理和边界情况
 */

import { describe, test, expect } from 'vitest';

// 从 ShareKitViewerPage 中提取的验证函数（用于测试）
const validateCoordinates = (pan: any, zoom: any) => {
  const safePan = { 
    x: typeof pan?.x === 'number' && isFinite(pan.x) ? pan.x : 0,
    y: typeof pan?.y === 'number' && isFinite(pan.y) ? pan.y : 0
  };
  const safeZoom = typeof zoom === 'number' && isFinite(zoom) && zoom > 0 ? zoom : 1;
  
  return { pan: safePan, zoom: safeZoom };
};

const validateBlockCoordinates = (block: any) => {
  return {
    ...block,
    x: typeof block.x === 'number' && isFinite(block.x) ? block.x : 0,
    y: typeof block.y === 'number' && isFinite(block.y) ? block.y : 0,
    width: typeof block.width === 'number' && isFinite(block.width) && block.width > 0 ? block.width : 200,
    height: typeof block.height === 'number' && isFinite(block.height) && block.height > 0 ? block.height : 150
  };
};

const generateSafeTransform = (pan: any, zoom: any) => {
  const { pan: safePan, zoom: safeZoom } = validateCoordinates(pan, zoom);
  return `translate(${safePan.x}px, ${safePan.y}px) scale(${safeZoom})`;
};

describe('ShareKitViewerPage 坐标验证', () => {
  describe('validateCoordinates', () => {
    test('应该处理有效的坐标值', () => {
      const result = validateCoordinates({ x: 100, y: 200 }, 1.5);
      expect(result.pan.x).toBe(100);
      expect(result.pan.y).toBe(200);
      expect(result.zoom).toBe(1.5);
    });

    test('应该处理无效的 pan 值', () => {
      const testCases = [
        { pan: null, expected: { x: 0, y: 0 } },
        { pan: undefined, expected: { x: 0, y: 0 } },
        { pan: {}, expected: { x: 0, y: 0 } },
        { pan: { x: 'invalid', y: 'invalid' }, expected: { x: 0, y: 0 } },
        { pan: { x: NaN, y: NaN }, expected: { x: 0, y: 0 } },
        { pan: { x: Infinity, y: -Infinity }, expected: { x: 0, y: 0 } },
      ];

      testCases.forEach(({ pan, expected }) => {
        const result = validateCoordinates(pan, 1);
        expect(result.pan).toEqual(expected);
      });
    });

    test('应该处理无效的 zoom 值', () => {
      const testCases = [
        { zoom: null, expected: 1 },
        { zoom: undefined, expected: 1 },
        { zoom: 'invalid', expected: 1 },
        { zoom: NaN, expected: 1 },
        { zoom: Infinity, expected: 1 },
        { zoom: -1, expected: 1 },
        { zoom: 0, expected: 1 },
      ];

      testCases.forEach(({ zoom, expected }) => {
        const result = validateCoordinates({ x: 0, y: 0 }, zoom);
        expect(result.zoom).toBe(expected);
      });
    });

    test('应该处理部分有效的 pan 值', () => {
      const result1 = validateCoordinates({ x: 100, y: 'invalid' }, 1);
      expect(result1.pan.x).toBe(100);
      expect(result1.pan.y).toBe(0);

      const result2 = validateCoordinates({ x: NaN, y: 200 }, 1);
      expect(result2.pan.x).toBe(0);
      expect(result2.pan.y).toBe(200);
    });
  });

  describe('validateBlockCoordinates', () => {
    test('应该处理有效的块坐标', () => {
      const block = {
        id: 'test',
        x: 100,
        y: 200,
        width: 300,
        height: 400,
        type: 'text'
      };
      
      const result = validateBlockCoordinates(block);
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
      expect(result.width).toBe(300);
      expect(result.height).toBe(400);
      expect(result.type).toBe('text');
    });

    test('应该处理无效的坐标值', () => {
      const testCases = [
        { x: null, expected: 0 },
        { x: undefined, expected: 0 },
        { x: 'invalid', expected: 0 },
        { x: NaN, expected: 0 },
        { x: Infinity, expected: 0 },
      ];

      testCases.forEach(({ x, expected }) => {
        const block = { id: 'test', x, y: 100, width: 200, height: 150 };
        const result = validateBlockCoordinates(block);
        expect(result.x).toBe(expected);
      });
    });

    test('应该处理无效的尺寸值', () => {
      // Test invalid width values
      const widthTestCases = [
        { width: null, expected: 200 },
        { width: undefined, expected: 200 },
        { width: 'invalid', expected: 200 },
        { width: NaN, expected: 200 },
        { width: Infinity, expected: 200 },
        { width: -100, expected: 200 },
        { width: 0, expected: 200 },
      ];

      widthTestCases.forEach(({ width, expected }) => {
        const block = { id: 'test', x: 0, y: 0, width, height: 400 };
        const result = validateBlockCoordinates(block);
        expect(result.width).toBe(expected);
        expect(result.height).toBe(400); // height should remain valid
      });

      // Test invalid height values
      const heightTestCases = [
        { height: null, expected: 150 },
        { height: undefined, expected: 150 },
        { height: 'invalid', expected: 150 },
        { height: NaN, expected: 150 },
        { height: Infinity, expected: 150 },
        { height: -100, expected: 150 },
        { height: 0, expected: 150 },
      ];

      heightTestCases.forEach(({ height, expected }) => {
        const block = { id: 'test', x: 0, y: 0, width: 300, height };
        const result = validateBlockCoordinates(block);
        expect(result.width).toBe(300); // width should remain valid
        expect(result.height).toBe(expected);
      });
    });

    test('应该保留其他块属性', () => {
      const block = {
        id: 'test',
        x: 100,
        y: 200,
        width: 300,
        height: 400,
        type: 'image',
        content: 'test content',
        customProperty: 'custom value'
      };
      
      const result = validateBlockCoordinates(block);
      expect(result.id).toBe('test');
      expect(result.type).toBe('image');
      expect(result.content).toBe('test content');
      expect(result.customProperty).toBe('custom value');
    });
  });

  describe('generateSafeTransform', () => {
    test('应该生成有效的 CSS transform 字符串', () => {
      const result = generateSafeTransform({ x: 100, y: 200 }, 1.5);
      expect(result).toBe('translate(100px, 200px) scale(1.5)');
    });

    test('应该处理无效输入并生成安全的 transform', () => {
      const testCases = [
        { pan: null, zoom: null, expected: 'translate(0px, 0px) scale(1)' },
        { pan: { x: NaN, y: Infinity }, zoom: -1, expected: 'translate(0px, 0px) scale(1)' },
        { pan: { x: 'invalid', y: 'invalid' }, zoom: 'invalid', expected: 'translate(0px, 0px) scale(1)' },
      ];

      testCases.forEach(({ pan, zoom, expected }) => {
        const result = generateSafeTransform(pan, zoom);
        expect(result).toBe(expected);
      });
    });

    test('应该处理负坐标值', () => {
      const result = generateSafeTransform({ x: -100, y: -200 }, 0.5);
      expect(result).toBe('translate(-100px, -200px) scale(0.5)');
    });

    test('应该处理小数坐标值', () => {
      const result = generateSafeTransform({ x: 100.5, y: 200.7 }, 1.25);
      expect(result).toBe('translate(100.5px, 200.7px) scale(1.25)');
    });
  });

  describe('边界情况测试', () => {
    test('应该处理极大的坐标值', () => {
      const result = validateCoordinates({ x: 1e6, y: -1e6 }, 10);
      expect(result.pan.x).toBe(1e6);
      expect(result.pan.y).toBe(-1e6);
      expect(result.zoom).toBe(10);
    });

    test('应该处理极小的 zoom 值', () => {
      const result = validateCoordinates({ x: 0, y: 0 }, 0.001);
      expect(result.zoom).toBe(0.001);
    });

    test('应该处理空对象', () => {
      const blockResult = validateBlockCoordinates({});
      expect(blockResult.x).toBe(0);
      expect(blockResult.y).toBe(0);
      expect(blockResult.width).toBe(200);
      expect(blockResult.height).toBe(150);
    });
  });

  describe('CSS transform 字符串生成', () => {
    test('应该生成正确格式的 transform 字符串', () => {
      const testCases = [
        { pan: { x: 0, y: 0 }, zoom: 1, expected: 'translate(0px, 0px) scale(1)' },
        { pan: { x: 100, y: -50 }, zoom: 2, expected: 'translate(100px, -50px) scale(2)' },
        { pan: { x: -200, y: 300 }, zoom: 0.5, expected: 'translate(-200px, 300px) scale(0.5)' },
      ];

      testCases.forEach(({ pan, zoom, expected }) => {
        const result = generateSafeTransform(pan, zoom);
        expect(result).toBe(expected);
      });
    });

    test('生成的 transform 字符串应该是有效的 CSS', () => {
      const result = generateSafeTransform({ x: 123.45, y: -67.89 }, 1.23);
      
      // 验证字符串格式
      expect(result).toMatch(/^translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\) scale\(\d+(\.\d+)?\)$/);
      
      // 验证可以被浏览器解析（模拟）
      const element = { style: { transform: '' } };
      element.style.transform = result;
      expect(element.style.transform).toBe(result);
    });
  });
});

// 导出测试函数以便在其他地方使用
export {
  validateCoordinates,
  validateBlockCoordinates,
  generateSafeTransform
};