import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const targetFile = path.join(rootDir, "supabase", "all-migrations.sql");

const HEADER = `-- GENERATED: all migrations concatenated in order. Do not edit; edit supabase/migrations/*.sql and regenerate.
-- Paste into the Supabase SQL Editor on a NEW, empty project and run once.

`;

async function main() {
  const checkMode = process.argv.includes("--check");
  const entries = await fs.readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

  const parts = [HEADER];

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    let content = await fs.readFile(filePath, "utf-8");
    // Normalize line endings to LF and trim trailing whitespace
    content = content.replace(/\r\n/g, "\n").trimEnd();
    parts.push(`-- ===== migrations/${file} =====\n${content}\n\n`);
  }

  const generated = parts.join("").trimEnd() + "\n";

  if (checkMode) {
    try {
      const existing = (await fs.readFile(targetFile, "utf-8")).replace(/\r\n/g, "\n");
      if (existing !== generated) {
        console.error("supabase/all-migrations.sql is out of date. Run 'pnpm run db:concat' to update it.");
        process.exit(1);
      }
      console.log("supabase/all-migrations.sql is up to date.");
    } catch (err) {
      console.error("Failed to read all-migrations.sql:", err);
      process.exit(1);
    }
  } else {
    await fs.writeFile(targetFile, generated, "utf-8");
    console.log(`Generated ${targetFile} from ${sqlFiles.length} migrations.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
