import { Migrator, type MigrationProvider, type Migration } from "kysely";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { db } from "./client.js";
import { logger } from "../../../shared/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Supports both .ts (tsx dev mode) and .js (compiled production) migration files.
// Converts paths to file:// URLs so ESM import() works on Windows.
const migrationProvider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    const allFiles = await fs.readdir(MIGRATIONS_DIR);
    const migrationFiles = allFiles
      .filter((f) => (f.endsWith(".js") || (f.endsWith(".ts") && !f.endsWith(".d.ts"))))
      .sort();

    const migrations: Record<string, Migration> = {};
    for (const file of migrationFiles) {
      const fileUrl = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
      const key = path.basename(file, path.extname(file));
      migrations[key] = (await import(fileUrl)) as Migration;
    }
    return migrations;
  },
};

export async function runMigrations(): Promise<void> {
  const migrator = new Migrator({ db, provider: migrationProvider });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      logger.info({ migration: result.migrationName }, "Migration applied");
    } else if (result.status === "Error") {
      logger.error({ migration: result.migrationName }, "Migration failed");
    }
  }

  if (error) {
    throw error;
  }
}
