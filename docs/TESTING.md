# Estrategia de pruebas — Trazos Mágicos

> Documento vivo: cualquier fix o funcionalidad nueva entra aquí con su resultado.

## 1. Tres niveles

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| **Unitarios** | Vitest (`npm test`) | sampling, evaluación, umbrales, almacenamiento, integridad del contenido |
| **E2E sintético** | navegador + eventos Pointer sintéticos (`preview_evaluate`) | flujo completo real: perfiles → mapa → demo → trazado → recompensa → progreso |
| **Checklist de dispositivo** | manual (README) | Android 5 WebView real, iPad, gama baja, offline, rechazo de palma |

## 2. Suite unitaria (28 tests, todos en verde)

- `tests/engine.test.ts` — muestreo (extremos exactos, continuidad de la O,
  espaciado uniforme), evaluador (trazo perfecto, temblor infantil, trazo
  desplazado, trazo corto, **medio trazo rechazado**, dirección invertida en
  modo estricto, **tolerancia adaptativa: lo que falla estricto pasa relajado**,
  curva ∪ vs ∩, fronteras de estrellas), contenido (27 letras con Ñ, 10 dígitos
  con `count` correcto, ids únicos, habla en cada recurso, **continuidad
  geométrica: ningún salto > 40 px en todo el catálogo**, significado
  emoji+palabra, frases en español).
- `tests/storage.test.ts` — ciclo de perfiles, **monotonía del progreso**
  (un intento peor nunca resta), `completed` pegajoso, suma de estrellas,
  **JSON corrupto no rompe**, ajustes con defaults y merge, **localStorage
  bloqueado no rompe**.

## 3. Batería E2E en navegador (sesión de prueba intensiva)

Ejecutada con Chromium (preview) sobre el bundle de producción, simulando el
dedo con PointerEvents sintéticos y leyendo localStorage como oráculo.

| # | Escenario | Resultado |
|---|---|---|
| 1 | Crear perfil (avatar+nombre) y entrar al mapa | ✅ |
| 2 | Ajustes: puerta parental 3 s, toggles, persistencia en localStorage | ✅ |
| 3 | Ajustes persistidos tras recarga y aplicados al arrancar | ✅ |
| 4 | Multi-perfil: 2 perfiles, **aislamiento de progreso** (⭐12 vs ⭐0), cambio y vuelta | ✅ |
| 5 | Nodo bloqueado: no abre actividad | ✅ (fix #3: ahora con feedback en bocadillo) |
| 6 | Trazado fallido ×2 → ánimo → demo individual → **relajación de tolerancia** → éxito | ✅ |
| 7 | Detección geométrica: curva ∪ trazada como ∩ rechazada | ✅ |
| 8 | **Medio trazo rechazado** (umbral pedagógico) | ✅ (fix #1) |
| 9 | Fase A completa trazada con geometría exacta: línea, horizontal, ∪, ∩, onda, zigzag, círculo | ✅ |
| 10 | Multi-trazo (cruz): "trazo 2 de 2", avance correcto | ✅ |
| 11 | Letra I: recompensa con significado (🪁 "I de Isla") | ✅ |
| 12 | Número 1: relación símbolo→cantidad (1 objeto contable) | ✅ |
| 13 | Recompensa: estrellas 1–3, precisión %, "Otra vez" y "Seguir" | ✅ |
| 14 | Progreso persistente y desbloqueo encadenado | ✅ (fix #2: regla única) |
| 15 | Botón casa a mitad de actividad: vuelve al mapa sin errores | ✅ |
| 16 | Consola limpia con el bundle final (fix #4 del `setPointerCapture`) | ✅ |

## 4. Hallazgos y correcciones de la batería

1. **Pedagógico** — la mitad de un trazo aprobaba (cobertura 0.5). → `EASY_EVAL.minCoverage 0.5→0.65` (el corredor de 34 px sobre ~300 px de trazo daba 0.61 a medio camino).
2. **Regla de desbloqueo duplicada** — el mapa y el storage divergían y el nodo "actual" señalaba uno completado. → Regla única en `map.ts` (`playable/nextIndex`), `ProfileStore.isUnlocked` eliminada.
3. **Feedback de nodo bloqueado** solo sonoro → ahora actualiza el bocadillo de la mascota.
4. **`setPointerCapture` NotFoundError** con punteros que sueltan antes del capture (WebViews antiguos) → try/catch defensivo.
5. **Geometría** — zigzag con discontinuidad en `phase=0.5` (salto 86 px) y estrella de 4 puntas con un segmento mal apuntado (salto 124 px). El nuevo test de continuidad los habría cazado desde el principio; ahora forma parte de la suite.

## 5. Cómo reproducir la batería sintética

```js
// en la consola del navegador (o preview_evaluate):
const c = document.querySelector('.canvas-holder canvas');
const r = c.getBoundingClientRect();
const ev = (t,x,y) => c.dispatchEvent(new PointerEvent(t,
  {clientX:x, clientY:y, pointerId:1, pointerType:'touch', isPrimary:true,
   bubbles:true, cancelable:true, button:0}));
// esperar a que termine la demo (~4 s), luego trazar:
ev('pointerdown', r.left+r.width*0.5, r.top+r.height*0.16);
for (let i=1;i<=20;i++) ev('pointermove', r.left+r.width*0.5, r.top+r.height*(0.16+0.68*i/20));
ev('pointerup', r.left+r.width*0.5, r.top+r.height*0.84);
// oráculo: !!document.querySelector('.reward-layer')
```

## 6. Pendiente de dispositivo real (bloqueante para lanzar)

Ver checklist completo en el README: Android 5 real, iPad Safari, gama baja,
modo avión/PWA, rechazo de palma física, TTS del sistema.
