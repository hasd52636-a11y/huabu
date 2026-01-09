import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MinimizedProgressWindow from './MinimizedProgressWindow';

describe('MinimizedProgressWindow', () => {
  const defaultProps = {
    isVisible: true,
    progress: {
      total: 10,
      completed: 3,
      failed: 1,
      pending: 6
    },
    isProcessing: true,
    onClick: vi.fn(),
    theme: 'light' as const,
    lang: 'zh' as const
  };

  it('should not render when isVisible is false', () => {
    render(<MinimizedProgressWindow {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render progress information correctly', () => {
    render(<MinimizedProgressWindow {...defaultProps} />);
    
    // Check progress text
    expect(screen.getByText('3/10')).toBeInTheDocument();
    
    // Check completion percentage
    expect(screen.getByText('30%')).toBeInTheDocument();
    
    // Check status text in Chinese
    expect(screen.getByText('生成中...')).toBeInTheDocument();
  });

  it('should render in English when lang is en', () => {
    render(<MinimizedProgressWindow {...defaultProps} lang="en" />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should show completed status when not processing', () => {
    render(<MinimizedProgressWindow {...defaultProps} isProcessing={false} />);
    
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('should show completed status in English', () => {
    render(<MinimizedProgressWindow {...defaultProps} isProcessing={false} lang="en" />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<MinimizedProgressWindow {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Enter key is pressed', () => {
    const mockOnClick = vi.fn();
    render(<MinimizedProgressWindow {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Space key is pressed', () => {
    const mockOnClick = vi.fn();
    render(<MinimizedProgressWindow {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick for other keys', () => {
    const mockOnClick = vi.fn();
    render(<MinimizedProgressWindow {...defaultProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Escape' });
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should apply dark theme styles correctly', () => {
    render(<MinimizedProgressWindow {...defaultProps} theme="dark" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-800', 'border-gray-600', 'text-white');
  });

  it('should apply light theme styles correctly', () => {
    render(<MinimizedProgressWindow {...defaultProps} theme="light" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white', 'border-gray-300', 'text-gray-900');
  });

  it('should show pulsing animation when processing', () => {
    render(<MinimizedProgressWindow {...defaultProps} isProcessing={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('animate-pulse');
  });

  it('should not show pulsing animation when not processing', () => {
    render(<MinimizedProgressWindow {...defaultProps} isProcessing={false} />);
    
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('animate-pulse');
  });

  it('should calculate completion percentage correctly', () => {
    const props = {
      ...defaultProps,
      progress: {
        total: 8,
        completed: 6,
        failed: 1,
        pending: 1
      }
    };
    
    render(<MinimizedProgressWindow {...props} />);
    
    // 6/8 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should handle zero total correctly', () => {
    const props = {
      ...defaultProps,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0
      }
    };
    
    render(<MinimizedProgressWindow {...props} />);
    
    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<MinimizedProgressWindow {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
    expect(button).toHaveAttribute('aria-label', '点击展开批量视频生成进度');
  });

  it('should have proper accessibility attributes in English', () => {
    render(<MinimizedProgressWindow {...defaultProps} lang="en" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Click to expand batch video progress');
  });
});