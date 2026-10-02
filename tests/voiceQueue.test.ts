import { describe, it, expect, vi } from "vitest";
import { VoiceSequencer } from "../src/services/voiceSequencer";
import { AudioService, ClipSpeaker } from "../src/services/audio";
import { VoiceProvider } from "../src/services/voiceTypes";

/* La voz es la instrucción: una frase cortada a media palabra no
   comunica nada a un peque de 3–6 años. Estos tests fijan el contrato
   de "nunca se corta" entre la cola (`voiceSequencer`), la fachada
   (`audio`) y los proveedores. */

/** Proveedor de clips de mentira: registra llamadas y permite terminar
    la locución a mano (sin DOM ni Audio reales). */
function fakeClips(hasAudio: boolean) {
  var played: string[][] = [];
  var pending: Array<() => void> = [];
  var cancels = 0;
  var fake: ClipSpeaker = {
    available: true,
    description: "fake · Voz de prueba (0 audios)",
    has: function () {
      return hasAudio;
    },
    playAll: function (texts, onDone) {
      if (!hasAudio) return false;
      played.push(texts.slice());
      if (onDone) pending.push(onDone);
      return true;
    },
    speakAll: function (texts, onDone) {
      if (!this.playAll(texts, onDone) && this.onFallback) this.onFallback(texts, onDone);
    },
    cancel: function () {
      cancels++;
    },
    setEnabled: function () {
      /* noop */
    },
    setSlow: function () {
      /* noop */
    },
    unlock: function () {
      /* noop */
    },
    onFallback: null,
  };
  return {
    provider: fake,
    played: played,
    cancels: function () {
      return cancels;
    },
    /** Termina la locución en curso como haría el navegador. */
    finish: function () {
      var done = pending.shift();
      if (done) done();
    },
    pending: function () {
      return pending.length;
    },
  };
}

/** Proveedor de voz del sistema de mentira (TTS de respaldo). */
function fakeSystem() {
  var spoken: string[][] = [];
  var pending: Array<() => void> = [];
  var provider: VoiceProvider = {
    available: true,
    speakAll: function (texts, onDone) {
      spoken.push(texts.slice());
      if (onDone) pending.push(onDone);
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
    finish: function () {
      var done = pending.shift();
      if (done) done();
    },
  };
}

describe("cola de voz — ninguna locución se corta", () => {
  it("la frase que suena termina antes de empezar la siguiente", () => {
    var played: string[][] = [];
    var seq = new VoiceSequencer(function (texts) {
      played.push(texts);
    });
    seq.enqueue(["primera"]);
    seq.enqueue(["segunda"]);
    expect(played.length).toBe(1);
    expect(played[0]).toEqual(["primera"]);
    expect(seq.waiting).toBe(1);
    expect(seq.busy).toBe(true);
  });

  it("avanza en orden cuando el proveedor avisa de que terminó", () => {
    var played: string[][] = [];
    var dones: string[] = [];
    var seq = new VoiceSequencer(function (texts, done) {
      played.push(texts);
      dones.push(done as unknown as string);
    });
    seq.enqueue(["primera"], function () {
      dones.push("onDone:primera");
    });
    seq.enqueue(["segunda"]);
    // el proveedor termina la primera
    (dones[0] as unknown as () => void)();
    expect(played).toEqual([["primera"], ["segunda"]]);
    expect(dones).toContain("onDone:primera");
  });

  it("onDone permite encadenar sin temporizadores (presentación → demo)", () => {
    var played: string[][] = [];
    var seq = new VoiceSequencer(function (texts, done) {
      played.push(texts);
      done(); // locución instantánea
    });
    seq.enqueue(["intro"], function () {
      seq.enqueue(["mírame"]);
    });
    expect(played).toEqual([["intro"], ["mírame"]]);
  });

  it("con la cola llena se descartan los avisos más viejos, jamás el que suena", () => {
    var played: string[][] = [];
    var seq = new VoiceSequencer(function (texts) {
      played.push(texts);
    }, 2);
    var dropped: string[] = [];
    seq.enqueue(["suena"]);
    seq.enqueue(["cola1"]);
    seq.enqueue(["cola2"]);
    seq.enqueue(["cola3"], function () {
      dropped.push("cola3");
    });
    expect(seq.waiting).toBe(2);
    expect(played).toEqual([["suena"]]);
  });

  it("cancel() interrumpe y vacía la cola (salir de pantalla o silenciar)", () => {
    var played: string[][] = [];
    var seq = new VoiceSequencer(function (texts, done) {
      played.push(texts);
      // se guarda el done para llamarlo tarde, como haría el navegador
      void done;
    });
    seq.enqueue(["sonando"]);
    seq.enqueue(["en espera"]);
    seq.cancel();
    expect(seq.busy).toBe(false);
    expect(seq.waiting).toBe(0);
    expect(played).toEqual([["sonando"]]);
  });

  it("si el proveedor nunca avisa, el perro guardián desatasca la cola", () => {
    vi.useFakeTimers();
    try {
      var played: string[][] = [];
      var seq = new VoiceSequencer(function (texts) {
        played.push(texts);
      });
      seq.enqueue(["a"]);
      seq.enqueue(["b"]);
      vi.advanceTimersByTime(60000);
      expect(played).toEqual([["a"], ["b"]]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("fachada de audio — la voz no se pisa", () => {
  it("un sayAll nuevo espera a que termine el anterior en vez de cortarlo", () => {
    var clips = fakeClips(true);
    var service = new AudioService({ clips: clips.provider, system: fakeSystem().provider });
    service.sayAll(["primera"]);
    service.sayAll(["segunda"]);
    expect(clips.played).toEqual([["primera"]]);
    expect(clips.cancels()).toBe(0); // la clave: no se cancela lo que suena
    clips.finish();
    expect(clips.played).toEqual([["primera"], ["segunda"]]);
  });

  it("stopVoice sí interrumpe: cambiar de pantalla no espera a la voz", () => {
    var clips = fakeClips(true);
    var service = new AudioService({ clips: clips.provider, system: fakeSystem().provider });
    service.sayAll(["sonando"]);
    service.sayAll(["en espera"]);
    service.stopVoice();
    expect(clips.cancels()).toBeGreaterThan(0);
    clips.finish(); // el navegador avisa tarde: la cola cancelada no revive
    expect(clips.played).toEqual([["sonando"]]);
  });

  it("con la voz silenciada la cola no se atasca: el flujo sigue", () => {
    var clips = fakeClips(true);
    var service = new AudioService({ clips: clips.provider, system: fakeSystem().provider });
    service.setVoiceEnabled(false);
    var done = false;
    service.sayAll(["no debe sonar"], function () {
      done = true;
    });
    expect(done).toBe(true);
    expect(clips.played).toEqual([]);
  });

  it("una locución sin clips se locuta entera con la voz del sistema", () => {
    var clips = fakeClips(false);
    var system = fakeSystem();
    var service = new AudioService({ clips: clips.provider, system: system.provider });
    service.sayAll(["sin audio"]);
    expect(clips.played).toEqual([]);
    expect(system.spoken).toEqual([["sin audio"]]);
  });

  it("si un clip no puede sonar, la locución sigue con TTS y avisa del final", () => {
    var clips = fakeClips(true);
    var system = fakeSystem();
    var service = new AudioService({ clips: clips.provider, system: system.provider });
    var seqSpoken: string[] = [];
    service.sayAll(["clip que falla"]);
    expect(clips.played).toEqual([["clip que falla"]]);
    // el navegador bloquea el autoplay: el proveedor pasa la frase al TTS
    expect(clips.provider.onFallback).not.toBeNull();
    clips.provider.onFallback!(["clip que falla"], function () {
      seqSpoken.push("terminó el respaldo");
    });
    expect(system.spoken).toEqual([["clip que falla"]]);
    system.finish(); // el respaldo termina: la locución se da por completa
    expect(seqSpoken).toEqual(["terminó el respaldo"]);
  });
});
