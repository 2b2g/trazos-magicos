import { ResourceDef } from "../engine/types";
import { PHASE_A_STROKES } from "./strokesPhaseA";
import { PHASE_B_SHAPES } from "./shapesPhaseB";
import { PHASE_C_LETTERS } from "./lettersPhaseC";
import { PHASE_D_NUMBERS } from "./numbersPhaseD";

/** Todos los recursos del MVP ordenados por fase pedagógica. */
export const ALL_RESOURCES: ResourceDef[] = [
  ...PHASE_A_STROKES,
  ...PHASE_B_SHAPES,
  ...PHASE_C_LETTERS,
  ...PHASE_D_NUMBERS,
];

export function resourcesOfPhase(phase: "A" | "B" | "C" | "D"): ResourceDef[] {
  var out: ResourceDef[] = [];
  for (var i = 0; i < ALL_RESOURCES.length; i++) {
    if (ALL_RESOURCES[i].phase === phase) out.push(ALL_RESOURCES[i]);
  }
  return out;
}

export function findResource(id: string): ResourceDef | null {
  for (var i = 0; i < ALL_RESOURCES.length; i++) {
    if (ALL_RESOURCES[i].id === id) return ALL_RESOURCES[i];
  }
  return null;
}
