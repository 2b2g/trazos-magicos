import { describe, it, expect } from "vitest";
import { sampleStroke, resampleUniform, pathLength, sampleSegment } from "../src/engine/sampling";
import { evaluateStroke, evaluateResource, starsFor, EASY_EVAL, STRICT_EVAL } from "../src/engine/evaluator";
import { v } from "../src/engine/geom";
import { ResourceDef, Vec2 } from "../src/engine/types";
import { PHASE_A_STROKES } from "../src/content/strokesPhaseA";
import { PHASE_C_LETTERS } from "../src/content/lettersPhaseC";
import { PHASE_D_NUMBERS } from "../src/content/numbersPhaseD";
import { ALL_RESOURCES } from "../src/content";
import { PHRASES, NUMBER_WORDS } from "../src/content/phrases";

const SCALE = { w: 400, h: 400 };
const INSET = 0;

function idealOf(resource: ResourceDef, index = 0): Vec2[] {
  return sampleStroke(resource.strokes[index].segments, SCALE, INSET);
}

function jittered(path: Vec2[], amp: number, seed = 1): Vec2[] {
  var out: Vec2[] = [];
  var s = seed;
  for (var i = 0; i < path.length; i += 3) {
    s = (s * 9301 + 49297) % 233280;
    var r = s / 233280 - 0.5;
    out.push(v(path[i].x + r * amp, path[i].y + r * amp));
  }
  return out;
}

describe("sampling", () => {
  it("muestrea una línea con extremos exactos", () => {
    var pts = sampleSegment({ kind: "line", a: v(0, 0), b: v(1, 0) }, 10);
    expect(pts.length).toBe(11);
    expect(pts[0].x).toBe(0);
    expect(pts[10].x).toBe(1);
  });

  it("el arco completo de la O empieza arriba y es continuo", () => {
    var O = PHASE_C_LETTERS.filter(function (r) {
      return r.id === "letter_O_upper";
    })[0];
    var pts = idealOf(O);
    var first = pts[0];
    expect(first.y).toBeLessThan(200); // arranca arriba
    // continuidad: ningún salto enorme entre muestras
    var maxJump = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x;
      var dy = pts[i].y - pts[i - 1].y;
      var jump = Math.sqrt(dx * dx + dy * dy);
      if (jump > maxJump) maxJump = jump;
    }
    expect(maxJump).toBeLessThan(15);
  });

  it("resampleUniform mantiene espaciado casi constante", () => {
    var pts = sampleStroke(PHASE_A_STROKES[0].strokes[0].segments, SCALE, INSET);
    var uni = resampleUniform(pts, 8);
    for (var i = 2; i < uni.length - 2; i++) {
      var d = Math.sqrt(
        (uni[i].x - uni[i - 1].x) ** 2 + (uni[i].y - uni[i - 1].y) ** 2
      );
      expect(d).toBeGreaterThan(3);
      expect(d).toBeLessThan(13);
    }
  });

  it("pathLength de un cuadrado de lado 1 es 4", () => {
    var sq: Vec2[] = [v(0, 0), v(1, 0), v(1, 1), v(0, 1), v(0, 0)];
    expect(pathLength(sq)).toBeCloseTo(4, 5);
  });
});

describe("evaluator", () => {
  it("aprueba un trazo perfecto", () => {
    var r = PHASE_A_STROKES[0]; // línea vertical
    var ideal = idealOf(r);
    var e = evaluateStroke(r.strokes[0], ideal, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(true);
    expect(e.coverage).toBeGreaterThanOrEqual(95);
    expect(e.accuracy).toBeGreaterThanOrEqual(95);
  });

  it("aprueba un trazo con jitter infantil moderado", () => {
    var r = PHASE_A_STROKES[0];
    var ideal = idealOf(r);
    var kid = jittered(ideal, 30, 7);
    var e = evaluateStroke(r.strokes[0], kid, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(true);
  });

  it("rechaza un trazo en el lugar equivocado", () => {
    var r = PHASE_A_STROKES[0];
    var ideal = idealOf(r);
    var moved = ideal.map(function (p) {
      return v(p.x + 120, p.y);
    });
    var e = evaluateStroke(r.strokes[0], moved, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(false);
    expect(e.coverage).toBeLessThan(10);
  });

  it("rechaza un trazo demasiado corto", () => {
    var r = PHASE_A_STROKES[0];
    var ideal = idealOf(r);
    var short = [ideal[0], ideal[1], ideal[2]];
    var e = evaluateStroke(r.strokes[0], short, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(false);
  });

  it("valida inicio y dirección en modo estricto (letras)", () => {
    var T = PHASE_C_LETTERS.filter(function (r) {
      return r.id === "letter_T_upper";
    })[0];
    var good = idealOf(T, 0); // techo de izquierda a derecha
    var ok = evaluateStroke(T.strokes[0], good, SCALE, INSET, STRICT_EVAL);
    expect(ok.passed).toBe(true);
    expect(ok.startOk).toBe(true);
    expect(ok.directionOk).toBe(true);

    var reversed = good.slice().reverse();
    var bad = evaluateStroke(T.strokes[0], reversed, SCALE, INSET, STRICT_EVAL);
    expect(bad.directionOk).toBe(false);
  });

  it("evaluateResource agrega por trazo y asigna estrellas", () => {
    var r = PHASE_A_STROKES[6]; // círculo (1 trazo)
    var ideal = idealOf(r);
    var res = evaluateResource(r.strokes, [ideal], SCALE, INSET, EASY_EVAL);
    expect(res.passed).toBe(true);
    expect(res.score).toBeGreaterThan(90);
    expect(starsFor(res.score, true)).toBe(3);
    expect(starsFor(50, true)).toBe(1);
  });

  it("RECHAZA un trazo de medio camino (umbral pedagógico 0.6)", () => {
    var r = PHASE_A_STROKES[0]; // línea vertical
    var ideal = idealOf(r);
    var half = ideal.slice(0, Math.floor(ideal.length / 2));
    var e = evaluateStroke(r.strokes[0], half, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(false);
  });

  it("TOLERANCIA ADAPTATIVA: lo que falla estricto pasa relajado", () => {
    var r = PHASE_A_STROKES[0];
    var ideal = idealOf(r);
    // trazo desviado 40 px: fuera del corredor de 34 px, pero cercano
    var desviado = ideal.map(function (p) {
      return v(p.x + 40, p.y);
    });
    var estricto = evaluateStroke(r.strokes[0], desviado, SCALE, INSET, EASY_EVAL);
    expect(estricto.passed).toBe(false); // con umbrales normales no basta
    // relajación equivalente a 4 fallos en la actividad (f máx = 4):
    // tol ×1.48, cobertura −0.16, precisión −12, sin inicio/dirección
    var relajado = evaluateStroke(r.strokes[0], desviado, SCALE, INSET, {
      tol: EASY_EVAL.tol * 1.48,
      minCoverage: Math.max(0.3, EASY_EVAL.minCoverage - 0.16),
      minAccuracy: Math.max(35, EASY_EVAL.minAccuracy - 12),
      checkStart: false,
      checkDirection: false,
    });
    expect(relajado.passed).toBe(true); // tras relajarse, el esfuerzo cuenta
  });

  it("detecta una curva invertida (∪ trazada como ∩)", () => {
    var r = PHASE_A_STROKES[2]; // curve-down-up (∪)
    var ideal = idealOf(r);
    var invertida = ideal.map(function (p) {
      return v(p.x, 1 - p.y);
    });
    var e = evaluateStroke(r.strokes[0], invertida, SCALE, INSET, EASY_EVAL);
    expect(e.passed).toBe(false);
  });

  it("estrellas: fronteras 90/75 y mínimo 1 sin castigo duro", () => {
    expect(starsFor(90, true)).toBe(3);
    expect(starsFor(89, true)).toBe(2);
    expect(starsFor(75, true)).toBe(2);
    expect(starsFor(74, true)).toBe(1);
    expect(starsFor(5, false)).toBe(1); // nunca 0 estrellas
  });
});

describe("contenido", () => {
  it("hay 27 letras mayúsculas incluida Ñ", () => {
    expect(PHASE_C_LETTERS.length).toBe(27);
    var ids = PHASE_C_LETTERS.map(function (r) {
      return r.id;
    });
    expect(ids).toContain("letter_Ñ_upper");
    // sin duplicados
    expect(new Set(ids).size).toBe(27);
  });

  it("hay 10 dígitos y su count coincide", () => {
    expect(PHASE_D_NUMBERS.length).toBe(10);
    PHASE_D_NUMBERS.forEach(function (d) {
      expect(d.count).toBe(parseInt(d.char as string, 10));
    });
  });

  it("cada recurso tiene trazos con segmentos válidos y habla", () => {
    ALL_RESOURCES.forEach(function (r) {
      expect(r.strokes.length).toBeGreaterThan(0);
      expect(r.speech && r.speech.length).toBeGreaterThan(0);
      r.strokes.forEach(function (s) {
        expect(s.segments.length).toBeGreaterThan(0);
        // todos los caminos tienen longitud > 0
        var len = pathLength(sampleStroke(s.segments, SCALE, INSET));
        expect(len).toBeGreaterThan(20);
      });
    });
  });

  it("geometría continua: ningún salto gigante entre muestras y arcos con barrido positivo", () => {
    ALL_RESOURCES.forEach(function (r) {
      r.strokes.forEach(function (s) {
        s.segments.forEach(function (seg) {
          if (seg.kind === "arc") {
            var sweep = seg.sweep !== undefined ? Math.abs(seg.sweep) : 2 * Math.PI;
            expect(sweep).toBeGreaterThan(0);
          }
        });
        var pts = sampleStroke(s.segments, SCALE, INSET);
        for (var i = 1; i < pts.length; i++) {
          var dx = pts[i].x - pts[i - 1].x;
          var dy = pts[i].y - pts[i - 1].y;
          expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(40);
        }
      });
    });
  });

  it("letras y números tienen significado (emoji + palabra)", () => {
    PHASE_C_LETTERS.forEach(function (l) {
      expect(l.meaningEmoji && l.meaningEmoji.length).toBeGreaterThan(0);
      expect(l.meaningWord && l.meaningWord.length).toBeGreaterThan(0);
    });
    PHASE_D_NUMBERS.forEach(function (n) {
      expect(n.countEmoji).toBe("⭐");
      expect(n.count).toBeGreaterThanOrEqual(0);
    });
  });

  it("los recursos tienen ids únicos", () => {
    var ids = ALL_RESOURCES.map(function (r) {
      return r.id;
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("el catálogo de frases y números está en español", () => {
    expect(PHRASES.nowYou).toContain("tú");
    expect(NUMBER_WORDS[5]).toBe("cinco");
  });
});
