import type { SupabaseClient } from "@supabase/supabase-js";
import type { Op } from "./state";

/** Writes one op to Postgres (RLS applies). Throws on failure. */
export async function persistOp(supabase: SupabaseClient, op: Op): Promise<void> {
  const table = supabase.from(op.table as string);
  const { error } =
    op.kind === "insert"
      ? await table.insert(op.row as unknown as Record<string, unknown>)
      : op.kind === "update"
        ? await table.update(op.patch as unknown as Record<string, unknown>).eq("id", op.id)
        : await table.delete().eq("id", op.id);
  if (error) throw error;
}
