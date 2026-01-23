# Design Document: AI Template Generation System

## Overview

The AI Template Generation System is a sophisticated prompt generator that creates comprehensive AI prompts for generating Canvas platform template files. The system produces a single, self-contained prompt that users can copy and use with any AI code generation tool (Claude, ChatGPT, etc.) to automatically generate complete, importable Canvas templates.

The system addresses the complexity of Canvas platform architecture by encoding deep knowledge about module types, connection patterns, automation workflows, and template structures into a comprehensive prompt that guides AI tools to produce valid, functional templates.

## Architecture

### Core Components

```mermaid
graph TB
    A[User Input] --> B[AI Template Generator]
    B --> C[Canvas Knowledge Base]
    B --> D[Template Structure Engine]
    B --> E[Workflow Pattern Library]
    B --> F[Validation Rules Engine]
    
    C --> G[Comprehensive AI Prompt]
    D --> G
    E --> G
    F --> G
    
    G --> H[AI Tool (Claude/ChatGPT)]
    H --> I[Generated Template JSON]
    I --> J[Canvas Platform Import]
```

### System Architecture Layers

1. **Knowledge Layer**: Canvas platform architecture understanding
2. **Pattern Layer**: Workflow patterns and best practices
3. **Generation Layer**: Prompt construction and optimization
4. **Validation Layer**: Template structure validation rules
5. **Output Layer**: AI-compatible prompt formatting

## Components and Interfaces

### 1. Canvas Knowledge Base

**Purpose**: Encodes comprehensive Canvas platform knowledge into the AI prompt

**Key Knowledge Areas**:
- Module type specifications (A01-A99, B01-B99, V01-V99)
- Block property schemas and requirements
- Connection system mechanics and reference format
- Automation workflow configuration
- Template JSON structure requirements

**Interface**:
```typescript
interface CanvasKnowledgeBase {
  moduleTypes: ModuleTypeDefinition[];
  blockSchema: BlockPropertySchema;
  connectionSchema: ConnectionPropertySchema;
  templateSchema: TemplateStructureSchema;
  automationConfig: AutomationConfigSchema;
}

interface ModuleTypeDefinition {
  type: 'text' | 'image' | 'video';
  range: string; // e.g., "A01-A99"
  properties: string[];
  capabilities: string[];
  examples: string[];
}
```

### 2. Template Structure Engine

**Purpose**: Defines and validates Canvas template JSON structure

**Core Responsibilities**:
- Template schema definition and validation
- Block positioning and sizing logic
- Connection reference validation
- Automation configuration structure

**Interface**:
```typescript
interface TemplateStructureEngine {
  generateTemplateSchema(): TemplateSchema;
  validateBlockPositioning(blocks: Block[]): ValidationResult;
  validateConnections(connections: Connection[], blocks: Block[]): ValidationResult;
  generateAutomationConfig(isAutomation: boolean): AutomationConfig;
}

interface TemplateSchema {
  blocks: BlockSchema[];
  connections: ConnectionSchema[];
  settings: CanvasSettings;
  isAutomation?: boolean;
  automationConfig?: AutomationConfig;
}
```

### 3. Workflow Pattern Library

**Purpose**: Provides proven workflow patterns and best practices

**Pattern Categories**:
- Sequential workflows (A01 → B01 → V01)
- Parallel processing patterns
- Content transformation chains
- Multi-modal workflows
- Automation-optimized patterns

**Interface**:
```typescript
interface WorkflowPatternLibrary {
  getPatternsByCategory(category: WorkflowCategory): WorkflowPattern[];
  getRecommendedPatterns(userIdea: string): WorkflowPattern[];
  generatePatternExamples(): PatternExample[];
}

interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  blocks: BlockTemplate[];
  connections: ConnectionTemplate[];
  useCase: string;
  complexity: 'simple' | 'medium' | 'complex';
}
```

### 4. Validation Rules Engine

**Purpose**: Ensures generated templates meet Canvas platform requirements

**Validation Categories**:
- JSON structure validation
- Block property completeness
- Connection reference integrity
- Automation configuration validity
- Import compatibility checks

**Interface**:
```typescript
interface ValidationRulesEngine {
  validateTemplate(template: CanvasTemplate): ValidationResult;
  validateBlocks(blocks: Block[]): BlockValidationResult[];
  validateConnections(connections: Connection[], blocks: Block[]): ConnectionValidationResult[];
  validateAutomationConfig(config: AutomationConfig): AutomationValidationResult;
}
```

### 5. Prompt Generation Engine

**Purpose**: Constructs the comprehensive AI prompt from all components

**Core Functions**:
- Knowledge integration and formatting
- Pattern example generation
- Validation rule embedding
- AI tool compatibility optimization

**Interface**:
```typescript
interface PromptGenerationEngine {
  generateComprehensivePrompt(): string;
  formatCanvasKnowledge(knowledge: CanvasKnowledgeBase): string;
  formatWorkflowPatterns(patterns: WorkflowPattern[]): string;
  formatValidationRules(rules: ValidationRule[]): string;
  optimizeForAITool(prompt: string, tool: 'claude' | 'chatgpt' | 'universal'): string;
}
```

## Data Models

### Canvas Template Structure

```typescript
interface CanvasTemplate {
  blocks: Block[];
  connections: EnhancedConnection[];
  settings: {
    zoom: number;
    pan: { x: number; y: number };
  };
  isAutomation?: boolean;
  automationConfig?: AutomationConfig;
}

interface Block {
  id: string;
  type: 'text' | 'image' | 'video';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  status: 'idle' | 'processing' | 'error';
  number: string; // e.g., "A01", "B02", "V03"
  fontSize?: number;
  textColor?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  duration?: '10' | '15' | '25';
  characterId?: string;
  characterUrl?: string;
  characterTimestamps?: string;
  attachmentContent?: string;
  attachmentFileName?: string;
  originalPrompt?: string;
}

interface EnhancedConnection {
  id: string;
  fromId: string;
  toId: string;
  instruction: string;
  dataFlow: {
    enabled: boolean;
    lastUpdate: number;
    dataType: 'text' | 'image' | 'video';
    lastData?: string;
  };
}

interface AutomationConfig {
  mode: 'conservative' | 'standard' | 'fast';
  pauseOnError: boolean;
  enableSmartInterval: boolean;
}
```

### Workflow Pattern Models

```typescript
interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  blocks: BlockTemplate[];
  connections: ConnectionTemplate[];
  automationSupport: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  useCase: string;
  tags: string[];
}

interface BlockTemplate {
  type: 'text' | 'image' | 'video';
  number: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  defaultContent: string;
  properties: Record<string, any>;
}

interface ConnectionTemplate {
  from: string;
  to: string;
  instruction: string;
  dataFlowEnabled: boolean;
}

type WorkflowCategory = 
  | 'content-creation'
  | 'media-transformation'
  | 'automation-workflow'
  | 'multi-modal'
  | 'sequential-processing'
  | 'parallel-processing';
```

### AI Prompt Structure

```typescript
interface AIPromptStructure {
  introduction: string;
  canvasKnowledge: CanvasKnowledgeSection;
  workflowPatterns: WorkflowPatternSection;
  templateExamples: TemplateExampleSection;
  validationRules: ValidationRuleSection;
  generationInstructions: GenerationInstructionSection;
  outputFormat: OutputFormatSection;
}

interface CanvasKnowledgeSection {
  moduleTypes: string;
  blockProperties: string;
  connectionSystem: string;
  automationFeatures: string;
  templateStructure: string;
}
```

Now I'll use the prework tool to analyze the acceptance criteria before writing the Correctness Properties section.

<function_calls>
<invoke name="prework">
<parameter name="featureName">ai-template-generation-system

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas Knowledge Completeness
*For any* generated AI prompt, it should contain comprehensive Canvas platform knowledge including module type ranges (A01-A99, B01-B99, V01-V99), block properties (id, type, position, content, status, number), connection properties (id, fromId, toId, instruction, dataFlow), and template structure requirements (blocks, connections, settings, isAutomation, automationConfig)
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: User Requirement Analysis Instructions
*For any* generated AI prompt, it should include comprehensive instructions for analyzing user workflow ideas, identifying required module types, determining logical block connections, mapping user goals to Canvas functionality, and identifying automation opportunities
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Template Generation Completeness
*For any* generated AI prompt, it should include instructions that ensure AI tools produce valid JSON template files with all required properties, proper block positioning and sizing, meaningful block content, and importability without modification
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: Module Type Support Completeness
*For any* generated AI prompt, it should document support for all Canvas module types including text modules (A01-A99), image modules (B01-B99), video modules (V01-V99), character integration for video modules, and file attachment handling
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Connection Logic Instructions
*For any* generated AI prompt, it should include instructions for establishing logical data flow between blocks, using proper reference format [A01], [B01], [V01], creating meaningful connection instructions, supporting enhanced connections with dataFlow properties, and ensuring coherent workflow patterns
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Automation Workflow Configuration
*For any* generated AI prompt, it should include automation workflow configuration documentation, instructions to set isAutomation to true for automation workflows, proper automationConfig structure, sequential execution pattern support, and automation best practices guidance
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 7: Validation Instruction Completeness
*For any* generated AI prompt, it should include comprehensive validation instructions covering JSON structure validation, required property inclusion, data type validation, unique block ID formatting, and connection reference integrity
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 8: Workflow Pattern Library Inclusion
*For any* generated AI prompt, it should include examples of successful workflow patterns, guidance for common use cases, best practices for module combinations, flexible template customization support, and pattern variations for different scenarios
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 9: AI Tool Compatibility
*For any* generated AI prompt, it should be compatible with Claude, ChatGPT, and other AI tools, be self-contained with all necessary context, avoid platform-specific instructions, use clear universal formatting, and include comprehensive examples
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 10: Canvas Import Compatibility
*For any* generated AI prompt, it should ensure compatibility with existing template import systems, instruct AI tools to match Canvas JSON schema, include proper canvas settings (zoom, pan), ensure block positioning prevents overlaps, and maintain consistency with Canvas platform conventions
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

## Error Handling

### Error Categories

1. **Prompt Generation Errors**
   - Missing knowledge components
   - Incomplete pattern libraries
   - Invalid template structures
   - Formatting inconsistencies

2. **AI Tool Compatibility Errors**
   - Platform-specific instructions
   - Context length limitations
   - Formatting incompatibilities
   - Missing examples or guidance

3. **Template Validation Errors**
   - Invalid JSON structure
   - Missing required properties
   - Incorrect block positioning
   - Invalid connection references

4. **Canvas Import Errors**
   - Schema mismatches
   - Incompatible property values
   - Missing automation configuration
   - Block overlap conflicts

### Error Recovery Strategies

1. **Graceful Degradation**: Provide fallback patterns when specific knowledge is unavailable
2. **Validation Feedback**: Include self-validation instructions in the generated prompt
3. **Iterative Refinement**: Support prompt refinement based on generation results
4. **Comprehensive Examples**: Provide multiple working examples to guide AI tools

### Error Prevention

1. **Knowledge Base Validation**: Ensure all Canvas knowledge is current and complete
2. **Pattern Testing**: Validate workflow patterns against actual Canvas imports
3. **Cross-Platform Testing**: Test generated prompts with multiple AI tools
4. **Schema Compliance**: Maintain strict adherence to Canvas JSON schema

## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Specific prompt generation scenarios
- Individual knowledge component validation
- Template structure validation
- Error handling verification

**Property Tests**: Verify universal properties across all inputs
- Prompt completeness across different user inputs
- Knowledge inclusion consistency
- Template generation reliability
- Cross-platform compatibility

### Property-Based Testing Configuration

- **Testing Library**: Use QuickCheck for JavaScript/TypeScript or Hypothesis for Python
- **Minimum Iterations**: 100 iterations per property test
- **Test Tags**: Each property test must reference its design document property
- **Tag Format**: **Feature: ai-template-generation-system, Property {number}: {property_text}**

### Testing Categories

1. **Prompt Generation Testing**
   - Knowledge completeness validation
   - Pattern library inclusion verification
   - Template structure accuracy
   - AI tool compatibility checks

2. **Template Validation Testing**
   - JSON schema compliance
   - Block property completeness
   - Connection reference integrity
   - Automation configuration validity

3. **Integration Testing**
   - End-to-end prompt generation to template import
   - Cross-platform AI tool compatibility
   - Canvas platform import verification
   - Workflow pattern execution validation

4. **Performance Testing**
   - Prompt generation speed
   - Memory usage optimization
   - Large template handling
   - Concurrent generation support

### Test Data Management

1. **Canvas Knowledge Fixtures**: Maintain up-to-date Canvas platform specifications
2. **Pattern Libraries**: Curated collection of proven workflow patterns
3. **Template Examples**: Validated template JSON files for comparison
4. **User Input Scenarios**: Diverse workflow ideas for testing prompt generation