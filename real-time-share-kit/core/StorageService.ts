
import { StorageAdapter } from '../types';

export class LocalStorageAdapter implements StorageAdapter {
  async save(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save failed', e);
    }
  }

  async load(key: string): Promise<any> {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
