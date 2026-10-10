import type { ImageAsset } from "../types";

/**
 * DEMO PLACEHOLDER IMAGERY — see public/images/demo/CREDITS.md.
 * These Unsplash photos do not depict Events Emporio products and must be
 * replaced with client-approved photography before launch.
 */
const dims = {
  "hero-florals": [1067, 1600],
  "candlelit-table": [1067, 1600],
  "dinner-table": [1600, 1067],
  "table-setting": [1600, 1067],
  "mehndi-portrait": [1067, 1600],
  "mehndi-celebration": [1600, 1065],
  "mehndi-hands": [1600, 1067],
  "mehndi-couple": [1200, 1600],
  "mehndi-rings": [1600, 1067],
  "rose-basket": [1067, 1600],
  "lilac-basket": [1066, 1600],
  "flower-arranging": [1600, 1065],
  "gift-candlelight": [1067, 1600],
  "gift-kraft": [1067, 1600],
  "gift-boxes-white": [1600, 1067],
  "gift-gold-ribbon": [1067, 1600],
  "gift-pink": [1600, 1106],
  "gift-red": [1600, 1067],
  "gift-red-tag": [1600, 1067],
  "hamper-newborn": [1600, 1200],
  "chocolates-assorted": [1600, 1067],
  "chocolates-teal": [1600, 1067],
  "chocolates-box": [1600, 1067],
  "macaron-box": [1067, 1600],
  "macarons-pastel": [1264, 1600],
  "macarons-stack": [1067, 1600],
  "dry-fruits-brass": [1600, 1067],
  "dry-fruits-bowl": [1600, 1067],
  "brass-tray": [1280, 1600],
  "brass-pitcher": [1600, 1046],
  "candle-jar": [1600, 1063],
  "candles-diffuser": [1067, 1600],
  "florals-vase": [1067, 1600],
  "roses-pink": [1600, 1067],
} as const;

export type DemoImageName = keyof typeof dims;

export function demoImage(name: DemoImageName, alt: string): ImageAsset {
  const [width, height] = dims[name];
  return { src: `/images/demo/${name}.jpg`, alt, width, height };
}
