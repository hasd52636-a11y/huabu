# Requirements Document

## Introduction

This specification defines the requirements for completing the ShenmaAPI model integration and implementing a UI model selection feature. The system currently has partial ShenmaAPI support but needs comprehensive model coverage and user-friendly model selection capabilities.

## Glossary

- **ShenmaAPI**: Third-party AI service provider offering text, image, and video generation models
- **Model_Selector**: UI component allowing users to choose specific models for different content types
- **Provider_Configuration**: System for managing API credentials and model mappings
- **Smart_Routing**: Intelligent model selection based on content type and user preferences
- **Model_Mapping**: Configuration that maps model names to their capabilities and providers

## Requirements

### Requirement 1: Complete ShenmaAPI Model Integration

**User Story:** As a developer, I want complete ShenmaAPI model support, so that I can access all available models through the application.

#### Acceptance Criteria

1. THE System SHALL support all ShenmaAPI text models including gemini-2.0-flash-exp, gpt-4o, gpt-4-turbo, gpt-3.5-turbo, gemini-3-flash-preview, and gemini-3-pro-preview
2. THE System SHALL support all ShenmaAPI image models including nano-banana-2, nano-banana, nano-banana-hd, flux-kontext-pro, flux-kontext-max, byteedit-v2.0, doubao-seedream-4-5, and recraftv3
3. THE System SHALL support all ShenmaAPI video models including sora_video2-portrait-hd, sora-2, sora-2-pro, doubao-seedance-1-5-pro, and qwen-animate-mix for video character replacement
4. THE System SHALL support specialized models including qwen-animate-mix for video character replacement and Volcengine API for smear editing
5. WHEN a model is selected, THE System SHALL validate model availability and compatibility
6. THE System SHALL maintain backward compatibility with existing model configurations

### Requirement 2: UI Model Selection Feature

**User Story:** As a user, I want to select specific models from the sidebar, so that I can choose the best model for my content generation needs.

#### Acceptance Criteria

1. WHEN ShenmaAPI is selected as the provider, THE System SHALL display a model selection icon (🎯) next to the attachment icon in the sidebar
2. WHEN the model selection icon is clicked, THE System SHALL show a dropdown menu with available models for the current content type
3. THE System SHALL show different model lists for text, image, and video modes
4. WHEN a model is selected, THE System SHALL save the selection to localStorage for persistence
5. THE System SHALL only show the model selector when ShenmaAPI is the active provider

### Requirement 3: Smart Model Defaults and Routing

**User Story:** As a system administrator, I want intelligent model defaults, so that users get optimal performance without manual configuration.

#### Acceptance Criteria

1. THE System SHALL use gemini-2.0-flash-exp as the default text model for ShenmaAPI
2. THE System SHALL use nano-banana-2 as the default image model for ShenmaAPI
3. THE System SHALL use sora_video2-portrait-hd as the default video model for ShenmaAPI
4. THE System SHALL use qwen-animate-mix for video character replacement functionality
5. THE System SHALL use Volcengine API through ShenmaAPI for smear editing and background removal
6. WHEN no user preference exists, THE System SHALL apply smart defaults based on content type
7. THE System SHALL provide fallback models when primary models are unavailable

### Requirement 4: Model Configuration Management

**User Story:** As a developer, I want centralized model configuration, so that model mappings are maintainable and extensible.

#### Acceptance Criteria

1. THE System SHALL maintain a comprehensive model configuration file with all ShenmaAPI models
2. THE System SHALL categorize models by type (text, image, video) and capabilities
3. THE System SHALL support model metadata including quality levels, aspect ratios, and duration options
4. WHEN new models are added, THE System SHALL integrate them without breaking existing functionality
5. THE System SHALL validate model configurations on startup

### Requirement 5: User Experience and Visual Feedback

**User Story:** As a user, I want clear visual feedback about model selection, so that I understand which models are active and available.

#### Acceptance Criteria

1. THE System SHALL display the currently selected model in the UI
2. THE System SHALL provide visual indicators for model availability and status
3. THE System SHALL show model capabilities and limitations in tooltips or descriptions
4. WHEN switching between content types, THE System SHALL update the available model list accordingly
5. THE System SHALL provide loading states during model validation and switching

### Requirement 6: Integration with Existing Services

**User Story:** As a system integrator, I want seamless integration with existing services, so that the new model selection doesn't break current functionality.

#### Acceptance Criteria

1. THE System SHALL integrate with the existing AIServiceAdapter without breaking current functionality
2. THE System SHALL work with the existing ShenmaService implementation
3. THE System SHALL maintain compatibility with the current configuration persistence system
4. THE System SHALL integrate with the existing smart routing configuration
5. THE System SHALL preserve existing user preferences and settings

### Requirement 7: Error Handling and Validation

**User Story:** As a user, I want robust error handling, so that model selection failures don't break the application.

#### Acceptance Criteria

1. WHEN a model is unavailable, THE System SHALL show an appropriate error message
2. THE System SHALL provide fallback options when the selected model fails
3. THE System SHALL validate API keys and model access before allowing selection
4. WHEN configuration is invalid, THE System SHALL revert to safe defaults
5. THE System SHALL log model selection errors for debugging purposes

### Requirement 8: Video Character Replacement Integration

**User Story:** As a user, I want to replace characters in videos using qwen-animate-mix model, so that I can create customized video content.

#### Acceptance Criteria

1. THE System SHALL use qwen-animate-mix model specifically for video character replacement functionality
2. THE System SHALL support video character replacement through ShenmaAPI's qwen endpoint
3. THE System SHALL maintain existing video character replacement implementation without breaking changes
4. THE System SHALL provide proper error handling for qwen-animate-mix model failures
5. THE System SHALL preserve all existing video character replacement features and UI components

### Requirement 9: Smear Editing and Removal Integration

**User Story:** As a user, I want to edit and remove content from images using smear tools, so that I can modify images precisely.

#### Acceptance Criteria

1. THE System SHALL support smear editing functionality using Volcengine API through ShenmaAPI
2. THE System SHALL use "i2i_inpainting_edit" req_key for smear editing with custom prompts
3. THE System SHALL support smear removal functionality for eliminating unwanted content
4. THE System SHALL handle both single and batch smear removal operations
5. THE System SHALL provide proper error handling for Volcengine API failures including AI face detection errors (code 201304)
6. THE System SHALL maintain existing smear editing UI components and workflows