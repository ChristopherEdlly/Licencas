---
name: designCascadingFilters
description: Design a cascading filter system with hierarchical auto-population and granular removal.
argument-hint: Describe the hierarchy levels and filtering requirements
---
Help me design and implement a cascading filter system for hierarchical data.

## Context
I have data organized in a parent-child hierarchy (e.g., Organization > Department > Team > Employee) where:
- Users need to filter by any level of the hierarchy
- The data source only contains the most specific level (leaf nodes)
- Users should be able to select a parent and automatically include all children
- Users should be able to remove specific children while keeping others

## Requirements
1. **Auto-population**: When selecting a parent level, automatically populate the child filter fields with all corresponding children
2. **Cascading removal**: When removing a mid-level item, automatically remove its children from lower-level filters
3. **Granular control**: Allow users to manually remove specific items from any level
4. **Maintain existing UI**: Keep separate filter controls for each hierarchy level

## Design Considerations
- How should the filters visually indicate auto-populated vs manually selected items?
- Should removing all children of a parent automatically remove the parent?
- How to handle the synchronization between filter levels?
- What happens when a user adds back a previously removed item?

## Expected Behavior Example
1. User selects "Department A" → automatically adds all Teams and Employees under Department A
2. User removes "Team X" from the Teams filter → automatically removes all Team X employees from the Employees filter
3. Result: All of Department A except Team X and its members

Please help me:
1. Plan the data flow and state management
2. Implement the cascading logic
3. Handle edge cases and synchronization
