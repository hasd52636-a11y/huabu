/**
 * Advanced Content Management System
 * 
 * Provides tagging, categorization, search capabilities, cloud synchronization,
 * and batch import functionality for canvas content management.
 * 
 * Requirements: 9.3, 9.5, 9.6
 */

import { Block } from '../types';

export interface ContentTag {
  id: string;
  name: string;
  color: string;
  category: string;
  createdAt: number;
  usageCount: number;
}

export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  children: string[];
  color: string;
  icon: string;
  createdAt: number;
}

export interface ContentMetadata {
  id: string;
  blockId: string;
  title: string;
  description: string;
  tags: string[];
  categories: string[];
  keywords: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  rating: number;
  isFavorite: boolean;
  isArchived: boolean;
  customFields: Record<string, any>;
}

export interface SearchQuery {
  text?: string;
  tags?: string[];
  categories?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  blockTypes?: string[];
  rating?: {
    min: number;
    max: number;
  };
  sortBy?: 'relevance' | 'date' | 'rating' | 'usage';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  blocks: Block[];
  metadata: ContentMetadata[];
  totalCount: number;
  facets: {
    tags: Array<{ name: string; count: number }>;
    categories: Array<{ name: string; count: number }>;
    blockTypes: Array<{ type: string; count: number }>;
  };
  suggestions: string[];
  searchTime: number;
}
export interface CloudSyncConfig {
  provider: 'aws' | 'google' | 'azure' | 'custom';
  endpoint: string;
  credentials: {
    accessKey: string;
    secretKey: string;
    region?: string;
  };
  bucketName: string;
  syncInterval: number; // milliseconds
  enableAutoSync: boolean;
  enableBackup: boolean;
  maxBackupVersions: number;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSyncTime: number;
  pendingUploads: number;
  pendingDownloads: number;
  syncErrors: Array<{
    blockId: string;
    error: string;
    timestamp: number;
  }>;
  totalSynced: number;
  totalSize: number;
}

export interface ImportSource {
  type: 'file' | 'url' | 'clipboard' | 'api';
  format: 'json' | 'csv' | 'xml' | 'markdown' | 'html' | 'pdf';
  source: string | File | Blob;
  options: {
    preserveFormatting?: boolean;
    extractImages?: boolean;
    createTags?: boolean;
    autoCategories?: boolean;
    batchSize?: number;
  };
}

export interface ImportResult {
  success: boolean;
  importedBlocks: Block[];
  createdTags: ContentTag[];
  createdCategories: ContentCategory[];
  errors: Array<{
    source: string;
    error: string;
    line?: number;
  }>;
  statistics: {
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    processingTime: number;
  };
}

export class AdvancedContentManager {
  private tags: Map<string, ContentTag> = new Map();
  private categories: Map<string, ContentCategory> = new Map();
  private metadata: Map<string, ContentMetadata> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  private cloudSyncConfig: CloudSyncConfig | null = null;
  private syncStatus: SyncStatus = {
    isConnected: false,
    lastSyncTime: 0,
    pendingUploads: 0,
    pendingDownloads: 0,
    syncErrors: [],
    totalSynced: 0,
    totalSize: 0
  };

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCategories();
  }

  // Tag Management
  createTag(name: string, color: string, category: string): ContentTag {
    const tag: ContentTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color,
      category,
      createdAt: Date.now(),
      usageCount: 0
    };

    this.tags.set(tag.id, tag);
    this.saveToStorage();
    return tag;
  }

  getTags(): ContentTag[] {
    return Array.from(this.tags.values()).sort((a, b) => b.usageCount - a.usageCount);
  }

  getTagsByCategory(category: string): ContentTag[] {
    return this.getTags().filter(tag => tag.category === category);
  }

  updateTag(tagId: string, updates: Partial<ContentTag>): boolean {
    const tag = this.tags.get(tagId);
    if (!tag) return false;

    Object.assign(tag, updates);
    this.saveToStorage();
    return true;
  }

  deleteTag(tagId: string): boolean {
    const deleted = this.tags.delete(tagId);
    if (deleted) {
      // Remove tag from all metadata
      this.metadata.forEach(meta => {
        meta.tags = meta.tags.filter(id => id !== tagId);
      });
      this.saveToStorage();
    }
    return deleted;
  }
  // Category Management
  createCategory(name: string, description: string, parentId?: string): ContentCategory {
    const category: ContentCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description,
      parentId,
      children: [],
      color: this.generateCategoryColor(),
      icon: this.generateCategoryIcon(name),
      createdAt: Date.now()
    };

    this.categories.set(category.id, category);
    
    // Update parent category
    if (parentId) {
      const parent = this.categories.get(parentId);
      if (parent) {
        parent.children.push(category.id);
      }
    }

    this.saveToStorage();
    return category;
  }

  getCategories(): ContentCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getCategoryTree(): ContentCategory[] {
    const rootCategories = this.getCategories().filter(cat => !cat.parentId);
    return this.buildCategoryTree(rootCategories);
  }

  private buildCategoryTree(categories: ContentCategory[]): ContentCategory[] {
    return categories.map(category => ({
      ...category,
      children: this.buildCategoryTree(
        category.children.map(id => this.categories.get(id)).filter(Boolean) as ContentCategory[]
      )
    }));
  }

  // Content Metadata Management
  setContentMetadata(blockId: string, metadata: Partial<ContentMetadata>): ContentMetadata {
    const existing = this.metadata.get(blockId);
    const now = Date.now();

    const contentMetadata: ContentMetadata = {
      id: existing?.id || `meta_${now}_${Math.random().toString(36).substr(2, 9)}`,
      blockId,
      title: metadata.title || existing?.title || '',
      description: metadata.description || existing?.description || '',
      tags: metadata.tags || existing?.tags || [],
      categories: metadata.categories || existing?.categories || [],
      keywords: metadata.keywords || existing?.keywords || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastAccessedAt: existing?.lastAccessedAt || now,
      accessCount: existing?.accessCount || 0,
      rating: metadata.rating ?? existing?.rating ?? 0,
      isFavorite: metadata.isFavorite ?? existing?.isFavorite ?? false,
      isArchived: metadata.isArchived ?? existing?.isArchived ?? false,
      customFields: { ...existing?.customFields, ...metadata.customFields }
    };

    this.metadata.set(blockId, contentMetadata);
    this.updateSearchIndex(blockId, contentMetadata);
    this.updateTagUsage(contentMetadata.tags);
    this.saveToStorage();

    return contentMetadata;
  }

  getContentMetadata(blockId: string): ContentMetadata | null {
    const metadata = this.metadata.get(blockId);
    if (metadata) {
      metadata.lastAccessedAt = Date.now();
      metadata.accessCount++;
      this.saveToStorage();
    }
    return metadata || null;
  }

  // Search Functionality
  search(query: SearchQuery): SearchResult {
    const startTime = performance.now();
    let results = Array.from(this.metadata.values());

    // Text search
    if (query.text) {
      const searchTerms = query.text.toLowerCase().split(/\s+/);
      results = results.filter(meta => {
        const searchableText = [
          meta.title,
          meta.description,
          ...meta.keywords,
          ...meta.tags.map(tagId => this.tags.get(tagId)?.name || ''),
          ...meta.categories.map(catId => this.categories.get(catId)?.name || '')
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Tag filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(meta => 
        query.tags!.some(tagId => meta.tags.includes(tagId))
      );
    }

    // Category filter
    if (query.categories && query.categories.length > 0) {
      results = results.filter(meta => 
        query.categories!.some(catId => meta.categories.includes(catId))
      );
    }

    // Date range filter
    if (query.dateRange) {
      results = results.filter(meta => 
        meta.createdAt >= query.dateRange!.start && 
        meta.createdAt <= query.dateRange!.end
      );
    }

    // Rating filter
    if (query.rating) {
      results = results.filter(meta => 
        meta.rating >= query.rating!.min && 
        meta.rating <= query.rating!.max
      );
    }

    // Sort results
    this.sortResults(results, query.sortBy || 'relevance', query.sortOrder || 'desc');

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedResults = results.slice(offset, offset + limit);

    const searchTime = performance.now() - startTime;

    return {
      blocks: [], // Would be populated with actual block data
      metadata: paginatedResults,
      totalCount: results.length,
      facets: this.generateFacets(results),
      suggestions: this.generateSuggestions(query.text || ''),
      searchTime
    };
  }
  // Cloud Synchronization
  configureCloudSync(config: CloudSyncConfig): void {
    this.cloudSyncConfig = config;
    this.saveToStorage();
    
    if (config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  async syncToCloud(): Promise<boolean> {
    if (!this.cloudSyncConfig) return false;

    try {
      this.syncStatus.isConnected = true;
      // Implementation would depend on cloud provider
      // This is a simplified version
      
      const dataToSync = {
        tags: Array.from(this.tags.values()),
        categories: Array.from(this.categories.values()),
        metadata: Array.from(this.metadata.values())
      };

      // Simulate cloud upload
      await this.uploadToCloud(dataToSync);
      
      this.syncStatus.lastSyncTime = Date.now();
      this.syncStatus.totalSynced++;
      
      return true;
    } catch (error) {
      this.syncStatus.syncErrors.push({
        blockId: 'system',
        error: error instanceof Error ? error.message : 'Unknown sync error',
        timestamp: Date.now()
      });
      return false;
    }
  }

  private async uploadToCloud(data: any): Promise<void> {
    // Mock implementation - would use actual cloud SDK
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  private startAutoSync(): void {
    if (!this.cloudSyncConfig?.enableAutoSync) return;

    setInterval(() => {
      this.syncToCloud();
    }, this.cloudSyncConfig.syncInterval);
  }

  // Batch Import
  async importContent(source: ImportSource): Promise<ImportResult> {
    const startTime = performance.now();
    const result: ImportResult = {
      success: false,
      importedBlocks: [],
      createdTags: [],
      createdCategories: [],
      errors: [],
      statistics: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        processingTime: 0
      }
    };

    try {
      let content: string;
      
      // Extract content based on source type
      if (source.type === 'file' && source.source instanceof File) {
        content = await this.readFile(source.source);
      } else if (source.type === 'url' && typeof source.source === 'string') {
        content = await this.fetchUrl(source.source);
      } else if (source.type === 'clipboard' && typeof source.source === 'string') {
        content = source.source;
      } else {
        throw new Error('Unsupported source type');
      }

      // Parse content based on format
      const parsedData = await this.parseContent(content, source.format);
      
      // Process each item
      for (const item of parsedData) {
        try {
          result.statistics.totalProcessed++;
          
          // Create block (simplified)
          const block = this.createBlockFromImport(item, source.options);
          result.importedBlocks.push(block);
          
          // Auto-create tags if enabled
          if (source.options.createTags && item.tags) {
            for (const tagName of item.tags) {
              const existingTag = Array.from(this.tags.values()).find(t => t.name === tagName);
              if (!existingTag) {
                const newTag = this.createTag(tagName, '#3B82F6', 'imported');
                result.createdTags.push(newTag);
              }
            }
          }
          
          result.statistics.successCount++;
        } catch (error) {
          result.statistics.errorCount++;
          result.errors.push({
            source: item.title || `Item ${result.statistics.totalProcessed}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      result.success = result.statistics.successCount > 0;
      result.statistics.processingTime = performance.now() - startTime;

    } catch (error) {
      result.errors.push({
        source: 'Import process',
        error: error instanceof Error ? error.message : 'Unknown import error'
      });
    }

    return result;
  }

  // Helper Methods
  private updateSearchIndex(blockId: string, metadata: ContentMetadata): void {
    const searchableTerms = [
      ...metadata.title.toLowerCase().split(/\s+/),
      ...metadata.description.toLowerCase().split(/\s+/),
      ...metadata.keywords.map(k => k.toLowerCase())
    ];

    searchableTerms.forEach(term => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(blockId);
    });
  }

  private updateTagUsage(tagIds: string[]): void {
    tagIds.forEach(tagId => {
      const tag = this.tags.get(tagId);
      if (tag) {
        tag.usageCount++;
      }
    });
  }

  private generateCategoryColor(): string {
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateCategoryIcon(name: string): string {
    const icons = ['📁', '🏷️', '📊', '🎨', '📝', '🖼️', '🎬'];
    return icons[name.length % icons.length];
  }

  private sortResults(results: ContentMetadata[], sortBy: string, sortOrder: string): void {
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'usage':
          comparison = a.accessCount - b.accessCount;
          break;
        default: // relevance
          comparison = a.accessCount - b.accessCount;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private generateFacets(results: ContentMetadata[]) {
    const tagCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();

    results.forEach(meta => {
      meta.tags.forEach(tagId => {
        const tag = this.tags.get(tagId);
        if (tag) {
          tagCounts.set(tag.name, (tagCounts.get(tag.name) || 0) + 1);
        }
      });

      meta.categories.forEach(catId => {
        const category = this.categories.get(catId);
        if (category) {
          categoryCounts.set(category.name, (categoryCounts.get(category.name) || 0) + 1);
        }
      });
    });

    return {
      tags: Array.from(tagCounts.entries()).map(([name, count]) => ({ name, count })),
      categories: Array.from(categoryCounts.entries()).map(([name, count]) => ({ name, count })),
      blockTypes: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count }))
    };
  }

  private generateSuggestions(query: string): string[] {
    // Simple suggestion generation based on existing tags and categories
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    this.tags.forEach(tag => {
      if (tag.name.toLowerCase().includes(queryLower) && !suggestions.includes(tag.name)) {
        suggestions.push(tag.name);
      }
    });

    this.categories.forEach(category => {
      if (category.name.toLowerCase().includes(queryLower) && !suggestions.includes(category.name)) {
        suggestions.push(category.name);
      }
    });

    return suggestions.slice(0, 5);
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private async fetchUrl(url: string): Promise<string> {
    const response = await fetch(url);
    return response.text();
  }

  private async parseContent(content: string, format: string): Promise<any[]> {
    switch (format) {
      case 'json':
        return JSON.parse(content);
      case 'csv':
        return this.parseCSV(content);
      case 'markdown':
        return this.parseMarkdown(content);
      default:
        return [{ title: 'Imported Content', content }];
    }
  }

  private parseCSV(content: string): any[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const item: any = {};
      headers.forEach((header, index) => {
        item[header.trim()] = values[index]?.trim() || '';
      });
      return item;
    });
  }

  private parseMarkdown(content: string): any[] {
    const sections = content.split(/^#\s+/m).filter(Boolean);
    return sections.map(section => {
      const lines = section.split('\n');
      return {
        title: lines[0].trim(),
        content: lines.slice(1).join('\n').trim()
      };
    });
  }

  private createBlockFromImport(item: any, options: any): Block {
    // Simplified block creation - would need actual Block interface implementation
    return {
      id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text', // Default type
      content: item.content || item.title || '',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as Block;
  }

  private initializeDefaultCategories(): void {
    if (this.categories.size === 0) {
      this.createCategory('文本内容', '文本相关的内容');
      this.createCategory('图片素材', '图片和视觉素材');
      this.createCategory('视频内容', '视频和动画内容');
      this.createCategory('项目文件', '项目和工作文件');
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('advanced_content_manager');
      if (stored) {
        const data = JSON.parse(stored);
        this.tags = new Map(data.tags || []);
        this.categories = new Map(data.categories || []);
        this.metadata = new Map(data.metadata || []);
        this.cloudSyncConfig = data.cloudSyncConfig || null;
        this.syncStatus = { ...this.syncStatus, ...data.syncStatus };
      }
    } catch (error) {
      console.error('Failed to load content manager data:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        tags: Array.from(this.tags.entries()),
        categories: Array.from(this.categories.entries()),
        metadata: Array.from(this.metadata.entries()),
        cloudSyncConfig: this.cloudSyncConfig,
        syncStatus: this.syncStatus
      };
      localStorage.setItem('advanced_content_manager', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save content manager data:', error);
    }
  }

  // Public getters
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getStatistics() {
    return {
      totalTags: this.tags.size,
      totalCategories: this.categories.size,
      totalContent: this.metadata.size,
      favoriteCount: Array.from(this.metadata.values()).filter(m => m.isFavorite).length,
      archivedCount: Array.from(this.metadata.values()).filter(m => m.isArchived).length
    };
  }

  destroy(): void {
    this.tags.clear();
    this.categories.clear();
    this.metadata.clear();
    this.searchIndex.clear();
  }
}