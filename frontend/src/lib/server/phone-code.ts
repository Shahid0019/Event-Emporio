import { createHash, randomInt } from "node:crypto";
import { getDb } from "../db/client";
import { createSignedToken, readSignedToken } from "../signed-token";
import { normalisePhone } from "./accounts";
import { sessionSecret } from "./customer-session";

/**
 * One-time sign-in codes by SMS, sent and checked by Twilio Verify (TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID). Verify sends from sender ids already
 * registered for Indian SMS rules (DLT), so no template setup is needed here.
 * Without Twilio, development and tests make the code here and show it on screen instead;
 * in production phone sign-in stays hidden until Twilio is set up.
 */
const twilio = () => {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_VERIFY_SERVICE_SID: service } = process.env;
  return sid && token && service ? { sid, token, service } : null;
};

export const phoneSignInAvailable = () => Boolean(twilio()) || process.env.NODE_ENV !== "production";

export const CODE_MINUTES = 10;
const MAX_TRIES = 5;

async function twilioVerify(path: "Verifications" | "VerificationCheck", form: Record<string, string>) {
  const t = twilio()!;
  return fetch(`https://verify.twilio.com/v2/Services/${t.service}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${t.sid}:${t.token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
}

/* Development stand-in for Twilio: one hashed code per number, with an expiry and a try limit. */
type CodeDoc = { _id: string; hash: string; expiresAt: Date; tries: number };
const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");
const codes = async () => (await getDb()).collection<CodeDoc>("phoneCodes");

export type SendResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function sendPhoneCode(phoneInput: string): Promise<SendResult> {
  const phone = normalisePhone(phoneInput);
  if (twilio()) {
    try {
      const res = await twilioVerify("Verifications", { To: phone, Channel: "sms" });
      if (res.ok) return { ok: true };
      console.error("phone code failed", res.status, await res.text());
    } catch (err) {
      console.error("phone code failed", err);
    }
    return { ok: false, error: "We couldn't send a code to this number. Check it and try again." };
  }
  if (!phoneSignInAvailable()) return { ok: false, error: "Sign-in with a mobile number isn't available right now." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await (await codes()).updateOne(
    { _id: phone },
    { $set: { hash: hashCode(phone, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), tries: 0 } },
    { upsert: true },
  );
  console.info(`[sms not configured] Sign-in code for ${phone}: ${code}`);
  return { ok: true, devCode: code };
}

/** True when the code is right. Each code works once. */
export async function checkPhoneCode(phoneInput: string, code: string): Promise<boolean> {
  const phone = normalisePhone(phoneInput);
  if (twilio()) {
    try {
      const res = await twilioVerify("VerificationCheck", { To: phone, Code: code });
      // 404: no code waiting (expired, used, or too many tries).
      if (!res.ok) return false;
      return ((await res.json()) as { status?: string }).status === "approved";
    } catch (err) {
      console.error("phone code check failed", err);
      return false;
    }
  }
  if (!phoneSignInAvailable()) return false;
  const col = await codes();
  const doc = await col.findOneAndUpdate({ _id: phone, expiresAt: { $gt: new Date() } }, { $inc: { tries: 1 } }, { returnDocument: "after" });
  if (!doc || doc.tries > MAX_TRIES || doc.hash !== hashCode(phone, code)) return false;
  await col.deleteOne({ _id: phone });
  return true;
}

/* A short-lived proof that this number was verified, for the "new account" step. */
const ticketSecret = () => `${sessionSecret()}:verified-phone`;
const TICKET_SECONDS = 15 * 60;

export const createPhoneTicket = (phone: string) => createSignedToken(ticketSecret(), normalisePhone(phone), TICKET_SECONDS);
export const readPhoneTicket = (ticket: string) => readSignedToken(ticketSecret(), ticket);
