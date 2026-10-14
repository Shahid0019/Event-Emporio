import type { Metadata } from "next";
import { KitBuilder } from "@/components/kit/kit-builder";

export const metadata: Metadata = {
  title: "Build My Kit",
  description: "Tell us the function and the number of trami — we count every dastarkhan, glass, box and bag for your Kashmiri wedding.",
  alternates: { canonical: "/kit" },
};

export default function KitPage() {
  return <KitBuilder />;
}
