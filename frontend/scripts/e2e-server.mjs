/**
 * Dev server for the Playwright tests, kept apart from your own:
 * port 3100, build output in .next-e2e, and its own database
 * (events_emporio_e2e on the local `npm run db:local` server, never your
 * Atlas cluster), emptied before every run so each run starts from a fresh
 * install. Set E2E_MONGODB_URI to use a different test server.
 * Started by playwright.config.ts.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { MongoClient } from "mongodb";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* no local env file */
}

// Two dev servers in one project folder watch each other's build output and keep
// reloading each other's pages, which makes the tests (and your own tab) flaky.
try {
  const { pid, appUrl } = JSON.parse(readFileSync(".next/dev/lock", "utf8"));
  process.kill(pid, 0); // throws if that server has stopped
  console.error(
    `e2e: your dev server (${appUrl}, process ${pid}) is running in this folder. Stop it (Ctrl+C in its terminal) before running the e2e tests — two dev servers here reload each other's pages.`,
  );
  process.exit(1);
} catch {
  /* no other dev server running */
}

const uri = process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.E2E_MONGODB_DB ?? "events_emporio_e2e";
if (!dbName.endsWith("_e2e")) {
  console.error(`Refusing to reset "${dbName}": the e2e database name must end in _e2e.`);
  process.exit(1);
}

const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect().catch((err) => {
  console.error(`e2e: can't reach the test database at ${uri.replace(/\/\/[^@]*@/, "//…@")} — start it with \`npm run db:local\`.`);
  throw err;
});
await client.db(dbName).dropDatabase();
await client.close();
console.log(`e2e: reset database ${dbName}`);

const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const server = spawn(process.execPath, [next, "dev", "-p", process.env.E2E_PORT ?? "3100"], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: uri, MONGODB_DB: dbName, NEXT_DIST_DIR: ".next-e2e", E2E: "1" },
});
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
