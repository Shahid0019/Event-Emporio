import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/primitives";
import { demoImage } from "@/lib/data/images";

const art = demoImage("florals-vase", "Pink roses and cornflowers in a glass vase");

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-[var(--gutter)] py-8">
        <Logo />
        <main id="main" className="flex flex-1 flex-col justify-center py-16">
          <p className="eyebrow text-accent-ink">Error 404</p>
          <h1 className="mt-5 text-display">
            Lost the <em className="text-brand">thread?</em>
          </h1>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-muted">
            The page you&apos;re looking for has moved or no longer exists. Let&apos;s get you back to something beautiful.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Back to home
            </Link>
            <Link href="/shop" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Shop all
            </Link>
          </div>
        </main>
      </div>
      <div className="relative m-3 hidden overflow-hidden rounded-media bg-surface lg:block">
        <Image src={art.src} alt={art.alt} fill sizes="50vw" className="object-cover" />
      </div>
    </div>
  );
}
