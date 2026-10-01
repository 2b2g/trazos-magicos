# Trazos Mágicos ✏️

Videojuego web educativo de **grafomotricidad, preescritura y escritura inicial** para niños de 3 a 6 años. Implementación del FDD v2.0 (MVP Fases A–D).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura completa: motor, evaluación, entrada, audio, storage, contenido, compatibilidad |
| [docs/TESTING.md](docs/TESTING.md) | Estrategia de pruebas, batería E2E ejecutada y hallazgos corregidos |
| [docs/MANUAL.md](docs/MANUAL.md) | Manual para adultos: perfiles, ajustes, pedagogía y problemas frecuentes |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Registro de cambios (mantener junto a cada cambio de código) |

> **Regla del proyecto**: todo cambio de comportamiento se documenta en el mismo
> paso — JSDoc en el código, sección en `docs/ARCHITECTURE.md` si toca
> arquitectura, y entrada en `docs/CHANGELOG.md`.

## Ejecutar

```bash
npm install
npm run dev        # desarrollo → http://localhost:5173
npm test           # tests unitarios del motor (Vitest)
npm run build      # build de producción (ES5 legacy + PWA)
npm run preview    # servir dist/
```

> ⚠️ Compatibilidad objetivo: **Android 5+ (Chromium 37)**. El build genera un bundle ES5 con polyfills (44 kB + 28 kB gzip). Sin CSS Grid, sin `var()`, sin flex `gap`, con Touch Events como entrada principal y Pointer Events como mejora progresiva.

## Arquitectura

```
src/
├── engine/            ← MOTOR DE TRAZADO (el activo reutilizable, FDD §58)
│   ├── types.ts       tipos: Segment, StrokeDef, ResourceDef, evaluaciones
│   ├── geom.ts        vectores (ES5)
│   ├── sampling.ts    segmentos → polilíneas muestreadas + remuestreo uniforme
│   ├── evaluator.ts   precisión, cobertura, inicio, dirección; umbrales indulgentes
│   ├── touch.ts       entrada táctil/ratón unificada + rechazo de palma
│   ├── render.ts      Canvas 2D: corredor de tolerancia, punto de inicio, flechas
│   └── demo.ts        animación del lápiz mágico (trazo a trazo)
├── content/           ← TODO EL CONTENIDO ES DATOS, no código (FDD §7)
│   ├── strokesPhaseA.ts   8 trazos: líneas, curvas, onda, zigzag, círculo
│   ├── shapesPhaseB.ts    6 formas/patrones
│   ├── lettersPhaseC.ts   27 mayúsculas (con Ñ) en 5 familias motoras
│   ├── numbersPhaseD.ts   dígitos 0–9 + palabras post-MVP
│   ├── families.ts        fases y familias pedagógicas configurables
│   └── phrases.ts         catálogo de frases TTS en español
├── screens/           perfiles, mapa, actividad (bucle completo), ajustes
├── services/          audio (TTS configurable + SFX WebAudio), storage multi-perfil
├── util/dom.ts        helpers DOM ES5
└── main.ts            orquestador + service worker
```

### El bucle de actividad (FDD §13, §50–51)

`presentación → demostración → trazado trazo a trazo → evaluación adaptativa → recompensa`

- **Evaluación adaptativa**: si el niño falla, la tolerancia se relaja progresivamente (hasta +48 % de corredor, umbrales más bajos) y se desactivan las exigencias de inicio/dirección tras 2 intentos. Nunca hay castigo ni bloqueo.
- **Recompensa con significado**: letras → emoji y palabra ("A de Avión", FDD §18); números → objetos contables con conteo hablado (FDD §23–25).
- **Estrellas 1–3**, nunca 0 (FDD UX: sin fracaso).

### Añadir contenido nuevo

1. Una letra nueva = una entrada en `lettersPhaseC.ts` con sus trazos como segmentos (`ln`, `ar`, `qd`, `wv` en coordenadas 0–1).
2. Órdenes de trazado alternativos: campo `altOrders` (FDD §7).
3. Las familias y fases se reordenan en `families.ts` sin tocar código.

## UI/UX para 3–6 años (decisiones aplicadas)

- **Sin lectura**: instrucciones habladas (TTS es-ES) + botones-icónicos grandes.
- **Táctil primero**: rechazo de palma (un solo puntero activo), `touch-action: none`, preventDefault en todo el lienzo.
- **Sin fracaso**: tolerancia generosa y adaptativa, sin cronómetro, mensajes de ánimo aleatorios.
- **Puerta parental**: ajustes y borrado de perfil tras mantener pulsado 3 s.
- **Privacidad**: cero redes en runtime, datos 100 % en localStorage (COPPA/GDPR-K by design).
- **Rendimiento gama baja**: DPR limitado a 1.5, Canvas 2D puro, animaciones por rAF.

## Despliegue con Docker

Imagen multi-stage (build Node 20 → nginx alpine ~30 MB) sin backend: el
dist/ compilado se sirve estático y el estado vive en el navegador.

```bash
# construir
docker build -t trazos-magicos:latest .

# ejecutar (http://localhost:8080)
docker run -d --name trazos -p 8080:8080 --restart unless-stopped trazos-magicos:latest

# con plugin compose
docker compose up -d --build
```

- El contenedor incluye **healthcheck** y sirve en el puerto **8080**.
- Caché correcta para PWA: `/assets/*` inmutable 1 año, `index.html` y
  `sw.js` siempre revalidados (las actualizaciones llegan solas).
- **HTTPS**: ponlo detrás de Caddy/Traefik/nginx-proxy-manager. El service
  worker (juego offline) solo se registra bajo `https://` o `localhost`.

## Checklist de prueba en dispositivos reales

- [ ] Android 5–7 WebView (navegador del sistema): trazo fluido, sin scroll accidental
- [ ] iPad Safari: `touch-action` + viewport, audio TTS en es
- [ ] Tablet Android gama baja: FPS de trazado aceptable (DPR 1.5 máx.)
- [ ] Offline: abrir 2 veces, activar modo avión, recargar (service worker)
- [ ] "Añadir a pantalla de inicio" (PWA fullscreen landscape)
- [ ] Voz TTS: presente, a 0.92× velocidad; interruptor funciona
- [ ] Rechazo de palma: apoyar la mano mientras se traza con un dedo
- [ ] Puerta parental: toque rápido NO abre ajustes; 3 s sí
- [ ] localStorage bloqueado (modo incógnito): el juego sigue funcionando sin guardar

## Post-MVP (ya preparado en el motor)

Minúsculas (fase independiente), secuencias `1 2 _ 4 5`, palabras (SOL, LUNA… — datos en `numbersPhaseD.ts`), órdenes alternativos por método de enseñanza, números ≥ 10, sustitución de TTS por locución grabada (proveedor intercambiable en `services/audio.ts`).

---

🤖 Generated with Codebuff
