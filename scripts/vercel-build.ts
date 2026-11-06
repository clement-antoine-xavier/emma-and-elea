import "dotenv/config";
import {execFileSync} from "node:child_process";
import {Client} from "pg";

/**
 * Production builds can run concurrently (a merge and a manual redeploy, for
 * example). `prisma migrate deploy` is not safe to run twice at once, so every
 * build takes a PostgreSQL advisory lock before applying migrations. The lock
 * is session-scoped, released in `finally`, and the build fails if it cannot be
 * acquired before the timeout.
 */
const LOCK_NAMESPACE = 7311;
const LOCK_ID = 2026;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const RETRY_INTERVAL_MS = 2_000;

function run(command: string, args: string[]): void {
  execFileSync(command, args, {stdio: "inherit", env: process.env});
}

async function appliedMigrationCount(client: Client): Promise<number> {
  try {
    const result = await client.query<{count: number}>(
      "SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL",
    );
    return result.rows[0]?.count ?? 0;
  } catch (error) {
    // The migrations table does not exist before the first deployment.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as {code?: unknown}).code === "42P01"
    ) {
      return 0;
    }
    throw error;
  }
}

async function acquireLock(client: Client): Promise<void> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() <= deadline) {
    const result = await client.query<{locked: boolean}>(
      "SELECT pg_try_advisory_lock($1, $2) AS locked",
      [LOCK_NAMESPACE, LOCK_ID],
    );
    if (result.rows[0]?.locked) return;

    console.log(
      "Another production build holds the migration lock; waiting…",
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
  }

  throw new Error(
    `Could not acquire the migration advisory lock within ${
      LOCK_TIMEOUT_MS / 1000
    }s.`,
  );
}

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to apply migrations.");
  }

  const client = new Client({
    connectionString,
    application_name: "emma-and-elea-migrator",
  });
  await client.connect();

  try {
    await acquireLock(client);
    try {
      const before = await appliedMigrationCount(client);
      run("prisma", ["migrate", "deploy"]);
      const after = await appliedMigrationCount(client);

      console.log(
        `Applied ${after - before} migration(s); ${after} total applied.`,
      );
    } finally {
      await client.query("SELECT pg_advisory_unlock($1, $2)", [
        LOCK_NAMESPACE,
        LOCK_ID,
      ]);
    }
  } finally {
    await client.end();
  }
}

run("prisma", ["generate"]);

async function main(): Promise<void> {
  // Preview deployments share the production database by default. Running
  // migrations there would let an unreviewed branch change production schema,
  // so only production builds apply migrations. Connect a separate Prisma
  // Postgres resource per environment when previews need their own data.
  if (process.env.VERCEL_ENV === "production") {
    await migrate();
  }

  run("next", ["build"]);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "The Vercel build failed.",
  );
  process.exit(1);
});
