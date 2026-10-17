import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type CardFormat = "poster" | "widescreen";

interface BaseProps<T> {
  items: T[];
  scrollRef: RefObject<HTMLDivElement | null>;
  getKey: (item: T) => string;
  gap?: number;
  overscan?: number;
}

interface GridProps<T> extends BaseProps<T> {
  renderItem: (item: T) => ReactNode;
  cardFormat?: CardFormat;
  posterColumns?: [base: number, sm: number, md: number, lg: number];
  widescreenColumns?: [base: number, sm: number, md: number, lg: number];
  rowEstimate?: number;
}

interface ListProps<T> extends BaseProps<T> {
  renderItem: (item: T) => ReactNode;
  rowHeight?: number;
}

function computeColumns(
  width: number,
  format: CardFormat,
  posterColumns: [base: number, sm: number, md: number, lg: number] = [2, 3, 4, 6],
  widescreenColumns: [base: number, sm: number, md: number, lg: number] = [1, 2, 3, 4],
): number {
  if (width <= 0) {
    return format === "poster" ? posterColumns[0] : widescreenColumns[0];
  }

  if (format === "widescreen") {
    if (width >= 1024) return widescreenColumns[3];
    if (width >= 768) return widescreenColumns[2];
    if (width >= 640) return widescreenColumns[1];
    return widescreenColumns[0];
  }

  if (width >= 1024) return posterColumns[3];
  if (width >= 768) return posterColumns[2];
  if (width >= 640) return posterColumns[1];
  return posterColumns[0];
}

export function VirtualizedMediaGrid<T>({
  items,
  scrollRef,
  getKey,
  renderItem,
  cardFormat = "poster",
  gap = 14,
  overscan = 4,
  posterColumns = [2, 3, 4, 6],
  widescreenColumns = [1, 2, 3, 4],
  rowEstimate = 320,
}: GridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateWidth = () => {
      setWidth(el.clientWidth);
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef, items.length, cardFormat]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scrollEl = scrollRef.current;
    if (!wrapper) return;

    const measureMargin = () => {
      setScrollMargin(wrapper.offsetTop);
    };

    measureMargin();
    if (scrollEl) {
      const ro = new ResizeObserver(measureMargin);
      ro.observe(scrollEl);
      return () => ro.disconnect();
    }
    return;
  }, [scrollRef, width, items.length, cardFormat]);

  const cols = computeColumns(width, cardFormat, posterColumns, widescreenColumns);
  const columnCount = Math.max(1, cols);
  const rowCount = Math.max(1, Math.ceil(items.length / columnCount));
  const estimate = Math.max(200, rowEstimate);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimate,
    overscan,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div ref={wrapperRef} style={{ position: "relative", height: `${totalSize}px`, width: "100%" }}>
      {virtualRows.map((vr) => {
        const startIdx = vr.index * columnCount;
        const rowItems = items.slice(startIdx, startIdx + columnCount);
        return (
          <div
            key={vr.key}
            data-index={vr.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vr.start - scrollMargin}px)`,
              paddingBottom: `${gap}px`,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                columnGap: `${gap}px`,
                rowGap: 0,
              }}
            >
              {rowItems.map((item) => (
                <div key={getKey(item)} className="min-w-0">
                  {renderItem(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VirtualizedMediaList<T>({
  items,
  scrollRef,
  renderItem,
  gap = 0,
  overscan = 10,
  rowHeight = 64,
}: ListProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const updateWidth = () => setWidth(el.clientWidth);
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef, items.length]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scrollEl = scrollRef.current;
    if (!wrapper) return;
    const measureMargin = () => setScrollMargin(wrapper.offsetTop);
    measureMargin();
    if (scrollEl) {
      const ro = new ResizeObserver(measureMargin);
      ro.observe(scrollEl);
      return () => ro.disconnect();
    }
    return;
  }, [scrollRef, width, items.length]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => Math.max(48, rowHeight),
    overscan,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div ref={wrapperRef} style={{ position: "relative", height: `${totalSize}px`, width: "100%" }}>
      {virtualRows.map((vr) => {
        const item = items[vr.index];
        return (
          <div
            key={vr.key}
            data-index={vr.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vr.start - scrollMargin}px)`,
              paddingBottom: gap > 0 ? `${gap}px` : undefined,
            }}
          >
            {item ? renderItem(item) : null}
          </div>
        );
      })}
    </div>
  );
}
