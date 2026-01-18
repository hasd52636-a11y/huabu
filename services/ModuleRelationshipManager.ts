/**
 * 模块关联管理器
 * 
 * 功能：
 * - 管理多图模块之间的关联关系
 * - 处理模块删除逻辑
 * - 更新变量引用格式
 * - 支持扩展的变量引用 [B01-1], [B01-2] 等
 */

import { Block, MultiImageGroup } from '../types';

export class ModuleRelationshipManager {
  private multiImageGroups: Map<string, MultiImageGroup> = new Map();

  /**
   * 创建多图组关联
   */
  createMultiImageGroup(
    sourceBlockId: string,
    generatedBlockIds: string[],
    prompt: string,
    config: any
  ): MultiImageGroup {
    console.log('[ModuleRelationshipManager] Creating multi-image group');
    console.log('[ModuleRelationshipManager] Source block:', sourceBlockId);
    console.log('[ModuleRelationshipManager] Generated blocks:', generatedBlockIds);

    const group: MultiImageGroup = {
      id: `group-${sourceBlockId}`,
      sourceBlockId,
      generatedBlockIds,
      createdAt: Date.now(),
      prompt,
      config
    };

    this.multiImageGroups.set(group.id, group);
    console.log('[ModuleRelationshipManager] ✓ Multi-image group created:', group.id);
    
    return group;
  }

  /**
   * 获取多图组
   */
  getMultiImageGroup(groupId: string): MultiImageGroup | null {
    return this.multiImageGroups.get(groupId) || null;
  }

  /**
   * 根据源模块ID获取多图组
   */
  getGroupBySourceBlock(sourceBlockId: string): MultiImageGroup | null {
    for (const group of this.multiImageGroups.values()) {
      if (group.sourceBlockId === sourceBlockId) {
        return group;
      }
    }
    return null;
  }

  /**
   * 根据生成的模块ID获取多图组
   */
  getGroupByGeneratedBlock(blockId: string): MultiImageGroup | null {
    for (const group of this.multiImageGroups.values()) {
      if (group.generatedBlockIds.includes(blockId)) {
        return group;
      }
    }
    return null;
  }

  /**
   * 获取所有多图组
   */
  getAllGroups(): MultiImageGroup[] {
    return Array.from(this.multiImageGroups.values());
  }

  /**
   * 更新模块引用，支持 [B01-1], [B01-2] 格式
   */
  updateBlockReferences(
    multiImageGroup: MultiImageGroup,
    allBlocks: Block[]
  ): void {
    console.log('[ModuleRelationshipManager] Updating block references for group:', multiImageGroup.id);

    // 为每个生成的模块创建扩展引用格式
    const sourceBlock = allBlocks.find(b => b.id === multiImageGroup.sourceBlockId);
    if (!sourceBlock) {
      console.warn('[ModuleRelationshipManager] Source block not found:', multiImageGroup.sourceBlockId);
      return;
    }

    // 更新生成模块的编号格式
    multiImageGroup.generatedBlockIds.forEach((blockId, index) => {
      const block = allBlocks.find(b => b.id === blockId);
      if (block) {
        // 设置扩展编号格式：B01-1, B01-2, etc.
        block.number = `${sourceBlock.number}-${index + 1}`;
        block.multiImageGroupId = multiImageGroup.id;
        block.multiImageIndex = index;
      }
    });

    console.log('[ModuleRelationshipManager] ✓ Block references updated');
  }

  /**
   * 处理组内模块删除逻辑
   */
  handleGroupDeletion(
    deletedBlockId: string,
    multiImageGroups: MultiImageGroup[]
  ): {
    shouldDeleteRelated: boolean;
    relatedBlockIds: string[];
    updatedGroups: MultiImageGroup[];
  } {
    console.log('[ModuleRelationshipManager] Handling deletion for block:', deletedBlockId);

    const relatedBlockIds: string[] = [];
    const updatedGroups: MultiImageGroup[] = [];
    let shouldDeleteRelated = false;

    for (const group of multiImageGroups) {
      // 如果删除的是源模块
      if (group.sourceBlockId === deletedBlockId) {
        console.log('[ModuleRelationshipManager] Source block deleted, marking related blocks for deletion');
        relatedBlockIds.push(...group.generatedBlockIds);
        shouldDeleteRelated = true;
        // 删除整个组
        this.multiImageGroups.delete(group.id);
      }
      // 如果删除的是生成的模块之一
      else if (group.generatedBlockIds.includes(deletedBlockId)) {
        console.log('[ModuleRelationshipManager] Generated block deleted, updating group');
        const updatedGroup = {
          ...group,
          generatedBlockIds: group.generatedBlockIds.filter(id => id !== deletedBlockId)
        };
        
        // 如果组内只剩下源模块，删除整个组
        if (updatedGroup.generatedBlockIds.length === 0) {
          this.multiImageGroups.delete(group.id);
        } else {
          this.multiImageGroups.set(group.id, updatedGroup);
          updatedGroups.push(updatedGroup);
        }
      } else {
        updatedGroups.push(group);
      }
    }

    console.log('[ModuleRelationshipManager] ✓ Deletion handled:', {
      shouldDeleteRelated,
      relatedBlockIds: relatedBlockIds.length,
      updatedGroups: updatedGroups.length
    });

    return {
      shouldDeleteRelated,
      relatedBlockIds,
      updatedGroups
    };
  }

  /**
   * 解析扩展变量引用格式
   * 支持 [B01], [B01-1], [B01-2] 等格式
   */
  parseVariableReference(reference: string): {
    baseBlockNumber: string;
    imageIndex?: number;
    isMultiImageReference: boolean;
  } | null {
    // 匹配格式：[B01] 或 [B01-1]
    const match = reference.match(/^\[([A-Z]\d+)(?:-(\d+))?\]$/);
    
    if (!match) {
      return null;
    }

    const baseBlockNumber = match[1];
    const imageIndex = match[2] ? parseInt(match[2]) - 1 : undefined; // 转换为0基索引
    const isMultiImageReference = imageIndex !== undefined;

    return {
      baseBlockNumber,
      imageIndex,
      isMultiImageReference
    };
  }

  /**
   * 获取变量引用的实际内容
   */
  resolveVariableReference(
    reference: string,
    allBlocks: Block[]
  ): string | null {
    const parsed = this.parseVariableReference(reference);
    if (!parsed) {
      return null;
    }

    // 如果是多图引用格式
    if (parsed.isMultiImageReference) {
      // 查找对应的多图模块
      const targetBlock = allBlocks.find(block => 
        block.number === `${parsed.baseBlockNumber}-${parsed.imageIndex! + 1}`
      );
      
      if (targetBlock) {
        return targetBlock.content;
      }
    } else {
      // 普通引用格式，查找基础模块
      const targetBlock = allBlocks.find(block => 
        block.number === parsed.baseBlockNumber
      );
      
      if (targetBlock) {
        return targetBlock.content;
      }
    }

    return null;
  }

  /**
   * 获取模块的所有可用引用格式
   */
  getAvailableReferences(block: Block, allBlocks: Block[]): string[] {
    const references: string[] = [];
    
    // 基础引用
    references.push(`[${block.number}]`);
    
    // 如果是多图组的源模块，添加子模块引用
    const group = this.getGroupBySourceBlock(block.id);
    if (group) {
      group.generatedBlockIds.forEach((_, index) => {
        references.push(`[${block.number}-${index + 1}]`);
      });
    }
    
    return references;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.multiImageGroups.clear();
    console.log('[ModuleRelationshipManager] Resources cleaned up');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalGroups: number;
    totalGeneratedBlocks: number;
    averageGroupSize: number;
  } {
    const groups = Array.from(this.multiImageGroups.values());
    const totalGroups = groups.length;
    const totalGeneratedBlocks = groups.reduce((sum, group) => sum + group.generatedBlockIds.length, 0);
    const averageGroupSize = totalGroups > 0 ? totalGeneratedBlocks / totalGroups : 0;

    return {
      totalGroups,
      totalGeneratedBlocks,
      averageGroupSize
    };
  }
}

export default ModuleRelationshipManager;