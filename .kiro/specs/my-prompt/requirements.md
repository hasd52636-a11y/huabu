# Requirements Document

## Introduction

This document specifies the requirements for the My Prompt feature - a customizable preset prompt library that allows users to store and quickly access up to 6 preset prompts for video generation. The feature integrates with the existing chat interface in the right sidebar, providing users with quick access to frequently used prompts while maintaining the ability to customize and manage their prompt library.

## Glossary

- **My_Prompt_System**: The complete preset prompt library system including storage, UI, and integration components
- **Prompt_Library**: The collection of up to 6 user-customizable preset prompts
- **Preset_Prompt**: A user-defined text prompt up to 2000 characters that can be stored and reused
- **Active_Prompt**: The currently selected preset prompt that appears in the button and will be sent with messages
- **Chat_Interface**: The right sidebar chat area where users interact with AI
- **Video_Mode**: The chat mode specifically for video generation where the preset prompt button appears

## Requirements

### Requirement 1: Preset Prompt Button Integration

**User Story:** As a user, I want to access preset prompts directly from the chat interface, so that I can quickly apply frequently used prompts without retyping them.

#### Acceptance Criteria

1. WHEN the chat interface is in video mode, THE My_Prompt_System SHALL display a preset prompt button after the "视频" mode button
2. WHEN no preset prompt is selected, THE button SHALL display default text indicating prompt library access
3. WHEN a preset prompt is selected, THE button SHALL display a truncated version of the selected prompt text
4. WHEN the button is clicked, THE My_Prompt_System SHALL open the prompt library modal
5. THE button SHALL maintain consistent styling with the existing chat interface design

### Requirement 2: Prompt Library Storage and Management

**User Story:** As a user, I want to store and manage up to 6 custom preset prompts, so that I can organize my frequently used prompts for different video generation scenarios.

#### Acceptance Criteria

1. THE Prompt_Library SHALL support exactly 6 preset prompt slots
2. WHEN a user creates or edits a preset prompt, THE My_Prompt_System SHALL validate that the content does not exceed 2000 characters
3. WHEN a user attempts to enter more than 2000 characters, THE My_Prompt_System SHALL prevent input and display a character count warning
4. WHEN a user saves changes to the prompt library, THE My_Prompt_System SHALL persist the data to local storage immediately
5. WHEN the application loads, THE My_Prompt_System SHALL restore previously saved preset prompts from local storage

### Requirement 3: Prompt Library Modal Interface

**User Story:** As a user, I want an intuitive interface to view, edit, and select my preset prompts, so that I can efficiently manage my prompt library.

#### Acceptance Criteria

1. WHEN the prompt library modal opens, THE My_Prompt_System SHALL display all 6 preset prompt slots with their current content
2. WHEN a preset prompt slot is empty, THE My_Prompt_System SHALL display placeholder text indicating the slot is available
3. WHEN a user clicks on a preset prompt slot, THE My_Prompt_System SHALL allow inline editing of that prompt
4. WHEN editing a preset prompt, THE My_Prompt_System SHALL display a real-time character count showing remaining characters out of 2000
5. WHEN a user selects a preset prompt, THE My_Prompt_System SHALL highlight the selected prompt and update the button display
6. WHEN a user clicks outside the modal or presses escape, THE My_Prompt_System SHALL close the modal and save any changes

### Requirement 4: Default Content Initialization

**User Story:** As a user, I want the system to come with useful default content, so that I can immediately benefit from the preset prompt feature without having to create everything from scratch.

#### Acceptance Criteria

1. WHEN the My_Prompt_System is first initialized, THE system SHALL populate the first preset prompt slot with the provided SORA 2 GLOBAL PROMPT RULES content
2. WHEN the default content is loaded, THE My_Prompt_System SHALL ensure the content fits within the 2000 character limit
3. THE remaining 5 preset prompt slots SHALL be initialized as empty and available for user customization
4. WHEN a user modifies the default content, THE My_Prompt_System SHALL treat it as a regular user-customized prompt

### Requirement 5: Chat Integration and Message Sending

**User Story:** As a user, I want my selected preset prompt to be automatically included when I send messages, so that I can apply consistent prompting rules without manual copying and pasting.

#### Acceptance Criteria

1. WHEN a user has selected a preset prompt and sends a chat message, THE My_Prompt_System SHALL prepend the preset prompt to the user's message before sending to AI
2. WHEN no preset prompt is selected and a user sends a message, THE My_Prompt_System SHALL send only the user's input without any preset prompt
3. WHEN a preset prompt is active, THE chat message display SHALL clearly indicate that a preset prompt was included
4. WHEN sending a message with a preset prompt, THE My_Prompt_System SHALL format the combined prompt and user input in a clear, readable manner
5. THE preset prompt integration SHALL work seamlessly with existing attachment features (images, files)

### Requirement 6: Data Persistence and Recovery

**User Story:** As a user, I want my preset prompts to be saved and restored across browser sessions, so that I don't lose my customized prompts when I close and reopen the application.

#### Acceptance Criteria

1. WHEN a user modifies any preset prompt, THE My_Prompt_System SHALL automatically save the changes to browser local storage
2. WHEN the application starts, THE My_Prompt_System SHALL load all saved preset prompts from local storage
3. WHEN local storage data is corrupted or unavailable, THE My_Prompt_System SHALL initialize with default content and continue functioning
4. THE My_Prompt_System SHALL maintain backward compatibility with existing local storage data structures
5. WHEN a user clears browser data, THE My_Prompt_System SHALL gracefully handle the loss of saved prompts and reinitialize with defaults

### Requirement 7: User Interface Responsiveness and Accessibility

**User Story:** As a user, I want the preset prompt interface to be responsive and accessible, so that I can use it effectively across different devices and accessibility needs.

#### Acceptance Criteria

1. THE preset prompt button SHALL be appropriately sized and positioned for both desktop and mobile interfaces
2. WHEN the prompt library modal is open, THE My_Prompt_System SHALL ensure proper focus management for keyboard navigation
3. THE modal SHALL be dismissible via keyboard (Escape key) and mouse (clicking outside)
4. WHEN editing preset prompts, THE My_Prompt_System SHALL provide clear visual feedback for the active editing state
5. THE character count display SHALL update in real-time and provide clear warnings when approaching the 2000 character limit

### Requirement 8: Error Handling and Validation

**User Story:** As a user, I want the system to handle errors gracefully and provide clear feedback, so that I understand any limitations or issues with my preset prompts.

#### Acceptance Criteria

1. WHEN a user attempts to exceed the 2000 character limit, THE My_Prompt_System SHALL prevent the input and display a clear error message
2. WHEN local storage operations fail, THE My_Prompt_System SHALL display an appropriate warning and continue functioning with in-memory storage
3. WHEN the preset prompt content contains invalid characters or formatting, THE My_Prompt_System SHALL sanitize the input appropriately
4. WHEN network or AI service errors occur, THE My_Prompt_System SHALL ensure preset prompt functionality remains available
5. THE My_Prompt_System SHALL log appropriate error information for debugging while maintaining user privacy