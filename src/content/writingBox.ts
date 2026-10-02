/* Caja de escritura compartida por letras y números (FDD §19).
   ============================================================
   Antes cada grafía tenía sus números: la barra de la A se
   salía de las diagonales, la "~" de la Ñ caía dentro de la caja
   de la N y las curvas se aproximaban con rectas. Aquí vive la
   métrica ÚNICA con la que se construyen las 27 letras y los 10
   números, de modo que:

     · todas las mayúsculas miden exactamente lo mismo;
     · cada curva es un arco o una cúbica de verdad, no una
       aproximación con rectas;
     · los trazos que se tocan se tocan en el MISMO punto (se
       calculan, no se escriben a ojo);
     · nada sobresale de la caja salvo la "~" de la Ñ y la colita
       de la Q, que por tipografía la sobrepasan.

   Sistema de coordenadas: normalizado 0..1, y = 0 arriba (igual
   que el lienzo). Ver `engine/sampling.ts`. */

import { Segment } from "../engine/types";

/* ---------- líneas de la pauta (pauta de 4 líneas del cuaderno) ---------- */

/** Línea de la ceja: arriba de todas las mayúsculas. */
export const CAP = 0.16;
/** Altura de las barras horizontales (E, F, H) y punto medio de la A. */
export const XH = 0.5;
/** Línea media de la pauta: se dibuja discontinua (solo guía). */
export const MID = 0.67;
/** Línea base: donde se apoyan las letras. */
export const BASE = 0.84;

/** Ejes de las columnas y extremos de las barras. */
export const L = 0.24;
export const R = 0.76;
export const BAR = 0.68;
export const CX = 0.5;

/** Dígitos: algo más estrechos que las letras. */
export const DL = 0.28;
export const DR = 0.72;

export interface GuideLine {
  y: number;
  dashed?: boolean;
}

/**
 * Las 4 líneas de la pauta que se dibujan detrás de la letra o el
 * número: ceja, altura de barras, media (discontinua) y base. Las
 * declara el contenido y el motor las pinta: el render no conoce
 * letras, solo recibe las `y` normalizadas.
 */
export const GUIDE_LINES: GuideLine[] = [
  { y: CAP, dashed: false },
  { y: XH, dashed: false },
  { y: MID, dashed: true },
  { y: BASE, dashed: false },
];

/** Margen admisible alrededor de la caja (tilde de la Ñ, colita de la Q). */
export const BLEED_X = 0.08;
export const BLEED_TOP = 0.14;
export const BLEED_BOTTOM = 0.08;

/* ---------- construtores de segmentos ---------- */

/** Grados → radianes (los arcos del motor trabajan en radianes). */
export function deg(d: number): number {
  return (d * Math.PI) / 180;
}

export function ln(ax: number, ay: number, bx: number, by: number): Segment {
  return { kind: "line", a: { x: ax, y: ay }, b: { x: bx, y: by } };
}

export function ar(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  sweep: number,
  ccw?: boolean
): Segment {
  return {
    kind: "arc",
    cx: cx,
    cy: cy,
    rx: rx,
    ry: ry,
    start: start,
    sweep: sweep,
    ccw: ccw,
  };
}

/** Arco con los ángulos en GRADOS: se lee como en el cuaderno. */
export function arcDeg(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number,
  sweepDeg: number,
  ccw?: boolean
): Segment {
  return ar(cx, cy, rx, ry, deg(startDeg), deg(sweepDeg), ccw);
}

export function cb(
  ax: number,
  ay: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  bx: number,
  by: number
): Segment {
  return {
    kind: "cubic",
    a: { x: ax, y: ay },
    cp1: { x: c1x, y: c1y },
    cp2: { x: c2x, y: c2y },
    b: { x: bx, y: by },
  };
}

/* ---------- piezas compartidas por varias grafías ---------- */

/**
 * Cuerpo de la C (y base de la G): abre a la derecha, con la altura
 * exacta de las mayúsculas (toca CAP y BASE) y 90° de apertura.
 * Arranca en la esquina superior derecha y termina en la inferior.
 */
export function cBody(): Segment {
  return arcDeg(CX, XH, 0.28, (BASE - CAP) / 2, -45, 270, true);
}

/**
 * Anillo cerrado (O, Q, el 0, el 8 y las vueltas del 6 y el 9).
 * Por defecto arranca arriba y gira antihorario, que es como se
 * dibujan; `startDeg` permite que arranque donde acaba el trazo
 * anterior (el bucle del 6 nace en el punto donde llega su palito).
 */
export function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number = -90
): Segment {
  return arcDeg(cx, cy, rx, ry, startDeg, 360, true);
}

/**
 * Barriga pegada a una columna: media elipse desde (x, yTop) hasta
 * (x, yBot) abombando a la derecha (D, P, B). Empieza y termina
 * exactamente sobre la columna.
 */
export function bowl(x: number, yTop: number, yBot: number, width: number): Segment {
  return arcDeg(x, (yTop + yBot) / 2, width, (yBot - yTop) / 2, -90, 180, false);
}

/**
 * x de la recta que une (xTop, CAP) y (xBot, BASE) a la altura `y`.
 * Sirve para que la barra de la A cruce las diagonales **exactamente**
 * en el punto donde se cortan, en vez de estimarlo a ojo.
 */
export function diagX(y: number, xTop: number, xBot: number): number {
  return xTop + ((xBot - xTop) * (y - CAP)) / (BASE - CAP);
}