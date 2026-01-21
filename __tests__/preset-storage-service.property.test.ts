/**
 * Property-Based Tests for PresetStorageService
 * 
 * Tests Property 12: Preset Management Round-Trip
 * Validates: Requirements 6.2, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PresetStorageService } from '../services/PresetStorageService';
import { 
  ParameterPreset,
  GenerationParameters
} from '../types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PresetStorageService Property Tests', () => {
  let service: PresetStorageService;

  beforeEach(() => {
    localStorageMock.clear();
    service = PresetStorageService.getInstance();
  });

  afterEach(() => {
    service.cleanupResources();
    localStorageMock.clear();
  });

  /**
   * Property 12: Preset Management Round-Trip
   * **Validates: Requirements 6.2, 6.4, 6.5**
   * 
   * 验证预设管理的完整往返过程
   */
  describe('Property 12: Preset Management Round-Trip', () => {
    
    it('should save and load presets consistently', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 500 }),
          negativePrompt: fc.option(fc.string({ maxLength: 200 })),
          aspectRatio: fc.constantFrom('1:1', '4:3', '16:9', '9:16'),
          imageSize: fc.option(fc.constantFrom('1K', '2K', '4K')),
          duration: fc.option(fc.constantFrom('10', '15', '25')),
          guidanceScale: fc.option(fc.float({ min: 1, max: 20 })),
          steps: fc.option(fc.integer({ min: 10, max: 50 })),
          seed: fc.option(fc.integer({ min: -1, max: 2147483647 }))
        }),
        fc.constantFrom('image', 'video'),
        fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        fc.option(fc.string({ minLength: 1, maxLength: 200 })),
        async (name, parameters, generationType, modelId, description) => {
          // Property: 保存预设应该成功
          const savedPreset = await service.savePreset(
            name, 
            parameters, 
            generationType, 
            modelId, 
            description
          );
          
          expect(savedPreset).toBeDefined();
          expect(savedPreset.name).toBe(name);
          expect(savedPreset.generationType).toBe(generationType);
          expect(savedPreset.parameters).toEqual(parameters);
          expect(savedPreset.modelId).toBe(modelId);
          expect(savedPreset.description).toBe(description);
          
          // Property: 加载预设应该返回相同的数据
          const loadedPreset = await service.getPreset(savedPreset.id);
          expect(loadedPreset).toEqual(savedPreset);
          
          // Property: 预设列表应该包含保存的预设
          const presets = await service.loadPresets(generationType);
          const foundPreset = presets.find(p => p.id === savedPreset.id);
          expect(foundPreset).toEqual(savedPreset);
        }
      ), { numRuns: 30 });
    });

    it('should handle preset updates correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 500 }),
          aspectRatio: fc.constantFrom('1:1', '4:3', '16:9')
        }),
        fc.constantFrom('image', 'video'),
        fc.record({
          name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          description: fc.option(fc.string({ maxLength: 200 })),
          parameters: fc.option(fc.record({
            prompt: fc.string({ minLength: 1, maxLength: 500 }),
            aspectRatio: fc.constantFrom('1:1', '4:3', '16:9')
          }))
        }),
        async (originalName, originalParameters, generationType, updates) => {
          // 创建原始预设
          const originalPreset = await service.savePreset(
            originalName,
            originalParameters,
            generationType
          );
          
          // Property: 更新预设应该成功
          const updatedPreset = await service.updatePreset(originalPreset.id, updates);
          expect(updatedPreset).toBeDefined();
          
          if (updatedPreset) {
            // Property: 更新后的预设应该保持ID和创建时间不变
            expect(updatedPreset.id).toBe(originalPreset.id);
            expect(updatedPreset.createdAt).toBe(originalPreset.createdAt);
            expect(updatedPreset.updatedAt).toBeGreaterThan(originalPreset.updatedAt);
            
            // Property: 更新的字段应该反映新值
            if (updates.name) {
              expect(updatedPreset.name).toBe(updates.name);
            } else {
              expect(updatedPreset.name).toBe(originalPreset.name);
            }
            
            if (updates.description !== undefined) {
              expect(updatedPreset.description).toBe(updates.description);
            }
            
            if (updates.parameters) {
              expect(updatedPreset.parameters).toEqual(updates.parameters);
            } else {
              expect(updatedPreset.parameters).toEqual(originalPreset.parameters);
            }
            
            // Property: 从存储加载应该返回更新后的数据
            const reloadedPreset = await service.getPreset(originalPreset.id);
            expect(reloadedPreset).toEqual(updatedPreset);
          }
        }
      ), { numRuns: 25 });
    });

    it('should handle preset deletion correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            parameters: fc.record({
              prompt: fc.string({ minLength: 1, maxLength: 100 })
            }),
            generationType: fc.constantFrom('image', 'video')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.integer({ min: 0, max: 4 }),
        async (presetData, deleteIndex) => {
          // 创建多个预设
          const savedPresets: ParameterPreset[] = [];
          for (const data of presetData) {
            const preset = await service.savePreset(
              `${data.name}_${Math.random()}`, // 确保名称唯一
              data.parameters,
              data.generationType
            );
            savedPresets.push(preset);
          }
          
          if (deleteIndex < savedPresets.length) {
            const presetToDelete = savedPresets[deleteIndex];
            
            // Property: 删除预设应该成功
            const deleteResult = await service.deletePreset(presetToDelete.id);
            expect(deleteResult).toBe(true);
            
            // Property: 删除后应该无法获取该预设
            const deletedPreset = await service.getPreset(presetToDelete.id);
            expect(deletedPreset).toBeNull();
            
            // Property: 预设列表不应包含已删除的预设
            const remainingPresets = await service.loadPresets();
            const foundDeleted = remainingPresets.find(p => p.id === presetToDelete.id);
            expect(foundDeleted).toBeUndefined();
            
            // Property: 其他预设应该仍然存在
            const otherPresets = savedPresets.filter((_, i) => i !== deleteIndex);
            for (const otherPreset of otherPresets) {
              const stillExists = await service.getPreset(otherPreset.id);
              expect(stillExists).toEqual(otherPreset);
            }
          }
        }
      ), { numRuns: 20 });
    });

    it('should handle preset duplication correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 500 }),
          aspectRatio: fc.constantFrom('1:1', '4:3', '16:9')
        }),
        fc.constantFrom('image', 'video'),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        async (name, parameters, generationType, newName) => {
          // 创建原始预设
          const originalPreset = await service.savePreset(
            name,
            parameters,
            generationType
          );
          
          // Property: 复制预设应该成功
          const duplicatedPreset = await service.duplicatePreset(originalPreset.id, newName);
          expect(duplicatedPreset).toBeDefined();
          
          if (duplicatedPreset) {
            // Property: 复制的预设应该有不同的ID
            expect(duplicatedPreset.id).not.toBe(originalPreset.id);
            
            // Property: 复制的预设应该有相同的参数
            expect(duplicatedPreset.parameters).toEqual(originalPreset.parameters);
            expect(duplicatedPreset.generationType).toBe(originalPreset.generationType);
            expect(duplicatedPreset.modelId).toBe(originalPreset.modelId);
            expect(duplicatedPreset.description).toBe(originalPreset.description);
            
            // Property: 复制的预设应该有不同的名称
            if (newName) {
              expect(duplicatedPreset.name).toBe(newName);
            } else {
              expect(duplicatedPreset.name).toContain('副本');
            }
            
            // Property: 两个预设都应该存在于存储中
            const originalExists = await service.getPreset(originalPreset.id);
            const duplicateExists = await service.getPreset(duplicatedPreset.id);
            expect(originalExists).toEqual(originalPreset);
            expect(duplicateExists).toEqual(duplicatedPreset);
          }
        }
      ), { numRuns: 20 });
    });

    it('should handle export and import correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            parameters: fc.record({
              prompt: fc.string({ minLength: 1, maxLength: 200 }),
              aspectRatio: fc.constantFrom('1:1', '4:3', '16:9')
            }),
            generationType: fc.constantFrom('image', 'video'),
            description: fc.option(fc.string({ maxLength: 100 }))
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (presetDataList) => {
          // 创建预设
          const savedPresets: ParameterPreset[] = [];
          for (let i = 0; i < presetDataList.length; i++) {
            const data = presetDataList[i];
            const preset = await service.savePreset(
              `${data.name}_${i}`, // 确保名称唯一
              data.parameters,
              data.generationType,
              undefined,
              data.description
            );
            savedPresets.push(preset);
          }
          
          // Property: 导出应该成功
          const exportData = await service.exportPresets();
          expect(typeof exportData).toBe('string');
          
          const parsedExport = JSON.parse(exportData);
          expect(parsedExport.presets).toBeDefined();
          expect(Array.isArray(parsedExport.presets)).toBe(true);
          expect(parsedExport.presets.length).toBe(savedPresets.length);
          
          // 清空存储
          for (const preset of savedPresets) {
            await service.deletePreset(preset.id);
          }
          
          // Property: 导入应该成功
          const importResult = await service.importPresets(exportData);
          expect(importResult.imported).toBe(savedPresets.length);
          expect(importResult.errors.length).toBe(0);
          
          // Property: 导入后的预设应该与原始预设匹配（除了ID）
          const importedPresets = await service.loadPresets();
          expect(importedPresets.length).toBe(savedPresets.length);
          
          for (const originalPreset of savedPresets) {
            const matchingImported = importedPresets.find(p => 
              p.name === originalPreset.name && 
              p.generationType === originalPreset.generationType
            );
            expect(matchingImported).toBeDefined();
            
            if (matchingImported) {
              expect(matchingImported.parameters).toEqual(originalPreset.parameters);
              expect(matchingImported.description).toBe(originalPreset.description);
            }
          }
        }
      ), { numRuns: 15 });
    });

    it('should handle search functionality correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            parameters: fc.record({
              prompt: fc.string({ minLength: 1, maxLength: 200 })
            }),
            generationType: fc.constantFrom('image', 'video'),
            description: fc.option(fc.string({ maxLength: 100 }))
          }),
          { minLength: 2, maxLength: 5 }
        ),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (presetDataList, searchQuery) => {
          // 创建预设
          const savedPresets: ParameterPreset[] = [];
          for (let i = 0; i < presetDataList.length; i++) {
            const data = presetDataList[i];
            const preset = await service.savePreset(
              `${data.name}_${i}`,
              data.parameters,
              data.generationType,
              undefined,
              data.description
            );
            savedPresets.push(preset);
          }
          
          // Property: 搜索应该返回匹配的预设
          const searchResults = await service.searchPresets(searchQuery);
          
          // 验证搜索结果
          for (const result of searchResults) {
            const query = searchQuery.toLowerCase();
            const matchesName = result.name.toLowerCase().includes(query);
            const matchesDescription = result.description?.toLowerCase().includes(query) || false;
            const matchesPrompt = result.parameters.prompt.toLowerCase().includes(query);
            
            expect(matchesName || matchesDescription || matchesPrompt).toBe(true);
          }
          
          // Property: 搜索结果应该是已保存预设的子集
          for (const result of searchResults) {
            const originalPreset = savedPresets.find(p => p.id === result.id);
            expect(originalPreset).toBeDefined();
          }
        }
      ), { numRuns: 15 });
    });

    it('should handle default preset management correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            parameters: fc.record({
              prompt: fc.string({ minLength: 1, maxLength: 100 })
            }),
            generationType: fc.constantFrom('image', 'video')
          }),
          { minLength: 2, maxLength: 4 }
        ),
        fc.integer({ min: 0, max: 3 }),
        async (presetDataList, defaultIndex) => {
          // 创建预设
          const savedPresets: ParameterPreset[] = [];
          for (let i = 0; i < presetDataList.length; i++) {
            const data = presetDataList[i];
            const preset = await service.savePreset(
              `${data.name}_${i}`,
              data.parameters,
              data.generationType
            );
            savedPresets.push(preset);
          }
          
          if (defaultIndex < savedPresets.length) {
            const presetToSetDefault = savedPresets[defaultIndex];
            
            // Property: 设置默认预设应该成功
            const setDefaultResult = await service.setDefaultPreset(presetToSetDefault.id, true);
            expect(setDefaultResult).toBe(true);
            
            // Property: 获取默认预设应该返回设置的预设
            const defaultPresets = await service.getDefaultPresets(presetToSetDefault.generationType);
            const foundDefault = defaultPresets.find(p => p.id === presetToSetDefault.id);
            expect(foundDefault).toBeDefined();
            expect(foundDefault?.isDefault).toBe(true);
            
            // Property: 同类型的其他预设不应该是默认的
            const sameTypePresets = savedPresets.filter(p => 
              p.generationType === presetToSetDefault.generationType && 
              p.id !== presetToSetDefault.id
            );
            
            for (const preset of sameTypePresets) {
              const reloadedPreset = await service.getPreset(preset.id);
              expect(reloadedPreset?.isDefault).toBe(false);
            }
          }
        }
      ), { numRuns: 15 });
    });

    it('should maintain storage consistency across operations', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            operation: fc.constantFrom('save', 'update', 'delete'),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            parameters: fc.record({
              prompt: fc.string({ minLength: 1, maxLength: 100 })
            }),
            generationType: fc.constantFrom('image', 'video')
          }),
          { minLength: 3, maxLength: 8 }
        ),
        async (operations) => {
          const createdPresets: ParameterPreset[] = [];
          
          for (const op of operations) {
            try {
              if (op.operation === 'save') {
                const preset = await service.savePreset(
                  `${op.name}_${Date.now()}_${Math.random()}`,
                  op.parameters,
                  op.generationType
                );
                createdPresets.push(preset);
              } else if (op.operation === 'update' && createdPresets.length > 0) {
                const randomPreset = createdPresets[Math.floor(Math.random() * createdPresets.length)];
                await service.updatePreset(randomPreset.id, {
                  description: `Updated ${Date.now()}`
                });
              } else if (op.operation === 'delete' && createdPresets.length > 0) {
                const randomIndex = Math.floor(Math.random() * createdPresets.length);
                const presetToDelete = createdPresets[randomIndex];
                await service.deletePreset(presetToDelete.id);
                createdPresets.splice(randomIndex, 1);
              }
            } catch (error) {
              // 忽略预期的错误（如重复名称）
            }
          }
          
          // Property: 存储统计应该与实际预设数量一致
          const stats = await service.getStorageStats();
          const actualPresets = await service.loadPresets();
          
          expect(stats.totalPresets).toBe(actualPresets.length);
          
          const imageCount = actualPresets.filter(p => p.generationType === 'image').length;
          const videoCount = actualPresets.filter(p => p.generationType === 'video').length;
          
          expect(stats.imagePresets).toBe(imageCount);
          expect(stats.videoPresets).toBe(videoCount);
        }
      ), { numRuns: 10 });
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling Properties', () => {
    
    it('should handle invalid preset names correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\n')
        ),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 })
        }),
        fc.constantFrom('image', 'video'),
        async (invalidName, parameters, generationType) => {
          // Property: 无效名称应该抛出错误
          await expect(service.savePreset(invalidName, parameters, generationType))
            .rejects.toThrow('预设名称不能为空');
        }
      ), { numRuns: 10 });
    });

    it('should handle duplicate preset names correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          prompt: fc.string({ minLength: 1, maxLength: 100 })
        }),
        fc.constantFrom('image', 'video'),
        async (name, parameters, generationType) => {
          // 创建第一个预设
          await service.savePreset(name, parameters, generationType);
          
          // Property: 重复名称应该抛出错误
          await expect(service.savePreset(name, parameters, generationType))
            .rejects.toThrow(`预设名称 "${name}" 已存在`);
        }
      ), { numRuns: 15 });
    });

    it('should handle non-existent preset operations correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (nonExistentId) => {
          // Property: 获取不存在的预设应该返回null
          const preset = await service.getPreset(nonExistentId);
          expect(preset).toBeNull();
          
          // Property: 删除不存在的预设应该返回false
          const deleteResult = await service.deletePreset(nonExistentId);
          expect(deleteResult).toBe(false);
          
          // Property: 更新不存在的预设应该返回null
          const updateResult = await service.updatePreset(nonExistentId, { description: 'test' });
          expect(updateResult).toBeNull();
          
          // Property: 复制不存在的预设应该返回null
          const duplicateResult = await service.duplicatePreset(nonExistentId);
          expect(duplicateResult).toBeNull();
        }
      ), { numRuns: 10 });
    });
  });
});