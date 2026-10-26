"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { sessionStore, signOut } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile & security" },
  { href: "/wishlist", label: "Wishlist" },
];

/**
 * Shows the account area only when signed in. The data itself comes from
 * account APIs that check the HTTP-only session cookie on the server —
 * this client check only decides what to show.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const user = sessionStore.useStore();
  const router = useRouter();

  if (!user) {
    return (
      <EmptyState
        title="Sign in to your account"
        description="View orders, manage addresses and update your details."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login?next=/account" className={buttonVariants()}>
              Sign in
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "outline" })}>
              Create account
            </Link>
          </div>
        }
        className="py-24"
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
      <aside>
        <p className="eyebrow text-accent-ink">My account</p>
        <p className="mt-3 font-serif text-3xl leading-tight">{user.name}</p>
        <p className="mt-1 truncate text-[0.85rem] text-muted">{user.email}</p>
        <Suspense fallback={<AccountNav pathname={null} />}>
          <AccountNavWithPath />
        </Suspense>
        <button
          type="button"
          onClick={() => {
            signOut();
            toast("You've been signed out");
            router.push("/");
          }}
          className="mt-6 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted underline underline-offset-4 hover:text-ink"
        >
          Sign out
        </button>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function AccountNavWithPath() {
  return <AccountNav pathname={usePathname()} />;
}

function AccountNav({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Account" className="scrollbar-none -mx-[var(--gutter)] mt-8 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-0 lg:border-t lg:border-line">
        {nav.map((item) => {
          const active = item.href === "/account" ? pathname === "/account" : pathname?.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-full border px-4 py-2.5 text-[0.88rem] transition-colors lg:rounded-none lg:border-0 lg:border-b lg:border-line lg:px-0 lg:py-3.5",
                  active
                    ? "border-ink bg-ink text-canvas lg:bg-transparent lg:font-medium lg:text-brand"
                    : "border-line-strong hover:text-brand",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
