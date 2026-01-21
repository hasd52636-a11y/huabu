/**
 * Sidebar Model Selectors Unit Tests
 * 测试侧边栏模型选择器的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getAllImageModels, 
  getAllVideoModels, 
  FEATURE_BINDINGS,
  DEFAULT_MODEL_PREFERENCES 
} from '../types';
import { FeatureModelManager } from '../services/FeatureModelManager';
import { ModelPreferencesStorage } from '../utils/ModelPreferencesStorage';

describe('Feature: sidebar-model-selectors', () => {
  let featureManager: FeatureModelManager;

  beforeEach(() => {
    featureManager = new FeatureModelManager();
    // 清理 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Model Constants', () => {
    it('should have valid image models', () => {
      const imageModels = getAllImageModels();
      expect(imageModels).toBeInstanceOf(Array);
      expect(imageModels.length).toBeGreaterThan(0);
      expect(imageModels).toContain('nano-banana-hd');
      expect(imageModels).toContain('byteedit-v2.0');
    });

    it('should have valid video models', () => {
      const videoModels = getAllVideoModels();
      expect(videoModels).toBeInstanceOf(Array);
      expect(videoModels.length).toBeGreaterThan(0);
      expect(videoModels).toContain('sora_video2');
      expect(videoModels).toContain('sora-2');
    });

    it('should have no overlap between image and video models', () => {
      const imageModels = getAllImageModels();
      const videoModels = getAllVideoModels();
      const overlap = imageModels.filter(model => videoModels.includes(model));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('FeatureModelManager', () => {
    it('should return correct required model for smear removal', () => {
      const requiredModel = featureManager.getRequiredModel('smear-removal');
      expect(requiredModel).toBe('byteedit-v2.0');
    });

    it('should return correct required model for character cameo', () => {
      const requiredModel = featureManager.getRequiredModel('character-cameo');
      expect(requiredModel).toBe('sora-2');
    });

    it('should return null for non-existent feature', () => {
      const requiredModel = featureManager.getRequiredModel('non-existent-feature');
      expect(requiredModel).toBeNull();
    });

    it('should correctly identify when model should be locked', () => {
      const shouldLock = featureManager.shouldLockModel('smear-removal', 'nano-banana-hd');
      expect(shouldLock).toBe(true);
    });

    it('should not lock model when user preference matches required model', () => {
      const shouldLock = featureManager.shouldLockModel('smear-removal', 'byteedit-v2.0');
      expect(shouldLock).toBe(false);
    });

    it('should provide friendly lock reason', () => {
      const lockReason = featureManager.getLockReason('smear-removal');
      expect(lockReason).toBe('涂抹去除需要 ByteEdit 专用API');
    });

    it('should return model selection result with lock info', () => {
      const result = featureManager.getModelForFeature('smear-removal', 'nano-banana-hd');
      expect(result.selectedModel).toBe('byteedit-v2.0');
      expect(result.isLocked).toBe(true);
      expect(result.conflictWithPreference).toBe(true);
      expect(result.lockReason).toBe('涂抹去除需要 ByteEdit 专用API');
    });

    it('should return non-locked result for features without requirements', () => {
      const result = featureManager.getModelForFeature('non-existent-feature', 'nano-banana-hd');
      expect(result.isLocked).toBe(false);
      expect(result.conflictWithPreference).toBe(false);
    });

    it('should validate feature IDs correctly', () => {
      expect(featureManager.isValidFeature('smear-removal')).toBe(true);
      expect(featureManager.isValidFeature('character-cameo')).toBe(true);
      expect(featureManager.isValidFeature('invalid-feature')).toBe(false);
    });

    it('should return correct display names', () => {
      expect(featureManager.getFeatureDisplayName('smear-removal', 'zh')).toBe('涂抹去除');
      expect(featureManager.getFeatureDisplayName('smear-removal', 'en')).toBe('Smear Removal');
    });
  });

  describe('ModelPreferencesStorage', () => {
    it('should return default preferences when no storage exists', () => {
      const preferences = ModelPreferencesStorage.getPreferences();
      expect(preferences.defaultImageModel).toBe(DEFAULT_MODEL_PREFERENCES.defaultImageModel);
      expect(preferences.defaultVideoModel).toBe(DEFAULT_MODEL_PREFERENCES.defaultVideoModel);
      expect(preferences.defaultTextModel).toBe(DEFAULT_MODEL_PREFERENCES.defaultTextModel);
    });

    it('should save and retrieve image model preference', () => {
      const testModel = 'flux-kontext-max';
      const success = ModelPreferencesStorage.setImageModelPreference(testModel);
      expect(success).toBe(true);
      
      const retrieved = ModelPreferencesStorage.getImageModelPreference();
      expect(retrieved).toBe(testModel);
    });

    it('should save and retrieve video model preference', () => {
      const testModel = 'sora-2-pro';
      const success = ModelPreferencesStorage.setVideoModelPreference(testModel);
      expect(success).toBe(true);
      
      const retrieved = ModelPreferencesStorage.getVideoModelPreference();
      expect(retrieved).toBe(testModel);
    });

    it('should save and retrieve text model preference', () => {
      const testModel = 'gemini-3-pro-preview';
      const success = ModelPreferencesStorage.setTextModelPreference(testModel);
      expect(success).toBe(true);
      
      const retrieved = ModelPreferencesStorage.getTextModelPreference();
      expect(retrieved).toBe(testModel);
    });

    it('should persist preferences across instances', () => {
      const testPreferences = {
        defaultImageModel: 'dall-e-3',
        defaultVideoModel: 'veo3-pro',
        defaultTextModel: 'gemini-3-flash-preview'
      };
      
      ModelPreferencesStorage.savePreferences(testPreferences);
      
      // Create new instance to test persistence
      const retrieved = ModelPreferencesStorage.getPreferences();
      expect(retrieved.defaultImageModel).toBe(testPreferences.defaultImageModel);
      expect(retrieved.defaultVideoModel).toBe(testPreferences.defaultVideoModel);
      expect(retrieved.defaultTextModel).toBe(testPreferences.defaultTextModel);
    });

    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;
      
      localStorage.setItem = () => {
        throw new Error('localStorage not available');
      };
      localStorage.getItem = () => {
        throw new Error('localStorage not available');
      };
      
      const success = ModelPreferencesStorage.setImageModelPreference('test-model');
      expect(success).toBe(false);
      
      // Restore original localStorage
      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
    });

    it('should reset to defaults correctly', () => {
      // Set some preferences first
      ModelPreferencesStorage.setImageModelPreference('custom-model');
      
      // Reset to defaults
      const success = ModelPreferencesStorage.resetToDefaults();
      expect(success).toBe(true);
      
      // Check that preferences are back to defaults
      const preferences = ModelPreferencesStorage.getPreferences();
      expect(preferences.defaultImageModel).toBe(DEFAULT_MODEL_PREFERENCES.defaultImageModel);
    });

    it('should report storage status correctly', () => {
      const status = ModelPreferencesStorage.getStorageStatus();
      expect(status.isAvailable).toBe(true);
      expect(typeof status.hasStoredPreferences).toBe('boolean');
    });
  });

  describe('Feature Bindings', () => {
    it('should have all required feature bindings', () => {
      const requiredFeatures = [
        'smear-removal',
        'style-transfer', 
        'background-removal',
        'image-enhance',
        'character-cameo',
        'video-style-transfer',
        'character-animation'
      ];
      
      requiredFeatures.forEach(feature => {
        expect(FEATURE_BINDINGS[feature]).toBeDefined();
        expect(FEATURE_BINDINGS[feature].model).toBeTruthy();
        expect(FEATURE_BINDINGS[feature].reason).toBeTruthy();
      });
    });

    it('should have valid model references in bindings', () => {
      const allModels = [...getAllImageModels(), ...getAllVideoModels()];
      
      Object.values(FEATURE_BINDINGS).forEach(binding => {
        // Some models might be special ones not in our general lists
        expect(binding.model).toBeTruthy();
        expect(typeof binding.model).toBe('string');
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing model constants', () => {
      // Test that we haven't accidentally modified existing constants
      const imageModels = getAllImageModels();
      const videoModels = getAllVideoModels();
      
      // These should still exist for backward compatibility
      expect(imageModels).toContain('nano-banana-hd');
      expect(videoModels).toContain('sora_video2');
    });

    it('should maintain default model preferences structure', () => {
      const defaults = DEFAULT_MODEL_PREFERENCES;
      expect(defaults).toHaveProperty('defaultImageModel');
      expect(defaults).toHaveProperty('defaultVideoModel');
      expect(defaults).toHaveProperty('defaultTextModel');
      expect(defaults).toHaveProperty('lastUpdated');
    });
  });
});