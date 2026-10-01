/* Bucle de actividad (FDD §13, §50–51):
   presentación → demostración → trazado trazo a trazo → evaluación
   adaptativa (la tolerancia se relaja si el niño lo necesita) →
   recompensa con significado (letra) o cantidad (número).
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

export interface ActivityDeps {
  store: ProfileStore;
  settings: Settings;
  onExit: () => void;
}

export function renderActivity(
  host: { root: HTMLElement },
  resource: ResourceDef,
  deps: ActivityDeps
): HTMLElement {
  var screen = el("div", { class: "screen screen--sky" });

  /* ---------- construcción DOM ---------- */

  var homeBtn = el("button", {
    class: "btn-big btn-big--ghost btn-big--small",
    html: '<span class="emoji">🏠</span>',
    onClick: function () {
      audio.sfx.tap();
      cleanup();
      deps.onExit();
    },
  });

  var promptEl = el("div", { class: "prompt", text: resource.label });

  var topbar = el("div", { class: "topbar", children: [homeBtn, promptEl] });

  var holder = el("div", { class: "canvas-holder" });
  var canvas = document.createElement("canvas");
  holder.appendChild(canvas);

  var bubbleEl = el("div", { class: "bubble", text: "" });
  var mascotLine = el("div", {
    class: "mascot-line",
    children: [el("div", { class: "mascot", text: "✏️" }), bubbleEl],
  });

  screen.appendChild(topbar);
  screen.appendChild(holder);
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

  function start(): void {
    phase = "present";
    promptEl.textContent = resource.label;
    var intro = (resource.speech && resource.speech.join(" ")) || resource.label;
    say(intro);
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
    attachInput();
    say(PHRASES.nowYou + " " + strokeHint());
  }

  function strokeHint(): string {
    var s = strokes[state.current];
    return s.label ? s.label + "." : "";
  }

  function updatePrompt(): void {
    if (strokes.length > 1) {
      promptEl.textContent =
        resource.label + " · trazo " + (state.current + 1) + " de " + strokes.length;
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
      if (si + 1 < strokes.length) {
        state.current = si + 1;
        updatePrompt();
        say(randomCheer() + " " + strokeHint());
      } else {
        finishResource();
      }
    } else {
      failCount++;
      audio.sfx.retry();
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

  /* ---------- recompensa ---------- */

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

    var layer = el("div", { class: "reward-layer" });
    layer.appendChild(
      el("div", {
        class: "stars-big",
        text: stars === 3 ? "⭐⭐⭐" : stars === 2 ? "⭐⭐" : "⭐",
      })
    );
    layer.appendChild(el("div", { class: "phrase", text: randomCheer() }));
    layer.appendChild(
      el("div", {
        class: "subtitle",
        text: "Precisión " + res.score + " %",
      })
    );

    var spoken = randomCheer();

    // Letra → significado (FDD §18) / Número → cantidad (FDD §23–25)
    if (resource.kind === "letter" && resource.meaningEmoji) {
      var prize = el("div", { class: "prize", text: resource.meaningEmoji });
      layer.appendChild(prize);
      layer.appendChild(
        el("div", { class: "phrase", text: resource.char + " de " + resource.meaningWord })
      );
      spoken += ". " + resource.char + " de " + resource.meaningWord;
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
      spoken += ". " + PHRASES.countWithMe + " " + words.join(", ") + ". " + n + " " + (resource.meaningWord || "");
      layer.appendChild(el("div", { class: "phrase", text: words.length + " " + (resource.countEmoji || "") }));
    }

    layer.appendChild(
      el("div", {
        class: "row",
        children: [
          el("button", {
            class: "btn-big btn-big--orange",
            html: '<span class="emoji">🔁</span>Otra vez',
            onClick: function () {
              audio.sfx.tap();
              cleanup();
              renderActivity(host, resource, deps);
            },
          }),
          el("button", {
            class: "btn-big btn-big--green",
            html: '<span class="emoji">➡️</span>Seguir',
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
      audio.say(spoken);
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

  start();
  return screen;
}
