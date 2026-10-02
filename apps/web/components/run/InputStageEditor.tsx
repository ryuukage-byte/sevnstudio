"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  initialValue: string;
  placeholder?: string;
  disabled?: boolean;
  isDone?: boolean;
  onSave: (text: string, markDone: boolean) => void;
  onReset: () => void;
}

export function InputStageEditor({ initialValue, placeholder, disabled, isDone, onSave, onReset }: Props) {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-24 w-full rounded-xl border border-border bg-[#0a0a0a] px-3.5 py-2.5 text-sm outline-none focus-visible:border-white/25 focus-visible:ring-4 focus-visible:ring-white/[0.03] disabled:opacity-50"
        placeholder={placeholder ?? "Tulis isian Anda di sini..."}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onSave(text, false)}
      />
      <div className="flex gap-2">
        {!isDone ? (
          <Button
            className="flex-1"
            disabled={disabled || !text.trim()}
            onClick={() => onSave(text, true)}
          >
            Simpan & Selesai
          </Button>
        ) : (
          <>
            <Button
              className="flex-1"
              variant="outline"
              disabled={disabled}
              onClick={() => onSave(text, true)}
            >
              Perbarui
            </Button>
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={onReset}
            >
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
