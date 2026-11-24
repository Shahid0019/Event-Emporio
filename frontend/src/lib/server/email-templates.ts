import { siteName } from "../seo";
import { siteUrl } from "../site";
import type { Order, OrderLine, OrderStatus } from "../types";
import { formatPrice } from "../utils";
import type { EmailMessage } from "./email";

/**
 * The emails customers get: welcome, order placed, each step of the order
 * (packed, shipped, delivered), cancellations, refunds and password resets.
 * Every email has an HTML version (table layout with inline styles, which is
 * what email apps render reliably) and a plain-text version.
 */

const color = {
  brand: "#425e2a",
  brandInk: "#f8f6f1",
  ink: "#222923",
  muted: "#646b62",
  line: "#e2e5d9",
  surface: "#eff1e7",
  page: "#f8f6f1",
  success: "#2b7a4b",
  danger: "#a33a2b",
};
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const serif = "Georgia,'Times New Roman',serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (path: string) => `${siteUrl}${path}`;

const istTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const istDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const longDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const formatIst = (iso: string) => istTime.format(new Date(iso));

/** Order number and email filled in, so one tap shows the order. */
export const trackOrderUrl = (order: Pick<Order, "number" | "customer">) =>
  url(`/track-order?order=${encodeURIComponent(order.number)}&email=${encodeURIComponent(order.customer.email)}`);

/* -------------------------------- Pieces -------------------------------- */

function button(label: string, href: string, kind: "primary" | "secondary" = "primary") {
  const primary = kind === "primary";
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 20px;border-radius:8px;font:600 15px/1 ${font};text-decoration:none;white-space:nowrap;${
    primary ? `background:${color.brand};color:${color.brandInk};border:1px solid ${color.brand};` : `background:#ffffff;color:${color.ink};border:1px solid #cbd1bf;`
  }">${esc(label)}</a>`;
}

/** Side by side when they fit, wrapping onto the next line on narrow screens. */
const buttons = (...items: string[]) => `<div style="margin:24px 0 4px">${items.join("")}</div>`;

const heading = (text: string) => `<h1 style="margin:0 0 12px;font:normal 26px/1.25 ${serif};color:${color.ink}">${text}</h1>`;
const para = (html: string) => `<p style="margin:0 0 14px;font:15px/1.6 ${font};color:${color.ink}">${html}</p>`;
const small = (html: string) => `<p style="margin:0 0 10px;font:13px/1.55 ${font};color:${color.muted}">${html}</p>`;
const sectionTitle = (text: string) =>
  `<p style="margin:28px 0 10px;font:600 12px/1 ${font};letter-spacing:.08em;text-transform:uppercase;color:${color.muted}">${esc(text)}</p>`;

function layout({ preheader, body }: { preheader: string; body: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(siteName)}</title></head>
<body style="margin:0;padding:0;background:${color.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px"><a href="${esc(siteUrl)}" style="font:normal 22px/1 ${serif};color:${color.brand};text-decoration:none">${esc(siteName)}</a></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${color.line};border-radius:14px;padding:28px 24px">${body}</td></tr>
<tr><td style="padding:18px 4px 0;font:12px/1.6 ${font};color:${color.muted}">
Questions? Just reply to this email or <a href="${esc(url("/contact"))}" style="color:${color.muted}">contact us</a>.<br>
<a href="${esc(url("/track-order"))}" style="color:${color.muted}">Track an order</a> · <a href="${esc(url("/returns-policy"))}" style="color:${color.muted}">Returns</a> · <a href="${esc(url("/faq"))}" style="color:${color.muted}">FAQ</a><br>
Team Khandr · ${esc(siteName)}
</td></tr>
</table></td></tr></table></body></html>`;
}

const textFooter = `\n\nQuestions? Reply to this email or visit ${url("/contact")}\n\nTeam Khandr\n${siteName}`;

/* ----------------------------- Order progress ----------------------------- */

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

/** When the order reached each step (latest time it entered that status). */
function stepTimes(order: Order) {
  return STEPS.map((s) => [...order.history].reverse().find((h) => h.status === s.status)?.at);
}

/** Confirmed → Packed → Shipped → Delivered, with the date each step was reached. */
function progressHtml(order: Order, current: OrderStatus) {
  const at = STEPS.findIndex((s) => s.status === current);
  if (at < 0) return "";
  const times = stepTimes(order);
  const cells = STEPS.map((s, i) => {
    const done = i <= at;
    const dot = done
      ? `<span style="display:inline-block;width:22px;height:22px;border-radius:11px;background:${color.brand};color:${color.brandInk};font:700 12px/22px ${font};text-align:center">✓</span>`
      : `<span style="display:inline-block;width:20px;height:20px;border-radius:11px;border:1px solid #cbd1bf;background:#ffffff"></span>`;
    const when = done && times[i] ? istDay.format(new Date(times[i]!)) : "&nbsp;";
    return `<td width="25%" align="center" valign="top" style="padding:0 2px">
${dot}
<div style="margin-top:6px;font:${i === at ? 600 : 400} 12px/1.3 ${font};color:${done ? color.ink : color.muted}">${s.label}</div>
<div style="font:11px/1.3 ${font};color:${color.muted}">${when}</div></td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;background:${color.surface};border-radius:10px"><tr><td style="padding:16px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr></table>`;
}

function progressText(order: Order, current: OrderStatus) {
  const at = STEPS.findIndex((s) => s.status === current);
  if (at < 0) return "";
  const times = stepTimes(order);
  return (
    "\n\nOrder progress:\n" +
    STEPS.map((s, i) => `  ${i <= at ? "[x]" : "[ ]"} ${s.label}${i <= at && times[i] ? ` — ${formatIst(times[i]!)}` : ""}`).join("\n")
  );
}

/* ------------------------------ Order summary ------------------------------ */

/** Kit lines are grouped under their kit; everything else is listed as is. */
function groupLines(lines: OrderLine[]) {
  const groups: { kit?: OrderLine["bundle"]; lines: OrderLine[] }[] = [];
  for (const line of lines) {
    const group = line.bundle ? groups.find((g) => g.kit?.id === line.bundle!.id) : undefined;
    if (group) group.lines.push(line);
    else groups.push({ kit: line.bundle, lines: [line] });
  }
  return groups;
}

const imageSrc = (src: string) => (/^https?:\/\//i.test(src) ? src : url(src.startsWith("/") ? src : `/${src}`));

function lineRow(line: OrderLine) {
  const src = imageSrc(line.image?.src ?? "");
  // Email apps can't load pictures from a dev machine, so they only appear once the site is live on https.
  const thumb =
    line.image?.src && src.startsWith("https://")
      ? `<td width="60" valign="top" style="padding:8px 0"><img src="${esc(src)}" alt="" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:8px;object-fit:cover;background:${color.surface}"></td>`
      : "";
  return `<tr>
${thumb}<td valign="top" style="padding:${thumb ? "8px" : "8px 8px 8px 0"};font:14px/1.45 ${font};color:${color.ink}">${esc(line.name)}<br><span style="color:${color.muted};font-size:13px">${esc(line.variantLabel)} · Qty ${line.quantity}</span>${
    line.giftMessage ? `<br><span style="color:${color.muted};font-size:13px">Gift note: “${esc(line.giftMessage)}”</span>` : ""
  }</td>
<td valign="top" align="right" style="padding:8px 0;font:14px/1.45 ${font};color:${color.ink};white-space:nowrap">${formatPrice(line.unitPrice * line.quantity)}</td></tr>`;
}

function summaryHtml(order: Order) {
  const rows = groupLines(order.lines)
    .map((g) =>
      g.kit
        ? `<tr><td colspan="3" style="padding:12px 0 2px;font:600 14px/1.4 ${font};color:${color.ink}">${esc(g.kit.name)}<br><span style="font-weight:400;font-size:13px;color:${color.muted}">${esc(g.kit.summary)}</span></td></tr>${g.lines.map(lineRow).join("")}`
        : g.lines.map(lineRow).join(""),
    )
    .join("");
  const t = order.totals;
  const total = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:3px 0;font:${strong ? "600 16px" : "14px"}/1.5 ${font};color:${strong ? color.ink : color.muted}">${label}</td><td align="right" style="padding:3px 0;font:${strong ? "600 16px" : "14px"}/1.5 ${font};color:${color.ink};white-space:nowrap">${value}</td></tr>`;
  const totals = [
    total("Subtotal", formatPrice(t.subtotal)),
    t.discount > 0 ? total(`Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}`, `−${formatPrice(t.discount)}`) : "",
    total(`Delivery · ${esc(order.shippingMethod)}`, t.shipping > 0 ? formatPrice(t.shipping) : "Free"),
    t.tax > 0 ? total("Tax", formatPrice(t.tax)) : "",
    total("Total", formatPrice(t.total), true),
  ].join("");
  return `${sectionTitle("Your order")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${color.line}">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid ${color.line};padding-top:8px">${totals}</table>`;
}

function addressLines(order: Order) {
  const a = order.shippingAddress;
  return [a.fullName, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, a.phone].filter(Boolean) as string[];
}

function deliveryHtml(order: Order) {
  const extra = [
    order.firstFunctionDate && `<strong>First function:</strong> ${esc(longDay.format(new Date(`${order.firstFunctionDate}T00:00:00Z`)))}`,
    order.deliveryInstructions && `<strong>Instructions:</strong> ${esc(order.deliveryInstructions)}`,
  ].filter(Boolean);
  return `${sectionTitle("Delivering to")}
<p style="margin:0;font:14px/1.6 ${font};color:${color.ink}">${addressLines(order).map(esc).join("<br>")}</p>${
    extra.length ? `<p style="margin:10px 0 0;font:14px/1.6 ${font};color:${color.ink}">${extra.join("<br>")}</p>` : ""
  }`;
}

function summaryText(order: Order) {
  const t = order.totals;
  const items = order.lines.map(
    (l) => `- ${l.bundle ? `[${l.bundle.name}] ` : ""}${l.name} (${l.variantLabel}) × ${l.quantity} — ${formatPrice(l.unitPrice * l.quantity)}`,
  );
  return [
    "\n\nYour order:",
    ...items,
    "",
    `Subtotal: ${formatPrice(t.subtotal)}`,
    t.discount > 0 ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: −${formatPrice(t.discount)}` : "",
    `Delivery (${order.shippingMethod}): ${t.shipping > 0 ? formatPrice(t.shipping) : "Free"}`,
    t.tax > 0 ? `Tax: ${formatPrice(t.tax)}` : "",
    `Total: ${formatPrice(t.total)}`,
    "",
    "Delivering to:",
    ...addressLines(order),
    order.firstFunctionDate ? `First function: ${longDay.format(new Date(`${order.firstFunctionDate}T00:00:00Z`))}` : "",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
}

/** Order number, when it was placed and how it's being paid for. */
function metaHtml(order: Order) {
  const payment =
    order.paymentMethod === "cod"
      ? order.paymentStatus === "paid"
        ? "Cash on delivery · paid"
        : `Cash on delivery · ${formatPrice(order.totals.total)} due`
      : order.paymentStatus === "refunded"
        ? "Refunded"
        : "Paid online";
  const cell = (label: string, value: string) =>
    `<td valign="top" style="padding:0 12px 0 0"><div style="font:12px/1.4 ${font};color:${color.muted}">${label}</div><div style="font:600 14px/1.4 ${font};color:${color.ink}">${value}</div></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 0"><tr>${cell("Order", esc(order.number))}${cell(
    "Placed",
    esc(formatIst(order.createdAt)),
  )}${cell("Payment", esc(payment))}</tr></table>`;
}

const orderButtons = (order: Order, primary?: string) =>
  buttons(
    ...[
      primary,
      button("Track your order", trackOrderUrl(order), primary ? "secondary" : "primary"),
      order.customerId ? button("View in My account", url(`/account/orders/${order.id}`), "secondary") : "",
    ].filter((b): b is string => Boolean(b)),
  );

/* -------------------------------- Emails -------------------------------- */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function welcomeEmail(account: { name: string; email: string }, via: "password" | "phone" | "google"): EmailMessage {
  const how = { password: "your email and password", phone: "your phone number", google: "Google" }[via];
  const name = firstName(account.name);
  return {
    subject: `Welcome to ${siteName}, ${name}`,
    html: layout({
      preheader: "Your account is ready — track orders and save addresses in one place.",
      body: `${heading(`Welcome, ${esc(name)}`)}
${para(`Your ${esc(siteName)} account is ready. Sign in any time with ${esc(how)}.`)}
${para("With your account you can:")}
<ul style="margin:0 0 6px;padding-left:20px;font:15px/1.7 ${font};color:${color.ink}">
<li>Follow every order from confirmed to delivered</li>
<li>Save delivery addresses for a faster checkout</li>
<li>Plan a complete function kit and order it in one go</li>
</ul>
${buttons(button("Start shopping", url("/shop")), button("Plan my function", url("/kit"), "secondary"))}
${small(`This account was created for ${esc(account.email)}. If that wasn't you, reply to this email and we'll remove it.`)}`,
    }),
    text: `Welcome, ${name}!\n\nYour ${siteName} account is ready. Sign in any time with ${how}.\n\nWith your account you can follow every order from confirmed to delivered, save delivery addresses, and plan a complete function kit.\n\nStart shopping: ${url("/shop")}\nPlan my function: ${url("/kit")}\n\nThis account was created for ${account.email}. If that wasn't you, reply to this email.${textFooter}`,
  };
}

export function orderConfirmedEmail(order: Order): EmailMessage {
  const name = firstName(order.customer.name);
  const cod = order.paymentMethod === "cod";
  const intro = cod
    ? `We've received your order. Please keep <strong>${formatPrice(order.totals.total)}</strong> ready in cash for delivery.`
    : `We've received your payment of <strong>${formatPrice(order.totals.total)}</strong>. Your order is confirmed.`;
  const next = "Our team will now pack your order and confirm the delivery schedule with you. We'll email you at each step.";
  return {
    subject: `Order ${order.number} confirmed`,
    html: layout({
      preheader: `Thank you, ${name}! Order ${order.number} · ${formatPrice(order.totals.total)}`,
      body: `${heading(`Thank you, ${esc(name)}!`)}
${para(intro)}
${metaHtml(order)}
${progressHtml(order, "confirmed")}
${small(next)}
${orderButtons(order)}
${summaryHtml(order)}
${deliveryHtml(order)}`,
    }),
    text: `Thank you, ${name}!\n\n${intro.replace(/<[^>]+>/g, "")}\n\nOrder: ${order.number}\nPlaced: ${formatIst(order.createdAt)}${progressText(order, "confirmed")}\n\n${next}\n\nTrack your order: ${trackOrderUrl(order)}${summaryText(order)}${textFooter}`,
  };
}

type Tracking = { carrier: string; number: string; url?: string | null };

/** A customer email for each step after confirmation; null for steps that don't need one. */
export function orderStatusEmail(order: Order, status: OrderStatus, tracking?: Tracking | null, opts: { trackingUpdate?: boolean } = {}): EmailMessage | null {
  const name = firstName(order.customer.name);
  const trackingHtml = tracking
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border:1px solid ${color.line};border-radius:10px"><tr><td style="padding:14px 16px;font:14px/1.6 ${font};color:${color.ink}">
<span style="color:${color.muted}">Courier</span> <strong>${esc(tracking.carrier)}</strong><br>
<span style="color:${color.muted}">Tracking number</span> <strong>${esc(tracking.number)}</strong></td></tr></table>`
    : "";
  const trackingText = tracking ? `\n\nCourier: ${tracking.carrier}\nTracking number: ${tracking.number}${tracking.url ? `\nTrack with the courier: ${tracking.url}` : ""}` : "";
  const courierButton = tracking?.url ? button(`Track with ${tracking.carrier}`, tracking.url) : undefined;

  const copy: Partial<Record<OrderStatus, { subject: string; title: string; body: string; preheader: string }>> = {
    processing: {
      subject: `Order ${order.number} is being packed`,
      title: "We're packing your order",
      body: "Your items are being checked and packed with care. We'll email you again as soon as it's on its way.",
      preheader: "Your order is being packed.",
    },
    shipped: opts.trackingUpdate
      ? {
          subject: `Tracking details for order ${order.number}`,
          title: "Your tracking details",
          body: "Here are the courier details for your order, so you can follow it all the way to your door.",
          preheader: tracking ? `${tracking.carrier} · ${tracking.number}` : "Your tracking details.",
        }
      : {
          subject: `Order ${order.number} is on its way`,
          title: "Good news — it's on its way!",
          body: tracking
            ? "Your order has left us. Use the tracking number below to follow it."
            : "Your order has left us. We'll send the courier's tracking details as soon as we have them.",
          preheader: tracking ? `Shipped with ${tracking.carrier} · ${tracking.number}` : "Your order has shipped.",
        },
    delivered: {
      subject: `Order ${order.number} has been delivered`,
      title: "Delivered!",
      body: "Your order has been delivered. We hope everything is perfect for your celebration. If anything isn't right, just reply to this email.",
      preheader: "Your order has been delivered.",
    },
    cancelled: {
      subject: `Order ${order.number} has been cancelled`,
      title: "Your order has been cancelled",
      body:
        order.paymentStatus === "paid" || order.paymentStatus === "refunded"
          ? "Your order has been cancelled. Your refund will follow shortly — we'll email you when it's done."
          : "Your order has been cancelled. Nothing has been charged.",
      preheader: "Your order has been cancelled.",
    },
  };
  const c = copy[status];
  if (!c) return null;
  const showProgress = status !== "cancelled";
  return {
    subject: c.subject,
    html: layout({
      preheader: c.preheader,
      body: `${heading(esc(c.title))}
${para(`Hi ${esc(name)}, ${esc(c.body.charAt(0).toLowerCase() + c.body.slice(1))}`)}
${metaHtml(order)}
${showProgress ? progressHtml(order, status) : ""}
${status === "shipped" ? trackingHtml : ""}
${orderButtons(order, status === "shipped" ? courierButton : undefined)}
${status === "delivered" ? small(`Something not right? See our <a href="${esc(url("/returns-policy"))}" style="color:${color.muted}">returns policy</a> or reply to this email.`) : ""}
${status === "cancelled" ? "" : summaryHtml(order)}`,
    }),
    text: `Hi ${name},\n\n${c.body}\n\nOrder: ${order.number}${showProgress ? progressText(order, status) : ""}${status === "shipped" ? trackingText : ""}\n\nTrack your order: ${trackOrderUrl(order)}${textFooter}`,
  };
}

export function refundEmail(order: Order, amount = order.totals.total): EmailMessage {
  const name = firstName(order.customer.name);
  const body = `We've refunded ${formatPrice(amount)} for order ${order.number}. It can take 5–7 working days to reach your account.`;
  return {
    subject: `Refund for order ${order.number}`,
    html: layout({
      preheader: `${formatPrice(amount)} refunded for order ${order.number}.`,
      body: `${heading("Your refund is on its way")}
${para(`Hi ${esc(name)}, ${esc(body.charAt(0).toLowerCase() + body.slice(1))}`)}
${metaHtml(order)}
${buttons(button("View order", trackOrderUrl(order), "secondary"))}`,
    }),
    text: `Hi ${name},\n\n${body}\n\nView order: ${trackOrderUrl(order)}${textFooter}`,
  };
}

export function passwordResetEmail(name: string, link: string): EmailMessage {
  const first = firstName(name);
  return {
    subject: `Reset your ${siteName} password`,
    html: layout({
      preheader: "Use this link within the next hour to choose a new password.",
      body: `${heading("Reset your password")}
${para(`Hi ${esc(first)}, use the button below within the next hour to choose a new password.`)}
${buttons(button("Choose a new password", link))}
${small("If you didn't ask for this, you can ignore this email — your password won't change.")}`,
    }),
    text: `Hi ${first},\n\nUse this link within the next hour to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.${textFooter}`,
  };
}
