import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb, plain } from "../db/client";
import type { Address } from "../types";
import { newId } from "../utils";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** A customer account as the app sees it — never includes the password hash. */
export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  addresses: Address[];
  createdAt: string;
}

interface AccountDoc extends Account {
  _id: string;
  passwordHash: string;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const toAccount = (doc: AccountDoc | null): Account | null => {
  if (!doc) return null;
  const { passwordHash, ...rest } = plain<AccountDoc>(doc)!;
  void passwordHash;
  return { ...rest, addresses: rest.addresses ?? [] };
};

async function accounts() {
  return (await getDb()).collection<AccountDoc>("accounts");
}

export async function getAccount(id: string): Promise<Account | null> {
  return toAccount(await (await accounts()).findOne({ _id: id }));
}

export type RegisterResult = { ok: true; account: Account } | { ok: false; error: string };

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  const email = normaliseEmail(input.email);
  const col = await accounts();
  if (await col.findOne({ email })) return { ok: false, error: "An account with this email already exists. Try signing in." };
  const id = newId("cus");
  const doc: AccountDoc = {
    _id: id,
    id,
    name: input.name.trim(),
    email,
    addresses: [],
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(input.password),
  };
  try {
    await col.insertOne(doc);
  } catch {
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }
  return { ok: true, account: toAccount(doc)! };
}

/** Same message and similar timing whether the email or the password is wrong. */
export async function authenticate(emailInput: string, password: string): Promise<Account | null> {
  const doc = await (await accounts()).findOne({ email: normaliseEmail(emailInput) });
  const ok = await verifyPassword(password, doc?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  return ok && doc ? toAccount(doc) : null;
}

export async function updateProfile(id: string, input: { name: string; email: string; phone?: string }): Promise<RegisterResult> {
  const email = normaliseEmail(input.email);
  const col = await accounts();
  const clash = await col.findOne({ email, _id: { $ne: id } });
  if (clash) return { ok: false, error: "Another account already uses this email." };
  const phone = input.phone?.trim();
  await col.updateOne(
    { _id: id },
    phone ? { $set: { name: input.name.trim(), email, phone } } : { $set: { name: input.name.trim(), email }, $unset: { phone: "" } },
  );
  const account = await getAccount(id);
  return account ? { ok: true, account } : { ok: false, error: "Account not found." };
}

export async function saveAddresses(id: string, addresses: Address[]) {
  // Exactly one default when there are addresses.
  const list = addresses.map((a, i) => ({ ...a, isDefault: addresses.some((x) => x.isDefault) ? Boolean(a.isDefault) : i === 0 }));
  await (await accounts()).updateOne({ _id: id }, { $set: { addresses: list } });
}

/* ------------------------------ Password reset ------------------------------ */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const RESET_MINUTES = 60;

/** Creates a single-use reset token (only its hash is stored). Null when no account has this email. */
export async function createPasswordReset(emailInput: string): Promise<{ token: string; account: Account } | null> {
  const account = toAccount(await (await accounts()).findOne({ email: normaliseEmail(emailInput) }));
  if (!account) return null;
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.collection<{ _id: string; accountId: string; expiresAt: Date }>("passwordResets").insertOne({
    _id: sha256(token),
    accountId: account.id,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
  });
  return { token, account };
}

export async function resetPassword(token: string, password: string): Promise<boolean> {
  const db = await getDb();
  const reset = await db
    .collection<{ _id: string; accountId: string; expiresAt: Date }>("passwordResets")
    .findOneAndDelete({ _id: sha256(token), expiresAt: { $gt: new Date() } });
  if (!reset) return false;
  await (await accounts()).updateOne({ _id: reset.accountId }, { $set: { passwordHash: await hashPassword(password) } });
  return true;
}

export async function changePassword(id: string, current: string, next: string): Promise<boolean> {
  const col = await accounts();
  const doc = await col.findOne({ _id: id });
  if (!doc || !(await verifyPassword(current, doc.passwordHash))) return false;
  await col.updateOne({ _id: id }, { $set: { passwordHash: await hashPassword(next) } });
  return true;
}
