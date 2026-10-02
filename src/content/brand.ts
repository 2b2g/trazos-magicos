/* Identidad del producto en un solo sitio: nombre, mascota y textos
   de marca. Cambiar `name` renombra todo el juego (logo, TTS, docs de
   UI) sin tocar pantallas ni lógica. */

export const BRAND = {
  /** Nombre visible del producto. */
  name: "Garabati",
  /** Nombre de la mascota (lápiz con cara que guía al niño). */
  mascot: "Liro",
  /** Lema corto (≤ 4 palabras) para la pantalla de inicio. */
  tagline: "Dibujar es jugar",
} as const;
