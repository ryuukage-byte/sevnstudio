"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readForm(formData: FormData) {
  return { email: String(formData.get("email") ?? "").trim(), password: String(formData.get("password") ?? "") };
}

/** Plain-language check shown under the form (replaces the browser's English pop-up). */
function validate(email: string, password: string): string | null {
  if (!email) return "Isi email Anda dulu.";
  if (!EMAIL.test(email)) return "Alamat email belum benar. Contoh: nama@gmail.com";
  if (!password) return "Isi kata sandi Anda dulu.";
  return null;
}

export async function signIn(_: string | null, formData: FormData): Promise<string | null> {
  const { email, password } = readForm(formData);
  const problem = validate(email, password);
  if (problem) return problem;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Email atau kata sandi salah. Belum punya akun? Tekan Daftar.";
  redirect("/projects");
}

export async function signUp(_: string | null, formData: FormData): Promise<string | null> {
  const { email, password } = readForm(formData);
  const problem = validate(email, password);
  if (problem) return problem;
  if (password.length < 8) return "Kata sandi minimal 8 karakter.";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (/already|registered/i.test(error.message)) return "Email ini sudah terdaftar. Silakan tekan Masuk.";
    if (/rate|limit/i.test(error.message)) return "Terlalu sering mencoba. Tunggu sebentar lalu coba lagi.";
    return "Pendaftaran belum berhasil. Coba lagi sebentar.";
  }
  // With email confirmation on, there is no session yet.
  if (!data.session) return "Cek email Anda untuk konfirmasi, lalu tekan Masuk.";
  redirect("/projects");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
