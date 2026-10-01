import { ResourceDef } from "../engine/types";

/* FASE A — trazos básicos (FDD §56). Movimientos previos a la letra. */

export const PHASE_A_STROKES: ResourceDef[] = [
  {
    id: "line-vertical",
    kind: "stroke",
    label: "Línea hacia abajo",
    char: "↓",
    phase: "A",
    family: "líneas",
    difficulty: 1,
    strokes: [
      {
        id: "s1",
        label: "hacia abajo",
        segments: [{ kind: "line", a: { x: 0.5, y: 0.12 }, b: { x: 0.5, y: 0.88 } }],
      },
    ],
    speech: ["Vamos a hacer una línea hacia abajo.", "Empieza aquí arriba y baja."],
  },
  {
    id: "line-horizontal",
    kind: "stroke",
    label: "Línea hacia la derecha",
    char: "→",
    phase: "A",
    family: "líneas",
    difficulty: 1,
    strokes: [
      {
        id: "s1",
        label: "hacia la derecha",
        segments: [{ kind: "line", a: { x: 0.12, y: 0.5 }, b: { x: 0.88, y: 0.5 } }],
      },
    ],
    speech: ["Una línea hacia la derecha.", "Empieza aquí y ve a la derecha."],
  },
  {
    id: "curve-down-up",
    kind: "stroke",
    label: "Curva hacia abajo y arriba",
    char: "∪",
    phase: "A",
    family: "curvas",
    difficulty: 1,
    strokes: [
      {
        id: "s1",
        label: "curva",
        segments: [
          {
            kind: "quad",
            a: { x: 0.15, y: 0.2 },
            cp: { x: 0.5, y: 0.95 },
            b: { x: 0.85, y: 0.2 },
          },
        ],
      },
    ],
    speech: ["Una curva que baja y sube.", "Como una sonrisa muy grande."],
  },
  {
    id: "curve-up-down",
    kind: "stroke",
    label: "Curva hacia arriba y abajo",
    char: "∩",
    phase: "A",
    family: "curvas",
    difficulty: 1,
    strokes: [
      {
        id: "s1",
        label: "curva",
        segments: [
          {
            kind: "quad",
            a: { x: 0.15, y: 0.8 },
            cp: { x: 0.5, y: 0.05 },
            b: { x: 0.85, y: 0.8 },
          },
        ],
      },
    ],
    speech: ["Una curva que sube y baja.", "Como una colina."],
  },
  {
    id: "wave-3",
    kind: "stroke",
    label: "Onda",
    char: "∿",
    phase: "A",
    family: "ondas",
    difficulty: 2,
    strokes: [
      {
        id: "s1",
        label: "onda",
        segments: [
          {
            kind: "wave",
            a: { x: 0.1, y: 0.5 },
            b: { x: 0.9, y: 0.5 },
            amp: 0.16,
            waves: 3,
          },
        ],
      },
    ],
    speech: ["Una onda del mar.", "Arriba, abajo, arriba, abajo."],
  },
  {
    id: "zigzag-4",
    kind: "stroke",
    label: "Zigzag",
    char: "⚡",
    phase: "A",
    family: "zigzag",
    difficulty: 2,
    strokes: [
      {
        id: "s1",
        label: "zigzag",
        segments: [
          {
            kind: "zigzag",
            a: { x: 0.1, y: 0.5 },
            b: { x: 0.9, y: 0.5 },
            amp: 0.2,
            teeth: 4,
          },
        ],
      },
    ],
    speech: ["Un zigzag como rayo.", "Abajo, arriba, abajo, arriba."],
  },
  {
    id: "circle",
    kind: "stroke",
    label: "Círculo",
    char: "○",
    phase: "A",
    family: "curvas",
    difficulty: 2,
    strokes: [
      {
        id: "s1",
        label: "círculo",
        segments: [
          {
            kind: "arc",
            cx: 0.5,
            cy: 0.5,
            rx: 0.36,
            ry: 0.36,
            start: -Math.PI / 2,
            end: (3 * Math.PI) / 2,
            ccw: true,
          },
        ],
      },
    ],
    speech: ["Un círculo redondo.", "Da una vuelta completa."],
  },
  {
    id: "cross-diagonal",
    kind: "stroke",
    label: "Cruz diagonal",
    char: "✕",
    phase: "A",
    family: "diagonales",
    difficulty: 2,
    strokes: [
      {
        id: "d1",
        label: "de arriba izquierda a abajo derecha",
        segments: [{ kind: "line", a: { x: 0.15, y: 0.15 }, b: { x: 0.85, y: 0.85 } }],
      },
      {
        id: "d2",
        label: "de arriba derecha a abajo izquierda",
        segments: [{ kind: "line", a: { x: 0.85, y: 0.15 }, b: { x: 0.15, y: 0.85 } }],
      },
    ],
    speech: ["Dos diagonales que se cruzan.", "Primero una, luego la otra."],
  },
];
