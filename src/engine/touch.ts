/* Entrada unificada táctil + ratón.
   - Usa Pointer Events si existen; si no (Chromium 37), touch + mouse.
   - Rechazo de palma: solo un puntero activo dibuja; los demás se ignoran.
   - Bloquea scroll/zoom nativos con preventDefault. */

import { Vec2 } from "./types";
import { v } from "./geom";

export interface DrawHandlers {
  onDown: (p: Vec2) => void;
  onMove: (p: Vec2) => void;
  onUp: (p: Vec2) => void;
}

interface MinimalPoint {
  clientX: number;
  clientY: number;
  pointerId?: number;
}

/**
 * Conecta un lienzo para dibujar con el dedo (o el ratón en escritorio).
 *
 * - Usa Pointer Events cuando existen y Touch Events en WebViews antiguos.
 * - Rechazo de palma: mientras un puntero dibuja, los demás se ignoran.
 * - Recalcula el rect en cada `down` (la tableta puede rotar).
 *
 * @returns Función de limpieza: quitar todos los listeners.
 */
export function attachDrawing(el: HTMLElement, handlers: DrawHandlers): () => void {
  var activeId: number | null = null;
  var rect = el.getBoundingClientRect();

  function refreshRect(): void {
    rect = el.getBoundingClientRect();
  }

  function toLocal(e: MinimalPoint): Vec2 {
    return v(e.clientX - rect.left, e.clientY - rect.top);
  }

  // ---------- Pointer Events (navegadores modernos) ----------
  if ((window as any).PointerEvent) {
    var pd = function (e: PointerEvent) {
      if (e.pointerType === "mouse" || e.button === 0 || e.isPrimary) {
        activeId = e.pointerId;
        refreshRect();
        handlers.onDown(toLocal(e));
        if (el.setPointerCapture) {
          try {
            el.setPointerCapture(e.pointerId);
          } catch (err) {
            /* el puntero pudo soltarse antes del capture (WebViews antiguos) */
          }
        }
      }
      e.preventDefault();
    };
    var pm = function (e: PointerEvent) {
      if (e.pointerId === activeId) {
        handlers.onMove(toLocal(e));
        e.preventDefault();
      }
    };
    var pu = function (e: PointerEvent) {
      if (e.pointerId === activeId) {
        activeId = null;
        handlers.onUp(toLocal(e));
        e.preventDefault();
      }
    };
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    el.addEventListener("pointercancel", pu);
    window.addEventListener("pointerup", pu);

    return function detach() {
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      el.removeEventListener("pointercancel", pu);
      window.removeEventListener("pointerup", pu);
    };
  }

  // ---------- Touch + Mouse (Android 5 WebView) ----------
  var onTouchStart = function (e: TouchEvent) {
    var t = e.changedTouches[0];
    if (activeId === null) {
      activeId = 0; // marcador "táctil activo"
      refreshRect();
      handlers.onDown(toLocal(t));
    }
    e.preventDefault();
  };
  var onTouchMove = function (e: TouchEvent) {
    if (activeId !== null) {
      var t = e.changedTouches[0];
      handlers.onMove(toLocal(t));
    }
    e.preventDefault();
  };
  var onTouchEnd = function (e: TouchEvent) {
    if (activeId !== null) {
      var t = e.changedTouches[0];
      activeId = null;
      handlers.onUp(toLocal(t));
    }
    e.preventDefault();
  };

  var onMouseDown = function (e: MouseEvent) {
    if (activeId === null) {
      activeId = -1;
      refreshRect();
      handlers.onDown(toLocal(e));
    }
    e.preventDefault();
  };
  var onMouseMove = function (e: MouseEvent) {
    if (activeId === -1) handlers.onMove(toLocal(e));
  };
  var onMouseUp = function (e: MouseEvent) {
    if (activeId === -1) {
      activeId = null;
      handlers.onUp(toLocal(e));
    }
  };

  el.addEventListener("touchstart", onTouchStart, { passive: false } as any);
  el.addEventListener("touchmove", onTouchMove, { passive: false } as any);
  el.addEventListener("touchend", onTouchEnd, { passive: false } as any);
  el.addEventListener("touchcancel", onTouchEnd, { passive: false } as any);
  el.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  return function detach() {
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchend", onTouchEnd);
    el.removeEventListener("touchcancel", onTouchEnd);
    el.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
}

/**
 * Botón de "mantener pulsado" N ms (puerta parental, FDD UX §3).
 *
 * @param onTick  Progreso 0..1 mientras se mantiene (para la barra de relleno).
 * @param onDone  Se dispara solo si se completa el tiempo; soltar antes cancela.
 * @returns Función de limpieza.
 */
export function attachHold(
  el: HTMLElement,
  ms: number,
  onTick: (fraction: number) => void,
  onDone: () => void
): () => void {
  var timer: any = null;
  var start = 0;
  var raf = 0;

  function stop(completed: boolean): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    onTick(0);
    if (completed) onDone();
  }

  function tick(): void {
    var frac = Math.min(1, (Date.now() - start) / ms);
    onTick(frac);
    if (frac >= 1) {
      stop(true);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function begin(e: Event): void {
    if (timer || raf) return;
    e.preventDefault();
    start = Date.now();
    raf = requestAnimationFrame(tick);
    timer = setTimeout(function () {
      /* respaldo si rAF falla */
      stop(true);
    }, ms + 50);
  }

  function cancel(): void {
    if (timer || raf) stop(false);
  }

  el.addEventListener("touchstart", begin, { passive: false } as any);
  el.addEventListener("mousedown", begin);
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchcancel", cancel);
  el.addEventListener("touchleave", cancel);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);

  return function detach() {
    cancel();
    el.removeEventListener("touchstart", begin);
    el.removeEventListener("mousedown", begin);
    el.removeEventListener("touchend", cancel);
    el.removeEventListener("touchcancel", cancel);
    el.removeEventListener("touchleave", cancel);
    el.removeEventListener("mouseup", cancel);
    el.removeEventListener("mouseleave", cancel);
  };
}
