"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Modal window (native <dialog>: Escape to close, focus stays inside, page behind is dimmed). */
export function StageDialog({ title, onClose, children, closeLabel = "Selesai" }: { title: string; onClose: () => void; children: ReactNode; closeLabel?: string }) {
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
      className="m-auto max-h-[88vh] w-[min(94vw,30rem)] overflow-y-auto rounded-[22px] border border-border-strong bg-[radial-gradient(circle_260px_at_50%_0,rgba(255,255,255,0.045),transparent_70%),#111] p-6 text-popover-foreground shadow-[0_28px_70px_rgba(0,0,0,0.62)] backdrop:bg-black/70 backdrop:backdrop-blur-md"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium tracking-[-0.03em]">{title}</h2>
        <Button size="sm" onClick={requestClose}>{closeLabel}</Button>
      </div>
      {children}
    </dialog>
  );
}

/** Asks for a single line of text (replaces the browser's window.prompt). */
export function PromptDialog({
  title,
  label,
  initial,
  confirmLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(94vw,26rem)] rounded-[22px] border border-border-strong bg-[#111] p-6 text-popover-foreground shadow-[0_28px_70px_rgba(0,0,0,0.62)] backdrop:bg-black/70 backdrop:backdrop-blur-md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v) return;
          ref.current?.close();
          onSubmit(v);
        }}
        className="space-y-5"
      >
        <h2 className="text-xl font-medium tracking-[-0.03em]">{title}</h2>
        <div className="space-y-2">
          <Label htmlFor="prompt-value">{label}</Label>
          <Input id="prompt-value" value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} autoFocus />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>Batal</Button>
          <Button type="submit" disabled={!value.trim()}>{confirmLabel}</Button>
        </div>
      </form>
    </dialog>
  );
}
