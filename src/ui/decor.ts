/* Decoración de cielo: sol con cara y nubes que pasean despacio.
   Antropomorfismo de la guía UX §3 (los elementos también tienen
   cara) y algo vivo que mirar sin robar atención a la tarea.
   Solo transform/opacity: barato en Android 5 de gama baja. */

import { el } from "../util/dom";

/** Capa decorativa (no interactiva, se pone detrás del contenido). */
export function skyDeco(): HTMLElement {
  var sky = el("div", { class: "sky" });

  var sun = el("div", {
    class: "sky__sun",
    children: [
      el("div", { class: "sky__sun-eye sky__sun-eye--l" }),
      el("div", { class: "sky__sun-eye sky__sun-eye--r" }),
      el("div", { class: "sky__sun-mouth" }),
    ],
  });

  sky.appendChild(sun);
  sky.appendChild(el("div", { class: "sky__cloud" }));
  sky.appendChild(el("div", { class: "sky__cloud sky__cloud--b" }));
  sky.appendChild(el("div", { class: "sky__cloud sky__cloud--c" }));
  return sky;
}
