/* Organización pedagógica configurable (FDD §12): las fases y familias
   definen el orden del mapa, no el orden alfabético. */

export interface FamilyInfo {
  id: string;
  name: string;
  emoji: string;
}

export const FAMILIES: Record<string, FamilyInfo> = {
  "líneas": { id: "líneas", name: "Líneas", emoji: "📏" },
  "diagonales": { id: "diagonales", name: "Diagonales", emoji: "❌" },
  "curvas": { id: "curvas", name: "Curvas", emoji: "🌙" },
  "curvas y líneas": { id: "curvas y líneas", name: "Curvas y líneas", emoji: "🔄" },
  "complejas": { id: "complejas", name: "Complejas", emoji: "🧩" },
  "ondas": { id: "ondas", name: "Ondas", emoji: "🌊" },
  "zigzag": { id: "zigzag", name: "Zigzag", emoji: "⚡" },
  "números": { id: "números", name: "Números", emoji: "🔢" },
};

export interface PhaseInfo {
  id: "A" | "B" | "C" | "D";
  name: string;
  emoji: string;
  subtitle: string;
}

export const PHASES: PhaseInfo[] = [
  { id: "A", name: "Trazos mágicos", emoji: "✏️", subtitle: "Líneas, curvas, ondas y zigzag" },
  { id: "B", name: "Formas y patrones", emoji: "🔷", subtitle: "Cruces, colinas, casitas y estrellas" },
  { id: "C", name: "El Abecedario Mágico", emoji: "🔤", subtitle: "Mayúsculas de la A a la Ñ" },
  { id: "D", name: "Los Números Mágicos", emoji: "🔢", subtitle: "Del 0 al 9 contando estrellas" },
];
