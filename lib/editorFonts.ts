/** Bundled editor fonts under `/public/fonts` — CSS @font-face uses the same `family` strings. */

export type EditorFontOption = {
  id: string;
  label: string;
  /** Must match `font-family` in `app/globals.css` @font-face rules */
  family: string;
  path: string;
};

export const EDITOR_FONTS: EditorFontOption[] = [
  { id: "brandon", label: "Brandon", family: "Editor Brandon", path: "/fonts/brandon.otf" },
  { id: "eclipse", label: "Eclipse", family: "Editor Eclipse", path: "/fonts/eclipse.otf" },
  { id: "hind", label: "Hind", family: "Editor Hind", path: "/fonts/hind.ttf" },
  { id: "japanese", label: "Japanese", family: "Editor Japanese", path: "/fonts/japanese.ttf" },
  { id: "moderno", label: "Moderno", family: "Editor Moderno", path: "/fonts/moderno.ttf" },
  { id: "molot", label: "Molot", family: "Editor Molot", path: "/fonts/molot.otf" },
  { id: "monoton", label: "Monoton", family: "Editor Monoton", path: "/fonts/monoton.ttf" },
  { id: "outrun", label: "Outrun", family: "Editor Outrun", path: "/fonts/outrun.otf" },
  { id: "proximanova", label: "Proxima Nova", family: "Editor Proxima Nova", path: "/fonts/proximanova.otf" },
  { id: "road-rage", label: "Road Rage", family: "Editor Road Rage", path: "/fonts/road-rage.otf" },
  { id: "retro-signature", label: "Retro Signature", family: "Editor Retro Signature", path: "/fonts/retro-signature.otf" },
  { id: "script", label: "Script", family: "Editor Script", path: "/fonts/script.otf" },
  { id: "simplicity", label: "Simplicity", family: "Editor Simplicity", path: "/fonts/simplicity.ttf" },
  { id: "space-quest", label: "Space Quest", family: "Editor Space Quest", path: "/fonts/space-quest.ttf" },
  { id: "stormfaze", label: "Stormfaze", family: "Editor Stormfaze", path: "/fonts/stormfaze.ttf" },
  { id: "torchzilla", label: "Torchzilla", family: "Editor Torchzilla", path: "/fonts/torchzilla-regular.otf" },
  { id: "ubuntu", label: "Ubuntu", family: "Editor Ubuntu", path: "/fonts/ubuntu.ttf" },
  { id: "ultraquick", label: "Ultraquick", family: "Editor Ultraquick", path: "/fonts/ultraquick.otf" },
  { id: "visage", label: "Visage", family: "Editor Visage", path: "/fonts/visage.otf" },
].sort((a, b) => a.label.localeCompare(b.label));

export const DEFAULT_EDITOR_FONT_FAMILY = EDITOR_FONTS[0]?.family ?? "sans-serif";

/** Ensures the font is loaded so canvas text renders correctly on first paint. */
export async function ensureEditorFontLoaded(
  family: string,
  fontSize = 48,
): Promise<void> {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
  const spec = `${fontSize}px "${family}"`;
  try {
    // Always await load — `check()` can be true while canvas/text still needs a fresh load
    // after switching away and back to the same family.
    await document.fonts.load(spec);
  } catch {
    /* ignore */
  }
}

/**
 * Load every editor font into the FontFace set so canvas `fillText` can resolve
 * families (not just CSS). Call once after mount.
 */
export async function warmupEditorFonts(): Promise<void> {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
  await Promise.all(
    EDITOR_FONTS.map((f) =>
      document.fonts.load(`16px "${f.family}"`).catch(() => {}),
    ),
  );
}
