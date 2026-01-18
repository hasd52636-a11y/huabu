import { SecurityConfig, EncryptionKey, SecureData, DataClassification } from '../types';

export class SecurityManager {
  private config: SecurityConfig = {
    localProcessingOnly: true,
    autoCleanup: true,
    encryptSensitiveData: true,
    secureNetworkOnly: true,
    dataRetentionDays: 7
  };

  private encryptionKey: string | null = null;
  private temporaryFiles: Set<string> = new Set();
  private sensitiveDataRegistry: Map<string, { classification: DataClassification; timestamp: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(customConfig?: Partial<SecurityConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.initializeEncryption();
    this.startCleanupScheduler();
  }

  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    if (this.config.encryptSensitiveData) {
      // Check if Web Crypto API is available
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Generate or retrieve encryption key
        this.encryptionKey = this.generateEncryptionKey();
      } else {
        console.warn('Web Crypto API not available, encryption will use fallback method');
        // Use a deterministic fallback key (not secure, but better than nothing)
        this.encryptionKey = this.generateFallbackKey();
      }
    }
  }

  /**
   * Generate a fallback encryption key when Web Crypto API is unavailable
   */
  private generateFallbackKey(): string {
    // Use Math.random() as fallback (not cryptographically secure)
    const array = new Array(32);
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a secure encryption key
   */
  private generateEncryptionKey(): string {
    try {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Failed to generate secure key, using fallback:', error);
      return this.generateFallbackKey();
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, classification: DataClassification = 'sensitive'): Promise<SecureData> {
    if (!this.config.encryptSensitiveData || !this.encryptionKey) {
      return {
        encrypted: false,
        data,
        classification,
        timestamp: Date.now()
      };
    }

    try {
      // Simple XOR encryption for demo (in production, use proper encryption)
      const encrypted = this.xorEncrypt(data, this.encryptionKey);
      
      const secureData: SecureData = {
        encrypted: true,
        data: encrypted,
        classification,
        timestamp: Date.now()
      };

      // Register sensitive data for cleanup
      const dataId = this.generateDataId();
      this.sensitiveDataRegistry.set(dataId, {
        classification,
        timestamp: Date.now()
      });

      return secureData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(secureData: SecureData): Promise<string> {
    if (!secureData.encrypted) {
      return secureData.data;
    }

    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      return this.xorDecrypt(secureData.data, this.encryptionKey);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Simple XOR encryption (for demo purposes)
   */
  private xorEncrypt(data: string, key: string): string {
    // Input validation
    if (!data || !key) {
      throw new Error('Data and key cannot be empty');
    }
    
    if (typeof data !== 'string' || typeof key !== 'string') {
      throw new Error('Data and key must be strings');
    }
    
    try {
      // Convert to UTF-8 bytes first to handle Unicode characters
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);
      const keyBytes = encoder.encode(key);
      
      // XOR encryption
      const encrypted = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      
      // Convert to base64 using proper encoding
      let binary = '';
      for (let i = 0; i < encrypted.length; i++) {
        binary += String.fromCharCode(encrypted[i]);
      }
      return btoa(binary);
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simple XOR decryption (for demo purposes)
   */
  private xorDecrypt(encryptedData: string, key: string): string {
    // Input validation
    if (!encryptedData || !key) {
      throw new Error('Encrypted data and key cannot be empty');
    }
    
    if (typeof encryptedData !== 'string' || typeof key !== 'string') {
      throw new Error('Encrypted data and key must be strings');
    }
    
    try {
      // Decode from base64
      const binary = atob(encryptedData);
      const encrypted = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        encrypted[i] = binary.charCodeAt(i);
      }
      
      // XOR decryption
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      // Convert back to UTF-8 string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register temporary file for cleanup
   */
  registerTemporaryFile(filePath: string): void {
    this.temporaryFiles.add(filePath);
  }

  /**
   * Clean up temporary files
   */
  async cleanupTemporaryFiles(): Promise<void> {
    const filesToDelete = Array.from(this.temporaryFiles);
    
    for (const filePath of filesToDelete) {
      try {
        // In a real implementation, this would delete the actual file
        console.log(`Cleaning up temporary file: ${filePath}`);
        this.temporaryFiles.delete(filePath);
      } catch (error) {
        console.error(`Failed to delete temporary file ${filePath}:`, error);
      }
    }
  }

  /**
   * Validate network security for API calls
   */
  validateNetworkSecurity(url: string): boolean {
    if (!this.config.secureNetworkOnly) {
      return true;
    }

    try {
      const urlObj = new URL(url);
      
      // Allow localhost and 127.0.0.1 even with HTTP
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname === '127.0.0.1' || 
          urlObj.hostname.startsWith('192.168.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.startsWith('172.')) {
        return true;
      }

      // Ensure HTTPS for external calls
      if (urlObj.protocol === 'http:') {
        return false;
      }

      // Check for known secure domains
      const secureDomains = [
        'api.openai.com',
        'api.anthropic.com',
        'api.whatai.cc',
        'open.bigmodel.cn'
      ];

      return secureDomains.some(domain => urlObj.hostname.includes(domain)) || 
             urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters and patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>'"&]/g, (match) => { // Escape HTML characters
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      });
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(fileName: string, fileSize: number, fileType: string): {
    valid: boolean;
    reason?: string;
  } {
    // Check file size (max 10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return { valid: false, reason: 'File size exceeds 10MB limit' };
    }

    // Check allowed file types
    const allowedTypes = [
      'text/plain',
      'application/jsonl',
      'text/jsonl',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(fileType)) {
      // 对于JSONL文件，可能没有正确的MIME类型，所以我们也检查文件扩展名
      const lowerFileName = fileName.toLowerCase();
      if (!lowerFileName.endsWith('.jsonl')) {
        return { valid: false, reason: 'File type not allowed' };
      }
    }

    // Check for suspicious file names first (before extension check)
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com)$/i,
      /\.(vbs|ps1|sh)$/i,
      /\.\w+\.\w+$/ // Double extensions
    ];

    // 允许.jsonl文件，即使它匹配了一些可疑模式
    const isJsonlFile = fileName.toLowerCase().endsWith('.jsonl');
    if (!isJsonlFile && suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      return { valid: false, reason: 'Suspicious file name pattern' };
    }

    // Check file extension
    const allowedExtensions = ['.txt', '.jsonl', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(extension)) {
      return { valid: false, reason: 'File extension not allowed' };
    }

    return { valid: true };
  }

  /**
   * Check if local processing is enforced
   */
  isLocalProcessingOnly(): boolean {
    return this.config.localProcessingOnly;
  }

  /**
   * Get data classification for content
   */
  classifyData(content: string): DataClassification {
    // Simple classification based on content patterns
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /@/, // Email addresses (simple check for @ symbol)
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/, // Phone numbers
      /password|secret|key|token|credential/i // Sensitive keywords
    ];

    if (sensitivePatterns.some(pattern => pattern.test(content))) {
      return 'sensitive';
    }

    // Check for personal information
    const personalPatterns = [
      /\b(name|address|birthday|birth date)\s*[:=]\s*\w+/i,
      /\b(first name|last name|full name)\s*[:=]\s*\w+/i
    ];

    if (personalPatterns.some(pattern => pattern.test(content))) {
      return 'personal';
    }

    return 'public';
  }

  /**
   * Secure data deletion
   */
  async secureDelete(dataId: string): Promise<void> {
    // Remove from sensitive data registry
    this.sensitiveDataRegistry.delete(dataId);
    
    // In a real implementation, this would:
    // 1. Overwrite memory locations
    // 2. Clear browser storage
    // 3. Remove temporary files
    // 4. Clear any cached data
    
    console.log(`Securely deleted data: ${dataId}`);
  }

  /**
   * Get security status report
   */
  getSecurityStatus(): {
    encryptionEnabled: boolean;
    localProcessingOnly: boolean;
    temporaryFilesCount: number;
    sensitiveDataCount: number;
    lastCleanup: number | null;
  } {
    return {
      encryptionEnabled: this.config.encryptSensitiveData && !!this.encryptionKey,
      localProcessingOnly: this.config.localProcessingOnly,
      temporaryFilesCount: this.temporaryFiles.size,
      sensitiveDataCount: this.sensitiveDataRegistry.size,
      lastCleanup: this.lastCleanupTime
    };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize encryption if needed
    if (newConfig.encryptSensitiveData !== undefined) {
      this.initializeEncryption();
    }
  }

  /**
   * Generate unique data ID
   */
  private generateDataId(): string {
    return `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private lastCleanupTime: number | null = null;

  /**
   * Start automatic cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (!this.config.autoCleanup) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      await this.performScheduledCleanup();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Perform scheduled cleanup of expired data
   */
  private async performScheduledCleanup(): Promise<void> {
    const now = Date.now();
    const retentionPeriod = this.config.dataRetentionDays * 24 * 60 * 60 * 1000;
    
    // Clean up expired sensitive data
    for (const [dataId, info] of this.sensitiveDataRegistry.entries()) {
      if (now - info.timestamp > retentionPeriod) {
        await this.secureDelete(dataId);
      }
    }
    
    // Clean up temporary files
    await this.cleanupTemporaryFiles();
    
    this.lastCleanupTime = now;
    console.log('Scheduled security cleanup completed');
  }

  /**
   * Clean up and stop security manager
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Perform final cleanup
    await this.cleanupTemporaryFiles();
    
    // Clear sensitive data registry
    this.sensitiveDataRegistry.clear();
    
    // Clear encryption key from memory
    this.encryptionKey = null;
    
    console.log('SecurityManager cleanup completed');
  }
}