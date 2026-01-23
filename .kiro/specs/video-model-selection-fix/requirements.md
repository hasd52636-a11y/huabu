# Video Model Selection Fix - Requirements

## Problem Statement

Users can select VEO models in the sidebar ModelSelector, but when they submit video generation requests, the system still uses sora_video2 instead of the selected VEO model. This creates a disconnect between the UI model selection and the actual video generation process.

## User Stories

### US1: Respect User Model Selection
**As a** user  
**I want** the video generation to use the model I selected in the sidebar  
**So that** I can control which video model (VEO, Sora, etc.) is used for my content generation

**Acceptance Criteria:**
- When I select VEO model in the video ModelSelector, video generation uses VEO
- When I select Sora model in the video ModelSelector, video generation uses Sora  
- The selected model is consistently used across all video generation methods
- Model selection persists across browser sessions

### US2: Fallback Model Strategy
**As a** user  
**I want** the system to gracefully handle model failures  
**So that** my video generation doesn't fail completely if my selected model is unavailable

**Acceptance Criteria:**
- If the selected model fails, system attempts fallback models
- User is notified when fallback models are used
- Fallback strategy respects model compatibility (e.g., VEO models fallback to other VEO variants)
- System logs model selection and fallback decisions for debugging

### US3: Model Selection Validation
**As a** user  
**I want** to be prevented from selecting incompatible models  
**So that** I don't encounter unexpected errors during generation

**Acceptance Criteria:**
- Invalid model selections are prevented in the UI
- Clear error messages when model is unavailable
- Model availability is checked before generation starts
- Compatible fallback suggestions are provided

## Technical Requirements

### TR1: Model Selection Flow
- ModelSelector component correctly updates modelConfig.video.modelId
- Configuration conversion preserves selected model ID
- AIServiceAdapter.generateVideo() respects settings.modelId parameter
- Model selection is validated before API calls

### TR2: Backward Compatibility
- Existing video generation functionality remains unchanged
- Legacy model selection strategy is preserved as fallback
- All existing video generation parameters continue to work
- No breaking changes to public APIs

### TR3: Error Handling
- Clear error messages for invalid model selections
- Graceful degradation when selected model is unavailable
- Proper logging of model selection decisions
- User-friendly error reporting

## Current System Analysis

### Working Components ✅
1. **UI Model Selection**: ModelSelector correctly updates modelConfig.video.modelId
2. **Configuration Conversion**: convertNewToLegacyConfig() properly passes selected model
3. **Model Persistence**: Selected models are saved to user preferences

### Broken Components ❌
1. **AIServiceAdapter.generateVideo()**: Ignores settings.modelId, uses hardcoded strategy
2. **Model Strategy Override**: getVideoModelStrategy() overrides user selection
3. **Parameter Passing**: Selected model not passed to ShenmaService.generateVideo()

## Success Criteria

1. **Functional**: User-selected VEO models are used for video generation
2. **Consistent**: Model selection works across all video generation paths
3. **Reliable**: Fallback strategy handles model failures gracefully
4. **Maintainable**: Code changes are minimal and focused
5. **Testable**: Model selection behavior can be verified programmatically

## Out of Scope

- Adding new video models or providers
- Changing video generation parameters or options
- Modifying video quality or processing logic
- UI/UX changes to model selection interface
- Performance optimizations for video generation

## Dependencies

- Existing ModelSelector component
- AIServiceAdapter video generation methods
- ShenmaService video generation API
- Model configuration system
- Error handling infrastructure

## Risks and Mitigations

### Risk: Breaking Existing Video Generation
**Mitigation**: Preserve existing fallback logic, extensive testing

### Risk: Model Compatibility Issues  
**Mitigation**: Validate model selections, provide clear error messages

### Risk: Performance Impact
**Mitigation**: Minimal code changes, no additional API calls

## Definition of Done

- [ ] VEO model selection works end-to-end
- [ ] Fallback strategy handles model failures
- [ ] All existing video generation tests pass
- [ ] New tests verify model selection behavior
- [ ] Code review completed
- [ ] Documentation updated