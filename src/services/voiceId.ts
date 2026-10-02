/* Identificador determinista de cada frase hablada.
   Misma frase → mismo id en el generador (Node) y en la app
   (navegador), de modo que el catálogo de audios nunca se
   desincroniza del texto del juego.

   El id es legible a propósito (`ahora-hazla-tu-hacia-abajo-4f9c1e02`)
   para poder revisar la carpeta de audios a ojo. */

/** Mapa de acentos explícito: no depende de `String.normalize`
    (ausente en Safari 9) ni de la versión de Unicode del motor. */
var ACCENTS: Record<string, string> = {
  á: "a", à: "a", ä: "a", â: "a",
  é: "e", è: "e", ë: "e", ê: "e",
  í: "i", ì: "i", ï: "i", î: "i",
  ó: "o", ò: "o", ö: "o", ô: "o",
  ú: "u", ù: "u", ü: "u", û: "u",
  ñ: "n", ç: "c",
};

/**
 * Slug legible de una frase: minúsculas, sin acentos ni signos,
 * con guiones. Los espacios se conservan como guiones simples.
 */
export function slugify(text: string): string {
  var lower = text.toLowerCase();
  var out = "";
  for (var i = 0; i < lower.length; i++) {
    var c = lower.charAt(i);
    if (ACCENTS[c]) c = ACCENTS[c];
    if (c >= "a" && c <= "z") out += c;
    else if (c >= "0" && c <= "9") out += c;
    else out += "-";
  }
  // colapsa guiones repetidos y recorta los de los extremos
  var clean = "";
  var prevDash = false;
  for (i = 0; i < out.length; i++) {
    var ch = out.charAt(i);
    if (ch === "-") {
      if (!prevDash) clean += ch;
      prevDash = true;
    } else {
      clean += ch;
      prevDash = false;
    }
  }
  while (clean.charAt(0) === "-") clean = clean.slice(1);
  while (clean.charAt(clean.length - 1) === "-") clean = clean.slice(0, -1);
  return clean;
}

/** Hash FNV-1a de 32 bits en hexadecimal (8 caracteres). */
export function hashText(text: string): string {
  var h = 0x811c9dc5;
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    // multiplicación por 16777619 con aritmética de 32 bits
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  var hex = h.toString(16);
  while (hex.length < 8) hex = "0" + hex;
  return hex;
}

/**
 * Id de audio de una frase: slug (recortado a 40 caracteres) + hash.
 * El hash evita colisiones entre frases que empiezan igual; el slug
 * mantiene la carpeta legible.
 */
export function voiceId(text: string): string {
  var slug = slugify(text);
  if (slug.length > 40) slug = slug.slice(0, 40);
  return (slug ? slug + "-" : "v-") + hashText(text);
}
