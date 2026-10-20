# SPEC 03 — Power pellets en las esquinas y modo asustado

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-20
> **Objective:** Añadir 4 power pellets en las esquinas del tablero que activan el modo asustado: los fantasmas huyen en azul durante 7 s y son comibles con puntuación creciente.

## Por qué existe esta spec

SPEC 01 dejó los power pellets y el modo asustado explícitamente fuera de su alcance. Hoy los fantasmas nunca son vulnerables: toda colisión resta vida. Esta spec añade la mecánica de vuelta al arcade: 4 pellets grandes en las esquinas que asustan a los fantasmas durante unos segundos, permitiendo comérselos y virar el juego de perseguir a huir.

## Scope

**In:**

- Tile nuevo `4` (power pellet) en el laberinto: las celdas `(1,3)`, `(26,3)`, `(1,26)` y `(26,26)` de `MAZE_STR` (`src/js/maze.js`) cambian de `.` a `o`.
- Consumo del pellet en `movePacman` (`src/js/game.js`): +50 puntos, descuenta `dotsRemaining` y activa el modo asustado.
- Temporizador global `scared` en `game` (420 frames = 7 s; los últimos 120 frames son la fase de parpadeo).
- Fuga de los fantasmas asustados en `decideGhost` (`src/js/game.js`): eligen la dirección (sin 180°) que más aumenta su distancia a Pac-Man.
- Colisión durante el modo asustado: Pac-Man se come el fantasma (+200, y el siguiente de la misma potencia el doble: 400/800/1600) y el fantasma regresa a la pen para volver a salir por la ruta fija de SPEC 02.
- Cancelación del modo asustado y del contador de fantasmas comidos al perder una vida, sin restaurar los pellets ya comidos.
- Dibujo del power pellet como círculo grande (~radio 6 px) que parpadea cada ~15 frames (`src/js/render.js`).
- Dibujo de los fantasmas asustados en azul, parpadeando a blanco los últimos 2 s (`src/js/render.js`).

**Out of scope (para specs futuras):**

- Reaparición de los power pellets al perder una vida (decidido: no reaparecen).
- Velocidad reducida para fantasmas asustados (siguen a `GHOST_SPEED`).
- Ojos del fantasma comido volando de vuelta a la pen (se teletransporta).
- Nivel siguiente al vaciar el tablero, sonido, indicador de tiempo restante en el HUD.

## Data model

```js
// maze.js — MAZE_STR: filas 3 y 26, columnas 1 y 26 pasan de '.' a 'o'
// parseTile: if ( ch === 'o' ) return 4;   // power pellet (transitable, como dot)

// game.js — constantes de reglas
const SCARED_FRAMES = 420;        // 7 s a 60 fps
const SCARED_FLASH_FRAMES = 120;  // últimos 2 s: parpadeo
const POWER_PELLET_SCORE = 50;
const GHOST_EAT_BASE = 200;       // 200/400/800/1600 = 200 * 2^cadena

// game.js — estado nuevo en game (createGame)
{
  scared: 0,     // frames restantes de modo asustado
  ghostChain: 0, // fantasmas comidos en la potencia actual (0,1,2,3)
}
```

- `scared` se decrementa 1 por frame al final de `update`, después de resolver colisiones: un fantasma chocado en el último frame del modo sigue siendo comido.
- Comer un power pellet reinicia `scared` a `SCARED_FRAMES` y `ghostChain` a 0 (no se acumula el tiempo restante, pero sí se reinicia la cadena).
- `dotsRemaining` cuenta dots (tile `2`) y power pellets (tile `4`): sumar los 4 pellets es necesario para ganar.
- Un fantasma comido vuelve a la pen con `x` = su celda de inicio en `GHOST_STARTS` (lookup por `kind`, nunca por índice), `y = 14`, `exitDelay = 0`, `exited = false`, `dir = 'up'`; desde ahí sale por `decideExit` (SPEC 02).

## Implementation plan

1. En `maze.js`, ampliar `parseTile` con `'o' → 4` y cambiar las 4 esquinas de `MAZE_STR` (filas 3 y 26, cols 1 y 26). Manual: consola → `MAZE[3][1] === 4`, `MAZE[26][26] === 4` y el resto del laberinto intacto.
2. En `render.js`, dibujar el tile `4` en `drawDots` como círculo de radio 6 px que parpadea con `Math.floor( frame / 15 ) % 2 === 0`. Manual: recargar → 4 pellets grandes parpadeando en las esquinas, los dots normales sin cambios.
3. En `game.js`, añadir `scared` y `ghostChain` a `createGame`, las 4 constantes de reglas, y el consumo del pellet en `movePacman` (tile `4` → `grid = 0`, +50, `dotsRemaining--`, `scared = SCARED_FRAMES`, `ghostChain = 0`). Manual: comer un pellet → +50 en el marcador y el pellet desaparece.
4. En `game.js`, decrementar `scared` al final de `update`. Manual: el temporizador baja de 420 a 0; tras 7 s vuelve el comportamiento normal.
5. En `game.js`, rama de fuga en `decideGhost`: si `game.scared > 0` y el fantasma está fuera de la pen (`g.exited`), elegir la opción (sin 180°) que maximiza la distancia Manhattan a Pac-Man. Manual: al comer un pellet, los 4 fantasmas se dan la vuelta y huyen.
6. En `render.js`, colorear los fantasmas con `game.scared > 0`: azul `#2121ff`; si `scared <= SCARED_FLASH_FRAMES`, alternar azul/blanco cada 15 frames. Manual: ver fantasmas azules y el parpadeo blanco al final de los 7 s.
7. En `game.js`, resolver la colisión en `update` según `scared`: asustado → sumar `GHOST_EAT_BASE * 2^ghostChain`, `ghostChain++`, y teletransportar el fantasma a su celda de pen (`exitDelay = 0`, `exited = false`) sin restar vida; no asustado → vida igual que hoy. Manual: comer un fantasma azul → +200 y el fantasma reaparece en la pen saliendo otra vez por la puerta.
8. En `game.js`, en `resetPositions` cancelar `scared = 0` y `ghostChain = 0` (los pellets comidos siguen fuera; sin comer siguen en el tablero). Manual: perder una vida con el modo activo → fantasmas azules vuelven a normales, pero los pellets sin comer permanecen.

## Acceptance criteria

- [ ] El juego carga sin errores en consola.
- [ ] Hay exactamente 4 power pellets, en `(1,3)`, `(26,3)`, `(1,26)` y `(26,26)`, dibujados más grandes que los dots y parpadeando.
- [ ] Comer un power pellet suma exactamente 50 puntos y el pellet desaparece del tablero.
- [ ] Tras comer un power pellet, los 4 fantasmas huyen de Pac-Man durante 7 s (eligen la dirección que más aumenta su distancia).
- [ ] Durante los últimos 2 s del modo, los fantasmas parpadean alternando azul y blanco.
- [ ] Pasados los 7 s, los fantasmas vuelven a su personalidad y color originales.
- [ ] Comer un fantasma asustado suma 200; los siguientes de la misma potencia suman 400, 800 y 1600.
- [ ] Un fantasma comido reaparece en su celda de inicio de la pen y vuelve a salir por la ruta fija de SPEC 02.
- [ ] Comer un fantasma asustado no resta vidas ni reinicia las posiciones.
- [ ] Chocar con un fantasma NO asustado resta una vida igual que antes.
- [ ] Al perder una vida se cancela el modo asustado y `ghostChain` vuelve a 0; los pellets ya comidos NO reaparecen y los sin comer siguen en el tablero.
- [ ] Comer un segundo power pellet durante el modo reinicia el temporizador a 7 s y la cadena de fantasmas a 0.
- [ ] El modo asustado no cambia la velocidad de los fantasmas (`GHOST_SPEED` única).
- [ ] La victoria sigue funcionando: vaciar dots y pellets pone el estado `won`.
- [ ] `MAZE` no se muta y el laberinto sigue simétrico tras jugar una partida completa.

## Decisions

- **Sí:** tile nuevo `4` con char `'o'` en `MAZE_STR`. Consistente con la codificación existente (`1/2/0/3`); el render y el consumo lo tratan como un tercer tipo de "comible".
- **No:** lista `POWER_PELLET_CELLS` en `maze.js`. Como los pellets no reaparecen al morir (decisión del usuario), nadie la usaría: el tile `4` en el grid basta.
- **Sí:** temporizador global `game.scared` en frames, no flag por fantasma. El modo es de todos a la vez; un solo contador es más fácil de reiniciar y de colorear.
- **Sí:** fuga voraz (máxima distancia Manhattan, sin 180°). Es consistente con el estilo de `decideGhost` de SPEC 01 y visible sin coreografía extra.
- **No:** huida con cambios de rumbo aleatorios en intersecciones (quirk del arcade). Añade aleatoriedad difícil de verificar manualmente.
- **Sí:** comer pellet reinicia `scared` a 420 y `ghostChain` a 0. En el arcade la potencia no se acumula y la cadena se reinicia al comer otro pellet.
- **No:** fantasmas asustados más lentos. Mantiene un único `GHOST_SPEED` que tunear, igual que SPEC 01.
- **Sí:** fantasma comido teletransportado a su celda de pen con la ruta de salida de SPEC 02 (lookup del inicio por `kind`). Reutiliza infraestructura existente; el vuelo de ojos no cabe en el movimiento fraccional por celdas.
- **Sí:** pellets contabilizados en `dotsRemaining`. Mantiene la condición de victoria única de "comer todo".
- **No:** reaparición de pellets al perder vida. Decisión explícita del usuario; se comporta como "el pellet se comió, se acabó".
- **Sí:** decremento de `scared` al final de `update`, después de las colisiones. Evita perder una vida en el mismo frame en que vence el modo.
- **Sí:** constantes de reglas (`SCARED_FRAMES`, `POWER_PELLET_SCORE`, `GHOST_EAT_BASE`) en `game.js`; la geometría ya vive en `maze.js` y las reglas en `game.js` (convención de SPEC 02).

## Risks

| Riesgo                                                                                                     | Mitigación                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| El parpadeo final depende del frame global de render y el modo del estado de juego, pueden desincronizarse | Ambos usan los mismos frames (60 fps) y el mismo umbral `SCARED_FRAMES`/`SCARED_FLASH_FRAMES`; el render solo lee `game.scared`.        |
| Comer un fantasma justo cuando vence el modo resta vida por un frame de margen                             | `scared` se decrementa al final de `update`, después de resolver colisiones con el valor del frame actual.                              |
| Un fantasma comido vuelve a ser comible nada más salir de la pen si aún queda modo asustado                | Comportamiento arcade aceptable y verificable; la pen lo protege durante la ruta de salida (`decideGhost` no se aplica hasta `exited`). |
| Cambiar filas 3/26 de `MAZE_STR` rompe la simetría si se edita mal                                         | Las 4 ediciones son simétricas por diseño (cols 1 y 26 en filas espejo); se verifica con la simetría del render.                        |

## What is **not** in this spec

- Reaparición de power pellets al perder una vida.
- Velocidad reducida para fantasmas asustados.
- Ojos del fantasma comido volando de vuelta a la pen.
- Nivel siguiente al vaciar el tablero, sonido, indicador de tiempo en el HUD.
