import { describe, expect, it } from "vitest";
import { isMissingColumn } from "./db-errors";

describe("isMissingColumn", () => {
  it("recognises Postgres and PostgREST missing-column errors", () => {
    expect(isMissingColumn({ code: "42703", message: 'column "description" of relation "projects" does not exist' })).toBe(true);
    expect(isMissingColumn({ code: "PGRST204", message: "Could not find the 'description' column of 'projects' in the schema cache" }, "description")).toBe(true);
    expect(isMissingColumn({ message: "column projects.description does not exist" }, "description")).toBe(true);
  });

  it("does not hide unrelated errors", () => {
    expect(isMissingColumn(null)).toBe(false);
    expect(isMissingColumn(undefined)).toBe(false);
    expect(isMissingColumn({ code: "42501", message: "new row violates row-level security policy" })).toBe(false);
    expect(isMissingColumn({ message: "Failed to fetch" })).toBe(false);
  });
});
