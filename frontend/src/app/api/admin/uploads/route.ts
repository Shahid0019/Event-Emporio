import { NextResponse, type NextRequest } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { isUploadType, newUploadKey, s3Settings, UPLOAD_FOLDERS, UPLOAD_MAX_BYTES } from "@/lib/uploads";

const requestSchema = z.object({
  contentType: z.string().refine(isUploadType, "Unsupported image type"),
  size: z.number().int().min(1).max(UPLOAD_MAX_BYTES),
  folder: z.enum(UPLOAD_FOLDERS),
});

export interface UploadTicket {
  /** Where the browser POSTs the multipart form (S3, or the local dev endpoint). */
  url: string;
  /** Form fields to send before the file (signed policy for S3). */
  fields: Record<string, string>;
  /** URL the image will be served from once uploaded. */
  publicUrl: string;
  mode: "s3" | "local";
}

let client: S3Client | undefined;

/**
 * Issues a short-lived, admin-only upload ticket. With S3 configured this is
 * a presigned POST whose policy pins the key, content type and maximum size,
 * so S3 rejects anything else. Without S3, development falls back to saving
 * files under /public/uploads so the admin can be tried out locally.
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "Sign in to the admin to upload images." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP or AVIF images up to 8 MB can be uploaded." }, { status: 422 });
  }
  const { contentType, folder } = parsed.data;
  if (!isUploadType(contentType)) return NextResponse.json({ error: "Unsupported image type" }, { status: 422 });
  const key = newUploadKey(folder, contentType);

  const s3 = s3Settings();
  if (s3) {
    client ??= new S3Client({ region: s3.region });
    const { url, fields } = await createPresignedPost(client, {
      Bucket: s3.bucket,
      Key: key,
      Fields: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
      Conditions: [
        ["content-length-range", 1, UPLOAD_MAX_BYTES],
        ["eq", "$Content-Type", contentType],
        ["eq", "$Cache-Control", "public, max-age=31536000, immutable"],
      ],
      Expires: 120,
    });
    const ticket: UploadTicket = { url, fields, publicUrl: `${s3.publicBaseUrl}/${key}`, mode: "s3" };
    return NextResponse.json(ticket, { headers: { "Cache-Control": "no-store" } });
  }

  if (process.env.NODE_ENV !== "production") {
    const ticket: UploadTicket = { url: "/api/admin/uploads/local", fields: { key }, publicUrl: `/uploads/${key}`, mode: "local" };
    return NextResponse.json(ticket, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { error: "Image uploads aren't set up yet. Add S3_BUCKET and AWS_REGION (plus AWS credentials) to the server environment." },
    { status: 503 },
  );
}
