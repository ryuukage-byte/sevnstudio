import { createBrowserClient } from "@supabase/ssr";
import { createMockClient, devPreviewEnabled } from "@/lib/dev/mock-client";

export function createClient() {
  if (devPreviewEnabled) {
    // DEV PREVIEW: no database; talk to the in-memory store through /api/dev-db.
    return createMockClient((q) =>
      fetch("/api/dev-db", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(q) }).then((r) => r.json()),
    );
  }
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
