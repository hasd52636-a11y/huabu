import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from './StateManager';
import { ExecutionState, WorkflowState, AutomationState } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    stateManager = new StateManager();
  });

  describe('Basic State Operations', () => {
    it('should save and restore execution state', () => {
      const state: ExecutionState = {
        id: 'exec-1',
        status: 'running',
        currentBlockId: 'block-1',
        completedBlocks: ['block-0'],
        progress: 0.5,
        startTime: Date.now(),
        variables: { var1: 'value1' },
        errors: []
      };

      stateManager.saveExecutionState(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'automation_execution_exec-1',
        JSON.stringify(state)
      );

      localStorageMock.getItem.mockReturnValue(JSON.stringify(state));
      const restored = stateManager.getExecutionState('exec-1');
      expect(restored).toEqual(state);
    });

    it('should save and restore workflow state', () => {
      const state: WorkflowState = {
        id: 'workflow-1',
        blocks: [
          { id: 'block-1', type: 'text', position: { x: 0, y: 0 }, prompt: 'test' }
        ],
        connections: [],
        variables: { var1: 'value1' },
        lastModified: Date.now()
      };

      stateManager.saveWorkflowState(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'automation_workflow_workflow-1',
        JSON.stringify(state)
      );

      localStorageMock.getItem.mockReturnValue(JSON.stringify(state));
      const restored = stateManager.getWorkflowState('workflow-1');
      expect(restored).toEqual(state);
    });

    it('should save and restore automation state', () => {
      const state: AutomationState = {
        isRunning: true,
        currentExecution: 'exec-1',
        queuedExecutions: ['exec-2'],
        activeSchedules: ['schedule-1'],
        resourceUsage: {
          memory: 100,
          cpu: 50,
          activeConnections: 5
        }
      };

      stateManager.saveAutomationState(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'automation_state',
        JSON.stringify(state)
      );

      localStorageMock.getItem.mockReturnValue(JSON.stringify(state));
      const restored = stateManager.getAutomationState();
      expect(restored).toEqual(state);
    });
  });

  describe('Property 9: State Recovery Reliability', () => {
    // Property test for state recovery reliability
    it('should maintain state consistency across save/restore cycles', () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Generate random execution state
        const originalState: ExecutionState = {
          id: `exec-${i}`,
          status: ['pending', 'running', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
          currentBlockId: `block-${Math.floor(Math.random() * 10)}`,
          completedBlocks: Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => `block-${j}`),
          progress: Math.random(),
          startTime: Date.now() - Math.floor(Math.random() * 10000),
          variables: Object.fromEntries(
            Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => [`var${j}`, `value${j}`])
          ),
          errors: Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => ({
            blockId: `block-${j}`,
            message: `Error ${j}`,
            timestamp: Date.now()
          }))
        };

        // Save state
        stateManager.saveExecutionState(originalState);
        
        // Mock localStorage return
        localStorageMock.getItem.mockReturnValue(JSON.stringify(originalState));
        
        // Restore state
        const restoredState = stateManager.getExecutionState(originalState.id);
        
        // Verify complete state preservation
        expect(restoredState).toEqual(originalState);
        expect(restoredState?.id).toBe(originalState.id);
        expect(restoredState?.status).toBe(originalState.status);
        expect(restoredState?.progress).toBe(originalState.progress);
        expect(restoredState?.variables).toEqual(originalState.variables);
        expect(restoredState?.completedBlocks).toEqual(originalState.completedBlocks);
        expect(restoredState?.errors).toEqual(originalState.errors);
      }
    });

    it('should handle corrupted state data gracefully', () => {
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        // Test various corruption scenarios
        const corruptedData = [
          'invalid json',
          '{"incomplete": true',
          '{}',
          'null',
          '{"id": null}',
          '{"status": "invalid_status"}',
          JSON.stringify({ id: 'test', status: 'running' }) // missing required fields
        ][i % 7];

        localStorageMock.getItem.mockReturnValue(corruptedData);
        
        // Should not throw and should return null for invalid data
        const result = stateManager.getExecutionState('test-id');
        expect(result).toBeNull();
      }
    });

    it('should maintain state isolation between different execution IDs', () => {
      const iterations = 50;
      const states: ExecutionState[] = [];
      
      // Create multiple states
      for (let i = 0; i < iterations; i++) {
        const state: ExecutionState = {
          id: `exec-${i}`,
          status: 'running',
          currentBlockId: `block-${i}`,
          completedBlocks: [`block-${i-1}`],
          progress: i / iterations,
          startTime: Date.now() + i,
          variables: { [`var${i}`]: `value${i}` },
          errors: []
        };
        
        states.push(state);
        stateManager.saveExecutionState(state);
      }
      
      // Verify each state can be retrieved independently
      for (let i = 0; i < iterations; i++) {
        localStorageMock.getItem.mockReturnValue(JSON.stringify(states[i]));
        const retrieved = stateManager.getExecutionState(`exec-${i}`);
        
        expect(retrieved).toEqual(states[i]);
        expect(retrieved?.variables).toEqual({ [`var${i}`]: `value${i}` });
        expect(retrieved?.progress).toBe(i / iterations);
      }
    });

    it('should preserve complex nested data structures', () => {
      const iterations = 30;
      
      for (let i = 0; i < iterations; i++) {
        const complexState: WorkflowState = {
          id: `workflow-${i}`,
          blocks: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
            id: `block-${j}`,
            type: ['text', 'image', 'video'][j % 3] as any,
            position: { x: Math.random() * 1000, y: Math.random() * 1000 },
            prompt: `Prompt ${j}`,
            result: j % 2 === 0 ? {
              content: `Result ${j}`,
              timestamp: Date.now(),
              metadata: { size: Math.random() * 1000 }
            } : undefined,
            connections: Array.from({ length: Math.floor(Math.random() * 3) }, (_, k) => ({
              id: `conn-${k}`,
              sourceId: `block-${j}`,
              targetId: `block-${(j + k + 1) % 10}`,
              data: { value: `data-${k}` }
            }))
          })),
          connections: [],
          variables: Object.fromEntries(
            Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => [
              `var${j}`, 
              { 
                value: `value${j}`, 
                type: 'string',
                metadata: { source: `block-${j}` }
              }
            ])
          ),
          lastModified: Date.now()
        };

        stateManager.saveWorkflowState(complexState);
        localStorageMock.getItem.mockReturnValue(JSON.stringify(complexState));
        
        const restored = stateManager.getWorkflowState(complexState.id);
        
        // Deep equality check
        expect(restored).toEqual(complexState);
        expect(restored?.blocks.length).toBe(complexState.blocks.length);
        expect(restored?.variables).toEqual(complexState.variables);
        
        // Verify nested structures
        complexState.blocks.forEach((block, index) => {
          expect(restored?.blocks[index]).toEqual(block);
          expect(restored?.blocks[index].connections).toEqual(block.connections);
        });
      }
    });

    it('should handle concurrent state operations safely', async () => {
      const iterations = 20;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            const state: ExecutionState = {
              id: `concurrent-${i}`,
              status: 'running',
              currentBlockId: `block-${i}`,
              completedBlocks: [],
              progress: Math.random(),
              startTime: Date.now(),
              variables: { [`concurrent${i}`]: `value${i}` },
              errors: []
            };
            
            stateManager.saveExecutionState(state);
            localStorageMock.getItem.mockReturnValue(JSON.stringify(state));
            
            const retrieved = stateManager.getExecutionState(state.id);
            expect(retrieved).toEqual(state);
            resolve();
          }, Math.random() * 10);
        });
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
    });
  });

  describe('Recovery Operations', () => {
    it('should recover interrupted executions', () => {
      const interruptedState: ExecutionState = {
        id: 'interrupted-1',
        status: 'running',
        currentBlockId: 'block-2',
        completedBlocks: ['block-1'],
        progress: 0.5,
        startTime: Date.now() - 5000,
        variables: { var1: 'value1' },
        errors: []
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(interruptedState));
      
      const recovered = stateManager.recoverInterruptedExecution('interrupted-1');
      expect(recovered).toEqual(interruptedState);
      expect(recovered?.status).toBe('running');
      expect(recovered?.currentBlockId).toBe('block-2');
    });

    it('should list all recoverable states', () => {
      const mockKeys = [
        'automation_execution_exec-1',
        'automation_execution_exec-2',
        'automation_workflow_workflow-1',
        'other_key'
      ];

      Object.defineProperty(localStorageMock, 'length', { value: mockKeys.length });
      localStorageMock.key = vi.fn().mockImplementation((index) => mockKeys[index]);

      const recoverableStates = stateManager.getRecoverableStates();
      
      expect(recoverableStates.executions).toContain('exec-1');
      expect(recoverableStates.executions).toContain('exec-2');
      expect(recoverableStates.workflows).toContain('workflow-1');
      expect(recoverableStates.executions).not.toContain('other_key');
    });

    it('should clear expired states', () => {
      const expiredTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const expiredState: ExecutionState = {
        id: 'expired-1',
        status: 'running',
        currentBlockId: 'block-1',
        completedBlocks: [],
        progress: 0.1,
        startTime: expiredTime,
        variables: {},
        errors: []
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredState));
      
      stateManager.clearExpiredStates();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('automation_execution_expired-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const state: ExecutionState = {
        id: 'test-1',
        status: 'running',
        currentBlockId: 'block-1',
        completedBlocks: [],
        progress: 0,
        startTime: Date.now(),
        variables: {},
        errors: []
      };

      // Should not throw
      expect(() => stateManager.saveExecutionState(state)).not.toThrow();
    });

    it('should return null for non-existent states', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = stateManager.getExecutionState('non-existent');
      expect(result).toBeNull();
    });
  });
});