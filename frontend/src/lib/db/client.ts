import { MongoBulkWriteError, MongoClient, type Db, type Document } from "mongodb";
import { seedDocuments } from "./seed";

/**
 * MongoDB connection (server only). One client per process, reused across
 * requests and hot reloads. Set MONGODB_URI (Atlas in production; `npm run
 * db:local` for development) and optionally MONGODB_DB.
 *
 * Every entity document uses its own string `id` as `_id`, so lookups,
 * upserts and deletes work by id without ObjectId conversion.
 */

declare global {
  var __eeMongo: Promise<MongoClient> | undefined;
  var __eeDbReady: Promise<void> | undefined;
  var __eeFunctionsReady: Promise<void> | undefined;
}

export const COLLECTIONS = [
  "products",
  "categories",
  "kitFunctions",
  "customerKits",
  "orders",
  "accounts",
  "passwordResets",
  "coupons",
  "content",
  "settings",
  "enquiries",
  "customRequests",
  "productReviews",
  "stockMovements",
  "auditLog",
  "counters",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add your MongoDB Atlas connection string to .env.local (or run `npm run db:local` for development).");
    this.name = "DatabaseNotConfiguredError";
  }
}

export const databaseConfigured = () => Boolean(process.env.MONGODB_URI);

const isDuplicateKeyOnly = (err: unknown) => err instanceof MongoBulkWriteError && [err.writeErrors].flat().every((e) => e.code === 11000);

async function prepare(db: Db) {
  await Promise.all([
    db.collection("products").createIndex({ slug: 1 }, { unique: true }),
    db.collection("products").createIndex({ status: 1, categorySlug: 1 }),
    db.collection("categories").createIndex({ slug: 1 }, { unique: true }),
    db.collection("orders").createIndex({ number: 1 }, { unique: true }),
    db.collection("orders").createIndex({ createdAt: -1 }),
    db.collection("orders").createIndex({ "customer.email": 1 }),
    db.collection("orders").createIndex({ razorpayOrderId: 1 }, { sparse: true }),
    db.collection("accounts").createIndex({ email: 1 }, { unique: true }),
    db.collection("passwordResets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("coupons").createIndex({ code: 1 }, { unique: true }),
    db.collection("productReviews").createIndex({ productId: 1, status: 1, createdAt: -1 }),
    db.collection("productReviews").createIndex({ customerId: 1, productId: 1 }, { unique: true }),
    db.collection("auditLog").createIndex({ at: -1 }),
  ]);

  // First run only: copy the starting catalogue, kits and site content in. Never overwrites.
  const seeded = await db.collection<{ _id: string }>("counters").findOne({ _id: "seeded" });
  if (seeded) return;
  for (const [name, docs] of Object.entries(seedDocuments()) as [CollectionName, Document[]][]) {
    if (!docs.length) continue;
    const col = db.collection(name);
    if ((await col.estimatedDocumentCount()) > 0) continue;
    // Another server instance may be seeding at the same moment; documents it already added are skipped.
    await col.insertMany(docs, { ordered: false }).catch((err: unknown) => {
      if (!isDuplicateKeyOnly(err)) throw err;
    });
  }
  await db
    .collection<{ _id: string; at: Date }>("counters")
    .updateOne({ _id: "seeded" }, { $setOnInsert: { at: new Date() } }, { upsert: true });
}

/**
 * Functions moved from code into the database after launch, so databases
 * seeded before that get the starting functions once (the ones their kit
 * products already use). The shop edits them from then on.
 */
async function seedKitFunctions(db: Db) {
  const counters = db.collection<{ _id: string; at?: Date }>("counters");
  if (await counters.findOne({ _id: "seeded:kitFunctions" })) return;
  const col = db.collection("kitFunctions");
  if ((await col.estimatedDocumentCount()) === 0) {
    await col.insertMany(seedDocuments().kitFunctions, { ordered: false }).catch((err: unknown) => {
      if (!isDuplicateKeyOnly(err)) throw err;
    });
  }
  await counters.updateOne({ _id: "seeded:kitFunctions" }, { $setOnInsert: { at: new Date() } }, { upsert: true });
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseNotConfiguredError();
  globalThis.__eeMongo ??= new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000, ignoreUndefined: true }).connect();
  let client: MongoClient;
  try {
    client = await globalThis.__eeMongo;
  } catch (err) {
    globalThis.__eeMongo = undefined; // allow a retry on the next request
    throw err;
  }
  const db = client.db(process.env.MONGODB_DB || "events_emporio");
  globalThis.__eeDbReady ??= prepare(db).catch((err) => {
    globalThis.__eeDbReady = undefined;
    throw err;
  });
  await globalThis.__eeDbReady;
  // Kept apart from prepare() so a server that was already running picks it up too.
  globalThis.__eeFunctionsReady ??= seedKitFunctions(db).catch((err) => {
    globalThis.__eeFunctionsReady = undefined;
    throw err;
  });
  await globalThis.__eeFunctionsReady;
  return db;
}

/** Plain objects for the app: drops Mongo's `_id` (each document keeps its own `id`). */
export function plain<T>(doc: Document | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  void _id;
  return rest as T;
}

export const plainAll = <T>(docs: Document[]): T[] => docs.map((d) => plain<T>(d)!);

/** Next sequential number for e.g. order numbers (atomic). */
export async function nextSequence(name: string): Promise<number> {
  const db = await getDb();
  const res = await db
    .collection<{ _id: string; value: number }>("counters")
    .findOneAndUpdate({ _id: `seq:${name}` }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" });
  return res?.value ?? 1;
}
