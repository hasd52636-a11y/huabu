import { AutoExecutor, ExecutionOptions, ExecutionResult } from './AutoExecutor';
import { TemplateManager } from './TemplateManager';

export interface ScheduleConfig {
  templateId: string;
  templateName?: string; // For display purposes
  cronExpression: string;
  executionOptions: ExecutionOptions;
  enabled: boolean;
  maxRuns?: number;
  endDate?: Date;
  description?: string;
}

export interface ScheduleInfo extends ScheduleConfig {
  id: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  lastResult?: ExecutionResult;
  status: 'active' | 'paused' | 'completed' | 'failed';
}

export interface ScheduleStorage {
  version: string;
  schedules: ScheduleInfo[];
  lastUpdated: Date;
}

export interface CronParseResult {
  isValid: boolean;
  nextRun?: Date;
  description?: string;
  error?: string;
}

export class Scheduler {
  private static readonly STORAGE_KEY = 'automation_schedules';
  private static readonly STORAGE_VERSION = '1.0.0';
  
  private autoExecutor: AutoExecutor;
  private templateManager: TemplateManager;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.autoExecutor = new AutoExecutor();
    this.templateManager = new TemplateManager();
  }

  /**
   * Start the scheduler - begins monitoring and executing scheduled tasks
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleAllTasks();
    
    // Check for missed schedules every minute
    setInterval(() => {
      this.checkMissedSchedules();
    }, 60000);
  }

  /**
   * Stop the scheduler - cancels all active timers
   */
  stop(): void {
    this.isRunning = false;
    
    // Clear all active timers
    for (const [scheduleId, timer] of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Schedule a new execution
   */
  async scheduleExecution(config: ScheduleConfig): Promise<string> {
    // Validate cron expression
    const cronResult = this.parseCronExpression(config.cronExpression);
    if (!cronResult.isValid) {
      throw new Error(`Invalid cron expression: ${cronResult.error}`);
    }

    // Validate template exists
    try {
      const templates = await this.templateManager.listTemplates();
      const template = templates.find(t => t.id === config.templateId);
      if (!template) {
        throw new Error(`Template with ID ${config.templateId} not found`);
      }
      config.templateName = template.name;
    } catch (error) {
      throw new Error(`Failed to validate template: ${error instanceof Error ? error.message : String(error)}`);
    }

    const scheduleId = this.generateScheduleId();
    const schedule: ScheduleInfo = {
      ...config,
      id: scheduleId,
      createdAt: new Date(),
      nextRun: cronResult.nextRun,
      runCount: 0,
      status: config.enabled ? 'active' : 'paused'
    };

    // Save to storage
    const storage = await this.getStorage();
    storage.schedules.push(schedule);
    await this.saveStorage(storage);

    // Schedule the task if enabled
    if (config.enabled && this.isRunning) {
      this.scheduleTask(schedule);
    }

    return scheduleId;
  }

  /**
   * Cancel a scheduled execution
   */
  async cancelSchedule(scheduleId: string): Promise<void> {
    const storage = await this.getStorage();
    const scheduleIndex = storage.schedules.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex === -1) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Clear active timer
    const timer = this.activeTimers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(scheduleId);
    }

    // Remove from storage
    storage.schedules.splice(scheduleIndex, 1);
    storage.lastUpdated = new Date();
    await this.saveStorage(storage);
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<ScheduleInfo[]> {
    const storage = await this.getStorage();
    return storage.schedules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): Promise<void> {
    const storage = await this.getStorage();
    const schedule = storage.schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Clear existing timer
    const timer = this.activeTimers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(scheduleId);
    }

    // Update schedule
    Object.assign(schedule, updates);

    // Validate new cron expression if provided
    if (updates.cronExpression) {
      const cronResult = this.parseCronExpression(updates.cronExpression);
      if (!cronResult.isValid) {
        throw new Error(`Invalid cron expression: ${cronResult.error}`);
      }
      schedule.nextRun = cronResult.nextRun;
    }

    // Update status based on enabled flag
    if (updates.enabled !== undefined) {
      schedule.status = updates.enabled ? 'active' : 'paused';
    }

    storage.lastUpdated = new Date();
    await this.saveStorage(storage);

    // Reschedule if enabled and running
    if (schedule.enabled && this.isRunning) {
      this.scheduleTask(schedule);
    }
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ScheduleInfo | null> {
    const storage = await this.getStorage();
    return storage.schedules.find(s => s.id === scheduleId) || null;
  }

  /**
   * Enable/disable a schedule
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    await this.updateSchedule(scheduleId, { enabled });
  }

  /**
   * Manually trigger a scheduled execution
   */
  async triggerSchedule(scheduleId: string): Promise<ExecutionResult> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    return await this.executeSchedule(schedule, true);
  }

  /**
   * Parse cron expression and get next run time
   */
  parseCronExpression(cronExpression: string): CronParseResult {
    try {
      // Simple cron parser - supports basic patterns
      // Format: minute hour day month dayOfWeek
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5) {
        return {
          isValid: false,
          error: 'Cron expression must have 5 parts: minute hour day month dayOfWeek'
        };
      }

      const [minute, hour, day, month, dayOfWeek] = parts;

      // Basic validation
      if (!this.isValidCronPart(minute, 0, 59) ||
          !this.isValidCronPart(hour, 0, 23) ||
          !this.isValidCronPart(day, 1, 31) ||
          !this.isValidCronPart(month, 1, 12) ||
          !this.isValidCronPart(dayOfWeek, 0, 6)) {
        return {
          isValid: false,
          error: 'Invalid cron expression values'
        };
      }

      const nextRun = this.calculateNextRun(cronExpression);
      const description = this.describeCronExpression(cronExpression);

      return {
        isValid: true,
        nextRun,
        description
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to parse cron expression'
      };
    }
  }

  /**
   * Schedule all active tasks
   */
  private async scheduleAllTasks(): Promise<void> {
    const storage = await this.getStorage();
    
    for (const schedule of storage.schedules) {
      if (schedule.enabled && schedule.status === 'active') {
        this.scheduleTask(schedule);
      }
    }
  }

  /**
   * Schedule a single task
   */
  private scheduleTask(schedule: ScheduleInfo): void {
    // Clear existing timer
    const existingTimer = this.activeTimers.get(schedule.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const nextRun = this.calculateNextRun(schedule.cronExpression);
    if (!nextRun) return;

    const delay = nextRun.getTime() - Date.now();
    
    // Don't schedule if the time has already passed
    if (delay <= 0) {
      this.scheduleTask({ ...schedule, nextRun: this.calculateNextRun(schedule.cronExpression, nextRun) });
      return;
    }

    const timer = setTimeout(async () => {
      await this.executeSchedule(schedule);
      
      // Schedule next run if still active
      if (schedule.enabled && schedule.status === 'active') {
        this.scheduleTask(schedule);
      }
    }, delay);

    this.activeTimers.set(schedule.id, timer);
    
    // Update next run time in storage
    this.updateScheduleNextRun(schedule.id, nextRun);
  }

  /**
   * Execute a scheduled task
   */
  private async executeSchedule(schedule: ScheduleInfo, isManual = false): Promise<ExecutionResult> {
    try {
      // Load template
      const canvasState = await this.templateManager.loadTemplate(schedule.templateId);
      
      // Execute workflow
      const result = await this.autoExecutor.executeWorkflow(canvasState, schedule.executionOptions);
      
      // Update schedule info
      await this.updateScheduleAfterExecution(schedule.id, result, isManual);
      
      return result;
    } catch (error) {
      const errorResult: ExecutionResult = {
        executionId: `error_${Date.now()}`,
        status: 'failed',
        results: [],
        statistics: {
          totalBlocks: 0,
          completedBlocks: 0,
          failedBlocks: 0,
          skippedBlocks: 0,
          totalExecutionTime: 0,
          averageBlockTime: 0
        },
        errors: [{
          blockId: '',
          blockNumber: '',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          retryCount: 0
        }]
      };

      await this.updateScheduleAfterExecution(schedule.id, errorResult, isManual);
      throw error;
    }
  }

  /**
   * Update schedule after execution
   */
  private async updateScheduleAfterExecution(scheduleId: string, result: ExecutionResult, isManual = false): Promise<void> {
    const storage = await this.getStorage();
    const schedule = storage.schedules.find(s => s.id === scheduleId);
    
    if (!schedule) return;

    schedule.lastRun = new Date();
    schedule.lastResult = result;
    schedule.runCount++;

    // Check if schedule should be completed
    if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
      schedule.status = 'completed';
      schedule.enabled = false;
    } else if (schedule.endDate && new Date() >= schedule.endDate) {
      schedule.status = 'completed';
      schedule.enabled = false;
    } else if (result.status === 'failed') {
      schedule.status = 'failed';
    }

    // Calculate next run if not manual and still active
    if (!isManual && schedule.enabled && schedule.status === 'active') {
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
    }

    storage.lastUpdated = new Date();
    await this.saveStorage(storage);
  }

  /**
   * Update schedule next run time
   */
  private async updateScheduleNextRun(scheduleId: string, nextRun: Date): Promise<void> {
    const storage = await this.getStorage();
    const schedule = storage.schedules.find(s => s.id === scheduleId);
    
    if (schedule) {
      schedule.nextRun = nextRun;
      storage.lastUpdated = new Date();
      await this.saveStorage(storage);
    }
  }

  /**
   * Check for missed schedules
   */
  private async checkMissedSchedules(): Promise<void> {
    const storage = await this.getStorage();
    const now = new Date();

    for (const schedule of storage.schedules) {
      if (schedule.enabled && 
          schedule.status === 'active' && 
          schedule.nextRun && 
          schedule.nextRun < now &&
          !this.activeTimers.has(schedule.id)) {
        
        // Reschedule missed task
        this.scheduleTask(schedule);
      }
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private calculateNextRun(cronExpression: string, fromDate?: Date): Date | null {
    try {
      const now = fromDate || new Date();
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length !== 5) return null;

      const [minute, hour, day, month, dayOfWeek] = parts;
      
      // Simple implementation - find next matching time
      const nextRun = new Date(now);
      nextRun.setSeconds(0, 0);

      // Start from next minute
      nextRun.setMinutes(nextRun.getMinutes() + 1);

      // Find next matching time (simplified logic)
      for (let i = 0; i < 366 * 24 * 60; i++) { // Search up to a year
        if (this.matchesCron(nextRun, parts)) {
          return nextRun;
        }
        nextRun.setMinutes(nextRun.getMinutes() + 1);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a date matches cron expression
   */
  private matchesCron(date: Date, cronParts: string[]): boolean {
    const [minute, hour, day, month, dayOfWeek] = cronParts;

    return this.matchesCronPart(date.getMinutes(), minute) &&
           this.matchesCronPart(date.getHours(), hour) &&
           this.matchesCronPart(date.getDate(), day) &&
           this.matchesCronPart(date.getMonth() + 1, month) &&
           this.matchesCronPart(date.getDay(), dayOfWeek);
  }

  /**
   * Check if a value matches a cron part
   */
  private matchesCronPart(value: number, cronPart: string): boolean {
    if (cronPart === '*') return true;
    
    if (cronPart.includes(',')) {
      return cronPart.split(',').some(part => this.matchesCronPart(value, part.trim()));
    }
    
    if (cronPart.includes('/')) {
      const [range, step] = cronPart.split('/');
      const stepValue = parseInt(step);
      if (range === '*') {
        return value % stepValue === 0;
      }
    }
    
    if (cronPart.includes('-')) {
      const [start, end] = cronPart.split('-').map(Number);
      return value >= start && value <= end;
    }
    
    return value === parseInt(cronPart);
  }

  /**
   * Validate cron part
   */
  private isValidCronPart(part: string, min: number, max: number): boolean {
    if (part === '*') return true;
    
    if (part.includes(',')) {
      return part.split(',').every(p => this.isValidCronPart(p.trim(), min, max));
    }
    
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      return this.isValidCronPart(range, min, max) && !isNaN(parseInt(step));
    }
    
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    
    const num = parseInt(part);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Describe cron expression in human-readable format
   */
  private describeCronExpression(cronExpression: string): string {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) return cronExpression;

    const [minute, hour, day, month, dayOfWeek] = parts;

    // Common patterns
    if (cronExpression === '0 0 * * *') return 'Daily at midnight';
    if (cronExpression === '0 12 * * *') return 'Daily at noon';
    if (cronExpression === '0 0 * * 0') return 'Weekly on Sunday at midnight';
    if (cronExpression === '0 0 1 * *') return 'Monthly on the 1st at midnight';
    if (cronExpression === '*/5 * * * *') return 'Every 5 minutes';
    if (cronExpression === '0 */2 * * *') return 'Every 2 hours';

    // Build description
    let description = 'At ';
    
    if (minute === '0' && hour !== '*') {
      description += `${hour}:00`;
    } else if (minute !== '*' && hour !== '*') {
      description += `${hour}:${minute.padStart(2, '0')}`;
    } else {
      description += `minute ${minute} of hour ${hour}`;
    }

    if (day !== '*') description += ` on day ${day}`;
    if (month !== '*') description += ` of month ${month}`;
    if (dayOfWeek !== '*') description += ` on weekday ${dayOfWeek}`;

    return description;
  }

  /**
   * Get storage
   */
  private async getStorage(): Promise<ScheduleStorage> {
    try {
      const stored = localStorage.getItem(Scheduler.STORAGE_KEY);
      if (!stored) {
        return {
          version: Scheduler.STORAGE_VERSION,
          schedules: [],
          lastUpdated: new Date()
        };
      }

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      parsed.lastUpdated = new Date(parsed.lastUpdated);
      parsed.schedules = parsed.schedules.map((schedule: any) => ({
        ...schedule,
        createdAt: new Date(schedule.createdAt),
        lastRun: schedule.lastRun ? new Date(schedule.lastRun) : undefined,
        nextRun: schedule.nextRun ? new Date(schedule.nextRun) : undefined,
        endDate: schedule.endDate ? new Date(schedule.endDate) : undefined
      }));

      return parsed;
    } catch (error) {
      console.error('Failed to load schedule storage:', error);
      return {
        version: Scheduler.STORAGE_VERSION,
        schedules: [],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Save storage
   */
  private async saveStorage(storage: ScheduleStorage): Promise<void> {
    try {
      storage.lastUpdated = new Date();
      localStorage.setItem(Scheduler.STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
      throw new Error(`Failed to save schedules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate unique schedule ID
   */
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}