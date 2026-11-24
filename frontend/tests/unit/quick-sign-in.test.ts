import { beforeAll, describe, expect, it } from "vitest";
import {
  accountByLoginPhone,
  authenticate,
  changePassword,
  linkGoogle,
  registerAccount,
  registerPhoneAccount,
  removeLoginPhone,
  setLoginPhone,
  signInWithGoogle,
  updateProfile,
} from "@/lib/server/accounts";
import { checkPhoneCode, createPhoneTicket, isDemoPhone, readPhoneTicket, sendPhoneCode } from "@/lib/server/phone-code";
import { phoneCodeSchema, phoneProfileSchema } from "@/lib/validations";

// Its own database, and a session secret for the phone tickets.
beforeAll(() => {
  process.env.MONGODB_DB = "events_emporio_quick_sign_in";
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
});

describe("phone codes (no SMS service: development stand-in)", () => {
  it("accepts the right code once, and refuses wrong ones", async () => {
    const sent = await sendPhoneCode("98765 43210");
    if (!sent.ok || !sent.devCode) throw new Error("no code");
    const wrong = sent.devCode === "000000" ? "111111" : "000000";
    expect(await checkPhoneCode("9876543210", wrong)).toBe(false);
    expect(await checkPhoneCode("+91 98765-43210", sent.devCode)).toBe(true);
    expect(await checkPhoneCode("9876543210", sent.devCode)).toBe(false);
  });

  it("stops accepting a code after five wrong tries", async () => {
    const sent = await sendPhoneCode("9876500001");
    if (!sent.ok || !sent.devCode) throw new Error("no code");
    const wrong = sent.devCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(await checkPhoneCode("9876500001", wrong)).toBe(false);
    expect(await checkPhoneCode("9876500001", sent.devCode)).toBe(false);
  });

  it("the code form accepts any 6 digits and nothing else", () => {
    const parse = (code: string) => phoneCodeSchema.safeParse({ phone: "9876543210", code }).success;
    expect(phoneProfileSchema.safeParse({ ticket: "t", name: "Asha Mir", email: "" }).success).toBe(true);
    expect(phoneProfileSchema.safeParse({ ticket: "t", name: "Asha Mir" }).success).toBe(true);
    expect(phoneProfileSchema.safeParse({ ticket: "t", name: "Asha Mir", email: "not-an-email" }).success).toBe(false);
    expect(parse("123456")).toBe(true);
    expect(parse(" 004497 ")).toBe(true);
    expect(parse("12345")).toBe(false);
    expect(parse("12a456")).toBe(false);
  });

  it("the demo number signs in with its fixed code, every time, without an SMS", async () => {
    process.env.DEMO_PHONE_NUMBER = "88990 04497";
    process.env.DEMO_PHONE_CODE = "000000";
    try {
      expect(isDemoPhone("+918899004497")).toBe(true);
      expect(isDemoPhone("9876543210")).toBe(false);
      expect(await sendPhoneCode("8899004497")).toEqual({ ok: true });
      expect(await checkPhoneCode("8899004497", "000000")).toBe(true);
      expect(await checkPhoneCode("8899004497", "000000")).toBe(true); // reusable
      expect(await checkPhoneCode("8899004497", "654321")).toBe(false);
      expect(await checkPhoneCode("8899004497", "00000")).toBe(false);
      // Other numbers still get their own one-time codes.
      const other = await sendPhoneCode("9876500002");
      expect(other.ok && other.devCode !== undefined).toBe(true);
      expect(await checkPhoneCode("9876500002", "000000")).toBe(other.ok && other.devCode === "000000");
    } finally {
      delete process.env.DEMO_PHONE_NUMBER;
      delete process.env.DEMO_PHONE_CODE;
    }
    expect(isDemoPhone("8899004497")).toBe(false);
  });

  it("tickets carry the verified number and can't be forged", async () => {
    const ticket = await createPhoneTicket("9876543210");
    expect(await readPhoneTicket(ticket)).toBe("+919876543210");
    expect(await readPhoneTicket(`${ticket.split(".")[0]}.forged`)).toBeNull();
  });
});

describe("phone accounts", () => {
  it("makes an account for a new number, then signs the same number in", async () => {
    expect(await accountByLoginPhone("9811111111")).toBeNull();
    const made = await registerPhoneAccount({ name: "Ruksana Dar", email: "ruksana@example.com", phone: "9811111111" });
    if (!made.ok) throw new Error(made.error);
    expect(made.account.signInWith).toEqual({ password: false, google: false, phone: "+919811111111" });
    expect(made.account.phone).toBe("+919811111111");
    expect((await accountByLoginPhone("+91 98111 11111"))?.id).toBe(made.account.id);
    // No password yet: email + password sign-in must fail, and a first password needs no current one.
    expect(await authenticate("ruksana@example.com", "")).toBeNull();
    expect(await changePassword(made.account.id, "", "first-pass-1")).toBe(true);
    expect((await authenticate("ruksana@example.com", "first-pass-1"))?.id).toBe(made.account.id);
  });

  it("email is optional: several phone accounts can skip it, and add one later", async () => {
    const a = await registerPhoneAccount({ name: "No Email One", phone: "9855555551" });
    const b = await registerPhoneAccount({ name: "No Email Two", email: "", phone: "9855555552" });
    if (!a.ok || !b.ok) throw new Error("couldn't make accounts without an email");
    expect(a.account.email).toBe("");
    // A password signs in with the email, so it waits until there is one.
    expect(await changePassword(a.account.id, "", "first-pass-1")).toBe(false);
    const updated = await updateProfile(a.account.id, { name: "No Email One", email: "Later@Example.com" });
    expect(updated.ok && updated.account.email).toBe("later@example.com");
    expect((await updateProfile(b.account.id, { name: "No Email Two", email: "later@example.com" })).ok).toBe(false);
    // …and can be removed again, since this account signs in with its phone.
    const cleared = await updateProfile(a.account.id, { name: "No Email One", email: "" });
    expect(cleared.ok && cleared.account.email).toBe("");
  });

  it("an account that signs in with its email can't clear it", async () => {
    const acc = await registerAccount({ name: "Has Password", email: "haspw@example.com", password: "has-pass-12" });
    if (!acc.ok) throw new Error(acc.error);
    expect((await updateProfile(acc.account.id, { name: "Has Password", email: "" })).ok).toBe(false);
  });

  it("won't take over an email that already has an account", async () => {
    await registerAccount({ name: "Owner", email: "owner@example.com", password: "owner-pass-1" });
    const res = await registerPhoneAccount({ name: "Someone", email: "owner@example.com", phone: "9822222222" });
    expect(res.ok).toBe(false);
    expect(await accountByLoginPhone("9822222222")).toBeNull();
  });

  it("adds a verified number to an account, once per number, and only removes it if another way remains", async () => {
    const a = await registerAccount({ name: "Aamir", email: "aamir@example.com", password: "aamir-pass-1" });
    const b = await registerAccount({ name: "Bilal", email: "bilal@example.com", password: "bilal-pass-1" });
    if (!a.ok || !b.ok) throw new Error("setup");
    const linked = await setLoginPhone(a.account.id, "9833333333");
    expect(linked.ok && linked.account.signInWith.phone).toBe("+919833333333");
    expect((await setLoginPhone(b.account.id, "9833333333")).ok).toBe(false);
    expect((await removeLoginPhone(a.account.id)).ok).toBe(true);

    const phoneOnly = await registerPhoneAccount({ name: "Phone Only", email: "phoneonly@example.com", phone: "9844444444" });
    if (!phoneOnly.ok) throw new Error(phoneOnly.error);
    expect((await removeLoginPhone(phoneOnly.account.id)).ok).toBe(false);
  });
});

describe("Google accounts", () => {
  it("creates an account, then finds it again by Google id", async () => {
    const first = await signInWithGoogle({ sub: "g-1", email: "Nida@Gmail.com", emailVerified: true, name: "Nida Shah" });
    if (!first.ok) throw new Error(first.error);
    expect(first.account).toMatchObject({ email: "nida@gmail.com", name: "Nida Shah", signInWith: { password: false, google: true } });
    const again = await signInWithGoogle({ sub: "g-1", email: "nida.new@gmail.com", emailVerified: true });
    expect(again.ok && again.account.id).toBe(first.account.id);
  });

  it("links to an existing account with the same verified email, but not an unverified one", async () => {
    const existing = await registerAccount({ name: "Faiz", email: "faiz@example.com", password: "faiz-pass-12" });
    if (!existing.ok) throw new Error(existing.error);
    expect((await signInWithGoogle({ sub: "g-2", email: "faiz@example.com", emailVerified: false })).ok).toBe(false);
    const linked = await signInWithGoogle({ sub: "g-2", email: "faiz@example.com", emailVerified: true });
    expect(linked.ok && linked.account.id).toBe(existing.account.id);
    expect(linked.ok && linked.account.signInWith).toEqual({ password: true, google: true });
  });

  it("connects Google from the profile, once per Google account", async () => {
    const a = await registerAccount({ name: "Hina", email: "hina@example.com", password: "hina-pass-12" });
    const b = await registerAccount({ name: "Irfan", email: "irfan@example.com", password: "irfan-pass-12" });
    if (!a.ok || !b.ok) throw new Error("setup");
    expect((await linkGoogle(a.account.id, "g-3")).ok).toBe(true);
    expect((await linkGoogle(b.account.id, "g-3")).ok).toBe(false);
  });
});
