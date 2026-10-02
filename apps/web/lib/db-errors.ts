/**
 * True when a Supabase/PostgREST error means "that column does not exist yet" (e.g. migration 0011 not applied).
 * Lets the app keep working, without the new field, until the migration has been run.
 */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column?: string): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  const byCode = code === "42703" || code === "PGRST204";
  const byMessage = message.includes("schema cache") || (message.includes("column") && message.includes("does not exist"));
  if (!byCode && !byMessage) return false;
  return column ? message.includes(column.toLowerCase()) || code === "42703" || code === "PGRST204" : true;
}
