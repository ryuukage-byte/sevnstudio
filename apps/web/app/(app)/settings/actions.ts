"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormResult = { ok: boolean; message: string } | null;

const nameSchema = z.string().trim().max(60, "Nama maksimal 60 huruf.");

export async function updateProfile(_: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = nameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Nama tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data } });
  if (error) return { ok: false, message: "Nama belum tersimpan. Coba lagi." };
  revalidatePath("/", "layout"); // the header shows the name
  return { ok: true, message: "Tersimpan." };
}

export async function updatePassword(_: FormResult, formData: FormData): Promise<FormResult> {
  const next = String(formData.get("password") ?? "");
  const again = String(formData.get("again") ?? "");
  if (next.length < 8) return { ok: false, message: "Kata sandi minimal 8 karakter." };
  if (next !== again) return { ok: false, message: "Kedua kata sandi harus sama." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: "Kata sandi belum berubah. Coba masuk ulang lalu ulangi." };
  return { ok: true, message: "Kata sandi sudah diganti." };
}
