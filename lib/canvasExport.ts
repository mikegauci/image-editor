import type { Canvas } from "fabric";

const JPG_BG = "#ffffff";
const EDGE_PAD = 2;

/** Higher multiplier = sharper raster output (DPR-aware, capped). */
export function getExportMultiplier(): number {
  if (typeof window === "undefined") return 2;
  return Math.min(4, Math.max(2, window.devicePixelRatio || 1));
}

/**
 * Axis-aligned union of all visible object bounds in canvas scene coordinates.
 */
export function getContentCropRect(
  canvas: Canvas,
): { left: number; top: number; width: number; height: number } | null {
  const objects = canvas.getObjects().filter((o) => o.visible !== false);
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const o of objects) {
    o.setCoords();
    const b = o.getBoundingRect();
    minX = Math.min(minX, b.left);
    minY = Math.min(minY, b.top);
    maxX = Math.max(maxX, b.left + b.width);
    maxY = Math.max(maxY, b.top + b.height);
  }

  const cw = canvas.getWidth();
  const ch = canvas.getHeight();

  const left = Math.max(0, Math.floor(minX - EDGE_PAD));
  const top = Math.max(0, Math.floor(minY - EDGE_PAD));
  const right = Math.min(cw, Math.ceil(maxX + EDGE_PAD));
  const bottom = Math.min(ch, Math.ceil(maxY + EDGE_PAD));

  const width = right - left;
  const height = bottom - top;
  if (width < 1 || height < 1) return null;

  return { left, top, width, height };
}

type Mat2D = [number, number, number, number, number, number];

function cloneViewport(canvas: Canvas): Mat2D {
  const v = canvas.viewportTransform;
  return [v[0], v[1], v[2], v[3], v[4], v[5]];
}

/**
 * Exports only the tight bounding box around all objects, at higher resolution.
 * Resets viewport while exporting so crop math matches scene coordinates.
 */
export async function exportCanvasRegionToBlob(
  canvas: Canvas,
  format: "png" | "jpeg",
): Promise<Blob | null> {
  const prevVpt = cloneViewport(canvas);
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();

  try {
    const crop = getContentCropRect(canvas);
    if (!crop) return null;

    const multiplier = getExportMultiplier();
    const baseOpts = {
      ...crop,
      multiplier,
      enableRetinaScaling: true,
    };

    if (format === "jpeg") {
      const prevBg = canvas.backgroundColor;
      canvas.backgroundColor = JPG_BG;
      canvas.requestRenderAll();
      const blob = await canvas.toBlob({
        ...baseOpts,
        format: "jpeg",
        quality: 0.95,
      });
      canvas.backgroundColor = prevBg;
      canvas.requestRenderAll();
      return blob;
    }

    return canvas.toBlob({
      ...baseOpts,
      format: "png",
    });
  } finally {
    canvas.setViewportTransform(prevVpt);
    canvas.requestRenderAll();
  }
}
