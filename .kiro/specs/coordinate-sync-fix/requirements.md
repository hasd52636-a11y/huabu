# Requirements Document

## Introduction

The shared viewer page currently displays modules at incorrect positions compared to the main screen due to coordinate system inconsistencies. This creates a poor user experience with significant blank spaces and misaligned content. The system needs to synchronize coordinate systems between the main Canvas component and the ShareKitViewerPage component to ensure identical visual positioning.

## Glossary

- **Main_Canvas**: The primary Canvas component used in the main application for editing and viewing modules
- **Shared_Viewer**: The ShareKitViewerPage component used for displaying shared content to viewers
- **Module**: A content block (text, image, or video) displayed on the canvas
- **Container_Transform**: The CSS transform applied to the canvas container for pan and zoom operations
- **Block_Transform**: The CSS transform applied to individual modules for positioning and centering
- **Coordinate_System**: The mathematical system used to position modules on the canvas

## Requirements

### Requirement 1: Container Transform Consistency

**User Story:** As a viewer, I want the shared view to use the same container coordinate system as the main screen, so that modules appear at identical relative positions.

#### Acceptance Criteria

1. WHEN the shared viewer renders the canvas container, THE Shared_Viewer SHALL apply the same transform pattern as Main_Canvas
2. THE Shared_Viewer SHALL use `transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom})` with `transformOrigin: '0 0'`
3. THE Shared_Viewer SHALL maintain identical transform application order as Main_Canvas
4. WHEN pan and zoom values are received, THE Shared_Viewer SHALL apply them without modification to the container

### Requirement 2: Block Positioning Synchronization

**User Story:** As a viewer, I want modules to appear centered at their exact coordinates, so that the layout matches the main screen perfectly.

#### Acceptance Criteria

1. WHEN rendering individual modules, THE Shared_Viewer SHALL apply `transform: translate(-50%, -50%)` to each module
2. THE Shared_Viewer SHALL position modules using `left: block.x, top: block.y` coordinates
3. WHEN a module is positioned, THE Shared_Viewer SHALL center it at the specified coordinates using the centering transform
4. THE Shared_Viewer SHALL maintain identical block positioning logic as Main_Canvas

### Requirement 3: Container Padding Elimination

**User Story:** As a viewer, I want the shared view to eliminate extra padding offsets, so that there are no unwanted blank spaces.

#### Acceptance Criteria

1. WHEN the shared viewer container is rendered, THE Shared_Viewer SHALL remove the `pt-16` (64px) top padding from the canvas area
2. THE Shared_Viewer SHALL ensure the canvas container starts at the top edge without additional offsets
3. WHEN calculating module positions, THE Shared_Viewer SHALL not apply any additional padding compensation
4. THE Shared_Viewer SHALL maintain the header bar separately from the canvas coordinate system

### Requirement 4: Visual Consistency Validation

**User Story:** As a user comparing main screen and shared view, I want identical module positioning, so that the shared view accurately represents the original layout.

#### Acceptance Criteria

1. WHEN comparing main screen and shared view, ALL modules SHALL appear at identical relative positions
2. WHEN pan and zoom operations are applied, THE coordinate relationships SHALL remain consistent between views
3. WHEN connection lines are rendered, THEY SHALL align properly with module positions in shared view
4. THE Shared_Viewer SHALL display no extra blank space on top or left sides compared to main screen

### Requirement 5: Transform Order Preservation

**User Story:** As a developer, I want the transform application order to be identical between components, so that coordinate calculations remain consistent.

#### Acceptance Criteria

1. THE Shared_Viewer SHALL apply container transforms before block transforms
2. WHEN rendering the canvas, THE Shared_Viewer SHALL use the same CSS transform hierarchy as Main_Canvas
3. THE Shared_Viewer SHALL maintain `transformOrigin: '0 0'` for the container transform
4. WHEN multiple transforms are applied, THE Shared_Viewer SHALL preserve the exact order used in Main_Canvas