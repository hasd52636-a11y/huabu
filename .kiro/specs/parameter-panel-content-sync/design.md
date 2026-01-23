# Parameter Panel Content Sync Enhancement - Design Document

## Architecture Overview

This design transforms the parameter panel from an independent content generator into an enhanced editing interface that syncs with the chat dialog and manages results through a sidebar results area.

### High-Level Architecture

```
Chat Dialog (sidebarInput) ←→ Content Sync Service ←→ Parameter Panel
                                        ↓
                              Results Management System
                                        ↓
                              Sidebar Results Area ←→ Canvas Projection
```

## Component Architecture

### 1. Content Sync Service (`services/ContentSyncService.ts`)

**Purpose**: Manages bidirectional synchronization between chat dialog and parameter panel.

```typescript
interface ContentSyncState {
  prompt: string;
  attachments: {
    image?: string;
    video?: string;
    file?: { name: string; content: string };
    videoUrl?: string;
  };
  mode: 'text' | 'image' | 'video';
  modelId: string;
  lastSyncTimestamp: number;
}

class ContentSyncService {
  private syncState: ContentSyncState;
  private listeners: Set<(state: ContentSyncState) => void>;
  
  // Sync from chat dialog to parameter panel
  syncFromChatDialog(input: string, attachments: any, mode: string, modelId: string): void;
  
  // Sync from parameter panel to chat dialog
  syncToChatDialog(prompt: string, attachments: any): void;
  
  // Subscribe to sync state changes
  subscribe(listener: (state: ContentSyncState) => void): () => void;
  
  // Get current sync state
  getCurrentState(): ContentSyncState;
}
```

### 2. Results Management System (`services/ResultsManagerService.ts`)

**Purpose**: Manages generated content storage, thumbnails, and projection to canvas.

```typescript
interface GenerationResult {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string; // URL for media, text content for text
  thumbnail?: string; // Base64 thumbnail for media
  metadata: {
    prompt: string;
    model: string;
    parameters: GenerationParameters;
    timestamp: number;
    source: 'chat' | 'parameter-panel';
  };
  status: 'generating' | 'completed' | 'failed';
}

class ResultsManagerService {
  private results: Map<string, GenerationResult>;
  private thumbnailGenerator: ThumbnailGenerator;
  
  // Add new generation result
  addResult(result: Omit<GenerationResult, 'id' | 'timestamp'>): string;
  
  // Update result status/content
  updateResult(id: string, updates: Partial<GenerationResult>): void;
  
  // Get all results
  getResults(): GenerationResult[];
  
  // Project result to canvas
  projectToCanvas(resultId: string, position?: { x: number; y: number }): void;
  
  // Delete result
  deleteResult(id: string): void;
  
  // Generate thumbnail for media content
  generateThumbnail(content: string, type: 'image' | 'video'): Promise<string>;
}
```

### 3. Enhanced Parameter Panel (`components/ParameterPanel.tsx`)

**Modifications to existing component**:

```typescript
interface ParameterPanelProps {
  // ... existing props
  contentSyncService: ContentSyncService;
  resultsManager: ResultsManagerService;
  initialSyncedContent?: ContentSyncState;
}

// New state for content sync
const [syncedContent, setSyncedContent] = useState<ContentSyncState | null>(null);
const [isSynced, setIsSynced] = useState(false);

// Content sync effects
useEffect(() => {
  const unsubscribe = contentSyncService.subscribe((state) => {
    setSyncedContent(state);
    setIsSynced(true);
    // Update parameter panel fields with synced content
    setParameters(prev => ({
      ...prev,
      prompt: state.prompt,
      // Map other synced properties
    }));
  });
  
  return unsubscribe;
}, [contentSyncService]);
```

### 4. Sidebar Results Area (`components/SidebarResultsArea.tsx`)

**New component for managing generation results**:

```typescript
interface SidebarResultsAreaProps {
  resultsManager: ResultsManagerService;
  onProjectToCanvas: (resultId: string) => void;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

const SidebarResultsArea: React.FC<SidebarResultsAreaProps> = ({
  resultsManager,
  onProjectToCanvas,
  theme,
  lang
}) => {
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  
  // Results grid with thumbnails
  // Projection controls
  // Batch operations
  // Filtering and search
};
```

### 5. Enhanced App.tsx Integration

**Key modifications to main app component**:

```typescript
// New services
const [contentSyncService] = useState(() => new ContentSyncService());
const [resultsManager] = useState(() => new ResultsManagerService());

// Enhanced parameter panel handlers
const handleOpenParameterPanel = (type: 'image' | 'video', modelId?: string) => {
  // Sync current chat dialog content
  contentSyncService.syncFromChatDialog(
    sidebarInput,
    {
      image: pendingChatImage,
      video: pendingChatVideo,
      file: pendingChatFile,
      videoUrl: pendingVideoUrl
    },
    type,
    modelId || (type === 'image' ? modelConfig.image.modelId : modelConfig.video.modelId)
  );
  
  // Open parameter panel
  setParameterPanelType(type);
  setParameterPanelModel(modelId);
  setShowParameterPanel(true);
};

// Enhanced generation handler
const handleParametersChange = async (parameters: GenerationParameters) => {
  try {
    // Create result entry
    const resultId = resultsManager.addResult({
      type: parameterPanelType,
      content: '', // Will be updated when generation completes
      metadata: {
        prompt: parameters.prompt,
        model: parameterPanelModel,
        parameters,
        source: 'parameter-panel'
      },
      status: 'generating'
    });
    
    // Start generation (modified to update result instead of creating canvas block)
    const result = await generateContent(parameters, parameterPanelType, parameterPanelModel);
    
    // Update result with generated content
    resultsManager.updateResult(resultId, {
      content: result.content,
      status: 'completed'
    });
    
    // Generate thumbnail if needed
    if (parameterPanelType !== 'text') {
      const thumbnail = await resultsManager.generateThumbnail(result.content, parameterPanelType);
      resultsManager.updateResult(resultId, { thumbnail });
    }
    
    // Close parameter panel
    setShowParameterPanel(false);
    
    // Switch to results tab
    setSidebarTab('results');
    
  } catch (error) {
    // Handle error
    resultsManager.updateResult(resultId, { status: 'failed' });
  }
};
```

## Data Flow Design

### 1. Content Sync Flow

```
User types in chat dialog
         ↓
sidebarInput state updates
         ↓
User opens parameter panel
         ↓
ContentSyncService.syncFromChatDialog()
         ↓
Parameter panel receives synced content
         ↓
User modifies content in parameter panel
         ↓
ContentSyncService.syncToChatDialog() (optional)
         ↓
Chat dialog reflects changes
```

### 2. Generation Flow

```
User clicks "Generate" in parameter panel
         ↓
ResultsManager.addResult() creates pending result
         ↓
Generation service processes request
         ↓
ResultsManager.updateResult() with generated content
         ↓
Thumbnail generation (for media)
         ↓
Result appears in sidebar results area
         ↓
User clicks "Project to Canvas"
         ↓
Canvas block created with result content
```

### 3. State Management Flow

```
App.tsx (main state)
    ↓
ContentSyncService (sync state)
    ↓
ParameterPanel (parameter state)
    ↓
ResultsManager (results state)
    ↓
SidebarResultsArea (UI state)
```

## UI/UX Design

### 1. Parameter Panel Enhancements

**Content Sync Indicator**:
```tsx
{isSynced && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2 text-blue-700">
      <Sync size={16} />
      <span className="text-sm font-medium">
        {lang === 'zh' ? '内容已从对话框同步' : 'Content synced from chat dialog'}
      </span>
    </div>
  </div>
)}
```

**Enhanced Prompt Field**:
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">
    {t[lang].prompt}
    {isSynced && (
      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
        {lang === 'zh' ? '已同步' : 'Synced'}
      </span>
    )}
  </label>
  <textarea
    value={parameters.prompt}
    onChange={(e) => handleParameterChange('prompt', e.target.value)}
    className="w-full h-32 p-3 border rounded-lg resize-none"
    placeholder={t[lang].promptPlaceholder}
  />
</div>
```

### 2. Sidebar Results Area

**Results Grid Layout**:
```tsx
<div className="grid grid-cols-2 gap-3 p-4">
  {results.map(result => (
    <div key={result.id} className="relative group">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {result.type === 'image' && (
          <img src={result.thumbnail || result.content} className="w-full h-full object-cover" />
        )}
        {result.type === 'video' && (
          <video src={result.content} className="w-full h-full object-cover" muted />
        )}
        {result.type === 'text' && (
          <div className="p-2 text-xs overflow-hidden">
            {result.content.substring(0, 100)}...
          </div>
        )}
      </div>
      
      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={() => onProjectToCanvas(result.id)}
          className="px-3 py-1 bg-white text-black rounded text-sm font-medium"
        >
          {lang === 'zh' ? '投射到画布' : 'Project to Canvas'}
        </button>
      </div>
      
      {/* Status Indicator */}
      {result.status === 'generating' && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
      )}
    </div>
  ))}
</div>
```

### 3. Enhanced Sidebar Tabs

**New Tab Structure**:
```tsx
const sidebarTabs = [
  { id: 'chat', label: lang === 'zh' ? '对话' : 'Chat', icon: MessageSquare },
  { id: 'results', label: lang === 'zh' ? '结果' : 'Results', icon: Grid, badge: results.length },
  { id: 'caocao', label: '曹操', icon: Brain },
  { id: 'assembly', label: lang === 'zh' ? '组装' : 'Assembly', icon: Layers }
];
```

## API Integration

### 1. Modified Generation Pipeline

**Enhanced Generation Function**:
```typescript
const generateContentToResults = async (
  parameters: GenerationParameters,
  type: 'text' | 'image' | 'video',
  modelId: string,
  resultId: string
): Promise<void> => {
  try {
    // Update result status
    resultsManager.updateResult(resultId, { status: 'generating' });
    
    // Call existing generation service
    const result = await aiServiceAdapter.generate(type, {
      prompt: parameters.prompt,
      modelId,
      ...parameters
    });
    
    // Update result with generated content
    resultsManager.updateResult(resultId, {
      content: result.content,
      status: 'completed'
    });
    
    // Generate thumbnail for media
    if (type !== 'text') {
      const thumbnail = await generateThumbnail(result.content, type);
      resultsManager.updateResult(resultId, { thumbnail });
    }
    
  } catch (error) {
    resultsManager.updateResult(resultId, { 
      status: 'failed',
      content: error.message 
    });
    throw error;
  }
};
```

### 2. Canvas Projection Integration

**Project to Canvas Function**:
```typescript
const projectResultToCanvas = (resultId: string, position?: { x: number; y: number }) => {
  const result = resultsManager.getResult(resultId);
  if (!result) return;
  
  // Calculate position (center if not specified)
  const pos = position || {
    x: -pan.x / zoom + (window.innerWidth * 0.7) / (2 * zoom),
    y: -pan.y / zoom + window.innerHeight / (2 * zoom)
  };
  
  // Create new block with result content
  const newBlock = addBlock(result.type, result.content, pos.x, pos.y);
  
  if (newBlock) {
    // Apply original generation parameters
    setBlocks(prev => prev.map(b => 
      b.id === newBlock.id 
        ? { 
            ...b, 
            ...result.metadata.parameters,
            originalPrompt: result.metadata.prompt
          }
        : b
    ));
    
    showSuccess(
      lang === 'zh' ? '已投射到画布' : 'Projected to Canvas',
      lang === 'zh' ? '内容已添加到画布' : 'Content added to canvas'
    );
  }
};
```

## Storage Design

### 1. Results Persistence

**Local Storage Schema**:
```typescript
interface StoredResults {
  version: string;
  results: GenerationResult[];
  lastCleanup: number;
}

// Storage key: 'canvas-generation-results'
// Cleanup policy: Remove results older than 7 days
// Size limit: 100MB total storage
```

### 2. Thumbnail Generation

**Thumbnail Service**:
```typescript
class ThumbnailGenerator {
  // Generate image thumbnail
  async generateImageThumbnail(imageUrl: string): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = imageUrl;
    });
  }
  
  // Generate video thumbnail
  async generateVideoThumbnail(videoUrl: string): Promise<string> {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    return new Promise((resolve) => {
      video.onloadeddata = () => {
        video.currentTime = 1; // Capture at 1 second
      };
      
      video.onseeked = () => {
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(video, 0, 0, 200, 200);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      video.src = videoUrl;
    });
  }
}
```

## Performance Considerations

### 1. Lazy Loading
- Results area implements virtual scrolling for large result sets
- Thumbnails generated on-demand and cached
- Content sync operations debounced to prevent excessive updates

### 2. Memory Management
- Results storage implements LRU cache with size limits
- Thumbnails compressed and optimized for storage
- Cleanup policies remove old results automatically

### 3. State Optimization
- Content sync uses shallow comparison to prevent unnecessary re-renders
- Results updates use immutable patterns for efficient React updates
- Parameter panel state isolated to prevent global re-renders

## Error Handling

### 1. Content Sync Errors
- Graceful fallback when sync fails
- Clear error messages for sync conflicts
- Recovery mechanisms for corrupted sync state

### 2. Generation Errors
- Failed results marked with error status
- Retry mechanisms for transient failures
- Clear error display in results area

### 3. Storage Errors
- Fallback to memory-only storage when persistence fails
- Graceful degradation for storage quota exceeded
- Clear user feedback for storage issues

## Testing Strategy

### 1. Unit Tests
- Content sync service functionality
- Results manager operations
- Thumbnail generation
- Storage persistence

### 2. Integration Tests
- Parameter panel content sync flow
- Generation to results workflow
- Canvas projection functionality
- Cross-component state management

### 3. User Acceptance Tests
- Complete workflow from chat dialog to canvas
- Content sync accuracy and reliability
- Results management and organization
- Performance under various load conditions

## Migration Strategy

### 1. Backward Compatibility
- Existing parameter panel functionality preserved
- Gradual feature rollout with feature flags
- Fallback to original behavior if new features fail

### 2. Data Migration
- Existing generation history preserved
- Smooth transition for users with existing workflows
- Clear communication about new features

### 3. User Education
- In-app guidance for new workflow
- Documentation updates
- Progressive disclosure of advanced features

This design provides a comprehensive transformation of the parameter panel while maintaining system stability and user experience quality.