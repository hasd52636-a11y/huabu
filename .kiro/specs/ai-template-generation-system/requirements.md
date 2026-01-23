# Requirements Document

## Introduction

The AI Template Generation System is a smart prompt generator that produces comprehensive AI prompts for generating Canvas platform template files. The system understands Canvas architecture, analyzes user ideas, and creates detailed prompts that can be used with any AI code generation tool to produce complete, importable Canvas templates with proper module connections and automation workflows.

## Glossary

- **Canvas_Platform**: The visual workflow platform with blocks, connections, and automation capabilities
- **Template_Generator**: The AI prompt generation system that creates comprehensive prompts
- **AI_Prompt**: A detailed instruction set for AI tools to generate Canvas templates
- **Module_Block**: Individual functional units in Canvas (text A01-A99, image B01-B99, video V01-V99)
- **Connection_System**: The linking mechanism between blocks using reference format [A01], [B01], etc.
- **Automation_Workflow**: Sequential execution system for connected blocks
- **Template_JSON**: The importable file format containing blocks, connections, and settings

## Requirements

### Requirement 1: Canvas Architecture Understanding

**User Story:** As a user, I want the AI prompt to understand Canvas platform architecture, so that generated templates follow proper structure and conventions.

#### Acceptance Criteria

1. THE Template_Generator SHALL include comprehensive Canvas platform knowledge in generated prompts
2. WHEN describing module types, THE Template_Generator SHALL specify text (A01-A99), image (B01-B99), and video (V01-V99) ranges
3. THE Template_Generator SHALL explain the connection system using [A01], [B01], [V01] reference format
4. THE Template_Generator SHALL include block properties (id, type, position, content, status, number)
5. THE Template_Generator SHALL include connection properties (id, fromId, toId, instruction, dataFlow)
6. THE Template_Generator SHALL specify template structure requirements (blocks, connections, settings, isAutomation, automationConfig)

### Requirement 2: User Idea Analysis

**User Story:** As a user, I want the AI prompt to analyze my workflow ideas, so that the generated template matches my intended functionality.

#### Acceptance Criteria

1. WHEN a user provides a workflow idea, THE Template_Generator SHALL create prompts that analyze user requirements
2. THE Template_Generator SHALL include instructions for identifying required module types
3. THE Template_Generator SHALL include guidance for determining logical block connections
4. THE Template_Generator SHALL include instructions for mapping user goals to Canvas functionality
5. THE Template_Generator SHALL include prompts for identifying automation opportunities

### Requirement 3: Comprehensive Template Generation

**User Story:** As a developer, I want the AI prompt to generate complete template JSON files, so that I can import them directly into Canvas.

#### Acceptance Criteria

1. THE Template_Generator SHALL create prompts that produce valid JSON template files
2. WHEN generating templates, THE AI_Prompt SHALL ensure all required properties are included
3. THE Template_Generator SHALL include instructions for proper block positioning and sizing
4. THE Template_Generator SHALL include guidance for creating meaningful block content
5. THE Template_Generator SHALL ensure generated templates are importable without modification

### Requirement 4: Module Type Support

**User Story:** As a user, I want support for all Canvas module types, so that I can create diverse workflow templates.

#### Acceptance Criteria

1. THE Template_Generator SHALL support text module generation (A01-A99 range)
2. THE Template_Generator SHALL support image module generation (B01-B99 range)
3. THE Template_Generator SHALL support video module generation (V01-V99 range)
4. WHEN generating video modules, THE Template_Generator SHALL include character integration options
5. THE Template_Generator SHALL support file attachment handling for applicable modules

### Requirement 5: Connection Logic

**User Story:** As a user, I want logical connections between modules, so that my workflow executes properly.

#### Acceptance Criteria

1. THE Template_Generator SHALL create prompts for establishing logical data flow between blocks
2. WHEN connecting blocks, THE AI_Prompt SHALL use proper reference format [A01], [B01], [V01]
3. THE Template_Generator SHALL include instructions for creating meaningful connection instructions
4. THE Template_Generator SHALL support enhanced connections with dataFlow properties
5. THE Template_Generator SHALL ensure connections create coherent workflow patterns

### Requirement 6: Automation Workflow Configuration

**User Story:** As a user, I want automation workflow support, so that my templates can execute sequentially.

#### Acceptance Criteria

1. THE Template_Generator SHALL include automation workflow configuration in generated prompts
2. WHEN creating automation workflows, THE AI_Prompt SHALL set isAutomation to true
3. THE Template_Generator SHALL include proper automationConfig structure
4. THE Template_Generator SHALL support sequential execution patterns
5. THE Template_Generator SHALL include guidance for automation best practices

### Requirement 7: Template Validation

**User Story:** As a developer, I want generated templates to be valid, so that they import successfully into Canvas.

#### Acceptance Criteria

1. THE Template_Generator SHALL include validation instructions in generated prompts
2. THE AI_Prompt SHALL ensure all required JSON properties are present
3. THE Template_Generator SHALL include instructions for proper data type validation
4. THE Template_Generator SHALL ensure block IDs are unique and properly formatted
5. THE Template_Generator SHALL validate connection references point to existing blocks

### Requirement 8: Workflow Pattern Library

**User Story:** As a user, I want access to proven workflow patterns, so that I can create effective templates.

#### Acceptance Criteria

1. THE Template_Generator SHALL include examples of successful workflow patterns
2. THE Template_Generator SHALL provide guidance for common use cases
3. THE Template_Generator SHALL include best practices for module combinations
4. THE Template_Generator SHALL support flexible template customization
5. THE Template_Generator SHALL include pattern variations for different scenarios

### Requirement 9: AI Tool Compatibility

**User Story:** As a user, I want to use the prompt with any AI tool, so that I'm not limited to specific platforms.

#### Acceptance Criteria

1. THE Template_Generator SHALL create prompts compatible with Claude, ChatGPT, and other AI tools
2. THE AI_Prompt SHALL be self-contained with all necessary context
3. THE Template_Generator SHALL avoid platform-specific instructions
4. THE Template_Generator SHALL use clear, universal prompt formatting
5. THE Template_Generator SHALL include comprehensive examples within the prompt

### Requirement 10: Template Import Compatibility

**User Story:** As a user, I want generated templates to import seamlessly, so that I can use them immediately in Canvas.

#### Acceptance Criteria

1. THE Template_Generator SHALL ensure compatibility with existing template import system
2. THE AI_Prompt SHALL generate templates matching Canvas JSON schema
3. THE Template_Generator SHALL include proper canvas settings (zoom, pan)
4. THE Template_Generator SHALL ensure block positioning prevents overlaps
5. THE Template_Generator SHALL maintain consistency with Canvas platform conventions