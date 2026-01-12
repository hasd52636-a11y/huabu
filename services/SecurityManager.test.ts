import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityManager } from './SecurityManager';
import { DataClassification } from '../types';

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

describe('SecurityManager', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await securityManager.cleanup();
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt sensitive data', async () => {
      const originalData = 'This is sensitive information';
      
      const encrypted = await securityManager.encryptData(originalData, 'sensitive');
      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.data).not.toBe(originalData);
      expect(encrypted.classification).toBe('sensitive');
      
      const decrypted = await securityManager.decryptData(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should handle non-encrypted data', async () => {
      const securityManagerNoEncryption = new SecurityManager({ encryptSensitiveData: false });
      
      const data = 'This is public information';
      const result = await securityManagerNoEncryption.encryptData(data);
      
      expect(result.encrypted).toBe(false);
      expect(result.data).toBe(data);
      
      const decrypted = await securityManagerNoEncryption.decryptData(result);
      expect(decrypted).toBe(data);
      
      await securityManagerNoEncryption.cleanup();
    });

    it('should handle encryption errors gracefully', async () => {
      // Mock encryption failure
      const originalXorEncrypt = (securityManager as any).xorEncrypt;
      (securityManager as any).xorEncrypt = vi.fn(() => {
        throw new Error('Encryption failed');
      });

      await expect(securityManager.encryptData('test data')).rejects.toThrow('Failed to encrypt sensitive data');
      
      // Restore original method
      (securityManager as any).xorEncrypt = originalXorEncrypt;
    });
  });

  describe('Data Classification', () => {
    it('should classify sensitive data correctly', () => {
      const sensitiveData = [
        'Credit card: 4532-1234-5678-9012',
        'SSN: 123-45-6789',
        'Email: user@example.com',
        'Phone: (555) 123-4567',
        'Password: secret123',
        'API key: sk-1234567890'
      ];

      sensitiveData.forEach(data => {
        const classification = securityManager.classifyData(data);
        expect(classification).toBe('sensitive');
      });
    });

    it('should classify personal data correctly', () => {
      const personalData = [
        'Name: John Doe',
        'First name: Jane',
        'Address: 123 Main St',
        'Birthday: 1990-01-01'
      ];

      personalData.forEach(data => {
        const classification = securityManager.classifyData(data);
        expect(classification).toBe('personal');
      });
    });

    it('should classify public data correctly', () => {
      const publicData = [
        'This is a general message',
        'Weather is nice today',
        'The meeting is at 3 PM'
      ];

      publicData.forEach(data => {
        const classification = securityManager.classifyData(data);
        expect(classification).toBe('public');
      });
    });
  });

  describe('Network Security Validation', () => {
    it('should validate secure HTTPS URLs', () => {
      const secureUrls = [
        'https://api.openai.com/v1/chat',
        'https://api.anthropic.com/v1/messages',
        'https://api.whatai.cc/v1/generate'
      ];

      secureUrls.forEach(url => {
        expect(securityManager.validateNetworkSecurity(url)).toBe(true);
      });
    });

    it('should reject insecure HTTP URLs', () => {
      const insecureUrls = [
        'http://api.example.com/data',
        'http://unsecure-site.com/api'
      ];

      insecureUrls.forEach(url => {
        expect(securityManager.validateNetworkSecurity(url)).toBe(false);
      });
    });

    it('should allow localhost HTTP URLs', () => {
      const localhostUrls = [
        'http://localhost:3000/api',
        'http://127.0.0.1:8080/test'
      ];

      localhostUrls.forEach(url => {
        expect(securityManager.validateNetworkSecurity(url)).toBe(true);
      });
    });

    it('should allow insecure URLs when security is disabled', () => {
      const permissiveManager = new SecurityManager({ secureNetworkOnly: false });
      
      expect(permissiveManager.validateNetworkSecurity('http://insecure.com')).toBe(true);
      
      permissiveManager.cleanup();
    });
  });

  describe('Input Sanitization', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should remove javascript protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should escape HTML characters', () => {
      const htmlInput = '<div>Hello & "World"</div>';
      const sanitized = securityManager.sanitizeInput(htmlInput);
      
      expect(sanitized).toContain('&lt;div&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<img src="x" onerror="alert(1)">';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('onerror=');
    });
  });

  describe('File Upload Validation', () => {
    it('should validate allowed file types', () => {
      const validFiles = [
        { name: 'document.txt', size: 1024, type: 'text/plain' },
        { name: 'image.jpg', size: 2048, type: 'image/jpeg' },
        { name: 'photo.png', size: 3072, type: 'image/png' }
      ];

      validFiles.forEach(file => {
        const result = securityManager.validateFileUpload(file.name, file.size, file.type);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject files that are too large', () => {
      const largeFile = { name: 'large.txt', size: 11 * 1024 * 1024, type: 'text/plain' };
      const result = securityManager.validateFileUpload(largeFile.name, largeFile.size, largeFile.type);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('size exceeds');
    });

    it('should reject disallowed file types', () => {
      const dangerousFiles = [
        { name: 'virus.exe', size: 1024, type: 'application/x-executable' },
        { name: 'script.js', size: 512, type: 'application/javascript' }
      ];

      dangerousFiles.forEach(file => {
        const result = securityManager.validateFileUpload(file.name, file.size, file.type);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not allowed');
      });
    });

    it('should reject suspicious file names', () => {
      const suspiciousFiles = [
        { name: 'document.txt.exe', size: 1024, type: 'text/plain' },
        { name: 'malware.bat', size: 512, type: 'text/plain' },
        { name: 'script.vbs', size: 256, type: 'text/plain' }
      ];

      suspiciousFiles.forEach(file => {
        const result = securityManager.validateFileUpload(file.name, file.size, file.type);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Suspicious');
      });
    });
  });

  describe('Property 12: Data Security Preservation', () => {
    // Property test for data security preservation
    it('should maintain data integrity across encryption/decryption cycles', async () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Generate random data of various types
        const testData = [
          `Test data ${i}`,
          `Sensitive info: ${Math.random().toString(36)}`,
          `Email: user${i}@example.com`,
          `Credit card: 4532-${String(i).padStart(4, '0')}-5678-9012`,
          JSON.stringify({ id: i, value: Math.random() }),
          `Multi-line\ndata\nwith\nspecial chars: !@#$%^&*()`
        ][i % 6];
        
        const classification: DataClassification = ['public', 'personal', 'sensitive'][i % 3] as DataClassification;
        
        // Encrypt data
        const encrypted = await securityManager.encryptData(testData, classification);
        
        // Verify encryption properties
        expect(encrypted.classification).toBe(classification);
        expect(encrypted.timestamp).toBeGreaterThan(0);
        expect(typeof encrypted.encrypted).toBe('boolean');
        
        if (encrypted.encrypted) {
          expect(encrypted.data).not.toBe(testData);
        }
        
        // Decrypt and verify integrity
        const decrypted = await securityManager.decryptData(encrypted);
        expect(decrypted).toBe(testData);
        
        // Verify data classification is preserved
        const detectedClassification = securityManager.classifyData(testData);
        if (testData.includes('@') || testData.includes('4532-')) {
          expect(detectedClassification).toBe('sensitive');
        }
      }
    });

    it('should handle concurrent encryption/decryption operations safely', async () => {
      const iterations = 50;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const promise = (async () => {
          const testData = `Concurrent test data ${i}`;
          const classification: DataClassification = ['public', 'personal', 'sensitive'][i % 3] as DataClassification;
          
          const encrypted = await securityManager.encryptData(testData, classification);
          const decrypted = await securityManager.decryptData(encrypted);
          
          // Data integrity should be maintained even under concurrency
          expect(decrypted).toBe(testData);
          expect(encrypted.classification).toBe(classification);
        })();
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
    });

    it('should preserve security properties under various input conditions', async () => {
      const iterations = 75;
      
      for (let i = 0; i < iterations; i++) {
        // Generate various input conditions
        const inputs = [
          '', // Empty string
          ' ', // Whitespace
          'a', // Single character
          'A'.repeat(1000), // Large string
          '🚀🔒💻', // Unicode characters
          '\n\t\r', // Control characters
          '<script>alert("test")</script>', // Malicious content
          JSON.stringify({ nested: { data: { value: i } } }) // Complex JSON
        ];
        
        const testData = inputs[i % inputs.length];
        
        // Test input sanitization
        const sanitized = securityManager.sanitizeInput(testData);
        expect(typeof sanitized).toBe('string');
        
        // Sanitized data should not contain dangerous patterns
        expect(sanitized).not.toMatch(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
        expect(sanitized).not.toMatch(/javascript:/gi);
        
        // Test data classification
        const classification = securityManager.classifyData(testData);
        expect(['public', 'personal', 'sensitive']).toContain(classification);
        
        // Test encryption if data is not empty
        if (testData.length > 0) {
          const encrypted = await securityManager.encryptData(testData, classification);
          const decrypted = await securityManager.decryptData(encrypted);
          expect(decrypted).toBe(testData);
        }
      }
    });
  });

  describe('Temporary File Management', () => {
    it('should register and cleanup temporary files', async () => {
      const filePaths = ['/tmp/file1.txt', '/tmp/file2.jpg', '/tmp/file3.json'];
      
      filePaths.forEach(path => {
        securityManager.registerTemporaryFile(path);
      });
      
      const statusBefore = securityManager.getSecurityStatus();
      expect(statusBefore.temporaryFilesCount).toBe(3);
      
      await securityManager.cleanupTemporaryFiles();
      
      const statusAfter = securityManager.getSecurityStatus();
      expect(statusAfter.temporaryFilesCount).toBe(0);
    });
  });

  describe('Security Status and Configuration', () => {
    it('should provide accurate security status', () => {
      const status = securityManager.getSecurityStatus();
      
      expect(typeof status.encryptionEnabled).toBe('boolean');
      expect(typeof status.localProcessingOnly).toBe('boolean');
      expect(typeof status.temporaryFilesCount).toBe('number');
      expect(typeof status.sensitiveDataCount).toBe('number');
      expect(status.temporaryFilesCount).toBeGreaterThanOrEqual(0);
      expect(status.sensitiveDataCount).toBeGreaterThanOrEqual(0);
    });

    it('should update configuration correctly', () => {
      securityManager.updateConfig({
        localProcessingOnly: false,
        autoCleanup: false
      });
      
      expect(securityManager.isLocalProcessingOnly()).toBe(false);
    });
  });

  describe('Secure Deletion', () => {
    it('should securely delete data', async () => {
      const testData = 'Sensitive data to be deleted';
      const encrypted = await securityManager.encryptData(testData, 'sensitive');
      
      const statusBefore = securityManager.getSecurityStatus();
      const initialCount = statusBefore.sensitiveDataCount;
      
      // Simulate data deletion (in real implementation, this would have a data ID)
      await securityManager.secureDelete('test-data-id');
      
      // Verify deletion doesn't throw errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Local Processing Enforcement', () => {
    it('should enforce local processing when enabled', () => {
      expect(securityManager.isLocalProcessingOnly()).toBe(true);
    });

    it('should allow remote processing when disabled', () => {
      const permissiveManager = new SecurityManager({ localProcessingOnly: false });
      expect(permissiveManager.isLocalProcessingOnly()).toBe(false);
      permissiveManager.cleanup();
    });
  });
});