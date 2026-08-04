import {
  cache,
  Group,
  IText,
  type Canvas,
  type FabricObject,
} from "fabric";

/**
 * Fabric `IText` merges per-character `styles` over object-level props. New text
 * often gets Times New Roman baked into `styles`, so changing the dropdown only
 * updates `fontFamily` while rendering still uses the old family from `styles`.
 */
export function applyITextFontProps(
  text: IText,
  patch: { fontFamily?: string; fontSize?: number },
): void {
  if (patch.fontFamily !== undefined) {
    text.set("fontFamily", patch.fontFamily);
  }
  if (patch.fontSize !== undefined) {
    text.set("fontSize", patch.fontSize);
  }
  // Per-char styles override object font; drop them so the object font wins.
  text.removeStyle("fontFamily");
  text.removeStyle("fontSize");
  if (patch.fontFamily !== undefined) {
    // Char-level weight/style can keep the browser on a fallback face when switching back.
    text.removeStyle("fontWeight");
    text.removeStyle("fontStyle");
  }
  text.set("styles", {});
  // Cached bitmap often bakes in the fallback serif font before webfonts load.
  text.set({ objectCaching: false, dirty: true });
  text.initDimensions();
  if (patch.fontFamily !== undefined) {
    // Wipe width cache so switching away and back does not reuse fallback metrics.
    cache.clearFontCache();
  }
  if (text.isEditing) {
    text.clearContextTop();
    text.renderCursorOrSelection();
  }
}

/** After `loadFromJSON`, reconcile char styles with object-level font (fixes older saves). */
export function normalizeAllITextAfterLoad(canvas: Canvas): void {
  const visit = (objs: FabricObject[]) => {
    for (const obj of objs) {
      if (obj instanceof IText) {
        const fam = typeof obj.fontFamily === "string" ? obj.fontFamily : undefined;
        const sz = typeof obj.fontSize === "number" ? obj.fontSize : undefined;
        if (fam !== undefined && sz !== undefined) {
          applyITextFontProps(obj, { fontFamily: fam, fontSize: sz });
        }
      } else if (obj instanceof Group) {
        visit(obj.getObjects());
      }
    }
  };
  visit(canvas.getObjects());
}
