// src/index.ts
var VisibleRanges = class {
  visibleRanges;
  constructor(visibleRanges) {
    this.visibleRanges = [...visibleRanges];
  }
  get(index) {
    return this.visibleRanges[index];
  }
  findFirstVisibleIndex(minY) {
    let low = 0;
    let high = this.visibleRanges.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.visibleRanges[mid].bottom < minY) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }
  findLastVisibleIndex(maxY) {
    let low = 0;
    let high = this.visibleRanges.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (this.visibleRanges[mid].top < maxY) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }
};
var GRi4D = class {
  options;
  wrapperElement;
  gridContainerElement;
  visibleGroups = /* @__PURE__ */ new Map();
  groupVisibleRanges;
  constructor(options) {
    this.reset(options);
  }
  reset(options) {
    this.options = {
      stickyTop: 0,
      ...this.options,
      ...options
    };
    const {
      groups,
      numCols,
      groupHeaderHeight,
      spacing,
      rowHeight,
      viewport,
      mountPoint,
      stickyTop = 0
    } = this.options;
    const vpIsWindow = this.getViewportType() === 0 /* Window */;
    const groupVisibleRanges = [];
    let y = 0;
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const top = y;
      const bottom = y + this.getGroupTotalHeight(groupIndex);
      groupVisibleRanges.push({
        top,
        bottom
      });
      y = bottom;
    }
    const gridHeight = y > 0 ? y + spacing + (vpIsWindow ? 0 : stickyTop) : 0;
    this.groupVisibleRanges = new VisibleRanges(groupVisibleRanges);
    if (!this.gridContainerElement) {
      this.wrapperElement = document.createElement("div");
      this.wrapperElement.style.position = "relative";
      this.gridContainerElement = document.createElement("div");
      this.wrapperElement.appendChild(this.gridContainerElement);
    }
    mountPoint.appendChild(this.wrapperElement);
    if (this.getViewportType() === 2 /* Options */) {
      const {
        height: vpHeight,
        width: vpWidth,
        className: vpClassName
      } = viewport;
      this.wrapperElement.style.height = typeof vpHeight === "number" ? `${vpHeight}px` : vpHeight;
      this.wrapperElement.style.overflow = "auto";
      if (vpWidth !== void 0) {
        this.wrapperElement.style.width = typeof vpWidth === "number" ? `${vpWidth}px` : vpWidth;
      }
      if (vpClassName !== void 0) {
        this.wrapperElement.className = vpClassName;
      }
    } else {
      this.wrapperElement.style = "position: relative";
    }
    Object.assign(this.gridContainerElement.style, {
      height: gridHeight + "px",
      position: "relative",
      willChange: "clip-path",
      transform: "translateZ(0)",
      zIndex: 0
    });
    clearTimeout(this.resizeTimeout);
    window.removeEventListener("resize", this.onResize);
    window.addEventListener("resize", this.onResize);
    const scrollListener = this.getViewportElement();
    scrollListener.removeEventListener("scroll", this.onScroll);
    scrollListener.addEventListener("scroll", this.onScroll);
    for (let [groupKey] of this.visibleGroups) {
      this.visibleGroups.delete(groupKey);
    }
    this.gridContainerElement.innerHTML = "";
    this.update();
  }
  destroy() {
    window.removeEventListener("resize", this.onResize);
    const scrollListener = this.getViewportElement();
    scrollListener?.removeEventListener("scroll", this.onScroll);
    this.wrapperElement?.remove();
  }
  ticking = false;
  onScroll = () => {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.update();
        this.ticking = false;
      });
      this.ticking = true;
    }
  };
  resizeTimeout = -1;
  onResize = () => {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => {
      this.update();
    }, 100);
  };
  getViewportType() {
    const { viewport } = this.options;
    if (viewport instanceof HTMLElement) {
      return 1 /* Element */;
    }
    if (viewport && typeof viewport.height === "number") {
      return 2 /* Options */;
    }
    return 0 /* Window */;
  }
  getViewportElement() {
    const viewportType = this.getViewportType();
    if (viewportType === 1 /* Element */) {
      return this.options.viewport;
    }
    if (viewportType === 2 /* Options */) {
      return this.wrapperElement;
    }
    return window;
  }
  getViewportRange() {
    let { viewport, mountPoint, stickyTop = 0 } = this.options;
    const viewportType = this.getViewportType();
    let top = 0;
    let height = 0;
    if (viewportType === 0 /* Window */) {
      const vpRelTop = this.getViewportRelativeTop();
      const clipHeight = Math.max(stickyTop, vpRelTop);
      top = -vpRelTop + clipHeight;
      height = window.innerHeight - clipHeight;
    } else {
      if (viewportType === 2 /* Options */) {
        viewport = this.wrapperElement;
      }
      const rect = viewport.getBoundingClientRect();
      top = viewport.scrollTop;
      height = rect.bottom - rect.top;
    }
    return { top, bottom: top + height };
  }
  getViewportRelativeTop() {
    const gridBoundRect = this.gridContainerElement.getBoundingClientRect();
    if (this.getViewportType() === 0 /* Window */) {
      return gridBoundRect.top;
    }
    const vpElement = this.getViewportElement();
    const vpBoundRect = vpElement.getBoundingClientRect();
    return gridBoundRect.top - vpBoundRect.top;
  }
  getGroupTotalHeight(groupIndex) {
    const { groups, numCols, groupHeaderHeight, spacing, rowHeight } = this.options;
    const group = groups[groupIndex];
    const groupNumRows = Math.ceil(group.items.length / numCols);
    const groupTotalHeight = groupHeaderHeight + spacing + (rowHeight + spacing) * groupNumRows;
    return groupTotalHeight;
  }
  createGroupHeaderElement(y, groupIndex) {
    const { gridContainerElement } = this;
    const {
      groups,
      numCols,
      groupHeaderHeight,
      spacing,
      rowHeight,
      groupHeaderRenderer,
      mountPoint,
      stickyTop = 0
    } = this.options;
    const group = groups[groupIndex];
    const groupTotalHeight = this.getGroupTotalHeight(groupIndex);
    const wrapper = document.createElement("div");
    wrapper.style = `
        position: absolute;
        top: ${y}px;
        height: ${groupTotalHeight}px;
        width: 100%;
        pointerEvents: none;
        z-index: 1;
      `;
    const headerY = gridContainerElement.offsetTop + stickyTop;
    const groupStickyHeader = document.createElement("div");
    groupStickyHeader.style = `
      position: sticky;
      top: ${headerY}px;
      height: ${groupHeaderHeight}px;
    `;
    groupStickyHeader.appendChild(groupHeaderRenderer(group, groupIndex));
    wrapper.appendChild(groupStickyHeader);
    return wrapper;
  }
  createItemsRowElement(y, groupIndex, itemRowIndex) {
    const { gridContainerElement } = this;
    const {
      groups,
      rowHeight,
      groupHeaderHeight,
      spacing,
      numCols,
      itemRenderer,
      mountPoint
    } = this.options;
    const group = groups[groupIndex];
    const colWidth = `calc(${100 / numCols}% - ${spacing * ((numCols - 1) / numCols)}px)`;
    const itemsRowElement = document.createElement("div");
    itemsRowElement.style = `
      position: absolute;
      transform: translateY(${y}px);
      height: ${rowHeight}px;
      width: 100%;
      display: flex;
    `;
    for (let c = 0; c < numCols; c++) {
      const itemIndex = itemRowIndex * numCols + c;
      if (itemIndex >= group.items.length) {
        break;
      }
      const item = group.items[itemIndex];
      const data = group.data?.[itemIndex];
      const itemElement = document.createElement("div");
      itemElement.style = `
        height: 100%;
        width: ${colWidth};
        margin-right: ${c === numCols - 1 ? 0 : spacing}px;
      `;
      itemElement.appendChild(itemRenderer(item, itemIndex, data));
      itemsRowElement.appendChild(itemElement);
    }
    return itemsRowElement;
  }
  update() {
    const { gridContainerElement } = this;
    const {
      mountPoint,
      groups,
      rowHeight,
      groupHeaderHeight,
      spacing,
      stickyTop = 0,
      viewport,
      numCols,
      disableClipPath
    } = this.options;
    const vpIsWindow = this.getViewportType() === 0 /* Window */;
    const buffer = Math.max(rowHeight, groupHeaderHeight) + spacing;
    const top = this.getViewportRelativeTop();
    const vpRange = this.getViewportRange();
    const minY = vpRange.top - buffer;
    const maxY = vpRange.bottom + buffer;
    const topDiff = Math.max(0, stickyTop - mountPoint.offsetTop);
    const clipTop = -top + stickyTop;
    if (top < stickyTop && !disableClipPath) {
      gridContainerElement.style.clipPath = `inset(${clipTop}px 0 0 0)`;
    } else {
      gridContainerElement.style.clipPath = "";
    }
    const firstVisibleGroupIndex = this.groupVisibleRanges.findFirstVisibleIndex(minY);
    const lastVisibleGroupIndex = this.groupVisibleRanges.findLastVisibleIndex(maxY);
    for (const [groupIndex, visibleGroupContent] of this.visibleGroups) {
      if (groupIndex < firstVisibleGroupIndex || groupIndex > lastVisibleGroupIndex) {
        const renderedGroup = this.visibleGroups.get(groupIndex);
        if (renderedGroup) {
          if (renderedGroup.headerElement) {
            renderedGroup.headerElement.remove();
          }
          renderedGroup.visibleItemsRows.forEach((itemRow) => {
            itemRow.remove();
          });
          this.visibleGroups.delete(groupIndex);
        }
      }
    }
    for (let groupIndex = firstVisibleGroupIndex; groupIndex <= lastVisibleGroupIndex; groupIndex++) {
      let renderedGroup = this.visibleGroups.get(groupIndex);
      const groupTop = this.groupVisibleRanges.get(groupIndex).top + topDiff + (vpIsWindow ? 0 : stickyTop);
      if (!renderedGroup) {
        renderedGroup = {
          headerElement: this.createGroupHeaderElement(groupTop, groupIndex),
          visibleItemsRows: /* @__PURE__ */ new Map()
        };
        this.visibleGroups.set(groupIndex, renderedGroup);
        if (renderedGroup.headerElement) {
          gridContainerElement.appendChild(renderedGroup.headerElement);
        }
      }
      const group = groups[groupIndex];
      const totalItemsRows = Math.ceil(group.items.length / numCols);
      const firstVisibleItemsRowIndex = Math.max(
        0,
        Math.floor(
          (minY - groupTop - (top < 0 ? 0 : groupHeaderHeight)) / (rowHeight + spacing)
        )
      );
      const lastVisibleItemsRowIndex = Math.min(
        totalItemsRows - 1,
        Math.ceil(
          (maxY - groupTop - (top < 0 ? 0 : groupHeaderHeight)) / (rowHeight + spacing)
        )
      );
      for (const [
        itemsRowIndex,
        itemsRowElement
      ] of renderedGroup.visibleItemsRows) {
        if (itemsRowIndex >= firstVisibleItemsRowIndex && itemsRowIndex <= lastVisibleItemsRowIndex) {
          continue;
        }
        itemsRowElement?.remove();
        renderedGroup.visibleItemsRows.delete(itemsRowIndex);
      }
      for (let itemsRowIndex = firstVisibleItemsRowIndex; itemsRowIndex <= lastVisibleItemsRowIndex; itemsRowIndex++) {
        let itemsRowElement = renderedGroup.visibleItemsRows.get(itemsRowIndex);
        if (!itemsRowElement) {
          const itemsRowY = groupTop + groupHeaderHeight + spacing + itemsRowIndex * (rowHeight + spacing);
          itemsRowElement = this.createItemsRowElement(
            itemsRowY,
            groupIndex,
            itemsRowIndex
          );
          gridContainerElement.appendChild(itemsRowElement);
          renderedGroup.visibleItemsRows.set(itemsRowIndex, itemsRowElement);
        }
      }
    }
  }
};
export {
  VisibleRanges,
  GRi4D as default
};
//# sourceMappingURL=index.dev.esm.js.map
