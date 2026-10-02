/* Frases que nacen del contenido (no del catálogo fijo).
   Viven aquí para que la app y el generador de voz compongan
   EXACTAMENTE lo mismo: si se calculara en dos sitios, el audio
   grabado y lo que pide el juego dejarían de coincidir. */

import { ResourceDef } from "../engine/types";

/**
 * Frase de conteo de un número: "3 estrellas", "1 estrella".
 * Singulariza cuando el conteo es 1 (palabra terminada en "s").
 */
export function countPhrase(res: ResourceDef): string {
  var word = res.meaningWord || "";
  if (res.count === 1 && word.charAt(word.length - 1) === "s") {
    word = word.slice(0, -1);
  }
  return (res.count === undefined ? "" : res.count) + (word ? " " + word : "");
}

/** Frase de significado de una letra: "A de Avión" (FDD §18). */
export function letterPhrase(res: ResourceDef): string {
  return res.char && res.meaningWord ? res.char + " de " + res.meaningWord : "";
}
