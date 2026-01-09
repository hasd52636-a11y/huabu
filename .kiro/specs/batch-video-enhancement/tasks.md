# Implementation Plan: Batch Video Enhancement

## Overview

This implementation plan converts the batch video enhancement design into discrete coding tasks. Each task builds incrementally toward the complete functionality while maintaining backward compatibility with existing systems.

## Tasks

- [x] 1. Enhance BatchVideoModal with TXT file upload support
  - Add file input component with drag-and-drop support
  - Implement dual input mode switching (blocks vs file)
  - Add file validation and error handling UI
  - Update modal layout to accommodate new features
  - **Add reference image display**: Show selected blocks' images as reference frames
  - **Implement `******` separator parsing**: Parse uploaded TXT files using `******` as primary delimiter
  - **Add default global video prompt**: Include the default global instruction from reference project
  - _Requirements: 1.1, 1.4, 1.5_

- [ ]* 1.1 Write property test for file upload validation
  - **Property 1: File Parsing Consistency**
  - **Validates: Requirements 1.2, 1.3**

- [x] 2. Create TxtFileParser service
  - Implement file parsing logic with `******` separator support (primary method)
  - Add fallback to line-based parsing when no separators found
  - Create prompt validation and sanitization
  - Handle various file encodings and formats
  - Support batch size limits (max 50 prompts as per reference)
  - _Requirements: 1.2, 1.3_

- [ ]* 2.1 Write property test for parsing consistency
  - **Property 1: File Parsing Consistency**
  - **Validates: Requirements 1.2, 1.3**

- [ ]* 2.2 Write unit tests for edge cases
  - Test empty files, invalid formats, large files
  - Test various separator patterns and encodings
  - _Requirements: 1.5, 7.1_

- [x] 3. Update BatchConfig and types for video orientation
  - Replace aspectRatio with videoOrientation field
  - Add landscape/portrait orientation mapping
  - Update existing type definitions
  - Ensure backward compatibility with existing configs
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 3.1 Write property test for orientation mapping
  - **Property 4: Video Orientation Mapping**
  - **Validates: Requirements 2.2, 2.3**

- [x] 4. Create MinimizedProgressWindow component
  - Design floating window UI with fixed positioning
  - Implement pulsing animation for active state
  - Add click handler for restoration
  - Style for both light and dark themes
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 4.1 Write property test for minimization state consistency
  - **Property 6: Minimization State Consistency**
  - **Validates: Requirements 3.2, 3.6**

- [x] 5. Enhance BatchProcessor with minimization support
  - Add minimize/restore state management
  - Implement progress state tracking
  - Update processing logic for new input modes
  - Add configuration persistence
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2_

- [ ]* 5.1 Write property test for progress state integrity
  - **Property 2: Progress State Integrity**
  - **Validates: Requirements 4.2, 4.3**

- [ ]* 5.2 Write property test for configuration persistence
  - **Property 3: Configuration Persistence Round-trip**
  - **Validates: Requirements 6.1, 6.2**

- [x] 6. Create DownloadManager service
  - Implement automatic video download functionality
  - Add configurable download directory support
  - Create retry logic with exponential backoff
  - Add download progress tracking
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 6.1 Write property test for download path validation
  - **Property 5: Download Path Validation**
  - **Validates: Requirements 5.2, 5.3**

- [ ]* 6.2 Write unit tests for download error scenarios
  - Test network failures, permission errors, disk space issues
  - Test retry logic and exponential backoff
  - _Requirements: 5.4, 7.2, 7.3_

- [x] 7. Enhance error handling and retry mechanisms
  - Implement detailed error messages and logging
  - Add automatic retry with exponential backoff
  - Create manual retry functionality for failed items
  - Update UI to display error states clearly
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 7.1 Write property test for error recovery completeness
  - **Property 7: Error Recovery Completeness**
  - **Validates: Requirements 7.2, 7.3**

- [x] 8. Integrate file-based and block-based processing
  - Update BatchProcessor to handle both input sources uniformly
  - Ensure consistent VideoItem creation from different sources
  - Add seamless switching between input modes
  - Maintain existing block-based functionality
  - **Add reference image support**: When blocks are selected, use first block's image as reference_image
  - **Implement selectedFrames integration**: Pass selected blocks as reference frames for video generation
  - **Apply default global video prompt**: Prepend the global instruction to all video prompts
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 8.1 Write property test for input source uniformity
  - **Property 8: Input Source Uniformity**
  - **Validates: Requirements 8.4, 8.5**

- [x] 9. Update App.tsx integration
  - Add state management for minimized progress window
  - Integrate new BatchVideoModal props and handlers
  - Add MinimizedProgressWindow to main app layout
  - Ensure proper cleanup and state management
  - _Requirements: 3.1, 3.6, 6.3_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Add comprehensive error handling UI
  - Create error display components for various failure scenarios
  - Add user-friendly error messages with actionable guidance
  - Implement error recovery UI (retry buttons, etc.)
  - Add validation feedback for file uploads and configuration
  - _Requirements: 7.1, 7.4, 7.5_

- [ ]* 11.1 Write integration tests for error scenarios
  - Test complete error handling workflows
  - Test user interaction with error recovery features
  - _Requirements: 7.4, 7.5_

- [x] 12. Implement configuration persistence and migration
  - Add localStorage save/load for BatchConfig
  - Implement configuration migration for legacy settings
  - Add default value handling for new configuration options
  - Ensure graceful handling of corrupted or invalid configs
  - Added export/import functionality for configuration backup/sharing
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 13. Final integration and testing
  - Perform end-to-end testing of complete workflow
  - Test backward compatibility with existing functionality
  - Verify performance with large batch sizes
  - Test UI responsiveness and accessibility
  - All diagnostics resolved and 240 tests passing
  - _Requirements: All requirements validation_

- [x] 14. Final checkpoint - Ensure all tests pass
  - All 240 tests passing successfully
  - No diagnostic errors in core components
  - Configuration persistence working correctly
  - Error handling and validation functioning properly
  - Complete batch video enhancement functionality implemented

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure end-to-end functionality
- Checkpoints ensure incremental validation and user feedback