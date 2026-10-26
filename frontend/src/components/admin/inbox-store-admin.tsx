"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Inbox, KeyRound, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/primitives";
import type { StoreSettings } from "@/lib/settings";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { CustomRequest, Enquiry } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { AdminHeader, DataTable, Panel, Toggle, type Column } from "./admin-ui";

function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count: number }[];
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 rounded-full border px-3.5 text-[0.8rem] transition-colors",
            value === o.value ? "border-ink bg-ink text-canvas" : "border-line-strong hover:border-ink",
          )}
        >
          {o.label} <span className="opacity-60">({o.count})</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Custom orders ---------------------------- */
const requestTone = { new: "brand", quoted: "accent", accepted: "success", declined: "muted" } as const;
const requestLabel = { new: "New", quoted: "Quote sent", accepted: "Accepted", declined: "Declined" } as const;
const budgetLabel: Record<string, string> = {
  "under-1k": "Under ₹1,000",
  "1k-2.5k": "₹1,000 – ₹2,500",
  "2.5k-5k": "₹2,500 – ₹5,000",
  "5k-10k": "₹5,000 – ₹10,000",
  "above-10k": "Above ₹10,000",
  unsure: "Not sure yet",
};

export function CustomOrdersAdmin() {
  const { customRequests } = adminStore.useStore();
  const [show, setShow] = useState<"open" | "all">("open");
  const open = customRequests.filter((r) => r.status === "new" || r.status === "quoted");
  const list = show === "open" ? open : customRequests;

  const setStatus = async (id: string, status: CustomRequest["status"]) => {
    if (await updateAdmin((d) => void (d.customRequests.find((r) => r.id === id)!.status = status)))
      toast.success(`Marked “${requestLabel[status]}”`);
  };

  return (
    <>
      <AdminHeader
        title="Custom order requests"
        description="Quote requests from the Custom & bulk orders form. Reply, then set the status so the team knows where each one stands."
      />
      <FilterChips
        value={show}
        onChange={setShow}
        options={[
          { value: "open", label: "Waiting on us", count: open.length },
          { value: "all", label: "All requests", count: customRequests.length },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6 stroke-[1.25]" />}
          title="No requests here"
          description="New requests from the custom order form appear here."
        />
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {r.name} <span className="font-normal capitalize text-muted">· {r.occasion}</span>
                  </p>
                  <p className="text-[0.82rem] text-muted">
                    <a href={`mailto:${r.email}`} className="hover:text-ink">
                      {r.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${r.phone}`} className="hover:text-ink">
                      {r.phone}
                    </a>{" "}
                    · received {formatDateTime(r.receivedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={requestTone[r.status]}>{requestLabel[r.status]}</Badge>
                  <Select
                    aria-label={`Status for ${r.name}`}
                    value={r.status}
                    onChange={(e) => void setStatus(r.id, e.target.value as CustomRequest["status"])}
                    className="h-9 w-40 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="quoted">Quote sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </Select>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-[0.85rem] sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Event date</dt>
                  <dd>{r.eventDate ? formatDate(r.eventDate) : "Not given"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Quantity</dt>
                  <dd>{r.quantity}</dd>
                </div>
                <div>
                  <dt className="text-muted">Budget per piece</dt>
                  <dd>{budgetLabel[r.budget] ?? r.budget}</dd>
                </div>
              </dl>
              <p className="mt-4 whitespace-pre-line border-l-2 border-accent pl-4 text-[0.92rem] leading-relaxed">{r.details}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-[0.78rem] uppercase tracking-[0.12em]">
                <a
                  href={`mailto:${r.email}?subject=Your custom order request — Events Emporio`}
                  className="underline underline-offset-4"
                  onClick={() => r.status === "new" && void setStatus(r.id, "quoted")}
                >
                  Reply by email
                </a>
                <a
                  href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* --------------------------------- Messages ------------------------------ */
const enquiryLabel = { new: "New", replied: "Replied", closed: "Done" } as const;

export function EnquiriesAdmin() {
  const { enquiries } = adminStore.useStore();
  const [show, setShow] = useState<"new" | "all">("new");
  const fresh = enquiries.filter((e) => e.status === "new");
  const rows = show === "new" ? fresh : enquiries;
  const setStatus = (id: string, status: Enquiry["status"]) =>
    updateAdmin((d) => void (d.enquiries.find((x) => x.id === id)!.status = status));

  const columns: Column<Enquiry>[] = [
    {
      key: "from",
      header: "From",
      sortValue: (e) => e.name,
      cell: (e) => (
        <span>
          <span className="block font-medium">{e.name}</span>
          <a href={`mailto:${e.email}`} className="text-[0.78rem] text-muted hover:text-ink">
            {e.email}
          </a>
          {e.phone && <span className="block text-[0.78rem] text-muted">{e.phone}</span>}
        </span>
      ),
    },
    {
      key: "message",
      header: "Message",
      cell: (e) => (
        <span className="block max-w-md">
          <span className="text-[0.72rem] uppercase tracking-[0.1em] text-accent-ink">{e.subject}</span>
          <span className="block whitespace-pre-line">{e.message}</span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Received",
      sortValue: (e) => e.receivedAt,
      cell: (e) => <span className="whitespace-nowrap text-muted">{formatDateTime(e.receivedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <span className="flex flex-col items-start gap-2">
          <Select
            aria-label={`Status for message from ${e.name}`}
            value={e.status}
            onChange={(ev) => void setStatus(e.id, ev.target.value as Enquiry["status"])}
            className="h-9 w-32 text-sm"
          >
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="closed">Done</option>
          </Select>
          <a
            href={`mailto:${e.email}?subject=Re: ${encodeURIComponent(e.subject)}`}
            onClick={() => e.status === "new" && void setStatus(e.id, "replied")}
            className="text-[0.75rem] underline underline-offset-4"
          >
            Reply
          </a>
        </span>
      ),
    },
  ];
  return (
    <>
      <AdminHeader title="Messages" description="From the contact form. Reply by email, then mark them so nothing is missed." />
      <FilterChips
        value={show}
        onChange={setShow}
        options={[
          { value: "new", label: enquiryLabel.new, count: fresh.length },
          { value: "all", label: "All messages", count: enquiries.length },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6 stroke-[1.25]" />}
          title={show === "new" ? "No new messages" : "No messages yet"}
          description="Messages sent from the Contact page land here."
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          searchText={(e) => `${e.name} ${e.email} ${e.message}`}
          initialSort={{ key: "date", dir: "desc" }}
        />
      )}
    </>
  );
}

/* --------------------------------- Settings ------------------------------ */
export function SettingsAdmin() {
  const { settings } = adminStore.useStore();
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const changed = JSON.stringify(draft) !== JSON.stringify(settings);
  const rupees = (paise: number | null) => (paise === null ? "" : String(paise / 100));
  const toPaise = (v: string) => Math.max(0, Math.round(Number(v) * 100));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (draft.contact.email && !/^\S+@\S+\.\S+$/.test(draft.contact.email)) return void toast.error("Enter a valid email");
        if (draft.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(draft.gstin.toUpperCase()))
          return void toast.error("That GSTIN doesn't look right");
        const next: StoreSettings = {
          ...draft,
          gstin: draft.gstin.toUpperCase(),
          contact: { ...draft.contact, whatsapp: draft.contact.whatsapp.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1") },
        };
        if (await updateAdmin((d) => void (d.settings = next)))
          toast.success("Settings saved", { description: "The shop uses them straight away." });
      }}
    >
      <AdminHeader
        title="Settings"
        description="Contact details, delivery charges and payment options shown in the shop."
        actions={
          <Button type="submit" size="sm" disabled={!changed}>
            Save settings
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Contact details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="s-email" optional>
              <Input
                id="s-email"
                type="email"
                value={draft.contact.email}
                onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, email: e.target.value } }))}
              />
            </Field>
            <Field label="Phone" htmlFor="s-phone" optional>
              <Input
                id="s-phone"
                type="tel"
                value={draft.contact.phone}
                onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, phone: e.target.value } }))}
              />
            </Field>
            <Field label="WhatsApp number" htmlFor="s-wa" optional hint="Customers' kit links open a chat with this number">
              <Input
                id="s-wa"
                type="tel"
                value={draft.contact.whatsapp}
                onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, whatsapp: e.target.value.replace(/[^\d]/g, "") } }))}
              />
            </Field>
            <Field label="GSTIN" htmlFor="s-gst" optional>
              <Input
                id="s-gst"
                className="uppercase"
                value={draft.gstin}
                onChange={(e) => setDraft((d) => ({ ...d, gstin: e.target.value }))}
              />
            </Field>
            <Field label="Shop address" htmlFor="s-addr" optional className="sm:col-span-2">
              <Input
                id="s-addr"
                value={draft.contact.address}
                onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, address: e.target.value } }))}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Delivery charges">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Standard delivery (₹)" htmlFor="s-std">
              <Input
                id="s-std"
                type="number"
                min={0}
                value={rupees(draft.shipping.standard)}
                onChange={(e) => setDraft((d) => ({ ...d, shipping: { ...d.shipping, standard: toPaise(e.target.value) } }))}
              />
            </Field>
            <Field label="Priority dispatch (₹)" htmlFor="s-exp">
              <Input
                id="s-exp"
                type="number"
                min={0}
                value={rupees(draft.shipping.express)}
                onChange={(e) => setDraft((d) => ({ ...d, shipping: { ...d.shipping, express: toPaise(e.target.value) } }))}
              />
            </Field>
            <Field
              label="Free delivery on orders over (₹)"
              htmlFor="s-free"
              optional
              hint="Leave empty to always charge delivery"
              className="sm:col-span-2"
            >
              <Input
                id="s-free"
                type="number"
                min={0}
                value={rupees(draft.shipping.freeShippingThreshold)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    shipping: { ...d.shipping, freeShippingThreshold: e.target.value === "" ? null : toPaise(e.target.value) },
                  }))
                }
              />
            </Field>
          </div>
          <p className="mt-4 text-[0.82rem] text-muted">
            Customers pay {formatPrice(draft.shipping.standard)} (or {formatPrice(draft.shipping.express)} for priority)
            {draft.shipping.freeShippingThreshold !== null ? `, free over ${formatPrice(draft.shipping.freeShippingThreshold)}` : ""}.
          </p>
        </Panel>

        <Panel title="Payments">
          <div className="space-y-5">
            <Toggle
              checked={draft.payments.codEnabled}
              onChange={(v) => setDraft((d) => ({ ...d, payments: { codEnabled: v } }))}
              label="Cash on delivery"
              description="Shown at checkout as available or not. Online payments use Razorpay."
            />
            <div className="flex items-start gap-3 rounded-control border border-line bg-canvas p-4 text-[0.85rem]">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <p>Razorpay keys live in the server settings (environment variables), not here, so they can never leak to the browser.</p>
            </div>
          </div>
        </Panel>
      </div>
    </form>
  );
}

/* ----------------------------- Access & activity -------------------------- */
export function UsersAdmin() {
  const { adminEmail, auditLog } = adminStore.useStore();
  return (
    <>
      <AdminHeader title="Access & activity" description="Who can get into the admin, and what's been changed recently." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Panel title="Recent changes" bodyClassName="p-0">
          {auditLog.length === 0 ? (
            <p className="px-5 py-6 text-[0.88rem] text-muted">Changes made in the admin are listed here.</p>
          ) : (
            <ul className="divide-y divide-line text-[0.86rem]">
              {auditLog.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                  <span>
                    <span className="font-medium">{a.by}</span> <span className="text-muted">·</span> {a.summary}
                  </span>
                  <span className="text-muted">{formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Admin login">
          <div className="space-y-4 text-[0.88rem]">
            <p className="flex items-center gap-2">
              <KeyRound className="size-4 text-accent-ink" /> Signed in as <span className="font-medium">{adminEmail}</span>
            </p>
            <p className="leading-relaxed text-muted">
              The shop team shares one admin login. To change the email or password, update <code className="text-ink">ADMIN_EMAIL</code>{" "}
              and <code className="text-ink">ADMIN_PASSWORD</code> in the server settings and restart the site. Sessions last 8 hours.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
