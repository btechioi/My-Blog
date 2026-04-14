# Infographic Structure Component Generation Specification

This file guides the generation of Structure component code conforming to framework specifications.

## Table of Contents
- Framework Core Concepts
- Structure Classification System
- Technical Specifications
- Code Generation Requirements
- Generation Process
- Reference Examples
- Output Format

## Framework Core Concepts

The infographic framework consists of three core parts:

- **Structure**: Responsible for overall layout and organization of data items
- **Title**: Optional title component
- **Item/Items**: Display component for single or multiple information units

Structure is the entry component that forms a complete infographic by combining Title and Item/Items with layout logic and interactive buttons. For hierarchical structures, use `Items` array to pass multiple components (e.g., root node component and child node components).

## Structure Classification System

Based on information organization characteristics, structures are divided into the following types:

1. **List Structures (list-*)**: Information items arranged side by side without obvious direction or hierarchy
   - Horizontal lists, vertical lists, grid lists, waterfall, etc.

2. **Comparison Structures (compare-*)**: Clear binary or multi-way comparison layouts
   - Left-right comparison, top-bottom comparison, multi-item comparison, mirrored comparison, etc.

3. **Sequence Structures (sequence-*)**: Information flow with clear direction and order
   - Timeline, step-by-step process, staircase, S-shaped process, etc.

4. **Hierarchy Structures (hierarchy-*)**: Tree-like, nested, or obvious primary-secondary relationship layouts
   - Tree, pyramid, radial, nested circles, etc.

5. **Relation Structures (relation-*)**: Display connections, dependencies, or interactions between elements
   - Network diagrams, matrices,循环 diagrams, Venn diagrams, etc.

6. **Geo Structures (geo-*)**: Information organization based on geographic space or physical location
   - Map markers, area distribution, route maps, etc.

7. **Chart Structures (chart-*)**: Quantitative data relationships displayed as charts
   - Bar charts, pie charts, line charts, radar charts, etc.

## Technical Specifications

### 1. Type Definitions

```tsx
export interface BaseStructureProps {
  Title?: ComponentType<Pick<TitleProps, 'title' | 'desc'>>;
  Item?: ComponentType<
    Omit<BaseItemProps, 'themeColors'> &
      Partial<Pick<BaseItemProps, 'themeColors'>>
  >;
  Items?: ComponentType<Omit<BaseItemProps, 'themeColors'>>[];
  data: Data;
  options: ParsedInfographicOptions;
}

export interface Data {
  title?: string;
  desc?: string;
  items: ItemDatum[];
  illus?: Record<string, string | ResourceConfig>;
  [key: string]: any;
}

export interface ItemDatum {
  icon?: string | ResourceConfig;
  label?: string;
  desc?: string;
  value?: number;
  illus?: string | ResourceConfig;
  children?: ItemDatum[];
  [key: string]: any;
}

export interface BaseItemProps {
  x?: number;
  y?: number;
  id?: string;
  indexes: number[];
  data: Data;
  datum: Data['items'][number];
  themeColors?: ThemeColors;
  positionH?: 'normal' | 'center' | 'flipped';
  positionV?: 'normal' | 'middle' | 'flipped';
  width?: number;
  height?: number;
  [key: string]: any;
}
```

**Important Notes**:

- For simple structures, use `Item` prop to pass a single component
- For hierarchical structures (like tree, pyramid, etc.), use `Items` array to pass multiple components; different levels can use different component styles
- `options` contains theme configuration, palette information, etc., accessible via utility functions
- `themeColors` is optional in `BaseItemProps`; some components pass it custom

### 2. Available Components

**Must select from the following components, do not use unlisted components:**

#### Atomic Components (import from ../../jsx)

All atomic components use `x`, `y`, `width`, `height` properties for positioning and sizing, do not use SVG native attributes like cx/cy/r.

- **Defs**: SVG definitions for gradients, filters, etc.

  ```tsx
  <Defs>{/* Gradient, filter definitions */}</Defs>
  ```

- **Ellipse**: Ellipse graphics

  ```tsx
  <Ellipse x={0} y={0} width={100} height={60} fill="blue" />
  // Note:
  // 1. x/y is top-left position, not center point
  // 2. Use width/height, not rx/ry
  // 3. When drawing circle, width equals height
  ```

- **Group**: Group container

  ```tsx
  <Group x={10} y={10}>
    {children}
  </Group>
  ```

- **Path**: Path graphics

  ```tsx
  <Path
    d="M 0 0 L 100 100"
    stroke="black"
    strokeWidth={2}
    width={100}
    height={100}
  />
  // width/height is estimated size for d
  ```

- **Rect**: Rectangle graphics

  ```tsx
  <Rect x={0} y={0} width={100} height={50} fill="red" />
  ```

- **Text**: Text element (supports wrapping)

  ```tsx
  <Text
    x={0}
    y={0}
    width={100}
    height={50}
    fontSize={14}
    fontWeight="normal" // or 'bold'
    alignHorizontal="center" // 'left' | 'center' | 'right'
    alignVertical="middle" // 'top' | 'middle' | 'bottom'
    fill="#000000"
  >
    Text Content
  </Text>
  // Note: Text content passed as children, not text attribute
  ```

- **Polygon**: Polygon
  ```tsx
  <Polygon
    points={[
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ]}
    fill="green"
  />
  // Note: points is object array {x, y}[], not string
  ```

#### Encapsulated Components (import from ../components)

- **BtnAdd**: Add button, needs indexes prop

  ```tsx
  <BtnAdd indexes={[0]} x={10} y={20} />
  ```

- **BtnRemove**: Remove button, needs indexes prop

  ```tsx
  <BtnRemove indexes={[0]} x={10} y={20} />
  ```

- **BtnsGroup**: Button group container

  ```tsx
  <BtnsGroup>{btnElements}</BtnsGroup>
  ```

- **ShapesGroup**

  Same as Group in attributes and usage, but internal graphics can be stylized

  ```tsx
  <ShapesGroup>
    <Rect width={100} height={100} />
    <Rect x={100} width={100} height={100} />
    <Rect x={200} width={100} height={100} />
  </ShapesGroup>
  ```

- **ItemsGroup**: Items group container

  ```tsx
  <ItemsGroup>{itemElements}</ItemsGroup>
  ```

- **Illus**: Illustration component (will be replaced with image or SVG)

  ```tsx
  <Illus x={0} y={0} width={200} height={150} />
  ```

- **Title**: Default title component

  ```tsx
  <Title title="Title" desc="Description" alignHorizontal="center" />
  ```

- **ItemLabel**: Item label

  ```tsx
  <ItemLabel indexes={[0]} x={0} y={0}>
    Label
  </ItemLabel>
  ```

- **ItemDesc**: Item description

  ```tsx
  <ItemDesc indexes={[0]} x={0} y={0}>
    Description
  </ItemDesc>
  ```

- **ItemIcon**: Item icon

  ```tsx
  <ItemIcon indexes={[0]} x={0} y={0} size={40} />
  ```

- **ItemValue**: Item value

  ```tsx
  <ItemValue indexes={[0]} value={100} x={0} y={0} />
  ```

- **ItemIconCircle**: Circular icon component
  ```tsx
  <ItemIconCircle indexes={[0]} x={0} y={0} size={50} fill="#000000" />
  ```

#### Decoration Components (import from ../decorations)

- **SimpleArrow**: Simple arrow decoration

  ```tsx
  <SimpleArrow
    x={0}
    y={0}
    width={25}
    height={25}
    colorPrimary="#000000"
    rotation={0} // Optional, rotation angle: 0, 90, 180, 270
  />
  ```

- **Triangle**: Triangle decoration
  ```tsx
  <Triangle
    x={0}
    y={0}
    width={10}
    height={8}
    rotation={0}
    colorPrimary="#000000"
  />
  ```

#### Definition Components (import from ../defs)

- **LinearGradient**: Linear gradient definition
  ```tsx
  <Defs>
    <LinearGradient
      id="my-gradient"
      startColor="#ff0000"
      stopColor="#0000ff"
      direction="left-right" // 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top'
    />
  </Defs>
  <Rect fill="url(#my-gradient)" />
  ```

**Native SVG Elements in Defs**:
Native SVG elements can be used inside `<Defs>`:

```tsx
<Defs>
  <linearGradient
    id="gradient-id"
    x1="0%"
    y1="0%"
    x2="100%"
    y2="100%"
    gradientUnits="userSpaceOnUse"
  >
    <stop offset="0%" stopColor="#ff0000" />
    <stop offset="100%" stopColor="#0000ff" />
  </linearGradient>
</Defs>
```

#### Layout Components (import from ../layouts)

- **FlexLayout**: Flexbox layout
  ```tsx
  <FlexLayout
    flexDirection="row" // 'row' | 'column' | 'row-reverse' | 'column-reverse'
    justifyContent="center" // 'flex-start' | 'flex-end' | 'center' | 'space-between'
    alignItems="center" // 'flex-start' | 'flex-end' | 'center'
    alignContent="center" // 'flex-start' | 'flex-end' | 'center' | 'space-between'
    flexWrap="wrap" // 'wrap' | 'nowrap'
    gap={20}
  >
    {children}
  </FlexLayout>
  ```

#### Stylized Rendering

Stylized rendering refers to transforming graphics into stylized graphics during rendering, such as hand-drawn style.

Graphics identified in the following ways can be stylized (implemented by renderer):

1. Add `data-element-type="shape"` attribute

```tsx
<Rect data-element-type="shape" width="100" height="100" />
```

2. Use ShapesGroup wrapper

```tsx
<ShapesGroup>
  <Rect width={100} height={100} />
  <Rect x={100} width={100} height={100} />
  <Rect x={200} width={100} height={100} />
</ShapesGroup>
```

> Stylized rendering only supports shape elements (like Path, Ellipse, Rect, Polygon, etc.), not text elements and groups

#### Utility Functions

**Layout Calculation Functions** (import from ../../jsx):

- **getElementBounds**: Get element bounds
  ```tsx
  const bounds = getElementBounds(<Rect width={100} height={50} />);
  // Returns: { x: number, y: number, width: number, height: number }
  ```

**Theme and Color Functions** (import from ../utils):

- **getPaletteColor**: Get color at specified index from palette
  ```tsx
  const color = getPaletteColor(options, [index]); // Returns color string
  ```

- **getPaletteColors**: Get complete palette color array
  ```tsx
  const palette = getPaletteColors(options); // Returns color array
  ```

- **getColorPrimary**: Get primary theme color
  ```tsx
  const colorPrimary = getColorPrimary(options); // Returns theme color string
  ```

- **getThemeColors**: Get theme configuration
  ```tsx
  const themeColors = getThemeColors(options.themeConfig);
  // Or custom configuration
  const themeColors = getThemeColors(
    {
      colorPrimary: '#FF356A',
      colorBg: '#ffffff',
    },
    options,
  );
  // Returns theme object containing colorText, colorPrimaryBg, etc.
  ```

**Data Processing Functions** (import from ../../utils):

- **getDatumByIndexes**: Get data item by indexes
  ```tsx
  const datum = getDatumByIndexes(items, [0, 1]); // Get nested data
  ```

**Component Selection Functions** (import from ../utils):

- **getItemComponent**: Get Item component for specified level (for Items array)
  ```tsx
  const ItemComponent = getItemComponent(Items, level);
  // Items is component array, level is level index
  // Returns last component if level exceeds array length
  ```

### 3. Import on Demand

```tsx
import type { ComponentType, JSXElement } from '../../jsx';
import {
  getElementBounds,
  Defs,
  Ellipse,
  Group,
  Path,
  Polygon,
  Rect,
  Text,
} from '../../jsx';
import {
  BtnAdd,
  BtnRemove,
  BtnsGroup,
  Illus,
  ItemDesc,
  ItemIcon,
  ItemIconCircle,
  ItemLabel,
  ItemsGroup,
  ItemValue,
  Title,
} from '../components';
import { LinearGradient } from '../defs';
import { SimpleArrow, Triangle } from '../decorations';
import { FlexLayout } from '../layouts';
import {
  getColorPrimary,
  getPaletteColor,
  getPaletteColors,
  getThemeColors,
  getItemComponent,
} from '../utils';
import { getDatumByIndexes } from '../../utils';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';
```

**Notes**:

- Only import components and functions actually used
- For hierarchical structures, remember to import `BaseItemProps` type if needed
- Import decoration and definition components on demand

Supported third-party libraries:

- **d3**: For force-directed layouts, hierarchical layouts, and complex layout calculations
- **lodash-es**: General utility functions
- **tinycolor2**: Color processing

> Can import other libraries as needed

### 4. Component Structure Templates

**Simple Structure Template** (using Item):

```tsx
export interface [StructureName]Props extends BaseStructureProps {
  gap?: number;
  // Other custom parameters
}

export const [StructureName]: ComponentType<[StructureName]Props> = (props) => {
  const { Title, Item, data, gap = 20, options } = props;
  const { title, desc, items = [] } = data;

  // 1. Handle title
  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  // 2. Get element sizes
  const btnBounds = getElementBounds(<BtnAdd indexes={[0]} />);
  const itemBounds = getElementBounds(
    <Item indexes={[0]} data={data} datum={items[0]} />
  );

  // 3. Prepare element arrays
  const btnElements: JSXElement[] = [];
  const itemElements: JSXElement[] = [];
  const decorElements: JSXElement[] = []; // Decor elements (arrows, lines, etc.)

  // 4. Iterate through data items to generate elements
  items.forEach((item, index) => {
    const indexes = [index];

    // Calculate position and add Item
    itemElements.push(
      <Item
        indexes={indexes}
        datum={item}
        data={data}
        x={/* calculate x */}
        y={/* calculate y */}
      />
    );

    // Add remove button
    btnElements.push(
      <BtnRemove
        indexes={indexes}
        x={/* calculate x */}
        y={/* calculate y */}
      />
    );

    // Add add button
    btnElements.push(
      <BtnAdd
        indexes={indexes}
        x={/* calculate x */}
        y={/* calculate y */}
      />
    );
  });

  // 5. Add trailing add button
  if (items.length > 0) {
    btnElements.push(
      <BtnAdd
        indexes={[items.length]}
        x={/* calculate x */}
        y={/* calculate y */}
      />
    );
  }

  // 6. Return layout
  return (
    <FlexLayout
      id="infographic-container"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {titleContent}
      <Group>
        <Group>{decorElements}</Group>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup>{btnElements}</BtnsGroup>
      </Group>
    </FlexLayout>
  );
};

registerStructure('[structure-name]', {
  component: [StructureName],
  composites: ['title', 'item'], // Fill based on components actually used
});
```

**Hierarchical Structure Template** (using Items array):

```tsx
export interface [StructureName]Props extends BaseStructureProps {
  gap?: number;
  // Other custom parameters
}

export const [StructureName]: ComponentType<[StructureName]Props> = (props) => {
  const { Title, Items, data, gap = 20, options } = props;
  const [RootItem, ChildItem] = Items; // Destructure to get different level components
  const { title, desc, items = [] } = data;

  const titleContent = Title ? <Title title={title} desc={desc} /> : null;

  const btnElements: JSXElement[] = [];
  const itemElements: JSXElement[] = [];

  // Get root and child item sizes
  const rootItemBounds = getElementBounds(
    <RootItem indexes={[0]} data={data} datum={items[0]} />
  );
  const childItemBounds = getElementBounds(
    <ChildItem indexes={[0, 0]} data={data} datum={items[0]?.children?.[0] || {}} />
  );

  // Iterate through root items
  items.forEach((rootItem, rootIndex) => {
    const { children = [] } = rootItem;

    // Render root item
    itemElements.push(
      <RootItem
        indexes={[rootIndex]}
        datum={rootItem}
        data={data}
        x={/* calculate x */}
        y={/* calculate y */}
      />
    );

    // Iterate through child items
    children.forEach((child, childIndex) => {
      itemElements.push(
        <ChildItem
          indexes={[rootIndex, childIndex]}
          datum={child}
          data={data}
          x={/* calculate x */}
          y={/* calculate y */}
        />
      );
    });
  });

  return (
    <FlexLayout
      id="infographic-container"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {titleContent}
      <Group>
        <ItemsGroup>{itemElements}</ItemsGroup>
        <BtnsGroup>{btnElements}</BtnsGroup>
      </Group>
    </FlexLayout>
  );
};

registerStructure('[structure-name]', {
  component: [StructureName],
  composites: ['title', 'item'], // Note: 'item' not 'items'
});
```

### 5. Component Declaration (composites)

**composites Field Description**:

When calling `registerStructure`, must provide `composites` array to declare which core components the structure uses. This helps the system understand the structure's composition and dependencies.

**composites Value Rules**:

Values in composites array should be lowercase strings:

1. **'title'** - Include when:
   - Uses `Title` prop component (from `props.Title`)
   - Directly accesses and renders `data.title` (e.g., using `<Text>{title}</Text>` or `<Text>{data.title}</Text>`)
   - Renders title data as UI element in any way

2. **'item'** - Include when:
   - Uses `Item` prop component (from `props.Item`)
   - Uses `Items` prop component array (from `props.Items`)
   - Note: Even when using `Items` (plural), should write `'item'` (singular) in composites

3. **'illus'** - Include when:
   - Uses `Illus` component (imported from `../components`)
   - Directly accesses and renders `data.illus` (e.g., via image or SVG elements)
   - Accesses `data.illus.xxx` and renders as UI

**Examples**:

```tsx
// Example 1: Using Title and Item props
registerStructure('list-row', {
  component: ListRow,
  composites: ['title', 'item'],
});

// Example 2: Rendering title in code, using Item prop
registerStructure('list-sector', {
  component: ListSector,
  composites: ['title', 'item'], // Although not using Title prop, renders data.title
});

// Example 3: Using Items array (hierarchical structure)
registerStructure('hierarchy-tree', {
  component: HierarchyTree,
  composites: ['title', 'item'], // Note: 'item' not 'items'
});

// Example 4: Using Title, Item, and Illus
registerStructure('some-structure', {
  component: SomeStructure,
  composites: ['title', 'item', 'illus'],
});
```

**Important Notes**:

- Values in composites array must be lowercase
- Even when using `Items` (plural), write `'item'` (singular)
- If structure directly renders a data field (like `data.title`), should declare it in composites even without using corresponding prop component
- composites array cannot be empty, must contain at least `['item']`

### 6. Key Constraints

**Strictly follow these rules:**

1. **Only use listed components**, do not import or use unlisted components (like Circle, Line, etc.)
2. **All shape components must use x/y/width/height for positioning**, do not use cx/cy/r/rx/ry etc. SVG native attributes
3. **Polygon's points must be object array** `{x: number, y: number}[]`, not string
4. **Text component's text content passed as children**, not using text attribute
5. **All button components must pass indexes array**
6. **Coordinate calculation must be based on getElementBounds return value**
7. **Based on Item's position and size to determine overall layout, avoid negative coordinate values**
8. **Decor elements (lines, arrows, etc.) should be in independent Group, placed before ItemsGroup**, ensure decor layer is below item layer
9. **When using Items array, get different level components via destructuring**, e.g., `const [RootItem, ChildItem] = Items`
10. **Some special structures can skip buttons** (like relation networks, quadrants, etc.), decide based on actual needs
11. **Use themes and palettes**:
    - Prefer using `getPaletteColor(options, indexes)` to get data item colors
    - Use `getColorPrimary(options)` to get primary color for decor elements
    - Use `getThemeColors` to get complete theme configuration
12. **Group supports transform attribute** for transformations, but use carefully
13. **Can use native SVG elements in Defs** (like `<linearGradient>`, `<stop>`) to create gradient effects
14. **For complex layout calculations**, can use d3's layout algorithms (like `d3.hierarchy`, `d3.tree`, `d3.forceSimulation`)
15. **Empty data handling**: When `items.length === 0`, should provide friendly empty state (like single add button)

### 7. Button Layout Principles

**BtnAdd (Add Button)**:

- Placed between two data items, indicating new item can be inserted here
- First BtnAdd is before first data item
- Last BtnAdd is after last data item
- indexes value is insertion position (e.g., insert before item 0, indexes=[0])

**BtnRemove (Remove Button)**:

- Placed near each data item, indicating item can be deleted
- indexes value is corresponding data item's index

**Position Calculation Examples**:

- **Horizontal layout**: BtnAdd horizontally centered below data item, BtnRemove directly below data item
- **Vertical layout**: BtnAdd above or below data item horizontally centered, BtnRemove on left or right side of data item
- **Other layouts**: Flexibly adjust based on visual balance and interaction convenience

### 8. Layout Calculation Points

- **Element size acquisition**: Use `getElementBounds()` to get element sizes for calculation
- **Coordinate system**: Positive to right, positive down
- **Item alignment**: `positionH` and `positionV` control internal element alignment
  - `positionH`: 'normal'(default design) | 'center'(horizontal center) | 'flipped'(flip layout)
  - `positionV`: 'normal'(default design) | 'middle'(vertical center) | 'flipped'(flip layout)
  - Example: For circular distribution, right side Item uses 'normal', left side uses 'flipped'
- **Item size constraints**: Some structures need to limit Item size, pass via `width` and `height` attributes
- **Layout methods**:
  - Simple layouts use `FlexLayout` for automatic centering and arrangement
  - Complex layouts manually calculate exact coordinates for each element
- **Decor element layer**: Decor elements (lines, arrows) should be in independent Group, placed before ItemsGroup
- **Prefer using d3 for complex layouts**:
  - Tree layout: `d3.tree()` or `d3.cluster()`
  - Force layout: `d3.forceSimulation()`
  - Hierarchical data: `d3.hierarchy()`

### 9. Naming Conventions

> Supported types: List, Compare, Sequence, hierarchy, relation, geo, chart

- **Component name**: PascalCase, e.g., `ListRow`, `CompareLeftRight`
- **Registration name**: lowercase-hyphen, consistent with classification prefix, e.g., `list-row`, `list-column`
- **Props interface**: Component name + `Props`, e.g., `ListRowProps`
- **Variable naming**: Use meaningful names, e.g., `itemElements`, `btnElements`, `decorElements`

### 10. Parameter Design Guidelines

**Common parameters and their defaults**:

- `gap`: Data item spacing, default 20-40 (for list, sequence structures)
- `rowGap` / `columnGap`: Row/column spacing
- `spacing`: Overall spacing, default 20-30
- `radius`: Circular layout radius, default 150-250
- `outerRadius` / `innerRadius`: Outer/inner radius (for ring layouts)
- `angle` / `startAngle` / `endAngle`: Angle related parameters
- `columns` / `rows`: Grid layout columns/rows, default 3-4
- `itemsPerRow`: Items per row, default 3
- `levelGap`: Level spacing, default 60-80
- `showAxis` / `showConnections`: Whether to show axis/connection lines, default true

**Parameter design principles**:

- All parameters should have reasonable default values
- Use optional parameter `?` to mark
- Parameter names should clearly express meaning
- Boolean parameters use `show*` / `enable*` prefix

## Code Generation Requirements

1. **Completeness**:
   - Generate complete runnable code, including all required imports, type definitions, and registration statements
   - Only import components and functions actually used
   - **Must include composites array in registerStructure call**, correctly declare used components

2. **Correctness**:
   - Ensure indexes array correctly passed to all required components
   - Accurate coordinate calculation, avoid element overlap or misalignment
   - Edge case handling (like empty items array provides friendly empty state)
   - Use `getElementBounds` to get accurate element sizes
   - Text component's text passed through children, not text attribute
   - **composites array must accurately reflect components actually used** (see "Component Declaration (composites)" section)

3. **Conciseness**:
   - Use meaningful but concise variable names
   - Avoid redundant calculations, reasonably reuse calculation results
   - Extract constants and configuration items

4. **Consistency**:
   - Follow example code style and patterns
   - Button layout logic matches structure type
   - Use utility functions for theme colors

5. **Extensibility**:
   - Reserve space for custom parameters, all parameters have reasonable default values
   - Support nested structures (when needed, access child items via datum.children)
   - Props interface inherits `BaseStructureProps`

6. **Performance optimization**:
   - Use `forEach` to iterate through data items, not `map`
   - Collect elements into arrays, render together

7. **Other requirements**:
   - No code comments (unless logic is particularly complex)
   - Don't use React features (like key, useEffect, etc.)
   - Array elements can be passed directly as children without key

## Generation Process

When user requests to generate a structure, follow these steps:

1. **Understand Requirements**:
   - Clarify layout type, characteristics, and purpose user wants
   - Understand data organization (flat, nested, hierarchical, etc.)
   - Confirm whether button interaction is needed

2. **Determine Classification**:
   - Based on information organization characteristics, classify into appropriate structure type
   - Select appropriate naming (follow naming conventions)

3. **Design Layout**:
   - Determine using Item or Items
   - Determine data item arrangement and alignment
   - Calculate position relationships of each element
   - Design decor elements (lines, arrows, etc.)
   - Design reasonable button positions (if needed)

4. **Write Code**:
   - Add JSX import directive
   - Import required components and functions
   - Define Props interface
   - Implement component logic
   - **Register structure (including composites array)**

5. **Verify Output**:
   - Check code completeness and correctness
   - Confirm all imports are correct
   - Confirm indexes passed correctly
   - Confirm coordinate calculation correct
   - **Confirm composites array accurately reflects used components**

## Reference Examples

### Example 1: Simple Horizontal List

**Requirements**: Data items arranged horizontally, equal spacing

**Implementation Points**:
- Use single Item component
- Each item's x coordinate = index × (itemWidth + gap)
- Use `positionH="center"` to center content
- BtnAdd between adjacent items, BtnRemove below each item

**Key Code Snippet**:

```tsx
items.forEach((item, index) => {
  const itemX = index * (itemBounds.width + gap);
  itemElements.push(
    <Item
      indexes={[index]}
      datum={item}
      data={data}
      x={itemX}
      positionH="center"
    />,
  );
});
```

### Example 2: Hierarchical Comparison Structure

**Requirements**: Two columns, each with root node and multiple child nodes

**Implementation Points**:
- Use Items array: `[RootItem, ChildItem]`
- Root nodes at fixed positions, child nodes arranged below
- Child nodes use different positionH (left column 'normal', right column 'flipped')

**Key Code Snippet**:

```tsx
const [RootItem, ChildItem] = Items;
items.forEach((rootItem, rootIndex) => {
  const { children = [] } = rootItem;
  itemElements.push(
    <RootItem indexes={[rootIndex]} datum={rootItem} data={data} />,
  );

  children.forEach((child, childIndex) => {
    itemElements.push(
      <ChildItem indexes={[rootIndex, childIndex]} datum={child} data={data} />,
    );
  });
});
```

### Example 3: Sequence Structure with Decors

**Requirements**: Horizontal process, arrows connecting between data items

**Implementation Points**:
- Use decor elements (SimpleArrow) to connect adjacent items
- Decor elements in independent Group, before ItemsGroup
- Use theme color for arrows

**Key Code Snippet**:

```tsx
const colorPrimary = getColorPrimary(options);
items.forEach((item, index) => {
  if (index < items.length - 1) {
    decorElements.push(
      <SimpleArrow
        x={itemX + itemBounds.width + (gap - arrowWidth) / 2}
        y={itemY + itemBounds.height / 2 - arrowHeight / 2}
        width={arrowWidth}
        height={arrowHeight}
        colorPrimary={colorPrimary}
      />,
    );
  }
});

return (
  <Group>
    <Group>{decorElements}</Group>
    <ItemsGroup>{itemElements}</ItemsGroup>
    <BtnsGroup>{btnElements}</BtnsGroup>
  </Group>
);
```

### Example 4: Circular Layout Using Palette

**Requirements**: Data items distributed in ring, each item uses different color

**Implementation Points**:
- Use trigonometric functions to calculate circular positions
- Use `getPaletteColor` to get each item's color
- Pass color through themeColors to Item

**Key Code Snippet**:

```tsx
items.forEach((item, index) => {
  const angle = (index * 2 * Math.PI) / items.length - Math.PI / 2;
  const itemX = centerX + radius * Math.cos(angle) - itemBounds.width / 2;
  const itemY = centerY + radius * Math.sin(angle) - itemBounds.height / 2;
  const color = getPaletteColor(options, [index]);

  itemElements.push(
    <Item
      indexes={[index]}
      datum={item}
      data={data}
      x={itemX}
      y={itemY}
      themeColors={getThemeColors({ colorPrimary: color }, options)}
    />,
  );
});
```

You can creatively design new layouts based on these patterns.

## Output Format

Generated code should be complete TypeScript file containing:

- **Type imports**: Import necessary types like `ComponentType`, `JSXElement`
- **Component imports**: Import atomic components, encapsulated components, decor components as needed
- **Utility function imports**: Import layout, theme, data processing utility functions
- **Props interface**: Inherit `BaseStructureProps`, define custom parameters
- **Component implementation**: Complete component logic
- **Structure registration**: Register component using `registerStructure`

**Code Style Requirements**:

- Use 2-space indentation
- Import statements grouped by type
- Variable declarations use `const`
- Arrow functions use concise syntax
- Appropriate blank lines to separate logic blocks

**Example Output**:

```tsx
import type { ComponentType, JSXElement } from '../../jsx';
import { getElementBounds, Group } from '../../jsx';
import { BtnAdd, BtnRemove, BtnsGroup, ItemsGroup } from '../components';
import { FlexLayout } from '../layouts';
import { registerStructure } from './registry';
import type { BaseStructureProps } from './types';

export interface ExampleProps extends BaseStructureProps {
  gap?: number;
}

export const Example: ComponentType<ExampleProps> = (props) => {
  // Component implementation
};

registerStructure('example', {
  component: Example,
  composites: ['title', 'item'], // Fill based on components actually used
});
```

---