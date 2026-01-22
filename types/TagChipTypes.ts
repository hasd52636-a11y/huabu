/**
 * Enhanced Tag Chip System Types
 * Provides comprehensive type definitions for the tag chip enhancement system
 */

import React from 'react';

// Core tag data structure
export interface TagData {
  id: string;
  label: string; // Display text like "A01"
  blockType: BlockType; // A, B, V, etc.
  content?: string; // Associated content for preview
  metadata?: {
    description?: string;
    category?: string;
    lastModified?: Date;
    author?: string;
  };
}

// Block type enumeration
export enum BlockType {
  A = 'A', // Blue theme - Text blocks
  B = 'B', // Emerald theme - Image blocks  
  V = 'V', // Red theme - Video blocks
}

// Visual configuration interfaces
export interface VisualConfig {
  colorScheme: ColorScheme;
  borderRadius: number;
  padding: Padding;
  typography: Typography;
  animations: AnimationConfig;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  text: string;
  border: string;
  background: string;
  hover: string;
  focus: string;
  gradient?: GradientConfig;
}

export interface GradientConfig {
  from: string;
  to: string;
  direction: 'horizontal' | 'vertical' | 'diagonal';
}

export interface Padding {
  x: number;
  y: number;
}

export interface Typography {
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: number;
  letterSpacing?: string;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  hoverScale: number;
  focusScale: number;
}

// Cursor management interfaces
export interface SelectionContext {
  startOffset: number;
  endOffset: number;
  selectedText: string;
  containerElement: HTMLElement;
  isCollapsed: boolean;
}

// Hover preview interfaces
export interface HoverPreviewConfig {
  showDelay: number; // 200ms
  hideDelay: number; // 100ms
  maxWidth: number;
  positioning: PositioningStrategy;
  content: ContentRenderer;
}

export interface PositioningStrategy {
  primary: Position; // 'top' | 'bottom' | 'left' | 'right'
  fallback: Position[];
  offset: number;
  boundaryElement?: HTMLElement;
}

export type Position = 'top' | 'bottom' | 'left' | 'right';

export interface ContentRenderer {
  renderTitle: (tag: TagData) => string;
  renderContent: (tag: TagData) => string;
  renderMetadata: (tag: TagData) => string;
}

// Layout management interfaces
export interface LayoutMetrics {
  containerWidth: number;
  containerHeight: number;
  lineHeight: number;
  characterWidth: number;
  tagSpacing: number;
  lineSpacing: number;
}

export interface LayoutResult {
  lines: LineData[];
  tagPositions: TagPosition[];
  totalHeight: number;
  metrics: LayoutMetrics;
}

export interface LineData {
  index: number;
  content: string;
  tags: TagInLine[];
  width: number;
  height: number;
  yOffset: number;
}

export interface TagInLine {
  tagId: string;
  startIndex: number;
  endIndex: number;
  xOffset: number;
}

export interface TagPosition {
  tagId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
}

// Enhanced TaggedInput props
export interface EnhancedTaggedInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  lang?: 'zh' | 'en';
  tags?: TagData[];
  onTagInsert?: (tag: TagData, position: number) => void;
  multiline?: boolean;
  previewConfig?: HoverPreviewConfig;
  visualConfig?: VisualConfig;
  onTagHover?: (tag: TagData | null) => void;
  onTagClick?: (tag: TagData) => void;
}

export interface EnhancedTaggedInputState {
  cursorPosition: number;
  selectedRange: Range | null;
  hoveredTag: string | null;
  layoutMetrics: LayoutMetrics;
}