import { ErrorHandler } from './ErrorHandler';

// 限制类型定义
export type LimitType = 'api_calls' | 'file_size' | 'concurrent_requests' | 'storage' | 'video_duration';

// 限制配置接口
export interface LimitConfig {
  max: number;
  current: number;
  resetTime?: number;
  unit?: string;
}

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  exceeded?: boolean;
  remaining?: number;
  resetTime?: number;
  message?: string;
}

export class LimitValidator {
  private limits: Map<LimitType, LimitConfig> = new Map();
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = new ErrorHandler();
    this.initializeDefaultLimits();
  }

  /**
   * 初始化默认限制配置
   */
  private initializeDefaultLimits(): void {
    this.limits.set('api_calls', {
      max: 1000,
      current: 0,
      resetTime: this.getResetTimeForDay(),
      unit: 'requests'
    });

    this.limits.set('file_size', {
      max: 100 * 1024 * 1024, // 100MB
      current: 0,
      unit: 'bytes'
    });

    this.limits.set('concurrent_requests', {
      max: 10,
      current: 0,
      unit: 'requests'
    });

    this.limits.set('storage', {
      max: 10 * 1024 * 1024 * 1024, // 10GB
      current: 0,
      unit: 'bytes'
    });

    this.limits.set('video_duration', {
      max: 300, // 5 minutes
      current: 0,
      unit: 'seconds'
    });
  }

  /**
   * 获取当天的重置时间
   */
  private getResetTimeForDay(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * 验证特定类型的限制
   */
  validate(limitType: LimitType, amount: number = 0): ValidationResult {
    const limit = this.limits.get(limitType);
    if (!limit) {
      return {
        valid: true,
        message: `No limit configured for ${limitType}`
      };
    }

    // 检查是否需要重置限制
    if (limit.resetTime && Date.now() > limit.resetTime) {
      limit.current = 0;
      limit.resetTime = this.getResetTimeForDay();
    }

    const wouldExceed = limit.current + amount > limit.max;
    const remaining = Math.max(0, limit.max - limit.current);

    return {
      valid: !wouldExceed,
      exceeded: wouldExceed,
      remaining,
      resetTime: limit.resetTime,
      message: wouldExceed
        ? `Limit exceeded for ${limitType}. Maximum allowed: ${limit.max}${limit.unit ? ` ${limit.unit}` : ''}`
        : `Limit valid. Remaining: ${remaining}${limit.unit ? ` ${limit.unit}` : ''}`
    };
  }

  /**
   * 增加使用量
   */
  incrementUsage(limitType: LimitType, amount: number = 1): ValidationResult {
    const result = this.validate(limitType, amount);
    if (result.valid) {
      const limit = this.limits.get(limitType);
      if (limit) {
        limit.current += amount;
      }
    }
    return result;
  }

  /**
   * 减少使用量
   */
  decrementUsage(limitType: LimitType, amount: number = 1): void {
    const limit = this.limits.get(limitType);
    if (limit) {
      limit.current = Math.max(0, limit.current - amount);
    }
  }

  /**
   * 设置当前使用量
   */
  setCurrentUsage(limitType: LimitType, amount: number): void {
    const limit = this.limits.get(limitType);
    if (limit) {
      limit.current = Math.max(0, Math.min(amount, limit.max));
    }
  }

  /**
   * 更新限制配置
   */
  updateLimit(limitType: LimitType, config: Partial<LimitConfig>): void {
    const limit = this.limits.get(limitType);
    if (limit) {
      Object.assign(limit, config);
    } else {
      this.limits.set(limitType, {
        max: config.max || 1000,
        current: config.current || 0,
        resetTime: config.resetTime,
        unit: config.unit
      });
    }
  }

  /**
   * 获取所有限制信息
   */
  getAllLimits(): Map<LimitType, LimitConfig> {
    return new Map(this.limits);
  }

  /**
   * 获取特定限制信息
   */
  getLimit(limitType: LimitType): LimitConfig | undefined {
    return this.limits.get(limitType);
  }

  /**
   * 获取使用情况百分比
   */
  getUsagePercentage(limitType: LimitType): number {
    const limit = this.limits.get(limitType);
    if (!limit) return 0;
    return Math.min(100, (limit.current / limit.max) * 100);
  }

  /**
   * 重置特定限制
   */
  resetLimit(limitType: LimitType): void {
    const limit = this.limits.get(limitType);
    if (limit) {
      limit.current = 0;
      limit.resetTime = this.getResetTimeForDay();
    }
  }

  /**
   * 批量验证多个限制
   */
  validateMultiple(limits: Array<{ type: LimitType; amount: number }>): { [key: string]: ValidationResult } {
    const results: { [key: string]: ValidationResult } = {};
    
    limits.forEach(({ type, amount }) => {
      results[type] = this.validate(type, amount);
    });
    
    return results;
  }
}