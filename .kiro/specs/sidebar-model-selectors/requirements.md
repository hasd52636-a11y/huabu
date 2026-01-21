# Requirements Document

## Introduction

The sidebar-model-selectors feature extends the existing text chat model selector functionality to include image and video generation models in the sidebar. This feature addresses the complex technical challenge of providing user choice while maintaining compatibility with canvas features that require specific models due to API incompatibilities.

## Glossary

- **Sidebar_Model_Selector**: UI component in the sidebar allowing users to select default models for image and video generation
- **Canvas_Feature**: Advanced functionality in the canvas that requires specific models (e.g., smear removal, style transfer)
- **Model_Lock**: State where a canvas feature overrides user model preference due to technical requirements
- **Global_Preference**: User's default model selection for basic generation operations
- **Feature_Model_Manager**: Service that manages model-feature bindings and conflict resolution
- **Smart_Selection**: Automatic model selection based on feature requirements
- **Conflict_Resolution**: Process of handling cases where user preference conflicts with feature requirements

## Requirements

### Requirement 1: Sidebar Model Selection Interface

**User Story:** As a user, I want to select default image and video generation models from the sidebar, so that I can use my preferred models for basic generation tasks.

#### Acceptance Criteria

1. WHEN a user opens the sidebar THEN the System SHALL display model selectors for both image and video generation alongside the existing text chat selector
2. WHEN a user selects an image model THEN the System SHALL set it as the global preference for basic image generation operations
3. WHEN a user selects a video model THEN the System SHALL set it as the global preference for basic video generation operations
4. THE System SHALL persist user model preferences across browser sessions
5. WHEN the sidebar loads THEN the System SHALL display the currently selected models for each generation type

### Requirement 2: Model Availability and Categorization

**User Story:** As a user, I want to see available models organized by type, so that I can make informed choices about which models to use.

#### Acceptance Criteria

1. THE System SHALL display available image models including nano-banana-hd, nano-banana-2, flux-kontext-max, gpt-image-1, recraftv3, dall-e-3, and byteedit-v2.0
2. THE System SHALL display available video models including veo3-pro, veo3-fast, sora-2, sora-2-pro, sora_video2, sora_video2-portrait, wanx2.1-vace-plus, and video-style-transform
3. WHEN displaying model options THEN the System SHALL show model names in a user-friendly format
4. THE System SHALL group models by generation type (image vs video) in separate selectors

### Requirement 3: Feature-Model Binding Management

**User Story:** As a system architect, I want to maintain existing canvas feature functionality, so that advanced features continue to work with their required models.

#### Acceptance Criteria

1. WHEN a canvas feature requires a specific model THEN the Feature_Model_Manager SHALL identify the required model binding
2. THE System SHALL maintain hard bindings for smear removal and editing to byteedit-v2.0 model
3. THE System SHALL maintain hard bindings for style transfer to byteedit-v2.0 model
4. THE System SHALL maintain hard bindings for character cameo to sora-2 or sora-2-pro models
5. THE System SHALL maintain hard bindings for dance generation to qwen-dance-generation model
6. THE System SHALL maintain hard bindings for video style transfer to qwen-style-transfer model
7. THE System SHALL maintain hard bindings for character replacement to wan2.2-animate-mix model

### Requirement 4: Smart Model Selection

**User Story:** As a user, I want the system to automatically use the correct model for advanced features, so that all functionality works reliably regardless of my global preferences.

#### Acceptance Criteria

1. WHEN a user initiates a canvas feature with model requirements THEN the System SHALL override global preferences and use the required model
2. WHEN performing basic text-to-image generation THEN the System SHALL use the user's selected global image model preference
3. WHEN performing basic text-to-video generation THEN the System SHALL use the user's selected global video model preference
4. WHEN a feature requires a specific API endpoint THEN the System SHALL route requests to the correct endpoint regardless of global preferences

### Requirement 5: Model Lock Indication and User Communication

**User Story:** As a user, I want to understand when and why specific models are being used instead of my preferences, so that I can make informed decisions about my workflow.

#### Acceptance Criteria

1. WHEN a canvas feature locks to a specific model THEN the System SHALL display a visual indicator showing the locked model
2. WHEN displaying a model lock THEN the System SHALL provide an explanation of why the specific model is required
3. WHEN a user hovers over a model lock indicator THEN the System SHALL show detailed information about the technical constraint
4. THE System SHALL clearly distinguish between user-selectable and system-locked model states in the UI

### Requirement 6: Conflict Resolution and User Experience

**User Story:** As a user, I want clear feedback when my model preferences cannot be used, so that I understand the system's behavior and can adjust my expectations.

#### Acceptance Criteria

1. WHEN a user's global preference conflicts with a feature requirement THEN the System SHALL display a notification explaining the override
2. WHEN showing conflict notifications THEN the System SHALL include the reason for the model override and which model will be used instead
3. THE System SHALL allow users to dismiss conflict notifications after reading them
4. WHEN a conflict occurs THEN the System SHALL log the event for debugging and user support purposes

### Requirement 7: Backward Compatibility and Integration

**User Story:** As a developer, I want the new model selection system to integrate seamlessly with existing code, so that current functionality remains unaffected.

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with existing ModelSelector.tsx component architecture
2. WHEN integrating with existing services THEN the System SHALL preserve current shenmaService.ts functionality
3. THE System SHALL maintain compatibility with existing MenuConfigManager.ts and smartRouting.ts configurations
4. WHEN new model selectors are added THEN the System SHALL not break existing text chat model selection functionality

### Requirement 8: Model Configuration Management

**User Story:** As a system administrator, I want model configurations to be centrally managed, so that model availability and bindings can be updated without code changes.

#### Acceptance Criteria

1. THE System SHALL store model-feature bindings in a centralized configuration
2. WHEN model availability changes THEN the System SHALL update available options in the selectors
3. THE System SHALL validate model selections against available models before allowing selection
4. WHEN a previously selected model becomes unavailable THEN the System SHALL fall back to a default model and notify the user