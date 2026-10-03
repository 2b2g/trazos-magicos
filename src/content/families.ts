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
  "complejas": { id: "complejas", name: "Complejas", emoji: "🌀" },
  "ondas": { id: "ondas", name: "Ondas", emoji: "🌊" },
  "zigzag": { id: "zigzag", name: "Zigzag", emoji: "⚡" },
  "números": { id: "números", name: "Números", emoji: "🔢" },
};

export interface PhaseInfo {
  id: "A" | "B" | "C" | "D";
  name: string;
  /** Clave de la ficha de categoría (`ui/categories.ts`): el dibujo que
      el niño ve en la pestaña del mapa. Antes era un emoji (✏️ 🔷 🔤 🔢),
      pero 🔤 y 🔷 son el mismo tipo de dibujo y no decían nada de la
      fase; la ficha lleva su propio color y su propio pictograma. */
  cat: string;
  subtitle: string;
}

export const PHASES: PhaseInfo[] = [
  { id: "A", name: "Primeros trazos", cat: "trazos", subtitle: "Líneas, curvas, ondas y zigzag" },
  { id: "B", name: "Formas y patrones", cat: "figuras", subtitle: "Cruces, colinas, casitas y estrellas" },
  { id: "C", name: "El Abecedario Mágico", cat: "letras", subtitle: "Mayúsculas de la A a la Ñ" },
  { id: "D", name: "Los Números Mágicos", cat: "numeros", subtitle: "Del 0 al 9 contando estrellas" },
];
