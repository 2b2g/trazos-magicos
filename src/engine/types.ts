/* Motor de trazado — tipos fundamentales.
   Un "recurso" (trazo, forma, letra, número) se define como datos:
   lista de trazos ordenados, cada uno con segmentos geométricos. */

export interface Vec2 {
  x: number;
  y: number;
}

export type SegmentKind =
  | "line"
  | "quad"
  | "cubic"
  | "arc"
  | "wave"
  | "zigzag";

/** Segmento en coordenadas normalizadas 0..1 (se escalan al lienzo). */
export interface Segment {
  kind: SegmentKind;
  /** line/wave/zigzag: extremos. quad/cubic: también puntos de control. */
  a?: Vec2;
  b?: Vec2;
  cp?: Vec2; // quad
  cp1?: Vec2; // cubic
  cp2?: Vec2; // cubic
  /** arc: centro, radios, ángulos en radianes (0 = derecha, y+ hacia abajo). */
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  start?: number;
  end?: number;
  /** Barrido explícito en radianes (siempre > 0); dir la marca ccw. */
  sweep?: number;
  ccw?: boolean;
  /** wave/zigzag */
  amp?: number;
  waves?: number;
  teeth?: number;
}

export interface StrokeDef {
  id: string;
  /** Etiqueta hablada corta, p. ej. "trazo hacia abajo". */
  label?: string;
  segments: Segment[];
  /** Orden alternativo permitido para este recurso (lista de ids de trazo). */
  altAfter?: string[];
}

export type ResourceKind = "stroke" | "shape" | "letter" | "number";

export interface ResourceDef {
  id: string;
  kind: ResourceKind;
  label: string; // "La letra A"
  char?: string; // glifo mostrado
  phase: "A" | "B" | "C" | "D";
  family?: string; // familia motora
  case?: "uppercase" | "lowercase" | "none";
  strokes: StrokeDef[];
  /** Frases TTS al presentar el recurso. */
  speech?: string[];
  /** Emoji del significado (letra-sonido / número-cantidad). */
  meaningEmoji?: string;
  meaningWord?: string;
  /** Cantidad para números (relación símbolo → cantidad). */
  count?: number;
  countEmoji?: string;
  /** Órdenes de trazado alternativos permitidos (FDD §7): cada entrada es una lista de ids de trazo. */
  altOrders?: string[][];
  /** Opciones para el desafío "encuentra la X". */
  findDistractors?: string[];
  /** Dificultad 1..3 → tolerancia y velocidad de demo. */
  difficulty?: 1 | 2 | 3;
}

/** Trazo dibujado por el niño (muestras en coordenadas de lienzo). */
export interface UserStroke {
  points: Vec2[];
}

export interface StrokeEvaluation {
  strokeId: string;
  /** 0..100 — cobertura del camino ideal dentro de la tolerancia. */
  coverage: number;
  /** 0..100 — precisión media de los puntos frente al camino ideal. */
  accuracy: number;
  /** El trazo empieza por el punto correcto. */
  startOk: boolean;
  /** La dirección global es la esperada. */
  directionOk: boolean;
  /** Aprobado según los umbrales dados. */
  passed: boolean;
  /** Distancia media en px (coordenadas de lienzo). */
  avgDist: number;
}

export interface EvaluationOptions {
  /** Tolerancia en px del corredor de aceptación. */
  tol: number;
  /** Cobertura mínima 0..1 para aprobar. */
  minCoverage: number;
  /** Precisión mínima 0..100 para aprobar. */
  minAccuracy: number;
  /** Exigir punto de inicio correcto. */
  checkStart: boolean;
  /** Exigir dirección global correcta. */
  checkDirection: boolean;
}
