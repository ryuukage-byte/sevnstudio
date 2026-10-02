"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, updateProfile, type FormResult } from "@/app/(app)/settings/actions";

function Result({ state }: { state: FormResult }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
      {state.message}
    </p>
  );
}

export function ProfileForm({ initialName }: { initialName: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Nama tampilan</Label>
        <Input id="profile-name" name="name" defaultValue={initialName} maxLength={60} placeholder="Nama Anda" autoComplete="name" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Kata sandi baru</Label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="again-password">Ulangi kata sandi baru</Label>
        <Input id="again-password" name="again" type="password" autoComplete="new-password" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>{pending ? "Menyimpan…" : "Ganti kata sandi"}</Button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function AiSettingsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Penyedia AI & Kunci API</div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Hubungkan model AI untuk mengotomatiskan langkah riset, pembuatan draf, dan orkestrasi alur kerja.
          </p>
        </div>
        <span className="sv-badge shrink-0" data-tone="warn">Fase 4: Vault</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { name: "Google Gemini", note: "Flash / Pro" },
          { name: "OpenAI", note: "GPT-4o / mini" },
          { name: "Anthropic", note: "Claude 3.5 Sonnet" },
        ].map((p) => (
          <div key={p.name} className="rounded-xl border border-border bg-[#0a0a0a] p-3 text-left">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{p.name}</span>
              <span className="size-2 rounded-full bg-muted" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{p.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border-strong bg-white/[0.01] p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="font-medium text-foreground">Keamanan Vault:</strong> Di Fase 4, semua kunci API disimpan langsung di Supabase Vault terenkripsi dan hanya di-resolve oleh worker terisolasi. Browser dan config alur kerja tidak pernah menyimpan kunci rahasia.
      </div>
    </div>
  );
}
