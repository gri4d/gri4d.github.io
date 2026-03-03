// src/index.ts
var GRID_SIZER_LIMIT = 8 * 10 ** 6;
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
  gridSizingElement;
  itemsViewportElement;
  visibleGroups = /* @__PURE__ */ new Map();
  groupVisibleRanges;
  viewportSizeObserver = null;
  gridHeight = 0;
  scrollPosMultiplier = 1;
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
      spacing,
      itemsRow,
      viewport,
      mountPoint,
      stickyTop = 0
    } = this.options;
    const { height: rowHeight, columns: numCols } = itemsRow;
    const vpIsWindow = this.getViewportType() === 0 /* Window */;
    const topDiff = Math.max(0, stickyTop - mountPoint.offsetTop);
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
    this.gridHeight = y > 0 ? y + spacing + (vpIsWindow ? topDiff : stickyTop) : 0;
    this.groupVisibleRanges = new VisibleRanges(groupVisibleRanges);
    if (this.gridHeight > GRID_SIZER_LIMIT) {
      console.warn(
        `\u26A0\uFE0F Virtual grid height (${this.gridHeight}px) exceeds safe scroll limit of ${GRID_SIZER_LIMIT}px. Scrolling may behave incorrectly on some browsers, especially mobile.`
      );
    }
    if (!this.gridSizingElement) {
      this.wrapperElement = document.createElement("div");
      this.wrapperElement.className = "gri4d-wrapper-element";
      this.wrapperElement.style.position = "relative";
      this.gridSizingElement = document.createElement("div");
      this.gridSizingElement.className = "gri4d-grid-sizing-element";
      this.gridSizingElement.style.position = "relative";
      this.wrapperElement.appendChild(this.gridSizingElement);
      this.itemsViewportElement = document.createElement("div");
      this.itemsViewportElement.className = "gri4d-items-viewport-element";
      this.gridSizingElement.appendChild(this.itemsViewportElement);
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
    this.gridSizingElement.style.height = `${Math.min(GRID_SIZER_LIMIT, this.gridHeight)}px`;
    Object.assign(this.itemsViewportElement.style, {
      width: "100%",
      overflow: "hidden",
      position: "sticky",
      height: `100vh`,
      top: stickyTop + "px"
    });
    clearTimeout(this.resizeTimeout);
    window.removeEventListener("resize", this.onResize);
    window.addEventListener("resize", this.onResize);
    const scrollListener = this.getViewportElement();
    scrollListener.removeEventListener("scroll", this.onScroll);
    scrollListener.addEventListener("scroll", this.onScroll);
    for (let [groupKey] of this.visibleGroups) {
      const renderedGroup = this.visibleGroups.get(groupKey);
      renderedGroup?.headerElement?.remove();
      this.visibleGroups.delete(groupKey);
    }
    this.itemsViewportElement.innerHTML = "";
    this.viewportSizeObserver?.disconnect();
    this.viewportSizeObserver = null;
    if (!vpIsWindow) {
      this.viewportSizeObserver = new ResizeObserver((entries) => {
        const { stickyTop: stickyTop2, mountPoint: mountPoint2 } = this.options;
        for (const entry of entries) {
          this.itemsViewportElement.style.height = `calc(${entry.contentRect.height}px - ${stickyTop2}px)`;
        }
        this.update();
      });
      this.viewportSizeObserver.observe(scrollListener);
    }
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
    top *= this.scrollPosMultiplier;
    return { top, bottom: top + height };
  }
  getViewportRelativeTop() {
    const gridBoundRect = this.gridSizingElement.getBoundingClientRect();
    if (this.getViewportType() === 0 /* Window */) {
      return gridBoundRect.top;
    }
    const vpElement = this.getViewportElement();
    const vpBoundRect = vpElement.getBoundingClientRect();
    return gridBoundRect.top - vpBoundRect.top;
  }
  getGroupTotalHeight(groupIndex) {
    const { groups, itemsRow, groupHeader, spacing } = this.options;
    const { columns: numCols, height: rowHeight } = itemsRow;
    const groupHeaderHeightWithSpacing = groupHeader ? groupHeader.height + spacing : 0;
    const group = groups[groupIndex];
    const groupNumRows = Math.ceil(group.items.length / numCols);
    const groupTotalHeight = groupHeaderHeightWithSpacing + (rowHeight + spacing) * groupNumRows;
    return groupTotalHeight;
  }
  createGroupHeaderElement(groupIndex) {
    const { gridSizingElement } = this;
    const {
      groups,
      groupHeader,
      spacing,
      mountPoint,
      stickyTop = 0
    } = this.options;
    if (!groupHeader) {
      return null;
    }
    const { height: groupHeaderHeight, renderer: groupHeaderRenderer } = groupHeader;
    const group = groups[groupIndex];
    const groupStickyHeader = document.createElement("div");
    Object.assign(groupStickyHeader.style, {
      position: "absolute",
      height: `${groupHeaderHeight}px`,
      zIndex: groupIndex + 1,
      width: "100%"
    });
    groupStickyHeader.appendChild(groupHeaderRenderer(group, groupIndex));
    return groupStickyHeader;
  }
  createItemsRowElement(groupIndex, itemRowIndex) {
    const { gridSizingElement } = this;
    const { groups, itemsRow, spacing, mountPoint } = this.options;
    const {
      height: rowHeight,
      columns: numCols,
      renderer: itemRenderer
    } = itemsRow;
    const group = groups[groupIndex];
    const colWidthPx = `calc(${100 / numCols}% - ${spacing * ((numCols - 1) / numCols)}px)`;
    const itemsRowElement = document.createElement("div");
    Object.assign(itemsRowElement.style, {
      position: "absolute",
      height: `${rowHeight}px`,
      width: "100%",
      display: "flex"
    });
    for (let c = 0; c < numCols; c++) {
      const itemIndex = itemRowIndex * numCols + c;
      if (itemIndex >= group.items.length) {
        break;
      }
      const item = group.items[itemIndex];
      const data = group.data?.[itemIndex];
      const itemElement = document.createElement("div");
      Object.assign(itemElement.style, {
        height: "100%",
        width: colWidthPx,
        marginRight: `${c === numCols - 1 ? 0 : spacing}px`
      });
      itemElement.appendChild(itemRenderer(item, itemIndex, data));
      itemsRowElement.appendChild(itemElement);
    }
    return itemsRowElement;
  }
  update() {
    const { wrapperElement, gridSizingElement, itemsViewportElement } = this;
    const {
      mountPoint,
      groups,
      groupHeader,
      spacing,
      stickyTop = 0,
      viewport,
      itemsRow
    } = this.options;
    const { height: rowHeight, columns: numCols } = itemsRow;
    const groupHeaderHeight = groupHeader?.height || 0;
    const vpIsWindow = this.getViewportType() === 0 /* Window */;
    const buffer = Math.max(rowHeight, groupHeaderHeight) + spacing;
    const top = this.getViewportRelativeTop();
    const vpRange = this.getViewportRange();
    const minY = vpRange.top - buffer;
    const maxY = vpRange.bottom + buffer;
    const topDiff = vpIsWindow ? Math.max(0, stickyTop - mountPoint.offsetTop) : 0;
    let vpScrollAmount = Math.max(0, -top + stickyTop) - topDiff - (vpIsWindow ? 0 : stickyTop);
    vpScrollAmount *= this.scrollPosMultiplier;
    if (vpIsWindow) {
      const posStyle = itemsViewportElement.style.position;
      if (top <= 0 && posStyle !== "fixed") {
        itemsViewportElement.style.position = "fixed";
      } else if (top > 0 && posStyle !== "sticky") {
        itemsViewportElement.style.position = "sticky";
      }
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
      const { top: rawGroupTop, bottom: rawGroupBot } = this.groupVisibleRanges.get(groupIndex);
      const groupTop = rawGroupTop + topDiff + (vpIsWindow ? 0 : stickyTop);
      let groupHeaderY = Math.max(0, rawGroupTop - vpScrollAmount);
      let stickyPushOffset = 0;
      if (rawGroupBot - vpScrollAmount < groupHeaderHeight) {
        stickyPushOffset = groupHeaderHeight - (rawGroupBot - vpScrollAmount);
      }
      let notStuckYetOffset = 0;
      if (vpScrollAmount < rawGroupTop) {
        notStuckYetOffset = vpIsWindow ? 0 : topDiff;
      }
      if (!renderedGroup) {
        renderedGroup = {
          headerElement: this.createGroupHeaderElement(groupIndex),
          visibleItemsRows: /* @__PURE__ */ new Map()
        };
        this.visibleGroups.set(groupIndex, renderedGroup);
        if (renderedGroup.headerElement) {
          itemsViewportElement.appendChild(renderedGroup.headerElement);
        }
      }
      if (renderedGroup.headerElement) {
        renderedGroup.headerElement.style.transform = `translateY(${groupHeaderY - stickyPushOffset + notStuckYetOffset}px)`;
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
      let itemsRowY = firstVisibleItemsRowIndex * (rowHeight + spacing) + groupHeaderHeight + (groupHeaderHeight ? spacing : 0) + rawGroupTop - vpScrollAmount;
      for (let itemsRowIndex = firstVisibleItemsRowIndex; itemsRowIndex <= lastVisibleItemsRowIndex; itemsRowIndex++) {
        let itemsRowElement = renderedGroup.visibleItemsRows.get(itemsRowIndex);
        if (!itemsRowElement) {
          itemsRowElement = this.createItemsRowElement(
            groupIndex,
            itemsRowIndex
          );
          itemsViewportElement.appendChild(itemsRowElement);
          renderedGroup.visibleItemsRows.set(itemsRowIndex, itemsRowElement);
        }
        itemsRowElement.style.transform = `translateY(${itemsRowY}px)`;
        itemsRowY += rowHeight + spacing;
      }
    }
  }
};
export {
  VisibleRanges,
  GRi4D as default
};
//# sourceMappingURL=index.dev.esm.js.map
