"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

export default function LoginPage() {
  const [signInError, signInAction, signingIn] = useActionState(signIn, null);
  const [signUpMsg, signUpAction, signingUp] = useActionState(signUp, null);
  const message = signInError ?? signUpMsg;
  const busy = signingIn || signingUp;

  return (
    <main className="relative z-[1] mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Image src="/brand/mark.png" alt="" width={30} height={30} priority unoptimized className="size-[30px] object-contain" />
        <span className="font-mono text-[10px] font-medium tracking-[0.35em] text-foreground/60">SEVN STUDIO</span>
      </div>

      <div className="sv-card p-7 sm:p-8">
        <div className="sv-eyebrow mb-5">Masuk</div>
        <h1 className="text-[34px] font-medium leading-none tracking-[-0.04em]">Selamat datang</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Masuk untuk menyusun dan mengerjakan daftar kerja Anda.</p>

        <form noValidate className="mt-7 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@gmail.com" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
          </div>
          {message && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {message}
            </p>
          )}
          <div className="mt-1 flex gap-2">
            <Button type="submit" size="lg" className="h-11 flex-1" formAction={signInAction} disabled={busy}>
              {signingIn ? "Masuk…" : "Masuk"}
            </Button>
            <Button type="submit" size="lg" variant="outline" className="h-11 flex-1" formAction={signUpAction} disabled={busy}>
              {signingUp ? "Mendaftar…" : "Daftar"}
            </Button>
          </div>
        </form>
      </div>

      <p className="sv-label mt-6 text-center">Ide, dibangun.</p>
    </main>
  );
}
