"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { MapPin, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, fieldAria, Input, Select } from "@/components/ui/field";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { orderStatusLabel } from "@/lib/order-status";
import { sendJson } from "@/lib/api-client";
import { sessionStore, signIn } from "@/lib/store";
import type { Address, Order } from "@/lib/types";
import { formatDate, formatPrice, newId } from "@/lib/utils";
import { addressSchema, changePasswordSchema, indianStates, profileSchema } from "@/lib/validations";
import { OrderDetail, statusTone } from "./order-detail";

/** Loads one of the signed-in customer's lists from the server. */
function useAccountList<T>(url: string, key: "orders" | "addresses") {
  const [state, setState] = useState<{ items: T[]; loading: boolean; error: string | null }>({ items: [], loading: true, error: null });
  const load = useCallback(async () => {
    const res = await sendJson<Record<string, T[]>>(url, undefined, "GET");
    setState(res.ok ? { items: res.data[key] ?? [], loading: false, error: null } : { items: [], loading: false, error: res.error });
  }, [url, key]);
  useEffect(() => {
    let cancelled = false;
    sendJson<Record<string, T[]>>(url, undefined, "GET").then((res) => {
      if (!cancelled)
        setState(res.ok ? { items: res.data[key] ?? [], loading: false, error: null } : { items: [], loading: false, error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [url, key]);
  return { ...state, reload: load, setItems: (items: T[]) => setState((s) => ({ ...s, items })) };
}

const useOrders = () => useAccountList<Order>("/api/account/orders", "orders");
const useAddresses = () => useAccountList<Address>("/api/account/addresses", "addresses");

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p role="alert" className="flex flex-wrap items-center gap-3 text-[0.9rem] text-danger">
      {message}
      <button type="button" onClick={onRetry} className="text-ink underline underline-offset-4">
        Try again
      </button>
    </p>
  );
}

function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <h1 className="text-h2">{children}</h1>
      {action}
    </div>
  );
}

/* -------------------------------- Overview ------------------------------- */
export function AccountOverview() {
  const user = sessionStore.useStore();
  const { items: orders, loading } = useOrders();
  const { items: addresses } = useAddresses();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  return (
    <>
      <PageTitle>
        Hello, <em className="text-brand">{user?.name.split(" ")[0]}</em>
      </PageTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-line p-6">
          <h2 className="eyebrow text-accent-ink">Recent order</h2>
          {loading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : orders[0] ? (
            <div className="mt-4">
              <p className="font-serif text-2xl">{orders[0].number}</p>
              <p className="mt-1 text-[0.88rem] text-muted">
                {formatDate(orders[0].createdAt)} · {formatPrice(orders[0].totals.total)}
              </p>
              <Badge tone={statusTone(orders[0].status)} className="mt-3">
                {orderStatusLabel[orders[0].status]}
              </Badge>
              <Link
                href={`/account/orders/${orders[0].id}`}
                className="mt-5 block text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline w-fit"
              >
                View order
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-muted">No orders yet.</p>
          )}
        </div>
        <div className="rounded-card border border-line p-6">
          <h2 className="eyebrow text-accent-ink">Default address</h2>
          {defaultAddress ? (
            <address className="mt-4 not-italic leading-relaxed text-muted">
              <span className="text-ink">{defaultAddress.fullName}</span>
              <br />
              {defaultAddress.line1}, {defaultAddress.city}
              <br />
              {defaultAddress.state} {defaultAddress.pincode}
            </address>
          ) : (
            <p className="mt-4 text-muted">No saved addresses.</p>
          )}
          <Link
            href="/account/addresses"
            className="mt-5 block w-fit text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline"
          >
            Manage addresses
          </Link>
        </div>
      </div>
    </>
  );
}

/* --------------------------------- Orders -------------------------------- */
export function OrderList() {
  const { items: orders, loading, error, reload } = useOrders();
  return (
    <>
      <PageTitle>Orders</PageTitle>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6 stroke-[1.25]" />}
          title="No orders yet"
          description="When you place an order it will appear here with live status updates."
          action={
            <Link href="/shop" className={buttonVariants()}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="group grid grid-cols-2 items-center gap-4 py-5 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <span>
                  <span className="block font-serif text-xl group-hover:text-brand">{o.number}</span>
                  <span className="text-[0.82rem] text-muted">
                    {formatDate(o.createdAt)} · {o.lines.reduce((n, l) => n + l.quantity, 0)} items
                  </span>
                </span>
                <Badge tone={statusTone(o.status)} className="justify-self-end sm:justify-self-auto">
                  {orderStatusLabel[o.status]}
                </Badge>
                <span className="text-[0.92rem]">{formatPrice(o.totals.total)}</span>
                <span className="justify-self-end text-[0.72rem] uppercase tracking-[0.14em] text-muted group-hover:text-ink">View</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function AccountOrder({ id }: { id: string }) {
  const { items: orders, loading } = useOrders();
  const order: Order | undefined = orders.find((o) => o.id === id);
  if (loading) return <ListSkeleton />;
  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="This order isn't linked to your account."
        action={
          <Link href="/account/orders" className={buttonVariants({ variant: "outline" })}>
            Back to orders
          </Link>
        }
      />
    );
  }
  return (
    <>
      <PageTitle
        action={
          <Link href="/account/orders" className="text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
            All orders
          </Link>
        }
      >
        Order {order.number}
      </PageTitle>
      <OrderDetail order={order} />
    </>
  );
}

/* -------------------------------- Addresses ------------------------------ */
type AddressValues = z.input<typeof addressSchema>;

export function AddressBook() {
  const { items: addresses, loading, error, reload, setItems } = useAddresses();
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  /** Saves the whole list; the server keeps exactly one default. */
  const save = async (next: Address[], message: string) => {
    const previous = addresses;
    setItems(next);
    const res = await sendJson<{ addresses: Address[] }>("/api/account/addresses", { addresses: next }, "PUT");
    if (res.ok) {
      setItems(res.data.addresses);
      toast.success(message);
      return true;
    }
    setItems(previous);
    toast.error(res.error);
    return false;
  };

  const remove = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    if (next.length && !next.some((a) => a.isDefault)) next[0] = { ...next[0], isDefault: true };
    void save(next, "Address removed");
  };

  return (
    <>
      <PageTitle
        action={
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add address
          </Button>
        }
      >
        Addresses
      </PageTitle>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-6 stroke-[1.25]" />}
          title="No saved addresses"
          description="Save an address for faster checkout."
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-card border border-line p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{a.label || a.fullName}</p>
                {a.isDefault && <Badge tone="accent">Default</Badge>}
              </div>
              <address className="mt-3 flex-1 not-italic leading-relaxed text-muted">
                {a.fullName}
                <br />
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.city}, {a.state} {a.pincode}
                <br />
                {a.phone}
              </address>
              <div className="mt-5 flex flex-wrap gap-4 text-[0.78rem] uppercase tracking-[0.12em]">
                <button type="button" onClick={() => setEditing(a)} className="inline-flex items-center gap-1.5 hover:text-brand">
                  <Pencil className="size-3.5" /> Edit
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() =>
                      void save(
                        addresses.map((x) => ({ ...x, isDefault: x.id === a.id })),
                        "Default address updated",
                      )
                    }
                    className="hover:text-brand"
                  >
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => remove(a.id)} className="inline-flex items-center gap-1.5 text-danger">
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "Add address" : "Edit address"}
        side="right"
      >
        {editing !== null && (
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onSaved={async (addr, makeDefault) => {
              const exists = addresses.some((x) => x.id === addr.id);
              let next = exists ? addresses.map((x) => (x.id === addr.id ? addr : x)) : [...addresses, addr];
              if (makeDefault || next.length === 1) next = next.map((x) => ({ ...x, isDefault: x.id === addr.id }));
              if (await save(next, "Address saved")) setEditing(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function AddressForm({ initial, onSaved }: { initial?: Address; onSaved: (a: Address, makeDefault: boolean) => void | Promise<void> }) {
  const [makeDefault, setMakeDefault] = useState(initial?.isDefault ?? false);
  const { register, handleSubmit, formState } = useForm<AddressValues, unknown, z.output<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ? { ...initial, country: "India" } : { country: "India" },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={handleSubmit((v) =>
        onSaved(
          { ...v, line2: v.line2 || undefined, id: initial?.id ?? newId("addr"), isDefault: initial?.isDefault, label: initial?.label },
          makeDefault,
        ),
      )}
    >
      <Field label="Full name" htmlFor="a-name" error={e.fullName?.message}>
        <Input autoComplete="name" {...fieldAria("a-name", e.fullName?.message)} {...register("fullName")} />
      </Field>
      <Field label="Mobile number" htmlFor="a-phone" error={e.phone?.message}>
        <Input type="tel" autoComplete="tel" {...fieldAria("a-phone", e.phone?.message)} {...register("phone")} />
      </Field>
      <Field label="Address line 1" htmlFor="a-line1" error={e.line1?.message}>
        <Input autoComplete="address-line1" {...fieldAria("a-line1", e.line1?.message)} {...register("line1")} />
      </Field>
      <Field label="Address line 2" htmlFor="a-line2" optional>
        <Input autoComplete="address-line2" id="a-line2" {...register("line2")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City" htmlFor="a-city" error={e.city?.message}>
          <Input autoComplete="address-level2" {...fieldAria("a-city", e.city?.message)} {...register("city")} />
        </Field>
        <Field label="PIN code" htmlFor="a-pin" error={e.pincode?.message}>
          <Input
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            {...fieldAria("a-pin", e.pincode?.message)}
            {...register("pincode")}
          />
        </Field>
      </div>
      <Field label="State / UT" htmlFor="a-state" error={e.state?.message}>
        <Select {...fieldAria("a-state", e.state?.message)} {...register("state")}>
          <option value="">Select…</option>
          {indianStates.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Checkbox label="Set as default address" checked={makeDefault} onChange={(ev) => setMakeDefault(ev.target.checked)} />
      <Button type="submit" className="w-full">
        Save address
      </Button>
    </form>
  );
}

/* ---------------------------- Profile & security ------------------------- */
export function ProfileSettings() {
  const user = sessionStore.useStore();
  const profile = useForm<z.input<typeof profileSchema>, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" },
  });
  const password = useForm<z.input<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema) });
  const pe = profile.formState.errors;
  const we = password.formState.errors;

  return (
    <>
      <PageTitle>Profile & security</PageTitle>
      <div className="grid gap-14 xl:grid-cols-2">
        <form
          noValidate
          className="space-y-5"
          onSubmit={profile.handleSubmit(async (v) => {
            const res = await sendJson<{ user: { name: string; email: string; phone?: string } }>("/api/account/profile", v, "PUT");
            if (!res.ok) {
              profile.setError(res.status === 409 ? "email" : "name", { message: res.error });
              return;
            }
            signIn(res.data.user);
            toast.success("Profile updated");
          })}
        >
          <h2 className="font-serif text-2xl">Personal details</h2>
          <Field label="Full name" htmlFor="p-name" error={pe.name?.message}>
            <Input autoComplete="name" {...fieldAria("p-name", pe.name?.message)} {...profile.register("name")} />
          </Field>
          <Field label="Email" htmlFor="p-email" error={pe.email?.message} hint="You'll use this email to sign in.">
            <Input type="email" autoComplete="email" {...fieldAria("p-email", pe.email?.message, true)} {...profile.register("email")} />
          </Field>
          <Field label="Mobile number" htmlFor="p-phone" optional error={pe.phone?.message}>
            <Input type="tel" autoComplete="tel" {...fieldAria("p-phone", pe.phone?.message)} {...profile.register("phone")} />
          </Field>
          <Button type="submit" loading={profile.formState.isSubmitting}>
            Save changes
          </Button>
        </form>

        <form
          noValidate
          className="space-y-5"
          onSubmit={password.handleSubmit(async (v) => {
            const res = await sendJson("/api/account/password/change", v);
            if (!res.ok) {
              password.setError(res.status === 400 ? "currentPassword" : "password", { message: res.error });
              return;
            }
            password.reset();
            toast.success("Password changed");
          })}
        >
          <h2 className="font-serif text-2xl">Change password</h2>
          <Field label="Current password" htmlFor="cp-current" error={we.currentPassword?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldAria("cp-current", we.currentPassword?.message)}
              {...password.register("currentPassword")}
            />
          </Field>
          <Field
            label="New password"
            htmlFor="cp-new"
            error={we.password?.message}
            hint="At least 8 characters, with a letter and a number"
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldAria("cp-new", we.password?.message, true)}
              {...password.register("password")}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="cp-confirm" error={we.confirmPassword?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldAria("cp-confirm", we.confirmPassword?.message)}
              {...password.register("confirmPassword")}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={password.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </div>
    </>
  );
}
