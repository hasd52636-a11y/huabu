# Design Document: Coordinate Synchronization Fix

## Overview

This design addresses the coordinate synchronization issue between the main Canvas component and the ShareKitViewerPage component. The problem stems from inconsistent transform applications and container padding that causes modules to appear at incorrect positions in the shared view.

The solution involves standardizing the coordinate system implementation across both components by:
1. Applying identical container transforms
2. Using consistent block positioning and centering
3. Eliminating container padding offsets
4. Maintaining transform application order

## Architecture

### Current Architecture Issues

**Main Canvas (Canvas.tsx):**
```typescript
// Container transform
<div style={{
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  transformOrigin: '0 0'
}}>
  // Blocks with centering transform
  <BlockComponent style={{
    left: block.x,
    top: block.y,
    transform: 'translate(-50%, -50%)'
  }} />
</div>
```

**Shared Viewer (ShareKitViewerPage.tsx) - PROBLEMATIC:**
```typescript
// Container with extra padding
<div className="pt-16"> // 64px offset!
  <div style={{
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
  }}>
    // Blocks WITHOUT centering transform
    <div style={{
      left: `${block.x}px`,
      top: `${block.y}px`
      // Missing: transform: 'translate(-50%, -50%)'
    }} />
  </div>
</div>
```

### Target Architecture

Both components will use identical coordinate system implementation:

```typescript
// Standardized container structure
<div className="canvas-container">
  <div className="canvas-transform-container" style={{
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0'
  }}>
    // Standardized block positioning
    <div className="block" style={{
      left: block.x,
      top: block.y,
      transform: 'translate(-50%, -50%)'
    }} />
  </div>
</div>
```

## Components and Interfaces

### ShareKitViewerPage Component Modifications

**Container Structure Changes:**
- Remove `pt-16` padding from canvas area
- Separate header positioning from canvas coordinate system
- Apply identical transform hierarchy as main Canvas

**Block Rendering Changes:**
- Add `transform: translate(-50%, -50%)` to all blocks
- Use `left: block.x, top: block.y` positioning (not pixel strings)
- Maintain consistent CSS class structure

### Coordinate System Interface

```typescript
interface CoordinateSystem {
  // Container transform properties
  containerTransform: {
    translateX: number;
    translateY: number;
    scale: number;
    transformOrigin: string;
  };
  
  // Block positioning properties
  blockPositioning: {
    left: number;
    top: number;
    centeringTransform: string;
  };
}
```

## Data Models

### Canvas Data Structure

The existing canvas data structure remains unchanged:

```typescript
interface CanvasData {
  blocks: Block[];
  connections: Connection[];
  pan: { x: number; y: number };
  zoom: number;
}

interface Block {
  id: string;
  x: number;        // Center X coordinate
  y: number;        // Center Y coordinate
  width: number;
  height: number;
  type: 'text' | 'image' | 'video';
  content: string;
  // ... other properties
}
```

### Transform Configuration

```typescript
interface TransformConfig {
  // Container-level transforms
  container: {
    translate: { x: number; y: number };
    scale: number;
    origin: string;
  };
  
  // Block-level transforms
  block: {
    centering: string; // 'translate(-50%, -50%)'
    positioning: 'absolute';
  };
}
```

## Error Handling

### Coordinate Validation

- Validate that pan and zoom values are numbers
- Ensure block coordinates are finite numbers
- Handle missing or invalid transform data gracefully

### Fallback Behavior

- If transform data is missing, use default values (pan: {x: 0, y: 0}, zoom: 1)
- If block coordinates are invalid, position at origin with error indicator
- Maintain visual consistency even with partial data

### Error Recovery

```typescript
const safeTransform = (pan: any, zoom: any) => {
  const safePan = { 
    x: typeof pan?.x === 'number' ? pan.x : 0,
    y: typeof pan?.y === 'number' ? pan.y : 0
  };
  const safeZoom = typeof zoom === 'number' && zoom > 0 ? zoom : 1;
  
  return `translate(${safePan.x}px, ${safePan.y}px) scale(${safeZoom})`;
};
```

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific coordinate calculations and property-based tests for universal coordinate system properties.

**Unit Tests:**
- Test specific coordinate transformation calculations
- Verify container padding removal
- Test error handling with invalid coordinates
- Validate CSS transform string generation

**Property-Based Tests:**
- Test coordinate consistency across all possible pan/zoom combinations
- Verify block centering behavior for all block positions
- Test transform composition properties
- Validate visual consistency properties

**Property-Based Testing Configuration:**
- Use fast-check library for TypeScript property-based testing
- Configure each test to run minimum 100 iterations
- Tag each test with feature and property references
- Each correctness property implemented by a single property-based test

**Test Tags Format:**
- **Feature: coordinate-sync-fix, Property 1: [property description]**
- **Feature: coordinate-sync-fix, Property 2: [property description]**

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Container Transform Consistency
*For any* valid pan and zoom values, both Main_Canvas and Shared_Viewer should generate identical container transform strings with the same transformOrigin
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Block Positioning Consistency  
*For any* block with valid coordinates, the Shared_Viewer should position it using `left: block.x, top: block.y` with `transform: translate(-50%, -50%)` exactly as Main_Canvas does
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Visual Coordinate Consistency
*For any* canvas data with blocks and pan/zoom values, all modules should appear at identical relative positions in both Main_Canvas and Shared_Viewer
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 4: Container Isolation
*For any* canvas rendering, the Shared_Viewer should not apply additional padding compensation to module coordinates and should maintain header separation from canvas coordinate system
**Validates: Requirements 3.3, 3.4**

### Property 5: Transform Hierarchy Consistency
*For any* canvas rendering, the Shared_Viewer should apply container transforms before block transforms using the same CSS hierarchy and transform order as Main_Canvas
**Validates: Requirements 5.2, 5.3, 5.4**