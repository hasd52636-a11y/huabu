# Design Document

## Overview

This document outlines the design for completing ShenmaAPI model integration and implementing a UI model selection feature. The design builds upon existing ShenmaAPI infrastructure and adds comprehensive model support with user-friendly selection capabilities.

## Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Service Layer   │    │  Config Layer   │
│                 │    │                  │    │                 │
│ ModelSelector   │◄──►│ AIServiceAdapter │◄──►│ SmartRouting    │
│ Icon Component  │    │                  │    │ Configuration   │
│                 │    │ ShenmaService    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Local Storage   │    │   API Endpoints  │    │ Model Metadata  │
│ Preferences     │    │                  │    │ & Capabilities  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Design

#### ModelSelectorIcon Component

**Location**: `components/ModelSelectorIcon.tsx`

**Props Interface**:
```typescript
interface ModelSelectorIconProps {
  currentMode: 'text' | 'image' | 'video';
  selectedModel: string;
  onModelSelect: (model: string) => void;
  isVisible: boolean;
}
```

**Features**:
- Displays 🎯 icon when ShenmaAPI is active provider
- Shows dropdown with mode-specific models
- Persists selection to localStorage
- Provides model metadata in tooltips

#### Smart Routing Configuration

**Location**: `config/smartRouting.ts`

**Structure**:
```typescript
interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'image' | 'video';
  capabilities: string[];
  metadata: {
    quality?: string;
    aspectRatio?: string[];
    duration?: string;
    priority: number;
  };
}
```

**Model Categories**:
- **Text Models**: gemini-2.0-flash-exp (default), gpt-4o, gpt-4-turbo, etc.
- **Image Models**: nano-banana-2 (default), nano-banana-hd, doubao-seedream-4-5, byteedit-v2.0, etc.
- **Video Models**: sora_video2-portrait-hd (default), sora-2, sora-2-pro, doubao-seedance-1-5-pro, etc.
- **Specialized Models**: 
  - qwen-animate-mix (video character replacement)
  - Volcengine API with "i2i_inpainting_edit" (smear editing and removal)
  - ByteEdit v2.0 (background removal and image enhancement)

#### Service Layer Integration

**AIServiceAdapter Updates**:
- Enhanced model selection logic
- Fallback mechanism for unavailable models
- Integration with user preferences
- Validation of model compatibility

**ShenmaService Enhancements**:
- Complete model endpoint mapping
- Error handling for model-specific failures
- Metadata retrieval for model capabilities
- Dynamic model availability checking

## User Interface Design

### Model Selection Flow

1. **Provider Selection**: User selects ShenmaAPI as provider
2. **Icon Visibility**: ModelSelectorIcon appears next to attachment icon
3. **Mode Detection**: System detects current mode (text/image/video)
4. **Model Display**: Dropdown shows relevant models for current mode
5. **Selection**: User selects preferred model
6. **Persistence**: Selection saved to localStorage
7. **Application**: Selected model used for subsequent requests

### Visual Design

**Icon Placement**:
```
[Attachment Icon] [🎯 Model Selector] [Other Icons...]
```

**Dropdown Design**:
- Grouped by model type
- Shows model capabilities
- Indicates default/recommended models
- Provides quality/performance hints

## Data Flow

### Model Selection Process

```
User Clicks Icon → Load Available Models → Filter by Mode → Display Dropdown
                                                                    │
User Selects Model ← Update UI State ← Validate Selection ← ────────┘
        │
        ▼
Save to localStorage → Update AIServiceAdapter → Apply to Next Request
```

### Configuration Loading

```
App Startup → Load SmartRouting Config → Validate Models → Set Defaults
                                                                │
                                                                ▼
User Preferences ← Merge with Defaults ← Check Availability ← ──┘
```

## Implementation Strategy

### Phase 1: Configuration Enhancement
- Update `config/smartRouting.ts` with complete model lists
- Add model metadata and capabilities
- Implement validation logic

### Phase 2: UI Component Development
- Create `ModelSelectorIcon` component
- Implement dropdown functionality
- Add localStorage persistence

### Phase 3: Service Integration
- Update `AIServiceAdapter` for model selection
- Enhance `ShenmaService` with new models
- Add error handling and fallbacks

### Phase 4: Testing and Validation
- Test all model endpoints
- Validate UI interactions
- Ensure backward compatibility

## Error Handling

### Model Unavailability
- Display user-friendly error messages
- Automatic fallback to default models
- Retry mechanism for temporary failures

### Configuration Errors
- Validation on startup
- Safe defaults for invalid configurations
- Logging for debugging

### API Failures
- Graceful degradation
- Alternative model suggestions
- User notification of issues

## Performance Considerations

### Lazy Loading
- Load model metadata on demand
- Cache frequently used configurations
- Minimize API calls for model validation

### User Experience
- Fast dropdown rendering
- Smooth transitions
- Responsive design for different screen sizes

## Security

### API Key Management
- Secure storage of credentials
- Validation before model access
- Rate limiting considerations

### Input Validation
- Sanitize model selection inputs
- Validate against allowed model list
- Prevent injection attacks

## Correctness Properties

### Property 1: Model Availability Consistency
**Description**: When a model is displayed as available, it must be accessible through the API.
**Validation**: Property-based test that verifies all displayed models can be successfully called.

### Property 2: Selection Persistence
**Description**: User model selections must persist across browser sessions.
**Validation**: Test that localStorage correctly saves and restores model preferences.

### Property 3: Mode-Specific Filtering
**Description**: Only models compatible with the current mode should be displayed.
**Validation**: Verify that text models don't appear in image mode, etc.

### Property 4: Fallback Reliability
**Description**: When a selected model fails, the system must gracefully fall back to a working alternative.
**Validation**: Test failure scenarios and verify fallback behavior.

### Property 5: Configuration Validation
**Description**: Invalid model configurations must be detected and handled safely.
**Validation**: Test with malformed configurations and verify safe defaults are applied.

## Testing Strategy

### Unit Tests
- Component rendering and interaction
- Service method functionality
- Configuration validation logic

### Integration Tests
- End-to-end model selection flow
- API integration with all models
- Error handling scenarios

### Property-Based Tests
- Model availability consistency
- Selection persistence across sessions
- Fallback mechanism reliability

## Deployment Considerations

### Backward Compatibility
- Existing configurations must continue working
- Gradual migration of user preferences
- Fallback to previous behavior if needed

### Monitoring
- Track model usage patterns
- Monitor API response times
- Alert on model availability issues

### Documentation
- Update user guides for new features
- Document model capabilities and limitations
- Provide troubleshooting guides