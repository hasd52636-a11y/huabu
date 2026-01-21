/**
 * Model Configuration Hook
 * 
 * React hook for managing model configuration integration
 */

import { useEffect, useState, useCallback } from 'react';
import { modelConfigurationIntegration } from '../services/ModelConfigurationIntegration';
import { GenerationType } from '../types/ModelConfigurationTypes';

interface ModelConfigurationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    availableModels: number;
    totalModels: number;
    issues: string[];
  } | null;
}

interface UseModelConfigurationReturn extends ModelConfigurationState {
  initialize: () => Promise<void>;
  checkModelAvailability: (modelId: string, generationType: GenerationType) => Promise<{
    isAvailable: boolean;
    status: string;
    error?: string;
  }>;
  validateModel: (modelId: string, generationType: GenerationType, parameters?: Record<string, any>) => Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
    suggestedFix?: string;
  }>;
  getModelCapabilities: (modelId: string, generationType: GenerationType) => Promise<{
    supported: boolean;
    capabilities: string[];
    limitations: string[];
    recommendedParameters: Record<string, any>;
  }>;
  refreshSystemHealth: () => Promise<void>;
  saveConfiguration: () => Promise<{ success: boolean; message: string }>;
  createBackup: (label?: string) => Promise<{ success: boolean; message: string; backupId?: string }>;
}

/**
 * Hook for model configuration management
 */
export function useModelConfiguration(): UseModelConfigurationReturn {
  const [state, setState] = useState<ModelConfigurationState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    systemHealth: null
  });

  /**
   * Initialize the model configuration system
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isLoading) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await modelConfigurationIntegration.initialize();
      
      // Get initial system health
      const health = await modelConfigurationIntegration.getSystemHealth();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        systemHealth: health
      }));

      console.log('[useModelConfiguration] Model configuration system initialized');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      console.error('[useModelConfiguration] Initialization failed:', error);
    }
  }, [state.isInitialized, state.isLoading]);

  /**
   * Check model availability
   */
  const checkModelAvailability = useCallback(async (
    modelId: string, 
    generationType: GenerationType
  ) => {
    if (!state.isInitialized) {
      throw new Error('Model configuration system not initialized');
    }

    return await modelConfigurationIntegration.checkModelAvailability(modelId, generationType);
  }, [state.isInitialized]);

  /**
   * Validate model configuration
   */
  const validateModel = useCallback(async (
    modelId: string,
    generationType: GenerationType,
    parameters?: Record<string, any>
  ) => {
    if (!state.isInitialized) {
      throw new Error('Model configuration system not initialized');
    }

    return await modelConfigurationIntegration.validateModelForSelector(
      modelId,
      generationType,
      parameters
    );
  }, [state.isInitialized]);

  /**
   * Get model capabilities
   */
  const getModelCapabilities = useCallback(async (
    modelId: string,
    generationType: GenerationType
  ) => {
    if (!state.isInitialized) {
      throw new Error('Model configuration system not initialized');
    }

    return await modelConfigurationIntegration.getModelCapabilities(modelId, generationType);
  }, [state.isInitialized]);

  /**
   * Refresh system health status
   */
  const refreshSystemHealth = useCallback(async () => {
    if (!state.isInitialized) {
      return;
    }

    try {
      const health = await modelConfigurationIntegration.getSystemHealth();
      setState(prev => ({ ...prev, systemHealth: health }));
    } catch (error) {
      console.error('[useModelConfiguration] Failed to refresh system health:', error);
    }
  }, [state.isInitialized]);

  /**
   * Save configuration
   */
  const saveConfiguration = useCallback(async () => {
    if (!state.isInitialized) {
      throw new Error('Model configuration system not initialized');
    }

    return await modelConfigurationIntegration.saveConfiguration();
  }, [state.isInitialized]);

  /**
   * Create configuration backup
   */
  const createBackup = useCallback(async (label?: string) => {
    if (!state.isInitialized) {
      throw new Error('Model configuration system not initialized');
    }

    return await modelConfigurationIntegration.createBackup(label);
  }, [state.isInitialized]);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (!state.isInitialized && !state.isLoading) {
      initialize();
    }
  }, [initialize, state.isInitialized, state.isLoading]);

  /**
   * Periodic health check
   */
  useEffect(() => {
    if (!state.isInitialized) {
      return;
    }

    const interval = setInterval(() => {
      refreshSystemHealth();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [state.isInitialized, refreshSystemHealth]);

  return {
    ...state,
    initialize,
    checkModelAvailability,
    validateModel,
    getModelCapabilities,
    refreshSystemHealth,
    saveConfiguration,
    createBackup
  };
}

/**
 * Hook for getting model configuration statistics
 */
export function useModelConfigurationStats() {
  const [stats, setStats] = useState<{
    models: {
      total: number;
      byType: Record<GenerationType, number>;
      enabled: number;
      deprecated: number;
    };
    availability: {
      checked: number;
      available: number;
      failed: number;
      cacheHitRate: number;
    };
    errors: {
      total: number;
      byType: Record<string, number>;
    };
  } | null>(null);

  const refreshStats = useCallback(() => {
    try {
      const statistics = modelConfigurationIntegration.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('[useModelConfigurationStats] Failed to get statistics:', error);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every minute
    const interval = setInterval(refreshStats, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    refreshStats
  };
}