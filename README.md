# Sevn Studio

Visual workflow sandbox. Spesifikasi: [docs/PRD.md](docs/PRD.md). Aturan kerja: [CLAUDE.md](CLAUDE.md).

## Status

Fase 1 (Fondasi) dan Fase 2 (Engine, template, run) selesai di sisi kode. Belum diverifikasi terhadap database nyata (lihat "Verifikasi yang tertunda").

## Menjalankan

```bash
pnpm install
pnpm test          # engine, handlers, dan logika editor/run (tanpa database)
pnpm typecheck
```

Web app butuh sebuah project Supabase:

1. Terapkan `supabase/migrations/0001` sampai `0010` berurutan (Supabase CLI: `supabase db push`, atau SQL editor).
2. Salin `apps/web/.env.example` menjadi `apps/web/.env.local` dan isi URL serta anon key project.
3. `pnpm --filter @sevn/web dev`
4. Opsional (hanya DB lokal): `supabase/seed.sql` membuat user dev dan project contoh.

## Verifikasi yang tertunda

- `supabase/tests/rls.sql` (uji RLS dua-user) belum dijalankan.
- Alur UI (login, canvas, template, run) belum dicoba di browser dengan data nyata.
