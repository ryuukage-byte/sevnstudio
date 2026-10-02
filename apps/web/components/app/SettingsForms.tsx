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
