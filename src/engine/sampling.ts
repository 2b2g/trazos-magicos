/* Muestreo de segmentos a polilíneas y utilidades de forma.
   Coordenadas normalizadas 0..1 — se escalan al lienzo (y=0 arriba). */

import { Segment, Vec2 } from "./types";
import { v, lerpPoint, clamp } from "./geom";

function dd(a: Vec2, b: Vec2): number {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function ds(a: Vec2, b: Vec2): number {
  return Math.sqrt(dd(a, b));
}

/** Número de muestras por segmento según su longitud aproximada. */
function samplesFor(len: number): number {
  return Math.max(8, Math.min(160, Math.round(len * 140)));
}

function approxLen(s: Segment): number {
  if (s.kind === "arc") {
    var rx = s.rx || 0;
    var ry = s.ry || 0;
    var span = Math.abs((s.end || 0) - (s.start || 0));
    return ((rx + ry) / 2) * span;
  }
  if (s.kind === "line" || s.kind === "wave" || s.kind === "zigzag") {
    var a = s.a || v(0, 0);
    var b = s.b || v(1, 1);
    return ds(a, b);
  }
  if (s.kind === "quad") {
    return ds(s.a || v(0, 0), s.cp || v(0.5, 0)) + ds(s.cp || v(0.5, 0), s.b || v(1, 1));
  }
  // cubic: polígono de control (suficiente para dimensionar el muestreo)
  var c0 = s.a || v(0, 0);
  var c1 = s.cp1 || v(0.3, 0);
  var c2 = s.cp2 || v(0.7, 1);
  var c3 = s.b || v(1, 1);
  return ds(c0, c1) + ds(c1, c2) + ds(c2, c3);
}

/** Muestrea un segmento en N tramos (N+1 puntos, incluye extremos). */
/**
 * Muestrea un segmento geométrico en una polilínea de n+1 puntos
 * (coordenadas normalizadas 0..1 del segmento, sin escalar).
 */
export function sampleSegment(s: Segment, n: number): Vec2[] {
  var pts: Vec2[] = [];
  var i: number;
  var t: number;
  switch (s.kind) {
    case "line": {
      var a = s.a || v(0, 0);
      var b = s.b || v(1, 1);
      for (i = 0; i <= n; i++) {
        pts.push(lerpPoint(a, b, i / n));
      }
      break;
    }
    case "quad": {
      var q0 = s.a || v(0, 0);
      var qc = s.cp || v(0.5, 0);
      var q1 = s.b || v(1, 1);
      for (i = 0; i <= n; i++) {
        t = i / n;
        var mt = 1 - t;
        pts.push(
          v(
            mt * mt * q0.x + 2 * mt * t * qc.x + t * t * q1.x,
            mt * mt * q0.y + 2 * mt * t * qc.y + t * t * q1.y
          )
        );
      }
      break;
    }
    case "cubic": {
      var c0 = s.a || v(0, 0);
      var c1 = s.cp1 || v(0.3, 0);
      var c2 = s.cp2 || v(0.7, 1);
      var c3 = s.b || v(1, 1);
      for (i = 0; i <= n; i++) {
        t = i / n;
        var mt2 = 1 - t;
        pts.push(
          v(
            mt2 * mt2 * mt2 * c0.x + 3 * mt2 * mt2 * t * c1.x + 3 * mt2 * t * t * c2.x + t * t * t * c3.x,
            mt2 * mt2 * mt2 * c0.y + 3 * mt2 * mt2 * t * c1.y + 3 * mt2 * t * t * c2.y + t * t * t * c3.y
          )
        );
      }
      break;
    }
    case "arc": {
      var cx = s.cx || 0;
      var cy = s.cy || 0;
      var rx = s.rx || 0;
      var ry = s.ry || 0;
      var start = s.start || 0;
      var sweep: number;
      if (s.sweep !== undefined) {
        sweep = Math.abs(s.sweep);
      } else {
        var end = s.end === undefined ? Math.PI * 2 : s.end;
        sweep = end - start;
        if (sweep <= 0) sweep += Math.PI * 2;
      }
      var dir = s.ccw ? -1 : 1;
      for (i = 0; i <= n; i++) {
        t = i / n;
        var ang = start + dir * sweep * t;
        pts.push(v(cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)));
      }
      break;
    }
    case "wave": {
      var w0 = s.a || v(0, 0);
      var w1 = s.b || v(1, 1);
      var amp = s.amp === undefined ? 0.08 : s.amp;
      var waves = s.waves || 3;
      var dx = w1.x - w0.x;
      var dy = w1.y - w0.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      for (i = 0; i <= n; i++) {
        t = i / n;
        var base = lerpPoint(w0, w1, t);
        var off = Math.sin(t * Math.PI * 2 * waves) * amp;
        pts.push(v(base.x + (-dy / len) * off, base.y + (dx / len) * off));
      }
      break;
    }
    case "zigzag": {
      var z0 = s.a || v(0, 0);
      var z1 = s.b || v(1, 1);
      var zamp = s.amp === undefined ? 0.06 : s.amp;
      var teeth = s.teeth || 4;
      var zdx = z1.x - z0.x;
      var zdy = z1.y - z0.y;
      var zlen = Math.sqrt(zdx * zdx + zdy * zdy) || 1;
      for (i = 0; i <= n; i++) {
        t = i / n;
        var zbase = lerpPoint(z0, z1, t);
        var phase = (t * teeth) % 1;
        // onda triangular continua: -1 → 1 → -1 por cada diente
        var tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
        pts.push(v(zbase.x + (-zdy / zlen) * tri * zamp, zbase.y + (zdx / zlen) * tri * zamp));
      }
      break;
    }
  }
  return pts;
}

/** Muestrea un trazo completo (segmentos encadenados) escalado al lienzo. */
/**
 * Muestrea un trazo completo: encadena sus segmentos y escala de
 * coordenadas normalizadas (0..1) a píxeles del lienzo, aplicando
 * `inset` como margen en px. El render y el evaluador DEBEN usar los
 * mismos `scale` e `inset` para que la comparación sea coherente.
 */
export function sampleStroke(
  segments: Segment[],
  scale: { w: number; h: number },
  inset: number
): Vec2[] {
  var pts: Vec2[] = [];
  for (var i = 0; i < segments.length; i++) {
    var s = segments[i];
    var n = samplesFor(approxLen(s));
    var raw = sampleSegment(s, n);
    for (var j = 0; j < raw.length; j++) {
      var p = raw[j];
      pts.push(v(inset + p.x * (scale.w - 2 * inset), inset + p.y * (scale.h - 2 * inset)));
    }
    // encadenar: quitar duplicado entre segmentos consecutivos
    if (i < segments.length - 1 && pts.length > 1) {
      var last = pts[pts.length - 1];
      var prev = pts[pts.length - 2];
      if (Math.abs(last.x - prev.x) < 0.5 && Math.abs(last.y - prev.y) < 0.5) pts.pop();
    }
  }
  return pts;
}

/** Longitud total de una polilínea. */
export function pathLength(path: Vec2[]): number {
  var len = 0;
  for (var i = 1; i < path.length; i++) {
    len += ds(path[i - 1], path[i]);
  }
  return len;
}

/** Remuestrea una polilínea a espaciado uniforme. */
/**
 * Remuestrea una polilínea a espaciado uniforme `spacing` px.
 * Se usa para comparar trazos de distinta densidad de muestreo
 * (dedo vs. ideal) y para las animaciones de demo.
 */
export function resampleUniform(path: Vec2[], spacing: number): Vec2[] {
  if (!(spacing > 0)) return path.slice();
  if (path.length < 2) return path.slice();
  var out: Vec2[] = [path[0]];
  var prev = path[0];
  var d = 0;
  var i = 1;
  while (i < path.length) {
    var p = path[i];
    var seg = ds(prev, p);
    if (d + seg >= spacing) {
      var t = (spacing - d) / seg;
      var np = lerpPoint(prev, p, t);
      out.push(np);
      prev = np;
      d = 0;
    } else {
      d += seg;
      prev = p;
      i++;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

/** Bounding box de una polilínea. */
export function bbox(points: Vec2[]): { minX: number; minY: number; maxX: number; maxY: number } {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}

export { clamp };
