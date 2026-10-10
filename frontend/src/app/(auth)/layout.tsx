import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/primitives";
import { demoImage } from "@/lib/data/images";
import { storeSettings } from "@/lib/data/settings";

const art = demoImage("gift-candlelight", "Gift box tied with ribbon beside glowing candles");

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative m-3 hidden overflow-hidden rounded-media bg-brand-deep lg:block">
        <Image src={art.src} alt={art.alt} fill preload sizes="50vw" className="object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/90 via-brand-deep/20 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-canvas">
          <p className="font-serif text-[2.6rem] leading-tight">“{storeSettings.tagline}.”</p>
          <p className="eyebrow mt-5 text-accent-soft">
            {storeSettings.name} · {storeSettings.location.city}
          </p>
        </div>
      </div>
      <div className="flex flex-col px-[var(--gutter)] py-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Back to shop
          </Link>
        </div>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
