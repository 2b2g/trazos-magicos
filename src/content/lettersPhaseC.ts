import { ResourceDef } from "../engine/types";
import {
  BAR,
  BASE,
  CAP,
  CX,
  GUIDE_LINES,
  L,
  R,
  XH,
  arcDeg,
  bowl,
  cBody,
  cb,
  diagX,
  ln,
  ring,
} from "./writingBox";

/* FASE C — El Abecedario Mágico: 27 mayúsculas (incluida Ñ), organizadas
   por familias motoras (FDD §11–12). Primero las fáciles.

   Todas las grafías se construyen con la métrica de `writingBox.ts`
   (misma ceja, misma base, mismos ejes) y con curvas de verdad: cada
   barra o pata que se une a otra se apoya en el punto exacto donde
   se encuentran, calculado y no estimado. */

function letter(
  char: string,
  family: string,
  difficulty: 1 | 2 | 3,
  strokeList: Array<[string, string, ResourceDef["strokes"][number]["segments"]]>,
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
    guideLines: GUIDE_LINES,
  };
}

/* ---------------- FAMILIA 1 · LÍNEAS ---------------- */

/* La I es un palo CENTRADO: antes iba pegada al margen izquierdo y
   parecía una-raya suelta, no una letra. */
const I = letter("I", "líneas", 1,
  [["s1", "hacia abajo", [ln(CX, CAP, CX, BASE)]]],
  ["La I.", "Una línea hacia abajo."],
  { emoji: "🪁", word: "Isla" });

const Le = letter("L", "líneas", 1,
  [
    ["s1", "hacia abajo", [ln(L, CAP, L, BASE)]],
    ["s2", "hacia la derecha", [ln(L, BASE, BAR, BASE)]],
  ],
  ["La L.", "Abajo y luego a la derecha."],
  { emoji: "🌙", word: "Luna" });

const T = letter("T", "líneas", 1,
  [
    ["s1", "el techo", [ln(0.22, CAP, 0.78, CAP)]],
    ["s2", "la pata", [ln(CX, CAP, CX, BASE)]],
  ],
  ["La T.", "Primero el techo, luego la pata."],
  { emoji: "🐢", word: "Tortuga" });

const E = letter("E", "líneas", 1,
  [
    ["s1", "la espalda", [ln(L, CAP, L, BASE)]],
    ["s2", "el techo", [ln(L, CAP, BAR, CAP)]],
    ["s3", "la barriga", [ln(L, XH, 0.62, XH)]],
    ["s4", "la pata", [ln(L, BASE, BAR, BASE)]],
  ],
  ["La E.", "La espalda y tres barras."],
  { emoji: "🐘", word: "Elefante" });

const F = letter("F", "líneas", 1,
  [
    ["s1", "la espalda", [ln(L, CAP, L, BASE)]],
    ["s2", "el techo", [ln(L, CAP, BAR, CAP)]],
    ["s3", "la barriga", [ln(L, XH, 0.62, XH)]],
  ],
  ["La F.", "Como la E, pero sin pata."],
  { emoji: "🌸", word: "Flor" });

const H = letter("H", "líneas", 2,
  [
    ["s1", "pata izquierda", [ln(L, CAP, L, BASE)]],
    ["s2", "pata derecha", [ln(R, CAP, R, BASE)]],
    ["s3", "el puente", [ln(L, XH, R, XH)]],
  ],
  ["La H.", "Dos patas y un puente."],
  { emoji: "🧊", word: "Hielo" });

/* ---------------- FAMILIA 2 · DIAGONALES ---------------- */

/* La barra de la A se calculates sobre las diagonales: antes iba de
   0.28 a 0.72 y se salía de la letra por los dos lados. */
const A_BAR_Y = 0.58;

const A = letter("A", "diagonales", 2,
  [
    ["s1", "diagonal izquierda", [ln(L, BASE, CX, CAP)]],
    ["s2", "diagonal derecha", [ln(CX, CAP, R, BASE)]],
    ["s3", "la barriga", [ln(diagX(A_BAR_Y, CX, L), A_BAR_Y, diagX(A_BAR_Y, CX, R), A_BAR_Y)]],
  ],
  ["La A.", "Dos diagonales y una barriga."],
  { emoji: "✈️", word: "Avión" },
  [["s1", "s2", "s3"], ["s2", "s1", "s3"]]);

const V = letter("V", "diagonales", 1,
  [
    ["s1", "baja", [ln(L, CAP, CX, BASE)]],
    ["s2", "sube", [ln(CX, BASE, R, CAP)]],
  ],
  ["La V.", "Baja y sube, como un valle."],
  { emoji: "🐄", word: "Vaca" });

/* Las dos valleys del W son simétricas respecto al centro. */
const W = letter("W", "diagonales", 2,
  [
    ["s1", "baja", [ln(L, CAP, 0.37, BASE)]],
    ["s2", "sube", [ln(0.37, BASE, CX, CAP)]],
    ["s3", "baja", [ln(CX, CAP, 0.63, BASE)]],
    ["s4", "sube", [ln(0.63, BASE, R, CAP)]],
  ],
  ["La W.", "Dos valles seguidos."],
  { emoji: "🍉", word: "Sandía" },
  [["s1", "s2", "s3", "s4"], ["s4", "s3", "s2", "s1"]]);

const X = letter("X", "diagonales", 2,
  [
    ["s1", "cruza", [ln(L, CAP, R, BASE)]],
    ["s2", "cruza", [ln(R, CAP, L, BASE)]],
  ],
  ["La X.", "Dos rayitas cruzadas."],
  { emoji: "🎵", word: "Xilófono" },
  [["s1", "s2"], ["s2", "s1"]]);

/* La Y se junta en el punto medio exacto de la altura de barras. */
const Y = letter("Y", "diagonales", 2,
  [
    ["s1", "brazo izquierdo", [ln(L, CAP, CX, XH)]],
    ["s2", "brazo derecho", [ln(R, CAP, CX, XH)]],
    ["s3", "la pata", [ln(CX, XH, CX, BASE)]],
  ],
  ["La Y.", "Dos brazos y una pata."],
  { emoji: "🥛", word: "Yogur" });

/* La K: las dos ramas nacen en el MISMO punto de la columna. */
const K_JUNCTION_Y = 0.46;
const K_ARM_X = 0.7;

const K = letter("K", "diagonales", 2,
  [
    ["s1", "la espalda", [ln(L, CAP, L, BASE)]],
    [
      "s2",
      "el brazo abierto",
      [ln(K_ARM_X, CAP, L, K_JUNCTION_Y), ln(L, K_JUNCTION_Y, K_ARM_X, BASE)],
    ],
  ],
  ["La K.", "Una pared y un brazo que abre y cierra."],
  { emoji: "🐨", word: "Koala" },
  [["s1", "s2"], ["s2", "s1"]]);

/* La Z es un solo trazo continuo de tres tramos. */
const Z = letter("Z", "diagonales", 2,
  [[
    "s1",
    "el rayo",
    [ln(L, CAP, R, CAP), ln(R, CAP, L, BASE), ln(L, BASE, R, BASE)],
  ]],
  ["La Z.", "Como un rayo: arriba, diagonal y base."],
  { emoji: "🦊", word: "Zorro" });

/* ---------------- FAMILIA 3 · CURVAS ---------------- */

/* C: arco de 270° que abre 90°, con la altura exacta de la mayúscula. */
const C = letter("C", "curvas", 1,
  [["s1", "curva que abraza", [cBody()]]],
  ["La C.", "Una curva que abraza."],
  { emoji: "🏠", word: "Casa" });

/* O: elipse de 0.56 × 0.68 (más alta que ancha, como una letra). */
const O = letter("O", "curvas", 1,
  [["s1", "círculo redondo", [ring(CX, XH, 0.28, (BASE - CAP) / 2)]]],
  ["La O.", "Un círculo redondo."],
  { emoji: "🐻", word: "Oso" });

/* U: los dos palos y el arco de abajo se tocan en los mismos puntos. */
const U_ARC_Y = 0.62;

const Uu = letter("U", "curvas", 2,
  [[
    "s1",
    "bajó y subió",
    [
      ln(L, CAP, L, U_ARC_Y),
      arcDeg(CX, U_ARC_Y, 0.26, BASE - U_ARC_Y, 180, 180, true),
      ln(R, U_ARC_Y, R, CAP),
    ],
  ]],
  ["La U.", "Bajas, curvas por abajo y subes."],
  { emoji: "🍇", word: "Uvas" });

/* S: dos medios arcos reales que se encuentran en (0.5, 0.5) y whose
   cola apoya justo en la línea base. */
const S = letter("S", "curvas", 2,
  [[
    "s1",
    "serpiente",
    [
      arcDeg(CX, 0.33, 0.24, 0.17, -30, 240, true),
      arcDeg(CX, 0.67, 0.24, 0.17, -90, 180, false),
    ],
  ]],
  ["La S.", "Como una serpiente."],
  { emoji: "☀️", word: "Sol" });

/* ---------------- FAMILIA 4 · CURVAS + LÍNEAS ---------------- */

/* D: pared + media elipse que arranca y acaba en la pared. */
const D = letter("D", "curvas y líneas", 2,
  [
    ["s1", "la pared", [ln(L, CAP, L, BASE)]],
    ["s2", "la barriga", [bowl(L, CAP, BASE, 0.44)]],
  ],
  ["La D.", "Una pared y una barriga."],
  { emoji: "🐬", word: "Dado" });

/* G: cuerpo de C + pata vertical + rabillo horizontal, unidos. */
const G_STEM_X = 0.7;
const G_STEM_TOP = 0.54;

const G = letter("G", "curvas y líneas", 3,
  [
    ["s1", "la barriga", [cBody()]],
    ["s2", "la patita", [ln(0.698, 0.74, G_STEM_X, G_STEM_TOP)]],
    ["s3", "el rabillo", [ln(G_STEM_X, G_STEM_TOP, 0.5, G_STEM_TOP)]],
  ],
  ["La G.", "Una C con una patita."],
  { emoji: "🍪", word: "Galleta" });

/* P y R: la barriga va de la ceja a la altura de barras. */
const BOWL_XH = 0.4;

const P = letter("P", "curvas y líneas", 2,
  [
    ["s1", "la pared", [ln(L, CAP, L, BASE)]],
    ["s2", "la barriga", [bowl(L, CAP, XH, BOWL_XH)]],
  ],
  ["La P.", "Una pared y una barriga arriba."],
  { emoji: "🐧", word: "Pelota" });

/* La pata de la R nace en la unión exacta de la barriga con la pared.
   La constante se llama `Rlet` porque `R` es el eje derecho de la caja
   de escritura importado de `writingBox`. */
const Rlet = letter("R", "curvas y líneas", 3,
  [
    ["s1", "la pared", [ln(L, CAP, L, BASE)]],
    ["s2", "la barriga", [bowl(L, CAP, XH, BOWL_XH)]],
    ["s3", "la pata", [ln(L, XH, 0.7, BASE)]],
  ],
  ["La R.", "Como la P, con una pata."],
  { emoji: "🤖", word: "Ratón" });

/* J: palo + gancho de media circunferencia exacta. */
const J_HOOK_Y = 0.68;
const J_STEM_X = 0.68;

const J = letter("J", "curvas y líneas", 2,
  [[
    "s1",
    "el gancho",
    [ln(J_STEM_X, CAP, J_STEM_X, J_HOOK_Y), arcDeg(0.52, J_HOOK_Y, 0.16, 0.16, 0, 180, false)],
  ]],
  ["La J.", "Bajas y haces un gancho."],
  { emoji: "🦒", word: "Jirafa" });

/* ---------------- FAMILIA 5 · COMPLEJAS ---------------- */

/* B: la barriga de abajo es más ancha que la de arriba, como en las
   tipografías reales. */
const B = letter("B", "complejas", 3,
  [
    ["s1", "la pared", [ln(L, CAP, L, BASE)]],
    ["s2", "barriga de arriba", [bowl(L, CAP, XH, 0.38)]],
    ["s3", "barriga de abajo", [bowl(L, XH, BASE, 0.46)]],
  ],
  ["La B.", "Una pared y dos barrigas."],
  { emoji: "⛵", word: "Barco" });

/* M: los valles bajan solo hasta un poco más de la mitad. */
const M_VALLEY_Y = 0.58;

const M = letter("M", "complejas", 3,
  [
    ["s1", "pata izquierda", [ln(L, CAP, L, BASE)]],
    ["s2", "primera montaña", [ln(L, CAP, CX, M_VALLEY_Y)]],
    ["s3", "segunda montaña", [ln(CX, M_VALLEY_Y, R, CAP)]],
    ["s4", "pata derecha", [ln(R, CAP, R, BASE)]],
  ],
  ["La M.", "Dos patas y dos montañas."],
  { emoji: "🍎", word: "Manzana" });

/* N: la diagonal va de la ceja izquierda a la base derecha, que es
   como se escribe (antes iba al revés y la voz describía mal). */
const N = letter("N", "complejas", 2,
  [
    ["s1", "pata izquierda", [ln(L, CAP, L, BASE)]],
    ["s2", "la diagonal", [ln(L, CAP, R, BASE)]],
    ["s3", "pata derecha", [ln(R, CAP, R, BASE)]],
  ],
  ["La N.", "Dos patas y una diagonal."],
  { emoji: "☁️", word: "Nube" });

/* Q: la vuelta se pasa por dentro y la colita cruza la base. */
const Q = letter("Q", "complejas", 3,
  [
    ["s1", "círculo redondo", [ring(CX, XH, 0.28, (BASE - CAP) / 2)]],
    ["s2", "la colita", [ln(0.66, 0.68, 0.8, 0.9)]],
  ],
  ["La Q.", "Una O con una colita."],
  { emoji: "🧀", word: "Queso" });

/* Ñ: como la N, y la "~" POR ENCIMA de la ceja (antes caía dentro). */
const ENYE = letter("Ñ", "complejas", 3,
  [
    ["s1", "pata izquierda", [ln(L, CAP, L, BASE)]],
    ["s2", "la diagonal", [ln(L, CAP, R, BASE)]],
    ["s3", "pata derecha", [ln(R, CAP, R, BASE)]],
    ["s4", "el sombrerito", [cb(0.3, 0.105, 0.38, 0.055, 0.62, 0.155, 0.7, 0.105)]],
  ],
  ["La Ñ.", "Como la N, con un sombrerito."],
  { emoji: "🐦", word: "Niño" });

export const PHASE_C_LETTERS: ResourceDef[] = [
  I, Le, T, E, F, H,
  A, V, W, X, Y, K, Z,
  C, O, S, Uu,
  D, G, P, Rlet, J,
  B, M, N, Q,
  ENYE,
];