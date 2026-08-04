/**
 * Finds the bounding box of "content" pixels — trims transparent and near-white margins.
 */

export type TrimOptions = {
  /** Pixels with alpha below this count as empty (0–255). Default 8. */
  alphaTolerance?: number;
  /** RGB must be at least (255 - this) to count as white margin. Default 7. */
  whiteTolerance?: number;
};

const defaultOpts: Required<TrimOptions> = {
  alphaTolerance: 8,
  whiteTolerance: 7,
};

function isMarginPixel(
  data: Uint8ClampedArray,
  i: number,
  opts: Required<TrimOptions>,
): boolean {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a < opts.alphaTolerance) return true;
  const w = 255 - opts.whiteTolerance;
  if (r >= w && g >= w && b >= w) return true;
  return false;
}

export function findContentBounds(
  imageData: ImageData,
  opts: TrimOptions = {},
): { left: number; top: number; width: number; height: number } | null {
  const o = { ...defaultOpts, ...opts };
  const { data, width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isMarginPixel(data, i, o)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Returns a PNG data URL with margins removed, or null if nothing to trim / error / fully empty.
 */
export function trimImageElementToDataUrl(
  el: HTMLImageElement | HTMLCanvasElement,
  opts?: TrimOptions,
): string | null {
  const w = "naturalWidth" in el ? el.naturalWidth : el.width;
  const h = "naturalHeight" in el ? el.naturalHeight : el.height;
  if (!w || !h) return null;

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

  const bounds = findContentBounds(imageData, opts);
  if (!bounds) return null;
  if (bounds.width === w && bounds.height === h) return null;

  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(
    canvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  return out.toDataURL("image/png");
}
