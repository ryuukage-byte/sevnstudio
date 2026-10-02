"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";

export default function LoginPage() {
  const [signInError, signInAction, signingIn] = useActionState(signIn, null);
  const [signUpMsg, signUpAction, signingUp] = useActionState(signUp, null);
  const message = signInError ?? signUpMsg;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Sevn Studio</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk menyusun dan mengerjakan daftar kerja Anda.</p>
      </div>
      <form noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@gmail.com" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" />
        </div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <div className="flex gap-2">
          <Button type="submit" formAction={signInAction} disabled={signingIn || signingUp}>Masuk</Button>
          <Button type="submit" variant="outline" formAction={signUpAction} disabled={signingIn || signingUp}>Daftar</Button>
        </div>
      </form>
    </main>
  );
}
