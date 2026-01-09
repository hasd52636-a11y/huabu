import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExportLayoutSelector from './ExportLayoutSelector';
import { Block, ExportLayout } from '../types';

// Mock blocks for testing
const mockBlocks: Block[] = [
  {
    id: '1',
    type: 'image',
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    content: 'data:image/png;base64,test1',
    status: 'idle',
    number: 'B01'
  },
  {
    id: '2',
    type: 'image',
    x: 200,
    y: 200,
    width: 300,
    height: 200,
    content: 'data:image/png;base64,test2',
    status: 'idle',
    number: 'B02'
  },
  {
    id: '3',
    type: 'text',
    x: 300,
    y: 300,
    width: 300,
    height: 200,
    content: 'Test text content',
    status: 'idle',
    number: 'A01'
  }
];

const defaultProps = {
  blocks: mockBlocks,
  onExport: vi.fn(),
  onClose: vi.fn(),
  theme: 'light' as const,
  lang: 'zh' as const
};

describe('ExportLayoutSelector', () => {
  it('renders export modal with correct title', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    expect(screen.getByText('导出分镜')).toBeInTheDocument();
    expect(screen.getByText('3 个块已选择')).toBeInTheDocument();
  });

  it('renders in English when lang is en', () => {
    render(<ExportLayoutSelector {...defaultProps} lang="en" />);
    // Check for header title specifically
    expect(screen.getByRole('heading', { name: /export storyboard/i })).toBeInTheDocument();
    expect(screen.getByText('3 blocks selected')).toBeInTheDocument();
  });

  it('shows all layout options', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    
    // Should show all layout options in the grid
    const layoutGrid = screen.getByText('选择布局').nextElementSibling;
    expect(layoutGrid).toBeInTheDocument();
    
    // Check for layout options by their buttons
    expect(screen.getAllByText('2×2 网格')).toHaveLength(2); // One in grid, one in preview
    expect(screen.getAllByText('2×3 网格')).toHaveLength(1);
    expect(screen.getAllByText('3×3 网格')).toHaveLength(1);
    expect(screen.getAllByText('4×3 网格')).toHaveLength(1);
    expect(screen.getAllByText('主图+2×2')).toHaveLength(1);
    expect(screen.getAllByText('主图+2×3')).toHaveLength(1);
    expect(screen.getAllByText('主图+3×3')).toHaveLength(1);
    expect(screen.getAllByText('主图+4×3')).toHaveLength(1);
  });

  it('selects layout when clicked', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    
    // Click on 3x3 layout button (first occurrence in the grid)
    const layout3x3Buttons = screen.getAllByText('3×3 网格');
    fireEvent.click(layout3x3Buttons[0]);
    
    // Should show selected state (check mark) - find the button that contains the text
    const layout3x3Button = layout3x3Buttons[0].closest('button');
    expect(layout3x3Button).toHaveClass('border-amber-500');
  });

  it('calls onExport with selected layout when export button is clicked', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(<ExportLayoutSelector {...defaultProps} onExport={onExport} />);
    
    // Select 2x3 layout (first occurrence in the grid)
    const layout2x3Buttons = screen.getAllByText('2×3 网格');
    fireEvent.click(layout2x3Buttons[0]);
    
    // Click export button
    fireEvent.click(screen.getByText('导出分镜图'));
    
    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith('2x3');
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ExportLayoutSelector {...defaultProps} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<ExportLayoutSelector {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state during export', async () => {
    const onExport = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ExportLayoutSelector {...defaultProps} onExport={onExport} />);
    
    // Click export button
    fireEvent.click(screen.getByText('导出分镜图'));
    
    // Should show loading state
    expect(screen.getByText('导出中...')).toBeInTheDocument();
    
    // Export button should be disabled
    expect(screen.getByText('导出中...')).toBeDisabled();
    
    await waitFor(() => {
      expect(onExport).toHaveBeenCalled();
    });
  });

  it('disables export button when no blocks are provided', () => {
    render(<ExportLayoutSelector {...defaultProps} blocks={[]} />);
    
    const exportButton = screen.getByText('导出分镜图');
    expect(exportButton).toBeDisabled();
  });

  it('shows correct block count with content', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    
    // All 3 blocks have content
    expect(screen.getByText('3 blocks with content ready for export')).toBeInTheDocument();
  });

  it('shows layout preview correctly', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    
    // Should show preview for default 2x2 layout (in preview section)
    const previewDescriptions = screen.getAllByText('标准2×2网格布局');
    expect(previewDescriptions.length).toBeGreaterThan(0);
    
    // Select main layout (first occurrence in the grid)
    const mainLayoutButtons = screen.getAllByText('主图+2×2');
    fireEvent.click(mainLayoutButtons[0]);
    
    // Should update preview description - check that it exists
    expect(screen.getAllByText('大主图配2×2小图').length).toBeGreaterThan(0);
  });

  it('handles export error gracefully', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('Export failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ExportLayoutSelector {...defaultProps} onExport={onExport} />);
    
    // Click export button
    fireEvent.click(screen.getByText('导出分镜图'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('shows different layout descriptions in English', () => {
    render(<ExportLayoutSelector {...defaultProps} lang="en" />);
    
    const previewDescriptions = screen.getAllByText('Standard 2×2 grid layout');
    expect(previewDescriptions.length).toBeGreaterThan(0);
    
    // Select different layout (first occurrence in the grid)
    const layout3x3Buttons = screen.getAllByText('3×3 Grid');
    fireEvent.click(layout3x3Buttons[0]);
    expect(screen.getAllByText('Dense 3×3 grid layout').length).toBeGreaterThan(0);
  });

  it('applies dark theme styles correctly', () => {
    render(<ExportLayoutSelector {...defaultProps} theme="dark" />);
    
    // Find the modal container by looking for the main modal div
    const modal = document.querySelector('.bg-slate-900');
    expect(modal).toBeInTheDocument();
  });

  it('shows correct layout preview for main layouts', () => {
    render(<ExportLayoutSelector {...defaultProps} />);
    
    // Select main layout (first occurrence in the grid)
    const mainLayoutButtons = screen.getAllByText('主图+3×3');
    fireEvent.click(mainLayoutButtons[0]);
    
    // Should show main layout preview (different structure) - check in preview section
    const previewTitles = screen.getAllByText('主图+3×3');
    expect(previewTitles.length).toBeGreaterThan(1); // Should appear in both grid and preview
  });
});