/* TRAZOS MÁGICOS — punto de entrada.
   Flujo: perfiles → mapa de fases → actividad → vuelta al mapa.
   Los ajustes se aplican al servicio de audio en caliente. */

import "./styles.css";
import { el } from "./util/dom";
import { audio } from "./services/audio";
import {
  profiles,
  loadSettings,
  saveSettings,
  Settings,
  Profile,
} from "./services/storage";
import { ALL_RESOURCES } from "./content";
import { renderProfiles } from "./screens/profiles";
import { renderMap } from "./screens/map";
import { renderActivity } from "./screens/activity";
import { renderSettings } from "./screens/settings";

function boot(): void {
  var app = document.getElementById("app") as HTMLElement;
  var host = { root: app };

  // aplicar ajustes guardados
  var settings: Settings = loadSettings();
  audio.setVoiceEnabled(settings.voice);
  audio.setSfxEnabled(settings.sfx);

  var mapScreen: HTMLElement | null = null;
  var settingsScreen: HTMLElement | null = null;

  function showOnly(screen: HTMLElement | null): void {
    var children = Array.prototype.slice.call(app.children) as HTMLElement[];
    for (var i = 0; i < children.length; i++) {
      if (children[i] !== screen) children[i].classList.add("hidden");
    }
    if (screen) screen.classList.remove("hidden");
  }

  function openProfiles(): void {
    settingsScreen = null;
    mapScreen = null;
    while (app.firstChild) app.removeChild(app.firstChild);
    renderProfiles(host, {
      store: profiles,
      onEnter: function (_p: Profile) {
        openMap();
      },
    });
  }

  function openMap(): void {
    while (app.firstChild) app.removeChild(app.firstChild);
    mapScreen = renderMap(
      host,
      {
        store: profiles,
        onPick: function (r) {
          openActivity(r.id);
        },
        onSettings: openSettings,
        onExit: openProfiles,
      },
      ALL_RESOURCES
    );
    showOnly(mapScreen);
  }

  function refreshMap(): void {
    if (mapScreen && (mapScreen as any).refresh) (mapScreen as any).refresh();
    showOnly(mapScreen);
  }

  function openActivity(resourceId: string): void {
    var r = null as null | (typeof ALL_RESOURCES)[0];
    for (var i = 0; i < ALL_RESOURCES.length; i++) {
      if (ALL_RESOURCES[i].id === resourceId) r = ALL_RESOURCES[i];
    }
    if (!r) return;
    renderActivity(host, r, {
      store: profiles,
      settings: settings,
      onExit: refreshMap,
    });
    if (mapScreen) mapScreen.classList.add("hidden");
  }

  function openSettings(): void {
    settingsScreen = renderSettings(
      host,
      {
        onChange: function (s: Settings) {
          settings = s;
          saveSettings(s);
        },
        onClose: function () {
          settingsScreen = null;
          refreshMap();
        },
      },
      profiles
    );
    showOnly(settingsScreen);
  }

  openProfiles();

  // desbloquear audio en el primer toque (política de autoplay)
  var unlock = function (): void {
    audio.sfx.unlock();
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("mousedown", unlock);
  };
  window.addEventListener("touchstart", unlock);
  window.addEventListener("mousedown", unlock);

  // service worker (solo producción; Chrome 40+)
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* offline no disponible: el juego funciona igual */
      });
    });
  }

  // aviso amable en navegadores muy antiguos sin promesas (pre-Chromium 37)
  if (typeof (window as any).Promise === "undefined") {
    var warn = el("div", {
      class: "overlay",
      text: "Tu navegador es muy antiguo. Actualiza el sistema para jugar mejor. 🌟",
    });
    app.appendChild(warn);
    setTimeout(function () {
      if (warn.parentElement) warn.parentElement.removeChild(warn);
    }, 5000);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
