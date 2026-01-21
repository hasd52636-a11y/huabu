/**
 * Configuration Storage
 * 
 * Manages configuration persistence, backup, and restore functionality
 */

import {
  ConfigurationStorage as IConfigurationStorage,
  StorageConfiguration,
  ConfigurationBackup,
  ConfigurationHistory,
  StorageResult
} from '../types/ModelConfigurationTypes';

/**
 * Configuration storage system
 */
export class ConfigurationStorage implements IConfigurationStorage {
  private storageKey = 'model-configurations';
  private backupKey = 'model-configurations-backup';
  private historyKey = 'model-configurations-history';
  private maxHistoryEntries = 50;

  /**
   * Save configuration
   */
  async saveConfiguration(config: StorageConfiguration): Promise<StorageResult> {
    try {
      // Add metadata
      const configWithMetadata = {
        ...config,
        savedAt: Date.now(),
        version: config.version || '1.0.0'
      };

      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(configWithMetadata));

      // Add to history
      await this.addToHistory(configWithMetadata);

      return {
        success: true,
        message: 'Configuration saved successfully',
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Load configuration
   */
  async loadConfiguration(): Promise<StorageResult<StorageConfiguration>> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (!stored) {
        return {
          success: false,
          message: 'No configuration found',
          timestamp: Date.now()
        };
      }

      const config = JSON.parse(stored) as StorageConfiguration;
      
      // Validate configuration structure
      if (!this.validateConfiguration(config)) {
        return {
          success: false,
          message: 'Invalid configuration format',
          timestamp: Date.now()
        };
      }

      return {
        success: true,
        message: 'Configuration loaded successfully',
        timestamp: Date.now(),
        data: config
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Create backup
   */
  async createBackup(label?: string): Promise<StorageResult<ConfigurationBackup>> {
    try {
      // Load current configuration
      const currentResult = await this.loadConfiguration();
      
      if (!currentResult.success || !currentResult.data) {
        return {
          success: false,
          message: 'No configuration to backup',
          timestamp: Date.now()
        };
      }

      // Create backup
      const backup: ConfigurationBackup = {
        id: this.generateBackupId(),
        label: label || `Backup ${new Date().toLocaleString()}`,
        configuration: currentResult.data,
        createdAt: Date.now(),
        version: currentResult.data.version || '1.0.0'
      };

      // Save backup
      const backups = await this.getBackups();
      backups.push(backup);

      // Keep only last 10 backups
      const trimmedBackups = backups.slice(-10);
      localStorage.setItem(this.backupKey, JSON.stringify(trimmedBackups));

      return {
        success: true,
        message: 'Backup created successfully',
        timestamp: Date.now(),
        data: backup
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<StorageResult> {
    try {
      const backups = await this.getBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        return {
          success: false,
          message: 'Backup not found',
          timestamp: Date.now()
        };
      }

      // Create backup of current configuration before restore
      await this.createBackup('Pre-restore backup');

      // Restore configuration
      const restoreResult = await this.saveConfiguration(backup.configuration);

      if (restoreResult.success) {
        return {
          success: true,
          message: `Configuration restored from backup: ${backup.label}`,
          timestamp: Date.now()
        };
      } else {
        return restoreResult;
      }

    } catch (error) {
      return {
        success: false,
        message: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Get configuration history
   */
  async getConfigurationHistory(): Promise<StorageResult<ConfigurationHistory[]>> {
    try {
      const stored = localStorage.getItem(this.historyKey);
      const history: ConfigurationHistory[] = stored ? JSON.parse(stored) : [];

      return {
        success: true,
        message: 'History retrieved successfully',
        timestamp: Date.now(),
        data: history
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Get all backups
   */
  async getAllBackups(): Promise<StorageResult<ConfigurationBackup[]>> {
    try {
      const backups = await this.getBackups();

      return {
        success: true,
        message: 'Backups retrieved successfully',
        timestamp: Date.now(),
        data: backups
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to get backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<StorageResult> {
    try {
      const backups = await this.getBackups();
      const filteredBackups = backups.filter(b => b.id !== backupId);

      if (filteredBackups.length === backups.length) {
        return {
          success: false,
          message: 'Backup not found',
          timestamp: Date.now()
        };
      }

      localStorage.setItem(this.backupKey, JSON.stringify(filteredBackups));

      return {
        success: true,
        message: 'Backup deleted successfully',
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Export configuration
   */
  async exportConfiguration(): Promise<StorageResult<string>> {
    try {
      const configResult = await this.loadConfiguration();
      
      if (!configResult.success || !configResult.data) {
        return {
          success: false,
          message: 'No configuration to export',
          timestamp: Date.now()
        };
      }

      // Create export data
      const exportData = {
        configuration: configResult.data,
        backups: await this.getBackups(),
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      const exportString = JSON.stringify(exportData, null, 2);

      return {
        success: true,
        message: 'Configuration exported successfully',
        timestamp: Date.now(),
        data: exportString
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Import configuration
   */
  async importConfiguration(importData: string): Promise<StorageResult> {
    try {
      const data = JSON.parse(importData);

      // Validate import data
      if (!data.configuration) {
        return {
          success: false,
          message: 'Invalid import data: missing configuration',
          timestamp: Date.now()
        };
      }

      // Create backup before import
      await this.createBackup('Pre-import backup');

      // Import configuration
      const importResult = await this.saveConfiguration(data.configuration);

      if (!importResult.success) {
        return importResult;
      }

      // Import backups if available
      if (data.backups && Array.isArray(data.backups)) {
        const existingBackups = await this.getBackups();
        const allBackups = [...existingBackups, ...data.backups];
        
        // Keep only last 20 backups after import
        const trimmedBackups = allBackups.slice(-20);
        localStorage.setItem(this.backupKey, JSON.stringify(trimmedBackups));
      }

      return {
        success: true,
        message: 'Configuration imported successfully',
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<StorageResult> {
    try {
      // Create final backup before clearing
      await this.createBackup('Final backup before clear');

      // Clear all storage
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.historyKey);
      // Keep backups for recovery

      return {
        success: true,
        message: 'All configuration data cleared (backups preserved)',
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<StorageResult<{
    configurationSize: number;
    backupCount: number;
    historyCount: number;
    totalSize: number;
    lastSaved?: number;
  }>> {
    try {
      const config = localStorage.getItem(this.storageKey);
      const backups = localStorage.getItem(this.backupKey);
      const history = localStorage.getItem(this.historyKey);

      const configSize = config ? new Blob([config]).size : 0;
      const backupSize = backups ? new Blob([backups]).size : 0;
      const historySize = history ? new Blob([history]).size : 0;

      const backupData = backups ? JSON.parse(backups) : [];
      const historyData = history ? JSON.parse(history) : [];
      const configData = config ? JSON.parse(config) : null;

      return {
        success: true,
        message: 'Storage statistics retrieved',
        timestamp: Date.now(),
        data: {
          configurationSize: configSize,
          backupCount: backupData.length,
          historyCount: historyData.length,
          totalSize: configSize + backupSize + historySize,
          lastSaved: configData?.savedAt
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to get storage statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfiguration(config: any): config is StorageConfiguration {
    return (
      typeof config === 'object' &&
      config !== null &&
      typeof config.modelMappings === 'object' &&
      typeof config.parameterFormats === 'object' &&
      typeof config.errorHandling === 'object'
    );
  }

  /**
   * Add configuration to history
   */
  private async addToHistory(config: StorageConfiguration): Promise<void> {
    try {
      const historyResult = await this.getConfigurationHistory();
      const history = historyResult.data || [];

      // Create history entry
      const historyEntry: ConfigurationHistory = {
        id: this.generateHistoryId(),
        configuration: config,
        timestamp: Date.now(),
        changeType: 'manual_save',
        description: 'Configuration saved manually'
      };

      // Add to history
      history.push(historyEntry);

      // Keep only recent entries
      const trimmedHistory = history.slice(-this.maxHistoryEntries);

      // Save history
      localStorage.setItem(this.historyKey, JSON.stringify(trimmedHistory));

    } catch (error) {
      console.warn('Failed to add to history:', error);
      // Don't throw - history is not critical
    }
  }

  /**
   * Get backups from storage
   */
  private async getBackups(): Promise<ConfigurationBackup[]> {
    try {
      const stored = localStorage.getItem(this.backupKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate history ID
   */
  private generateHistoryId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global configuration storage instance
 */
export const configurationStorage = new ConfigurationStorage();