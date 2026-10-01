/* Evaluación de trazos: mide cuánto del camino ideal cubrió el niño,
   con qué precisión, y si respetó punto de inicio y dirección.
   Los umbrales por defecto son generosos: en 3–6 años el objetivo es
   que el éxito sea frecuente y el error nunca castigue. */

import { EvaluationOptions, StrokeDef, StrokeEvaluation, Vec2 } from "./types";
import { sampleStroke, resampleUniform, pathLength } from "./sampling";
import { dist, clamp } from "./geom";

export const DEFAULT_EVAL: EvaluationOptions = {
  tol: 26,
  minCoverage: 0.6,
  minAccuracy: 60,
  checkStart: false,
  checkDirection: false,
};

/** Evaluación indulgente para las fases A/B (trazos libres).
    minCoverage 0.65: la mitad de un trazo NO aprueba. Con tolerancia 34 px
    sobre un trazo de ~300 px, dibujar solo la mitad da ~0.61 de cobertura
    (el corredor amplía el final); 0.65 exige la mayor parte del camino. */
export const EASY_EVAL: EvaluationOptions = {
  tol: 34,
  minCoverage: 0.65,
  minAccuracy: 50,
  checkStart: false,
  checkDirection: false,
};

/** Evaluación para letras/números (FDD §50: inicio y dirección correctos). */
export const STRICT_EVAL: EvaluationOptions = {
  tol: 28,
  minCoverage: 0.72,
  minAccuracy: 65,
  checkStart: true,
  checkDirection: true,
};

function signedArea(pts: Vec2[]): number {
  var a = 0;
  for (var i = 0; i < pts.length - 1; i++) {
    a += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return a / 2;
}

/**
 * Evalúa un trazo dibujado por el niño contra el trazo ideal.
 *
 * @param stroke       Trazo ideal (datos del contenido).
 * @param userPoints   Puntos del dedo en coordenadas de lienzo (px CSS).
 * @param scale        Tamaño del lienzo donde se muestreó el ideal.
 * @param inset        Margen usado al muestrear (debe coincidir con el render).
 * @param opts         Umbrales (ver EASY_EVAL / STRICT_EVAL y la relajación
 *                     adaptativa en screens/activity.ts).
 * @returns            Cobertura, precisión, inicio, dirección y veredicto.
 */
export function evaluateStroke(
  stroke: StrokeDef,
  userPoints: Vec2[],
  scale: { w: number; h: number },
  inset: number,
  opts: EvaluationOptions
): StrokeEvaluation {
  var ideal = resampleUniform(sampleStroke(stroke.segments, scale, inset), Math.max(6, opts.tol / 3));
  var user = resampleUniform(userPoints, 6);

  var idealLen = pathLength(ideal);
  var userLen = pathLength(user);

  // Trazo demasiado corto → cobertura ~0, sin evaluar el resto
  if (userLen < idealLen * 0.12 || user.length < 4) {
    return {
      strokeId: stroke.id,
      coverage: 0,
      accuracy: 0,
      startOk: false,
      directionOk: false,
      passed: false,
      avgDist: Infinity,
    };
  }

  // --- cobertura: proporción del camino ideal pisada dentro de tolerancia
  var covered = 0;
  var tol2 = opts.tol * opts.tol;
  for (var i = 0; i < ideal.length; i++) {
    for (var j = 0; j < user.length; j++) {
      var dx = ideal[i].x - user[j].x;
      var dy = ideal[i].y - user[j].y;
      if (dx * dx + dy * dy <= tol2) {
        covered++;
        break;
      }
    }
  }
  var coverage = ideal.length > 0 ? covered / ideal.length : 0;

  // --- precisión: distancia media del niño al camino ideal
  var sumDist = 0;
  for (var k = 0; k < user.length; k++) {
    var best = Infinity;
    for (var m = 0; m < ideal.length; m++) {
      var ddx = user[k].x - ideal[m].x;
      var ddy = user[k].y - ideal[m].y;
      var d2 = ddx * ddx + ddy * ddy;
      if (d2 < best) best = d2;
    }
    sumDist += Math.sqrt(best);
  }
  var avgDist = sumDist / user.length;
  var accuracy = clamp(100 * (1 - avgDist / (opts.tol * 1.6)), 0, 100);

  // --- punto de inicio (con margen extra: los niños apuntan "cerca")
  var startOk = dist(user[0], ideal[0]) <= opts.tol * 1.6;

  // --- dirección global
  var directionOk = true;
  var netIdealX = ideal[ideal.length - 1].x - ideal[0].x;
  var netIdealY = ideal[ideal.length - 1].y - ideal[0].y;
  var netUserX = user[user.length - 1].x - user[0].x;
  var netUserY = user[user.length - 1].y - user[0].y;
  var netIdealLen = Math.sqrt(netIdealX * netIdealX + netIdealY * netIdealY);
  var netUserLen = Math.sqrt(netUserX * netUserX + netUserY * netUserY);
  if (netIdealLen > idealLen * 0.5) {
    // camino abierto: comparar desplazamiento neto
    directionOk = netUserLen < 1 || netIdealX * netUserX + netIdealY * netUserY > 0;
  } else {
    // camino cerrado o serpenteante: comparar el sentido de giro (área con signo)
    var areaIdeal = signedArea(ideal);
    var areaUser = signedArea(user);
    if (Math.abs(areaIdeal) > 0.02 * idealLen * idealLen) {
      directionOk = areaIdeal * areaUser > 0;
    }
  }

  var passed =
    coverage >= opts.minCoverage &&
    accuracy >= opts.minAccuracy &&
    (!opts.checkStart || startOk) &&
    (!opts.checkDirection || directionOk);

  return {
    strokeId: stroke.id,
    coverage: Math.round(coverage * 100),
    accuracy: Math.round(accuracy),
    startOk: startOk,
    directionOk: directionOk,
    passed: passed,
    avgDist: avgDist,
  };
}

export interface ResourceEvaluation {
  strokes: StrokeEvaluation[];
  /** Puntuación global 0..100 (media de los trazos). */
  score: number;
  /**Todos los trazos aprobados. */
  passed: boolean;
  /** Índice del primer trazo fallido (-1 si todo bien). */
  firstFailed: number;
}

/**
 * Evalúa todos los trazos de un recurso (letra, número, forma…) y
 * agrega la puntuación global 0..100 (media por trazo).
 */
export function evaluateResource(
  strokes: StrokeDef[],
  userStrokes: Vec2[][],
  scale: { w: number; h: number },
  inset: number,
  opts: EvaluationOptions
): ResourceEvaluation {
  var evals: StrokeEvaluation[] = [];
  var firstFailed = -1;
  for (var i = 0; i < strokes.length; i++) {
    var e = evaluateStroke(strokes[i], userStrokes[i] || [], scale, inset, opts);
    evals.push(e);
    if (!e.passed && firstFailed === -1) firstFailed = i;
  }
  var score = 0;
  for (var s = 0; s < evals.length; s++) {
    score += (evals[s].coverage + evals[s].accuracy) / 2;
  }
  score = evals.length > 0 ? Math.round(score / evals.length) : 0;
  var allPassed = firstFailed === -1;
  return { strokes: evals, score: score, passed: allPassed, firstFailed: firstFailed };
}

/** Estrellas 1..3 según puntuación (nunca 0: siempre hay recompensa). */
export function starsFor(score: number, passed: boolean): number {
  if (!passed) return 1;
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  return 1;
}
