"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-luxe py-20">
      <EmptyState
        title="Something went wrong"
        description="We couldn't load this page. Please try again — your bag and wishlist are safe."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Go home
            </Link>
          </div>
        }
      />
    </div>
  );
}
