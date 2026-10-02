// DEV PREVIEW ONLY: in-memory stand-in for Supabase so the UI can be explored without a database or login.
// Enabled by NEXT_PUBLIC_DEV_PREVIEW=1 (never in production builds). Data resets when the dev server restarts.
import { buildSnapshot } from "@sevn/engine";

export type Row = Record<string, unknown> & { id?: string };

export interface Query {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert" | "rpc";
  payload?: unknown;
  filters: { op: "eq" | "in" | "lt"; col: string; val: unknown }[];
  order: { col: string; asc: boolean }[];
  single?: "single" | "maybe";
  returning: boolean;
  onConflict?: string;
  fn?: string;
}

export interface Result {
  data: unknown;
  error: { message: string } | null;
}

const TABLES = ["projects", "workflows", "stages", "stage_connections", "items", "templates", "runs", "stage_runs", "run_items"] as const;
type Db = Record<(typeof TABLES)[number], Row[]>;

export const DEV_USER = { id: "00000000-0000-4000-8000-0000000000aa", email: "dev@sevn.local" };

const g = globalThis as unknown as { __sevnDevDb?: Db };

function seed(): Db {
  const id = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const db = Object.fromEntries(TABLES.map((t) => [t, [] as Row[]])) as Db;

  const projectId = id();
  const wfId = id();
  db.projects.push({ id: projectId, owner_id: DEV_USER.id, name: "Trip Jepang Nov 2026 (contoh)", created_at: now(), updated_at: now() });
  db.workflows.push({ id: wfId, project_id: projectId, name: "Travel Checklist", created_at: now(), updated_at: now() });

  const group = id(), docs = id(), booking = id(), packing = id(), tips = id();
  const stage = (sid: string, type: string, name: string, x: number, y: number, config: object = {}, parent: string | null = null) =>
    db.stages.push({ id: sid, workflow_id: wfId, type, name, config, mode: "manual", pos_x: x, pos_y: y, parent_group_id: parent, created_at: now(), updated_at: now() });
  stage(group, "group", "Sebelum berangkat", 40, 20);
  stage(docs, "checklist", "Dokumen", 40, 150, {}, group);
  stage(booking, "checklist", "Booking", 340, 150, {}, group);
  stage(packing, "checklist", "Packing", 640, 150, {}, group);
  stage(tips, "note", "Tips cuaca", 340, 320, { body: "Nov: 8-16 derajat. Bawa jaket tebal." });

  const edge = (s: string, t: string, kind: string) =>
    db.stage_connections.push({ id: id(), workflow_id: wfId, source_stage_id: s, target_stage_id: t, kind, source_port: "text", target_port: "text", created_at: now() });
  edge(docs, booking, "blocking"); // order matters: visa before booking
  edge(booking, packing, "flow"); // packing is free-order

  let order = 1;
  const item = (stageId: string, title: string, qty = 1, due: string | null = null) =>
    db.items.push({ id: id(), stage_id: stageId, title, qty, note: null, due_date: due, sort_order: order++, created_at: now(), updated_at: now() });
  ["Paspor", "Visa Jepang", "Asuransi perjalanan", "Tiket pesawat"].forEach((t) => item(docs, t));
  item(booking, "Hotel Tokyo", 1, "2026-10-20");
  item(booking, "JR Pass", 1, "2026-10-25");
  item(booking, "Tiket teamLab", 2);
  item(packing, "Baju hangat", 4);
  item(packing, "Charger & power bank");
  item(packing, "Adaptor colokan Tipe A");
  item(packing, "Obat pribadi");

  const camel = (r: Row) => r as never;
  const snapshot = buildSnapshot({
    stages: db.stages.map((s) => ({ id: s.id as string, type: s.type as string, name: s.name as string, config: s.config as Record<string, unknown>, mode: "manual" as const, posX: s.pos_x as number, posY: s.pos_y as number, parentGroupId: s.parent_group_id as string | null })),
    edges: db.stage_connections.map((e) => ({ id: e.id as string, source: e.source_stage_id as string, target: e.target_stage_id as string, kind: e.kind as "blocking" | "flow", sourcePort: "text" as const, targetPort: "text" as const })),
    items: db.items.map((i) => ({ id: i.id as string, stageId: i.stage_id as string, title: i.title as string, qty: i.qty as number, note: null, dueDate: i.due_date as string | null, sortOrder: i.sort_order as number })),
  });
  void camel;
  db.templates.push({ id: id(), owner_id: DEV_USER.id, name: "Travel Checklist", description: null, snapshot, created_at: now(), updated_at: now() });
  return db;
}

function db(): Db {
  return (g.__sevnDevDb ??= seed());
}

const fail = (message: string): Result => ({ data: null, error: { message } });

function matches(row: Row, q: Query) {
  return q.filters.every((f) =>
    f.op === "eq" ? row[f.col] === f.val : f.op === "lt" ? (row[f.col] as string) < (f.val as string) : (f.val as unknown[]).includes(row[f.col]),
  );
}

/** Mirrors ON DELETE CASCADE / SET NULL for the tables the UI deletes from. */
function cascade(table: string, ids: string[]) {
  const d = db();
  const drop = (t: keyof Db, pred: (r: Row) => boolean) => {
    const gone = d[t].filter(pred).map((r) => r.id as string);
    d[t] = d[t].filter((r) => !pred(r));
    return gone;
  };
  if (table === "projects") {
    const wfs = drop("workflows", (r) => ids.includes(r.project_id as string));
    cascade("workflows", wfs);
    const runs = drop("runs", (r) => ids.includes(r.project_id as string));
    cascade("runs", runs);
  } else if (table === "workflows") {
    const sts = drop("stages", (r) => ids.includes(r.workflow_id as string));
    drop("stage_connections", (r) => ids.includes(r.workflow_id as string));
    cascade("stages", sts);
  } else if (table === "stages") {
    drop("stage_connections", (r) => ids.includes(r.source_stage_id as string) || ids.includes(r.target_stage_id as string));
    drop("items", (r) => ids.includes(r.stage_id as string));
    d.stages.forEach((s) => {
      if (ids.includes(s.parent_group_id as string)) s.parent_group_id = null;
    });
  } else if (table === "runs") {
    drop("stage_runs", (r) => ids.includes(r.run_id as string));
    drop("run_items", (r) => ids.includes(r.run_id as string));
  }
}

export function execute(q: Query): Result {
  const d = db();
  if (q.action === "rpc") {
    if (q.fn !== "create_run") return fail(`unknown rpc ${q.fn}`);
    const a = q.payload as { p_project_id: string; p_name: string; p_snapshot: { items?: Row[] }; p_workflow_id: string | null; p_template_id: string | null };
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();
    d.runs.push({ id: runId, project_id: a.p_project_id, workflow_id: a.p_workflow_id, template_id: a.p_template_id, name: a.p_name, snapshot: a.p_snapshot, created_at: now, updated_at: now });
    for (const i of a.p_snapshot.items ?? []) {
      d.run_items.push({ id: crypto.randomUUID(), run_id: runId, stage_id: i.stageId, source_item_id: i.id, title: i.title, qty: i.qty ?? 1, note: i.note ?? null, due_date: i.dueDate || null, sort_order: i.sortOrder ?? 0, status: "TODO", updated_at: now });
    }
    return { data: runId, error: null };
  }

  const rows = d[q.table as keyof Db];
  if (!rows) return fail(`unknown table ${q.table}`);
  const now = new Date().toISOString();
  let out: Row[] = [];

  if (q.action === "select") {
    out = rows.filter((r) => matches(r, q));
  } else if (q.action === "insert" || q.action === "upsert") {
    const list = (Array.isArray(q.payload) ? q.payload : [q.payload]) as Row[];
    for (const input of list) {
      const row: Row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...input };
      if (q.table === "projects" || q.table === "templates") row.owner_id ??= DEV_USER.id;
      if (q.action === "upsert" && q.onConflict) {
        const cols = q.onConflict.split(",");
        const existing = rows.find((r) => cols.every((c) => r[c] === row[c]));
        if (existing) {
          Object.assign(existing, input, { updated_at: now });
          out.push(existing);
          continue;
        }
      }
      rows.push(row);
      out.push(row);
    }
  } else if (q.action === "update") {
    for (const r of rows) if (matches(r, q)) { Object.assign(r, q.payload as Row, q.table === "run_items" ? {} : { updated_at: now }); out.push(r); }
  } else if (q.action === "delete") {
    const hit = rows.filter((r) => matches(r, q));
    d[q.table as keyof Db] = rows.filter((r) => !hit.includes(r));
    cascade(q.table, hit.map((r) => r.id as string));
    out = hit;
  }

  for (const o of [...q.order].reverse()) {
    out = [...out].sort((a, b) => {
      const x = a[o.col] as string | number, y = b[o.col] as string | number;
      return (x < y ? -1 : x > y ? 1 : 0) * (o.asc ? 1 : -1);
    });
  }

  if (q.single) {
    if (out.length === 1) return { data: out[0], error: null };
    if (out.length === 0 && q.single === "maybe") return { data: null, error: null };
    return fail(out.length === 0 ? "no rows" : "multiple rows");
  }
  return { data: q.action === "select" || q.returning ? out : null, error: null };
}
