/**
 * System Monitoring Hook
 * 
 * Provides easy integration with the SystemMonitoringService
 * for React components throughout the application.
 * 
 * Requirements: 6.5, 8.6
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import SystemMonitoringService, { 
  SystemStatus, 
  SystemHealthMetrics, 
  SystemAlert, 
  FeatureUsageStats,
  UserAnalytics 
} from '../services/SystemMonitoringService';

interface UseSystemMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
}

interface UseSystemMonitoringReturn {
  // System status
  systemStatus: SystemStatus | null;
  isHealthy: boolean;
  
  // Metrics
  healthMetrics: SystemHealthMetrics[];
  latestMetrics: SystemHealthMetrics | null;
  
  // Alerts
  activeAlerts: SystemAlert[];
  alertCount: number;
  hasUnresolvedAlerts: boolean;
  
  // Analytics
  featureUsage: FeatureUsageStats[];
  userAnalytics: UserAnalytics[];
  
  // Actions
  trackEvent: (event: string, category: UserAnalytics['category'], data: Record<string, any>, duration?: number) => void;
  resolveAlert: (alertId: string) => boolean;
  refreshData: () => void;
  
  // Service instance
  monitoringService: SystemMonitoringService;
}

export const useSystemMonitoring = (options: UseSystemMonitoringOptions = {}): UseSystemMonitoringReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 5000,
    trackPageViews = true,
    trackUserInteractions = false
  } = options;

  const [monitoringService] = useState(() => SystemMonitoringService.getInstance());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageStats[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pageLoadTimeRef = useRef<number>(Date.now());

  const refreshData = useCallback(() => {
    try {
      setSystemStatus(monitoringService.getSystemStatus());
      setHealthMetrics(monitoringService.getHealthMetrics(50));
      setActiveAlerts(monitoringService.getSystemAlerts(false));
      setFeatureUsage(monitoringService.getFeatureUsageStats());
      setUserAnalytics(monitoringService.getUserAnalytics(undefined, 100));
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    }
  }, [monitoringService]);

  const trackEvent = useCallback((
    event: string, 
    category: UserAnalytics['category'], 
    data: Record<string, any>, 
    duration?: number
  ) => {
    try {
      monitoringService.trackEvent(event, category, data, duration);
      
      // Refresh analytics data if tracking feature usage
      if (category === 'feature_usage') {
        setFeatureUsage(monitoringService.getFeatureUsageStats());
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [monitoringService]);

  const resolveAlert = useCallback((alertId: string): boolean => {
    try {
      const resolved = monitoringService.resolveAlert(alertId);
      if (resolved) {
        setActiveAlerts(monitoringService.getSystemAlerts(false));
      }
      return resolved;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }, [monitoringService]);

  // Initialize monitoring and track page load
  useEffect(() => {
    refreshData();
    
    if (trackPageViews) {
      trackEvent('page_load', 'navigation', {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: pageLoadTimeRef.current,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    }

    // Track page unload
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - pageLoadTimeRef.current;
      trackEvent('page_unload', 'navigation', {
        url: window.location.href,
        sessionDuration
      }, sessionDuration);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [refreshData, trackEvent, trackPageViews]);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(refreshData, refreshInterval);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshData]);

  // Listen for system alerts
  useEffect(() => {
    const handleSystemAlert = (event: CustomEvent) => {
      setActiveAlerts(monitoringService.getSystemAlerts(false));
      setSystemStatus(monitoringService.getSystemStatus());
    };

    window.addEventListener('systemAlert', handleSystemAlert as EventListener);
    return () => window.removeEventListener('systemAlert', handleSystemAlert as EventListener);
  }, [monitoringService]);

  // Track user interactions if enabled
  useEffect(() => {
    if (!trackUserInteractions) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        trackEvent('button_click', 'navigation', {
          buttonText: button?.textContent?.trim() || 'Unknown',
          buttonId: button?.id || null,
          buttonClass: button?.className || null,
          timestamp: Date.now()
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Track important keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        trackEvent('keyboard_shortcut', 'navigation', {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          timestamp: Date.now()
        });
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [trackUserInteractions, trackEvent]);

  // Derived state
  const latestMetrics = healthMetrics.length > 0 ? healthMetrics[healthMetrics.length - 1] : null;
  const isHealthy = systemStatus?.overall === 'healthy';
  const alertCount = activeAlerts.length;
  const hasUnresolvedAlerts = alertCount > 0;

  return {
    // System status
    systemStatus,
    isHealthy,
    
    // Metrics
    healthMetrics,
    latestMetrics,
    
    // Alerts
    activeAlerts,
    alertCount,
    hasUnresolvedAlerts,
    
    // Analytics
    featureUsage,
    userAnalytics,
    
    // Actions
    trackEvent,
    resolveAlert,
    refreshData,
    
    // Service instance
    monitoringService
  };
};

// Specialized hooks for specific use cases

export const useSystemHealth = () => {
  const { systemStatus, healthMetrics, latestMetrics, isHealthy } = useSystemMonitoring({
    autoRefresh: true,
    refreshInterval: 3000
  });

  return {
    systemStatus,
    healthMetrics,
    latestMetrics,
    isHealthy,
    cpuUsage: latestMetrics?.cpu.usage || 0,
    memoryUsage: latestMetrics?.memory.percentage || 0,
    networkLatency: latestMetrics?.network.latency || 0,
    storageUsage: latestMetrics?.storage.percentage || 0
  };
};

export const useSystemAlerts = () => {
  const { activeAlerts, alertCount, hasUnresolvedAlerts, resolveAlert, monitoringService } = useSystemMonitoring({
    autoRefresh: true,
    refreshInterval: 2000
  });

  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');
  const errorAlerts = activeAlerts.filter(alert => alert.severity === 'error');
  const infoAlerts = activeAlerts.filter(alert => alert.severity === 'info');

  const resolveAllAlerts = useCallback(() => {
    activeAlerts.forEach(alert => resolveAlert(alert.id));
  }, [activeAlerts, resolveAlert]);

  const getResolvedAlerts = useCallback(() => {
    return monitoringService.getSystemAlerts(true);
  }, [monitoringService]);

  return {
    activeAlerts,
    alertCount,
    hasUnresolvedAlerts,
    criticalAlerts,
    warningAlerts,
    errorAlerts,
    infoAlerts,
    resolveAlert,
    resolveAllAlerts,
    getResolvedAlerts
  };
};

export const useFeatureTracking = () => {
  const { trackEvent, featureUsage } = useSystemMonitoring({
    autoRefresh: false,
    trackPageViews: false,
    trackUserInteractions: false
  });

  const trackFeatureUsage = useCallback((featureId: string, data: Record<string, any> = {}, duration?: number) => {
    trackEvent(featureId, 'feature_usage', { ...data, success: true }, duration);
  }, [trackEvent]);

  const trackFeatureError = useCallback((featureId: string, error: any, data: Record<string, any> = {}) => {
    trackEvent(featureId, 'feature_usage', { 
      ...data, 
      success: false, 
      error: error.message || 'Unknown error',
      errorType: error.name || 'Error'
    });
  }, [trackEvent]);

  const trackPerformance = useCallback((operation: string, duration: number, data: Record<string, any> = {}) => {
    trackEvent(operation, 'performance', { ...data, duration }, duration);
  }, [trackEvent]);

  const getMostUsedFeatures = useCallback((limit: number = 10) => {
    return featureUsage
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }, [featureUsage]);

  const getMostPopularFeatures = useCallback((limit: number = 10) => {
    return featureUsage
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }, [featureUsage]);

  return {
    trackFeatureUsage,
    trackFeatureError,
    trackPerformance,
    featureUsage,
    getMostUsedFeatures,
    getMostPopularFeatures
  };
};

export default useSystemMonitoring;