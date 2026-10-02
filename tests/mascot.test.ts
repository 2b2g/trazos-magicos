import { describe, it, expect } from "vitest";
import { mascotStage } from "../src/ui/mascot";

/* La mascota que crece es una mecánica de retención (guía UX §8):
   sus umbrales son contrato, no decoración. */
describe("mascota Liro — etapas de crecimiento", () => {
  it("empieza pequeña sin estrellas", () => {
    expect(mascotStage(0)).toBe(1);
    expect(mascotStage(4)).toBe(1);
  });

  it("crece con destello a partir de 5 estrellas", () => {
    expect(mascotStage(5)).toBe(2);
    expect(mascotStage(19)).toBe(2);
  });

  it("llega a la corona con 20 estrellas o más", () => {
    expect(mascotStage(20)).toBe(3);
    expect(mascotStage(200)).toBe(3);
  });

  it("es monótona: más estrellas nunca retroceden la etapa", () => {
    var last = 1;
    for (var s = 0; s <= 60; s++) {
      var stage = mascotStage(s);
      expect(stage).toBeGreaterThanOrEqual(last);
      last = stage;
    }
  });
});
