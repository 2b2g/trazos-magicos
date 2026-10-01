import { ResourceDef, Segment } from "../engine/types";

/* FASE C — El Abecedario Mágico: 27 mayúsculas (incluida Ñ), organizadas
   por familias motoras (FDD §11–12). Primero las fáceles. */

const U = 0.16; // margen horizontal estándar
const TOP = 0.14;
const MID = 0.5;
const BOT = 0.86;

const qd = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number): Segment => ({
  kind: "quad",
  a: { x: ax, y: ay },
  cp: { x: cx, y: cy },
  b: { x: bx, y: by },
});
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
const wv = (ax: number, ay: number, bx: number, by: number, amp: number, waves: number): Segment => ({
  kind: "wave",
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  amp: amp,
  waves: waves,
});

function letter(
  char: string,
  family: string,
  difficulty: 1 | 2 | 3,
  strokeList: Array<[string, string, Segment[]]>,
  speech: string[],
  meaning: { emoji: string; word: string },
  altOrders?: string[][]
): ResourceDef {
  return {
    id: "letter_" + char + "_upper",
    kind: "letter",
    label: "La letra " + char,
    char: char,
    phase: "C",
    family: family,
    case: "uppercase",
    difficulty: difficulty,
    strokes: strokeList.map(function (s) {
      return { id: s[0], label: s[1], segments: s[2] };
    }),
    speech: speech,
    meaningEmoji: meaning.emoji,
    meaningWord: meaning.word,
    altOrders: altOrders,
  };
}

/* ---------------- FAMILIA 1 · LÍNEAS ---------------- */

const I = letter("I", "líneas", 1,
  [["s1", "hacia abajo", [ln(U, TOP, U, BOT)]]],
  ["La I.", "Una línea hacia abajo."],
  { emoji: "🪁", word: "Isla" });

const Le = letter("L", "líneas", 1,
  [
    ["s1", "hacia abajo", [ln(U, TOP, U, BOT)]],
    ["s2", "hacia la derecha", [ln(U, BOT, 0.7, BOT)]],
  ],
  ["La L.", "Abajo y luego a la derecha."],
  { emoji: "🌙", word: "Luna" });

const T = letter("T", "líneas", 1,
  [
    ["s1", "el techo", [ln(0.12, TOP, 0.88, TOP)]],
    ["s2", "la pata", [ln(0.5, TOP, 0.5, BOT)]],
  ],
  ["La T.", "Primero el techo, luego la pata."],
  { emoji: "🐢", word: "Tortuga" });

const E = letter("E", "líneas", 1,
  [
    ["s1", "la espalda", [ln(U, TOP, U, BOT)]],
    ["s2", "el techo", [ln(U, TOP, 0.72, TOP)]],
    ["s3", "la barriga", [ln(U, MID, 0.62, MID)]],
    ["s4", "la pata", [ln(U, BOT, 0.72, BOT)]],
  ],
  ["La E.", "La espalda y tres barras."],
  { emoji: "🐘", word: "Elefante" });

const F = letter("F", "líneas", 1,
  [
    ["s1", "la espalda", [ln(U, TOP, U, BOT)]],
    ["s2", "el techo", [ln(U, TOP, 0.72, TOP)]],
    ["s3", "la barriga", [ln(U, MID, 0.62, MID)]],
  ],
  ["La F.", "Como la E, pero sin pata."],
  { emoji: "🌸", word: "Flor" });

const H = letter("H", "líneas", 2,
  [
    ["s1", "pata izquierda", [ln(U, TOP, U, BOT)]],
    ["s2", "pata derecha", [ln(0.84, TOP, 0.84, BOT)]],
    ["s3", "el puente", [ln(U, MID, 0.84, MID)]],
  ],
  ["La H.", "Dos patas y un puente."],
  { emoji: "🧊", word: "Hielo" });

/* ---------------- FAMILIA 2 · DIAGONALES ---------------- */

const A = letter("A", "diagonales", 2,
  [
    ["s1", "diagonal izquierda", [ln(U, BOT, 0.5, TOP)]],
    ["s2", "diagonal derecha", [ln(0.5, TOP, 0.84, BOT)]],
    ["s3", "la barriga", [ln(0.28, MID, 0.72, MID)]],
  ],
  ["La A.", "Dos diagonales y una barriga."],
  { emoji: "✈️", word: "Avión" },
  [["s1", "s2", "s3"], ["s2", "s1", "s3"]]);

const V = letter("V", "diagonales", 1,
  [
    ["s1", "baja", [ln(U, TOP, 0.5, BOT)]],
    ["s2", "sube", [ln(0.5, BOT, 0.84, TOP)]],
  ],
  ["La V.", "Baja y sube, como un valle."],
  { emoji: "🐄", word: "Vaca" });

const W = letter("W", "diagonales", 2,
  [
    ["s1", "baja", [ln(U, TOP, 0.28, BOT)]],
    ["s2", "sube", [ln(0.28, BOT, 0.5, TOP)]],
    ["s3", "baja", [ln(0.5, TOP, 0.72, BOT)]],
    ["s4", "sube", [ln(0.72, BOT, 0.84, TOP)]],
  ],
  ["La W.", "Dos valles seguidos."],
  { emoji: "🍉", word: "Sandía" },
  [["s1", "s2", "s3", "s4"], ["s4", "s3", "s2", "s1"]]);

const X = letter("X", "diagonales", 2,
  [
    ["s1", "cruza", [ln(U, TOP, 0.84, BOT)]],
    ["s2", "cruza", [ln(0.84, TOP, U, BOT)]],
  ],
  ["La X.", "Dos rayitas cruzadas."],
  { emoji: "🎵", word: "Xilófono" },
  [["s1", "s2"], ["s2", "s1"]]);

const Y = letter("Y", "diagonales", 2,
  [
    ["s1", "brazo izquierdo", [ln(U, TOP, 0.5, MID)]],
    ["s2", "brazo derecho", [ln(0.84, TOP, 0.5, MID)]],
    ["s3", "la pata", [ln(0.5, MID, 0.5, BOT)]],
  ],
  ["La Y.", "Dos brazos y una pata."],
  { emoji: "🥛", word: "Yogur" });

const K = letter("K", "diagonales", 2,
  [
    ["s1", "la espalda", [ln(U, TOP, U, BOT)]],
    ["s2", "el brazo abierto", [ln(0.66, 0.22, U, MID), ln(U, MID, 0.66, BOT)]],
  ],
  ["La K.", "Una pared y un brazo que abre y cierra."],
  { emoji: "🐨", word: "Koala" },
  [["s1", "s2"], ["s2", "s1"]]);

const Z = letter("Z", "diagonales", 2,
  [[
    "s1",
    "el rayo",
    [ln(0.14, TOP, 0.86, TOP), ln(0.86, TOP, U, BOT), ln(U, BOT, 0.86, BOT)],
  ]],
  ["La Z.", "Como un rayo: arriba, diagonal y base."],
  { emoji: "🦊", word: "Zorro" });

/* ---------------- FAMILIA 3 · CURVAS ---------------- */

const C = letter("C", "curvas", 1,
  [["s1", "curva que abraza", [ar(0.5, MID, 0.36, 0.36, -Math.PI / 4, (Math.PI * 3) / 2, true)]]],
  ["La C.", "Una curva que abraza."],
  { emoji: "🏠", word: "Casa" });

const O = letter("O", "curvas", 1,
  [["s1", "círculo redondo", [ar(0.5, MID, 0.36, 0.36, -Math.PI / 2, Math.PI * 2, true)]]],
  ["La O.", "Un círculo redondo."],
  { emoji: "🐻", word: "Oso" });

const Uu = letter("U", "curvas", 2,
  [[
    "s1",
    "bajó y subió",
    [
      ln(U, TOP, U, 0.62),
      ar(0.5, 0.62, 0.34, 0.24, Math.PI, Math.PI, true),
      ln(0.84, 0.62, 0.84, TOP),
    ],
  ]],
  ["La U.", "Bajas, curvas por abajo y subes."],
  { emoji: "🍇", word: "Uvas" });

const S = letter("S", "curvas", 2,
  [[
    "s1",
    "serpiente",
    [
      ar(0.47, 0.33, 0.28, 0.2, -Math.PI / 4, Math.PI * 1.25, true),
      ar(0.51, 0.67, 0.28, 0.2, -Math.PI / 2, Math.PI * 1.25, false),
    ],
  ]],
  ["La S.", "Como una serpiente."],
  { emoji: "☀️", word: "Sol" });

/* ---------------- FAMILIA 4 · CURVAS + LÍNEAS ---------------- */

const D = letter("D", "curvas y líneas", 2,
  [
    ["s1", "la pared", [ln(U, TOP, U, BOT)]],
    ["s2", "la barriga", [ar(0.16, MID, 0.68, 0.36, -Math.PI / 2, Math.PI)]],
  ],
  ["La D.", "Una pared y una barriga."],
  { emoji: "🐬", word: "Dado" });

const G = letter("G", "curvas y líneas", 3,
  [
    ["s1", "la barriga", [ar(0.5, MID, 0.34, 0.34, -Math.PI / 4, Math.PI * 1.75, true)]],
    ["s2", "la patita", [ln(0.84, MID, 0.84, 0.72)]],
    ["s3", "el rabillo", [ln(0.84, 0.72, 0.66, 0.72)]],
  ],
  ["La G.", "Una C con una patita."],
  { emoji: "🍪", word: "Galleta" });

const P = letter("P", "curvas y líneas", 2,
  [
    ["s1", "la pared", [ln(U, TOP, U, BOT)]],
    ["s2", "la barriga", [ar(0.16, 0.37, 0.48, 0.23, -Math.PI / 2, Math.PI)]],
  ],
  ["La P.", "Una pared y una barriga arriba."],
  { emoji: "🐧", word: "Pelota" });

const R = letter("R", "curvas y líneas", 3,
  [
    ["s1", "la pared", [ln(U, TOP, U, BOT)]],
    ["s2", "la barriga", [ar(0.16, 0.37, 0.48, 0.23, -Math.PI / 2, Math.PI)]],
    ["s3", "la pata", [ln(0.44, 0.56, 0.74, BOT)]],
  ],
  ["La R.", "Como la P, con una pata."],
  { emoji: "🤖", word: "Ratón" });

const J = letter("J", "curvas y líneas", 2,
  [[
    "s1",
    "el gancho",
    [ln(0.84, TOP, 0.84, 0.6), qd(0.84, 0.6, 0.86, 0.92, 0.34, 0.86)],
  ]],
  ["La J.", "Bajas y haces un gancho."],
  { emoji: "🦒", word: "Jirafa" });

/* ---------------- FAMILIA 5 · COMPLEJAS ---------------- */

const B = letter("B", "complejas", 3,
  [
    ["s1", "la pared", [ln(U, TOP, U, BOT)]],
    ["s2", "barriga de arriba", [ar(0.16, 0.36, 0.46, 0.22, -Math.PI / 2, Math.PI)]],
    ["s3", "barriga de abajo", [ar(0.16, 0.64, 0.54, 0.22, -Math.PI / 2, Math.PI)]],
  ],
  ["La B.", "Una pared y dos barrigas."],
  { emoji: "⛵", word: "Barco" });

const M = letter("M", "complejas", 3,
  [
    ["s1", "pata izquierda", [ln(U, TOP, U, BOT)]],
    ["s2", "primera montaña", [ln(U, TOP, 0.5, 0.62)]],
    ["s3", "segunda montaña", [ln(0.5, 0.62, 0.84, TOP)]],
    ["s4", "pata derecha", [ln(0.84, TOP, 0.84, BOT)]],
  ],
  ["La M.", "Dos patas y dos montañas."],
  { emoji: "🍎", word: "Manzana" });

const N = letter("N", "complejas", 2,
  [
    ["s1", "pata izquierda", [ln(U, TOP, U, BOT)]],
    ["s2", "la diagonal", [ln(U, BOT, 0.84, TOP)]],
    ["s3", "pata derecha", [ln(0.84, TOP, 0.84, BOT)]],
  ],
  ["La N.", "Abajo, arriba y abajo."],
  { emoji: "☁️", word: "Nube" });

const Q = letter("Q", "complejas", 3,
  [
    ["s1", "círculo redondo", [ar(0.5, MID, 0.34, 0.34, -Math.PI / 2, Math.PI * 2)]],
    ["s2", "la colita", [ln(0.62, 0.68, 0.8, 0.9)]],
  ],
  ["La Q.", "Una O con una colita."],
  { emoji: "🧀", word: "Queso" });

/* Ñ — letra independiente del alfabeto español (FDD §3) */
const ENYE = letter("Ñ", "complejas", 3,
  [
    ["s1", "pata izquierda", [ln(U, TOP, U, BOT)]],
    ["s2", "la diagonal", [ln(U, BOT, 0.84, TOP)]],
    ["s3", "pata derecha", [ln(0.84, TOP, 0.84, BOT)]],
    ["s4", "el sombrerito", [wv(0.28, 0.26, 0.72, 0.26, 0.06, 1.5)]],
  ],
  ["La Ñ.", "Como la N, con un sombrerito."],
  { emoji: "🐦", word: "Niño" });

export const PHASE_C_LETTERS: ResourceDef[] = [
  I, Le, T, E, F, H,
  A, V, W, X, Y, K, Z,
  C, O, S, Uu,
  D, G, P, R, J,
  B, M, N, Q,
  ENYE,
];
