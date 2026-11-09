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
  /** How this customer can sign in. */
  signInWith: { password: boolean; google: boolean; phone?: string };
}

interface AccountDoc extends Omit<Account, "signInWith"> {
  _id: string;
  /** Missing for accounts made with Google or a phone code, until a password is set. */
  passwordHash?: string;
  /** Google's account id ("sub"), once the customer has used Google. */
  googleId?: string;
  /** A mobile number proven with a one-time code (+91XXXXXXXXXX). The profile `phone` is only a contact number. */
  loginPhone?: string;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** "98765 43210", "+91 98765-43210" → "+919876543210". */
export const normalisePhone = (phone: string) => `+91${phone.replace(/\D/g, "").slice(-10)}`;

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
  const { passwordHash, googleId, loginPhone, ...rest } = plain<AccountDoc>(doc)!;
  return {
    ...rest,
    addresses: rest.addresses ?? [],
    signInWith: { password: Boolean(passwordHash), google: Boolean(googleId), ...(loginPhone && { phone: loginPhone }) },
  };
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
  return ok && doc?.passwordHash ? toAccount(doc) : null;
}

/* --------------------------- Phone and Google sign-in --------------------------- */

const emailTaken = "This email already has an account. Sign in with it (or Google) once, then add your number under My account.";

/** The account that signs in with this (already verified) number, if any. */
export async function accountByLoginPhone(phone: string): Promise<Account | null> {
  return toAccount(await (await accounts()).findOne({ loginPhone: normalisePhone(phone) }));
}

/** A new account for a number the customer has just verified. */
export async function registerPhoneAccount(input: { name: string; email: string; phone: string }): Promise<RegisterResult> {
  const phone = normalisePhone(input.phone);
  const email = normaliseEmail(input.email);
  const col = await accounts();
  const existing = await col.findOne({ loginPhone: phone });
  if (existing) return { ok: true, account: toAccount(existing)! };
  if (await col.findOne({ email })) return { ok: false, error: emailTaken };
  const id = newId("cus");
  const doc: AccountDoc = { _id: id, id, name: input.name.trim(), email, phone, loginPhone: phone, addresses: [], createdAt: new Date().toISOString() };
  try {
    await col.insertOne(doc);
  } catch {
    return { ok: false, error: emailTaken };
  }
  return { ok: true, account: toAccount(doc)! };
}

/** Lets a signed-in customer sign in with a number they've just verified. */
export async function setLoginPhone(id: string, phoneInput: string): Promise<RegisterResult> {
  const phone = normalisePhone(phoneInput);
  const col = await accounts();
  if (await col.findOne({ loginPhone: phone, _id: { $ne: id } })) return { ok: false, error: "This number already signs in to another account." };
  const doc = await col.findOne({ _id: id });
  if (!doc) return { ok: false, error: "Account not found." };
  // Also use it as the contact number when there isn't one yet.
  await col.updateOne({ _id: id }, { $set: { loginPhone: phone, ...(!doc.phone && { phone }) } });
  return { ok: true, account: (await getAccount(id))! };
}

export async function removeLoginPhone(id: string): Promise<RegisterResult> {
  const col = await accounts();
  const doc = await col.findOne({ _id: id });
  if (!doc) return { ok: false, error: "Account not found." };
  if (!doc.passwordHash && !doc.googleId) return { ok: false, error: "Add a password or Google first, so you can still sign in." };
  await col.updateOne({ _id: id }, { $unset: { loginPhone: "" } });
  return { ok: true, account: (await getAccount(id))! };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

/**
 * Signs in with Google: the account already linked to this Google id, else the account with the
 * same (Google-verified) email, which gets linked, else a new account.
 */
export async function signInWithGoogle(profile: GoogleProfile): Promise<RegisterResult> {
  const col = await accounts();
  const linked = await col.findOne({ googleId: profile.sub });
  if (linked) return { ok: true, account: toAccount(linked)! };
  const email = normaliseEmail(profile.email);
  const sameEmail = await col.findOne({ email });
  if (sameEmail) {
    if (!profile.emailVerified) return { ok: false, error: emailTaken };
    await col.updateOne({ _id: sameEmail._id }, { $set: { googleId: profile.sub } });
    return { ok: true, account: (await getAccount(sameEmail._id))! };
  }
  const id = newId("cus");
  const name = profile.name?.trim() || email.split("@")[0];
  const doc: AccountDoc = { _id: id, id, name, email, googleId: profile.sub, addresses: [], createdAt: new Date().toISOString() };
  try {
    await col.insertOne(doc);
  } catch {
    return { ok: false, error: emailTaken };
  }
  return { ok: true, account: toAccount(doc)! };
}

/** Connects Google to the signed-in account. */
export async function linkGoogle(id: string, sub: string): Promise<RegisterResult> {
  const col = await accounts();
  const other = await col.findOne({ googleId: sub, _id: { $ne: id } });
  if (other) return { ok: false, error: "This Google account already signs in to another account." };
  await col.updateOne({ _id: id }, { $set: { googleId: sub } });
  const account = await getAccount(id);
  return account ? { ok: true, account } : { ok: false, error: "Account not found." };
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

/** Changes the password, or sets a first one (no current password needed) for Google and phone accounts. */
export async function changePassword(id: string, current: string, next: string): Promise<boolean> {
  const col = await accounts();
  const doc = await col.findOne({ _id: id });
  if (!doc || (doc.passwordHash && !(await verifyPassword(current, doc.passwordHash)))) return false;
  await col.updateOne({ _id: id }, { $set: { passwordHash: await hashPassword(next) } });
  return true;
}
