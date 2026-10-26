"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Heart, LogOut, MapPin, Package, User, UserRound } from "lucide-react";
import { toast } from "sonner";
import { sessionStore, signOut, type SessionUser } from "@/lib/store";
import { cn } from "@/lib/utils";

/** "Asha Bhat" → "AB", "Zara" → "Z"; falls back to the email's first letter. */
export function initialsOf(user: Pick<SessionUser, "name" | "email">): string {
  const words = user.name.trim().split(/\s+/).filter(Boolean);
  const first = (w?: string) => (w ? Array.from(w)[0] : "");
  const letters = words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : first(words[0]) || first(user.email);
  return letters.toLocaleUpperCase("en-IN") || "?";
}

/** Round badge with the customer's initials. */
export function Initials({ user, className }: { user: Pick<SessionUser, "name" | "email">; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[0.72rem] font-medium tracking-[0.04em] text-brand-ink",
        className,
      )}
    >
      {initialsOf(user)}
    </span>
  );
}

const iconLink =
  "relative grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface [&_svg]:size-[1.2rem] [&_svg]:stroke-[1.5]";

const links = [
  { href: "/account", label: "My account", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

/**
 * Header account control. Signed out: a person icon to sign in. Signed in:
 * the customer's initials, opening a short menu with their name, the main
 * account pages and sign out.
 */
export function AccountMenu() {
  const user = sessionStore.useStore();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return (
      <Link href="/login" aria-label="Sign in" className={cn(iconLink, "hidden sm:grid")}>
        <User />
      </Link>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.email;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${user.name || user.email}`}
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink data-[state=open]:bg-surface"
      >
        <Initials user={user} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[15.5rem] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-card border border-line bg-canvas p-1.5 shadow-[0_24px_60px_-24px_rgb(36_32_32/0.35)] data-[state=open]:animate-overlay-in"
        >
          <div className="flex items-center gap-3 px-3 pb-3 pt-2.5">
            <Initials user={user} className="size-10 text-[0.82rem]" />
            <div className="min-w-0">
              <p className="truncate text-[0.92rem] font-medium">Hello, {firstName}</p>
              <p className="truncate text-[0.78rem] text-muted">{user.email}</p>
            </div>
          </div>
          <DropdownMenu.Separator className="mx-1.5 mb-1 h-px bg-line" />
          {links.map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-control px-3 text-[0.9rem] outline-none data-[highlighted]:bg-surface aria-[current=page]:font-medium"
              >
                <Icon className="size-[1.05rem] stroke-[1.5] text-muted" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={() => {
              signOut();
              toast("You've been signed out");
              if (pathname?.startsWith("/account")) router.push("/");
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-[0.9rem] outline-none data-[highlighted]:bg-surface"
          >
            <LogOut className="size-[1.05rem] stroke-[1.5] text-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
