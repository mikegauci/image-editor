"use client";

import type { Canvas } from "fabric";
import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

export function useEditorHistory(canvasRef: React.RefObject<Canvas | null>) {
  const history = useRef<string[]>([]);
  const index = useRef(-1);
  const isRestoring = useRef(false); // skip commits while undo/redo loads JSON

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(index.current > 0);
    setCanRedo(index.current < history.current.length - 1);
  }, []);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRestoring.current) return;
    const json = JSON.stringify(canvas.toJSON());
    // Skip no-op duplicates so one user action == one undo step. Without this,
    // an action's own `object:added/removed` event and its explicit commit
    // record the same state twice, making the first undo appear to do nothing.
    if (json === history.current[index.current]) return;
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(json);
    while (history.current.length > MAX_HISTORY) {
      history.current.shift();
    }
    index.current = history.current.length - 1;
    updateFlags();
  }, [canvasRef, updateFlags]);

  const initHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    history.current = [json];
    index.current = 0;
    updateFlags();
  }, [canvasRef, updateFlags]);

  const undo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || index.current <= 0) return;
    isRestoring.current = true;
    index.current--;
    const json = history.current[index.current];
    await canvas.loadFromJSON(JSON.parse(json));
    canvas.requestRenderAll();
    isRestoring.current = false;
    updateFlags();
  }, [canvasRef, updateFlags]);

  const redo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || index.current >= history.current.length - 1) return;
    isRestoring.current = true;
    index.current++;
    const json = history.current[index.current];
    await canvas.loadFromJSON(JSON.parse(json));
    canvas.requestRenderAll();
    isRestoring.current = false;
    updateFlags();
  }, [canvasRef, updateFlags]);

  return {
    commit,
    initHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
