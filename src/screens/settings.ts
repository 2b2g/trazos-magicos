/* Ajustes con puerta parental: mantener pulsado 3 s para entrar.
   El niño no sale del juego ni borra nada por accidente (FDD UX §9).
   Zona de adultos: textos completos pero con el mismo lenguaje
   visual grande y redondeado (guía UX §9: sin menús escondidos). */

import { el, attachHoldSafe } from "../util/dom";
import { audio } from "../services/audio";
import { iconEl } from "../ui/mark";
import { Settings, loadSettings, saveSettings, ProfileStore } from "../services/storage";
import { PHRASES } from "../content/phrases";

export interface SettingsDeps {
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export function renderSettings(
  host: { root: HTMLElement },
  deps: SettingsDeps,
  store: ProfileStore
): HTMLElement {
  var s: Settings = loadSettings();
  var screen = el("div", { class: "screen" });

  var title = el("div", {
    class: "title title--with-mark",
    children: [el("span", { text: "Ajustes" }), iconEl("grown")],
  });
  var note = el("div", {
    class: "subtitle",
    text: "Zona para personas adultas. Mantén pulsado el botón 3 segundos.",
  });

  // Botón sin texto: la llave y el relleno que crece al mantener bastan,
  // y la instrucción está justo encima (nota).
  var gateBtn = el("button", {
    class: "btn btn--purple btn--big btn--only hold-btn",
    attrs: { "aria-label": "Mantén pulsado para entrar en los ajustes" },
    children: [iconEl("key"), el("span", { class: "fill" })],
  });
  var fill = gateBtn.querySelector(".fill") as HTMLElement;

  var panel = el("div", { class: "col hidden" });

  function row(
    mark: SVGElement,
    label: string,
    initial: boolean,
    onToggle: (v: boolean) => void
  ): { row: HTMLElement; set: (v: boolean) => void } {
    var knob = el("div", { class: "switch" + (initial ? " switch--on" : "") });
    var r = el("div", {
      class: "switch-row",
      attrs: { role: "switch", "aria-label": label, "aria-checked": initial ? "true" : "false" },
      children: [
        el("div", { class: "switch-row__label", children: [mark, el("span", { text: label })] }),
        knob,
      ],
    });
    var value = initial;
    function set(v: boolean): void {
      value = v;
      knob.className = "switch" + (v ? " switch--on" : "");
      r.setAttribute("aria-checked", v ? "true" : "false");
    }
    r.addEventListener("click", function () {
      value = !value;
      set(value);
      audio.sfx.tap();
      onToggle(value);
    });
    return { row: r, set: set };
  }

  var voiceRow = row(iconEl("soundOn"), "Voz e instrucciones", s.voice, function (v) {
    s.voice = v;
    audio.setVoiceEnabled(v);
    persist();
  });
  var slowRow = row(iconEl("slow"), "Voz pausada (para peques)", s.voiceSlow, function (v) {
    s.voiceSlow = v;
    audio.setSlowVoice(v);
    persist();
  });
  var sfxRow = row(iconEl("music"), "Efectos de sonido", s.sfx, function (v) {
    s.sfx = v;
    audio.setSfxEnabled(v);
    persist();
  });
  var tolRow = row(iconEl("heart", "icon icon--heart"), "Modo extra fácil", s.toleranceBoost, function (v) {
    s.toleranceBoost = v;
    persist();
  });

  function persist(): void {
    saveSettings(s);
    deps.onChange(s);
  }

  // fila informativa: qué voz está sonando (clips grabados o sistema)
  var voiceInfo = el("div", {
    class: "switch-row switch-row--info",
    children: [
      el("div", {
        class: "switch-row__label",
        children: [iconEl("mic"), el("span", { text: "Voz del juego: " + audio.voiceDescription })],
      }),
    ],
  });

  var deleteText = el("span", { text: "Borrar perfil actual" });
  var deleteRow = el("div", {
    class: "switch-row",
    children: [
      el("div", {
        class: "switch-row__label",
        style: { color: "#b3261e" },
        children: [iconEl("trash"), deleteText],
      }),
    ],
  });
  var delArmed = false;
  deleteRow.addEventListener("click", function () {
    if (!delArmed) {
      delArmed = true;
      deleteRow.style.background = "#ffe3df";
      deleteText.textContent = "¿Seguro? Pulsa otra vez para borrar";
      setTimeout(function () {
        delArmed = false;
        deleteRow.style.background = "#ffffff";
        deleteText.textContent = "Borrar perfil actual";
      }, 4000);
      return;
    }
    var id = store.currentProfileId();
    if (id) store.deleteProfile(id);
    audio.say(PHRASES.goodbye);
    deps.onClose();
    window.location.reload();
  });

  var closeBtn = el("button", {
    class: "btn btn--green btn--big btn--only",
    attrs: { "aria-label": "Volver al juego" },
    children: [iconEl("home")],
    onClick: function () {
      audio.sfx.tap();
      deps.onClose();
    },
  });

  // puerta: 3 segundos manteniendo (el relleno crece en el propio botón)
  attachHoldSafe(
    gateBtn,
    3000,
    function (frac: number) {
      fill.style.width = Math.round(frac * 100) + "%";
    },
    function () {
      audio.sfx.unlockPrize();
      gateBtn.classList.add("hidden");
      note.classList.add("hidden");
      panel.classList.remove("hidden");
    }
  );

  panel.appendChild(voiceRow.row);
  panel.appendChild(slowRow.row);
  panel.appendChild(sfxRow.row);
  panel.appendChild(tolRow.row);
  panel.appendChild(voiceInfo);
  panel.appendChild(deleteRow);
  panel.appendChild(closeBtn);

  screen.appendChild(title);
  screen.appendChild(note);
  screen.appendChild(gateBtn);
  screen.appendChild(panel);
  host.root.appendChild(screen);
  return screen;
}
