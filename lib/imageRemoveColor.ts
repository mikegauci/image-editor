/**
 * Make pixels matching a target color (within tolerance) fully transparent.
 * Useful for removing white halos, sticker backgrounds, etc.
 */

export type RemoveColorOptions = {
  /** Target RGB to remove (default: white). */
  target?: { r: number; g: number; b: number };
  /**
   * Euclidean distance in RGB space (max ≈ 441). Higher = more pixels removed.
   * Typical range 20–80. Default 40.
   */
  tolerance?: number;
};

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
): number {
  return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
}

/**
 * Returns a PNG data URL with matching pixels made transparent, or null on failure / tainted canvas.
 */
export function removeColorFromImageElement(
  el: HTMLImageElement | HTMLCanvasElement,
  opts: RemoveColorOptions = {},
): string | null {
  const w = "naturalWidth" in el ? el.naturalWidth : el.width;
  const h = "naturalHeight" in el ? el.naturalHeight : el.height;
  if (!w || !h) return null;

  const target = opts.target ?? { r: 255, g: 255, b: 255 };
  const tolerance = opts.tolerance ?? 40;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    ctx.drawImage(el, 0, 0);
  } catch {
    return null;
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const { data } = imageData;
  const { r: tr, g: tg, b: tb } = target;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (colorDistance(r, g, b, tr, tg, tb) <= tolerance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Parse `#rrggbb` for use with {@link removeColorFromImageElement}. */
export function removeColorFromImageElementWithHex(
  el: HTMLImageElement | HTMLCanvasElement,
  hexColor: string,
  tolerance?: number,
): string | null {
  const rgb = parseHexColor(hexColor);
  if (!rgb) return null;
  return removeColorFromImageElement(el, {
    target: rgb,
    tolerance,
  });
}
