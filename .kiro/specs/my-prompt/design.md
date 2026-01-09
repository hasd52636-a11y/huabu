# Design Document

## Overview

The My Prompt feature provides users with a customizable preset prompt library integrated into the existing chat interface. The system allows users to store up to 6 preset prompts (maximum 2000 characters each) and quickly apply them when generating video content. The design emphasizes seamless integration with the existing UI, persistent storage, and intuitive user experience.

## Architecture

The My Prompt system follows a modular architecture that integrates with the existing React application structure:

```
App.tsx (Main Container)
├── PresetPromptButton (New Component)
├── PresetPromptModal (New Component)
└── Chat Interface (Existing, Enhanced)
```

### Key Architectural Decisions

1. **Component-Based Design**: Create reusable React components that integrate cleanly with existing code
2. **Local Storage Persistence**: Use browser localStorage for data persistence to avoid server dependencies
3. **State Management**: Leverage existing React state patterns in App.tsx for consistency
4. **UI Consistency**: Follow existing design patterns and styling conventions

## Components and Interfaces

### PresetPromptButton Component

**Purpose**: Display the preset prompt access button in the chat interface

**Props Interface**:
```typescript
interface PresetPromptButtonProps {
  selectedPrompt: string | null;
  onOpenModal: () => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}
```

**Key Features**:
- Displays truncated selected prompt text or default placeholder
- Matches existing button styling in chat mode selector
- Responsive design for mobile and desktop
- Tooltip showing full prompt text when truncated

### PresetPromptModal Component

**Purpose**: Provide the main interface for managing preset prompts

**Props Interface**:
```typescript
interface PresetPromptModalProps {
  isOpen: boolean;
  prompts: PresetPrompt[];
  selectedPromptIndex: number | null;
  onClose: () => void;
  onSave: (prompts: PresetPrompt[]) => void;
  onSelect: (index: number) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}
```

**Key Features**:
- Grid layout showing all 6 prompt slots
- Inline editing with real-time character counting
- Visual selection indicators
- Keyboard navigation support
- Auto-save functionality

### Enhanced App.tsx Integration

**New State Variables**:
```typescript
const [presetPrompts, setPresetPrompts] = useState<PresetPrompt[]>([]);
const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
const [showPresetPromptModal, setShowPresetPromptModal] = useState(false);
```

**Enhanced handleSidebarSend Function**:
- Check for selected preset prompt
- Prepend preset prompt to user input
- Maintain existing attachment and mode logic

## Data Models

### PresetPrompt Interface

```typescript
interface PresetPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### PresetPromptStorage Interface

```typescript
interface PresetPromptStorage {
  version: string;
  prompts: PresetPrompt[];
  selectedIndex: number | null;
  lastUpdated: Date;
}
```

### Default SORA 2 Content

The first preset prompt will be initialized with the provided SORA 2 GLOBAL PROMPT RULES:

```typescript
const DEFAULT_SORA_PROMPT = `########################### SORA 2 GLOBAL PROMPT RULES##########################
1. GLOBAL REFERENCE LOCK:
All characters or products shown in this video must strictly use the main subject from the provided reference image(s) as the only visual source of identity, appearance, proportions, clothing, materials, and style. Do not redesign, replace, stylize, beautify, or alter the reference subject in any way. Preserve face, body, outfit, texture, logo, color, and silhouette exactly as in the reference. If any conflict exists between the prompt and the reference image, the reference image always overrides the prompt.

2. 视频开始的画面和语言一定要有勾子有悬念，开局炸裂，适应抖音的播放风格。MULTI-CUT SHOTS & DYNAMIC CAMERA:
- Use multiple cuts per scene to tell a cinematic story.
- Include wide shots, close-ups, over-the-shoulder, tracking shots, and dynamic effects like motion blur or tilt.
- Each cut must be short (≤10 seconds) and visually clear.

3. INLINE CHARACTER DESCRIPTIONS & DIALOGUE:
- Every time a character speaks or appears, include inline description in parentheses: distinctive look, wardrobe, position, and current emotion.
- Camera must focus on the speaking character using proper framing (close-up or medium shot).
- Character mouth movements must be perfectly synchronized with dialogue.
- Do not create separate character description sections.
- Dialogue order must remain exactly as in the script.
- Example format:
CharacterName (appearance, outfit, position; emotion): "Dialogue line." (camera instructions; lip-sync)

4. BGM, SFX & PACING:
- BGM: match scene emotion, adjust intensity dynamically between dialogue and silent beats.
- SFX: include realistic environmental and action sounds, precisely synced with on-screen actions.
- Pacing: keep each scene ≤10s, maintain cinematic rhythm with sharp cuts or smooth transitions, end with visual or emotional hook.

5. DIALOGUE ORDER LOCK:
- At the end of each scene, based on the actual number of characters present and the actual dialogue order, specify the dialogue sequence in the following format:
Dialogue_order_lock=[Character1, Character2, Character3,...]

6. ZERO NARRATION & CHARACTER LIMITS:
- No narration in any scene; dialogue only.
- Maintain natural dialogue flow and continuity.
- Each scene prompt: minimum 700 characters, maximum 1000 characters.`;
```

## Storage and Persistence

### LocalStorage Schema

**Key**: `creative-flow-preset-prompts`

**Data Structure**:
```typescript
{
  version: "1.0.0",
  prompts: [
    {
      id: "prompt-1",
      title: "SORA 2 Global Rules",
      content: "...",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    },
    // ... up to 6 prompts
  ],
  selectedIndex: 0,
  lastUpdated: "2024-01-01T00:00:00.000Z"
}
```

### Storage Operations

1. **Load**: Read from localStorage on app initialization
2. **Save**: Write to localStorage on any prompt modification
3. **Migration**: Handle version upgrades and data format changes
4. **Fallback**: Initialize with defaults if localStorage is unavailable

## User Interface Design

### Button Integration

The preset prompt button will be positioned after the video mode button in the chat mode selector:

```
[文本] [图像] [视频] [📝 我的提示词]
```

**Button States**:
- **No Selection**: Shows "我的提示词" with prompt icon
- **With Selection**: Shows truncated prompt text with ellipsis
- **Hover**: Shows tooltip with full prompt text (if truncated)

### Modal Layout

The modal will use a card-based layout showing all 6 prompt slots:

```
┌─────────────────────────────────────────┐
│  我的提示词库                              │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │ Prompt 1│ │ Prompt 2│ │ Prompt 3│     │
│ │ [SORA2] │ │ [Empty] │ │ [Empty] │     │
│ └─────────┘ └─────────┘ └─────────┘     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ │ Prompt 4│ │ Prompt 5│ │ Prompt 6│     │
│ │ [Empty] │ │ [Empty] │ │ [Empty] │     │
│ └─────────┘ └─────────┘ └─────────┘     │
├─────────────────────────────────────────┤
│ 字符计数: 1250/2000    [保存] [取消]     │
└─────────────────────────────────────────┘
```

### Responsive Design

- **Desktop**: 3x2 grid layout with full-size cards
- **Mobile**: 2x3 grid layout with smaller cards
- **Tablet**: Adaptive layout based on screen width

## Integration Points

### Chat Interface Enhancement

1. **Mode Selector**: Add preset prompt button after video mode
2. **Message Composition**: Integrate preset prompt with user input
3. **Message Display**: Show indicator when preset prompt is used
4. **Existing Features**: Maintain compatibility with attachments and other features

### Styling Integration

Follow existing design patterns:
- Use existing color scheme and theme variables
- Match button styling from mode selector
- Use consistent modal styling with other modals
- Maintain accessibility standards

### Internationalization

Add new translation keys to constants.tsx:

```typescript
// Chinese translations
presetPrompt: '我的提示词',
presetPromptLibrary: '我的提示词库',
presetPromptPlaceholder: '点击编辑提示词内容...',
characterCount: '字符计数',
selectPrompt: '选择提示词',
// ... more translations

// English translations  
presetPrompt: 'My Prompt',
presetPromptLibrary: 'My Prompt Library',
presetPromptPlaceholder: 'Click to edit prompt content...',
characterCount: 'Character Count',
selectPrompt: 'Select Prompt',
// ... more translations
```

## Error Handling

### Character Limit Validation

```typescript
const validatePromptLength = (content: string): boolean => {
  return content.length <= 2000;
};

const handlePromptInput = (content: string) => {
  if (!validatePromptLength(content)) {
    showError('提示词内容不能超过2000字符');
    return false;
  }
  return true;
};
```

### Storage Error Handling

```typescript
const saveToStorage = (data: PresetPromptStorage) => {
  try {
    localStorage.setItem('creative-flow-preset-prompts', JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save preset prompts to localStorage:', error);
    showWarning('无法保存提示词设置，将使用临时存储');
  }
};
```

### Graceful Degradation

- If localStorage is unavailable, use in-memory storage
- If default content is too long, truncate with warning
- If modal fails to open, provide alternative access method

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Converting EARS to Properties

Based on the prework analysis, the following properties have been identified to validate the system's correctness:

**Property 1: Button display state consistency**
*For any* preset prompt selection state, the button should display appropriate text - either default placeholder text when no prompt is selected, or truncated prompt text when a prompt is selected
**Validates: Requirements 1.2, 1.3**

**Property 2: Prompt library slot constraint**
*For any* system state, the prompt library should maintain exactly 6 preset prompt slots, no more and no less
**Validates: Requirements 2.1**

**Property 3: Character limit validation**
*For any* input string, the system should reject content exceeding 2000 characters and display appropriate error messages
**Validates: Requirements 2.2, 2.3, 8.1**

**Property 4: Data persistence consistency**
*For any* prompt modification, the system should immediately save changes to localStorage and be able to restore the same data on application reload
**Validates: Requirements 2.4, 2.5, 6.1, 6.2**

**Property 5: Modal display completeness**
*For any* prompt library state, opening the modal should display all 6 slots with correct content or appropriate placeholder text for empty slots
**Validates: Requirements 3.1, 3.2**

**Property 6: Selection state synchronization**
*For any* prompt selection action, both the modal highlight and button display should update consistently to reflect the selected prompt
**Validates: Requirements 3.5**

**Property 7: Real-time character counting**
*For any* text input during prompt editing, the character count display should update immediately and show accurate remaining characters out of 2000
**Validates: Requirements 3.4, 7.5**

**Property 8: Message composition with preset prompts**
*For any* user message when a preset prompt is selected, the system should prepend the preset prompt to the user input in a clear, readable format before sending to AI
**Validates: Requirements 5.1, 5.4**

**Property 9: Message sending without preset prompts**
*For any* user message when no preset prompt is selected, the system should send only the user's input without any modifications
**Validates: Requirements 5.2**

**Property 10: Attachment integration compatibility**
*For any* message with attachments (images or files), preset prompt integration should work seamlessly without interfering with existing attachment functionality
**Validates: Requirements 5.5**

**Property 11: Error recovery and graceful degradation**
*For any* localStorage failure or data corruption scenario, the system should initialize with default content and continue functioning normally
**Validates: Requirements 6.3, 6.5, 8.2**

**Property 12: Input sanitization**
*For any* preset prompt content with potentially invalid characters or formatting, the system should sanitize the input appropriately while preserving intended content
**Validates: Requirements 8.3**

**Property 13: System resilience during AI service failures**
*For any* network or AI service error condition, preset prompt functionality should remain fully available and operational
**Validates: Requirements 8.4**

**Property 14: Keyboard navigation accessibility**
*For any* modal interaction using keyboard navigation, focus should move correctly through all interactive elements and support proper dismissal via Escape key
**Validates: Requirements 7.2, 7.3**

## Testing Strategy

### Unit Tests

Unit tests will focus on specific examples, edge cases, and error conditions:

1. **PresetPromptButton Component**
   - Renders correctly with and without selected prompt
   - Handles click events properly
   - Shows appropriate text based on selection state
   - Displays tooltips for truncated text

2. **PresetPromptModal Component**
   - Displays all 6 prompt slots correctly
   - Handles editing and character counting
   - Saves changes properly
   - Manages selection state
   - Supports keyboard navigation

3. **Storage Functions**
   - Saves and loads data correctly
   - Handles storage errors gracefully
   - Migrates data between versions
   - Initializes with default content

4. **Message Integration**
   - Combines preset prompts with user input correctly
   - Handles empty input scenarios
   - Works with attachment features

### Property-Based Tests

Property-based tests will validate universal properties across many generated inputs:

- **Minimum 100 iterations per property test** (due to randomization)
- Each property test references its design document property
- Tag format: **Feature: my-prompt, Property {number}: {property_text}**

**Dual Testing Approach**:
- Unit tests verify specific examples and edge cases
- Property tests verify universal properties across all inputs
- Both types complement each other for comprehensive coverage

### Integration Tests

1. **Chat Integration**
   - Preset prompt is included in sent messages
   - Works with existing attachment features
   - Maintains message history correctly
   - UI indicators show preset prompt usage

2. **UI Integration**
   - Button appears in correct position
   - Modal opens and closes properly
   - Responsive design works across devices
   - Theme and language switching work correctly

3. **Storage Integration**
   - Data persists across browser sessions
   - Handles browser data clearing gracefully
   - Maintains backward compatibility