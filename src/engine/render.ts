/* Renderizador del lienzo de trazado.
   Dibuja: plantilla del grafema, corredor de tolerancia del trazo
   activo, punto de inicio pulsante, flecha de dirección, tinta del
   niño y la animación de demostración. Todo con Canvas 2D básico. */

import { Vec2 } from "./types";
import { pathLength } from "./sampling";
import { v } from "./geom";

export interface RenderState {
  /** Caminos ideales ya muestreados en coordenadas de lienzo. */
  paths: Vec2[][];
  /** Índice del trazo activo. */
  current: number;
  /** ¿Se ven los trazos futuros como guía gris? */
  guideVisible: boolean;
  /** Alfa de la plantilla (1 normal, ~0.15 modo "sin guía"/memoria). */
  templateAlpha: number;
  /** Trazo oculto (modo "completa la letra"): punteado tenue. */
  hidden: boolean[];
  /** Progreso de demo por trazo (-1 = no está en demo). */
  demo: number[];
  /** Trazos ya aprobados (verde). */
  done: boolean[];
  /** Tinta del niño por trazo. */
  user: Vec2[][];
  /** Trazo en curso (mientras el dedo se mueve). */
  live: Vec2[] | null;
}

export interface Theme {
  bg: string;
  guide: string;
  corridor: string;
  active: string;
  done: string;
  ink: string;
  startDot: string;
  demo: string;
}

export const DEFAULT_THEME: Theme = {
  bg: "#ffffff",
  guide: "#d9dde8",
  corridor: "rgba(124, 77, 255, 0.16)",
  active: "#7c4dff",
  done: "#58d68d",
  ink: "#3e64ff",
  startDot: "#ff9f43",
  demo: "#ffb300",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  color: string,
  width: number,
  dashed?: number[]
): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dashed && ctx.setLineDash) ctx.setLineDash(dashed);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function partialPath(pts: Vec2[], frac: number): Vec2[] {
  if (frac >= 1) return pts;
  var target = pathLength(pts) * frac;
  var out: Vec2[] = [pts[0]];
  var acc = 0;
  for (var i = 1; i < pts.length; i++) {
    var seg = Math.sqrt(
      (pts[i].x - pts[i - 1].x) * (pts[i].x - pts[i - 1].x) +
        (pts[i].y - pts[i - 1].y) * (pts[i].y - pts[i - 1].y)
    );
    if (acc + seg >= target) {
      var t = seg === 0 ? 0 : (target - acc) / seg;
      out.push(v(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t));
      return out;
    }
    acc += seg;
    out.push(pts[i]);
  }
  return out;
}

/** Punto y tangente en una fracción de la longitud del camino. */
function pointAtFraction(pts: Vec2[], frac: number): { p: Vec2; tangent: Vec2 } {
  var target = pathLength(pts) * frac;
  var acc = 0;
  for (var i = 1; i < pts.length; i++) {
    var dx = pts[i].x - pts[i - 1].x;
    var dy = pts[i].y - pts[i - 1].y;
    var seg = Math.sqrt(dx * dx + dy * dy);
    if (acc + seg >= target) {
      var t = seg === 0 ? 0 : (target - acc) / seg;
      return {
        p: v(pts[i - 1].x + dx * t, pts[i - 1].y + dy * t),
        tangent: v(dx / (seg || 1), dy / (seg || 1)),
      };
    }
    acc += seg;
  }
  var n = pts.length;
  var ldx = pts[n - 1].x - pts[n - 2].x;
  var ldy = pts[n - 1].y - pts[n - 2].y;
  var ll = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  return { p: pts[n - 1], tangent: v(ldx / ll, ldy / ll) };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  p: Vec2,
  dir: Vec2,
  size: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(dir.y, dir.x));
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, size * 0.6);
  ctx.lineTo(-size * 0.6, -size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class TraceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public w = 0;
  public h = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    var ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.ctx = ctx;
    this.resize();
  }

  /** Ajusta el búfer al tamaño CSS con DPR limitado (rendimiento gama baja). */
  resize(): void {
    var dpr = window.devicePixelRatio || 1;
    if (dpr > 1.5) dpr = 1.5; // Android 5 de gama baja
    var cssW = this.canvas.clientWidth || 300;
    var cssH = this.canvas.clientHeight || 150;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
  }

  render(s: RenderState, theme: Theme, time: number): void {
    var ctx = this.ctx;
    var base = Math.min(this.w, this.h);
    var guideW = Math.max(10, base * 0.055);

    ctx.save();
    roundRect(ctx, 0, 0, this.w, this.h, 22);
    ctx.clip();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    var i: number;
    // --- plantilla
    for (i = 0; i < s.paths.length; i++) {
      var isCurrent = i === s.current;
      var isPast = i < s.current;
      var alpha = isCurrent || isPast ? 1 : s.templateAlpha;
      if (alpha <= 0.01) continue;

      var color: string;
      var width = guideW;
      var dashed: number[] | undefined;
      if (isPast && s.done[i]) {
        color = theme.done;
      } else if (isPast) {
        color = theme.guide;
      } else if (isCurrent) {
        if (s.hidden[i]) {
          color = theme.active;
          dashed = [4, 10];
          width = guideW * 0.6;
        } else {
          color = theme.active;
        }
      } else {
        color = s.hidden[i] ? theme.guide : theme.guide;
        if (s.hidden[i]) {
          dashed = [2, 14];
          width = guideW * 0.5;
        }
      }

      var pts = s.paths[i];
      if (!dashed && (isCurrent || (isPast && s.done[i])) && !s.hidden[i]) {
        // corredor de tolerancia: trazo gordo translúcido debajo
        strokePolyline(ctx, pts, theme.corridor, width * 2.4);
      }
      ctx.globalAlpha = alpha;
      strokePolyline(ctx, pts, color, width, dashed);
      ctx.globalAlpha = 1;
    }

    // --- indicaciones del trazo activo
    var cur = s.paths[s.current];
    if (cur && cur.length > 1 && !s.hidden[s.current]) {
      var pulse = 0.5 + 0.5 * Math.sin(time / 280);
      // punto de inicio
      ctx.save();
      ctx.fillStyle = theme.startDot;
      ctx.beginPath();
      ctx.arc(cur[0].x, cur[0].y, guideW * (0.55 + pulse * 0.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cur[0].x, cur[0].y, guideW * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // flecha de dirección al 18 % del recorrido
      var at = pointAtFraction(cur, 0.18);
      drawArrowHead(ctx, at.p, at.tangent, guideW * 0.55, theme.active);
    }

    // --- tinta del niño
    var inkW = guideW * 0.92;
    for (i = 0; i < s.user.length; i++) {
      strokePolyline(ctx, s.user[i], theme.ink, inkW);
    }
    if (s.live && s.live.length > 1) {
      strokePolyline(ctx, s.live, theme.ink, inkW);
    }

    // --- demostración (recorrido animado)
    for (i = 0; i < s.demo.length; i++) {
      var f = s.demo[i];
      if (f < 0) continue;
      var dpts = partialPath(s.paths[i], f);
      strokePolyline(ctx, dpts, theme.demo, guideW * 0.85);
      if (dpts.length > 1) {
        var head = dpts[dpts.length - 1];
        ctx.save();
        ctx.fillStyle = "#5d4037";
        ctx.beginPath();
        ctx.arc(head.x, head.y, guideW * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe0b2";
        ctx.beginPath();
        ctx.arc(head.x, head.y, guideW * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
