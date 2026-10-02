"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: string | null, formData: FormData): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return "Email atau kata sandi salah.";
  redirect("/projects");
}

export async function signUp(_: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return "Kata sandi minimal 8 karakter.";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
  });
  if (error) return "Pendaftaran gagal: " + error.message;
  // With email confirmation on, there is no session yet.
  if (!data.session) return "Cek email Anda untuk konfirmasi, lalu masuk.";
  redirect("/projects");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
