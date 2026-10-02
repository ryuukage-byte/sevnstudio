"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHandler } from "@sevn/handlers";
import type { EditorState, ItemRow, Op, StageRow } from "@/lib/editor/state";
import { typeLabel } from "./labels";

interface Props {
  state: EditorState;
  stage: StageRow;
  /** Undoable change (rename, group membership). */
  commit: (label: string, forward: Op[], backward: Op[]) => void;
  /** Direct change without undo history (config text, checklist items). */
  apply: (ops: Op[]) => void;
}

const textareaClass =
  "min-h-24 w-full rounded-xl border border-border bg-[#0a0a0a] px-3.5 py-2.5 text-sm outline-none focus-visible:border-white/25 focus-visible:ring-4 focus-visible:ring-white/[0.03]";

export function StageWorkspace({ state, stage, commit, apply }: Props) {
  const groups = state.stages.filter((s) => s.type === "group" && s.id !== stage.id);
  const items = state.items.filter((i) => i.stage_id === stage.id).sort((a, b) => a.sort_order - b.sort_order);

  const setConfig = (key: string, value: string) => {
    const next = { ...stage.config };
    if (value === "") delete next[key];
    else next[key] = value;
    if (!getHandler(stage.type)?.configSchema.safeParse(next).success) return;
    apply([{ table: "stages", kind: "update", id: stage.id, patch: { config: next } }]);
  };

  return (
    <div className="space-y-4" key={stage.id}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{typeLabel[stage.type] ?? stage.type}</div>

      <div className="space-y-1.5">
        <Label htmlFor="stage-name">Nama</Label>
        <Input
          id="stage-name"
          defaultValue={stage.name}
          maxLength={120}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (!name || name === stage.name) return e.target.value = stage.name;
            commit(
              "rename",
              [{ table: "stages", kind: "update", id: stage.id, patch: { name } }],
              [{ table: "stages", kind: "update", id: stage.id, patch: { name: stage.name } }],
            );
          }}
        />
      </div>

      {stage.type !== "group" && groups.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="stage-group">Kelompok</Label>
          <select
            id="stage-group"
            className="h-10 w-full rounded-xl border border-border bg-[#0a0a0a] px-3 text-sm"
            value={stage.parent_group_id ?? ""}
            onChange={(e) => {
              const next = e.target.value || null;
              commit(
                "group",
                [{ table: "stages", kind: "update", id: stage.id, patch: { parent_group_id: next } }],
                [{ table: "stages", kind: "update", id: stage.id, patch: { parent_group_id: stage.parent_group_id } }],
              );
            }}
          >
            <option value="">(tanpa kelompok)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {stage.type === "task" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Tenggat</Label>
            <Input id="task-due" type="date" defaultValue={(stage.config.dueDate as string) ?? ""} onBlur={(e) => setConfig("dueDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Catatan</Label>
            <textarea id="task-notes" className={textareaClass} defaultValue={(stage.config.notes as string) ?? ""} onBlur={(e) => setConfig("notes", e.target.value)} />
          </div>
        </>
      )}

      {stage.type === "note" && (
        <div className="space-y-1.5">
          <Label htmlFor="note-body">Isi catatan</Label>
          <textarea
            id="note-body"
            className={textareaClass}
            defaultValue={(stage.config.body as string) ?? ""}
            onBlur={(e) => apply([{ table: "stages", kind: "update", id: stage.id, patch: { config: { ...stage.config, body: e.target.value } } }])}
          />
        </div>
      )}

      {stage.type === "checklist" && <ItemsEditor stageId={stage.id} items={items} apply={apply} />}
    </div>
  );
}

function ItemsEditor({ stageId, items, apply }: { stageId: string; items: ItemRow[]; apply: (ops: Op[]) => void }) {
  const patch = (id: string, p: Partial<ItemRow>) => apply([{ table: "items", kind: "update", id, patch: p }]);
  const swap = (a: ItemRow, b: ItemRow | undefined) => {
    if (!b) return;
    apply([
      { table: "items", kind: "update", id: a.id, patch: { sort_order: b.sort_order } },
      { table: "items", kind: "update", id: b.id, patch: { sort_order: a.sort_order } },
    ]);
  };

  return (
    <div className="space-y-2">
      <Label>Isi ceklis ({items.length})</Label>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={item.id} className="space-y-1.5 rounded-xl border border-border bg-white/[0.02] p-2.5">
            <div className="flex items-center gap-1">
              <Input
                defaultValue={item.title}
                maxLength={300}
                aria-label="Isi ceklis"
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (!title) return (e.target.value = item.title);
                  if (title !== item.title) patch(item.id, { title });
                }}
              />
              <Input
                type="number"
                min={0}
                defaultValue={item.qty}
                aria-label="Jumlah"
                className="w-16"
                onBlur={(e) => {
                  const qty = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                  if (qty !== item.qty) patch(item.id, { qty });
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                defaultValue={item.due_date ?? ""}
                aria-label="Tenggat"
                onBlur={(e) => {
                  const due_date = e.target.value || null;
                  if (due_date !== item.due_date) patch(item.id, { due_date });
                }}
              />
              <Button type="button" variant="ghost" size="sm" aria-label="Naik" disabled={idx === 0} onClick={() => swap(item, items[idx - 1])}>↑</Button>
              <Button type="button" variant="ghost" size="sm" aria-label="Turun" disabled={idx === items.length - 1} onClick={() => swap(item, items[idx + 1])}>↓</Button>
              <Button type="button" variant="ghost" size="sm" aria-label="Hapus isi ini" title="Hapus isi ini" className="text-destructive" onClick={() => apply([{ table: "items", kind: "delete", id: item.id }])}>✕</Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("title") as HTMLInputElement;
          const title = input.value.trim();
          if (!title) return;
          const sort_order = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;
          apply([{ table: "items", kind: "insert", row: { id: crypto.randomUUID(), stage_id: stageId, title, qty: 1, note: null, due_date: null, sort_order } }]);
          input.value = "";
        }}
      >
        <Input name="title" placeholder="Tambah isi, mis. Paspor" maxLength={300} />
        <Button type="submit" variant="outline">Tambah</Button>
      </form>
    </div>
  );
}
