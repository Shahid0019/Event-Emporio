import { describe, expect, it } from "vitest";
import { blankKitDraft, draftFromProduct, productFromDraft } from "@/lib/kit/kit-product";
import { newUploadKey, UPLOAD_KEY_PATTERN, UPLOAD_MAX_BYTES, uploadProblem } from "@/lib/uploads";

describe("upload rules", () => {
  it("accepts common photo formats up to the size limit", () => {
    expect(uploadProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(uploadProblem({ type: "image/webp", size: UPLOAD_MAX_BYTES })).toBeNull();
  });

  it("rejects SVG, other files, empty files and oversized files with a readable reason", () => {
    expect(uploadProblem({ type: "image/svg+xml", size: 100, name: "logo.svg" })).toMatch(/logo\.svg isn't a JPG/);
    expect(uploadProblem({ type: "application/pdf", size: 100 })).toMatch(/isn't a JPG/);
    expect(uploadProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(uploadProblem({ type: "image/png", size: UPLOAD_MAX_BYTES + 1 })).toMatch(/over 8 MB/);
  });

  it("generates keys from the server only — folder, date and a random id", () => {
    const key = newUploadKey("products", "image/png", new Date("2026-10-17T00:00:00Z"));
    expect(key).toMatch(/^products\/2026\/10\/[0-9a-f-]{36}\.png$/);
    expect(UPLOAD_KEY_PATTERN.test(key)).toBe(true);
    expect(newUploadKey("products", "image/png")).not.toBe(key);
  });

  it("refuses keys that could escape the uploads folder or use other extensions", () => {
    for (const bad of [
      "../secrets/2026/10/00000000-0000-0000-0000-000000000000.png",
      "products/2026/10/../../x.png",
      "products/2026/10/00000000-0000-0000-0000-000000000000.svg",
      "unknown/2026/10/00000000-0000-0000-0000-000000000000.png",
    ]) {
      expect(UPLOAD_KEY_PATTERN.test(bad)).toBe(false);
    }
  });
});

describe("kit product photos", () => {
  const photo = { src: "https://cdn.example.com/kit-products/2026/10/abc.jpg", alt: "", width: 1200, height: 1500 };
  const base = { ...blankKitDraft(), name: "Kahwa flask", options: [{ name: "1 litre", price: 25000, stock: 10 }] };

  it("uses the item's photos instead of the illustration, with alt text falling back to the name", () => {
    const second = { ...photo, src: photo.src.replace("abc", "def"), alt: "Open flask" };
    const p = productFromDraft({ ...base, photos: [photo, second] });
    expect(p.images).toEqual([{ ...photo, alt: "Kahwa flask" }, second]);
    expect(draftFromProduct(p).photos.map((x) => x.src)).toEqual([photo.src, second.src]);
  });

  it("keeps item photos and option photos apart", () => {
    const optionPhoto = { ...photo, src: photo.src.replace("abc", "opt") };
    const p = productFromDraft({
      ...base,
      photos: [photo],
      options: [{ name: "1 litre", price: 25000, stock: 10, photos: [optionPhoto] }],
    });
    expect(p.images.map((x) => x.src)).toEqual([photo.src, optionPhoto.src]);
    expect(p.variants[0].imageIndexes).toEqual([1]);
    const back = draftFromProduct(p);
    expect(back.photos.map((x) => x.src)).toEqual([photo.src]);
    expect(back.options[0].photos?.map((x) => x.src)).toEqual([optionPhoto.src]);
  });

  it("falls back to the chosen illustration without photos", () => {
    const p = productFromDraft({ ...base, imageId: "wglass" });
    expect(p.images[0].src).toBe("/images/kit/wglass.svg");
    expect(draftFromProduct(p).photos).toEqual([]);
    expect(draftFromProduct(p).imageId).toBe("wglass");
  });
});
