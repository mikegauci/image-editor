import {
  ActiveSelection,
  Group,
  IText,
  util,
  type Canvas,
  type FabricObject,
} from "fabric";
import { applyITextFontProps } from "@/lib/fabricIText";

const PASTE_STEP = 20;

function normalizeITextInTree(objects: FabricObject[]): void {
  const walk = (objs: FabricObject[]) => {
    for (const obj of objs) {
      if (obj instanceof IText) {
        const fam = typeof obj.fontFamily === "string" ? obj.fontFamily : undefined;
        const sz = typeof obj.fontSize === "number" ? obj.fontSize : undefined;
        if (fam !== undefined && sz !== undefined) {
          applyITextFontProps(obj, { fontFamily: fam, fontSize: sz });
        }
      } else if (obj instanceof Group) {
        walk(obj.getObjects());
      }
    }
  };
  walk(objects);
}

function offsetObjects(objects: FabricObject[], dx: number, dy: number) {
  for (const o of objects) {
    o.set({
      left: (o.left ?? 0) + dx,
      top: (o.top ?? 0) + dy,
    });
    o.setCoords();
  }
}

/**
 * Rehydrate serialized objects, offset them, add to canvas, and select the result.
 */
export async function pasteSerializedOntoCanvas(
  canvas: Canvas,
  serialized: Record<string, unknown>[],
  pasteIndex: number,
): Promise<boolean> {
  if (serialized.length === 0) return false;
  const clone = serialized.map((o) => ({ ...o })) as Record<string, unknown>[];
  const delta = PASTE_STEP * pasteIndex;
  const enlived = (await util.enlivenObjects(clone)) as FabricObject[];
  offsetObjects(enlived, delta, delta);
  normalizeITextInTree(enlived);
  for (const o of enlived) {
    canvas.add(o);
  }
  if (enlived.length === 1) {
    canvas.setActiveObject(enlived[0]);
  } else {
    const sel = new ActiveSelection(enlived, { canvas });
    canvas.setActiveObject(sel);
  }
  canvas.requestRenderAll();
  return true;
}

export { PASTE_STEP };
