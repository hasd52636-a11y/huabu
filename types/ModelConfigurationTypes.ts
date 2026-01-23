/**
 * Model Configuration Fix System Types
 * 
 * This file contains all type definitions for the model configuration fix system
 * that addresses issues with Shenma API model integration.
 */

// ============================================================================
// CORE ENUMS AND CONSTANTS
// ============================================================================

/**
 * Model configuration error types
 */
export enum ModelConfigurationErrorType {
  MODEL_ID_MAPPING_ERROR = 'model_id_mapping_error',
  PARAMETER_FORMAT_ERROR = 'parameter_format_error',
  API_CONNECTIVITY_ERROR = 'api_connectivity_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  QUOTA_EXCEEDED_ERROR = 'quota_exceeded_error',
  MODEL_NOT_SUPPORTED_ERROR = 'model_not_supported_error',
  CONFIGURATION_VALIDATION_ERROR = 'configuration_validation_error'
}

/**
 * Model availability status
 */
export type ModelAvailabilityStatus = 'available' | 'unavailable' | 'checking' | 'error';

/**
 * Model health status
 */
export type ModelHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/**
 * Generation types supported by the system
 */
export type GenerationType = 'text' | 'image' | 'video';

/**
 * Priority levels for model checks
 */
export type ModelCheckPriority = 'high' | 'normal' | 'low';

// ============================================================================
// MODEL REGISTRY INTERFACES
// ============================================================================

/**
 * Provider type
 */
export type ProviderType = 'shenma' | 'google' | 'openai' | 'anthropic' | 'local';

/**
 * Model metadata
 */
export interface ModelMetadata {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  limitations: string[];
  pricing?: {
    inputTokens: number;
    outputTokens: number;
    currency: string;
  };
  contextWindow?: number;
  maxOutputTokens?: number;
}

/**
 * Model registration
 */
export interface ModelRegistration {
  modelId: string;
  generationType: GenerationType;
  provider: ProviderType;
  metadata: ModelMetadata;
  isEnabled: boolean;
  isDeprecated: boolean;
  registeredAt: number;
  lastUpdated: number;
}

/**
 * Model lookup result
 */
export interface ModelLookupResult {
  found: boolean;
  registration?: ModelRegistration;
  metadata?: ModelMetadata;
  isAvailable: boolean;
}

/**
 * Model Registry interface
 */
export interface ModelRegistry {
  // Register model
  registerModel(registration: ModelRegistration): void;
  
  // Unregister model
  unregisterModel(modelId: string, generationType: GenerationType): boolean;
  
  // Lookup model
  lookupModel(modelId: string, generationType: GenerationType): ModelLookupResult | null;
  
  // Lookup by type
  lookupByType(generationType: GenerationType): ModelLookupResult[];
  
  // Lookup by provider
  lookupByProvider(provider: ProviderType): ModelLookupResult[];
  
  // Get all models
  getAllModels(): ModelRegistration[];
  
  // Search models
  searchModels(criteria: {
    query?: string;
    generationType?: GenerationType;
    provider?: ProviderType;
    isEnabled?: boolean;
    isDeprecated?: boolean;
    capabilities?: string[];
  }): ModelLookupResult[];
}

// ============================================================================
// MODEL ID MAPPING INTERFACES
// ============================================================================

/**
 * Model ID mapping configuration
 */
export interface ModelIdMapping {
  internalId: string;      // Internal model identifier used in the app
  apiId: string;           // Actual API identifier expected by Shenma API
  provider: string;        // Provider name (shenma, google, etc.)
  generationType: GenerationType;
  isActive: boolean;       // Whether this mapping is currently active
  lastValidated?: number;  // Timestamp of last validation
}

/**
 * Model ID Mapper interface
 */
export interface ModelIdMapper {
  // Get API ID for internal model ID
  getApiId(internalId: string, generationType: GenerationType): string | null;
  
  // Map model ID (alias for getApiId for backward compatibility)
  mapModelId(internalId: string, generationType: GenerationType): string | null;
  
  // Get internal ID for API ID
  getInternalId(apiId: string, generationType: GenerationType): string | null;
  
  // Add or update mapping
  setMapping(mapping: ModelIdMapping): void;
  
  // Remove mapping
  removeMapping(internalId: string, generationType: GenerationType): void;
  
  // Get all mappings for a generation type
  getMappings(generationType: GenerationType): ModelIdMapping[];
  
  // Get all mappings
  getAllMappings(): ModelIdMapping[];
  
  // Validate all mappings
  validateMappings(): Promise<ModelMappingValidationResult>;
}

/**
 * Model mapping validation result
 */
export interface ModelMappingValidationResult {
  isValid: boolean;
  validMappings: ModelIdMapping[];
  invalidMappings: ModelIdMapping[];
  errors: ModelMappingError[];
  warnings: ModelMappingWarning[];
}

/**
 * Model mapping error
 */
export interface ModelMappingError {
  mappingId: string;
  errorType: ModelConfigurationErrorType;
  message: string;
  suggestedFix?: string;
}

/**
 * Model mapping warning
 */
export interface ModelMappingWarning {
  mappingId: string;
  warningType: 'deprecated' | 'performance' | 'compatibility';
  message: string;
  recommendation?: string;
}

// ============================================================================
// PARAMETER FORMATTING INTERFACES
// ============================================================================

/**
 * Parameter formatting configuration
 */
export interface ParameterFormatConfig {
  generationType: GenerationType;
  modelId: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldValidators: Record<string, ParameterValidator>;
  transformers: Record<string, ParameterTransformer>;
}

/**
 * Parameter validator function type
 */
export type ParameterValidator = (value: any) => ParameterValidationResult;

/**
 * Parameter transformer function type
 */
export type ParameterTransformer = (value: any) => any;

/**
 * Parameter validation result
 */
export interface ParameterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  transformedValue?: any;
}

/**
 * Parameter Formatter interface
 */
export interface ParameterFormatter {
  // Format parameters for specific model
  formatParameters(
    modelId: string, 
    generationType: GenerationType, 
    parameters: Record<string, any>
  ): Promise<FormattedParameters>;
  
  // Validate parameters
  validateParameters(
    modelId: string, 
    generationType: GenerationType, 
    parameters: Record<string, any>
  ): ParameterValidationResult;
  
  // Get parameter configuration
  getParameterConfig(modelId: string, generationType: GenerationType): ParameterFormatConfig | null;
  
  // Register parameter configuration
  registerParameterConfig(config: ParameterFormatConfig): void;
}

/**
 * Formatted parameters result
 */
export interface FormattedParameters {
  parameters: Record<string, any>;
  metadata: {
    modelId: string;
    generationType: GenerationType;
    formattedAt: number;
    transformationsApplied: string[];
  };
}

// ============================================================================
// MODEL AVAILABILITY INTERFACES
// ============================================================================

/**
 * Model availability check request
 */
export interface ModelCheckRequest {
  modelId: string;
  generationType: GenerationType;
  priority: ModelCheckPriority;
  timeout?: number;
  retryCount?: number;
}

/**
 * Model availability result
 */
export interface ModelAvailabilityResult {
  modelId: string;
  isAvailable: boolean;
  status: ModelAvailabilityStatus;
  lastChecked: number;
  error?: ModelAvailabilityError;
  responseTime?: number;
  provider: string;
  metadata?: Record<string, any>;
}

/**
 * Model availability error
 */
export interface ModelAvailabilityError {
  type: 'api_key_missing' | 'endpoint_unreachable' | 'model_not_found' | 'quota_exceeded' | 'network_error';
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * Model Availability Service interface
 */
export interface ModelAvailabilityService {
  // Check single model availability
  checkModelAvailability(request: ModelCheckRequest): Promise<ModelAvailabilityResult>;
  
  // Check multiple models
  checkBatchAvailability(requests: ModelCheckRequest[]): Promise<ModelAvailabilityResult[]>;
  
  // Get cached availability
  getCachedAvailability(modelId: string): ModelAvailabilityResult | null;
  
  // Refresh availability
  refreshAvailability(modelId?: string): Promise<void>;
  
  // Subscribe to availability changes
  subscribeToAvailabilityChanges(
    callback: (modelId: string, result: ModelAvailabilityResult) => void
  ): () => void;
}

// ============================================================================
// MODEL STATUS MONITORING INTERFACES
// ============================================================================

/**
 * Model status information
 */
export interface ModelStatus {
  modelId: string;
  health: ModelHealthStatus;
  availability: ModelAvailabilityStatus;
  lastSuccessfulCall?: number;
  lastFailedCall?: number;
  errorCount: number;
  successRate: number;
  averageResponseTime: number;
  issues: ModelIssue[];
  metadata: {
    totalCalls: number;
    lastUpdated: number;
    provider: string;
    generationType: GenerationType;
  };
}

/**
 * Model issue information
 */
export interface ModelIssue {
  type: 'performance' | 'availability' | 'configuration' | 'quota';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolutionNote?: string;
}

/**
 * Model Status Monitor interface
 */
export interface ModelStatusMonitor {
  // Start monitoring
  startMonitoring(): void;
  
  // Stop monitoring
  stopMonitoring(): void;
  
  // Get model status
  getModelStatus(modelId: string): ModelStatus | null;
  
  // Get all model statuses
  getAllModelStatuses(): Map<string, ModelStatus>;
  
  // Subscribe to status changes
  subscribeToStatusChanges(
    callback: (modelId: string, status: ModelStatus) => void
  ): () => void;
  
  // Report model call result
  reportModelCall(
    modelId: string, 
    success: boolean, 
    responseTime: number, 
    error?: string
  ): void;
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

/**
 * Model configuration error
 */
export interface ModelConfigurationError extends Error {
  type: ModelConfigurationErrorType;
  modelId: string;
  provider: string;
  details: {
    originalRequest?: any;
    apiResponse?: any;
    suggestedFix?: string;
    fallbackModels?: string[];
  };
  timestamp: number;
  retryable: boolean;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'manual';
  maxRetries?: number;
  retryDelay?: number;
  fallbackModels?: string[];
  userNotification?: boolean;
}

/**
 * Enhanced Error Handler interface
 */
export interface EnhancedErrorHandler {
  // Handle configuration error
  handleError(error: ModelConfigurationError): Promise<ErrorHandlingResult>;
  
  // Get recovery strategy
  getRecoveryStrategy(error: ModelConfigurationError): ErrorRecoveryStrategy;
  
  // Register error handler
  registerErrorHandler(
    errorType: ModelConfigurationErrorType,
    handler: (error: ModelConfigurationError) => Promise<ErrorHandlingResult>
  ): void;
  
  // Get error statistics
  getErrorStatistics(): ErrorStatistics;
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  success: boolean;
  action: 'retry' | 'fallback' | 'skip' | 'manual_intervention';
  fallbackModel?: string;
  retryAfter?: number;
  userMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ModelConfigurationErrorType, number>;
  errorsByModel: Record<string, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  lastUpdated: number;
}

// ============================================================================
// CONFIGURATION VALIDATION INTERFACES
// ============================================================================

/**
 * Configuration validation request
 */
export interface ConfigurationValidationRequest {
  modelIds?: string[];
  generationTypes?: GenerationType[];
  fullValidation?: boolean;
  includePerformanceTests?: boolean;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  isValid: boolean;
  validatedAt: number;
  results: ModelValidationResult[];
  summary: ValidationSummary;
  recommendations: ValidationRecommendation[];
}

/**
 * Model validation result
 */
export interface ModelValidationResult {
  modelId: string;
  generationType: GenerationType;
  isValid: boolean;
  issues: ValidationIssue[];
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'mapping' | 'parameters' | 'availability' | 'performance';
  message: string;
  suggestedFix?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  totalModels: number;
  validModels: number;
  invalidModels: number;
  modelsWithWarnings: number;
  criticalIssues: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  type: 'fix' | 'optimize' | 'upgrade' | 'remove';
  priority: 'high' | 'medium' | 'low';
  modelId?: string;
  description: string;
  action: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  lastMeasured: number;
}

// ============================================================================
// UNIFIED MODEL INTERFACE
// ============================================================================

/**
 * Unified model request
 */
export interface UnifiedModelRequest {
  modelId: string;
  generationType: GenerationType;
  parameters: Record<string, any>;
  options?: {
    timeout?: number;
    retries?: number;
    fallbackEnabled?: boolean;
  };
}

/**
 * Unified model response
 */
export interface UnifiedModelResponse {
  success: boolean;
  data?: any;
  error?: ModelConfigurationError;
  metadata: {
    modelId: string;
    actualModelUsed: string;
    generationType: GenerationType;
    responseTime: number;
    timestamp: number;
    fallbackUsed: boolean;
  };
}

/**
 * Unified Model Interface
 */
export interface UnifiedModelInterface {
  // Make model request
  makeRequest(request: UnifiedModelRequest): Promise<UnifiedModelResponse>;
  
  // Get available models
  getAvailableModels(generationType: GenerationType): Promise<string[]>;
  
  // Check model compatibility
  checkCompatibility(modelId: string, generationType: GenerationType): Promise<boolean>;
  
  // Get model information
  getModelInfo(modelId: string): Promise<ModelInfo | null>;
}

// ============================================================================
// CONFIGURATION STORAGE INTERFACES
// ============================================================================

/**
 * Model configuration storage
 */
export interface ModelConfigurationStorage {
  // Save configuration
  saveConfiguration(config: ModelConfiguration): Promise<void>;
  
  // Load configuration
  loadConfiguration(): Promise<ModelConfiguration>;
  
  // Backup configuration
  backupConfiguration(): Promise<string>;
  
  // Restore configuration
  restoreConfiguration(backupId: string): Promise<void>;
  
  // Get configuration history
  getConfigurationHistory(): Promise<ConfigurationHistoryEntry[]>;
}

/**
 * Model configuration
 */
export interface ModelConfiguration {
  version: string;
  lastUpdated: number;
  models: {
    text: RegisteredModel[];
    image: RegisteredModel[];
    video: RegisteredModel[];
  };
  providers: Record<string, ProviderConfiguration>;
  userPreferences: UserModelPreferences;
  systemSettings: SystemSettings;
}

/**
 * Registered model
 */
export interface RegisteredModel {
  id: string;
  name: string;
  provider: string;
  generationType: GenerationType;
  apiImplementation: ModelApiImplementation;
  healthCheckConfig: HealthCheckConfig;
  fallbackModels: string[];
  registrationTime: number;
  lastValidated: number;
  status: ModelStatus;
}

/**
 * Model API implementation
 */
export interface ModelApiImplementation {
  hasImplementation: boolean;
  endpoint?: string;
  requiredCredentials: string[];
  testMethod?: () => Promise<boolean>;
  supportedFeatures: string[];
  parameterMapping: Record<string, string>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retryCount: number;
  testPrompt?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfiguration {
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  endpoints: Record<string, string>;
  rateLimits: RateLimitConfig;
  healthCheck: ProviderHealthCheckConfig;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

/**
 * Provider health check configuration
 */
export interface ProviderHealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  healthEndpoint?: string;
}

/**
 * User model preferences
 */
export interface UserModelPreferences {
  defaultModels: Record<GenerationType, string>;
  fallbackPreferences: Record<GenerationType, string[]>;
  autoFallback: boolean;
  showStatusIndicators: boolean;
  hideUnavailableModels: boolean;
}

/**
 * System settings
 */
export interface SystemSettings {
  autoCleanup: boolean;
  healthCheckInterval: number;
  maxErrorRetries: number;
  cacheTimeout: number;
  enableTelemetry: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Configuration history entry
 */
export interface ConfigurationHistoryEntry {
  id: string;
  timestamp: number;
  version: string;
  changes: ConfigurationChange[];
  author?: string;
  description?: string;
}

/**
 * Configuration change
 */
export interface ConfigurationChange {
  type: 'add' | 'update' | 'remove';
  target: 'model' | 'provider' | 'setting';
  targetId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Re-export ModelInfo from main types if needed
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  generationType: GenerationType;
  capabilities: Record<string, boolean>;
  isAvailable: boolean;
  lastUpdated: number;
}