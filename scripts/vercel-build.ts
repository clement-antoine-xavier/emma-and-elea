import {execSync} from "node:child_process";

function run(command: string): void {
  execSync(command, {stdio: "inherit", env: process.env});
}

run("prisma generate");

// Preview deployments share the production database by default. Running
// migrations there would let an unreviewed branch change production schema, so
// only production builds apply migrations. Connect a separate Prisma Postgres
// resource per environment when previews need their own data.
if (process.env.VERCEL_ENV === "production") {
  run("prisma migrate deploy");
}

run("next build");
