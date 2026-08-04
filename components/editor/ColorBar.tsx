"use client";

import type { EditorFontOption } from "@/lib/editorFonts";

type Props = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** 0–100 */
  opacity: number;
  autoTrimOnImport: boolean;
  onAutoTrimOnImportChange: (v: boolean) => void;
  onFillChange: (v: string) => void;
  onStrokeChange: (v: string) => void;
  onStrokeWidthChange: (v: number) => void;
  onOpacityChange: (v: number) => void;
  /** Text tool — font, size (px), angle (°) */
  editorFonts: EditorFontOption[];
  textFontFamily: string;
  textFontSize: number;
  textAngle: number;
  onTextFontFamilyChange: (family: string) => void;
  onTextFontSizeChange: (size: number) => void;
  onTextAngleChange: (deg: number) => void;
  /** Single image selected — show knock (remove color) controls */
  imageControlsVisible: boolean;
  knockTargetColor: string;
  onKnockTargetColorChange: (hex: string) => void;
  /** Euclidean RGB distance (10–130). Higher removes more pixels. */
  knockTolerance: number;
  onKnockToleranceChange: (n: number) => void;
};

export default function ColorBar({
  fill,
  stroke,
  strokeWidth,
  opacity,
  autoTrimOnImport,
  onAutoTrimOnImportChange,
  onFillChange,
  onStrokeChange,
  onStrokeWidthChange,
  onOpacityChange,
  editorFonts,
  textFontFamily,
  textFontSize,
  textAngle,
  onTextFontFamilyChange,
  onTextFontSizeChange,
  onTextAngleChange,
  imageControlsVisible,
  knockTargetColor,
  onKnockTargetColorChange,
  knockTolerance,
  onKnockToleranceChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Fill
        <input
          type="color"
          value={fill}
          onChange={(e) => onFillChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5 dark:border-neutral-600"
          aria-label="Fill color"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Stroke
        <input
          type="color"
          value={stroke}
          onChange={(e) => onStrokeChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5 dark:border-neutral-600"
          aria-label="Stroke color"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Width
        <input
          type="range"
          min={0}
          max={24}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-28"
          aria-label="Stroke width"
        />
        <span className="tabular-nums text-neutral-500">{strokeWidth}px</span>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-28"
          aria-label="Opacity"
        />
        <span className="tabular-nums text-neutral-500">{opacity}%</span>
      </label>
      <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Text
      </span>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Font
        <select
          value={textFontFamily}
          onChange={(e) => onTextFontFamilyChange(e.target.value)}
          className="max-w-[11rem] rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          aria-label="Text font"
        >
          {editorFonts.map((f) => (
            <option key={f.id} value={f.family}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Size
        <input
          type="range"
          min={8}
          max={200}
          value={textFontSize}
          onChange={(e) => onTextFontSizeChange(Number(e.target.value))}
          className="w-28"
          aria-label="Text size"
        />
        <span className="tabular-nums text-neutral-500">{textFontSize}px</span>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Angle
        <input
          type="range"
          min={-180}
          max={180}
          value={textAngle}
          onChange={(e) => onTextAngleChange(Number(e.target.value))}
          className="w-28"
          aria-label="Text angle"
        />
        <span className="tabular-nums text-neutral-500">{textAngle}°</span>
      </label>
      {imageControlsVisible && (
        <>
          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Image
          </span>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Knock
            <input
              type="color"
              value={knockTargetColor}
              onChange={(e) => onKnockTargetColorChange(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5 dark:border-neutral-600"
              aria-label="Color to remove from image"
              title="Pixels close to this color become transparent"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Range
            <input
              type="range"
              min={10}
              max={130}
              value={knockTolerance}
              onChange={(e) => onKnockToleranceChange(Number(e.target.value))}
              className="w-28"
              aria-label="How close a pixel must be to the color to remove"
            />
            <span className="tabular-nums text-neutral-500">{knockTolerance}</span>
          </label>
        </>
      )}
      <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={autoTrimOnImport}
          onChange={(e) => onAutoTrimOnImportChange(e.target.checked)}
          className="rounded border-neutral-400"
        />
        Auto-trim image margins
      </label>
    </div>
  );
}
