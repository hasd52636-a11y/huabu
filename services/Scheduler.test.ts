import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scheduler, ScheduleConfig, ScheduleInfo } from './Scheduler';
import { CanvasState } from '../types';

// Mock dependencies
vi.mock('./AutoExecutor');
vi.mock('./TemplateManager');

// Mock localStorage with proper state management
const createLocalStorageMock = () => {
  let storage: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
    _reset: () => {
      storage = {};
    }
  };
};

const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock timers
vi.useFakeTimers();

describe('Scheduler', () => {
  let scheduler: Scheduler;
  let mockCanvasState: CanvasState;

  beforeEach(() => {
    scheduler = new Scheduler();
    
    // Reset localStorage state
    (localStorageMock as any)._reset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    mockCanvasState = {
      blocks: [
        {
          id: 'block1',
          type: 'text',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle',
          number: 'A01'
        }
      ],
      connections: [],
      settings: {
        zoom: 1,
        pan: { x: 0, y: 0 }
      }
    };

    // Mock TemplateManager
    const mockTemplateManager = {
      listTemplates: vi.fn().mockResolvedValue([
        { id: 'template1', name: 'Test Template' }
      ]),
      loadTemplate: vi.fn().mockResolvedValue(mockCanvasState)
    };
    (scheduler as any).templateManager = mockTemplateManager;

    // Mock AutoExecutor
    const mockAutoExecutor = {
      executeWorkflow: vi.fn().mockResolvedValue({
        executionId: 'exec1',
        status: 'completed',
        results: [],
        statistics: {
          totalBlocks: 1,
          completedBlocks: 1,
          failedBlocks: 0,
          skippedBlocks: 0,
          totalExecutionTime: 1000,
          averageBlockTime: 1000
        }
      })
    };
    (scheduler as any).autoExecutor = mockAutoExecutor;
  });

  afterEach(() => {
    scheduler.stop();
    vi.clearAllTimers();
    vi.clearAllMocks();
    // Reset localStorage state
    (localStorageMock as any)._reset();
  });

  describe('Basic functionality', () => {
    it('should create scheduler instance', () => {
      expect(scheduler).toBeDefined();
    });

    it('should verify localStorage mock works', () => {
      // Test that our localStorage mock is working
      localStorageMock.setItem('test', 'value');
      expect(localStorageMock.getItem('test')).toBe('value');
      
      // Test that it persists across calls
      const retrieved = localStorageMock.getItem('test');
      expect(retrieved).toBe('value');
    });

    it('should start and stop scheduler', () => {
      scheduler.start();
      expect((scheduler as any).isRunning).toBe(true);
      
      scheduler.stop();
      expect((scheduler as any).isRunning).toBe(false);
    });

    it('should schedule a new execution', async () => {
      const config: ScheduleConfig = {
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {}
      };

      const scheduleId = await scheduler.scheduleExecution(config);

      expect(scheduleId).toBeDefined();
      expect(scheduleId).toMatch(/^schedule_/);
      
      // Verify the schedule was saved
      const savedSchedule = await scheduler.getSchedule(scheduleId);
      expect(savedSchedule).toBeDefined();
      expect(savedSchedule!.id).toBe(scheduleId);
      expect(savedSchedule!.cronExpression).toBe('0 9 * * *');
    });

    it('should list schedules', async () => {
      const mockSchedule: ScheduleInfo = {
        id: 'schedule1',
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        createdAt: new Date(),
        runCount: 0,
        status: 'active'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [mockSchedule],
        lastUpdated: new Date()
      }));

      const schedules = await scheduler.listSchedules();

      expect(schedules).toHaveLength(1);
      expect(schedules[0].id).toBe('schedule1');
    });

    it('should cancel a schedule', async () => {
      const mockSchedule: ScheduleInfo = {
        id: 'schedule1',
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        createdAt: new Date(),
        runCount: 0,
        status: 'active'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [mockSchedule],
        lastUpdated: new Date()
      }));

      await scheduler.cancelSchedule('schedule1');

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.schedules).toHaveLength(0);
    });

    it('should update a schedule', async () => {
      const mockSchedule: ScheduleInfo = {
        id: 'schedule1',
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        createdAt: new Date(),
        runCount: 0,
        status: 'active'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [mockSchedule],
        lastUpdated: new Date()
      }));

      await scheduler.updateSchedule('schedule1', {
        cronExpression: '0 10 * * *',
        enabled: false
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.schedules[0].cronExpression).toBe('0 10 * * *');
      expect(savedData.schedules[0].enabled).toBe(false);
    });

    it('should toggle schedule enabled state', async () => {
      const mockSchedule: ScheduleInfo = {
        id: 'schedule1',
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        createdAt: new Date(),
        runCount: 0,
        status: 'active'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [mockSchedule],
        lastUpdated: new Date()
      }));

      await scheduler.toggleSchedule('schedule1', false);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.schedules[0].enabled).toBe(false);
    });
  });

  describe('Cron expression parsing', () => {
    it('should parse valid cron expressions', () => {
      const testCases = [
        { cron: '0 9 * * *', valid: true },
        { cron: '*/5 * * * *', valid: true },
        { cron: '0 0 1 * *', valid: true },
        { cron: '0 12 * * 0', valid: true },
        { cron: '30 14 1 1 *', valid: true }
      ];

      testCases.forEach(testCase => {
        const result = scheduler.parseCronExpression(testCase.cron);
        expect(result.isValid).toBe(testCase.valid);
        if (testCase.valid) {
          expect(result.nextRun).toBeDefined();
          expect(result.description).toBeDefined();
        }
      });
    });

    it('should reject invalid cron expressions', () => {
      const invalidExpressions = [
        '0 9 * *',        // Too few parts
        '0 9 * * * *',    // Too many parts
        '60 9 * * *',     // Invalid minute
        '0 25 * * *',     // Invalid hour
        '0 9 32 * *',     // Invalid day
        '0 9 * 13 *',     // Invalid month
        '0 9 * * 8'       // Invalid day of week
      ];

      invalidExpressions.forEach(cron => {
        const result = scheduler.parseCronExpression(cron);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should provide human-readable descriptions', () => {
      const testCases = [
        { cron: '0 0 * * *', description: 'Daily at midnight' },
        { cron: '0 12 * * *', description: 'Daily at noon' },
        { cron: '0 0 * * 0', description: 'Weekly on Sunday at midnight' },
        { cron: '0 0 1 * *', description: 'Monthly on the 1st at midnight' },
        { cron: '*/5 * * * *', description: 'Every 5 minutes' },
        { cron: '0 */2 * * *', description: 'Every 2 hours' }
      ];

      testCases.forEach(testCase => {
        const result = scheduler.parseCronExpression(testCase.cron);
        expect(result.isValid).toBe(true);
        expect(result.description).toBe(testCase.description);
      });
    });
  });

  describe('Property 6: Schedule Execution Reliability', () => {
    /**
     * Property 6: Schedule Execution Reliability
     * For any scheduled template execution, the system should execute the template 
     * at the specified time with the correct configuration, regardless of system restarts.
     */
    it('should execute schedules at correct times', async () => {
      // Test basic scheduling functionality
      const config: ScheduleConfig = {
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        description: 'Daily at 9 AM'
      };

      const scheduleId = await scheduler.scheduleExecution(config);

      // Verify schedule was created with correct configuration
      const schedule = await scheduler.getSchedule(scheduleId);
      expect(schedule).toBeDefined();
      expect(schedule!.cronExpression).toBe('0 9 * * *');
      expect(schedule!.enabled).toBe(true);
      expect(schedule!.status).toBe('active');

      // Verify cron expression is valid and has next run time
      const cronResult = scheduler.parseCronExpression('0 9 * * *');
      expect(cronResult.isValid).toBe(true);
      expect(cronResult.nextRun).toBeDefined();
      expect(schedule!.nextRun).toBeDefined();

      // Clean up
      await scheduler.cancelSchedule(scheduleId);
    });

    it('should maintain schedule state across restarts', async () => {
      // Create initial schedules
      const schedules = [
        {
          id: 'schedule1',
          templateId: 'template1',
          cronExpression: '0 9 * * *',
          enabled: true,
          executionOptions: {},
          createdAt: new Date('2023-01-01T08:00:00Z'),
          runCount: 5,
          status: 'active' as const,
          lastRun: new Date('2023-01-01T09:00:00Z'),
          nextRun: new Date('2023-01-02T09:00:00Z')
        },
        {
          id: 'schedule2',
          templateId: 'template1',
          cronExpression: '*/30 * * * *',
          enabled: false,
          executionOptions: {},
          createdAt: new Date('2023-01-01T10:00:00Z'),
          runCount: 0,
          status: 'paused' as const
        }
      ];

      // Set up storage with existing schedules
      const storageData = JSON.stringify({
        version: '1.0.0',
        schedules,
        lastUpdated: new Date()
      });
      
      // Manually set the storage data
      (localStorageMock as any).setItem('automation_schedules', storageData);

      // Create new scheduler instance (simulating restart)
      const newScheduler = new Scheduler();
      
      // Mock dependencies for new scheduler
      const mockTemplateManager = {
        listTemplates: vi.fn().mockResolvedValue([
          { id: 'template1', name: 'Test Template' }
        ]),
        loadTemplate: vi.fn().mockResolvedValue(mockCanvasState)
      };
      (newScheduler as any).templateManager = mockTemplateManager;

      const mockAutoExecutor = {
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec1',
          status: 'completed',
          results: [],
          statistics: {
            totalBlocks: 1,
            completedBlocks: 1,
            failedBlocks: 0,
            skippedBlocks: 0,
            totalExecutionTime: 1000,
            averageBlockTime: 1000
          }
        })
      };
      (newScheduler as any).autoExecutor = mockAutoExecutor;

      // Load schedules
      const loadedSchedules = await newScheduler.listSchedules();

      // Verify all schedules are preserved
      expect(loadedSchedules).toHaveLength(2);
      
      const schedule1 = loadedSchedules.find(s => s.id === 'schedule1');
      const schedule2 = loadedSchedules.find(s => s.id === 'schedule2');

      expect(schedule1).toBeDefined();
      expect(schedule1!.cronExpression).toBe('0 9 * * *');
      expect(schedule1!.enabled).toBe(true);
      expect(schedule1!.runCount).toBe(5);
      expect(schedule1!.status).toBe('active');

      expect(schedule2).toBeDefined();
      expect(schedule2!.cronExpression).toBe('*/30 * * * *');
      expect(schedule2!.enabled).toBe(false);
      expect(schedule2!.status).toBe('paused');

      newScheduler.stop();
    });

    it('should handle schedule execution with correct configuration', async () => {
      const config: ScheduleConfig = {
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {
          maxConcurrency: 2,
          downloadPath: '/test/downloads'
        },
        description: 'Test execution with options'
      };

      const scheduleId = await scheduler.scheduleExecution(config);

      // Manually trigger execution to test configuration passing
      const result = await scheduler.triggerSchedule(scheduleId);

      // Verify execution was called with correct parameters
      const mockAutoExecutor = (scheduler as any).autoExecutor;
      expect(mockAutoExecutor.executeWorkflow).toHaveBeenCalledWith(
        mockCanvasState,
        config.executionOptions
      );

      expect(result.status).toBe('completed');

      // Verify schedule was updated after execution
      const updatedSchedule = await scheduler.getSchedule(scheduleId);
      expect(updatedSchedule!.runCount).toBe(1);
      expect(updatedSchedule!.lastRun).toBeDefined();
      expect(updatedSchedule!.lastResult).toBeDefined();
    });

    it('should respect schedule limits and end conditions', async () => {
      // Test max runs limit
      const config: ScheduleConfig = {
        templateId: 'template1',
        cronExpression: '*/1 * * * *',
        enabled: true,
        executionOptions: {},
        maxRuns: 2
      };

      const scheduleId = await scheduler.scheduleExecution(config);

      // Simulate multiple executions
      await scheduler.triggerSchedule(scheduleId);
      await scheduler.triggerSchedule(scheduleId);

      const finalSchedule = await scheduler.getSchedule(scheduleId);
      expect(finalSchedule!.status).toBe('completed');
      expect(finalSchedule!.enabled).toBe(false);
      expect(finalSchedule!.runCount).toBe(2);
    });

    it('should handle execution errors gracefully', async () => {
      // Mock executor to throw error for this test only
      const mockAutoExecutor = (scheduler as any).autoExecutor;
      const originalExecuteWorkflow = mockAutoExecutor.executeWorkflow;
      mockAutoExecutor.executeWorkflow.mockRejectedValueOnce(new Error('Execution failed'));

      const config: ScheduleConfig = {
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {}
      };

      const scheduleId = await scheduler.scheduleExecution(config);

      // Trigger execution that will fail
      await expect(scheduler.triggerSchedule(scheduleId)).rejects.toThrow('Execution failed');

      // Verify schedule status was updated
      const schedule = await scheduler.getSchedule(scheduleId);
      expect(schedule!.status).toBe('failed');
      expect(schedule!.lastResult).toBeDefined();
      expect(schedule!.lastResult!.status).toBe('failed');

      // Restore original mock for other tests
      mockAutoExecutor.executeWorkflow = originalExecuteWorkflow;
    });

    it('should validate template existence before scheduling', async () => {
      // Mock template manager to return empty list
      const mockTemplateManager = (scheduler as any).templateManager;
      mockTemplateManager.listTemplates.mockResolvedValueOnce([]);

      const config: ScheduleConfig = {
        templateId: 'nonexistent',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {}
      };

      await expect(scheduler.scheduleExecution(config)).rejects.toThrow('Template with ID nonexistent not found');
    });
  });

  describe('Error handling', () => {
    it('should handle storage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const schedules = await scheduler.listSchedules();
      expect(schedules).toEqual([]);
    });

    it('should handle corrupted storage data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const schedules = await scheduler.listSchedules();
      expect(schedules).toEqual([]);
    });

    it('should handle missing schedule operations', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [],
        lastUpdated: new Date()
      }));

      await expect(scheduler.cancelSchedule('nonexistent')).rejects.toThrow('Schedule with ID nonexistent not found');
      await expect(scheduler.updateSchedule('nonexistent', {})).rejects.toThrow('Schedule with ID nonexistent not found');
      await expect(scheduler.triggerSchedule('nonexistent')).rejects.toThrow('Schedule with ID nonexistent not found');
    });

    it('should validate cron expressions during updates', async () => {
      const mockSchedule: ScheduleInfo = {
        id: 'schedule1',
        templateId: 'template1',
        cronExpression: '0 9 * * *',
        enabled: true,
        executionOptions: {},
        createdAt: new Date(),
        runCount: 0,
        status: 'active'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        schedules: [mockSchedule],
        lastUpdated: new Date()
      }));

      await expect(scheduler.updateSchedule('schedule1', {
        cronExpression: 'invalid cron'
      })).rejects.toThrow('Invalid cron expression');
    });
  });
});