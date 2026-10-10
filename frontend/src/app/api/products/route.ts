import { NextResponse, type NextRequest } from "next/server";
import { getProductsBySlugs } from "@/lib/catalog";

/** Returns product summaries for a short list of slugs (recently viewed, wishlist refresh). */
export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, 12);
  return NextResponse.json(await getProductsBySlugs(slugs));
}
