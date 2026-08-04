import type { Canvas } from "fabric";
import { FabricImage, Group, type FabricObject } from "fabric";
import { normalizeAllITextAfterLoad } from "@/lib/fabricIText";

export const CANVAS_STORAGE_KEY = "image-editor-canvas-v1";

function getCanvasStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  // Use `sessionStorage` here instead of `localStorage` if you only want persistence
  // until the tab is closed (still survives refresh within the same tab).
  return localStorage;
}

function imageElementToDataUrl(el: HTMLImageElement): string {
  const w = el.naturalWidth || el.width;
  const h = el.naturalHeight || el.height;
  if (!w || !h) {
    return el.src;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return el.src;
  }
  ctx.drawImage(el, 0, 0);
  return c.toDataURL("image/png");
}

export function serializeObjectsForClipboard(objects: FabricObject[]): Record<string, unknown>[] {
  const serialized = objects.map((o) => o.toObject() as Record<string, unknown>);
  embedBlobImagesInSerialized(objects, serialized);
  return serialized;
}

function embedBlobImagesInSerialized(
  runtimeObjs: FabricObject[],
  serializedObjs: unknown[],
) {
  for (let i = 0; i < runtimeObjs.length; i++) {
    const rt = runtimeObjs[i];
    const ser = serializedObjs[i] as Record<string, unknown> | undefined;
    if (!ser) continue;

    if (rt instanceof Group && Array.isArray(ser.objects)) {
      embedBlobImagesInSerialized(
        rt.getObjects(),
        ser.objects as unknown[],
      );
    } else if (rt instanceof FabricImage && typeof ser.src === "string") {
      const el = rt.getElement() as HTMLImageElement | undefined;
      if (el?.src?.startsWith("blob:")) {
        ser.src = imageElementToDataUrl(el);
      }
    }
  }
}

function buildStorableCanvas(canvas: Canvas): object {
  const data = canvas.toObject();
  const objs = canvas.getObjects();
  const serialized = (data as { objects?: unknown[] }).objects;
  if (serialized && objs.length === serialized.length) {
    embedBlobImagesInSerialized(objs, serialized);
  }
  return data;
}

export function saveCanvasState(canvas: Canvas): void {
  const store = getCanvasStorage();
  if (!store) return;
  try {
    const data = buildStorableCanvas(canvas);
    const json = JSON.stringify(data);
    store.setItem(CANVAS_STORAGE_KEY, json);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("image-editor: localStorage full, canvas not saved");
    }
  }
}

export async function loadCanvasState(canvas: Canvas): Promise<boolean> {
  const store = getCanvasStorage();
  if (!store) return false;
  const raw = store.getItem(CANVAS_STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return false;
    await canvas.loadFromJSON(data);
    normalizeAllITextAfterLoad(canvas);
    canvas.requestRenderAll();
    return true;
  } catch {
    return false;
  }
}

export function clearCanvasState(): void {
  const store = getCanvasStorage();
  if (!store) return;
  store.removeItem(CANVAS_STORAGE_KEY);
}
