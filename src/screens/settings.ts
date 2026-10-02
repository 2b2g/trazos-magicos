/* Ajustes con puerta parental: mantener pulsado 3 s para entrar.
   El niño no sale del juego ni borra nada por accidente (FDD UX §9).
   Zona de adultos: textos completos pero con el mismo lenguaje
   visual grande y redondeado (guía UX §9: sin menús escondidos). */

import { el, attachHoldSafe } from "../util/dom";
import { audio } from "../services/audio";
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

  var title = el("div", { class: "title", text: "Ajustes 👨" });
  var note = el("div", {
    class: "subtitle",
    text: "Zona para personas adultas. Mantén pulsado el botón 3 segundos.",
  });

  var gateBtn = el("button", {
    class: "btn btn--purple btn--big hold-btn",
    attrs: { "aria-label": "Mantén pulsado para entrar en los ajustes" },
    children: [
      el("span", { class: "btn__emoji", text: "🔑" }),
      el("span", { text: "Mantén pulsado" }),
      el("span", { class: "fill" }),
    ],
  });
  var fill = gateBtn.querySelector(".fill") as HTMLElement;

  var panel = el("div", { class: "col hidden" });

  function row(
    label: string,
    initial: boolean,
    onToggle: (v: boolean) => void
  ): { row: HTMLElement; set: (v: boolean) => void } {
    var knob = el("div", { class: "switch" + (initial ? " switch--on" : "") });
    var r = el("div", {
      class: "switch-row",
      attrs: { role: "switch", "aria-checked": initial ? "true" : "false" },
      children: [el("div", { text: label }), knob],
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

  var voiceRow = row("🔊 Voz e instrucciones", s.voice, function (v) {
    s.voice = v;
    audio.setVoiceEnabled(v);
    persist();
  });
  var slowRow = row("🐢 Voz pausada (para peques)", s.voiceSlow, function (v) {
    s.voiceSlow = v;
    audio.setSlowVoice(v);
    persist();
  });
  var sfxRow = row("🎵 Efectos de sonido", s.sfx, function (v) {
    s.sfx = v;
    audio.setSfxEnabled(v);
    persist();
  });
  var tolRow = row("❤️ Modo extra fácil", s.toleranceBoost, function (v) {
    s.toleranceBoost = v;
    persist();
  });

  function persist(): void {
    saveSettings(s);
    deps.onChange(s);
  }

  var deleteRow = el("div", {
    class: "switch-row",
    children: [
      el("div", { text: "🗑️ Borrar perfil actual", style: { color: "#b3261e" } }),
    ],
  });
  var delArmed = false;
  deleteRow.addEventListener("click", function () {
    if (!delArmed) {
      delArmed = true;
      deleteRow.style.background = "#ffe3df";
      deleteRow.firstChild &&
        ((deleteRow.firstChild as HTMLElement).textContent = "¿Seguro? Pulsa otra vez para borrar");
      setTimeout(function () {
        delArmed = false;
        deleteRow.style.background = "#ffffff";
        var f = deleteRow.firstChild as HTMLElement;
        if (f) f.textContent = "🗑️ Borrar perfil actual";
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
    class: "btn btn--green btn--big",
    attrs: { "aria-label": "Volver al juego" },
    children: [el("span", { class: "btn__emoji", text: "✅" }), el("span", { text: "Volver" })],
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
  panel.appendChild(deleteRow);
  panel.appendChild(closeBtn);

  screen.appendChild(title);
  screen.appendChild(note);
  screen.appendChild(gateBtn);
  screen.appendChild(panel);
  host.root.appendChild(screen);
  return screen;
}
