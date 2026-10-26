import { MongoMemoryServer } from "mongodb-memory-server";

/** A throwaway MongoDB for the unit tests; seeded on first connection like a fresh install. */
let server: MongoMemoryServer | undefined;

export async function setup() {
  server = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  process.env.MONGODB_URI = server.getUri();
  process.env.MONGODB_DB = "events_emporio_test";
}

export async function teardown() {
  await server?.stop();
}
