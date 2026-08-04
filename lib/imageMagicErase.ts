/**
 * Magic eraser: flood-fill erase from a pixel.
 *
 * Starts at (startX, startY) in image pixel space and makes every
 * connected pixel whose RGB distance to the start pixel is within
 * `tolerance` fully transparent. Returns a PNG data URL, or `null`
 * on failure (e.g. tainted canvas, zero-size image, out-of-bounds
 * start point, or start pixel already transparent).
 */

export type MagicEraseOptions = {
  /** Euclidean RGB distance (max ≈ 441). Typical 10–130. Default 40. */
  tolerance?: number;
};

function dist(r: number, g: number, b: number, tr: number, tg: number, tb: number) {
  const dr = r - tr;
  const dg = g - tg;
  const db = b - tb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function magicEraseFromImageElement(
  el: HTMLImageElement | HTMLCanvasElement,
  startX: number,
  startY: number,
  opts: MagicEraseOptions = {},
): string | null {
  const w = "naturalWidth" in el ? el.naturalWidth : el.width;
  const h = "naturalHeight" in el ? el.naturalHeight : el.height;
  if (!w || !h) return null;

  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;

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

  const data = imageData.data;
  const startIdx = (sy * w + sx) * 4;
  const tr = data[startIdx]!;
  const tg = data[startIdx + 1]!;
  const tb = data[startIdx + 2]!;
  const ta = data[startIdx + 3]!;
  // Clicked a hole: nothing to erase.
  if (ta === 0) return null;

  // Iterative 4-connected flood fill with a typed "visited" mask.
  const visited = new Uint8Array(w * h);
  const stack: number[] = [sy * w + sx];
  let erased = 0;

  while (stack.length) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    const a = data[i + 3]!;
    if (a === 0) continue;
    if (dist(data[i]!, data[i + 1]!, data[i + 2]!, tr, tg, tb) > tolerance) continue;

    data[i + 3] = 0;
    erased++;

    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }

  if (erased === 0) return null;

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
