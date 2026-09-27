import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

type Position = { left: number; top: number };

/** Keep movable floating controls inside the viewport, including after resizing. */
export function useFloatingDrag(enabled = true) {
  const ref = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  function clamp(next: Position): Position {
    const rect = ref.current?.getBoundingClientRect();
    return {
      left: Math.max(8, Math.min(next.left, window.innerWidth - (rect?.width ?? 0) - 8)),
      top: Math.max(8, Math.min(next.top, window.innerHeight - (rect?.height ?? 0) - 8)),
    };
  }

  useEffect(() => {
    if (!enabled) return;
    const fit = () => setPosition(previous => {
      if (!previous) return previous;
      const next = clamp(previous);
      return next.left === previous.left && next.top === previous.top ? previous : next;
    });
    window.addEventListener('resize', fit);
    const observer = new ResizeObserver(fit);
    if (ref.current) observer.observe(ref.current);
    fit();
    return () => { window.removeEventListener('resize', fit); observer.disconnect(); };
  }, [enabled]);

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || event.button !== 0 || !event.isPrimary) return;
      const control = (event.target as HTMLElement).closest('button, input, select, a');
      if (control && control !== event.currentTarget) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      suppressClick.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 5) return;
      start.moved = true;
      suppressClick.current = true;
      setPosition(clamp({ left: start.left + dx, top: start.top + dy }));
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel() { drag.current = null; suppressClick.current = false; },
    onLostPointerCapture() { drag.current = null; },
    onClickCapture(event: React.MouseEvent<HTMLElement>) {
      if (!suppressClick.current || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (!enabled || event.target !== event.currentTarget) return;
      const offset = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
      const rect = ref.current?.getBoundingClientRect();
      if (!offset || !rect) return;
      event.preventDefault();
      setPosition(clamp({ left: rect.left + offset[0], top: rect.top + offset[1] }));
    },
  };
  const style: CSSProperties | undefined = enabled && position ? { ...position, right: 'auto', bottom: 'auto', transform: 'none' } : undefined;
  return { ref, style, handlers };
}
