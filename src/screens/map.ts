/* Mapa de progresión (Garabati): 4 fases (FDD §56) como sendero de
   nodos con estrellas y candados. El nodo actual brilla y pulsa: el
   niño solo tiene que tocar lo que brilla (guía UX §5).
   Un solo camino, sin menús escondidos: atrás grande, progreso y
   silencio siempre a la vista. */

import { el } from "../util/dom";
import { audio } from "../services/audio";
import { ProfileStore } from "../services/storage";
import { PHASES } from "../content/families";
import { ResourceDef } from "../engine/types";
import { PHRASES } from "../content/phrases";
import { mascotEl } from "../ui/mascot";
import { skyDeco } from "../ui/decor";
import { iconEl, markEl } from "../ui/mark";

export interface MapDeps {
  store: ProfileStore;
  onPick: (r: ResourceDef) => void;
  onSettings: () => void;
  onExit: () => void;
  /** ¿Está el sonido (voz + efectos) activado? */
  sound: boolean;
  /** Silencia o activa todo; devuelve el estado nuevo. */
  onToggleSound: () => boolean;
}

export function renderMap(
  host: { root: HTMLElement },
  deps: MapDeps,
  resources: ResourceDef[]
): HTMLElement {
  var screen = el("div", { class: "screen screen--sky screen--hud" });
  screen.appendChild(skyDeco());

  var currentPhase: "A" | "B" | "C" | "D" = "A";

  var phaseRow = el("div", { class: "phase-tabs" });
  var grid = el("div", { class: "map-grid" });
  var bubbleEl = el("div", { class: "bubble bubble--left", text: PHRASES.chooseActivity });

  var starTotal = el("div", {
    class: "pill pill--stars",
    attrs: { "aria-label": "Estrellas ganadas" },
    children: [iconEl("starFilled", "pill__icon icon icon--gold"), el("span", { text: "0" })],
  });
  var starCount = starTotal.children[1] as HTMLElement;

  function updateStars(): void {
    starCount.textContent = String(deps.store.totalStars());
  }

  // --- botón de sonido: los padres lo agradecen siempre a la vista
  var soundPill = el("button", {
    class: "pill pill--button pill--icon",
    attrs: { "aria-label": "Activar o silenciar el sonido" },
    children: [iconEl(deps.sound ? "soundOn" : "soundOff", "pill__icon icon")],
    onClick: function () {
      var on = deps.onToggleSound();
      setSound(on);
      if (on) audio.sfx.tap();
    },
  });

  /** Mantiene el icono de sonido sincronizado con el estado global. */
  function setSound(on: boolean): void {
    var viejo = soundPill.firstChild;
    if (viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);
    soundPill.insertBefore(iconEl(on ? "soundOn" : "soundOff", "pill__icon icon"), soundPill.firstChild);
  }

  // --- botones de fase (pestañas grandes, solo su marca)
  var phaseBtns: Record<string, HTMLElement> = {};
  PHASES.forEach(function (ph) {
    var b = el("button", {
      class: "btn btn--sm btn--white btn--only",
      attrs: { "aria-label": ph.name },
      children: [markEl(ph.emoji, "art art--tab")],
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
      var active = ph.id === currentPhase;
      phaseBtns[ph.id].className =
        "btn btn--sm " + (active ? "btn--purple" : "btn--white");
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
    var currentIdx = nextIndex(list);

    list.forEach(function (r, i) {
      var pr = deps.store.progressOf(r.id);
      var stars = pr ? pr.stars : 0;
      var done = pr ? pr.completed : false;
      var canPlay = playable(list, i);

      var cls = "node";
      if (done) cls += " node--done";
      if (!canPlay) cls += " node--locked";
      else if (i === currentIdx) cls += " node--current";

      var glyph = r.char || r.label;
      // Las marcas de progreso son iconos del juego (no emoji del
      // sistema): estrellas doradas, candado o "aún no empieza".
      var starRow = el("div", { class: "node__stars" });
      if (!canPlay) {
        starRow.appendChild(iconEl("sleep"));
      } else {
        for (var s = 0; s < stars; s++) {
          starRow.appendChild(iconEl("starFilled", "icon icon--gold"));
        }
        if (!stars) starRow.appendChild(iconEl("sparkles"));
      }

      var node = el("div", {
        class: cls,
        attrs: { "aria-label": (canPlay ? "Jugar: " : "Bloqueado: ") + r.label },
      });
      node.appendChild(
        canPlay
          ? el("div", { children: [markEl(glyph, "art art--glyph")] })
          : el("div", { children: [iconEl("lock", "icon icon--lock")] })
      );
      node.appendChild(starRow);
      node.addEventListener("click", function () {
        if (!canPlay) {
          // feedback amable, nunca castigo: Lapi anima a seguir
          audio.sfx.retry();
          bubbleEl.textContent = PHRASES.lockedNode;
          audio.say(PHRASES.lockedNode);
          return;
        }
        audio.sfx.tap();
        deps.onPick(r);
      });
      grid.appendChild(node);
    });

    refreshPhaseButtons();
  }

  var exitBtn = el("button", {
    class: "btn btn--coral btn--icon",
    attrs: { "aria-label": "Volver a elegir jugador" },
    children: [iconEl("home")],
    onClick: function () {
      audio.sfx.tap();
      deps.onExit();
    },
  });

  var settingsBtn = el("button", {
    class: "btn btn--white btn--icon",
    attrs: { "aria-label": "Ajustes (zona de adultos)" },
    children: [iconEl("gear")],
    onClick: function () {
      audio.sfx.tap();
      deps.onSettings();
    },
  });

  var hud = el("div", {
    class: "hud",
    children: [
      el("div", { class: "hud__side hud__side--left", children: [exitBtn] }),
      el("div", { class: "hud__side", children: [starTotal, soundPill, settingsBtn] }),
    ],
  });

  var mascotLine = el("div", {
    class: "mascot-line mascot-line--compact",
    children: [
      mascotEl({ mood: "idle", stars: deps.store.totalStars() }),
      bubbleEl,
    ],
  });

  screen.appendChild(hud);
  screen.appendChild(phaseRow);
  screen.appendChild(grid);
  screen.appendChild(mascotLine);

  host.root.appendChild(screen);
  updateStars();
  buildGrid();

  /* Lapi da la bienvenida con voz: el bocadillo ya dice "Elige una
     actividad." y el niño también lo oye (el clip ya existía, pero
     nadie lo pedía: el mapa era la única pantalla muda).
     Se pide al **entrar** al mapa, aquí, donde la pantalla se crea: el
     `refresh()` de volver de una actividad no lo repite.
     Y no pisa al saludo de la pantalla de perfiles: si aún suena, la
     cola de voz espera su turno en vez de cortarlo (`voiceSequencer`). */
  audio.say(PHRASES.chooseActivity);

  (screen as any).refresh = function () {
    updateStars();
    buildGrid();
  };
  (screen as any).setSound = setSound;

  return screen;
}
