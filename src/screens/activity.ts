/* Bucle de actividad (FDD §13, §50–51):
   presentación → demostración → trazado trazo a trazo → evaluación
   adaptativa (la tolerancia se relaja si el niño lo necesita) →
   recompensa con significado (letra) o cantidad (número).

   Estética (guía UX §6): Liro reacciona a cada intento —salta al
   acertar, se apena con dulzura al fallar— el progreso del recurso
   se ve como puntos, y el final es una celebración con confeti.
   Nunca hay castigo ni bloqueo: siempre se avanza. */

import { el, buzz } from "../util/dom";
import { audio } from "../services/audio";
import { ProfileStore, Settings } from "../services/storage";
import {
  ResourceDef,
  Vec2,
  EvaluationOptions,
  StrokeEvaluation,
} from "../engine/types";
import { sampleStroke, resampleUniform } from "../engine/sampling";
import { TraceRenderer, RenderState, Theme, DEFAULT_THEME } from "../engine/render";
import { attachDrawing } from "../engine/touch";
import { playDemo, DemoHandle } from "../engine/demo";
import {
  evaluateStroke,
  evaluateResource,
  starsFor,
  EASY_EVAL,
  STRICT_EVAL,
} from "../engine/evaluator";
import { PHRASES, randomCheer, NUMBER_WORDS } from "../content/phrases";
import { countPhrase, letterPhrase } from "../content/speech";
import { mascotEl, setMascotMood, MascotMood } from "../ui/mascot";
import { skyDeco } from "../ui/decor";
import { confetti, starRow } from "../util/fx";

export interface ActivityDeps {
  store: ProfileStore;
  settings: Settings;
  onExit: () => void;
  /** ¿Está el sonido (voz + efectos) activado? */
  sound: boolean;
  /** Silencia o activa todo; devuelve el estado nuevo. */
  onToggleSound: () => boolean;
}

export function renderActivity(
  host: { root: HTMLElement },
  resource: ResourceDef,
  deps: ActivityDeps
): HTMLElement {
  var screen = el("div", { class: "screen screen--sky screen--hud" });
  screen.appendChild(skyDeco());

  /* ---------- construcción DOM ---------- */

  var homeBtn = el("button", {
    class: "btn btn--coral btn--icon",
    attrs: { "aria-label": "Volver al mapa" },
    children: [el("span", { class: "btn__emoji", text: "🏠" })],
    onClick: function () {
      audio.sfx.tap();
      cleanup();
      deps.onExit();
    },
  });

  var promptEl = el("div", { class: "hud__center", text: resource.label });

  var soundPill = el("button", {
    class: "pill pill--button pill--icon",
    attrs: { "aria-label": "Activar o silenciar el sonido" },
    children: [el("span", { class: "pill__icon", text: deps.sound ? "🔊" : "🔇" })],
    onClick: function () {
      var on = deps.onToggleSound();
      setSound(on);
      if (on) audio.sfx.tap();
    },
  });

  /** Mantiene el icono de sonido sincronizado con el estado global. */
  function setSound(on: boolean): void {
    (soundPill.firstChild as HTMLElement).textContent = on ? "🔊" : "🔇";
  }

  var hud = el("div", {
    class: "hud",
    children: [
      el("div", { class: "hud__side hud__side--left", children: [homeBtn] }),
      promptEl,
      el("div", { class: "hud__side", children: [soundPill] }),
    ],
  });

  var holder = el("div", { class: "canvas-holder" });
  var canvas = document.createElement("canvas");
  holder.appendChild(canvas);

  // progreso por trazos: puntos, no números (3–6 años)
  var dotsRow = el("div", { class: "dots" });
  var dotEls: HTMLElement[] = [];

  var bubbleEl = el("div", { class: "bubble bubble--left", text: "" });
  var liro = mascotEl({ mood: "idle", stars: deps.store.totalStars() });
  var mascotLine = el("div", {
    class: "mascot-line",
    children: [liro, bubbleEl],
  });

  screen.appendChild(hud);
  screen.appendChild(holder);
  screen.appendChild(dotsRow);
  screen.appendChild(mascotLine);
  host.root.appendChild(screen);

  /* ---------- estado del motor ---------- */

  var renderer = new TraceRenderer(canvas);
  var theme: Theme = DEFAULT_THEME;
  var strokes = resource.strokes;

  var paths: Vec2[][] = [];
  function computePaths(): void {
    paths = [];
    for (var i = 0; i < strokes.length; i++) {
      paths.push(
        resampleUniform(
          sampleStroke(strokes[i].segments, { w: renderer.w, h: renderer.h }, 0),
          4
        )
      );
    }
  }
  computePaths();

  var state: RenderState = {
    paths: paths,
    current: 0,
    guideVisible: true,
    templateAlpha: 0.9,
    hidden: strokes.map(function () {
      return false;
    }),
    demo: strokes.map(function () {
      return -1;
    }),
    done: strokes.map(function () {
      return false;
    }),
    user: strokes.map(function () {
      return [] as Vec2[];
    }),
    live: null,
  };

  var phase: "present" | "demo" | "trace" | "reward" = "present";
  var failCount = 0;
  var timers: number[] = [];
  var demoHandle: DemoHandle | null = null;
  var detachDraw: (() => void) | null = null;
  var alive = true;
  var raf = 0;

  function later(ms: number, fn: () => void): void {
    timers.push(setTimeout(fn, ms) as any);
  }

  /* ---------- progreso visible (puntos) ---------- */

  function buildDots(): void {
    dotEls = [];
    while (dotsRow.firstChild) dotsRow.removeChild(dotsRow.firstChild);
    if (strokes.length < 2) return;
    for (var i = 0; i < strokes.length; i++) {
      var d = el("div", { class: "dots__dot" });
      dotEls.push(d);
      dotsRow.appendChild(d);
    }
    updateDots();
  }

  function updateDots(): void {
    for (var i = 0; i < dotEls.length; i++) {
      var cls = "dots__dot";
      if (state.done[i]) cls += " dots__dot--done";
      else if (i === state.current) cls += " dots__dot--now";
      dotEls[i].className = cls;
    }
  }

  /* ---------- Liro reacciona (feedback multimodal inmediato) ---------- */

  function react(mood: MascotMood): void {
    // reinicia la animación aunque repita emoción
    liro.className = liro.className.replace(/mascot--(idle|happy|oh|party)/, "mascot--idle");
    void liro.offsetWidth; // reflow: fuerza a reiniciar el keyframe
    setMascotMood(liro, mood);
    if (mood !== "idle" && mood !== "party") {
      later(1500, function () {
        if (alive) setMascotMood(liro, "idle");
      });
    }
  }

  /* ---------- bucle de render ---------- */

  function loop(t: number): void {
    if (!alive) return;
    renderer.render(state, theme, t);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  /* ---------- fases ---------- */

  function say(text: string): void {
    bubbleEl.textContent = text;
    audio.say(text);
  }

  /**
   * Locución por segmentos: cada frase del contenido es una pieza
   * pre-generable, así que se hablan una tras otra (con respiro entre
   * ellas) en vez de concatenar cadenas nuevas.
   */
  function sayParts(parts: string[]): void {
    var clean: string[] = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) clean.push(parts[i]);
    }
    if (!clean.length) return;
    bubbleEl.textContent = clean.join(" ");
    audio.sayAll(clean);
  }

  function start(): void {
    phase = "present";
    promptEl.textContent = resource.label;
    sayParts(resource.speech && resource.speech.length ? resource.speech : [resource.label]);
    later(1600, playDemoSequence);
  }

  function playDemoSequence(): void {
    if (!alive) return;
    phase = "demo";
    state.templateAlpha = 0.9;
    state.current = 0;
    say(PHRASES.watchMe);
    var speed = resource.difficulty === 3 ? 200 : resource.difficulty === 2 ? 230 : 260;
    demoHandle = playDemo(paths, {
      pxPerSec: speed,
      gapMs: 420,
      onProgress: function (fr) {
        state.demo = fr;
      },
      onDone: function () {
        state.demo = paths.map(function () {
          return -1;
        });
        beginTrace();
      },
    });
  }

  function beginTrace(): void {
    if (!alive) return;
    phase = "trace";
    state.current = 0;
    state.templateAlpha = 0.4;
    failCount = 0;
    updatePrompt();
    updateDots();
    attachInput();
    sayParts([PHRASES.nowYou, strokeHint()]);
  }

  function strokeHint(): string {
    var s = strokes[state.current];
    if (!s.label) return "";
    // la voz lee la pista como frase propia: "Hacia abajo."
    var label = s.label.charAt(0).toUpperCase() + s.label.slice(1);
    return label + ".";
  }

  function updatePrompt(): void {
    if (strokes.length > 1) {
      promptEl.textContent =
        resource.label + " · " + (state.current + 1) + "/" + strokes.length;
    } else {
      promptEl.textContent = resource.label;
    }
  }

  /* ---------- entrada ---------- */

  function attachInput(): void {
    if (detachDraw) return;
    var drawing = false;

    detachDraw = attachDrawing(canvas, {
      onDown: function (p) {
        if (phase !== "trace" || drawing) return;
        audio.sfx.unlock();
        drawing = true;
        state.live = [p];
      },
      onMove: function (p) {
        if (!drawing || phase !== "trace") return;
        var arr = state.live;
        if (arr && arr.length) {
          var last = arr[arr.length - 1];
          var dx = p.x - last.x;
          var dy = p.y - last.y;
          if (dx * dx + dy * dy > 4) arr.push(p);
        }
      },
      onUp: function () {
        if (!drawing) return;
        drawing = false;
        var pts = state.live;
        state.live = null;
        if (pts && pts.length > 3) evaluateAttempt(pts);
      },
    });
  }

  /* ---------- evaluación adaptativa ---------- */

  function currentOpts(): EvaluationOptions {
    var base =
      resource.kind === "letter" || resource.kind === "number" ? STRICT_EVAL : EASY_EVAL;
    var f = Math.min(failCount, 4);
    var boost = deps.settings.toleranceBoost;
    var tol = base.tol * (boost ? 1.35 : 1) * (1 + f * 0.12);
    var minCov = base.minCoverage * (boost ? 0.85 : 1) - f * 0.04;
    var minAcc = base.minAccuracy * (boost ? 0.9 : 1) - f * 3;
    return {
      tol: tol,
      minCoverage: Math.max(0.3, minCov),
      minAccuracy: Math.max(35, minAcc),
      checkStart: base.checkStart && f < 2,
      checkDirection: base.checkDirection && f < 2,
    };
  }

  function evaluateAttempt(pts: Vec2[]): void {
    var si = state.current;
    var e: StrokeEvaluation = evaluateStroke(
      strokes[si],
      pts,
      { w: renderer.w, h: renderer.h },
      0,
      currentOpts()
    );
    if (e.passed) {
      state.user[si] = pts;
      state.done[si] = true;
      failCount = 0;
      audio.sfx.strokeDone();
      buzz(35);
      react("happy");
      updateDots();
      if (si + 1 < strokes.length) {
        state.current = si + 1;
        updatePrompt();
        updateDots();
        sayParts([randomCheer(), strokeHint()]);
      } else {
        finishResource();
      }
    } else {
      failCount++;
      audio.sfx.retry();
      react("oh");
      say(failCount >= 2 ? PHRASES.tryAgain : PHRASES.almost);
      if (failCount === 2) {
        // recordatorio visual: demo de un solo trazo
        demoHandle = playDemo([paths[si]], {
          pxPerSec: 200,
          gapMs: 200,
          onProgress: function (fr) {
            var all = paths.map(function () {
              return -1;
            });
            all[si] = fr[0];
            state.demo = all;
          },
          onDone: function () {
            state.demo = paths.map(function () {
              return -1;
            });
          },
        });
      }
    }
  }

  /* ---------- recompensa (celebración exagerada) ---------- */

  function finishResource(): void {
    phase = "reward";
    detachDraw && detachDraw();
    detachDraw = null;

    var res = evaluateResource(
      strokes,
      state.user,
      { w: renderer.w, h: renderer.h },
      0,
      resource.kind === "letter" || resource.kind === "number" ? STRICT_EVAL : EASY_EVAL
    );
    var stars = starsFor(res.score, res.passed);
    deps.store.recordAttempt(resource.id, res.score, stars, true);

    audio.sfx.success();
    react("party");

    var layer = el("div", { class: "reward-layer" });

    // estrellas que aparecen una a una + confeti proporcional al logro
    starRow(layer, stars);
    confetti(screen, stars === 3 ? 26 : 16);

    // Liro baila la victoria dentro de la celebración (es el refuerzo
    // emocional del logro: la cara que celebra con el niño)
    layer.appendChild(
      el("div", {
        class: "mascot-line mascot-line--compact",
        children: [mascotEl({ mood: "party", stars: deps.store.totalStars() })],
      })
    );

    layer.appendChild(el("div", { class: "phrase", text: randomCheer() }));
    layer.appendChild(
      el("div", {
        class: "subtitle",
        text: "Precisión " + res.score + " %",
      })
    );

    // Locución de la recompensa por segmentos (cada uno con audio propio)
    var spoken: string[] = [randomCheer()];

    // Letra → significado (FDD §18) / Número → cantidad (FDD §23–25)
    if (resource.kind === "letter" && resource.meaningEmoji) {
      layer.appendChild(el("div", { class: "prize", text: resource.meaningEmoji }));
      layer.appendChild(
        el("div", { class: "phrase", text: resource.char + " de " + resource.meaningWord })
      );
      spoken.push(letterPhrase(resource));
    } else if (resource.kind === "number" && resource.countEmoji && resource.count) {
      var n = resource.count;
      var objs = el("div", { class: "count-objects" });
      for (var i = 0; i < n; i++) {
        (function (k: number) {
          var sp = el("span", { text: resource.countEmoji as string });
          sp.style.animationDelay = k * 0.28 + "s";
          objs.appendChild(sp);
        })(i);
      }
      layer.appendChild(objs);
      var words: string[] = [];
      for (i = 0; i < n; i++) words.push(NUMBER_WORDS[i + 1]);
      if (words.length) {
        // el cero no se cuenta: solo se dice "0 estrellas"
        spoken.push(PHRASES.countWithMe);
        spoken.push(words.join(", "));
      }
      spoken.push(countPhrase(resource));
      layer.appendChild(el("div", { class: "phrase", text: words.length + " " + (resource.countEmoji || "") }));
    }

    layer.appendChild(
      el("div", {
        class: "row",
        children: [
          el("button", {
            class: "btn btn--orange",
            attrs: { "aria-label": "Repetir la actividad" },
            children: [el("span", { class: "btn__emoji", text: "🔁" }), el("span", { text: "Otra vez" })],
            onClick: function () {
              audio.sfx.tap();
              cleanup();
              renderActivity(host, resource, deps);
            },
          }),
          el("button", {
            class: "btn btn--green",
            attrs: { "aria-label": "Seguir jugando" },
            children: [el("span", { class: "btn__emoji", text: "➡️" }), el("span", { text: "Seguir" })],
            onClick: function () {
              audio.sfx.tap();
              cleanup();
              deps.onExit();
            },
          }),
        ],
      })
    );

    screen.appendChild(layer);
    audio.sfx.unlockPrize();
    later(500, function () {
      audio.sayAll(spoken);
    });
  }

  /* ---------- ciclo de vida ---------- */

  function onResize(): void {
    renderer.resize();
    computePaths();
    state.paths = paths;
  }
  window.addEventListener("resize", onResize);

  function cleanup(): void {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    demoHandle && demoHandle.cancel();
    detachDraw && detachDraw();
    detachDraw = null;
    window.removeEventListener("resize", onResize);
    audio.stopVoice();
    if (screen.parentElement) screen.parentElement.removeChild(screen);
  }

  (screen as any).destroy = cleanup;
  (screen as any).setSound = setSound;

  buildDots();
  start();
  return screen;
}
