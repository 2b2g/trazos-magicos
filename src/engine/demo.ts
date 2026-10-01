/* Animación de demostración: recorre los trazos en orden con un
   "lápiz mágico". El progreso se calcula por tiempo (frame-safe). */

import { Vec2 } from "./types";
import { pathLength } from "./sampling";

export interface DemoOptions {
  /** Velocidad en px/seg (coordenadas de lienzo). */
  pxPerSec?: number;
  /** Pausa entre trazos en ms. */
  gapMs?: number;
  onProgress: (fractions: number[]) => void;
  onDone: () => void;
}

export interface DemoHandle {
  cancel: () => void;
}

/**
 * Anima el recorrido de demostración: el "lápiz mágico" recorre cada
 * trazo en orden (FDD §13). El progreso se calcula por tiempo, así que
 * es estable aunque el dispositivo pierda frames.
 *
 * @param paths  Trazos ideales ya muestreados en coordenadas de lienzo.
 * @returns      Handle con `cancel()` para cortar la animación.
 */
export function playDemo(paths: Vec2[][], opts: DemoOptions): DemoHandle {
  var pxPerSec = opts.pxPerSec || 260;
  var gapMs = opts.gapMs === undefined ? 420 : opts.gapMs;

  var lens: number[] = [];
  for (var i = 0; i < paths.length; i++) lens.push(Math.max(1, pathLength(paths[i])));

  var fractions: number[] = [];
  for (i = 0; i < paths.length; i++) fractions.push(-1);

  var idx = 0;
  var phase: "stroke" | "gap" = "stroke";
  var phaseStart = 0;
  var raf = 0;
  var running = true;

  function finish(): void {
    running = false;
    opts.onDone();
  }

  function step(now: number): void {
    if (!running) return;
    if (idx >= paths.length) {
      finish();
      return;
    }
    if (phase === "stroke") {
      var dur = (lens[idx] / pxPerSec) * 1000;
      var t = (now - phaseStart) / dur;
      fractions[idx] = t >= 1 ? 1 : t;
      opts.onProgress(fractions.slice());
      if (t >= 1) {
        phase = "gap";
        phaseStart = now;
      }
    } else {
      if (now - phaseStart >= gapMs) {
        idx++;
        phase = "stroke";
        phaseStart = now;
      }
    }
    if (running) raf = requestAnimationFrame(step);
  }

  raf = requestAnimationFrame(function (now) {
    phaseStart = now;
    step(now);
  });

  return {
    cancel: function () {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
