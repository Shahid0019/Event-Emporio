import type { Metadata } from "next";
import { KitBuilder } from "@/components/kit/kit-builder";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Plan My Function",
  description: "Tell us the function and the number of trami — we count every dastarkhan, glass, box and bag for your Kashmiri wedding.",
  path: "/kit",
});

export default function KitPage() {
  return <KitBuilder />;
}
