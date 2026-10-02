"use client";

import { useEffect } from "react";

// Things a press should reach instead of starting a drag.
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, video, [role="button"], [role="menuitem"], [role="menuitemradio"], [role="radio"], [role="tab"], [contenteditable="true"], .react-flow, [data-no-drag]';
const THRESHOLD = 4; // px of movement before a press becomes a drag, so ordinary clicks are never swallowed

function scrollParent(from: Element | null): HTMLElement | null {
  for (let el = from as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
}

/**
 * Scrollbars are hidden everywhere (see globals.css). With a mouse you scroll by holding on empty space and dragging,
 * like on a phone, or with the wheel/trackpad/keyboard as usual. Touch already scrolls natively.
 */
export function DragScroll() {
  useEffect(() => {
    let drag: { el: HTMLElement; startY: number; startTop: number; active: boolean } | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const target = e.target as Element | null;
      if (!target || target.closest(INTERACTIVE)) return;
      const el = scrollParent(target);
      if (!el) return;
      drag = { el, startY: e.clientY, startTop: el.scrollTop, active: false };
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dy = e.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(dy) < THRESHOLD) return;
        drag.active = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      drag.el.scrollTop = drag.startTop - dy;
    };

    const end = () => {
      if (drag?.active) {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        // The press that ended a drag must not also count as a click on whatever is underneath.
        const stop = (ev: Event) => ev.stopPropagation();
        window.addEventListener("click", stop, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", stop, true), 0);
      }
      drag = null;
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      end();
    };
  }, []);

  return null;
}
