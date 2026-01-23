# Video Model Selection Fix - Implementation Tasks

## Task Overview

Fix the video model selection issue where user-selected VEO models are ignored during video generation.

## Task List

### 1. Core Model Selection Fix
- [ ] 1.1 Modify `generateVideo()` method to check `settings.modelId` first
- [ ] 1.2 Update video options to use user-selected model as primary choice
- [ ] 1.3 Add logging for model selection decisions
- [ ] 1.4 Test basic model selection functionality

### 2. Enhanced Fallback Strategy
- [ ] 2.1 Create `getEnhancedVideoStrategy()` method
- [ ] 2.2 Implement `getCompatibleFallback()` method for model-aware fallbacks
- [ ] 2.3 Update error handling to use enhanced strategy
- [ ] 2.4 Add fallback logging and user notifications

### 3. Model Compatibility Logic
- [ ] 3.1 Implement VEO model fallback logic
- [ ] 3.2 Implement Sora model fallback logic  
- [ ] 3.3 Implement WanX model fallback logic
- [ ] 3.4 Add default fallback for unknown models

### 4. Error Handling Enhancement
- [ ] 4.1 Improve error messages to include model context
- [ ] 4.2 Add model-specific error handling
- [ ] 4.3 Enhance logging for debugging model issues
- [ ] 4.4 Test error scenarios with different models

### 5. Testing and Validation
- [ ] 5.1 Write unit tests for model selection logic
- [ ] 5.2 Write integration tests for end-to-end model selection
- [ ] 5.3 Test backward compatibility with existing configurations
- [ ] 5.4 Verify all video generation parameters still work

### 6. Property-Based Testing
- [ ] 6.1 Write property test for user model respect
- [ ] 6.2 Write property test for fallback consistency
- [ ] 6.3 Write property test for configuration preservation
- [ ] 6.4 Run property tests and verify correctness

## Detailed Task Specifications

### Task 1.1: Modify generateVideo() Method
**File**: `adapters/AIServiceAdapter.ts`  
**Location**: Line ~800  
**Description**: Update the model selection logic to prioritize user choice

**Implementation**:
```typescript
// Replace existing code around line 800
const userSelectedModel = settings.modelId;
const videoStrategy = this.getEnhancedVideoStrategy(userSelectedModel, {
  duration, aspectRatio, quality, priority: 'quality'
});

console.log(`[AIServiceAdapter] Video model selection:`, {
  userSelected: userSelectedModel,
  primary: videoStrategy.primary,
  fallback: videoStrategy.fallback
});

const videoOptions: any = {
  aspectRatio,
  duration,
  model: videoStrategy.primary // Now respects user selection
};
```

### Task 1.2: Update Video Options
**File**: `adapters/AIServiceAdapter.ts`  
**Location**: Line ~810  
**Description**: Ensure video options use the correct model

**Verification**: 
- Check that `videoOptions.model` contains user-selected model when provided
- Verify fallback to automatic strategy when no user model
- Confirm all other video options remain unchanged

### Task 2.1: Create getEnhancedVideoStrategy() Method
**File**: `adapters/AIServiceAdapter.ts`  
**Location**: After `getVideoModelStrategy()` method  
**Description**: New method that prioritizes user model selection

**Implementation**:
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

### Task 2.2: Implement getCompatibleFallback() Method
**File**: `adapters/AIServiceAdapter.ts`  
**Location**: After `getEnhancedVideoStrategy()` method  
**Description**: Smart fallback logic based on model families

**Implementation**:
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

### Task 4.1: Improve Error Messages
**File**: `adapters/AIServiceAdapter.ts`  
**Location**: In catch blocks of `generateVideo()` method  
**Description**: Add model context to error messages

**Implementation**:
```typescript
catch (primaryError) {
  const errorContext = userSelectedModel 
    ? `user-selected model "${userSelectedModel}"`
    : `automatic model "${videoStrategy.primary}"`;
    
  console.warn(`[AIServiceAdapter] Primary ${errorContext} failed:`, primaryError);
  
  // Continue with existing fallback logic...
}
```

### Task 5.1: Write Unit Tests
**File**: `__tests__/video-model-selection-fix.test.ts`  
**Description**: Comprehensive unit tests for model selection logic

**Test Cases**:
```typescript
describe('Video Model Selection Fix', () => {
  test('should use user-selected VEO model', () => {
    // Test that VEO model selection works
  });
  
  test('should fallback to compatible model on failure', () => {
    // Test fallback logic
  });
  
  test('should use automatic strategy when no user model', () => {
    // Test backward compatibility
  });
  
  test('should handle invalid model gracefully', () => {
    // Test error handling
  });
});
```

### Task 6.1: Property Test - User Model Respect
**File**: `__tests__/video-model-selection-fix.test.ts`  
**Description**: Property-based test to verify user model selection

**Property**: If user selects model M, video generation uses model M
```typescript
test('Property: User model selection is respected', async () => {
  // Property-based test implementation
  const models = ['veo3', 'veo3-pro', 'sora_video2', 'wanx2.1-vace-plus'];
  
  for (const model of models) {
    const settings = { modelId: model, provider: 'shenma', apiKey: 'test' };
    const adapter = new MultiProviderAIService();
    
    // Mock the underlying service to capture the model used
    const mockService = jest.fn();
    adapter.shenmaService = { generateVideo: mockService };
    
    await adapter.generateVideo('test prompt', settings);
    
    // Verify the correct model was used
    expect(mockService).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model })
    );
  }
});
```

### Task 6.2: Property Test - Fallback Consistency
**File**: `__tests__/video-model-selection-fix.test.ts`  
**Description**: Property-based test to verify fallback behavior

**Property**: If primary model fails, compatible fallback is used
```typescript
test('Property: Fallback models are compatible with primary', async () => {
  const testCases = [
    { primary: 'veo3-pro', expectedFallback: 'veo3' },
    { primary: 'sora_video2-portrait', expectedFallback: 'sora_video2' },
    { primary: 'wanx2.1-vace-plus', expectedFallback: 'wanx2.1-vace-plus' }
  ];
  
  for (const { primary, expectedFallback } of testCases) {
    const adapter = new MultiProviderAIService();
    const fallback = adapter.getCompatibleFallback(primary);
    
    // Verify fallback is from same model family
    expect(fallback).toContain(expectedFallback.split('-')[0]);
  }
});
```

## Success Criteria

### Functional Requirements
- [ ] VEO model selection works end-to-end from UI to video generation
- [ ] Sora model selection continues to work as before
- [ ] Fallback strategy handles model failures gracefully
- [ ] Error messages provide clear context about model issues

### Technical Requirements  
- [ ] All existing video generation tests pass
- [ ] New tests achieve >90% code coverage for modified methods
- [ ] No performance regression in video generation
- [ ] Backward compatibility maintained for all existing configurations

### Quality Requirements
- [ ] Code review completed and approved
- [ ] Property-based tests verify correctness properties
- [ ] Integration tests confirm end-to-end functionality
- [ ] Error handling tested with various failure scenarios

## Testing Checklist

### Manual Testing
- [ ] Select VEO model in UI → Generate video → Verify VEO is used
- [ ] Select Sora model in UI → Generate video → Verify Sora is used  
- [ ] Test with invalid model → Verify graceful error handling
- [ ] Test with no model selected → Verify automatic strategy works

### Automated Testing
- [ ] Unit tests for all new methods pass
- [ ] Integration tests for model selection flow pass
- [ ] Property-based tests verify correctness properties
- [ ] Regression tests confirm no existing functionality broken

### Edge Case Testing
- [ ] Empty model ID handling
- [ ] Invalid/unknown model ID handling
- [ ] Network failures during model validation
- [ ] Concurrent video generation requests

## Rollback Plan

### Immediate Rollback
If critical issues are discovered:
1. Revert the single line change in `generateVideo()`:
   ```typescript
   model: videoStrategy.primary // Restore original behavior
   ```
2. Comment out new methods temporarily
3. Deploy hotfix immediately

### Gradual Rollback
For less critical issues:
1. Add feature flag to control new behavior
2. Monitor error rates and user feedback
3. Disable flag if issues persist
4. Fix issues and re-enable gradually

## Definition of Done

- [ ] All tasks completed and tested
- [ ] Code review approved by team lead
- [ ] All tests passing (unit, integration, property-based)
- [ ] Manual testing completed successfully
- [ ] Documentation updated
- [ ] Performance impact assessed and acceptable
- [ ] Rollback plan tested and ready
- [ ] Feature deployed to production successfully