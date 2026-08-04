"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "fabric";

type Props = {
  onReady: (canvas: Canvas) => void;
  onCanvasChange: () => void;
  className?: string;
};

export default function EditorCanvas({ onReady, onCanvasChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const onReadyRef = useRef(onReady);
  const onCanvasChangeRef = useRef(onCanvasChange);

  useEffect(() => {
    onReadyRef.current = onReady;
    onCanvasChangeRef.current = onCanvasChange;
  });

  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const canvas = new Canvas(el, {
      width,
      height,
      preserveObjectStacking: true,
      backgroundColor: undefined,
      stopContextMenu: true,
    });

    fabricRef.current = canvas;
    onReadyRef.current(canvas);

    const handleChange = () => onCanvasChangeRef.current();

    canvas.on("object:modified", handleChange);
    canvas.on("object:added", handleChange);
    canvas.on("object:removed", handleChange);

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr || !fabricRef.current) return;
      fabricRef.current.setDimensions({
        width: Math.max(cr.width, 100),
        height: Math.max(cr.height, 100),
      });
      fabricRef.current.requestRenderAll();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      canvas.off("object:modified", handleChange);
      canvas.off("object:added", handleChange);
      canvas.off("object:removed", handleChange);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-full min-h-[400px] w-full ${className ?? ""}`}
    >
      <canvas ref={canvasElRef} className="block h-full w-full" />
    </div>
  );
}
