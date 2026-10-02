/* LIRO — la mascota de Garabati: un lápiz con cara, dibujado con CSS.
   Sin imágenes: nítido en cualquier pantalla, cero descargas y
   compatible con Chromium 37 (Android 5).

   Los niños de 3–6 años se identifican emocionalmente con caras
   (guía UX §3): Liro tiene ojos grandes con brillo, mofletes y boca
   expresiva. Además **crece con las estrellas del perfil**, la
   mecánica de retención más barata y visible (guía §8). */

import { el } from "../util/dom";

/** Emociones de Liro. Nunca hay una emoción agresiva o de castigo. */
export type MascotMood = "idle" | "happy" | "oh" | "party";

export interface MascotOptions {
  /** Estado emocional inicial (por defecto `idle`, balanceo suave). */
  mood?: MascotMood;
  /** Estrellas totales del perfil: decide la etapa de crecimiento. */
  stars?: number;
  /** Clases extra para el contenedor. */
  class?: string;
}

/**
 * Etapa de crecimiento de Liro según las estrellas acumuladas.
 * 1 → peque (0–4 ⭐), 2 → crecido con destello (5–19 ⭐),
 * 3 → con corona (20+ ⭐). Puro y testeable.
 */
export function mascotStage(stars: number): 1 | 2 | 3 {
  if (stars >= 20) return 3;
  if (stars >= 5) return 2;
  return 1;
}

/** Insignia de cada etapa (vacío, destello, corona). */
var BADGES: string[] = ["", "✨", "👑"];

/**
 * Construye a Liro.
 * @example mascotEl({ mood: "party", stars: store.totalStars() })
 */
export function mascotEl(opts?: MascotOptions): HTMLElement {
  var mood: MascotMood = (opts && opts.mood) || "idle";
  var stage = mascotStage((opts && opts.stars) || 0);
  var cls = "mascot mascot--s" + stage + " mascot--" + mood;
  if (opts && opts.class) cls += " " + opts.class;

  var wrap = el("div", { class: cls });
  var anim = el("div", { class: "mascot__anim" });

  anim.appendChild(el("div", { class: "mascot__body" }));
  anim.appendChild(el("div", { class: "mascot__cap" }));
  anim.appendChild(el("div", { class: "mascot__tip" }));
  anim.appendChild(
    el("div", {
      class: "mascot__eye mascot__eye--l",
      children: [el("i", { class: "mascot__pupil" })],
    })
  );
  anim.appendChild(
    el("div", {
      class: "mascot__eye mascot__eye--r",
      children: [el("i", { class: "mascot__pupil" })],
    })
  );
  anim.appendChild(el("div", { class: "mascot__cheek mascot__cheek--l" }));
  anim.appendChild(el("div", { class: "mascot__cheek mascot__cheek--r" }));
  anim.appendChild(el("div", { class: "mascot__mouth" }));
  if (stage > 1) {
    anim.appendChild(el("div", { class: "mascot__badge", text: BADGES[stage - 1] }));
  }

  wrap.appendChild(anim);
  return wrap;
}

/** Cambia la emoción de un Liro ya pintado (feedback inmediato). */
export function setMascotMood(node: HTMLElement, mood: MascotMood): void {
  node.className = node.className.replace(
    /mascot--(idle|happy|oh|party)/,
    "mascot--" + mood
  );
}
