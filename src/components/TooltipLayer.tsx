import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Placement = "top" | "bottom";

interface TipState {
  text: string;
  x: number;
  y: number;
  placement: Placement;
}

// Consistent, snappy delay — the native `title` tooltip is controlled by the
// browser/webview and fires at unpredictable and often slow intervals.
const SHOW_DELAY = 160;
const EDGE_MARGIN = 8;

/**
 * Global tooltip layer.
 *
 * Instead of relying on the browser's native `title` tooltips (which show at
 * inconsistent, uncontrollable delays), this intercepts any element that has a
 * `title`, temporarily swaps it to a data attribute while hovered, and renders
 * a styled tooltip with a fixed delay. It works for every element in the app
 * with zero per-element changes and restores `title` on leave so the
 * accessible name is preserved.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Keep the tooltip inside the viewport horizontally once its size is known.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node || !tip) return;
    const width = node.offsetWidth;
    let left = tip.x - width / 2;
    left = Math.max(EDGE_MARGIN, Math.min(left, window.innerWidth - width - EDGE_MARGIN));
    node.style.left = `${left}px`;
  }, [tip]);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const restore = () => {
      const el = activeRef.current;
      if (!el) return;
      const text = el.getAttribute("data-tooltip-text");
      if (text !== null) {
        if (!el.hasAttribute("title")) el.setAttribute("title", text);
        el.removeAttribute("data-tooltip-text");
      }
      activeRef.current = null;
    };

    const hide = () => {
      clearTimer();
      restore();
      setTip(null);
    };

    const show = (el: HTMLElement, text: string) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const placement: Placement = rect.top < 48 ? "bottom" : "top";
      setTip({
        text,
        x: rect.left + rect.width / 2,
        y: placement === "top" ? rect.top - 8 : rect.bottom + 8,
        placement,
      });
    };

    const onOver = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[title]") as HTMLElement | null;
      if (!el || el === activeRef.current) return;

      clearTimer();
      restore();
      setTip(null);

      const text = el.getAttribute("title")?.trim();
      if (!text) return;

      // Move the native title aside so the browser's tooltip never appears;
      // the value is restored on mouse-out.
      el.setAttribute("data-tooltip-text", text);
      el.removeAttribute("title");
      activeRef.current = el;
      timerRef.current = window.setTimeout(() => show(el, text), SHOW_DELAY);
    };

    const onOut = (e: Event) => {
      const el = activeRef.current;
      if (!el) return;
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (related && el.contains(related)) return;
      hide();
    };

    const onKeyDown = () => hide();

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);

    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
      clearTimer();
      restore();
    };
  }, []);

  if (!tip) return null;

  return (
    <div
      ref={nodeRef}
      style={{
        left: tip.x,
        top: tip.y,
        transform: tip.placement === "top" ? "translateY(-100%)" : undefined,
      }}
      className="fixed z-[9999] max-w-[280px] px-2.5 py-1.5 rounded-lg bg-neutral-900/95 text-neutral-100 text-[11px] leading-snug text-center border border-white/10 shadow-xl backdrop-blur-md pointer-events-none whitespace-normal animate-in fade-in duration-100"
      role="tooltip"
    >
      {tip.text}
    </div>
  );
}
