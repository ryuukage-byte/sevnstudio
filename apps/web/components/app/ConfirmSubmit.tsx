"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Two-step delete button inside a <form>: first click asks "Yakin?", second click submits. Resets after a few seconds. */
export function ConfirmSubmit({ label = "Hapus", confirmLabel = "Yakin hapus?" }: { label?: string; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <Button
      type={armed ? "submit" : "button"}
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      onClick={armed ? undefined : () => setArmed(true)}
      className={armed ? "" : "text-muted-foreground"}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}
