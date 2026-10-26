import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { s3Settings, UPLOAD_KEY_PATTERN, UPLOAD_MAX_BYTES, UPLOAD_TYPES, isUploadType } from "@/lib/uploads";

/** First bytes of each accepted format, so a renamed file can't pose as an image. */
function looksLikeImage(bytes: Uint8Array, type: keyof typeof UPLOAD_TYPES): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/avif":
      return ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12));
  }
}

/**
 * DEVELOPMENT FALLBACK ONLY — used when S3 isn't configured, so the admin
 * uploader can be tried locally. Saves into /public/uploads (git-ignored).
 * Disabled in production and whenever S3 is configured.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" || s3Settings()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "Sign in to the admin to upload images." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const key = form.get("key");
  const file = form.get("file");
  if (typeof key !== "string" || !UPLOAD_KEY_PATTERN.test(key) || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  if (!isUploadType(file.type) || !key.endsWith(`.${UPLOAD_TYPES[file.type]}`) || file.size < 1 || file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP or AVIF images up to 8 MB can be uploaded." }, { status: 422 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeImage(bytes, file.type)) {
    return NextResponse.json({ error: "That file isn't a valid image." }, { status: 422 });
  }

  const root = path.join(process.cwd(), "public", "uploads");
  const target = path.join(root, ...key.split("/"));
  if (!target.startsWith(root + path.sep)) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return new NextResponse(null, { status: 204 });
}
