"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle, ImageUp, RefreshCw, Trash2, X } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import type { UploadTicket } from "@/app/api/admin/uploads/route";
import type { ImageAsset } from "@/lib/types";
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES, uploadProblem, type UploadFolder } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/* ----------------------------- Upload engine ----------------------------- */

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    throw new Error(`${file.name} couldn't be read as an image.`);
  }
}

/** "rose-basket_02.jpg" → "Rose basket 02" — a starting point for alt text, which staff should refine. */
export function altFromFileName(name: string): string {
  const base = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

/**
 * Uploads one image: asks the server for a short-lived ticket, then sends the
 * file straight to storage (S3 in production) with progress reporting.
 */
export async function uploadImage(file: File, folder: UploadFolder, onProgress: (fraction: number) => void): Promise<ImageAsset> {
  const problem = uploadProblem(file);
  if (problem) throw new Error(problem);
  const { width, height } = await imageSize(file);

  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size, folder }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : "";
    throw new Error(message || "Couldn't start the upload. Try again.");
  }
  const ticket = data as UploadTicket;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(xhr.status === 403 ? "Storage refused the upload — check the S3 bucket settings." : "Upload failed. Try again."),
          );
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    const form = new FormData();
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v);
    form.append("file", file); // must come last for S3
    xhr.send(form);
  });

  onProgress(1);
  return { src: ticket.publicUrl, alt: altFromFileName(file.name), width, height };
}

export interface PendingUpload {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  error?: string;
}

/** Tracks a queue of uploads; calls `onUploaded` as each finishes. */
export function useImageUploads(folder: UploadFolder, onUploaded: (image: ImageAsset) => void) {
  const [items, setItems] = useState<PendingUpload[]>([]);
  const onUploadedRef = useRef(onUploaded);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  const patch = (id: string, change: Partial<PendingUpload>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));

  const run = (item: PendingUpload) => {
    uploadImage(item.file, folder, (progress) => patch(item.id, { progress }))
      .then((image) => {
        onUploadedRef.current(image);
        URL.revokeObjectURL(item.previewUrl);
        setItems((list) => list.filter((i) => i.id !== item.id));
      })
      .catch((err: unknown) => patch(item.id, { error: err instanceof Error ? err.message : "Upload failed.", progress: 0 }));
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const problem = uploadProblem(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const item: PendingUpload = { id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), progress: 0 };
      setItems((list) => [...list, item]);
      run(item);
    }
  };

  const retry = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    patch(id, { error: undefined, progress: 0 });
    run(item);
  };

  const dismiss = (id: string) =>
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return list.filter((i) => i.id !== id);
    });

  return { items, addFiles, retry, dismiss, uploading: items.some((i) => !i.error) };
}

/* -------------------------------- Dropzone ------------------------------- */

/** Files from a drop, paste or picker; unsupported ones are rejected with a message by `uploadProblem`. */
const imagesFrom = (list: FileList | null | undefined) => Array.from(list ?? []);

/** Drag & drop, paste, or browse. Keyboard users get a real button. */
export function ImageDropzone({
  onFiles,
  multiple,
  label,
  className,
  compact,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = imagesFrom(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  const onPaste = (e: ClipboardEvent) => {
    const files = imagesFrom(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      onFiles(multiple ? files : files.slice(0, 1));
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      data-over={over || undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-card border-2 border-dashed border-line-strong bg-canvas text-center transition-colors data-[over]:border-brand data-[over]:bg-brand/5",
        compact ? "gap-1 px-4 py-5" : "gap-2 px-6 py-8",
        className,
      )}
    >
      <ImageUp aria-hidden className={cn("text-accent-ink", compact ? "size-5" : "size-7")} strokeWidth={1.5} />
      <p className="text-[0.9rem]">
        {label ?? (multiple ? "Drop photos here, paste, or" : "Drop a photo here, paste, or")}{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-medium text-brand underline underline-offset-4 hover:text-brand-deep"
        >
          browse
        </button>
      </p>
      <p className="text-[0.75rem] text-muted">JPG, PNG, WebP or AVIF · up to {UPLOAD_MAX_BYTES / 1024 / 1024} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple={multiple}
        hidden
        aria-label={multiple ? "Upload images" : "Upload image"}
        onChange={(e) => {
          const files = imagesFrom(e.target.files);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------ Upload queue ----------------------------- */

export function UploadQueue({
  items,
  onRetry,
  onDismiss,
}: {
  items: PendingUpload[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2" aria-label="Uploads in progress">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "flex items-center gap-3 rounded-control border p-2.5",
            item.error ? "border-danger/40 bg-danger/5" : "border-line",
          )}
        >
          <span className="relative aspect-square w-12 shrink-0 overflow-hidden rounded-chip bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={item.previewUrl} alt="" className="size-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.85rem]">{item.file.name}</p>
            {item.error ? (
              <p role="alert" className="mt-0.5 flex items-start gap-1 text-[0.78rem] text-danger">
                <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {item.error}
              </p>
            ) : (
              <div
                role="progressbar"
                aria-label={`Uploading ${item.file.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.progress * 100)}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{ width: `${Math.max(4, item.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
          {item.error ? (
            <span className="flex">
              <IconButton label={`Retry ${item.file.name}`} onClick={() => onRetry(item.id)}>
                <RefreshCw />
              </IconButton>
              <IconButton label={`Dismiss ${item.file.name}`} onClick={() => onDismiss(item.id)}>
                <X />
              </IconButton>
            </span>
          ) : (
            <span className="w-10 text-right text-[0.75rem] tabular-nums text-muted">{Math.round(item.progress * 100)}%</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

/* --------------------------- Single image field -------------------------- */

/**
 * One image with alt text — categories, kit products.
 * Drop a new file on the preview (or use Replace) to swap it.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  folder,
  aspect = "aspect-[4/5]",
  hint,
  removable = true,
}: {
  id: string;
  label: string;
  value: ImageAsset | undefined;
  onChange: (image: ImageAsset | undefined) => void;
  folder: UploadFolder;
  aspect?: string;
  hint?: ReactNode;
  removable?: boolean;
}) {
  const { items, addFiles, retry, dismiss, uploading } = useImageUploads(folder, (image) => {
    onChange(image);
    toast.success("Image uploaded — check the alt text");
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div>
      <p className="mb-2 text-[0.85rem] font-medium">{label}</p>
      {value ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const file = imagesFrom(e.dataTransfer.files)[0];
              if (file) addFiles([file]);
            }}
            className={cn(
              "relative w-full shrink-0 overflow-hidden rounded-control bg-surface sm:w-40",
              aspect,
              over && "ring-2 ring-brand ring-offset-2",
            )}
          >
            <Image src={value.src} alt="" fill sizes="160px" className="object-cover" />
            {uploading && (
              <span className="absolute inset-0 grid place-items-center bg-canvas/80 text-[0.8rem] font-medium">Uploading…</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Alt text" htmlFor={`${id}-alt`} hint={hint ?? "Describe the photo for people using screen readers."}>
              <Input id={`${id}-alt`} value={value.alt} maxLength={160} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.8rem] hover:border-ink"
              >
                <ImageUp className="size-4" /> Replace
              </button>
              {removable && (
                <button
                  type="button"
                  onClick={() => onChange(undefined)}
                  className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[0.8rem] text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              hidden
              aria-label={`Replace ${label.toLowerCase()}`}
              onChange={(e) => {
                const file = imagesFrom(e.target.files)[0];
                if (file) addFiles([file]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      ) : (
        <ImageDropzone onFiles={(files) => addFiles(files.slice(0, 1))} compact />
      )}
      <div className="mt-3">
        <UploadQueue items={items} onRetry={retry} onDismiss={dismiss} />
      </div>
    </div>
  );
}

/* ------------------------------ Photo lists ------------------------------ */

export const PHOTO_SET_MAX = 8;

/** Uploads that append to a photo list, up to `max`, always onto the latest list. */
function usePhotoListUploads(folder: UploadFolder, value: ImageAsset[], onChange: (photos: ImageAsset[]) => void, max: number) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const uploads = useImageUploads(folder, (image) => {
    const next = [...latest.current, image].slice(0, max);
    latest.current = next;
    onChange(next);
  });
  const add = (files: File[]) => {
    const room = max - value.length - uploads.items.filter((i) => !i.error).length;
    if (room <= 0) return void toast.error(`Up to ${max} photos here.`);
    if (files.length > room) toast(`Only the first ${room} added — up to ${max} photos here.`);
    uploads.addFiles(files.slice(0, room));
  };
  return { ...uploads, add };
}

/** Ordered photos with alt text, move earlier/later and remove. The first one is shown first. */
export function PhotoList({ value, onChange }: { value: ImageAsset[]; onChange: (photos: ImageAsset[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <ol className="space-y-3">
      {value.map((photo, i) => (
        <li key={`${photo.src}-${i}`} className="flex gap-3 rounded-control border border-line p-2.5">
          <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-chip bg-surface">
            <Image src={photo.src} alt="" fill sizes="64px" className="object-cover" />
            {i === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-0.5 text-center text-[0.6rem] font-medium uppercase tracking-[0.08em] text-canvas">
                First
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              aria-label={`Alt text for photo ${i + 1}`}
              placeholder="Describe the photo"
              className="h-10 text-sm"
              maxLength={160}
              value={photo.alt}
              onChange={(e) => onChange(value.map((p, j) => (j === i ? { ...p, alt: e.target.value } : p)))}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="inline-flex min-h-9 items-center rounded-full px-2.5 text-[0.78rem] font-medium hover:bg-surface disabled:opacity-35"
                aria-label={`Move photo ${i + 1} earlier`}
              >
                ↑ Earlier
              </button>
              <button
                type="button"
                disabled={i === value.length - 1}
                onClick={() => move(i, 1)}
                className="inline-flex min-h-9 items-center rounded-full px-2.5 text-[0.78rem] font-medium hover:bg-surface disabled:opacity-35"
                aria-label={`Move photo ${i + 1} later`}
              >
                ↓ Later
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-[0.78rem] font-medium text-danger hover:bg-danger/10"
                aria-label={`Remove photo ${i + 1}`}
              >
                <Trash2 aria-hidden className="size-3.5" /> Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Several photos edited in place (drop, paste or browse; reorder; describe; remove). */
export function PhotoGalleryField({
  value,
  onChange,
  folder,
  max = PHOTO_SET_MAX,
  empty,
}: {
  value: ImageAsset[];
  onChange: (photos: ImageAsset[]) => void;
  folder: UploadFolder;
  max?: number;
  /** Shown when there are no photos yet. */
  empty?: ReactNode;
}) {
  const { items, add, retry, dismiss } = usePhotoListUploads(folder, value, onChange, max);
  return (
    <div className="space-y-3">
      {value.length > 0 ? <PhotoList value={value} onChange={onChange} /> : empty}
      {value.length < max && <ImageDropzone multiple onFiles={add} compact />}
      <UploadQueue items={items} onRetry={retry} onDismiss={dismiss} />
      <p className="text-[0.75rem] text-muted">
        {value.length} of {max} photos · the first is shown first in the shop.
      </p>
    </div>
  );
}

/**
 * Photos for one option, shown as a strip under its row: thumbnails, "Add
 * photos" (opens the file picker straight away) and "Manage" for reordering,
 * alt text and removing. Files can also be dropped on the strip.
 */
export function OptionPhotos({
  label,
  value,
  onChange,
  folder,
}: {
  /** Names the set, e.g. "Photos for option 2 (Bio)". */
  label: string;
  value: ImageAsset[];
  onChange: (photos: ImageAsset[]) => void;
  folder: UploadFolder;
}) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, add, retry, dismiss, uploading } = usePhotoListUploads(folder, value, onChange, PHOTO_SET_MAX);
  const pending = items.filter((i) => !i.error);
  const failed = items.filter((i) => i.error);
  const summary = value.length ? `${value.length} photo${value.length === 1 ? "" : "s"}` : "none yet";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        add(imagesFrom(e.dataTransfer.files));
      }}
      className={cn("flex flex-wrap items-center gap-1.5 rounded-control p-1", over && "bg-surface ring-2 ring-brand")}
    >
      {value.map((photo, i) => (
        <button
          key={`${photo.src}-${i}`}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Photo ${i + 1}: ${photo.alt || "no description"}. Manage photos`}
          className="relative aspect-[4/5] w-9 overflow-hidden rounded-chip bg-surface ring-offset-1 hover:ring-2 hover:ring-ink"
        >
          <Image src={photo.src} alt="" fill sizes="36px" className="object-cover" />
        </button>
      ))}
      {pending.map((p) => (
        <span key={p.id} className="relative aspect-[4/5] w-9 overflow-hidden rounded-chip bg-surface">
          <Image src={p.previewUrl} alt="" fill sizes="36px" unoptimized className="object-cover opacity-60" />
          <RefreshCw aria-hidden className="absolute inset-0 m-auto size-3.5 animate-spin" />
        </span>
      ))}
      {failed.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => retry(f.id)}
          title={f.error}
          aria-label={`Upload failed: ${f.error} Retry`}
          className="grid aspect-[4/5] w-9 place-items-center rounded-chip border border-danger text-danger"
        >
          <AlertCircle aria-hidden className="size-3.5" />
        </button>
      ))}
      {value.length + pending.length < PHOTO_SET_MAX && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-[0.78rem] font-medium text-muted transition-colors hover:border-ink hover:text-ink"
        >
          <ImageUp aria-hidden className="size-3.5" />
          {value.length ? "Add photos" : "Add photos of this option"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${summary}. Manage photos`}
        className={cn(
          "inline-flex min-h-9 items-center rounded-full px-2.5 text-[0.78rem] font-medium text-muted underline-offset-4 hover:text-ink hover:underline",
          !value.length && "sr-only focus:not-sr-only",
        )}
      >
        Manage
      </button>
      {uploading && <span className="sr-only">Uploading…</span>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Upload ${label.toLowerCase()}`}
        onChange={(e) => {
          add(imagesFrom(e.target.files));
          e.target.value = "";
        }}
      />

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        description={`Up to ${PHOTO_SET_MAX} photos. The first one is shown first in the shop.`}
      >
        <PhotoList value={value} onChange={onChange} />
        <div className="mt-4">
          {value.length < PHOTO_SET_MAX && <ImageDropzone multiple onFiles={add} compact />}
          <div className="mt-3">
            <UploadQueue items={items} onRetry={retry} onDismiss={dismiss} />
          </div>
        </div>
        {value.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted">No photos yet. Shoppers see the item&apos;s main photos for this option.</p>
        )}
      </Sheet>
    </div>
  );
}
