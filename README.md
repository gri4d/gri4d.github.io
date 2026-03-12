<img src="https://gri4d.github.io/logo.jpg" width="240"></img>

# GRiiiiD

GRiiiiD (or gri4d) is a virtual grid library for web frontend.

## Name

It's based off japanese singing group GReeeeN (they are now called GRe4N Boyz).

## Features

- Virtual grid, with or without grouping, with or without sticky headers for each group
- Use browser window, HTML element, or provide size (height/width) to use as viewport/scroll container

## Limitations (for now)

- Fixed row size
- Properly handle grid total size over 8 million pixels (buggy in some browsers due to limitations)

## Demo

<a href="https://gri4d.github.io/react" target="_blank">Demo</a>

## Install

### CDN (iife)

```
<script src="https://unpkg.com/@gri4d/griiiid"></script>
```

### NPM

```
npm i -S @gri4d/griiiid
```

## How to Use

### Options (same for iife/esm)

```javascript
export interface GRi4DGroupType {
  title?: string;
  // optional data to pass with item, accessed with data[itemIndex]
  data?: any;
  items: any;
}

export interface GRi4DViewportOptions {
  height: number | string;
  width?: number | string;
  className?: string;
}

export interface GRi4DGroupHeaderProps {
  height: number;
  renderer: (group: GRi4DGroupType, groupIndex: number) => HTMLElement;
}

export interface GRi4DItemsRowProps {
  height: number;
  columns: number;
  renderer: (item: any, itemIndex: number, data?: any) => HTMLElement;
}

interface GRi4DOptions {
  // [mount elements]
  // - "viewport": scroll event listener is added to this
  // - defaults to window if not provided
  // - "mountPoint": actual grid is appended to this
  viewport?: HTMLElement | Window | GRi4DViewportOptions;
  mountPoint: HTMLElement;

  // [sizing and positioning]
  // - "spacing": applied vertically after each group header and row of items
  // and horizontally between each item in a row
  // - "stickyTop": optional number to sticky position of
  // grid if page has fixed header and such
  spacing: number;
  stickyTop?: number;

  // options for sticky group headers
  // will not be rendered if this is not provided
  groupHeader?: GRi4DGroupHeaderProps;

  // required props for rendering items row
  itemsRow: GRi4DItemsRowProps;

  // [required data]
  groups: GRi4DGroupType[];
}
```

### IIFE

```javascript
const gri4d = new GRi4D(options); // initialize
gri4d.reset(options); // call reset if options have changed
gri4d.destroy(); // cleanup when done
```

### ESM

```javascript
import GRi4D from "gri4d/griiiid";
const gri4d = new GRi4D(options);
gri4d.reset(options); // call reset if options have changed
gri4d.destroy(); // cleanup when done
```
