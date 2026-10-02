import { describe, it, expect } from "vitest";
import { playVoiceSteps, VoiceStep, VoiceSpeaker } from "../src/services/voiceSteps";

/* La recompensa cuenta las estrellas en voz alta ("uno", "dos", "tres"…)
   y las va enseñando. El conteo de la pantalla adelantaba a la
   locución (escalón fijo de 0,28 s contra ~0,78 s por palabra), así que
   el niño veía las cinco estrellas antes de oír el número que las
   nombraba. Estos tests fijan que **cada estrella aparece cuando su
   número termina de sonar**, que nada se pisa y que la cadena se para
   si el niño se va. */

const CHEER = "¡Muy bien!";
const CUENTA = "Cuenta conmigo.";
const UNO = "uno";
const DOS = "dos";

/** Locutor de mentira: registra lo dicho y deja el final en manos del
    test (como el navegador, que avisa con `onended`). */
function fakeSpeaker() {
  var dichas: string[] = [];
  var pendientes: Array<() => void> = [];
  var speaker: VoiceSpeaker = {
    sayAll: function (texts, onDone) {
      dichas.push(texts.join(" "));
      if (onDone) pendientes.push(onDone);
    },
  };
  return {
    speaker: speaker,
    dichas: dichas,
    /** Termina la locución en curso. */
    finish: function () {
      var done = pendientes.shift();
      if (done) done();
    },
  };
}

/** Una estrella del conteo y el número que la nombra. */
function starStep(k: number, word: string, shown: number[]): VoiceStep {
  return {
    text: word,
    then: function () {
      shown.push(k);
    },
  };
}

describe("recompensa — las estrellas cuentan con la voz", () => {
  it("la primera estrella solo aparece cuando termina su número", () => {
    var loc = fakeSpeaker();
    var shown: number[] = [];
    var pasos: VoiceStep[] = [
      { text: CHEER },
      { text: CUENTA },
      starStep(0, UNO, shown),
      starStep(1, DOS, shown),
    ];
    playVoiceSteps(loc.speaker, pasos);
    // una frase cada vez: la siguiente espera al final de la anterior
    expect(loc.dichas).toEqual([CHEER]);
    expect(shown).toEqual([]);
    loc.finish(); // termina el ánimo
    expect(loc.dichas).toEqual([CHEER, CUENTA]);
    expect(shown).toEqual([]);
    loc.finish(); // "Cuenta conmigo."
    expect(loc.dichas).toEqual([CHEER, CUENTA, UNO]);
    expect(shown).toEqual([]);
    loc.finish(); // termina "uno" → aparece su estrella
    expect(shown).toEqual([0]);
    loc.finish(); // termina "dos"
    expect(shown).toEqual([0, 1]);
  });

  it("el número suena entero antes de enseñar su estrella", () => {
    // el orden inverso (enseñar y luego decir) es justo el defecto
    var loc = fakeSpeaker();
    var shown: number[] = [];
    playVoiceSteps(loc.speaker, [starStep(0, UNO, shown)]);
    expect(shown).toEqual([]); // aún no ha sonado nada
    loc.finish();
    expect(shown).toEqual([0]);
  });

  it("se salta las frases vacías sin romper la cadena", () => {
    var loc = fakeSpeaker();
    var shown: number[] = [];
    playVoiceSteps(loc.speaker, [{ text: "" }, starStep(0, UNO, shown), { text: "" }]);
    expect(loc.dichas).toEqual([UNO]);
    loc.finish();
    expect(shown).toEqual([0]);
  });

  it("si el niño se va a mitad, no aparece ninguna estrella a destiempo", () => {
    var loc = fakeSpeaker();
    var shown: number[] = [];
    var alive = true;
    playVoiceSteps(
      loc.speaker,
      [starStep(0, UNO, shown), starStep(1, DOS, shown)],
      {
        isAlive: function () {
          return alive;
        },
      }
    );
    alive = false; // botón "Seguir" / pantalla cerrada
    loc.finish();
    expect(shown).toEqual([]);
    loc.finish();
    expect(loc.dichas).toEqual([UNO]); // la cadena se paró
  });

  it("sin pasos no dice nada y avisa igualmente del final", () => {
    var loc = fakeSpeaker();
    var fin = 0;
    playVoiceSteps(loc.speaker, [], {
      onEnd: function () {
        fin++;
      },
    });
    expect(loc.dichas).toEqual([]);
    expect(fin).toBe(1);
  });
});