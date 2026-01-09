import { PresetPrompt, PresetPromptStorage } from '../types';
import { DEFAULT_SORA_PROMPT } from '../constants';

const STORAGE_KEY = 'preset-prompt-library';
const STORAGE_VERSION = '1.0.0';

/**
 * Create default preset prompts with SORA 2 content in first slot
 */
const createDefaultPrompts = (): PresetPrompt[] => {
  const prompts: PresetPrompt[] = [];
  
  for (let i = 0; i < 6; i++) {
    const prompt: PresetPrompt = {
      id: `preset-${i}`,
      title: i === 0 ? 'SORA 2 Global Rules' : '',
      content: i === 0 ? DEFAULT_SORA_PROMPT : '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    prompts.push(prompt);
  }
  
  return prompts;
};

/**
 * Create default storage structure
 */
const createDefaultStorage = (): PresetPromptStorage => ({
  version: STORAGE_VERSION,
  prompts: createDefaultPrompts(),
  selectedIndex: null,
  lastUpdated: new Date()
});

/**
 * Migrate storage data from older versions
 */
const migrateStorage = (data: any): PresetPromptStorage => {
  // If no version field, assume it's an old format
  if (!data.version) {
    // Handle legacy format if needed
    return createDefaultStorage();
  }
  
  // Handle version-specific migrations
  if (data.version === '1.0.0') {
    return data as PresetPromptStorage;
  }
  
  // Default to creating new storage for unknown versions
  return createDefaultStorage();
};

/**
 * Save preset prompts to localStorage
 */
export const savePresetPrompts = (
  prompts: PresetPrompt[], 
  selectedIndex: number | null = null
): boolean => {
  try {
    const storage: PresetPromptStorage = {
      version: STORAGE_VERSION,
      prompts,
      selectedIndex,
      lastUpdated: new Date()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    return true;
  } catch (error) {
    console.error('Failed to save preset prompts:', error);
    return false;
  }
};

/**
 * Load preset prompts from localStorage
 */
export const loadPresetPrompts = (): {
  prompts: PresetPrompt[];
  selectedIndex: number | null;
  isFirstRun: boolean;
} => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      // First run - create default storage
      const defaultStorage = createDefaultStorage();
      savePresetPrompts(defaultStorage.prompts, defaultStorage.selectedIndex);
      return {
        prompts: defaultStorage.prompts,
        selectedIndex: defaultStorage.selectedIndex,
        isFirstRun: true
      };
    }
    
    const parsed = JSON.parse(stored);
    const migrated = migrateStorage(parsed);
    
    // Convert date strings back to Date objects
    migrated.prompts.forEach(prompt => {
      prompt.createdAt = new Date(prompt.createdAt);
      prompt.updatedAt = new Date(prompt.updatedAt);
    });
    migrated.lastUpdated = new Date(migrated.lastUpdated);
    
    return {
      prompts: migrated.prompts,
      selectedIndex: migrated.selectedIndex,
      isFirstRun: false
    };
  } catch (error) {
    console.error('Failed to load preset prompts:', error);
    
    // Fallback to default storage on error
    const defaultStorage = createDefaultStorage();
    return {
      prompts: defaultStorage.prompts,
      selectedIndex: defaultStorage.selectedIndex,
      isFirstRun: true
    };
  }
};

/**
 * Clear all preset prompt data (for testing or reset)
 */
export const clearPresetPrompts = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear preset prompts:', error);
    return false;
  }
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = (): {
  isAvailable: boolean;
  hasData: boolean;
  dataSize: number;
} => {
  const isAvailable = isStorageAvailable();
  
  if (!isAvailable) {
    return { isAvailable: false, hasData: false, dataSize: 0 };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return {
      isAvailable: true,
      hasData: !!stored,
      dataSize: stored ? stored.length : 0
    };
  } catch (error) {
    return { isAvailable: true, hasData: false, dataSize: 0 };
  }
};

/**
 * Export preset prompts data for backup
 */
export const exportPresetPrompts = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored;
  } catch (error) {
    console.error('Failed to export preset prompts:', error);
    return null;
  }
};

/**
 * Import preset prompts data from backup
 */
export const importPresetPrompts = (data: string): boolean => {
  try {
    const parsed = JSON.parse(data);
    const migrated = migrateStorage(parsed);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return true;
  } catch (error) {
    console.error('Failed to import preset prompts:', error);
    return false;
  }
};