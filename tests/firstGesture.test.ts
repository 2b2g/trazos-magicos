import { describe, it, expect } from "vitest";
import { FirstGestureGate, GESTURE_EVENTS, GestureTarget, GestureListener } from "../src/services/firstGesture";
import { AudioService, ClipSpeaker } from "../src/services/audio";
import { VoiceProvider } from "../src/services/voiceTypes";

/* El saludo de la pantalla de perfiles ("¿Quién quiere jugar?") es la
   PRIMERA locución de la sesión. Pedida al arrancar, sin gesto previo,
   el navegador rechaza el MP3 y la frase cae al respaldo de la Web
   Speech API: se oía la voz del sistema —en muchos Mac, masculina— en
   vez de Paulina (auditoría de voz 0.7.1, bug cerrado en 0.8.1).

   Estos tests fijan que el saludo:
   1. no se pide antes de un gesto del niño (nada de locución muda),
   2. suena con el clip del juego (nunca con el TTS de respaldo),
   3. no repite ni se cuelga si el niño salta a la pantalla siguiente. */

/** Doble de `window`: guarda los escuchas para poder disparar gestos. */
function fakeTarget() {
  var listeners: Array<{ type: string; fn: GestureListener; capture?: boolean }> = [];
  var target: GestureTarget = {
    addEventListener: function (type: string, fn: GestureListener, capture?: boolean) {
      listeners.push({ type: type, fn: fn, capture: capture });
    },
    removeEventListener: function (type: string, fn: GestureListener, capture?: boolean) {
      for (var i = listeners.length - 1; i >= 0; i--) {
        var l = listeners[i];
        if (l.type === type && l.fn === fn && l.capture === capture) listeners.splice(i, 1);
      }
    },
  };
  return {
    target: target,
    count: function () {
      return listeners.length;
    },
    /** Dispara un gesto como el navegador (con su evento original). */
    fire: function (type: string, ev?: any) {
      for (var i = 0; i < listeners.length; i++) {
        if (listeners[i].type === type) listeners[i].fn(ev || { type: type });
      }
    },
  };
}

/** Proveedor de clips de mentira (con `unlock` observable). */
function fakeClips(hasAudio: boolean, instantanea?: boolean) {
  var played: string[][] = [];
  var unlocks = 0;
  var pendientes: Array<() => void> = [];
  var provider: ClipSpeaker = {
    available: true,
    description: "fake · Voz de prueba (0 audios)",
    has: function () {
      return hasAudio;
    },
    playAll: function (texts, onDone) {
      if (!hasAudio) return false;
      played.push(texts.slice());
      if (onDone) {
        // por defecto la locución es instantánea; con `instantanea: false`
        // el final se dispara a mano, como hace el navegador
        if (instantanea === false) pendientes.push(onDone);
        else onDone();
      }
      return true;
    },
    speakAll: function (texts, onDone) {
      if (!this.playAll(texts, onDone) && this.onFallback) this.onFallback(texts, onDone);
    },
    cancel: function () {
      /* noop */
    },
    setEnabled: function () {
      /* noop */
    },
    setSlow: function () {
      /* noop */
    },
    unlock: function () {
      unlocks++;
    },
    onFallback: null,
  };
  return {
    provider: provider,
    played: played,
    unlocks: function () {
      return unlocks;
    },
    /** Termina la locución en curso como haría el navegador. */
    finish: function () {
      var done = pendientes.shift();
      if (done) done();
    },
  };
}

/** Proveedor de voz del sistema de mentira (el "mal" que se oía). */
function fakeSystem() {
  var spoken: string[][] = [];
  var provider: VoiceProvider = {
    available: true,
    speakAll: function (texts, onDone) {
      spoken.push(texts.slice());
      if (onDone) onDone();
    },
    cancel: function () {
      /* noop */
    },
    setEnabled: function () {
      /* noop */
    },
    setSlow: function () {
      /* noop */
    },
  };
  return {
    provider: provider,
    spoken: spoken,
  };
}

function service(gestureTarget: GestureTarget | null, hasAudio = true) {
  var clips = fakeClips(hasAudio);
  var system = fakeSystem();
  return {
    clips: clips,
    system: system,
    audio: new AudioService({
      clips: clips.provider,
      system: system.provider,
      gestureTarget: gestureTarget,
    }),
  };
}

const SALUDO = "¿Quién quiere jugar?";
const BIENVENIDA = "Elige una actividad.";

describe("espera del primer gesto", () => {
  it("no dice nada hasta que el niño toca la pantalla", () => {
    var win = fakeTarget();
    var s = service(win.target);
    s.audio.sayOnFirstGesture(SALUDO);
    expect(s.clips.played).toEqual([]);
    expect(s.system.spoken).toEqual([]);
    expect(s.audio.hasGesture).toBe(false);
  });

  it("en el primer toque desbloquea el audio y dice el saludo con el clip", () => {
    var win = fakeTarget();
    var s = service(win.target);
    s.audio.sayOnFirstGesture(SALUDO);
    win.fire("touchstart");
    expect(s.clips.unlocks()).toBe(1); // el MP3 ya puede sonar
    expect(s.clips.played).toEqual([[SALUDO]]);
    expect(s.system.spoken).toEqual([]); // nada de voz del sistema
    expect(s.audio.hasGesture).toBe(true);
  });

  it("dispara una sola vez: el segundo toque no repite el saludo", () => {
    var win = fakeTarget();
    var s = service(win.target);
    s.audio.sayOnFirstGesture(SALUDO);
    win.fire("mousedown");
    win.fire("mousedown");
    win.fire("keydown");
    expect(s.clips.played).toEqual([[SALUDO]]);
  });

  it("acepta cualquier gesto (toque, ratón o teclado)", () => {
    for (var i = 0; i < GESTURE_EVENTS.length; i++) {
      var win = fakeTarget();
      var s = service(win.target);
      s.audio.sayOnFirstGesture(SALUDO);
      win.fire(GESTURE_EVENTS[i]);
      expect(s.clips.played).toEqual([[SALUDO]]);
    }
  });

  it("si el niño ya eligió jugador con ese toque, no le pregunta nada", () => {
    var win = fakeTarget();
    var s = service(win.target);
    // el toque cae en una tarjeta: el niño ya sabe qué hacer
    s.audio.sayOnFirstGesture(SALUDO, function (ev?: any) {
      return !ev.target.className.match("profile-card");
    });
    win.fire("mousedown", { target: { className: "profile-card" } });
    expect(s.clips.played).toEqual([]);
    expect(s.system.spoken).toEqual([]);
  });

  it("una espera cancelada no suena ni deja escuchas colgados", () => {
    var win = fakeTarget();
    var s = service(win.target);
    var cancel = s.audio.sayOnFirstGesture(SALUDO);
    expect(win.count()).toBe(GESTURE_EVENTS.length);
    cancel();
    expect(win.count()).toBe(0);
    win.fire("touchstart");
    expect(s.clips.played).toEqual([]);
  });

  it("al volver a la pantalla principal el saludo suena de inmediato", () => {
    var win = fakeTarget();
    var s = service(win.target);
    s.audio.sayOnFirstGesture(SALUDO);
    win.fire("touchstart");
    // segunda visita a perfiles: el audio ya está desbloqueado
    s.audio.sayOnFirstGesture(SALUDO);
    expect(s.clips.played).toEqual([[SALUDO], [SALUDO]]);
  });

  it("con la voz silenciada el saludo en espera no suena", () => {
    var win = fakeTarget();
    var s = service(win.target);
    s.audio.sayOnFirstGesture(SALUDO);
    s.audio.setVoiceEnabled(false);
    expect(win.count()).toBe(0);
    win.fire("touchstart");
    expect(s.clips.played).toEqual([]);
    expect(s.system.spoken).toEqual([]);
  });

  it("sin clips de la frase, la voz del sistema la dirá entera (respaldo)", () => {
    var win = fakeTarget();
    var s = service(win.target, false);
    s.audio.sayOnFirstGesture(SALUDO);
    win.fire("touchstart");
    expect(s.clips.played).toEqual([]);
    expect(s.system.spoken).toEqual([[SALUDO]]);
  });

  it("la bienvenida del mapa espera su turno y no pisa al saludo", () => {
    var win = fakeTarget();
    var clips = fakeClips(true, false); // el final lo dispara el "navegador"
    var system = fakeSystem();
    var audio = new AudioService({
      clips: clips.provider,
      system: system.provider,
      gestureTarget: win.target,
    });
    // el niño toca la pantalla, oye el saludo y elige jugador: el mapa
    // entra mientras el saludo todavía suena
    audio.sayOnFirstGesture(SALUDO);
    win.fire("touchstart");
    audio.say(BIENVENIDA);
    expect(clips.played).toEqual([[SALUDO]]); // la bienvenida espera
    clips.finish();
    expect(clips.played).toEqual([[SALUDO], [BIENVENIDA]]);
    expect(system.spoken).toEqual([]); // ninguna cae al TTS
  });
});

describe("la espera por sí sola (sin DOM)", () => {
  it("sin destino de gestos no se arma y no rompe nada", () => {
    var gate = new FirstGestureGate(null);
    var fired = 0;
    gate.arm(function () {
      fired++;
    });
    expect(gate.armed).toBe(false);
    expect(fired).toBe(0);
  });

  it("el callback recibe el evento original y se desengancha", () => {
    var win = fakeTarget();
    var gate = new FirstGestureGate(win.target);
    var target = { name: "botón Nuevo" };
    var seen: any = null;
    gate.arm(function (ev?: any) {
      seen = ev;
    });
    expect(gate.armed).toBe(true);
    win.fire("touchstart", target);
    expect(seen).toBe(target);
    expect(gate.armed).toBe(false);
    expect(win.count()).toBe(0);
  });

  it("armar dos veces deja solo la última espera viva", () => {
    var win = fakeTarget();
    var gate = new FirstGestureGate(win.target);
    var calls: string[] = [];
    gate.arm(function () {
      calls.push("primera");
    });
    gate.arm(function () {
      calls.push("segunda");
    });
    expect(win.count()).toBe(GESTURE_EVENTS.length); // no se duplican
    win.fire("touchstart");
    expect(calls).toEqual(["segunda"]);
  });
});
