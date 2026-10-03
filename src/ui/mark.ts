/* "Una marca": un dibujo, nunca texto suelto.

   Regla única de toda la iconografía del juego:

   1. **Chrome** (botones, píldoras, HUD) → SVG de `ui/icons.ts`: una
      sola forma, heredando el color del botón con `currentColor`.
   2. **Contenido** (significado de las letras, avatares, objetos que se
      cuentan) → ilustración vectorial si el emoji la tiene
      (`ui/artwork.ts`) y, si no, el emoji de siempre.
   3. **Categorías** (las cuatro fases del mapa) → ficha de color de
      `ui/categories.ts`. No es chrome ni contenido: es la **señal** de
      en qué fase está el niño, y tiene que verse desde el otro lado de
      la habitación y sin saber leer. Por eso lleva su propia paleta en
      vez de heredar el color del botón, y por eso no usa ni una letra:
      la app entera está sin texto, así que la ficha enseña la categoría
      con un dibujo (un cuaderno, tres manzanas), no con un rótulo.

   Así el niño ve el mismo dibujo en una tableta de 2014 y en un portátil
   de 2026, y el chrome no depende de la fuente del sistema. */

import { artEl, hasArt } from "./artwork";
import { categoryEl } from "./categories";
import { iconEl } from "./icons";

/**
 * Marca de contenido a partir de un emoji: vector si hay arte, y si no
 * el emoji escrito (con su clase, para poder darle tamaño).
 *
 * @param value el emoji (o el texto ya pintado)
 * @param className clases del elemento (por defecto `art`)
 */
export function markEl(value: string, className?: string): HTMLElement {
  var art = artEl(value, className || "art");
  if (art) return art as unknown as HTMLElement;
  var span = document.createElement("span");
  span.className = (className || "art") + " mark--text";
  span.textContent = value;
  return span;
}

/** ¿Este emoji de contenido se dibuja como vector? */
export function isVectorArt(value: string): boolean {
  return hasArt(value);
}

/** Icono de chrome:SVG con el color del botón (`ui/icons.ts`). */
export { iconEl };

/** Ficha de categoría: la señal de cada fase (`ui/categories.ts`). */
export { categoryEl };