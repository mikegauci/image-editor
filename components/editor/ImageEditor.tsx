"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  IText,
  Point,
  Rect,
  util as fabricUtil,
} from "fabric";
import { pasteSerializedOntoCanvas } from "@/lib/fabricClipboard";
import { exportCanvasRegionToBlob } from "@/lib/canvasExport";
import {
  loadCanvasState,
  saveCanvasState,
  serializeObjectsForClipboard,
} from "@/lib/canvasPersist";
import { applyITextFontProps } from "@/lib/fabricIText";
import {
  DEFAULT_EDITOR_FONT_FAMILY,
  EDITOR_FONTS,
  ensureEditorFontLoaded,
  warmupEditorFonts,
} from "@/lib/editorFonts";
import { removeColorFromImageElementWithHex } from "@/lib/imageRemoveColor";
import { magicEraseFromImageElement } from "@/lib/imageMagicErase";
import { trimImageElementToDataUrl } from "@/lib/imageTrim";
import { createClient } from "@/lib/supabase/client";
import { uploadExport } from "@/app/actions/upload-export";
import { useEditorHistory } from "@/hooks/useEditorHistory";
import EditorCanvas from "./EditorCanvas";
import ColorBar from "./ColorBar";
import Toolbar from "./Toolbar";

function getFillString(obj: FabricObject): string {
  const f = obj.fill;
  if (typeof f === "string") return f;
  return "#3b82f6";
}

function getStrokeString(obj: FabricObject): string {
  const s = obj.stroke;
  if (typeof s === "string") return s;
  return "#1e293b";
}

export default function ImageEditor() {
  const canvasRef = useRef<Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commitRef = useRef<() => void>(() => {});
  const skipHistoryCommitRef = useRef(false);
  const styleRef = useRef({
    fill: "#3b82f6",
    stroke: "#1e293b",
    strokeWidth: 2,
    opacity: 1,
  });
  const rectDrawModeRef = useRef(false);
  const magicEraseModeRef = useRef(false);
  const magicEraseToleranceRef = useRef(40);
  const magicEraseBusyRef = useRef(false);
  const isDrawingRectRef = useRef(false);
  const previewRectRef = useRef<Rect | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const hydratingRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Serialized selection for copy/paste (same-tab) */
  const copyBufferRef = useRef<Record<string, unknown>[] | null>(null);
  /** Increments each paste so duplicates stack diagonally */
  const pasteGenerationRef = useRef(0);

  const [fill, setFill] = useState("#3b82f6");
  const [stroke, setStroke] = useState("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState(2);
  /** 0–100, maps to Fabric `opacity` 0–1 */
  const [opacity, setOpacity] = useState(100);
  const [zoomPct, setZoomPct] = useState(100);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading">("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);
  const [rectDrawMode, setRectDrawMode] = useState(false);
  const [magicEraseMode, setMagicEraseMode] = useState(false);
  const [autoTrimOnImport, setAutoTrimOnImport] = useState(true);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [textFontFamily, setTextFontFamily] = useState(DEFAULT_EDITOR_FONT_FAMILY);
  const [textFontSize, setTextFontSize] = useState(48);
  const [textAngle, setTextAngle] = useState(0);
  const [selectionIsImage, setSelectionIsImage] = useState(false);
  const [knockTargetColor, setKnockTargetColor] = useState("#ffffff");
  const [knockTolerance, setKnockTolerance] = useState(40);

  const { commit, initHistory, undo, redo, canUndo, canRedo } =
    useEditorHistory(canvasRef);

  commitRef.current = commit;

  useEffect(() => {
    styleRef.current = {
      fill,
      stroke,
      strokeWidth,
      opacity: opacity / 100,
    };
  }, [fill, stroke, strokeWidth, opacity]);

  useEffect(() => {
    rectDrawModeRef.current = rectDrawMode;
  }, [rectDrawMode]);

  useEffect(() => {
    magicEraseModeRef.current = magicEraseMode;
  }, [magicEraseMode]);

  useEffect(() => {
    magicEraseToleranceRef.current = knockTolerance;
  }, [knockTolerance]);

  const syncColorsFromSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (objs.length === 0) {
      setSelectionIsImage(false);
      return;
    }
    setSelectionIsImage(objs.length === 1 && objs[0] instanceof FabricImage);
    const obj = objs[0];
    setFill(getFillString(obj));
    setStroke(getStrokeString(obj));
    setStrokeWidth(typeof obj.strokeWidth === "number" ? obj.strokeWidth : 2);
    setOpacity(Math.round((obj.opacity ?? 1) * 100));
    if (obj instanceof IText) {
      const fam =
        typeof obj.fontFamily === "string" ? obj.fontFamily : DEFAULT_EDITOR_FONT_FAMILY;
      const known = EDITOR_FONTS.some((f) => f.family === fam);
      setTextFontFamily(known ? fam : DEFAULT_EDITOR_FONT_FAMILY);
      setTextFontSize(typeof obj.fontSize === "number" ? obj.fontSize : 48);
      setTextAngle(typeof obj.angle === "number" ? Math.round(obj.angle) : 0);
    }
  }, []);

  const applyColorsToSelection = useCallback(
    (next: { fill?: string; stroke?: string; strokeWidth?: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objs = canvas.getActiveObjects();
      if (objs.length === 0) return;
      objs.forEach((obj) => {
        if (next.fill !== undefined) obj.set("fill", next.fill);
        if (next.stroke !== undefined) obj.set("stroke", next.stroke);
        if (next.strokeWidth !== undefined) obj.set("strokeWidth", next.strokeWidth);
      });
      canvas.requestRenderAll();
      commit();
    },
    [commit],
  );

  const handleOpacityChange = useCallback(
    (pct: number) => {
      setOpacity(pct);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objs = canvas.getActiveObjects();
      if (objs.length === 0) return;
      const v = pct / 100;
      objs.forEach((o) => o.set("opacity", v));
      canvas.requestRenderAll();
      commit();
    },
    [commit],
  );

  const handleTextFontFamilyChange = useCallback(
    async (family: string) => {
      setTextFontFamily(family);
      await ensureEditorFontLoaded(family, textFontSize);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objs = canvas
        .getActiveObjects()
        .filter((o): o is IText => o instanceof IText);
      if (objs.length === 0) return;
      objs.forEach((t) => applyITextFontProps(t, { fontFamily: family }));
      canvas.requestRenderAll();
      requestAnimationFrame(() => canvas.requestRenderAll());
      commit();
    },
    [textFontSize, commit],
  );

  const handleTextFontSizeChange = useCallback(
    (size: number) => {
      setTextFontSize(size);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objs = canvas
        .getActiveObjects()
        .filter((o): o is IText => o instanceof IText);
      if (objs.length === 0) return;
      objs.forEach((t) => applyITextFontProps(t, { fontSize: size }));
      canvas.requestRenderAll();
      commit();
    },
    [commit],
  );

  const handleTextAngleChange = useCallback(
    (deg: number) => {
      setTextAngle(deg);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objs = canvas
        .getActiveObjects()
        .filter((o): o is IText => o instanceof IText);
      if (objs.length === 0) return;
      objs.forEach((t) => t.set("angle", deg));
      canvas.requestRenderAll();
      commit();
    },
    [commit],
  );

  const schedulePersist = useCallback(() => {
    if (hydratingRef.current) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const c = canvasRef.current;
      if (c) saveCanvasState(c);
    }, 450);
  }, []);

  const onCanvasReady = useCallback(
    async (canvas: Canvas) => {
      canvasRef.current = canvas;
      setFabricCanvas(canvas);
      hydratingRef.current = true;
      try {
        await warmupEditorFonts();
        await loadCanvasState(canvas);
      } catch {
        /* ignore corrupt storage */
      } finally {
        hydratingRef.current = false;
      }
      initHistory();
    },
    [initHistory],
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!fabricCanvas) return;

    const onWheel = (opt: { e: WheelEvent; viewportPoint: Point }) => {
      const e = opt.e;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** e.deltaY;
      zoom = Math.min(20, Math.max(0.05, zoom));
      fabricCanvas.zoomToPoint(opt.viewportPoint, zoom);
      setZoomPct(Math.round(zoom * 100));
    };

    fabricCanvas.on("mouse:wheel", onWheel);
    fabricCanvas.on("selection:created", syncColorsFromSelection);
    fabricCanvas.on("selection:updated", syncColorsFromSelection);
    fabricCanvas.on("selection:cleared", syncColorsFromSelection);

    return () => {
      fabricCanvas.off("mouse:wheel", onWheel);
      fabricCanvas.off("selection:created", syncColorsFromSelection);
      fabricCanvas.off("selection:updated", syncColorsFromSelection);
      fabricCanvas.off("selection:cleared", syncColorsFromSelection);
    };
  }, [fabricCanvas, syncColorsFromSelection]);

  const onCanvasChange = useCallback(() => {
    if (hydratingRef.current || skipHistoryCommitRef.current) return;
    commit();
    schedulePersist();
  }, [commit, schedulePersist]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const cancelRectDraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (previewRectRef.current && canvas) {
      skipHistoryCommitRef.current = true;
      canvas.remove(previewRectRef.current);
      skipHistoryCommitRef.current = false;
      canvas.requestRenderAll();
    }
    previewRectRef.current = null;
    drawStartRef.current = null;
    isDrawingRectRef.current = false;
    setRectDrawMode(false);
  }, []);

  const startRectDraw = useCallback(() => {
    if (rectDrawMode) {
      cancelRectDraw();
    } else {
      setMagicEraseMode(false);
      setRectDrawMode(true);
    }
  }, [rectDrawMode, cancelRectDraw]);

  const toggleMagicErase = useCallback(() => {
    setMagicEraseMode((prev) => {
      const next = !prev;
      if (next) {
        cancelRectDraw();
      }
      return next;
    });
  }, [cancelRectDraw]);

  const addSquare = useCallback(() => {
    cancelRectDraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const side = 120;
    const rect = new Rect({
      width: side,
      height: side,
      fill,
      stroke,
      strokeWidth,
      opacity: opacity / 100,
      originX: "center",
      originY: "center",
      left: w / 2,
      top: h / 2,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
    commit();
  }, [fill, stroke, strokeWidth, opacity, commit, cancelRectDraw]);

  useEffect(() => {
    if (!fabricCanvas) return;
    if (magicEraseMode) {
      fabricCanvas.defaultCursor = "crosshair";
      fabricCanvas.hoverCursor = "crosshair";
    } else if (rectDrawMode) {
      fabricCanvas.defaultCursor = "crosshair";
      fabricCanvas.hoverCursor = "move";
    } else {
      fabricCanvas.defaultCursor = "default";
      fabricCanvas.hoverCursor = "move";
    }
  }, [fabricCanvas, rectDrawMode, magicEraseMode]);

  // In magic-erase mode, lock object movement so clicks erase without dragging.
  useEffect(() => {
    if (!fabricCanvas) return;
    if (!magicEraseMode) return;
    const prev = fabricCanvas.getObjects().map((o) => ({
      obj: o,
      selectable: o.selectable,
    }));
    prev.forEach(({ obj }) => {
      obj.set("selectable", false);
    });
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
    return () => {
      prev.forEach(({ obj, selectable }) => {
        obj.set("selectable", selectable);
      });
      fabricCanvas.requestRenderAll();
    };
  }, [fabricCanvas, magicEraseMode]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const canvas = fabricCanvas;

    const runMagicErase = async (target: FabricImage, scenePoint: Point) => {
      const el = target.getElement() as HTMLImageElement | undefined;
      if (!el) return;

      // Scene → object-local plane (center-origin, unscaled/unrotated),
      // then offset by half size to get top-left pixel coords.
      const local = fabricUtil.sendPointToPlane(
        scenePoint,
        undefined,
        target.calcTransformMatrix(),
      );
      const objW = target.width || 0;
      const objH = target.height || 0;
      if (!objW || !objH) return;
      const localX = local.x + objW / 2;
      const localY = local.y + objH / 2;

      // Object.width ~ natural image width, but rescale defensively.
      const naturalW = el.naturalWidth;
      const naturalH = el.naturalHeight;
      if (!naturalW || !naturalH) return;
      const px = (localX / objW) * naturalW;
      const py = (localY / objH) * naturalH;

      const next = magicEraseFromImageElement(el, px, py, {
        tolerance: magicEraseToleranceRef.current,
      });
      if (!next) return;

      const newImg = await FabricImage.fromURL(next, {
        crossOrigin: "anonymous",
      });
      newImg.set({
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
        flipX: target.flipX,
        flipY: target.flipY,
        opacity: target.opacity,
        skewX: target.skewX,
        skewY: target.skewY,
        originX: target.originX,
        originY: target.originY,
        selectable: target.selectable,
      });
      skipHistoryCommitRef.current = true;
      canvas.remove(target);
      canvas.add(newImg);
      if (newImg.selectable) {
        canvas.setActiveObject(newImg);
      }
      skipHistoryCommitRef.current = false;
      canvas.requestRenderAll();
      commitRef.current();
    };

    const finishRectDraw = () => {
      if (!isDrawingRectRef.current || !previewRectRef.current) return;
      const r = previewRectRef.current;
      const tooSmall = Math.max(r.width ?? 0, r.height ?? 0) < 2;
      if (tooSmall) {
        skipHistoryCommitRef.current = true;
        canvas.remove(r);
        skipHistoryCommitRef.current = false;
      } else {
        r.set({ selectable: true, evented: true, hasControls: true });
        canvas.setActiveObject(r);
        commitRef.current();
      }
      previewRectRef.current = null;
      drawStartRef.current = null;
      isDrawingRectRef.current = false;
      setRectDrawMode(false);
      canvas.requestRenderAll();
    };

    const onDown = (opt: {
      e: Event;
      target?: FabricObject | null;
      scenePoint: Point;
    }) => {
      if (magicEraseModeRef.current) {
        if (magicEraseBusyRef.current) return;
        const target = opt.target;
        if (!(target instanceof FabricImage)) return;
        magicEraseBusyRef.current = true;
        void runMagicErase(target, opt.scenePoint).finally(() => {
          magicEraseBusyRef.current = false;
        });
        return;
      }
      if (!rectDrawModeRef.current || isDrawingRectRef.current) return;
      if (opt.target) return;
      const p = opt.scenePoint;
      isDrawingRectRef.current = true;
      drawStartRef.current = p;
      skipHistoryCommitRef.current = true;
      const r = new Rect({
        left: p.x,
        top: p.y,
        width: 0,
        height: 0,
        fill: styleRef.current.fill,
        stroke: styleRef.current.stroke,
        strokeWidth: styleRef.current.strokeWidth,
        opacity: styleRef.current.opacity,
        selectable: false,
        evented: false,
        hasControls: false,
      });
      previewRectRef.current = r;
      canvas.add(r);
      skipHistoryCommitRef.current = false;
      canvas.requestRenderAll();
    };

    const onMove = (opt: { e: Event; scenePoint: Point }) => {
      if (!isDrawingRectRef.current || !previewRectRef.current || !drawStartRef.current)
        return;
      const e = opt.e;
      const p = opt.scenePoint;
      const start = drawStartRef.current;
      let left: number;
      let top: number;
      let width: number;
      let height: number;

      const shiftHeld = "shiftKey" in e && e.shiftKey;
      if (shiftHeld) {
        const dx = p.x - start.x;
        const dy = p.y - start.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        if (dx >= 0 && dy >= 0) {
          left = start.x;
          top = start.y;
        } else if (dx < 0 && dy >= 0) {
          left = start.x - side;
          top = start.y;
        } else if (dx >= 0 && dy < 0) {
          left = start.x;
          top = start.y - side;
        } else {
          left = start.x - side;
          top = start.y - side;
        }
        width = side;
        height = side;
      } else {
        width = Math.abs(p.x - start.x);
        height = Math.abs(p.y - start.y);
        left = Math.min(p.x, start.x);
        top = Math.min(p.y, start.y);
      }

      previewRectRef.current.set({ left, top, width, height });
      canvas.requestRenderAll();
    };

    canvas.on("mouse:down", onDown);
    canvas.on("mouse:move", onMove);
    canvas.on("mouse:up", finishRectDraw);
    window.addEventListener("mouseup", finishRectDraw);

    return () => {
      canvas.off("mouse:down", onDown);
      canvas.off("mouse:move", onMove);
      canvas.off("mouse:up", finishRectDraw);
      window.removeEventListener("mouseup", finishRectDraw);
    };
  }, [fabricCanvas]);

  const addCircle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const circle = new Circle({
      radius: 56,
      fill,
      stroke,
      strokeWidth,
      opacity: opacity / 100,
      originX: "center",
      originY: "center",
      left: w / 2,
      top: h / 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
    commit();
  }, [fill, stroke, strokeWidth, opacity, commit]);

  const addText = useCallback(async () => {
    cancelRectDraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    await ensureEditorFontLoaded(textFontFamily, textFontSize);
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const text = new IText("Text", {
      left: w / 2,
      top: h / 2,
      originX: "center",
      originY: "center",
      fontFamily: textFontFamily,
      fontSize: textFontSize,
      angle: textAngle,
      fill,
      stroke,
      strokeWidth,
      opacity: opacity / 100,
      objectCaching: false,
    });
    applyITextFontProps(text, {
      fontFamily: textFontFamily,
      fontSize: textFontSize,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    commit();
  }, [
    cancelRectDraw,
    textFontFamily,
    textFontSize,
    textAngle,
    fill,
    stroke,
    strokeWidth,
    opacity,
    commit,
  ]);

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    skipHistoryCommitRef.current = true;
    active.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    skipHistoryCommitRef.current = false;
    canvas.requestRenderAll();
    commit();
  }, [commit]);

  const copySelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (objs.length === 0) return;
    copyBufferRef.current = serializeObjectsForClipboard(objs);
    pasteGenerationRef.current = 0;
  }, []);

  const pasteSelection = useCallback(async () => {
    const canvas = canvasRef.current;
    const buf = copyBufferRef.current;
    if (!canvas || !buf?.length) return;
    pasteGenerationRef.current += 1;
    skipHistoryCommitRef.current = true;
    try {
      await pasteSerializedOntoCanvas(canvas, buf, pasteGenerationRef.current);
    } finally {
      skipHistoryCommitRef.current = false;
    }
    commit();
    schedulePersist();
  }, [commit, schedulePersist]);

  const bringForward = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringObjectForward(obj);
    canvas.requestRenderAll();
    commit();
  }, [commit]);

  const sendBackward = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendObjectBackwards(obj);
    canvas.requestRenderAll();
    commit();
  }, [commit]);

  const setZoom = useCallback((next: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = Math.min(20, Math.max(0.05, next));
    canvas.setZoom(z);
    canvas.requestRenderAll();
    setZoomPct(Math.round(z * 100));
  }, []);

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setZoom(canvas.getZoom() * 1.15);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setZoom(canvas.getZoom() / 1.15);
  }, [setZoom]);

  const zoomReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  }, [setZoom]);

  const pickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const addImageFromFile = useCallback(
    async (
      file: File,
      scenePoint?: { x: number; y: number },
      stackIndex = 0,
    ) => {
      if (!file.type.startsWith("image/")) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = URL.createObjectURL(file);
      try {
        const htmlImg = new Image();
        htmlImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          htmlImg.onload = () => resolve();
          htmlImg.onerror = () => reject(new Error("Image load failed"));
          htmlImg.src = url;
        });

        let fabricSrc: string = url;
        if (autoTrimOnImport) {
          const trimmed = trimImageElementToDataUrl(htmlImg);
          if (trimmed) fabricSrc = trimmed;
        }

        const img = await FabricImage.fromURL(fabricSrc, {
          crossOrigin: "anonymous",
        });
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();
        const iw = img.width || img.getScaledWidth() || 1;
        const ih = img.height || img.getScaledHeight() || 1;
        const scale = Math.min(cw / iw, ch / ih, 1) * 0.9;
        img.scale(scale);
        const offset = stackIndex * 20;
        const left = (scenePoint?.x ?? cw / 2) + offset;
        const top = (scenePoint?.y ?? ch / 2) + offset;
        img.set({
          originX: "center",
          originY: "center",
          left,
          top,
          opacity: opacity / 100,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        commit();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [commit, autoTrimOnImport, opacity],
  );

  const trimSelectedImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!(obj instanceof FabricImage)) {
      setUploadMessage("Select an image, then click Trim.");
      return;
    }
    const el = obj.getElement() as HTMLImageElement | undefined;
    if (!el) return;
    const trimmed = trimImageElementToDataUrl(el);
    if (!trimmed) {
      setUploadMessage("Nothing to trim — edges are already tight or image is unreadable.");
      return;
    }
    const newImg = await FabricImage.fromURL(trimmed, {
      crossOrigin: "anonymous",
    });
    newImg.set({
      left: obj.left,
      top: obj.top,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      flipX: obj.flipX,
      flipY: obj.flipY,
      opacity: obj.opacity,
      skewX: obj.skewX,
      skewY: obj.skewY,
      originX: obj.originX,
      originY: obj.originY,
    });
    skipHistoryCommitRef.current = true;
    canvas.remove(obj);
    canvas.add(newImg);
    canvas.setActiveObject(newImg);
    skipHistoryCommitRef.current = false;
    canvas.requestRenderAll();
    commit();
  }, [commit]);

  const knockColorFromSelectedImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (objs.length !== 1 || !(objs[0] instanceof FabricImage)) {
      setUploadMessage("Select a single image, then click Knock.");
      return;
    }
    const obj = objs[0];
    const el = obj.getElement() as HTMLImageElement | undefined;
    if (!el) return;
    const next = removeColorFromImageElementWithHex(
      el,
      knockTargetColor,
      knockTolerance,
    );
    if (!next) {
      setUploadMessage(
        "Could not edit pixels (try re-importing the image).",
      );
      return;
    }
    const newImg = await FabricImage.fromURL(next, {
      crossOrigin: "anonymous",
    });
    newImg.set({
      left: obj.left,
      top: obj.top,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      flipX: obj.flipX,
      flipY: obj.flipY,
      opacity: obj.opacity,
      skewX: obj.skewX,
      skewY: obj.skewY,
      originX: obj.originX,
      originY: obj.originY,
    });
    skipHistoryCommitRef.current = true;
    canvas.remove(obj);
    canvas.add(newImg);
    canvas.setActiveObject(newImg);
    skipHistoryCommitRef.current = false;
    canvas.requestRenderAll();
    commit();
  }, [commit, knockTargetColor, knockTolerance]);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      await addImageFromFile(file);
    },
    [addImageFromFile],
  );

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.dataTransfer.dropEffect = "copy";
    setFileDragActive(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setFileDragActive(false);
  }, []);

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setFileDragActive(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const files = [...e.dataTransfer.files].filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      const scenePoint = canvas.getScenePoint(e.nativeEvent);
      for (let i = 0; i < files.length; i++) {
        await addImageFromFile(files[i], scenePoint, i);
      }
    },
    [addImageFromFile],
  );

  const downloadPng = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await exportCanvasRegionToBlob(canvas, "png");
    if (!blob) {
      setUploadMessage("Nothing to export — add shapes or an image first.");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `export-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const downloadJpg = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await exportCanvasRegionToBlob(canvas, "jpeg");
    if (!blob) {
      setUploadMessage("Nothing to export — add shapes or an image first.");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `export-${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const saveToCloud = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploadState("uploading");
    setUploadMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadMessage("Sign in required.");
        return;
      }

      const pngBlob = await exportCanvasRegionToBlob(canvas, "png");
      if (!pngBlob) {
        setUploadMessage("Nothing to export — add shapes or an image first.");
        return;
      }

      const fd = new FormData();
      fd.append(
        "file",
        new File([pngBlob], "export.png", { type: "image/png" }),
      );
      const result = await uploadExport(fd);
      if (result.ok) {
        setUploadMessage(`Saved: ${result.path}`);
      } else {
        setUploadMessage(result.error);
      }
    } finally {
      setUploadState("idle");
    }
  }, []);

  const saveJpgToCloud = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploadState("uploading");
    setUploadMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadMessage("Sign in required.");
        return;
      }

      const jpgBlob = await exportCanvasRegionToBlob(canvas, "jpeg");
      if (!jpgBlob) {
        setUploadMessage("Nothing to export — add shapes or an image first.");
        return;
      }

      const fd = new FormData();
      fd.append(
        "file",
        new File([jpgBlob], "export.jpg", { type: "image/jpeg" }),
      );
      const result = await uploadExport(fd);
      if (result.ok) {
        setUploadMessage(`Saved: ${result.path}`);
      } else {
        setUploadMessage(result.error);
      }
    } finally {
      setUploadState("idle");
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void redo();
        else void undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        void redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
        return;
      }
      if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void pasteSelection();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void downloadPng();
        return;
      }
      if (e.key === "Escape") {
        cancelRectDraw();
        setMagicEraseMode(false);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    downloadPng,
    deleteSelected,
    cancelRectDraw,
    copySelection,
    pasteSelection,
  ]);

  return (
    <div className="flex h-[100dvh] flex-col bg-neutral-100 dark:bg-neutral-950">
      <Toolbar
        zoomPct={zoomPct}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        canUndo={canUndo}
        canRedo={canRedo}
        onCopy={copySelection}
        onPaste={() => void pasteSelection()}
        onStartRectDraw={startRectDraw}
        onAddSquare={addSquare}
        rectDrawActive={rectDrawMode}
        onAddCircle={addCircle}
        onAddText={() => void addText()}
        onDelete={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onPickImage={pickImage}
        onTrimImage={() => void trimSelectedImage()}
        onKnockColor={() => void knockColorFromSelectedImage()}
        onToggleMagicErase={toggleMagicErase}
        magicEraseActive={magicEraseMode}
        onDownloadPng={downloadPng}
        onDownloadJpg={downloadJpg}
        onUploadCloud={saveToCloud}
        uploadLabel={
          uploadState === "uploading" ? "Saving…" : "Save PNG to cloud"
        }
        uploadDisabled={uploadState === "uploading"}
        userEmail={userEmail}
        onSignOut={signOut}
      />
      <ColorBar
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        autoTrimOnImport={autoTrimOnImport}
        onAutoTrimOnImportChange={setAutoTrimOnImport}
        onFillChange={(v) => {
          setFill(v);
          applyColorsToSelection({ fill: v });
        }}
        onStrokeChange={(v) => {
          setStroke(v);
          applyColorsToSelection({ stroke: v });
        }}
        onStrokeWidthChange={(v) => {
          setStrokeWidth(v);
          applyColorsToSelection({ strokeWidth: v });
        }}
        onOpacityChange={handleOpacityChange}
        editorFonts={EDITOR_FONTS}
        textFontFamily={textFontFamily}
        textFontSize={textFontSize}
        textAngle={textAngle}
        onTextFontFamilyChange={(v) => void handleTextFontFamilyChange(v)}
        onTextFontSizeChange={handleTextFontSizeChange}
        onTextAngleChange={handleTextAngleChange}
        imageControlsVisible={selectionIsImage}
        knockTargetColor={knockTargetColor}
        onKnockTargetColorChange={setKnockTargetColor}
        knockTolerance={knockTolerance}
        onKnockToleranceChange={setKnockTolerance}
      />
      {uploadMessage && (
        <p className="border-b border-neutral-200 bg-amber-50 px-3 py-1 text-xs text-amber-900 dark:border-neutral-800 dark:bg-amber-950/40 dark:text-amber-100">
          {uploadMessage}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <div className="relative min-h-0 flex-1 p-2">
        <div
          className={`checkerboard relative h-full overflow-hidden rounded-lg border shadow-inner transition-colors ${
            fileDragActive
              ? "border-sky-500 ring-2 ring-sky-400/60 dark:border-sky-400"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
          title="Drop images here or use the Image button"
          onDragLeave={handleFileDragLeave}
          onDragOver={handleFileDragOver}
          onDrop={handleFileDrop}
        >
          {fileDragActive && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-sky-500/10 dark:bg-sky-400/10">
              <span className="rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-neutral-800 shadow dark:bg-neutral-900/90 dark:text-neutral-100">
                Drop images to add
              </span>
            </div>
          )}
          <EditorCanvas
            onReady={onCanvasReady}
            onCanvasChange={onCanvasChange}
            className="min-h-[320px]"
          />
        </div>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Tip: <strong className="font-medium">Copy</strong> / <strong className="font-medium">Paste</strong> (or ⌘C / ⌘V) duplicates the current selection on the canvas.{" "}
          <strong className="font-medium">Text</strong> adds editable text — set font, size, and angle in the bar above, then double-click the text to type.{" "}
          <strong className="font-medium">Trim</strong> crops away empty borders;{" "}
          <strong className="font-medium">Knock</strong> removes a chosen color across the
          whole image (set white + range in the bar below), like a magic wand.{" "}
          <strong className="font-medium">Erase</strong> turns into a click-to-erase bucket — click a filled area on an image to
          clear the connected region (uses the Range tolerance). New uploads can auto-trim via the checkbox above.{" "}
          <strong className="font-medium">Drag and drop</strong> image files onto the canvas, or use the Image button. Choose{" "}
          <strong className="font-medium">Rectangle</strong>, then drag on the canvas (hold{" "}
          <kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-800">Shift</kbd> for a perfect square). Hold{" "}
          <kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-800">⌘</kbd> and scroll to zoom. Exports are cropped to
          content; JPG flattens transparency onto white.
        </p>
        <div className="mt-1 flex justify-center gap-2 text-xs">
          <button
            type="button"
            className="text-neutral-600 underline dark:text-neutral-400"
            onClick={() => void saveJpgToCloud()}
            disabled={uploadState === "uploading"}
          >
            Save JPEG to cloud instead
          </button>
        </div>
      </div>
    </div>
  );
}
