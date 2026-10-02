"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Small modal window (native <dialog>: Escape to close, focus stays inside, page behind is dimmed). */
export function StageDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Fields save when they lose focus, so drop focus first; otherwise the last typed change could be lost.
  const requestClose = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={() => (document.activeElement as HTMLElement | null)?.blur()}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) requestClose(); // click on the dimmed backdrop
      }}
      className="m-auto max-h-[85vh] w-[min(92vw,26rem)] overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl backdrop:bg-black/30"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        <Button size="sm" onClick={requestClose}>Selesai</Button>
      </div>
      {children}
    </dialog>
  );
}
