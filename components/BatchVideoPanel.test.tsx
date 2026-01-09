import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BatchVideoPanel from './BatchVideoPanel';
import { Block, BatchConfig, BatchGenerationState } from '../types';

// Mock blocks for testing
const mockBlocks: Block[] = [
  {
    id: '1',
    type: 'text',
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    content: 'Test content 1',
    status: 'idle',
    number: 'A01'
  },
  {
    id: '2',
    type: 'text',
    x: 200,
    y: 200,
    width: 300,
    height: 200,
    content: 'Test content 2',
    status: 'idle',
    number: 'A02'
  }
];

const mockBatchState: BatchGenerationState = {
  id: 'batch-1',
  items: [],
  total: 2,
  completed: 1,
  failed: 0,
  pending: 1,
  status: 'processing'
};

const defaultProps = {
  selectedBlocks: mockBlocks,
  onStartBatch: vi.fn(),
  onPauseBatch: vi.fn(),
  onResumeBatch: vi.fn(),
  onStopBatch: vi.fn(),
  theme: 'light' as const,
  lang: 'zh' as const
};

describe('BatchVideoPanel', () => {
  it('renders batch video panel with correct title', () => {
    render(<BatchVideoPanel {...defaultProps} />);
    expect(screen.getByText('批量视频')).toBeInTheDocument();
    expect(screen.getByText('2 已选择块')).toBeInTheDocument();
  });

  it('renders in English when lang is en', () => {
    render(<BatchVideoPanel {...defaultProps} lang="en" />);
    expect(screen.getByText('Batch Video')).toBeInTheDocument();
    expect(screen.getByText('2 Selected Blocks')).toBeInTheDocument();
  });

  it('expands and shows configuration when clicked', () => {
    render(<BatchVideoPanel {...defaultProps} />);
    
    // Initially collapsed
    expect(screen.queryByText('视频时长')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('批量视频'));
    
    // Should show configuration options
    expect(screen.getByText('视频时长')).toBeInTheDocument();
    expect(screen.getByText('宽高比')).toBeInTheDocument();
    expect(screen.getByText('处理间隔')).toBeInTheDocument();
    expect(screen.getByText('最大重试')).toBeInTheDocument();
  });

  it('calls onStartBatch with correct config when start button is clicked', async () => {
    const onStartBatch = vi.fn();
    render(<BatchVideoPanel {...defaultProps} onStartBatch={onStartBatch} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Click start batch button
    fireEvent.click(screen.getByText('开始批量处理'));
    
    await waitFor(() => {
      expect(onStartBatch).toHaveBeenCalledWith({
        videoDuration: 10,
        processingInterval: 3000,
        aspectRatio: '16:9',
        maxRetries: 3,
        retryDelay: 5000,
        enableNotifications: true
      });
    });
  });

  it('shows progress when batch state is provided', () => {
    render(<BatchVideoPanel {...defaultProps} batchState={mockBatchState} />);
    
    // Should show progress indicator
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('shows pause button when batch is processing', () => {
    render(<BatchVideoPanel {...defaultProps} batchState={mockBatchState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Should show pause button instead of start
    expect(screen.getByText('暂停处理')).toBeInTheDocument();
    expect(screen.queryByText('开始批量处理')).not.toBeInTheDocument();
  });

  it('shows resume button when batch is paused', () => {
    const pausedState = { ...mockBatchState, status: 'paused' as const };
    render(<BatchVideoPanel {...defaultProps} batchState={pausedState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Should show resume button
    expect(screen.getByText('恢复处理')).toBeInTheDocument();
  });

  it('calls pause handler when pause button is clicked', () => {
    const onPauseBatch = vi.fn();
    render(<BatchVideoPanel {...defaultProps} onPauseBatch={onPauseBatch} batchState={mockBatchState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Click pause button
    fireEvent.click(screen.getByText('暂停处理'));
    
    expect(onPauseBatch).toHaveBeenCalled();
  });

  it('calls stop handler when stop button is clicked', () => {
    const onStopBatch = vi.fn();
    render(<BatchVideoPanel {...defaultProps} onStopBatch={onStopBatch} batchState={mockBatchState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Click stop button
    fireEvent.click(screen.getByText('停止处理'));
    
    expect(onStopBatch).toHaveBeenCalled();
  });

  it('updates configuration when form inputs change', () => {
    render(<BatchVideoPanel {...defaultProps} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Find select elements by their position in the DOM
    const selects = screen.getAllByRole('combobox');
    const durationSelect = selects[0]; // First select is duration
    const aspectRatioSelect = selects[1]; // Second select is aspect ratio
    
    // Change duration
    fireEvent.change(durationSelect, { target: { value: '15' } });
    expect(durationSelect).toHaveValue('15');
    
    // Change aspect ratio
    fireEvent.change(aspectRatioSelect, { target: { value: '9:16' } });
    expect(aspectRatioSelect).toHaveValue('9:16');
  });

  it('toggles notifications when switch is clicked', () => {
    render(<BatchVideoPanel {...defaultProps} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Find and click the notifications toggle
    const notificationsToggle = screen.getByText('通知').parentElement?.querySelector('button');
    expect(notificationsToggle).toBeInTheDocument();
    
    if (notificationsToggle) {
      fireEvent.click(notificationsToggle);
      // The toggle state should change (visual feedback)
    }
  });

  it('disables start button when no blocks are selected', () => {
    render(<BatchVideoPanel {...defaultProps} selectedBlocks={[]} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Start button should be disabled
    const startButton = screen.getByText('开始批量处理');
    expect(startButton).toBeDisabled();
  });

  it('shows progress bar with correct percentage', () => {
    render(<BatchVideoPanel {...defaultProps} batchState={mockBatchState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Should show 50% progress (1 completed out of 2 total)
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows status counts correctly', () => {
    render(<BatchVideoPanel {...defaultProps} batchState={mockBatchState} />);
    
    // Expand panel
    fireEvent.click(screen.getByText('批量视频'));
    
    // Should show status counts
    expect(screen.getByText('1 已完成')).toBeInTheDocument();
    expect(screen.getByText('0 失败')).toBeInTheDocument();
    expect(screen.getByText('1 等待中')).toBeInTheDocument();
  });
});