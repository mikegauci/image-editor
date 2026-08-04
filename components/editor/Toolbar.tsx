"use client";

import Link from "next/link";

type Props = {
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onStartRectDraw: () => void;
  onAddSquare: () => void;
  rectDrawActive: boolean;
  onAddCircle: () => void;
  onAddText: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onPickImage: () => void;
  onTrimImage: () => void;
  /** Remove selected color (e.g. white) from image pixels — like a magic wand */
  onKnockColor: () => void;
  /** Toggle click-to-erase mode (magic eraser / paint bucket) */
  onToggleMagicErase: () => void;
  magicEraseActive: boolean;
  onDownloadPng: () => void;
  onDownloadJpg: () => void;
  onUploadCloud: () => void;
  uploadLabel: string;
  uploadDisabled: boolean;
  userEmail: string | null;
  onSignOut: () => void;
};

export default function Toolbar({
  zoomPct,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCopy,
  onPaste,
  onStartRectDraw,
  onAddSquare,
  rectDrawActive,
  onAddCircle,
  onAddText,
  onDelete,
  onBringForward,
  onSendBackward,
  onPickImage,
  onTrimImage,
  onKnockColor,
  onToggleMagicErase,
  magicEraseActive,
  onDownloadPng,
  onDownloadJpg,
  onUploadCloud,
  uploadLabel,
  uploadDisabled,
  userEmail,
  onSignOut,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Tools
      </span>
      <button
        type="button"
        onClick={onStartRectDraw}
        className={`rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 ${
          rectDrawActive ? "ring-2 ring-sky-500 ring-offset-1 dark:ring-offset-neutral-950" : ""
        }`}
        title="Click, then drag on the canvas. Hold Shift for a perfect square."
      >
        Rectangle
      </button>
      <button
        type="button"
        onClick={onAddSquare}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Add a perfect square (same width and height)"
      >
        Square
      </button>
      <button
        type="button"
        onClick={onAddCircle}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        Circle
      </button>
      <button
        type="button"
        onClick={onAddText}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Add editable text (double-click to type). Set font, size, and angle in the bar below."
      >
        Text
      </button>
      <button
        type="button"
        onClick={onPickImage}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        Image
      </button>
      <button
        type="button"
        onClick={onTrimImage}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Remove white and transparent margins from the selected image"
      >
        Trim
      </button>
      <button
        type="button"
        onClick={onKnockColor}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Remove the chosen color from the image (magic wand). Set color and range in the bar below."
      >
        Knock
      </button>
      <button
        type="button"
        onClick={onToggleMagicErase}
        className={`rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 ${
          magicEraseActive
            ? "ring-2 ring-sky-500 ring-offset-1 dark:ring-offset-neutral-950"
            : ""
        }`}
        title="Click a filled area on an image to erase it (magic eraser). Uses the Range slider as tolerance."
      >
        Erase
      </button>
      <div className="mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded px-2 py-1 text-sm disabled:opacity-40"
        title="Undo (⌘Z)"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="rounded px-2 py-1 text-sm disabled:opacity-40"
        title="Redo (⌘⇧Z)"
      >
        Redo
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Copy selection (⌘C)"
      >
        Copy
      </button>
      <button
        type="button"
        onClick={onPaste}
        className="rounded px-2 py-1 text-sm text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Paste (⌘V)"
      >
        Paste
      </button>
      <div className="mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
      <button type="button" onClick={onDelete} className="rounded px-2 py-1 text-sm" title="Delete">
        Delete
      </button>
      <button type="button" onClick={onBringForward} className="rounded px-2 py-1 text-sm">
        Up
      </button>
      <button type="button" onClick={onSendBackward} className="rounded px-2 py-1 text-sm">
        Down
      </button>
      <div className="mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
      <button type="button" onClick={onZoomOut} className="rounded px-2 py-1 text-sm">
        −
      </button>
      <span className="min-w-[3rem] text-center text-xs tabular-nums text-neutral-500">
        {zoomPct}%
      </span>
      <button type="button" onClick={onZoomIn} className="rounded px-2 py-1 text-sm">
        +
      </button>
      <button
        type="button"
        onClick={onZoomReset}
        className="rounded px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400"
      >
        Reset zoom
      </button>
      <div className="mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
      <button
        type="button"
        onClick={onDownloadPng}
        className="rounded px-2 py-1 text-sm"
        title="Download PNG (⌘S)"
      >
        PNG
      </button>
      <button type="button" onClick={onDownloadJpg} className="rounded px-2 py-1 text-sm">
        JPG
      </button>
      <button
        type="button"
        onClick={onUploadCloud}
        disabled={uploadDisabled}
        className="rounded bg-neutral-900 px-2 py-1 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {uploadLabel}
      </button>
      <div className="ml-auto flex items-center gap-2 pl-2 text-xs text-neutral-500">
        {userEmail ? (
          <>
            <span className="max-w-[140px] truncate" title={userEmail}>
              {userEmail}
            </span>
            <button type="button" onClick={onSignOut} className="underline">
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login" className="text-neutral-800 underline dark:text-neutral-200">
            Sign in to save
          </Link>
        )}
      </div>
    </div>
  );
}
