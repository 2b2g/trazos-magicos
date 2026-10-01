import { ResourceDef } from "../engine/types";

/* FASE B — formas y patrones (FDD §56). Secuencias de trazos ordenados. */

export const PHASE_B_SHAPES: ResourceDef[] = [
  {
    id: "shape-plus",
    kind: "shape",
    label: "La cruz",
    char: "✚",
    phase: "B",
    family: "líneas",
    difficulty: 1,
    strokes: [
      {
        id: "v",
        label: "línea hacia abajo",
        segments: [{ kind: "line", a: { x: 0.5, y: 0.12 }, b: { x: 0.5, y: 0.88 } }],
      },
      {
        id: "h",
        label: "línea hacia la derecha",
        segments: [{ kind: "line", a: { x: 0.12, y: 0.5 }, b: { x: 0.88, y: 0.5 } }],
      },
    ],
    speech: ["Una cruz.", "Primero hacia abajo, luego hacia la derecha."],
  },
  {
    id: "shape-hill",
    kind: "shape",
    label: "La colina",
    char: "⌒",
    phase: "B",
    family: "curvas",
    difficulty: 1,
    strokes: [
      {
        id: "s1",
        label: "sube, curva y baja",
        segments: [
          { kind: "line", a: { x: 0.15, y: 0.85 }, b: { x: 0.15, y: 0.55 } },
          { kind: "quad", a: { x: 0.15, y: 0.55 }, cp: { x: 0.5, y: 0.05 }, b: { x: 0.85, y: 0.55 } },
          { kind: "line", a: { x: 0.85, y: 0.55 }, b: { x: 0.85, y: 0.85 } },
        ],
      },
    ],
    speech: ["Una colina.", "Subes, pasas por arriba y bajas."],
  },
  {
    id: "shape-triangle",
    kind: "shape",
    label: "El triángulo",
    char: "△",
    phase: "B",
    family: "diagonales",
    difficulty: 2,
    strokes: [
      {
        id: "left",
        label: "diagonal hacia abajo izquierda",
        segments: [{ kind: "line", a: { x: 0.5, y: 0.12 }, b: { x: 0.12, y: 0.85 } }],
      },
      {
        id: "right",
        label: "diagonal hacia abajo derecha",
        segments: [{ kind: "line", a: { x: 0.5, y: 0.12 }, b: { x: 0.88, y: 0.85 } }],
      },
      {
        id: "bottom",
        label: "línea hacia la derecha",
        segments: [{ kind: "line", a: { x: 0.12, y: 0.85 }, b: { x: 0.88, y: 0.85 } }],
      },
    ],
    speech: ["Un triángulo.", "Dos diagonales y una línea base."],
  },
  {
    id: "shape-square",
    kind: "shape",
    label: "El cuadrado",
    char: "□",
    phase: "B",
    family: "líneas",
    difficulty: 2,
    strokes: [
      {
        id: "top",
        label: "hacia la derecha",
        segments: [{ kind: "line", a: { x: 0.15, y: 0.15 }, b: { x: 0.85, y: 0.15 } }],
      },
      {
        id: "right",
        label: "hacia abajo",
        segments: [{ kind: "line", a: { x: 0.85, y: 0.15 }, b: { x: 0.85, y: 0.85 } }],
      },
      {
        id: "bottom",
        label: "hacia la izquierda",
        segments: [{ kind: "line", a: { x: 0.85, y: 0.85 }, b: { x: 0.15, y: 0.85 } }],
      },
      {
        id: "left",
        label: "hacia arriba",
        segments: [{ kind: "line", a: { x: 0.15, y: 0.85 }, b: { x: 0.15, y: 0.15 } }],
      },
    ],
    speech: ["Un cuadrado.", "Derecha, abajo, izquierda y arriba."],
  },
  {
    id: "shape-house",
    kind: "shape",
    label: "La casita",
    char: "🏠",
    phase: "B",
    family: "combinadas",
    difficulty: 3,
    strokes: [
      {
        id: "roof",
        label: "techo",
        segments: [
          { kind: "line", a: { x: 0.12, y: 0.42 }, b: { x: 0.5, y: 0.1 } },
          { kind: "line", a: { x: 0.5, y: 0.1 }, b: { x: 0.88, y: 0.42 } },
        ],
      },
      {
        id: "left-wall",
        label: "pared izquierda",
        segments: [{ kind: "line", a: { x: 0.2, y: 0.42 }, b: { x: 0.2, y: 0.88 } }],
      },
      {
        id: "floor",
        label: "suelo",
        segments: [{ kind: "line", a: { x: 0.2, y: 0.88 }, b: { x: 0.8, y: 0.88 } }],
      },
      {
        id: "right-wall",
        label: "pared derecha",
        segments: [{ kind: "line", a: { x: 0.8, y: 0.88 }, b: { x: 0.8, y: 0.42 } }],
      },
    ],
    speech: ["Una casita.", "El techo, las paredes y el suelo."],
  },
  {
    id: "shape-star4",
    kind: "shape",
    label: "La estrella",
    char: "⭐",
    phase: "B",
    family: "diagonales",
    difficulty: 3,
    strokes: [
      {
        id: "star",
        label: "estrella de cuatro puntas",
        segments: [
          { kind: "line", a: { x: 0.5, y: 0.08 }, b: { x: 0.62, y: 0.42 } },
          { kind: "line", a: { x: 0.62, y: 0.42 }, b: { x: 0.92, y: 0.5 } },
          { kind: "line", a: { x: 0.92, y: 0.5 }, b: { x: 0.62, y: 0.58 } },
          { kind: "line", a: { x: 0.62, y: 0.58 }, b: { x: 0.5, y: 0.92 } },
          { kind: "line", a: { x: 0.5, y: 0.92 }, b: { x: 0.38, y: 0.58 } },
          { kind: "line", a: { x: 0.38, y: 0.58 }, b: { x: 0.08, y: 0.5 } },
          { kind: "line", a: { x: 0.08, y: 0.5 }, b: { x: 0.38, y: 0.42 } },
          { kind: "line", a: { x: 0.38, y: 0.42 }, b: { x: 0.5, y: 0.08 } },
        ],
      },
    ],
    speech: ["Una estrella mágica.", "Punta a punta, sin levantar el dedo."],
  },
];
