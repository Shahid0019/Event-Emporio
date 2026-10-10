import { NextResponse, type NextRequest } from "next/server";
import { searchSuggestions } from "@/lib/catalog";

/** Lightweight typeahead endpoint — returns at most a handful of matches. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const data = await searchSuggestions(q);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60" } });
}
