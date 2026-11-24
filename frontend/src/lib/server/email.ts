import { after } from "next/server";

/**
 * Transactional email via Resend (RESEND_API_KEY + EMAIL_FROM). When it
 * isn't configured, messages are logged on the server instead so nothing
 * breaks — set it up before going live so customers receive them.
 *
 * EMAIL_FROM must use a domain verified at resend.com/domains (a gmail.com
 * address is always refused). Until one is verified, the test sender
 * "Name <onboarding@resend.dev>" works, but only to the Resend account's own
 * email address.
 */
export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

/** The e2e server never emails (its test addresses don't exist). */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.E2E !== "1");

export async function sendEmail(to: string, message: EmailMessage): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[email not configured] To: ${to}\nSubject: ${message.subject}\n\n${message.text}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(process.env.EMAIL_REPLY_TO && { reply_to: process.env.EMAIL_REPLY_TO }),
      }),
    });
    if (!res.ok) console.error(`email "${message.subject}" failed`, res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error(`email "${message.subject}" failed`, err);
    return false;
  }
}

/**
 * Sends after the response has gone out, so the customer never waits on the
 * mail server and the send isn't cut off when the request ends. Outside a
 * request (scripts, tests) it just sends in the background.
 */
export function queueEmail(to: string, message: EmailMessage) {
  try {
    after(() => sendEmail(to, message).then(() => undefined));
  } catch {
    void sendEmail(to, message);
  }
}
