/* Mapa de progresión: 4 fases (FDD §56), nodos por recurso con
   estrellas y candados. El nodo actual pulsa; siempre hay uno abierto. */

import { el } from "../util/dom";
import { audio } from "../services/audio";
import { ProfileStore } from "../services/storage";
import { PHASES } from "../content/families";
import { ResourceDef } from "../engine/types";
import { PHRASES } from "../content/phrases";

export interface MapDeps {
  store: ProfileStore;
  onPick: (r: ResourceDef) => void;
  onSettings: () => void;
  onExit: () => void;
}

export function renderMap(
  host: { root: HTMLElement },
  deps: MapDeps,
  resources: ResourceDef[]
): HTMLElement {
  var screen = el("div", { class: "screen screen--sky" });

  var currentPhase: "A" | "B" | "C" | "D" = "A";

  var phaseRow = el("div", { class: "row" });
  var grid = el("div", { class: "map-grid" });
  var title = el("div", { class: "title", text: "" });
  var bubbleEl = el("div", { class: "bubble", text: PHRASES.chooseActivity });

  var starTotal = el("div", {
    class: "btn-big btn-big--ghost btn-big--small hold-btn",
    html: '<span class="emoji">⭐</span>0',
  });

  function updateStars(): void {
    starTotal.innerHTML = '<span class="emoji">⭐</span>' + deps.store.totalStars();
  }

  // botones de fase
  var phaseBtns: Record<string, HTMLElement> = {};
  PHASES.forEach(function (ph) {
    var b = el("button", {
      class: "btn-big btn-big--small",
      html: '<span class="emoji">' + ph.emoji + '</span>' + ph.name,
      onClick: function () {
        audio.sfx.tap();
        currentPhase = ph.id;
        buildGrid();
      },
    });
    phaseBtns[ph.id] = b;
    phaseRow.appendChild(b);
  });

  function refreshPhaseButtons(): void {
    PHASES.forEach(function (ph) {
      var b = phaseBtns[ph.id];
      b.style.background = ph.id === currentPhase ? "#7c4dff" : "#ffffff";
      b.style.color = ph.id === currentPhase ? "#ffffff" : "#3b3b58";
    });
  }

  var ofPhase = function (id: string): ResourceDef[] {
    var out: ResourceDef[] = [];
    for (var i = 0; i < resources.length; i++) if (resources[i].phase === id) out.push(resources[i]);
    return out;
  };

  /** Regla única de jugabilidad: completado, de cortesía (2 primeros)
      o con el anterior completado. El storage no duplica esta lógica. */
  function isDone(r: ResourceDef): boolean {
    var pr = deps.store.progressOf(r.id);
    return !!(pr && pr.completed);
  }

  function playable(list: ResourceDef[], i: number): boolean {
    if (isDone(list[i])) return true; // repetir siempre permitido
    if (i <= 1) return true;
    return isDone(list[i - 1]);
  }

  /** Primer nodo sin completar y jugable → marcador "current". */
  function nextIndex(list: ResourceDef[]): number {
    for (var i = 0; i < list.length; i++) {
      if (!isDone(list[i]) && playable(list, i)) return i;
    }
    return 0;
  }

  function buildGrid(): void {
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    var list = ofPhase(currentPhase);
    var info = PHASES.filter(function (p) {
      return p.id === currentPhase;
    })[0];
    title.textContent = info.name + " · " + info.subtitle;

    var currentIdx = nextIndex(list);

    list.forEach(function (r, i) {
      var pr = deps.store.progressOf(r.id);
      var stars = pr ? pr.stars : 0;
      var done = pr ? pr.completed : false;
      var canPlay = playable(list, i);

      var cls = "node";
      if (done) cls += " node--done";
      if (i === currentIdx) cls += " node--current";
      if (!canPlay) cls += " node--locked";

      var glyph = r.char || r.label;
      var starRow = el("div", {
        class: "node__stars",
        text:
          !canPlay
            ? ""
            : stars === 3
            ? "⭐⭐⭐"
            : stars === 2
            ? "⭐⭐"
            : stars === 1
            ? "⭐"
            : "✨",
      });

      var node = el("div", { class: cls });
      node.appendChild(el("div", { text: !canPlay ? "🔒" : glyph }));
      node.appendChild(starRow);
      node.addEventListener("click", function () {
        if (!canPlay) {
          audio.sfx.retry();
          bubbleEl.textContent = "Primero termina el de antes 💪";
          audio.say("Primero termina el de antes.");
          return;
        }
        audio.sfx.tap();
        deps.onPick(r);
      });
      grid.appendChild(node);
    });

    refreshPhaseButtons();
  }

  var settingsBtn = el("button", {
    class: "btn-big btn-big--ghost btn-big--small",
    html: '<span class="emoji">⚙️</span>Ajustes',
    onClick: function () {
      audio.sfx.tap();
      deps.onSettings();
    },
  });

  var exitBtn = el("button", {
    class: "btn-big btn-big--ghost btn-big--small",
    html: '<span class="emoji">🚪</span>Salir',
    onClick: function () {
      audio.sfx.tap();
      deps.onExit();
    },
  });

  var topRow = el("div", {
    class: "row",
    children: [exitBtn, el("div", { class: "spacer" }), starTotal, settingsBtn],
  });

  screen.appendChild(topRow);
  screen.appendChild(title);
  screen.appendChild(phaseRow);
  screen.appendChild(grid);

  var mascot = el("div", {
    class: "mascot-line",
    children: [el("div", { class: "mascot", text: "✏️" }), bubbleEl],
  });
  screen.appendChild(mascot);

  host.root.appendChild(screen);
  updateStars();
  buildGrid();

  (screen as any).refresh = function () {
    updateStars();
    buildGrid();
  };

  return screen;
}
