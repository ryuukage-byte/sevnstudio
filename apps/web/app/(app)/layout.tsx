import { AppHeader } from "@/components/app/AppHeader";
import { createClient } from "@/lib/supabase/server";

// Signed-in shell: navbar on top, page fills the rest. Pages that need the full height (editor, run) use h-full.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative z-[1] flex h-dvh flex-col">
      <AppHeader email={user?.email ?? null} />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
