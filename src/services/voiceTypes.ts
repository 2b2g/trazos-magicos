/* Contrato de voz del juego (FDD §19).
   Vive en su propio módulo para que `audio.ts` y los proveedores
   (TTS del sistema, audios pregrabados) no se importen en círculo. */

export interface VoiceProvider {
  /** Habla una o varias frases seguidas. */
  speakAll(texts: string[]): void;
  /** Corta lo que esté sonando (barge-in del niño o cambio de pantalla). */
  cancel(): void;
  /** Activa o silencia el proveedor. */
  setEnabled(on: boolean): void;
  /** Ritmo pausado para peques (ajuste 🐢). */
  setSlow(on: boolean): void;
  /** ¿Puede hablar ahora mismo? (p. ej. sin audios grabados, false). */
  readonly available: boolean;
}
