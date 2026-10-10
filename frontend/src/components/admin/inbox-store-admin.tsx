"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, DemoNote } from "@/components/ui/primitives";
import { adminUsers, auditLog, rolePermissions, subscribers, type CustomRequest, type Enquiry } from "@/lib/data/admin";
import { adminStore, updateAdmin, type AdminState } from "@/lib/store/admin-store";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { AdminHeader, DataTable, downloadCsv, Panel, Toggle, type Column } from "./admin-ui";

/* ------------------------------ Custom orders ---------------------------- */
const requestTone = { new: "brand", quoted: "accent", accepted: "success", declined: "muted" } as const;

export function CustomOrdersAdmin() {
  const { customRequests } = adminStore.useStore();
  return (
    <>
      <AdminHeader title="Custom orders" description="Quote requests from the custom & bulk order form." />
      <ul className="space-y-4">
        {customRequests.map((r: CustomRequest, i) => (
          <li key={r.id} className="rounded-card border border-line bg-raised p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {r.name} <span className="font-normal text-muted">· {r.occasion}</span>
                </p>
                <p className="text-[0.82rem] text-muted">
                  {r.email} · {r.phone} · received {formatDateTime(r.receivedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={requestTone[r.status]}>{r.status}</Badge>
                <Select
                  aria-label={`Status for ${r.name}`}
                  value={r.status}
                  onChange={(e) => {
                    updateAdmin((d) => (d.customRequests[i].status = e.target.value as CustomRequest["status"]));
                    toast.success("Status updated");
                  }}
                  className="h-9 w-36 text-sm"
                >
                  <option value="new">New</option>
                  <option value="quoted">Quoted</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </Select>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-[0.85rem] sm:grid-cols-3">
              <div>
                <dt className="text-muted">Event date</dt>
                <dd>{r.eventDate ? formatDate(r.eventDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Quantity</dt>
                <dd>{r.quantity}</dd>
              </div>
              <div>
                <dt className="text-muted">Budget per piece</dt>
                <dd>{r.budget}</dd>
              </div>
            </dl>
            <p className="mt-4 border-l-2 border-accent pl-4 text-[0.92rem] leading-relaxed">{r.details}</p>
            <a
              href={`mailto:${r.email}?subject=Your custom order request`}
              className="mt-4 inline-block text-[0.78rem] uppercase tracking-[0.12em] underline underline-offset-4"
            >
              Reply by email
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/* --------------------------------- Enquiries ----------------------------- */
export function EnquiriesAdmin() {
  const { enquiries } = adminStore.useStore();
  const setStatus = (id: string, status: Enquiry["status"]) =>
    updateAdmin((d) => {
      const e = d.enquiries.find((x) => x.id === id);
      if (e) e.status = status;
    });
  const columns: Column<Enquiry>[] = [
    {
      key: "from",
      header: "From",
      sortValue: (e) => e.name,
      cell: (e) => (
        <span>
          <span className="block font-medium">{e.name}</span>
          <span className="text-[0.78rem] text-muted">{e.email}</span>
        </span>
      ),
    },
    {
      key: "message",
      header: "Message",
      cell: (e) => (
        <span className="block max-w-md">
          <span className="text-[0.78rem] uppercase tracking-[0.1em] text-muted">{e.subject}</span>
          <span className="block">{e.message}</span>
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
        <Select
          aria-label={`Status for message from ${e.name}`}
          value={e.status}
          onChange={(ev) => setStatus(e.id, ev.target.value as Enquiry["status"])}
          className="h-9 w-32 text-sm"
        >
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </Select>
      ),
    },
  ];
  return (
    <>
      <AdminHeader title="Contact enquiries" description={`${enquiries.filter((e) => e.status === "new").length} new`} />
      <DataTable
        rows={enquiries}
        columns={columns}
        rowKey={(e) => e.id}
        searchText={(e) => `${e.name} ${e.email} ${e.message}`}
        initialSort={{ key: "date", dir: "desc" }}
      />
    </>
  );
}

/* -------------------------------- Newsletter ----------------------------- */
export function NewsletterAdmin() {
  type Sub = (typeof subscribers)[number];
  const columns: Column<Sub>[] = [
    { key: "email", header: "Email", sortValue: (s) => s.email, cell: (s) => s.email },
    { key: "source", header: "Source", cell: (s) => s.source },
    {
      key: "date",
      header: "Subscribed",
      sortValue: (s) => s.subscribedAt,
      cell: (s) => <span className="text-muted">{formatDate(s.subscribedAt)}</span>,
    },
  ];
  return (
    <>
      <AdminHeader
        title="Newsletter"
        description={`${subscribers.length} subscribers with recorded consent`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv("subscribers.csv", [
                ["Email", "Source", "Subscribed"],
                ...subscribers.map((s) => [s.email, s.source, s.subscribedAt]),
              ])
            }
          >
            <Download /> Export
          </Button>
        }
      />
      <DataTable
        rows={subscribers}
        columns={columns}
        rowKey={(s) => s.email}
        searchText={(s) => s.email}
        initialSort={{ key: "date", dir: "desc" }}
      />
      <DemoNote className="mt-4">
        Use double opt-in and include an unsubscribe link in every email once Resend (or another provider) is connected.
      </DemoNote>
    </>
  );
}

/* --------------------------------- Settings ------------------------------ */
export function SettingsAdmin() {
  const { settings } = adminStore.useStore();
  const [draft, setDraft] = useState<AdminState["settings"]>(settings);
  const set = <K extends keyof AdminState["settings"]>(k: K, v: AdminState["settings"][K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email)) return toast.error("Enter a valid email");
        if (draft.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(draft.gstin.toUpperCase()))
          return toast.error("GSTIN format looks wrong");
        updateAdmin((d) => (d.settings = { ...draft, gstin: draft.gstin.toUpperCase() }));
        toast.success("Settings saved");
      }}
    >
      <AdminHeader
        title="Settings"
        description="Store details, shipping and payments."
        actions={
          <Button type="submit" size="sm">
            Save settings
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Store details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name" htmlFor="s-name">
              <Input id="s-name" value={draft.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="Tagline" htmlFor="s-tag">
              <Input id="s-tag" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="s-email" optional>
              <Input id="s-email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="s-phone" optional>
              <Input id="s-phone" type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="s-wa" optional>
              <Input id="s-wa" type="tel" value={draft.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </Field>
            <Field label="Instagram URL" htmlFor="s-ig">
              <Input id="s-ig" value={draft.instagram} onChange={(e) => set("instagram", e.target.value)} />
            </Field>
            <Field label="Store address" htmlFor="s-addr" optional className="sm:col-span-2">
              <Input id="s-addr" value={draft.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="GSTIN" htmlFor="s-gst" optional hint="Shown on invoices">
              <Input id="s-gst" className="uppercase" value={draft.gstin} onChange={(e) => set("gstin", e.target.value)} />
            </Field>
          </div>
          <p className="mt-4 text-[0.8rem] text-muted">Logo and favicon uploads are enabled once media storage is connected.</p>
        </Panel>

        <Panel title="Shipping">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Standard rate ₹" htmlFor="s-ship">
              <Input
                id="s-ship"
                type="number"
                min={0}
                value={draft.flatShipping / 100}
                onChange={(e) => set("flatShipping", Math.round(Number(e.target.value) * 100))}
              />
            </Field>
            <Field label="Free shipping above ₹" htmlFor="s-free" optional hint="Leave empty to disable">
              <Input
                id="s-free"
                type="number"
                min={0}
                value={draft.freeShippingThreshold === null ? "" : draft.freeShippingThreshold / 100}
                onChange={(e) => set("freeShippingThreshold", e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))}
              />
            </Field>
          </div>
          <p className="mt-4 text-[0.82rem] text-muted">
            Currently: {formatPrice(draft.flatShipping)} flat
            {draft.freeShippingThreshold !== null ? `, free above ${formatPrice(draft.freeShippingThreshold)}` : ", no free threshold"}.
          </p>
        </Panel>

        <Panel title="Payments & tax">
          <div className="space-y-5">
            <Toggle checked={draft.pricesIncludeTax} onChange={(v) => set("pricesIncludeTax", v)} label="Prices include GST" />
            <Toggle
              checked={draft.codEnabled}
              onChange={(v) => set("codEnabled", v)}
              label="Cash on delivery"
              description="Keep off until eligibility rules are approved"
            />
            <div className="flex items-start gap-3 rounded-control border border-line bg-canvas p-4 text-[0.85rem]">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <p>
                Razorpay key ID and secret, and the webhook secret, are <strong>server environment variables only</strong>. They are never
                stored in these settings or sent to the browser.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </form>
  );
}

/* -------------------------------- Admin users ---------------------------- */
export function UsersAdmin() {
  return (
    <>
      <AdminHeader title="Admin users" description="Role-based access, enforced on the server for every admin request." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Panel title="Team" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {adminUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-[0.82rem] text-muted">
                    {u.email} · last active {formatDateTime(u.lastActive)}
                  </p>
                </div>
                <Badge tone={u.role === "owner" ? "brand" : "neutral"} className="rounded-full border border-line">
                  {u.role}
                </Badge>
              </li>
            ))}
          </ul>
          <form
            className="flex flex-wrap items-end gap-3 border-t border-line p-5"
            onSubmit={(e) => {
              e.preventDefault();
              toast("Invitations are sent once authentication and email are connected.");
            }}
          >
            <Field label="Invite by email" htmlFor="invite" className="min-w-[14rem] flex-1">
              <Input id="invite" type="email" className="h-10" />
            </Field>
            <Select aria-label="Role" className="h-10 w-36 text-sm" defaultValue="fulfilment">
              <option value="manager">Manager</option>
              <option value="fulfilment">Fulfilment</option>
            </Select>
            <Button type="submit" size="sm" className="h-10">
              Invite
            </Button>
          </form>
        </Panel>
        <Panel title="Roles">
          <dl className="space-y-4 text-[0.86rem]">
            {Object.entries(rolePermissions).map(([role, perms]) => (
              <div key={role}>
                <dt className="font-medium capitalize">{role}</dt>
                {perms.map((p) => (
                  <dd key={p} className="text-muted">
                    {p}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <Panel title="Audit log" className="mt-6" bodyClassName="p-0">
        <ul className="divide-y divide-line text-[0.86rem]">
          {auditLog.map((a) => (
            <li key={a.at} className="flex flex-wrap justify-between gap-2 px-5 py-3">
              <span>
                <span className="font-medium">{a.actor}</span> · {a.action} · <span className="text-muted">{a.target}</span>
              </span>
              <span className="text-muted">{formatDateTime(a.at)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
