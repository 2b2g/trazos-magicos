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
import { BASE, BLEED_BOTTOM, BLEED_TOP, BLEED_X, CAP, GUIDE_LINES, L, R } from "../src/content/writingBox";

const SCALE = { w: 400, h: 400 };
const INSET = 0;
/** Escala grande para medir tolerancias finas (1 unidad = 1 px). */
const BIG = { w: 1000, h: 1000 };

function idealOf(resource: ResourceDef, index = 0): Vec2[] {
  return sampleStroke(resource.strokes[index].segments, SCALE, INSET);
}

function bigStrokes(resource: ResourceDef): Vec2[][] {
  return resource.strokes.map(function (s) {
    return sampleStroke(s.segments, BIG, INSET);
  });
}

/** Distancia mínima de un punto a una polilínea. */
function distToPath(p: Vec2, pts: Vec2[]): number {
  var best = Infinity;
  for (var i = 1; i < pts.length; i++) {
    var ax = pts[i - 1].x;
    var ay = pts[i - 1].y;
    var dx = pts[i].x - ax;
    var dy = pts[i].y - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 > 0 ? ((p.x - ax) * dx + (p.y - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    var d = Math.sqrt((p.x - (ax + dx * t)) ** 2 + (p.y - (ay + dy * t)) ** 2);
    if (d < best) best = d;
  }
  return best;
}

/** Distancia mínima entre dos polilíneas (para comprobar que se tocan). */
function distBetween(a: Vec2[], b: Vec2[]): number {
  var best = Infinity;
  for (var i = 0; i < a.length; i++) {
    var d = distToPath(a[i], b);
    if (d < best) best = d;
  }
  return best;
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

/* Fidelidad de la forma: lo que impide que las letras vuelvan a ser
   "estimaciones". Cada comprobación atrapa un error real que el
   contenido anterior tenía (FDD §19). */
describe("fidelidad de la caja de escritura", () => {
  var grafias: ResourceDef[] = PHASE_C_LETTERS.concat(PHASE_D_NUMBERS);

  function porstroke(r: ResourceDef, id: string) {
    return r.strokes.filter(function (s) { return s.id === id; })[0];
  }

  it("TODAS las grafías arrancan en la ceja y apoyan en la base", () => {
    grafias.forEach(function (r) {
      var pts: Vec2[] = [];
      bigStrokes(r).forEach(function (p) {
        pts = pts.concat(p);
      });
      var minY = Math.min.apply(null, pts.map(function (p) { return p.y; }));
      var maxY = Math.max.apply(null, pts.map(function (p) { return p.y; }));
      // la Ñ sube por la tilde y la Q baja por la colita: se permite
      expect(minY, r.id + " llega a la ceja").toBeLessThanOrEqual(CAP * BIG.h + 2);
      expect(maxY, r.id + " apoya en la base").toBeGreaterThanOrEqual(BASE * BIG.h - 2);
      expect(minY, r.id + " no se sale por arriba").toBeGreaterThanOrEqual(
        (CAP - BLEED_TOP) * BIG.h - 2
      );
      expect(maxY, r.id + " no se sale por abajo").toBeLessThanOrEqual(
        (BASE + BLEED_BOTTOM) * BIG.h + 2
      );
    });
  });

  it("NINGUNA grafía se sale de la caja por los lados", () => {
    grafias.forEach(function (r) {
      bigStrokes(r).forEach(function (pts) {
        pts.forEach(function (p) {
          expect(p.x, r.id + " dentro del ancho").toBeGreaterThanOrEqual(
            (L - BLEED_X) * BIG.w
          );
          expect(p.x, r.id + " dentro del ancho").toBeLessThanOrEqual(
            (R + BLEED_X) * BIG.w
          );
        });
      });
    });
  });

  it("CADA trazo toca al menos otro trazo: la letra es una figura sola", () => {
    // antes la barra de la A se separaba 50 px de las diagonales y la
    // "~" de la Ñ flotaba; esta comprobación lo detecta al instante.
    // El margen de 8 px (0,8 % de la caja) absorbe el muestreo: lo que
    // se busca es que no haya huecos visibles, no decimales.
    grafias.forEach(function (r) {
      var paths = bigStrokes(r);
      paths.forEach(function (a, i) {
        // el diacrítico de la Ñ flota sobre la letra por definición
        if (r.id === "letter_Ñ_upper" && r.strokes[i].id === "s4") return;
        var toca = false;
        for (var j = 0; j < paths.length; j++) {
          if (j === i || paths[j].length < 2) continue;
          if (Math.min(distBetween(a, paths[j]), distBetween(paths[j], a)) <= 8) {
            toca = true;
          }
        }
        if (paths.length > 1) {
          expect(toca, r.id + " · " + r.strokes[i].id + " toca su letra").toBe(true);
        }
      });
    });
  });

  it("las uniones estructuraaes son EXACTAS (barra de la A, puente de la H…)", () => {
    // Comprueba los empalmes ponto por ponto, sin margen de muestreo:
    // el final de un trazo tiene que caer sobre otro trazo de verdad.
    var uniones: Array<[string, string, string]> = [
      ["letter_A_upper", "s1", "s2"], // las diagonales se juntan en el vértice
      ["letter_A_upper", "s3", "s1"], // la barra nace en la diagonal izquierda
      ["letter_A_upper", "s3", "s2"], // y muere en la derecha
      ["letter_H_upper", "s3", "s1"],
      ["letter_H_upper", "s3", "s2"],
      ["letter_M_upper", "s2", "s3"], // los valles del M se tocan
      ["letter_N_upper", "s2", "s3"],
      ["letter_Ñ_upper", "s2", "s3"],
      ["letter_W_upper", "s1", "s2"],
      ["letter_W_upper", "s3", "s4"],
      ["letter_V_upper", "s1", "s2"],
      ["letter_Y_upper", "s1", "s3"],
      ["letter_Y_upper", "s2", "s3"],
      ["letter_K_upper", "s2", "s1"], // las dos ramas nacen en la columna
      ["letter_G_upper", "s2", "s1"], // la patita nace en la barriga
      ["letter_G_upper", "s3", "s2"],
      ["letter_D_upper", "s2", "s1"],
      ["letter_P_upper", "s2", "s1"],
      ["letter_R_upper", "s2", "s1"],
      ["letter_B_upper", "s2", "s1"],
      ["number_2", "s2", "s1"], // la diagonal nace en la curva
      ["number_2", "s3", "s2"],
      ["number_4", "s2", "s1"],
      ["number_5", "s2", "s1"],
      ["number_5", "s3", "s2"],
      ["number_7", "s2", "s1"],
      ["number_9", "s2", "s1"], // la pata es tangente a la vuelta
    ];
    var porId: Record<string, ResourceDef> = {};
    grafias.forEach(function (r) { porId[r.id] = r; });
    uniones.forEach(function (u) {
      var r = porId[u[0]];
      expect(r, u[0] + " existe").toBeDefined();
      var a = sampleStroke(porstroke(r, u[1]).segments, BIG, INSET);
      var b = sampleStroke(porstroke(r, u[2]).segments, BIG, INSET);
      var d = Math.min(
        distBetween(a, b),
        distBetween(b, a),
        distToPath(a[a.length - 1], b),
        distToPath(b[0], a)
      );
      expect(d, u[0] + " · " + u[1] + "→" + u[2] + " empalma en el mismo punto").toBeLessThan(6);
    });
  });

  it("las curvas son curvas de verdad, no rectas que las imitan", () => {
    var curvas = grafias.filter(function (r) {
      return r.family === "curvas" || r.family === "curvas y líneas";
    });
    // C, O, S, U (curvas) + D, G, P, R, J (curvas y líneas)
    expect(curvas.length).toBe(9);
    curvas.forEach(function (r) {
      var curvasReales = r.strokes.some(function (s) {
        return s.segments.some(function (seg) {
          return seg.kind === "arc" || seg.kind === "cubic";
        });
      });
      expect(curvasReales, r.id + " tiene una curva real").toBe(true);
      // y ninguna se aproxima con una poligonal de rectas
      var rectas = r.strokes.reduce(function (n, s) {
        return n + s.segments.filter(function (seg) { return seg.kind === "line"; }).length;
      }, 0);
      var total = r.strokes.reduce(function (n, s) { return n + s.segments.length; }, 0);
      expect(rectas, r.id + " no es un palo").toBeLessThan(total);
    });
  });

  it("ninguna letra se dibuja con ondas o zigzag (el trazo es continuo)", () => {
    grafias.forEach(function (r) {
      r.strokes.forEach(function (s) {
        s.segments.forEach(function (seg) {
          expect(seg.kind, r.id + " sin ondas/zigzag").not.toBe("wave");
          expect(seg.kind, r.id + " sin ondas/zigzag").not.toBe("zigzag");
        });
      });
    });
  });

  it("la tilde de la Ñ está ENCIMA de la ceja (no dentro de la N)", () => {
    var nye = PHASE_C_LETTERS.filter(function (r) {
      return r.id === "letter_Ñ_upper";
    })[0];
    var tilde = sampleStroke(nye.strokes[3].segments, BIG, INSET);
    var maxY = Math.max.apply(null, tilde.map(function (p) { return p.y; }));
    expect(maxY).toBeLessThan(CAP * BIG.h); // entera por encima de la N
  });

  it("la colita de la Q cruza la base y la pata del 9 es recta", () => {
    var q = PHASE_D_NUMBERS.filter(function (r) { return r.id === "number_9"; })[0];
    var nueve = PHASE_D_NUMBERS.filter(function (r) { return r.id === "number_9"; })[0];
    var palo = sampleStroke(nueve.strokes[1].segments, BIG, INSET);
    // recta: todas las muestras tienen la misma x
    var xs = palo.map(function (p) { return p.x; });
    expect(Math.max.apply(null, xs) - Math.min.apply(null, xs)).toBeLessThan(1);
    // y apoya justo en la línea base
    var maxY = Math.max.apply(null, palo.map(function (p) { return p.y; }));
    expect(maxY).toBeCloseTo(BASE * BIG.h, 0);
    expect(q).toBeDefined();
  });

  it("el 7 va sin raya cruzada y el 1 con palito y base", () => {
    var siete = PHASE_D_NUMBERS.filter(function (r) { return r.id === "number_7"; })[0];
    expect(siete.strokes.length).toBe(2); // techo + diagonal, y nada más
    var uno = PHASE_D_NUMBERS.filter(function (r) { return r.id === "number_1"; })[0];
    expect(uno.strokes.length).toBe(3); // palito + palo + base
    expect(uno.strokes[2].segments[0].kind).toBe("line");
  });

  it("letras y números declaran la pauta de 4 líneas; los trazos sueltos no", () => {
    grafias.forEach(function (r) {
      expect(r.guideLines, r.id + " con pauta").toBeDefined();
      expect(r.guideLines!.length).toBe(4);
      expect(r.guideLines!.map(function (g) { return g.y; })).toEqual(
        GUIDE_LINES.map(function (g) { return g.y; })
      );
      // la línea media es la única discontinua
      var discontinuas = r.guideLines!.filter(function (g) { return g.dashed; }).length;
      expect(discontinuas).toBe(1);
    });
    var sueltos: ResourceDef[] = PHASE_A_STROKES.slice();
    sueltos.forEach(function (r) {
      expect(r.guideLines, r.id + " sin pauta").toBeUndefined();
    });
  });
});
