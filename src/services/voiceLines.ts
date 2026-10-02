/* Catálogo COMPLETO de frases que el juego puede decir en voz alta,
   enumerado a partir del contenido (que es data pura). Lo usan:

   - `scripts/generate-voice.mjs` → pre-renderiza un MP3 por frase con
     una voz buena y los empaqueta en el juego (sin servicios externos
     en tiempo de ejecución).
   - `tests/voice.test.ts` → comprueba que no queda ninguna frase sin
     audio ni ningún audio huérfano.

   Regla de oro: la app debe decir frases sueltas (segmentos) y no
   concatenaciones nuevas, para que todo sea pre-generable. */

import { PHRASES, CHEERS, NUMBER_WORDS } from "../content/phrases";
import { ALL_RESOURCES } from "../content";
import { countPhrase, letterPhrase } from "../content/speech";

/** Igual que la pista hablada del trazo: "Hacia abajo." */
function sentence(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1) + ".";
}

/** Listas de conteo tal y como suenan: "uno, dos, tres". */
function countLists(): string[] {
  var out: string[] = [];
  for (var n = 1; n < NUMBER_WORDS.length; n++) {
    var words: string[] = [];
    for (var i = 1; i <= n; i++) words.push(NUMBER_WORDS[i]);
    out.push(words.join(", "));
  }
  return out;
}

/**
 * Todas las frases hablables, sin duplicados y en orden estable
 * (el generador solo sintetiza lo que falte).
 */
export function collectVoiceLines(): string[] {
  var seen: Record<string, boolean> = {};
  var out: string[] = [];

  function add(text: string): void {
    var t = (text || "").replace(/\s+/g, " ").replace(/^ | $/g, "");
    if (!t || seen[t]) return;
    seen[t] = true;
    out.push(t);
  }

  // 1. catálogo fijo de frases + ánimos + palabras de los números
  var phraseMap = PHRASES as unknown as Record<string, string>;
  for (var key in phraseMap) {
    if (Object.prototype.hasOwnProperty.call(phraseMap, key)) add(phraseMap[key]);
  }
  for (var c = 0; c < CHEERS.length; c++) add(CHEERS[c]);
  for (var w = 0; w < NUMBER_WORDS.length; w++) add(NUMBER_WORDS[w]);
  var lists = countLists();
  for (var l = 0; l < lists.length; l++) add(lists[l]);

  // 2. contenido: presentación, etiquetas de trazo y recompensas
  for (var r = 0; r < ALL_RESOURCES.length; r++) {
    var res = ALL_RESOURCES[r];
    add(res.label);
    if (res.speech) {
      for (var s = 0; s < res.speech.length; s++) add(res.speech[s]);
    }
    for (var st = 0; st < res.strokes.length; st++) {
      if (res.strokes[st].label) add(sentence(res.strokes[st].label as string));
    }
    if (res.kind === "letter") add(letterPhrase(res));
    if (res.kind === "number" && res.count !== undefined) add(countPhrase(res));
  }

  return out;
}
