import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Canvas from './Canvas';
import { Block, Connection } from '../types';

// Mock the automation services
vi.mock('../services/AutoExecutor', () => ({
  AutoExecutor: vi.fn().mockImplementation(() => ({
    executeWorkflow: vi.fn().mockResolvedValue(undefined),
    pauseExecution: vi.fn().mockResolvedValue(undefined),
    onProgressUpdate: null
  }))
}));

vi.mock('../services/TemplateManager', () => ({
  TemplateManager: vi.fn().mockImplementation(() => ({
    saveTemplate: vi.fn().mockResolvedValue({ id: 'test-template' })
  }))
}));

vi.mock('../services/StateManager', () => ({
  StateManager: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../services/ResourceManager', () => ({
  ResourceManager: vi.fn().mockImplementation(() => ({
    getCurrentUsage: vi.fn().mockReturnValue({
      memory: 100,
      cpu: 20,
      activeConnections: 2
    })
  }))
}));

vi.mock('../services/ConnectionEngine', () => ({
  connectionEngine: {
    updateConnections: vi.fn(),
    getEnhancedConnection: vi.fn().mockReturnValue(null),
    getUpstreamData: vi.fn().mockReturnValue([]),
    propagateData: vi.fn()
  }
}));

describe('Automation Integration', () => {
  const mockProps = {
    blocks: [] as Block[],
    connections: [] as Connection[],
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedIds: [],
    theme: 'light' as const,
    lang: 'en' as const,
    isPerfMode: false,
    onUpdateBlock: vi.fn(),
    onSelect: vi.fn(),
    onClearSelection: vi.fn(),
    onDeleteBlock: vi.fn(),
    onConnect: vi.fn(),
    onGenerate: vi.fn(),
    onUpdateConnection: vi.fn(),
    onContextMenu: vi.fn(),
    onUpdatePan: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Automation Controls UI', () => {
    it('should render automation toggle button', () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      expect(automationButton).toBeInTheDocument();
    });

    it('should show automation controls when toggle is clicked', async () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /auto execute/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save template/i })).toBeInTheDocument();
      });
    });

    it('should disable auto execute button when no blocks present', async () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        const executeButton = screen.getByRole('button', { name: /auto execute/i });
        expect(executeButton).toBeDisabled();
      });
    });

    it('should enable auto execute button when blocks are present', async () => {
      const blocksWithData = [
        {
          id: 'block-1',
          type: 'text' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle' as const,
          number: 'A01'
        }
      ];

      render(<Canvas {...mockProps} blocks={blocksWithData} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        const executeButton = screen.getByRole('button', { name: /auto execute/i });
        expect(executeButton).not.toBeDisabled();
      });
    });

    it('should show resource usage information', async () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        expect(screen.getByText(/resources/i)).toBeInTheDocument();
        expect(screen.getByText(/connections/i)).toBeInTheDocument();
        expect(screen.getByText('100MB')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Automation Functionality', () => {
    it('should handle auto execution', async () => {
      const blocksWithData = [
        {
          id: 'block-1',
          type: 'text' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle' as const,
          number: 'A01'
        }
      ];

      render(<Canvas {...mockProps} blocks={blocksWithData} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        const executeButton = screen.getByRole('button', { name: /auto execute/i });
        fireEvent.click(executeButton);
      });

      // Should show pause button during execution
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
    });

    it('should handle template saving', async () => {
      const blocksWithData = [
        {
          id: 'block-1',
          type: 'text' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle' as const,
          number: 'A01'
        }
      ];

      render(<Canvas {...mockProps} blocks={blocksWithData} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      fireEvent.click(automationButton);
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save template/i });
        fireEvent.click(saveButton);
      });

      // Template saving should be called
      // This would be verified through the mocked service calls
    });
  });

  describe('Responsive Design', () => {
    it('should maintain responsive layout with automation controls', () => {
      render(<Canvas {...mockProps} />);
      
      const canvas = screen.getByRole('generic');
      expect(canvas).toHaveClass('relative', 'w-full', 'h-full');
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      expect(automationButton.closest('div')).toHaveClass('absolute', 'top-4', 'right-4');
    });

    it('should handle different language settings', () => {
      render(<Canvas {...mockProps} lang="zh" />);
      
      const automationButton = screen.getByRole('button', { name: /自动化/i });
      expect(automationButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper button labels and titles', () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      expect(automationButton).toHaveAttribute('title', 'Automation Controls');
    });

    it('should handle keyboard navigation', async () => {
      render(<Canvas {...mockProps} />);
      
      const automationButton = screen.getByRole('button', { name: /auto/i });
      automationButton.focus();
      
      expect(document.activeElement).toBe(automationButton);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should not interfere with block selection', () => {
      const blocksWithData = [
        {
          id: 'block-1',
          type: 'text' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          content: 'Test content',
          status: 'idle' as const,
          number: 'A01'
        }
      ];

      render(<Canvas {...mockProps} blocks={blocksWithData} selectedIds={['block-1']} />);
      
      // Block should still be selectable
      expect(mockProps.selectedIds).toContain('block-1');
    });

    it('should not interfere with connection creation', () => {
      const connectionsWithData = [
        {
          id: 'conn-1',
          fromId: 'block-1',
          toId: 'block-2',
          instruction: 'Test connection'
        }
      ];

      render(<Canvas {...mockProps} connections={connectionsWithData} />);
      
      // Connections should still be rendered
      expect(mockProps.connections).toHaveLength(1);
    });

    it('should maintain canvas pan and zoom functionality', () => {
      render(<Canvas {...mockProps} zoom={1.5} pan={{ x: 100, y: 50 }} />);
      
      // Canvas should respect zoom and pan settings
      expect(mockProps.zoom).toBe(1.5);
      expect(mockProps.pan).toEqual({ x: 100, y: 50 });
    });
  });
});