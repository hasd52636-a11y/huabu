# Implementation Plan: Coordinate Synchronization Fix

## Overview

This implementation plan fixes the coordinate synchronization issue between the main Canvas component and ShareKitViewerPage component by standardizing the coordinate system implementation, eliminating container padding offsets, and ensuring consistent transform applications.

## Tasks

- [x] 1. Fix container structure and padding in ShareKitViewerPage
  - Remove `pt-16` padding from canvas area
  - Separate header positioning from canvas coordinate system
  - Ensure canvas container starts at top edge without offsets
  - _Requirements: 3.1, 3.2_

- [ ] 2. Implement consistent container transforms
  - [x] 2.1 Apply identical container transform pattern as Main_Canvas
    - Use `transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom})` format
    - Set `transformOrigin: '0 0'` for container
    - Apply transforms without modification to received pan/zoom values
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ] 2.2 Write property test for container transform consistency
    - **Property 1: Container Transform Consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 3. Fix block positioning and centering
  - [x] 3.1 Implement consistent block positioning logic
    - Apply `transform: translate(-50%, -50%)` to all blocks
    - Use `left: block.x, top: block.y` positioning (not pixel strings)
    - Maintain identical block positioning logic as Main_Canvas
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 3.2 Write property test for block positioning consistency
    - **Property 2: Block Positioning Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 4. Ensure transform hierarchy consistency
  - [x] 4.1 Implement correct transform application order
    - Apply container transforms before block transforms
    - Use same CSS transform hierarchy as Main_Canvas
    - Maintain transform composition order
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [ ] 4.2 Write property test for transform hierarchy consistency
    - **Property 5: Transform Hierarchy Consistency**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 5. Checkpoint - Test coordinate system fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement coordinate validation and error handling
  - [x] 6.1 Add coordinate validation functions
    - Validate pan and zoom values are numbers
    - Ensure block coordinates are finite numbers
    - Handle missing or invalid transform data gracefully
    - _Requirements: Error Handling_
  
  - [x] 6.2 Write unit tests for coordinate validation
    - Test error handling with invalid coordinates
    - Test fallback behavior with missing data
    - Test CSS transform string generation edge cases

- [ ] 7. Add comprehensive integration tests
  - [ ] 7.1 Write property test for visual coordinate consistency
    - **Property 3: Visual Coordinate Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [ ] 7.2 Write property test for container isolation
    - **Property 4: Container Isolation**
    - **Validates: Requirements 3.3, 3.4**
  
  - [x] 7.3 Write unit tests for padding removal
    - Test that canvas container has no top padding
    - Test that header bar is positioned separately
    - _Requirements: 3.1, 3.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on ShareKitViewerPage.tsx as the primary file to modify