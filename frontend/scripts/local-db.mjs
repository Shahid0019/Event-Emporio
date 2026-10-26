/**
 * Local MongoDB for development — no Docker or install needed.
 * Data is kept in ./.local-db (git-ignored), so it survives restarts.
 *
 *   npm run db:local        → mongodb://127.0.0.1:27017
 *
 * For staging/production use MongoDB Atlas (MONGODB_URI in .env.local).
 */
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = new URL("../.local-db", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: {
    port: Number(process.env.LOCAL_DB_PORT ?? 27017),
    ip: "127.0.0.1",
    dbPath,
    storageEngine: "wiredTiger",
    launchTimeout: 120_000,
  },
});
console.log(`Local MongoDB running at ${server.getUri()}  (data: ${dbPath})`);
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
