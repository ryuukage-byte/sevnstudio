import type { Metadata } from "next";
import { PageHero, PageShell } from "@/components/app/Page";
import { PasswordForm, ProfileForm } from "@/components/app/SettingsForms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pengaturan" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sv-card scroll-mt-24 p-6 sm:p-7">
      <h2 className="mb-5 text-xl font-medium tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <PageShell>
      <PageHero eyebrow="Akun" title="Pengaturan" crumbs={[{ label: "Proyek", href: "/projects" }, { label: "Pengaturan" }]} />

      <div className="mx-auto max-w-2xl space-y-5">
        <Section id="profil" title="Profil">
          <ProfileForm initialName={name} />
        </Section>

        <Section id="akun" title="Akun">
          <div className="mb-6">
            <div className="sv-label mb-1">Email</div>
            <div className="text-sm">{user?.email ?? "—"}</div>
          </div>
          <PasswordForm />
        </Section>

        <Section id="pengaturan" title="Pengaturan">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Hubungkan AI</div>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Setelah API Anda terhubung, pilihan AI di tombol + pada beranda akan aktif.
              </p>
            </div>
            <span className="sv-badge shrink-0">Segera hadir</span>
          </div>
        </Section>
      </div>
    </PageShell>
  );
}
