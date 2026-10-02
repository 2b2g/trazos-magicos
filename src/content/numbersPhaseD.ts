import { ResourceDef } from "../engine/types";
import { BASE, CAP, CX, DL, DR, GUIDE_LINES, arcDeg, cb, ln, ring } from "./writingBox";

/* FASE D — Los Números Mágicos 0–9 (FDD §4, §21–25).
   Cada dígito: trazos ordenados + relación símbolo → cantidad.

   Estilo de escritura: el habitual en España y Latinoamérica
   ("estupecho"): el 1 lleva palito y base, el 4 es cerrado, el 7 se
   escribe SIN raya cruzada y el 9 cae con la pata recta. Los
   trazos usan la misma caja de escritura que las letras
   (`writingBox.ts`), así que un 6 mide lo mismo que una O. */

function digit(
  char: string,
  difficulty: 1 | 2 | 3,
  strokeList: Array<[string, string, ResourceDef["strokes"][number]["segments"]]>,
  speech: string[],
  altOrders?: string[][]
): ResourceDef {
  var n = parseInt(char, 10);
  return {
    id: "number_" + char,
    kind: "number",
    label: "El número " + char,
    char: char,
    phase: "D",
    family: "números",
    case: "none",
    difficulty: difficulty,
    strokes: strokeList.map(function (s) {
      return { id: s[0], label: s[1], segments: s[2] };
    }),
    speech: speech,
    count: n,
    countEmoji: "⭐",
    // palabra que cierra el conteo: "3 estrellas" (FDD §23–25)
    meaningWord: "estrellas",
    altOrders: altOrders,
    guideLines: GUIDE_LINES,
  };
}

/* ---------------- 0 a 4 ---------------- */

/* 0: elipse alta y estrecha (0.48 × 0.68), no un círculo. */
const ZERO = digit("0", 1,
  [["s1", "una vuelta", [ring(CX, 0.5, 0.24, (BASE - CAP) / 2)]]],
  ["El cero.", "Una vuelta redonda."]);

/* 1: palito + palo + base (así se escribe de verdad, no un palo solo). */
const ONE = digit("1", 1,
  [
    ["s1", "el palito", [ln(0.34, 0.28, CX, CAP)]],
    ["s2", "el palo", [ln(CX, CAP, CX, BASE)]],
    ["s3", "la base", [ln(0.32, BASE, 0.68, BASE)]],
  ],
  ["El uno.", "Un palito, un palo y una base."]);

/* 2: curva de media vuelta, diagonal y base, con los empalmes justos. */
const TWO_ARC_Y = 0.34;

const TWO = digit("2", 2,
  [
    ["s1", "la curva", [arcDeg(CX, TWO_ARC_Y, 0.24, 0.18, 180, 180, false)]],
    ["s2", "la diagonal", [ln(0.74, TWO_ARC_Y, DL, BASE)]],
    ["s3", "la base", [ln(DL, BASE, DR, BASE)]],
  ],
  ["El dos.", "Curva arriba, diagonal abajo y una base."]);

/* 3: dos barrigas que se tocan en el punto medio exacto. */
const THREE = digit("3", 2,
  [[
    "s1",
    "dos barrigas",
    [
      arcDeg(CX, 0.33, 0.22, 0.17, -160, 250, false),
      arcDeg(CX, 0.67, 0.22, 0.17, -90, 250, false),
    ],
  ]],
  ["El tres.", "Dos barrigas a la derecha."]);

/* 4 cerrado: diagonal, horizontal y palo. */
const FOUR = digit("4", 2,
  [
    ["s1", "la diagonal", [ln(0.62, CAP, DL, 0.6)]],
    ["s2", "la horizontal", [ln(DL, 0.6, DR, 0.6)]],
    ["s3", "el palo", [ln(0.62, CAP, 0.62, BASE)]],
  ],
  ["El cuatro.", "Diagonal, cruz y palo."],
  [["s1", "s2", "s3"], ["s3", "s1", "s2"]]);

/* ---------------- 5 a 9 ---------------- */

/* 5: techo, palo y barriga con el rabito hacia la izquierda. */
const FIVE_BOWL_Y = 0.66;

const FIVE = digit("5", 2,
  [
    ["s1", "el techo", [ln(0.72, CAP, 0.34, CAP)]],
    ["s2", "el palo", [ln(0.34, CAP, 0.34, 0.48)]],
    ["s3", "la barriga", [arcDeg(0.34, FIVE_BOWL_Y, 0.36, 0.18, -90, 200, false)]],
  ],
  ["El cinco.", "Techo, palo y una barriga."]);

/* 6: el trazo baja curvado hasta el bucle y da la vuelta completa,
   cuyo punto más bajo apoya justo en la línea base. El bucle nace
   en el mismo punto donde llega el palito (180°), sin salto. */
const SIX = digit("6", 2,
  [[
    "s1",
    "baja y enrolla",
    [
      cb(0.72, CAP, 0.52, 0.26, 0.3, 0.4, DL, 0.66),
      ring(CX, 0.66, CX - DL, BASE - 0.66, 180),
    ],
  ]],
  ["El seis.", "Bajas y haces una vuelta."]);

/* 7 SIN raya cruzada (así se escribe en España y Latinoamérica). */
const SEVEN = digit("7", 1,
  [
    ["s1", "el techo", [ln(DL, CAP, DR, CAP)]],
    ["s2", "la diagonal", [ln(DR, CAP, 0.4, BASE)]],
  ],
  ["El siete.", "Techo y diagonal."]);

/* 8: dos vueltas cerradas; la de abajo es más ancha. */
const EIGHT = digit("8", 3,
  [
    ["s1", "vuelta de arriba", [ring(CX, 0.33, 0.2, 0.17)]],
    ["s2", "vuelta de abajo", [ring(CX, 0.67, 0.24, 0.17)]],
  ],
  ["El ocho.", "Dos vueltas, arriba y abajo."]);

/* 9: la vuelta arriba y la pata RECTA hasta la base, tocando la curva
   justo en el punto donde se tangen (x = 0.7, y = 0.44). */
const NINE = digit("9", 2,
  [
    ["s1", "la vuelta", [ring(CX, 0.34, 0.24, 0.18)]],
    ["s2", "el palo", [ln(0.7, 0.44, 0.7, BASE)]],
  ],
  ["El nueve.", "Una vuelta y un palo."]);

export const PHASE_D_NUMBERS: ResourceDef[] = [
  ZERO, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE,
];

/** Palabras cortas — estructura lista, desbloqueo post-MVP (FDD §27–28). */
export interface WordEntry {
  word: string;
  emojis: string[]; // uno por letra
  means: string;
}

export const WORDS_POST_MVP: WordEntry[] = [
  { word: "SOL", emojis: ["☀️", "🌙", "🦋"], means: "Sol" },
  { word: "OSO", emojis: ["🧡", "🐍", "🧡"], means: "Oso" },
  { word: "PAN", emojis: ["🐧", "🍎", "☁️"], means: "Pan" },
  { word: "PEZ", emojis: ["🐧", "🐘", "🦓"], means: "Pez" },
  { word: "LUNA", emojis: ["🌙", "🐻", "☁️", "🪁"], means: "Luna" },
  { word: "CASA", emojis: ["🏠", "🪁", "🐍", "🪁"], means: "Casa" },
  { word: "MAMÁ", emojis: ["🍎", "🪁", "🍎", "🪁"], means: "Mamá" },
  { word: "PAPÁ", emojis: ["🐧", "🪁", "🐧", "🪁"], means: "Papá" },
];