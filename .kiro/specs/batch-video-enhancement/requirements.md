# Requirements Document

## Introduction

This specification defines the enhancement of the existing batch video generation functionality to include TXT file upload, minimizable progress tracking, and automatic download capabilities. The implementation will extend the current BatchVideoModal component with advanced batch processing features based on the reference implementation from the backup files.

## Glossary

- **BatchVideoModal**: The modal component for batch video generation configuration
- **BatchProcessor**: Service class handling batch video processing logic
- **VideoItem**: Data structure representing a video generation task
- **MinimizedProgressWindow**: Floating window showing batch progress when minimized
- **TXT_File_Parser**: Component responsible for parsing uploaded TXT files
- **Download_Manager**: Service handling automatic video downloads
- **Progress_Tracker**: Component tracking and displaying batch generation progress

## Requirements

### Requirement 1: TXT File Upload Support

**User Story:** As a user, I want to upload TXT files containing video prompts for batch generation, so that I can efficiently generate multiple videos from prepared scripts.

#### Acceptance Criteria

1. WHEN a user opens the batch video modal, THE BatchVideoModal SHALL display a file upload option for TXT files
2. WHEN a user uploads a TXT file, THE TXT_File_Parser SHALL parse the content using line breaks or `******` separators
3. WHEN the file is parsed successfully, THE BatchVideoModal SHALL display the number of video prompts found
4. WHEN the file contains more than 50 prompts, THE BatchVideoModal SHALL show a warning and limit processing to 50 items
5. WHEN the file is empty or invalid, THE BatchVideoModal SHALL display an appropriate error message

### Requirement 2: Video Orientation Support

**User Story:** As a user, I want to choose between landscape and portrait video orientations for batch generation, so that I can create content suitable for different platforms and viewing preferences.

#### Acceptance Criteria

1. WHEN configuring batch video settings, THE BatchVideoModal SHALL provide landscape (横屏) and portrait (竖屏) orientation options
2. WHEN landscape orientation is selected, THE BatchProcessor SHALL generate videos in 16:9 aspect ratio
3. WHEN portrait orientation is selected, THE BatchProcessor SHALL generate videos in 9:16 aspect ratio
4. THE BatchVideoModal SHALL display the selected orientation clearly in the configuration interface

### Requirement 3: Minimizable Progress Window

**User Story:** As a user, I want to minimize the batch video generation progress to a small floating window, so that I can continue working while videos are being generated.

#### Acceptance Criteria

1. WHEN batch video generation starts, THE BatchVideoModal SHALL display a minimize button
2. WHEN the minimize button is clicked, THE BatchVideoModal SHALL hide and show a MinimizedProgressWindow
3. THE MinimizedProgressWindow SHALL appear in the top-right corner of the screen
4. THE MinimizedProgressWindow SHALL display current progress (e.g., "3/10") and completion percentage
5. WHEN progress is active, THE MinimizedProgressWindow SHALL show a pulsing animation
6. WHEN the MinimizedProgressWindow is clicked, THE BatchVideoModal SHALL restore to full view

### Requirement 4: Progress Tracking and Statistics

**User Story:** As a user, I want to see detailed progress statistics during batch generation, so that I can monitor the success rate and identify any issues.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL display total, completed, failed, and pending video counts
2. THE Progress_Tracker SHALL show a visual progress bar with completion percentage
3. THE Progress_Tracker SHALL update in real-time as videos are processed
4. THE Progress_Tracker SHALL display success rate and failure rate percentages
5. WHEN generation is complete, THE Progress_Tracker SHALL show final statistics

### Requirement 5: Automatic Download Management

**User Story:** As a user, I want to specify a download directory for batch-generated videos, so that completed videos are automatically saved to my preferred location.

#### Acceptance Criteria

1. THE BatchVideoModal SHALL provide an input field for specifying download directory path
2. WHEN a download path is specified, THE Download_Manager SHALL automatically download completed videos
3. WHEN no download path is specified, THE Download_Manager SHALL use the default browser download location
4. THE Download_Manager SHALL handle download failures gracefully and retry up to 3 times
5. WHEN all videos are downloaded, THE Download_Manager SHALL show a completion notification

### Requirement 6: Batch Configuration Persistence

**User Story:** As a user, I want my batch video settings to be remembered, so that I don't have to reconfigure them each time.

#### Acceptance Criteria

1. THE BatchVideoModal SHALL save configuration settings to localStorage
2. WHEN the modal is reopened, THE BatchVideoModal SHALL restore previous settings
3. THE BatchVideoModal SHALL persist orientation, duration, processing interval, and download path
4. WHEN settings are invalid, THE BatchVideoModal SHALL use default values

### Requirement 7: Enhanced Error Handling

**User Story:** As a user, I want clear error messages and retry options when batch generation fails, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN a video generation fails, THE BatchProcessor SHALL display a specific error message
2. THE BatchProcessor SHALL support automatic retry with exponential backoff
3. WHEN maximum retries are reached, THE BatchProcessor SHALL mark the item as permanently failed
4. THE BatchVideoModal SHALL allow manual retry of failed items
5. THE BatchProcessor SHALL log detailed error information for debugging

### Requirement 8: Integration with Existing Block System

**User Story:** As a user, I want batch video generation to work seamlessly with existing content blocks, so that I can generate videos from both uploaded files and selected blocks.

#### Acceptance Criteria

1. THE BatchVideoModal SHALL support both file upload and selected block modes
2. WHEN blocks are selected, THE BatchVideoModal SHALL generate default prompts based on block content
3. WHEN a TXT file is uploaded, THE BatchVideoModal SHALL create virtual blocks for each prompt
4. THE BatchProcessor SHALL handle both block-based and file-based generation uniformly
5. THE BatchVideoModal SHALL allow editing of individual video prompts regardless of source
