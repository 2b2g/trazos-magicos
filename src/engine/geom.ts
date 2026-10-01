import { Vec2 } from "./types";

/** Construye un vector/punto. Atajo ES5 de {x, y}. */
export function v(x: number, y: number): Vec2 {
  return { x: x, y: y };
}

/** Distancia euclídea entre dos puntos (px). */
export function dist(a: Vec2, b: Vec2): number {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distancia al cuadrado (evita sqrt en comparaciones). */
export function dist2(a: Vec2, b: Vec2): number {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Interpolación lineal entre dos escalares (t en 0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolación lineal entre dos puntos. */
export function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return v(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
}

/** Limita x al rango [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Producto cruzado con signo (área aproximada de una polilínea cerrada). */
export function signedArea(points: Vec2[]): number {
  var area = 0;
  for (var i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
  }
  return area / 2;
}

/** Punto más cercano en una polilínea muestreada. */
export function nearestOnPath(p: Vec2, path: Vec2[]): { index: number; dist: number } {
  var bestI = -1;
  var bestD = Infinity;
  for (var i = 0; i < path.length; i++) {
    var d = dist2(p, path[i]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return { index: bestI, dist: Math.sqrt(bestD) };
}
