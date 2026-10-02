/* Efectos de celebración (guía UX §6): confeti y estrellas que
   aparecen una a una. DOM + CSS puro —sin librerías ni canvas
   extra— para que funcione en Chromium 37 y no cargue la GPU de
   tablets de gama baja.

   La celebración exagerada es el principal motor de retención:
   cada logro termina en confeti, sonido alegre y baile de Lapi. */

import { el } from "../util/dom";
import { iconEl } from "../ui/icons";

/** Colores del confeti: los mismos de la paleta (coherencia visual). */
var CONFETTI_COLORS: string[] = [
  "#ffd23f",
  "#ff9a3d",
  "#4ee08a",
  "#5f28cf",
  "#ff7a7a",
  "#ffffff",
];

/**
 * Lanza una lluvia de confeti sobre `host` en una capa temporal que
 * se autodestruye. Por defecto 18 piezas: celebración bien visible
 * sin penalizar el rendimiento en Android 5.
 *
 * @example confetti(screen, 26) // celebración grande (3 ⭐)
 */
export function confetti(host: HTMLElement, count?: number): void {
  var n = count || 18;
  var layer = el("div", { class: "confetti" });
  for (var i = 0; i < n; i++) {
    var bit = el("div", { class: "confetti__bit" });
    bit.style.left = Math.round(Math.random() * 96) + "%";
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    bit.style.width = 8 + Math.round(Math.random() * 10) + "px";
    bit.style.height = 12 + Math.round(Math.random() * 14) + "px";
    bit.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
    bit.style.animationDuration = (1.9 + Math.random() * 0.9).toFixed(2) + "s";
    bit.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
    layer.appendChild(bit);
  }
  host.appendChild(layer);
  setTimeout(function () {
    if (layer.parentElement) layer.parentElement.removeChild(layer);
  }, 3200);
}

/**
 * Fila de estrellas grandes que aparecen una a una (1–3), con el
 * sonido de acierto subiendo de tono: refuerzo inmediato y claro.
 * La estrella es un icono del juego (`ui/icons.ts`), no un emoji: se ve
 * igual en cualquier dispositivo.
 * @param stars número de estrellas ganadas (1–3)
 */
export function starRow(host: HTMLElement, stars: number, stepMs?: number): HTMLElement {
  var step = stepMs === undefined ? 320 : stepMs;
  var row = el("div", { class: "stars-big" });
  for (var i = 0; i < stars; i++) {
    var s = el("span", { children: [iconEl("starFilled", "icon icon--gold")] });
    s.style.animationDelay = i * (step / 1000) + "s";
    row.appendChild(s);
  }
  host.appendChild(row);
  return row;
}
