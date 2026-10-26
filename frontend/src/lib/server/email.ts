/**
 * Transactional email via Resend (RESEND_API_KEY + EMAIL_FROM). When it
 * isn't configured, messages are logged on the server instead so nothing
 * breaks — set it up before going live so customers receive them.
 */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[email not configured] To: ${to}\nSubject: ${subject}\n\n${text}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("email failed", err);
    return false;
  }
}
