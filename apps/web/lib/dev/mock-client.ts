// DEV PREVIEW ONLY. Minimal query-builder that looks like the supabase-js calls this app makes.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Query, Result } from "./store";

export const devPreviewEnabled = process.env.NEXT_PUBLIC_DEV_PREVIEW === "1" && process.env.NODE_ENV !== "production";

type Exec = (q: Query) => Promise<Result>;

class Builder implements PromiseLike<Result> {
  private q: Query;
  constructor(private exec: Exec, table: string, action: Query["action"], payload?: unknown) {
    this.q = { table, action, payload, filters: [], order: [], returning: false };
  }
  select() {
    if (this.q.action !== "select") this.q.returning = true;
    return this;
  }
  eq(col: string, val: unknown) { this.q.filters.push({ op: "eq", col, val }); return this; }
  lt(col: string, val: unknown) { this.q.filters.push({ op: "lt", col, val }); return this; }
  in(col: string, val: unknown[]) { this.q.filters.push({ op: "in", col, val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.q.order.push({ col, asc: opts?.ascending ?? true }); return this; }
  single() { this.q.single = "single"; return this; }
  maybeSingle() { this.q.single = "maybe"; return this; }
  onConflict(c: string) { this.q.onConflict = c; return this; }
  with(fn: string) { this.q.fn = fn; return this; }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.exec(this.q).then(ok, err);
  }
}

const USER = { id: "00000000-0000-4000-8000-0000000000aa", email: "dev@sevn.local" };

export function createMockClient(exec: Exec): SupabaseClient {
  const client = {
    from(table: string) {
      return {
        select: () => new Builder(exec, table, "select").select(),
        insert: (row: unknown) => new Builder(exec, table, "insert", row),
        update: (patch: unknown) => new Builder(exec, table, "update", patch),
        delete: () => new Builder(exec, table, "delete"),
        upsert: (row: unknown, opts?: { onConflict?: string }) => {
          const b = new Builder(exec, table, "upsert", row);
          if (opts?.onConflict) b.onConflict(opts.onConflict);
          return b;
        },
      };
    },
    rpc: (fn: string, args: unknown) => new Builder(exec, "", "rpc", args).with(fn),
    auth: {
      getUser: async () => ({ data: { user: { ...USER, user_metadata: {} } }, error: null }),
      // Preview only: accepts the change but does not persist it.
      updateUser: async () => ({ data: { user: { ...USER, user_metadata: {} } }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: USER }, error: null }),
      signUp: async () => ({ data: { user: USER, session: {} }, error: null }),
    },
  };
  return client as unknown as SupabaseClient;
}
