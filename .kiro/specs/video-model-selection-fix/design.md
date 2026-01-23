# Video Model Selection Fix - Design Document

## Overview

This document outlines the design for fixing the video model selection issue where user-selected VEO models are ignored in favor of hardcoded Sora models during video generation.

## Root Cause Analysis

### Current Flow (Broken)
1. User selects VEO model in ModelSelector ✅
2. ModelSelector updates `modelConfig.video.modelId` ✅  
3. `convertNewToLegacyConfig()` creates `legacyConfig.video.modelId` ✅
4. `AIServiceAdapter.generateVideo()` calls `getVideoModelStrategy()` ❌
5. `getVideoModelStrategy()` returns hardcoded Sora models ❌
6. Video generation uses Sora instead of user-selected VEO ❌

### Problem Location
**File**: `adapters/AIServiceAdapter.ts`  
**Method**: `generateVideo()`  
**Line**: ~800  

```typescript
// CURRENT (BROKEN) CODE
const videoStrategy = this.getVideoModelStrategy({
  duration, aspectRatio, quality, priority: 'quality'
});

const videoOptions: any = {
  aspectRatio,
  duration,
  model: videoStrategy.primary // ❌ Ignores settings.modelId
};
```

## Solution Design

### Approach: Respect User Selection First

The fix involves modifying the model selection logic to prioritize the user's choice while maintaining fallback capabilities.

### Core Changes

#### 1. Primary Model Selection Logic
```typescript
// NEW (FIXED) CODE
const userSelectedModel = settings.modelId;
const videoStrategy = this.getVideoModelStrategy({
  duration, aspectRatio, quality, priority: 'quality'
});

const videoOptions: any = {
  aspectRatio,
  duration,
  model: userSelectedModel || videoStrategy.primary // ✅ User choice first
};
```

#### 2. Enhanced Fallback Strategy
```typescript
// Enhanced fallback with user model consideration
private getEnhancedVideoStrategy(
  userModel: string | undefined,
  requirements: VideoRequirements
): VideoStrategy {
  // If user selected a model, use it as primary
  if (userModel) {
    return {
      primary: userModel,
      fallback: this.getCompatibleFallback(userModel),
      extended: this.getVideoModelStrategy(requirements).primary
    };
  }
  
  // Otherwise use existing strategy
  return this.getVideoModelStrategy(requirements);
}
```

#### 3. Compatible Fallback Logic
```typescript
private getCompatibleFallback(userModel: string): string {
  // VEO models fallback to other VEO variants
  if (userModel.startsWith('veo')) {
    return userModel.includes('pro') ? 'veo3' : 'veo3-fast';
  }
  
  // Sora models fallback to compatible Sora variants
  if (userModel.startsWith('sora')) {
    return 'sora_video2';
  }
  
  // Default fallback
  return 'sora_video2';
}
```

## Implementation Plan

### Phase 1: Core Fix
1. Modify `generateVideo()` to check `settings.modelId` first
2. Use user-selected model as primary choice
3. Maintain existing fallback logic as secondary

### Phase 2: Enhanced Fallback
1. Implement model-aware fallback strategy
2. Add compatibility checking for model variants
3. Improve error messages for model failures

### Phase 3: Validation & Testing
1. Add model selection validation
2. Create comprehensive test cases
3. Verify backward compatibility

## Detailed Implementation

### File: `adapters/AIServiceAdapter.ts`

#### Method: `generateVideo()`
**Location**: Line ~800  
**Change Type**: Logic modification

```typescript
// BEFORE
const videoStrategy = this.getVideoModelStrategy({
  duration, aspectRatio, quality, priority: 'quality'
});

const videoOptions: any = {
  aspectRatio,
  duration,
  model: videoStrategy.primary
};

// AFTER  
const userSelectedModel = settings.modelId;
const videoStrategy = this.getEnhancedVideoStrategy(userSelectedModel, {
  duration, aspectRatio, quality, priority: 'quality'
});

const videoOptions: any = {
  aspectRatio,
  duration,
  model: videoStrategy.primary
};
```

#### New Method: `getEnhancedVideoStrategy()`
**Location**: After `getVideoModelStrategy()`  
**Change Type**: New method

```typescript
private getEnhancedVideoStrategy(
  userModel: string | undefined,
  requirements: {
    duration?: number;
    aspectRatio?: '16:9' | '9:16';
    quality?: 'standard' | 'hd';
    priority?: 'speed' | 'quality' | 'compatibility';
  }
): { primary: string; fallback: string; extended?: string } {
  
  // If user selected a specific model, prioritize it
  if (userModel && userModel.trim()) {
    console.log(`[AIServiceAdapter] Using user-selected video model: ${userModel}`);
    
    return {
      primary: userModel,
      fallback: this.getCompatibleFallback(userModel),
      extended: this.getVideoModelStrategy(requirements).primary
    };
  }
  
  // Otherwise use existing automatic strategy
  console.log('[AIServiceAdapter] No user model selected, using automatic strategy');
  return this.getVideoModelStrategy(requirements);
}
```

#### New Method: `getCompatibleFallback()`
**Location**: After `getEnhancedVideoStrategy()`  
**Change Type**: New method

```typescript
private getCompatibleFallback(userModel: string): string {
  const model = userModel.toLowerCase();
  
  // VEO model fallbacks
  if (model.startsWith('veo')) {
    if (model.includes('pro')) return 'veo3';
    if (model.includes('fast')) return 'veo3';
    return 'veo3-fast';
  }
  
  // Sora model fallbacks  
  if (model.startsWith('sora')) {
    if (model.includes('portrait')) return 'sora_video2';
    if (model.includes('landscape')) return 'sora_video2';
    return 'sora_video2-landscape';
  }
  
  // WanX model fallbacks
  if (model.includes('wanx') || model.includes('wan')) {
    return 'wanx2.1-vace-plus';
  }
  
  // Default fallback to most stable model
  return 'sora_video2';
}
```

### Error Handling Enhancement

#### Enhanced Error Messages
```typescript
// In the catch blocks of generateVideo()
catch (primaryError) {
  const errorContext = userSelectedModel 
    ? `user-selected model "${userSelectedModel}"`
    : `automatic model "${videoStrategy.primary}"`;
    
  console.warn(`[AIServiceAdapter] Primary ${errorContext} failed:`, primaryError);
  
  // Try fallback...
}
```

## Testing Strategy

### Unit Tests
1. **Model Selection Logic**
   - User model is used when provided
   - Fallback strategy when user model fails
   - Default strategy when no user model

2. **Fallback Compatibility**
   - VEO models fallback to VEO variants
   - Sora models fallback to Sora variants
   - Unknown models fallback to stable defaults

3. **Error Handling**
   - Clear error messages for model failures
   - Proper logging of model selection decisions

### Integration Tests
1. **End-to-End Model Selection**
   - UI selection → Configuration → Video generation
   - Model persistence across sessions
   - Parameter panel integration

2. **Backward Compatibility**
   - Existing video generation still works
   - Legacy configurations are handled
   - No breaking changes to APIs

## Correctness Properties

### Property 1: User Model Respect
**Property**: If user selects model M in UI, video generation uses model M  
**Test**: Select VEO model → Generate video → Verify VEO is used

### Property 2: Fallback Consistency  
**Property**: If primary model fails, compatible fallback is used  
**Test**: Force VEO failure → Verify VEO-compatible fallback is used

### Property 3: Configuration Preservation
**Property**: All existing video parameters continue to work  
**Test**: Generate video with all parameter combinations → Verify success

## Backward Compatibility

### Preserved Behavior
- All existing video generation parameters work unchanged
- Legacy model selection strategy remains as fallback
- Error handling and retry logic unchanged
- API interfaces remain identical

### Migration Path
- No migration required - changes are internal
- Existing configurations continue to work
- Users automatically benefit from fix

## Performance Impact

### Minimal Overhead
- Single additional parameter check (`settings.modelId`)
- No additional API calls or network requests
- Fallback logic only executes on failures
- Logging overhead is negligible

### Memory Usage
- No additional data structures
- Temporary variables for model selection
- No persistent state changes

## Security Considerations

### Model Validation
- Validate user-selected models against allowed list
- Prevent injection of malicious model names
- Sanitize model IDs before API calls

### Error Information
- Don't expose internal model details in errors
- Log sensitive information only to console
- Provide user-friendly error messages

## Monitoring and Observability

### Logging Strategy
```typescript
console.log(`[AIServiceAdapter] Video model selection:`, {
  userSelected: userSelectedModel,
  primary: videoStrategy.primary,
  fallback: videoStrategy.fallback,
  requirements: { duration, aspectRatio, quality }
});
```

### Success Metrics
- Percentage of video generations using user-selected models
- Fallback usage rates by model type
- Error rates for different model selections

## Rollback Plan

### Quick Rollback
If issues arise, revert to original logic:
```typescript
// Emergency rollback - restore original line
model: videoStrategy.primary // Original behavior
```

### Gradual Rollback
1. Add feature flag for new behavior
2. Monitor error rates and user feedback  
3. Disable flag if issues detected
4. Investigate and fix issues
5. Re-enable with fixes

## Future Enhancements

### Model Availability Checking
- Real-time model availability validation
- Dynamic model list updates
- Capacity-based model selection

### Advanced Fallback Strategies
- Quality-based fallback ordering
- Performance-based model selection
- User preference learning

### Enhanced Error Recovery
- Automatic retry with different models
- Smart model recommendation
- Proactive model health checking