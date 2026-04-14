# Infographic Syntax Generation Specification

This file guides the generation of plain text output conforming to AntV Infographic syntax specifications.

## Table of Contents
- Goals and Input/Output
- Syntax Structure
- Syntax Rules
- Template Selection
- Generation Process
- Output Format
- Common Issues and Best Practices

## Goals and Input/Output

- **Input**: User's text content or requirement description
- **Output**: A `plain` code block containing only Infographic syntax

## Syntax Structure

Infographic syntax consists of entry and block structure:

- **Entry**: `infographic <template-name>`
- **Blocks**: `data` / `theme`
  - Block hierarchy uses two-space indentation

## Syntax Rules

- First line must be `infographic <template-name>`, template selected from the list below
- Key-value pairs use "key value" (key, space, value)
- Arrays use "-" as item prefix (inline format only when explicitly requested by user)
- Common `data` fields:
  - `title`(string) / `desc`(string) / `items`(array)
- Common `data.items` fields:
  - `label`(string) / `value`(number) / `desc`(string) / `icon`(string) / `children`(array)
- Comparison templates (names starting with `compare-`) must construct exactly two root nodes, with all comparison items as children of these nodes
- `hierarchy-structure` template supports max 3 levels (root → group → item), and `data.items` order is top-to-bottom hierarchy order (first item at top)
- `theme` can use `theme <theme-name>`, or use block to customize `palette` etc; default theme if not specified, available theme names: `dark`, `hand-drawn`
- Icons use icon name directly (e.g., `mdi/chart-line`)
- Forbidden to output JSON, Markdown, or explanatory text

## Template Selection

**Selection Principles**:
- List-type information → `list-*`
- Sequential/process/phases → `sequence-*`
- Binary or multi-way comparison → `compare-*`
- Hierarchical relationships → `hierarchy-*`
- Data statistics → `chart-*`
- Quadrant → `quadrant-*`
- Relationships → `relation-*`

**Available Templates**:

- sequence-zigzag-steps-underline-text
- sequence-horizontal-zigzag-underline-text
- sequence-horizontal-zigzag-simple-illus
- sequence-circular-simple
- sequence-filter-mesh-simple
- sequence-mountain-underline-text
- sequence-cylinders-3d-simple
- sequence-color-snake-steps-horizontal-icon-line
- sequence-pyramid-simple
- sequence-funnel-simple
- sequence-roadmap-vertical-simple
- sequence-roadmap-vertical-plain-text
- sequence-zigzag-pucks-3d-simple
- sequence-ascending-steps
- sequence-ascending-stairs-3d-underline-text
- sequence-snake-steps-compact-card
- sequence-snake-steps-underline-text
- sequence-snake-steps-simple
- sequence-stairs-front-compact-card
- sequence-stairs-front-pill-badge
- sequence-timeline-simple
- sequence-timeline-rounded-rect-node
- sequence-timeline-simple-illus
- compare-binary-horizontal-simple-fold
- compare-hierarchy-left-right-circle-node-pill-badge
- compare-swot
- quadrant-quarter-simple-card
- quadrant-quarter-circular
- quadrant-simple-illus
- relation-circle-icon-badge
- relation-circle-circular-progress
- compare-binary-horizontal-badge-card-arrow
- compare-binary-horizontal-underline-text-vs
- hierarchy-tree-tech-style-capsule-item
- hierarchy-tree-curved-line-rounded-rect-node
- hierarchy-tree-tech-style-badge-card
- hierarchy-structure
- chart-column-simple
- chart-bar-plain-text
- chart-line-plain-text
- chart-pie-plain-text
- chart-pie-compact-card
- chart-pie-donut-plain-text
- chart-pie-donut-pill-badge
- chart-wordcloud
- list-grid-badge-card
- list-grid-candy-card-lite
- list-grid-ribbon-card
- list-row-horizontal-icon-arrow
- list-row-simple-illus
- list-sector-plain-text
- list-column-done-list
- list-column-vertical-icon-arrow
- list-column-simple-vertical-arrow
- list-zigzag-down-compact-card
- list-zigzag-down-simple
- list-zigzag-up-compact-card
- list-zigzag-up-simple

## Generation Process

1. Extract title, description, items, and hierarchy relationships from user content
2. Match structure type and select template
3. Organize `data`: provide necessary fields from `label/desc/value/icon` for each item
4. When user specifies style or color, add `theme`
5. Output pure syntax text in `plain` code block

## Output Format

Output only one `plain` code block, without any explanatory text:

```plain
infographic list-row-horizontal-icon-arrow
data
  title Title
  desc Description
  items
    - label Item
      value 12.5
      desc Explanation
      icon mdi/rocket-launch
theme
  palette
    - #3b82f6
    - #8b5cf6
    - #f97316
```

## Common Issues and Best Practices

- When information is insufficient, reasonable additions are acceptable, but avoid fabricating content unrelated to the topic
- `value` is numeric type; omit if no explicit value
- `children` is for hierarchical structure; avoid mismatching hierarchy and template type
- Output must strictly follow indentation rules for smooth rendering