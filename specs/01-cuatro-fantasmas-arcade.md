# SPEC 01 — Cuatro fantasmas con personalidades estilo arcade

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-10-17
> **Objective:** El juego controla cuatro fantasmas —cazador, emboscador, híbrido y tímido— que salen de la pen con delays escalonados de 0/4/8/12 segundos y aplican cada uno la estrategia del arcade clásico.

## Por qué existe esta spec

Ahora solo hay 2 fantasmas con dos comportamientos básicos (`hunter` y `random`). El objetivo es que los 4 tengan personalidades reconocibles al jugar, empezando por un cazador agresivo de verdad, y que la salida escalonada desde la pen cree presión progresiva como en el original.

## Scope

**In:**

- Ampliar `GHOST_STARTS` (`maze.js`) de 2 a 4 entradas, todas dentro de la pen, con `kind` y `exitDelay`.
- Tres comportamientos nuevos en `decideGhost` (`game.js`): `ambusher` (Pinky), `hybrid` (Inky), `shy` (Clyde); el `hunter` existente se conserva tal cual.
- Retraso de salida por fantasma: patrulla aleatoria dentro de la pen hasta que vence su delay y no puede cruzar la puerta antes de tiempo.
- Reinicio de los delays al perder una vida (`resetPositions`).
- Colores fijos por personalidad en `GHOST_COLORS` (`render.js`): rojo = cazador, rosa = emboscador, celeste = híbrido, naranja = tímido.

**Out of scope (para specs futuras):**

- Power pellets y modo asustado (fantasmas azules que huyen).
- Velocidades distintas por fantasma.
- Niveles o rondas con dificultad creciente.
- Sonido, indicadores visuales de personalidad en el HUD o nombres sobre los fantasmas.
- Pathfinding con lookahead o IA más profunda que la elección por intersección.

## Data model

```js
// maze.js — 4 entradas, todas dentro de la pen (filas 13-15, cols 11-16)
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter',   exitDelay: 0   }, // rojo
  { x: 14, y: 14, kind: 'ambusher', exitDelay: 240 }, // rosa  (4 s)
  { x: 12, y: 14, kind: 'hybrid',   exitDelay: 480 }, // celeste (8 s)
  { x: 15, y: 14, kind: 'shy',      exitDelay: 720 }, // naranja (12 s)
];

// game.js — cada fantasma en game.ghosts lleva su contador restante
{ x, y, dir, speed, kind, exitDelay } // exitDelay en frames (60 fps)

// render.js — el orden coincide con el orden de GHOST_STARTS
const GHOST_COLORS = [ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ];
```

- `exitDelay` baja 1 por frame mientras `game.state === 'playing'`.
- Cuando es `> 0`, el fantasma solo se mueve dentro de filas 13–15 / cols 11–16 y la puerta (tile `3`) cuenta como muro para él.
- `hybrid` necesita la posición del fantasma con `kind === 'hunter'` (búsqueda por `kind`, nunca por índice).

## Implementation plan

1. Ampliar `GHOST_STARTS` a 4 entradas en `maze.js` y reordenar `GHOST_COLORS` en `render.js`. Manual: recargar → 4 fantasmas de colores rojo/rosa/celeste/naranja en la pen; el rojo sale al instante por su lógica actual.
2. Copiar `exitDelay` a cada fantasma en `createGame` (`game.js`). Manual: con `console.log` al crear el juego se ven los 4 contadores.
3. Añadir la regla de espera: mientras `exitDelay > 0`, decrementar 1/frame y mover al fantasma con elección aleatoria restringida a la pen (la puerta bloquea a los fantasmas en espera vía `isWall`). Manual: el rosa no cruza la puerta hasta ~4 s.
4. Implementar `ambusher` en `decideGhost`: objetivo = celda de Pac-Man + 4 en su dirección. Manual: se le ve cortar esquinas hacia donde irá Pac-Man.
5. Implementar `hybrid`: objetivo = vector doble desde la posición del `hunter` hasta el punto 2 celdas delante de Pac-Man; minimizar distancia Manhattan a ese objetivo. Manual: su trayectoria difiere claramente de la del rojo.
6. Implementar `shy`: si distancia a Pac-Man > 8 celdas persigue; si no, va a la esquina (1,29). Manual: se le ve acercarse y luego despegarse.
7. Reiniciar `exitDelay` al valor inicial de su `kind` en `resetPositions`. Manual: chocar con un fantasma → los 4 vuelven a la pen y los delays arrancan de nuevo.

## Acceptance criteria

- [ ] El juego carga sin errores en consola y dibuja 4 fantasmas: rojo, rosa, celeste y naranja.
- [ ] Al pulsar Jugar, el rojo sale de la pen de inmediato; el rosa a los 4 s, el celeste a los 8 s y el naranja a los 12 s.
- [ ] Mientras espera, el fantasma se patrulla dentro de la pen y no cruza la puerta antes de su delay.
- [ ] En cada intersección, el rojo siempre elige la dirección que más reduce su distancia a Pac-Man.
- [ ] El rosa apunta al punto situado 4 celdas por delante de Pac-Man en la dirección en que mira.
- [ ] El celeste usa un objetivo calculado desde la posición del rojo y no replica sus movimientos.
- [ ] El naranja persigue si está a más de 8 celdas de Pac-Man y se dirige a la esquina (1,29) si está a 8 o menos.
- [ ] Al perder una vida, los 4 vuelven a sus posiciones iniciales con delays 0/4/8/12 s otra vez.
- [ ] Todos los fantasmas siguen moviéndose a `GHOST_SPEED` (velocidad única) y las colisiones restan vidas igual que antes.
- [ ] `MAZE` no se muta y el laberinto sigue simétrico tras jugar una partida completa.

## Decisions

- **Sí:** delays 0/4/8/12 s (0/240/480/720 frames). Son los tiempos del arcade; la espera larga solo afecta a los últimos.
- **No:** delays cortos 0/2/4/6 s. Los fantasmas salen demasiado pronto y se pierde la tensión creciente.
- **Sí:** los 4 arrancan dentro de la pen. Consistente con el código actual (2 ya estaban ahí); el cazador con delay 0 sale igual de inmediato que si estuviera fuera.
- **No:** que el cazador arranca fuera de la pen como en el arcade original. Requeriría reglas de posición iniciales especiales para un solo fantasma.
- **Sí:** patrulla aleatoria dentro de la pen durante la espera. Más viva que quieto y no necesita coreografía especial (no oscilar arriba/abajo).
- **Sí:** velocidades iguales. Un solo parámetro (`GHOST_SPEED`) que tunear; las personalidades se distinguen por estrategia.
- **Sí:** colores fijos por `kind`, reordenando `GHOST_STARTS` y `GHOST_COLORS` en el mismo orden. El jugador aprende a leer la amenaza por color.
- **Sí:** fórmulas arcade (Pinky 4 celdas, Inky vector doble, Clyde umbral 8 + esquina). Sin el bug de dirección original de Pinky al mirar arriba.
- **Sí:** `exitDelay` en frames dentro de `game.ghosts[].exitDelay`. `game.js` no debe leer el `frame` global de `main.js`.
- **Sí:** el kind `random` deja de usarse como comportamiento activo; su rama aleatoria se conserva como fallback del `else` en `decideGhost`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| La puerta del pen no bloquea a fantasmas en espera y salen antes de tiempo | `isWall` recibe un estado extra para "fantasma en espera" que trata el tile `3` como muro. |
| `hybrid` busca al rojo por índice y rompe si se reordena `GHOST_STARTS` | Lookup por `kind === 'hunter'`, nunca `ghosts[0]`. |
| El juego corre a 2× en pantallas de 120 Hz (todo el juego es por frame) | Los delays escalan junto con las velocidades: la experiencia relativa se mantiene igual que hoy. |

## What is **not** in this spec

- Power pellets / modo asustado.
- Velocidades por fantasma.
- Niveles o dificultad progresiva.
- Sonido y HUD de personalidades.
