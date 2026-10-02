import { ResourceDef, Segment } from "../engine/types";

/* FASE D — Los Números Mágicos 0–9 (FDD §4, §21–25).
   Cada dígito: trazos ordenados + relación símbolo → cantidad. */

const ln = (ax: number, ay: number, bx: number, by: number): Segment => ({
  kind: "line",
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
});
const ar = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  sweep: number,
  ccw?: boolean
): Segment => ({ kind: "arc", cx: cx, cy: cy, rx: rx, ry: ry, start: start, sweep: sweep, ccw: ccw });
const qd = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number): Segment => ({
  kind: "quad",
  a: { x: ax, y: ay },
  cp: { x: cx, y: cy },
  b: { x: bx, y: by },
});

const CIRC = ar(0.5, 0.5, 0.34, 0.36, -Math.PI / 2, Math.PI * 2);

function digit(
  char: string,
  difficulty: 1 | 2 | 3,
  strokeList: Array<[string, string, Segment[]]>,
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
  };
}

export const PHASE_D_NUMBERS: ResourceDef[] = [
  digit("0", 1,
    [["s1", "una vuelta", [CIRC]]],
    ["El cero.", "Una vuelta redonda."]),

  digit("1", 1,
    [["s1", "un palito", [ln(0.5, 0.14, 0.5, 0.86)]]],
    ["El uno.", "Un palito hacia abajo."]),

  digit("2", 2,
    [
      ["s1", "la curva", [qd(0.2, 0.3, 0.5, -0.02, 0.8, 0.3)]],
      ["s2", "la diagonal", [ln(0.8, 0.3, 0.2, 0.86)]],
      ["s3", "la base", [ln(0.2, 0.86, 0.8, 0.86)]],
    ],
    ["El dos.", "Curva arriba, diagonal abajo y una base."]),

  digit("3", 2,
    [[
      "s1",
      "dos barrigas",
      [
        ar(0.5, 0.33, 0.28, 0.2, Math.PI * 1.11, Math.PI * 1.45),
        ar(0.52, 0.68, 0.3, 0.21, Math.PI * 1.43, Math.PI * 1.13),
      ],
    ]],
    ["El tres.", "Dos barrigas a la derecha."]),

  digit("4", 2,
    [
      ["s1", "diagonal", [ln(0.62, 0.14, 0.2, 0.6)]],
      ["s2", "línea horizontal", [ln(0.2, 0.6, 0.84, 0.6)]],
      ["s3", "palo vertical", [ln(0.62, 0.14, 0.62, 0.86)]],
    ],
    ["El cuatro.", "Diagonal, cruz y palo."],
    [["s1", "s2", "s3"], ["s3", "s1", "s2"]]),

  digit("5", 2,
    [
      ["s1", "techo", [ln(0.75, 0.14, 0.25, 0.14)]],
      ["s2", "palo", [ln(0.25, 0.14, 0.25, 0.5)]],
      ["s3", "barriga", [ar(0.46, 0.68, 0.32, 0.22, 4.0, Math.PI * 1.28)]],
    ],
    ["El cinco.", "Techo, palo y una barriga."]),

  digit("6", 2,
    [[
      "s1",
      "baja y enrolla",
      [ln(0.72, 0.14, 0.28, 0.6), ar(0.5, 0.66, 0.24, 0.24, Math.PI * 1.07, Math.PI * 2, true)],
    ]],
    ["El seis.", "Bajas y haces una vuelta."]),

  digit("7", 1,
    [
      ["s1", "techo", [ln(0.18, 0.14, 0.82, 0.14)]],
      ["s2", "diagonal", [ln(0.82, 0.14, 0.42, 0.86)]],
    ],
    ["El siete.", "Techo y diagonal."]),

  digit("8", 3,
    [
      ["s1", "círculo de arriba", [ar(0.5, 0.31, 0.24, 0.18, -Math.PI / 2, Math.PI * 2, true)]],
      ["s2", "círculo de abajo", [ar(0.5, 0.69, 0.3, 0.19, -Math.PI / 2, Math.PI * 2, true)]],
    ],
    ["El ocho.", "Dos vueltas, arriba y abajo."]),

  digit("9", 2,
    [
      ["s1", "la vuelta", [ar(0.5, 0.32, 0.26, 0.22, -Math.PI / 2, Math.PI * 2, true)]],
      ["s2", "el palo", [ln(0.76, 0.34, 0.66, 0.86)]],
    ],
    ["El nueve.", "Una vuelta y un palo."]),
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
