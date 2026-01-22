/**
 * 增量数据同步工具
 * 只传输变化的部分，大幅减少数据传输量
 */

export interface DeltaChange {
  type: 'add' | 'update' | 'delete';
  path: string;
  value?: any;
  oldValue?: any;
}

export class DeltaSync {
  private lastState: any = null;
  
  /**
   * 计算两个状态之间的差异
   */
  calculateDelta(newState: any): DeltaChange[] {
    if (!this.lastState) {
      this.lastState = this.deepClone(newState);
      return [{ type: 'add', path: 'root', value: newState }];
    }
    
    const changes = this.compareObjects(this.lastState, newState, '');
    this.lastState = this.deepClone(newState);
    
    return changes;
  }
  
  /**
   * 应用增量变化到状态
   */
  applyDelta(baseState: any, changes: DeltaChange[]): any {
    let result = this.deepClone(baseState);
    
    for (const change of changes) {
      result = this.applyChange(result, change);
    }
    
    return result;
  }
  
  private compareObjects(oldObj: any, newObj: any, path: string): DeltaChange[] {
    const changes: DeltaChange[] = [];
    
    // 检查新增和修改
    for (const key in newObj) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = oldObj[key];
      const newValue = newObj[key];
      
      if (!(key in oldObj)) {
        // 新增
        changes.push({ type: 'add', path: currentPath, value: newValue });
      } else if (this.isDifferent(oldValue, newValue)) {
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          // 递归比较对象
          changes.push(...this.compareObjects(oldValue, newValue, currentPath));
        } else {
          // 直接更新
          changes.push({ type: 'update', path: currentPath, value: newValue, oldValue });
        }
      }
    }
    
    // 检查删除
    for (const key in oldObj) {
      if (!(key in newObj)) {
        const currentPath = path ? `${path}.${key}` : key;
        changes.push({ type: 'delete', path: currentPath, oldValue: oldObj[key] });
      }
    }
    
    return changes;
  }
  
  private applyChange(obj: any, change: DeltaChange): any {
    const pathParts = change.path.split('.');
    
    if (change.path === 'root') {
      return change.value;
    }
    
    let current = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    
    switch (change.type) {
      case 'add':
      case 'update':
        current[lastPart] = change.value;
        break;
      case 'delete':
        delete current[lastPart];
        break;
    }
    
    return obj;
  }
  
  private isDifferent(a: any, b: any): boolean {
    if (a === b) return false;
    if (a == null || b == null) return true;
    if (typeof a !== typeof b) return true;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return true;
      return a.some((item, index) => this.isDifferent(item, b[index]));
    }
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return true;
      return keysA.some(key => this.isDifferent(a[key], b[key]));
    }
    
    return true;
  }
  
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      cloned[key] = this.deepClone(obj[key]);
    }
    return cloned;
  }
  
  /**
   * 压缩变化数据
   */
  compressChanges(changes: DeltaChange[]): string {
    // 简单的压缩：合并相同路径的变化
    const compressed = new Map<string, DeltaChange>();
    
    for (const change of changes) {
      const existing = compressed.get(change.path);
      if (existing && existing.type === 'update' && change.type === 'update') {
        // 合并连续的更新
        compressed.set(change.path, { ...change, oldValue: existing.oldValue });
      } else {
        compressed.set(change.path, change);
      }
    }
    
    return JSON.stringify(Array.from(compressed.values()));
  }
  
  /**
   * 解压变化数据
   */
  decompressChanges(compressed: string): DeltaChange[] {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.error('[DeltaSync] 解压失败:', error);
      return [];
    }
  }
}